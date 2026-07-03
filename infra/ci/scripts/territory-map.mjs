// Mirrors PLAN.md §3. Keep this in sync by hand if the territory table changes.
// Each agent maps to an array of path prefixes it owns. `excludes` are
// sub-paths carved out of an `owns` prefix for a different agent (e.g.
// FE-APP owns /app/ but not /app/design-system/, which FE-SYS owns).
export const TERRITORY_MAP = {
  "BE-PLAT": {
    owns: ["contract/", "platform/", "infra/"],
    excludes: [],
  },
  "BE-CORE": {
    owns: ["engine/", "cli/"],
    excludes: ["cli/ux/"],
  },
  "FE-APP": {
    owns: ["app/"],
    excludes: ["app/design-system/"],
  },
  "FE-SYS": {
    owns: ["app/design-system/", "site/", "docs-site/", "cli/ux/"],
    excludes: [],
  },
};

// Paths that are shared / not exclusively owned by any one agent, and
// therefore never fail the territory check regardless of who touches them.
// PLAN.md §3's ownership table: /tasks/ + /digests/ are ORCH-owned but
// "agents update their own task file status" within /tasks/, and ORCH's
// digest-compilation role is not a separate machine identity in single-
// session mode (PLAN.md §0 mode 2) — so both are treated as shared here.
// /reviews/ is intentionally NOT shared: it's QA-CRITIC/SEC-REV-owned,
// read-only for everyone else, so a write there from any other agent
// should still fail this check.
export const SHARED_PATHS = ["docs/adr/", "tasks/", "fixtures/", "digests/"];

// Root-level files PLAN.md §3's territory table does not assign to any one
// agent's directory tree (it only lists directory trees). Any agent may
// touch these; known collision (root package.json/pnpm-workspace.yaml get
// independently recreated on every unmerged branch) is intentionally not
// flagged here — that's a human merge-time concern, not a territory breach.
export const ROOT_SHARED_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  ".gitignore",
  "PLAN.md",
  "CLAUDE.md",
  "HUMAN-SETUP.md",
  "kyndro-sprint-plan.md",
  "README.md",
];

export function isPathOwnedBy(path, agent) {
  const rules = TERRITORY_MAP[agent];
  if (!rules) return false;
  if (ROOT_SHARED_FILES.includes(path)) return true;
  if (SHARED_PATHS.some((p) => path.startsWith(p))) return true;
  const owned = rules.owns.some((prefix) => path.startsWith(prefix));
  if (!owned) return false;
  const excluded = rules.excludes.some((prefix) => path.startsWith(prefix));
  return !excluded;
}
