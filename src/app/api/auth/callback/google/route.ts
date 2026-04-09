import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";

const COOKIE_NAME = "__session";
const SESSION_MAX_AGE = 604800; // 7 dias

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
}

interface GoogleTokenInfo {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  aud?: string;
  error?: string;
}

interface FirebaseSignInResponse {
  idToken?: string;
  error?: { message: string };
}

function invalidRedirect(origin: string, reason: string) {
  console.error("[auth/callback/google] erro:", reason);
  const res = NextResponse.redirect(new URL("/login?error=invalid", origin));
  res.cookies.delete("oauth_state");
  return res;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? url.host;
  const origin = `${proto}://${host}`;
  const { searchParams } = url;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL("/login?error=cancelled", origin));
  }

  const savedState = request.cookies.get("oauth_state")?.value;

  if (!code || !state || state !== savedState) {
    return invalidRedirect(origin, `state mismatch — recebido: ${state}, salvo: ${savedState}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

  if (!clientId || !clientSecret || !apiKey) {
    return invalidRedirect(origin, "variáveis de ambiente faltando");
  }

  const redirectUri = `${origin}/api/auth/callback/google`;

  // 1. Troca o código pelo token do Google
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

  if (!tokenRes.ok || !tokenData.id_token) {
    return invalidRedirect(origin, `troca de código falhou: ${JSON.stringify(tokenData)}`);
  }

  // 2. Verifica o ID token do Google e extrai os dados do usuário
  const verifyRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${tokenData.id_token}`
  );
  const tokenInfo = (await verifyRes.json()) as GoogleTokenInfo;

  if (!verifyRes.ok || tokenInfo.aud !== clientId || !tokenInfo.sub) {
    return invalidRedirect(origin, `tokeninfo inválido: aud=${tokenInfo.aud}, sub=${tokenInfo.sub}`);
  }

  try {
    // 3. Busca o usuário existente pelo e-mail ou cria um novo
    const adminAuth = getAdminAuth();
    let firebaseUid: string;

    try {
      const existing = await adminAuth.getUserByEmail(tokenInfo.email!);
      firebaseUid = existing.uid;
      await adminAuth.updateUser(firebaseUid, {
        displayName: tokenInfo.name,
        photoURL: tokenInfo.picture,
      });
    } catch (err: unknown) {
      if ((err as { code?: string }).code === "auth/user-not-found") {
        const created = await adminAuth.createUser({
          uid: tokenInfo.sub,
          email: tokenInfo.email,
          displayName: tokenInfo.name,
          photoURL: tokenInfo.picture,
        });
        firebaseUid = created.uid;
      } else {
        throw err;
      }
    }

    // 4. Gera um custom token Firebase para o usuário
    const customToken = await adminAuth.createCustomToken(firebaseUid);

    // 5. Troca o custom token por um ID token via REST API do Firebase
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    const signInData = (await signInRes.json()) as FirebaseSignInResponse;

    if (!signInRes.ok || !signInData.idToken) {
      return invalidRedirect(origin, `signInWithCustomToken falhou: ${JSON.stringify(signInData)}`);
    }

    // 6. Confirma o ID token e define o cookie de sessão
    await adminAuth.verifyIdToken(signInData.idToken);

    // 7. Sincroniza o usuário no backend e detecta se o perfil está completo
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3100";
    const authHeader = { "Content-Type": "application/json", Authorization: `Bearer ${signInData.idToken}` };
    let destination = "/cadastro";

    try {
      const syncRes = await fetch(`${backendUrl}/api/v1/users/me`, {
        method: "POST",
        headers: authHeader,
      });
      if (syncRes.ok) {
        const syncData = await syncRes.json().catch(() => null);
        const profileComplete = (syncData?.profile?.height_cm ?? 0) > 0;

        if (profileComplete) {
          // Perfil completo: verifica se o survey de marketing já foi respondido
          try {
            const surveyRes = await fetch(`${backendUrl}/api/v1/marketingQuestions/survey-status`, {
              method: "GET",
              headers: authHeader,
            });
            if (surveyRes.ok) {
              const surveyData = await surveyRes.json().catch(() => null);
              destination = surveyData?.is_completed ? "/dashboard" : "/cadastro?etapa=esportes";
            } else {
              destination = "/dashboard";
            }
          } catch (err) {
            console.warn("[auth/callback] survey status falhou:", err);
            destination = "/dashboard";
          }
        }
      }
    } catch (err) {
      console.warn("[auth/callback] sync backend falhou, redirecionando para /dashboard:", err);
      destination = "/dashboard";
    }

    const savedRedirect = request.cookies.get("oauth_redirect")?.value;
    const finalDestination = savedRedirect?.startsWith("/") ? savedRedirect : destination;

    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    const cookieHeader = `${COOKIE_NAME}=${encodeURIComponent(signInData.idToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure}`;

    const response = NextResponse.redirect(new URL(finalDestination, origin));
    response.cookies.delete("oauth_state");
    response.headers.set("Set-Cookie", cookieHeader);
    response.headers.append("Set-Cookie", "oauth_redirect=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
    return response;
  } catch (err) {
    return invalidRedirect(origin, `erro inesperado: ${err instanceof Error ? err.message : String(err)}`);
  }
}
