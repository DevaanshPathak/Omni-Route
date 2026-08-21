import {
  CourtRecordResponseSchema,
  RegistrationRecordResponseSchema,
  RevenueRecordResponseSchema,
  SyntheticSystemSnapshotResponseSchema,
} from "@omni-route/shared";
import { NextResponse } from "next/server";

import { backendUrl, readJson, safeProxyError } from "../../../lib/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [courtResponse, registrationResponse, revenueResponse] = await Promise.all([
      fetch(backendUrl("/mock/court/orders/ORD-123"), { cache: "no-store" }),
      fetch(backendUrl("/mock/registration/properties/REG-2391"), { cache: "no-store" }),
      fetch(backendUrl("/mock/revenue/properties/45%2F2"), { cache: "no-store" }),
    ]);

    if (![courtResponse, registrationResponse, revenueResponse].every((item) => item.ok)) {
      return safeProxyError(502, "One or more synthetic systems could not be read.");
    }

    const [courtBody, registrationBody, revenueBody] = await Promise.all([
      readJson(courtResponse),
      readJson(registrationResponse),
      readJson(revenueResponse),
    ]);
    const court = CourtRecordResponseSchema.safeParse(courtBody);
    const registration = RegistrationRecordResponseSchema.safeParse(registrationBody);
    const revenue = RevenueRecordResponseSchema.safeParse(revenueBody);

    if (!court.success || !registration.success || !revenue.success) {
      return safeProxyError(502, "A synthetic system returned an invalid record.");
    }

    const snapshot = SyntheticSystemSnapshotResponseSchema.parse({
      data: {
        court: court.data.data,
        registration: registration.data.data,
        revenue: revenue.data.data,
        readOnly: true,
      },
    });
    return NextResponse.json(snapshot);
  } catch {
    return safeProxyError();
  }
}
