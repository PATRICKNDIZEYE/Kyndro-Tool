import type { components } from "@kyndro/types";
import runDetailFixture from "../../fixtures/analyzed-pr/run-pr42.json";
import repoFixture from "../../fixtures/repos/repo-shop.json";
import obligationVerified from "../../fixtures/obligations/obligation-verified.json";
import obligationFalsified from "../../fixtures/obligations/obligation-falsified.json";
import obligationUnknown from "../../fixtures/obligations/obligation-unknown.json";
import specsFixture from "../../fixtures/specs/candidate-specs.json";

export type Verdict = components["schemas"]["Obligation"]["verdict"];
export type Repo = components["schemas"]["Repo"];
export type Run = components["schemas"]["Run"];
export type RunDetail = components["schemas"]["RunDetail"];
export type Obligation = components["schemas"]["Obligation"];
export type Spec = components["schemas"]["Spec"];
export type User = components["schemas"]["User"];
export type AuthSession = components["schemas"]["AuthSession"];

export const repo: Repo = repoFixture as Repo;

export const runDetail: RunDetail = runDetailFixture as RunDetail;

export const run: Run = (() => {
  const { analysis: _analysis, ...rest } = runDetail;
  return rest;
})();

export const obligations: Obligation[] = [
  obligationVerified as Obligation,
  obligationFalsified as Obligation,
  obligationUnknown as Obligation,
];

export const specs: Spec[] = specsFixture as Spec[];

/**
 * No golden fixture exists for auth (fixtures/ only covers analysis-domain
 * schemas per manifest.json). Synthesized locally to satisfy the User/AuthSession
 * schemas — see ADR-009.
 */
export const user: User = {
  id: "user_01j9zx3fam5q8w2ke7ryn4vht9",
  github_login: "mkaneza",
  display_name: "Mireille Kaneza",
  avatar_url: null,
  created_at: "2026-06-28T14:00:00Z",
};

export const authSession: AuthSession = {
  token: {
    access_token: "kyndro_mock_token_do_not_use_in_prod",
    token_type: "bearer",
    expires_at: "2026-12-31T00:00:00Z",
  },
  user,
};
