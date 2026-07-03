import { describe, expect, it } from "vitest";
import { isValidEmail } from "../src/validateEmail";

describe("isValidEmail", () => {
  it.each(["a@b.com", "first.last@sub.example.co", "  a@b.com  "])(
    "accepts %s",
    (value) => {
      expect(isValidEmail(value)).toBe(true);
    },
  );

  it.each(["", "not-an-email", "a@b", "a@.com", "@b.com", "a b@c.com"])(
    "rejects %s",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});
