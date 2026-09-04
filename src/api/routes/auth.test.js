import { describe, it, expect } from "vitest";
import { getResendConfigError } from "./auth.js";

describe("getResendConfigError", () => {
  it("returns a helpful error when the Resend API key is missing", () => {
    const previous = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;
    process.env.ALERT_FROM_EMAIL = "noreply@example.com";

    expect(getResendConfigError()).toBe("RESEND_API_KEY is not configured.");

    if (previous === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous;
  });

  it("returns a helpful error when the sender email is missing", () => {
    const previousKey = process.env.RESEND_API_KEY;
    const previousSender = process.env.ALERT_FROM_EMAIL;
    process.env.RESEND_API_KEY = "test-key";
    delete process.env.ALERT_FROM_EMAIL;

    expect(getResendConfigError()).toBe("ALERT_FROM_EMAIL is not configured.");

    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousSender === undefined) delete process.env.ALERT_FROM_EMAIL;
    else process.env.ALERT_FROM_EMAIL = previousSender;
  });
});
