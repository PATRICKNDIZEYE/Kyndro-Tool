import { http, HttpResponse } from "msw";
import {
  authSession,
  obligations,
  repo,
  run,
  runDetail,
  specs,
  user,
  type Verdict,
} from "./fixtures";

/**
 * Matches contract/openapi.yaml's `servers[0].url` (production). MSW intercepts
 * this at the network layer — no requests actually leave the machine.
 */
export const API_BASE = "https://api.kyndro.app/v1";

function errorEnvelope(code: string, message: string) {
  return { error: { code, message } };
}

/**
 * Every list endpoint supports `?scenario=empty|unauthorized` so loading/empty/
 * error UI states are reachable without hand-rolling a one-off handler per test
 * (see ADR-009). Tests needing full control can still `server.use()` an override.
 */
function readScenario(request: Request): "empty" | "unauthorized" | null {
  const scenario = new URL(request.url).searchParams.get("scenario");
  return scenario === "empty" || scenario === "unauthorized" ? scenario : null;
}

export const handlers = [
  http.post(`${API_BASE}/auth/github`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as { code?: string } | null;
    if (!body?.code) {
      return HttpResponse.json(errorEnvelope("BAD_REQUEST", "Missing GitHub OAuth code."), {
        status: 400,
      });
    }
    if (body.code === "invalid-code") {
      return HttpResponse.json(errorEnvelope("UNAUTHORIZED", "GitHub rejected this code."), {
        status: 401,
      });
    }
    return HttpResponse.json(authSession, { status: 200 });
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    if (!request.headers.get("authorization")) {
      return HttpResponse.json(errorEnvelope("UNAUTHORIZED", "Missing bearer token."), {
        status: 401,
      });
    }
    return HttpResponse.json(user, { status: 200 });
  }),

  http.get(`${API_BASE}/repos`, ({ request }) => {
    const scenario = readScenario(request);
    if (scenario === "unauthorized") {
      return HttpResponse.json(errorEnvelope("UNAUTHORIZED", "Missing bearer token."), {
        status: 401,
      });
    }
    return HttpResponse.json(
      { data: scenario === "empty" ? [] : [repo], next_cursor: null },
      { status: 200 },
    );
  }),

  http.get(`${API_BASE}/runs`, ({ request }) => {
    const scenario = readScenario(request);
    if (scenario === "unauthorized") {
      return HttpResponse.json(errorEnvelope("UNAUTHORIZED", "Missing bearer token."), {
        status: 401,
      });
    }
    return HttpResponse.json(
      { data: scenario === "empty" ? [] : [run], next_cursor: null },
      { status: 200 },
    );
  }),

  http.post(`${API_BASE}/runs`, async ({ request }) => {
    const body = (await request.json().catch(() => null)) as {
      repo_id?: string;
      head_sha?: string;
      base_sha?: string;
      pr_number?: number;
    } | null;
    if (!body?.repo_id || !body.head_sha || !body.base_sha) {
      return HttpResponse.json(
        errorEnvelope("BAD_REQUEST", "repo_id, head_sha, and base_sha are required."),
        { status: 400 },
      );
    }
    if (body.repo_id !== repo.id) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "Unknown repo_id."), { status: 404 });
    }
    return HttpResponse.json(
      {
        ...run,
        status: "queued",
        head_sha: body.head_sha,
        base_sha: body.base_sha,
        obligation_count: 0,
        verdict_counts: { verified: 0, falsified: 0, unknown: 0 },
        started_at: null,
        completed_at: null,
      },
      { status: 202 },
    );
  }),

  http.get(`${API_BASE}/runs/:runId`, ({ params }) => {
    if (params.runId !== runDetail.id) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "No run with that id."), {
        status: 404,
      });
    }
    return HttpResponse.json(runDetail, { status: 200 });
  }),

  http.get(`${API_BASE}/runs/:runId/obligations`, ({ request, params }) => {
    if (params.runId !== runDetail.id) {
      return HttpResponse.json(errorEnvelope("NOT_FOUND", "No run with that id."), {
        status: 404,
      });
    }
    const scenario = readScenario(request);
    const verdictFilter = new URL(request.url).searchParams.get("verdict") as Verdict | null;
    const filtered = obligations.filter((o) => !verdictFilter || o.verdict === verdictFilter);
    return HttpResponse.json(
      { data: scenario === "empty" ? [] : filtered, next_cursor: null },
      { status: 200 },
    );
  }),

  http.get(`${API_BASE}/specs`, ({ request }) => {
    const scenario = readScenario(request);
    const statusFilter = new URL(request.url).searchParams.get("status");
    const filtered = specs.filter((s) => !statusFilter || s.status === statusFilter);
    return HttpResponse.json(
      { data: scenario === "empty" ? [] : filtered, next_cursor: null },
      { status: 200 },
    );
  }),
];
