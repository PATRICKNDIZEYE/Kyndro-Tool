import { useEffect, useState } from "react";
import { API_BASE_URL } from "../flags";

export type ApiState<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: T };

interface ErrorEnvelope {
  error: { code: string; message: string };
}

/** Refetches whenever `path` changes — deliberately no caching/dedup for v1. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ status: "loading" });

  useEffect(() => {
    if (path === null) return;
    let cancelled = false;
    setState({ status: "loading" });

    fetch(`${API_BASE_URL}${path}`, {
      headers: { authorization: "Bearer kyndro_mock_token_do_not_use_in_prod" },
    })
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          const envelope = body as ErrorEnvelope;
          setState({ status: "error", message: envelope.error?.message ?? "Request failed." });
          return;
        }
        setState({ status: "success", data: body as T });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Network error." });
      });

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
