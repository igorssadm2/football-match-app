"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Sessão inválida. Tente entrar novamente.",
  cancelled: "Login cancelado. Tente novamente.",
  config: "Configuração incompleta. Verifique as variáveis de ambiente.",
};

type Tab = "google" | "email";
type Mode = "login" | "register";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("google");
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirm, setRegisterConfirm] = useState("");

  useEffect(() => {
    const code = searchParams.get("error");
    if (code) setError(ERROR_MESSAGES[code] ?? "Erro desconhecido.");
  }, [searchParams]);

  const redirectParam = searchParams.get("redirect");
  const safeRedirect = redirectParam?.startsWith("/") ? redirectParam : null;

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError("Preencha email e senha.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/manual/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao entrar.");
        return;
      }
      router.push(safeRedirect ?? data.redirect ?? "/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!registerName.trim()) { setError("Informe seu nome."); return; }
    if (!registerEmail) { setError("Informe seu email."); return; }
    if (registerPassword.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (registerPassword !== registerConfirm) { setError("As senhas não coincidem."); return; }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/manual/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: registerName.trim(),
          email: registerEmail,
          password: registerPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar conta.");
        return;
      }
      router.push(data.redirect ?? "/cadastro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
      </div>

      <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl">
        <Link href="/" className="block text-center font-black text-lg mb-6">
          vamo<span className="text-green-400">jogar</span>
        </Link>

        {/* Tabs principais */}
        <div className="flex rounded-lg bg-zinc-800/60 p-1 mb-6 gap-1">
          <button
            type="button"
            onClick={() => switchTab("google")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
              tab === "google"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => switchTab("email")}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
              tab === "email"
                ? "bg-zinc-700 text-zinc-100"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Email e senha
          </button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mb-4 text-center">{error}</p>
        )}

        {/* Tab Google */}
        {tab === "google" && (
          <>
            <p className="text-zinc-400 text-sm text-center mb-6">Use sua conta Google</p>
            <a
              href={`/api/auth/google${safeRedirect ? `?redirect=${encodeURIComponent(safeRedirect)}` : ""}`}
              className="w-full flex items-center justify-center gap-3 rounded-lg bg-white text-zinc-900 font-medium py-3 px-4 hover:bg-zinc-100 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar com Google
            </a>
          </>
        )}

        {/* Tab Email e senha */}
        {tab === "email" && (
          <>
            {/* Sub-tabs Entrar / Criar conta */}
            <div className="flex border-b border-zinc-700 mb-6">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  mode === "login"
                    ? "text-green-400 border-b-2 border-green-400 -mb-px"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 pb-2 text-sm font-medium transition-colors ${
                  mode === "register"
                    ? "text-green-400 border-b-2 border-green-400 -mb-px"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Criar conta
              </button>
            </div>

            {/* Formulário de login */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="login-email">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="login-password">
                    Senha
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold py-2.5 text-sm transition-colors"
                >
                  {loading ? "Entrando…" : "Entrar"}
                </button>
              </form>
            )}

            {/* Formulário de cadastro */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="reg-name">
                    Nome
                  </label>
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="reg-email">
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="reg-password">
                    Senha{" "}
                    <span className="text-zinc-500">(mín. 8 caracteres)</span>
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    autoComplete="new-password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1" htmlFor="reg-confirm">
                    Confirmar senha
                  </label>
                  <input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    value={registerConfirm}
                    onChange={(e) => setRegisterConfirm(e.target.value)}
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-100 px-3 py-2 text-sm placeholder-zinc-500 focus:outline-none focus:border-green-500 transition-colors"
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-900 font-semibold py-2.5 text-sm transition-colors"
                >
                  {loading ? "Criando conta…" : "Criar conta"}
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {tab === "google" && (
        <p className="mt-6 text-zinc-500 text-sm text-center max-w-xs">
          Você será redirecionado ao Google na mesma aba.
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
