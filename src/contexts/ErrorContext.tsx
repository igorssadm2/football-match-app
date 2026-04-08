"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";

export interface AppError {
  id: string;
  title: string;
  type: string;
  message: string;
  errors?: Record<string, string[]>;
}

interface ErrorContextValue {
  errors: AppError[];
  pushError: (err: Omit<AppError, "id">) => void;
  dismissError: (id: string) => void;
}

const ErrorContext = createContext<ErrorContextValue | null>(null);

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = useState<AppError[]>([]);
  const router = useRouter();

  const pushError = useCallback((err: Omit<AppError, "id">) => {
    if (err.type.toLowerCase().includes("unauthorized")) {
      router.push("/login");
      return;
    }
    const id = crypto.randomUUID();
    setErrors((prev) => [...prev.slice(-2), { ...err, id }]); // max 3 toasts
  }, [router]);

  const dismissError = useCallback((id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <ErrorContext.Provider value={{ errors, pushError, dismissError }}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useError() {
  const ctx = useContext(ErrorContext);
  if (!ctx) throw new Error("useError must be used within ErrorProvider");
  return ctx;
}

/** Extrai { title, type, message } de uma Response de erro do backend */
export async function parseBackendError(
  res: Response,
  fallback?: Partial<Omit<AppError, "id">>
): Promise<Omit<AppError, "id">> {
  try {
    const data = await res.json();
    return {
      title: data?.title ?? fallback?.title ?? "Algo deu errado",
      type: data?.type ?? fallback?.type ?? "server_error",
      message: data?.message ?? fallback?.message ?? "Tente novamente em instantes.",
      ...(data?.errors ? { errors: data.errors as Record<string, string[]> } : {}),
    };
  } catch {
    return {
      title: fallback?.title ?? "Erro de Comunicação",
      type: fallback?.type ?? "network_error",
      message: fallback?.message ?? "Não foi possível processar a resposta do servidor.",
    };
  }
}
