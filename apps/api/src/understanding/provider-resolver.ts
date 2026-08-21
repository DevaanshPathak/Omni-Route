import type { UnderstandingProviderSelection } from "@omni-route/shared";

import { FixtureUnderstandingProvider } from "./fixture-provider.js";
import { OpenAIUnderstandingProvider } from "./openai-provider.js";
import {
  UnderstandingError,
  type UnderstandingProvider,
  type UnderstandingProviderResolver,
} from "./service.js";

type Environment = Readonly<Record<string, string | undefined>>;

function configuredValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

export function normalizeOpenAIBaseURL(value: string): string {
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    throw new UnderstandingError(
      "MISSING_CONFIGURATION",
      "OPENAI_BASE_URL must be a valid HTTP or HTTPS URL.",
    );
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new UnderstandingError(
      "MISSING_CONFIGURATION",
      "OPENAI_BASE_URL must use HTTP or HTTPS.",
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

export function createProviderResolver(environment: Environment): UnderstandingProviderResolver {
  const apiKey = configuredValue(environment.OPENAI_API_KEY);
  const configuredBaseURL = configuredValue(environment.OPENAI_BASE_URL);
  const model = configuredValue(environment.OPENAI_MODEL_NAME);

  return (selection: UnderstandingProviderSelection): UnderstandingProvider => {
    if (
      selection === "fixture" ||
      (selection === "auto" && (apiKey === undefined || model === undefined))
    ) {
      return new FixtureUnderstandingProvider();
    }
    if (apiKey === undefined || model === undefined) {
      throw new UnderstandingError(
        "MISSING_CONFIGURATION",
        "OpenAI extraction requires OPENAI_API_KEY and OPENAI_MODEL_NAME.",
      );
    }
    const baseURL =
      configuredBaseURL === undefined ? undefined : normalizeOpenAIBaseURL(configuredBaseURL);
    return new OpenAIUnderstandingProvider({ apiKey, baseURL, model });
  };
}
