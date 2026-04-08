"use client";

import { useState } from "react";
import { useError, parseBackendError } from "@/contexts/ErrorContext";

interface ApiState {
  status: "idle" | "loading" | "success" | "error";
  data: unknown;
}

export default function UsersButton() {
  const [state, setState] = useState<ApiState>({ status: "idle", data: null });
  const { pushError } = useError();

  async function handleFetch() {
    setState({ status: "loading", data: null });
    try {
      const res = await fetch("/api/users");
      if (!res.ok) {
        const err = await parseBackendError(res, { title: "Falha ao buscar usuário", type: "server_error" });
        pushError(err);
        setState({ status: "error", data: null });
        return;
      }
      const data: unknown = await res.json();
      setState({ status: "success", data });
    } catch {
      pushError({
        title: "Erro de Conexão",
        type: "network_error",
        message: "Não foi possível conectar ao servidor. Verifique sua internet.",
      });
      setState({ status: "error", data: null });
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          type="button"
          onClick={handleFetch}
          disabled={state.status === "loading"}
          className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
        >
          {state.status === "loading" ? "Buscando..." : "GET /v1/users"}
        </button>
        {state.status !== "idle" && state.status !== "loading" && (
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              state.status === "success"
                ? "bg-emerald-900/50 text-emerald-400"
                : "bg-red-900/50 text-red-400"
            }`}
          >
            {state.status === "success" ? "200 OK" : "Erro"}
          </span>
        )}
      </div>

      {state.data !== null && (
        <pre className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 text-xs text-zinc-300 overflow-auto max-h-72 whitespace-pre-wrap break-words">
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
    </div>
  );
}
