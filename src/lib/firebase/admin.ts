import * as admin from "firebase-admin";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadServiceAccount(): admin.ServiceAccount {
  const pathEnv = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (pathEnv) {
    const filePath = resolve(process.cwd(), pathEnv);
    const json = readFileSync(filePath, "utf-8");
    return JSON.parse(json) as admin.ServiceAccount;
  }
  let key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "Defina FIREBASE_SERVICE_ACCOUNT_PATH (caminho do .json) ou FIREBASE_SERVICE_ACCOUNT_KEY no .env.local"
    );
  }
  key = key
    .replace(/^\uFEFF/, "")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/^\s*\{\s+/, "{")
    .trim();
  try {
    return JSON.parse(key) as admin.ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY: JSON inválido. Use FIREBASE_SERVICE_ACCOUNT_PATH=firebase-service-account.json e coloque o .json da chave na raiz do projeto."
    );
  }
}

function getAdminApp() {
  if (admin.apps.length) return admin.app();
  const parsed = loadServiceAccount();
  const credential = admin.credential.cert(parsed);
  return admin.initializeApp({ credential });
}

export function getAdminAuth() {
  return getAdminApp().auth();
}
