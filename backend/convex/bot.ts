import { v } from "convex/values";
import { query } from "./functions";

export const context = query({
  args: { tgUserId: v.string() },
  handler: async (ctx, { tgUserId }) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_tgUser", (q) => q.eq("tgUserId", tgUserId))
      .order("desc")
      .first();
    const clinic =
      lead !== null
        ? await ctx.db.get(lead.clinicId)
        : await ctx.db.query("clinics").first();
    const now = Date.now();
    const openSlots = (
      await ctx.db
        .query("openSlots")
        .withIndex("by_status", (q) => q.eq("status", "open"))
        .collect()
    )
      .filter((slot) => slot.ts > now)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 30)
      .map((slot) => ({ _id: slot._id, label: slot.label }));
    return { lead, clinic, openSlots };
  },
});
