import { httpRouter, makeFunctionReference } from "convex/server";
import { httpAction } from "./functions";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (contentType.includes("application/json")) return await request.json();
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const result: Record<string, string> = {};
    new URLSearchParams(await request.text()).forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  throw new Error("Unsupported content type");
}

const recordMissedCall = makeFunctionReference<
  "mutation",
  { phoneDigits: string; ts: number; clinic?: string },
  { leadId: string } | { error: string }
>("missedCalls:recordMissedCall");

const router = httpRouter();

router.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async () => new Response("ok", { status: 200 })),
});

router.route({
  path: "/missed-call",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CALLCATCH_WEBHOOK_SECRET;
    if (secret && request.headers.get("x-callcatch-secret") !== secret) {
      return json({ error: "Unauthorized" }, 401);
    }

    let body: Record<string, unknown>;
    try {
      body = await parseBody(request);
    } catch {
      return json({ error: "Expected JSON or form-encoded body" }, 400);
    }

    if (typeof body.caller !== "string") return json({ error: "caller is required" }, 400);
    const phoneDigits = body.caller.replace(/\D/g, "").slice(-10);
    if (phoneDigits.length !== 10) return json({ error: "caller must contain 10 digits" }, 400);

    const parsedTs = typeof body.ts === "number" ? body.ts : Number(body.ts);
    const ts = Number.isFinite(parsedTs) ? parsedTs : Date.now();
    const clinic = typeof body.clinic === "string" ? body.clinic : undefined;
    const result = await ctx.runMutation(recordMissedCall, { phoneDigits, ts, clinic });
    if ("error" in result) return json({ error: result.error }, 400);
    return json({ leadId: result.leadId });
  }),
});

export default router;
