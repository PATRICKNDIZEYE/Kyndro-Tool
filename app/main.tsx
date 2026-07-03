import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@kyndro/design-system";
import { App } from "./App";
import { getApiMode } from "./flags";

async function enableMocking() {
  if (getApiMode() !== "mock") return;
  const { worker } = await import("./mock/browser");
  await worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
