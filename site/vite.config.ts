import path from "node:path";
import { defineConfig, type Plugin } from "vite";
import { appendEntry } from "./server/waitlistStore";
import { isValidEmail } from "./src/validateEmail";

const DATA_FILE = path.resolve(__dirname, "data/waitlist.json");

/**
 * Dev-only local waitlist capture endpoint (docs/adr/ADR-010-waitlist-storage.md).
 * Not present in the production build — there is no host to run this on yet,
 * and no G-PUB'd deploy target.
 */
function waitlistApiPlugin(): Plugin {
  return {
    name: "kyndro-waitlist-api",
    configureServer(server) {
      server.middlewares.use("/api/waitlist", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", async () => {
          res.setHeader("content-type", "application/json");
          try {
            const parsed = JSON.parse(body || "{}") as { email?: unknown };
            if (typeof parsed.email !== "string" || !isValidEmail(parsed.email)) {
              res.statusCode = 400;
              res.end(
                JSON.stringify({
                  error: { code: "INVALID_EMAIL", message: "Enter a valid email address." },
                }),
              );
              return;
            }
            const entry = await appendEntry(DATA_FILE, parsed.email.trim());
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true, entry }));
          } catch {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ error: { code: "INTERNAL", message: "Could not save your email." } }),
            );
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [waitlistApiPlugin()],
});
