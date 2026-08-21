import OpenAI, { APIConnectionTimeoutError } from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import { CanonicalEventProposalSchema, type UnderstandingInput } from "@omni-route/shared";

import {
  EXTRACTION_PROMPT_VERSION,
  UnderstandingError,
  type UnderstandingProvider,
} from "./service.js";

const SYSTEM_PROMPT = `You extract facts from one fictional property-transfer court decree for the Omni-Route hackathon.
Return only facts explicitly present in the supplied synthetic text. Do not assess legal validity, resolve government records, map departmental fields, call tools, or propose actions.
Use canonical concepts only. Evidence values must be short exact values present in the input.
Prompt version: ${EXTRACTION_PROMPT_VERSION}`;

type OpenAIProviderOptions = {
  apiKey: string;
  baseURL?: string;
  model: string;
  timeoutMs?: number;
};

function refusalFrom(response: Awaited<ReturnType<OpenAI["responses"]["parse"]>>): boolean {
  return response.output.some(
    (item) => item.type === "message" && item.content.some((content) => content.type === "refusal"),
  );
}

export class OpenAIUnderstandingProvider implements UnderstandingProvider {
  readonly id = "openai" as const;
  readonly model: string;
  readonly #client: OpenAI;

  constructor(options: OpenAIProviderOptions) {
    this.model = options.model;
    this.#client = new OpenAI({
      apiKey: options.apiKey,
      ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
      timeout: options.timeoutMs ?? 20_000,
      maxRetries: 0,
    });
  }

  async extract(input: UnderstandingInput): Promise<unknown> {
    try {
      const response = await this.#client.responses.parse({
        model: this.model,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: input.text },
        ],
        text: {
          format: zodTextFormat(CanonicalEventProposalSchema, "canonical_property_transfer"),
        },
      });

      if (refusalFrom(response)) {
        throw new UnderstandingError(
          "PROVIDER_REFUSAL",
          "The extraction provider declined to interpret this input.",
        );
      }
      if (response.output_parsed === null) {
        throw new UnderstandingError(
          "INVALID_MODEL_OUTPUT",
          "The extraction provider returned no schema-valid proposal.",
        );
      }
      return response.output_parsed;
    } catch (error) {
      if (error instanceof UnderstandingError) throw error;
      if (error instanceof APIConnectionTimeoutError) {
        throw new UnderstandingError("PROVIDER_TIMEOUT", "The extraction provider timed out.");
      }
      throw new UnderstandingError(
        "PROVIDER_FAILURE",
        "The extraction provider could not complete the request.",
      );
    }
  }
}
