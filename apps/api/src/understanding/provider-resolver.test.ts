import { describe, expect, it } from "vitest";

import { UnderstandingError } from "./service.js";
import { createProviderResolver, normalizeOpenAIBaseURL } from "./provider-resolver.js";

describe("understanding provider resolution", () => {
  it("uses the deterministic provider when auto mode has no live configuration", () => {
    expect(createProviderResolver({})("auto").id).toBe("fixture");
  });

  it("fails clearly when live mode is requested without required configuration", () => {
    expect(() => createProviderResolver({})("openai")).toThrow(
      new UnderstandingError(
        "MISSING_CONFIGURATION",
        "OpenAI extraction requires OPENAI_API_KEY and OPENAI_MODEL_NAME.",
      ),
    );
  });

  it("normalizes scheme-less API hosts to HTTPS and rejects unsafe protocols", () => {
    expect(normalizeOpenAIBaseURL("gateway.example/v1")).toBe("https://gateway.example/v1");
    expect(normalizeOpenAIBaseURL("https://gateway.example/v1")).toBe("https://gateway.example/v1");
    expect(() => normalizeOpenAIBaseURL("ftp://gateway.example/v1")).toThrow(/HTTP or HTTPS/);
    expect(() => normalizeOpenAIBaseURL("not a valid host")).toThrow(/valid HTTP or HTTPS URL/);
  });
});
