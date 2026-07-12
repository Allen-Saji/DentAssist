import { v } from "convex/values";
import { mutation } from "./functions";

export const track = mutation({
  args: {
    sessionId: v.string(),
    path: v.string(),
    referrer: v.string(),
    userAgent: v.string(),
  },
  handler: async (ctx, args) => {
    const sessionId = args.sessionId.trim();
    if (sessionId.length === 0) throw new Error("sessionId required");
    await ctx.db.insert("pageVisits", {
      sessionId: sessionId.slice(0, 100),
      path: (args.path || "/").slice(0, 300),
      referrer: args.referrer.slice(0, 500),
      userAgent: args.userAgent.slice(0, 500),
      ts: Date.now(),
    });
    return { ok: true as const };
  },
});