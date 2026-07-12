import { v } from "convex/values";
import { internalMutation } from "./functions";

const THREE_MINUTES_MS = 3 * 60 * 1000;

export const recordMissedCall = internalMutation({
  args: {
    phoneDigits: v.string(),
    ts: v.number(),
    clinic: v.optional(v.string()),
  },
  handler: async (ctx, { phoneDigits, ts, clinic: clinicSelector }) => {
    const existingLeads = await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phoneDigits", phoneDigits))
      .order("desc")
      .collect();

    for (const lead of existingLeads) {
      const recentMissedCall = await ctx.db
        .query("events")
        .withIndex("by_lead", (q) =>
          q.eq("leadId", lead._id).gte("ts", ts - THREE_MINUTES_MS),
        )
        .filter((q) => q.eq(q.field("type"), "missed_call"))
        .first();
      if (recentMissedCall !== null) {
        await ctx.db.insert("events", { leadId: lead._id, ts, type: "repeat_call" });
        await ctx.db.patch(lead._id, { lastEventAt: ts });
        return { leadId: lead._id };
      }
    }

    let clinic = null;
    if (clinicSelector !== undefined) {
      const clinicId = ctx.db.normalizeId("clinics", clinicSelector);
      clinic = clinicId === null ? null : await ctx.db.get(clinicId);
      if (clinic === null) {
        clinic = await ctx.db
          .query("clinics")
          .filter((q) => q.eq(q.field("phoneDigits"), clinicSelector))
          .first();
      }
    } else {
      clinic = await ctx.db.query("clinics").first();
    }
    if (clinic === null) return { error: "Clinic not found" } as const;

    const existingLead = existingLeads.find((lead) => lead.clinicId === clinic._id);
    const leadId = existingLead?._id ??
      (await ctx.db.insert("leads", {
        clinicId: clinic._id,
        phoneDigits,
        stage: "sms_sent",
        firstMissedAt: ts,
        lastEventAt: ts,
      }));
    if (existingLead !== undefined) {
      await ctx.db.patch(leadId, { stage: "sms_sent", lastEventAt: ts });
    }
    await ctx.db.insert("events", { leadId, ts, type: "missed_call" });
    return { leadId };
  },
});
