import "./style.css";
import { isValidEmail } from "./validateEmail";

const form = document.getElementById("waitlist-form") as HTMLFormElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const submitButton = document.getElementById("waitlist-submit") as HTMLButtonElement;
const status = document.getElementById("waitlist-status") as HTMLParagraphElement;

function setStatus(state: "idle" | "error" | "success", message: string) {
  status.dataset.state = state;
  status.textContent = message;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();

  if (!isValidEmail(email)) {
    setStatus("error", "Enter a valid email address.");
    emailInput.setAttribute("aria-invalid", "true");
    return;
  }
  emailInput.removeAttribute("aria-invalid");

  submitButton.disabled = true;
  setStatus("idle", "Joining…");

  try {
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await res.json();
    if (!res.ok) {
      setStatus("error", body.error?.message ?? "Something went wrong. Try again.");
      return;
    }
    setStatus("success", "You're on the list — we'll email you when there's early access.");
    form.reset();
  } catch {
    setStatus("error", "Couldn't reach the server. Try again in a moment.");
  } finally {
    submitButton.disabled = false;
  }
});
