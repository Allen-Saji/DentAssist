import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./functions";

const HOUR_MS = 60 * 60 * 1000;

export const processLeadMaintenance = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const nudgeCutoff = now - 24 * HOUR_MS;
    const coldCutoff = now - 72 * HOUR_MS;

    for (const stage of ["chatting", "sms_sent"] as const) {
      const leads = await ctx.db
        .query("leads")
        .withIndex("by_stage", (q) => q.eq("stage", stage).lt("lastEventAt", nudgeCutoff))
        .collect();
      for (const lead of leads) {
        const type = stage === "chatting" ? "nudge_due_dm" : "nudge_due_sms";
        const priorNudge = await ctx.db
          .query("events")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .filter((q) => q.eq(q.field("type"), type))
          .first();
        if (priorNudge === null) {
          await ctx.db.insert("events", { leadId: lead._id, ts: now, type });
          await ctx.db.patch(lead._id, { lastEventAt: now });
        }
      }
    }

    const tentativeSlots = await ctx.db
      .query("slots")
      .withIndex("by_status", (q) => q.eq("status", "tentative"))
      .collect();
    for (const slot of tentativeSlots) {
      if (slot._creationTime > now - 4 * HOUR_MS) continue;
      await ctx.db.patch(slot._id, { status: "released" });
      await ctx.db.insert("events", {
        leadId: slot.leadId,
        ts: now,
        type: "slot_released",
        payload: { slotId: slot._id },
      });
      await ctx.db.patch(slot.leadId, { lastEventAt: now });
    }

    const activeLeads = await ctx.db.query("leads").collect();
    for (const lead of activeLeads) {
      if (lead.stage === "cold") continue;
      const latestNudge = await ctx.db
        .query("events")
        .withIndex("by_lead", (q) => q.eq("leadId", lead._id).lt("ts", coldCutoff))
        .filter((q) =>
          q.or(
            q.eq(q.field("type"), "nudge_due_dm"),
            q.eq(q.field("type"), "nudge_due_sms"),
          ),
        )
        .order("desc")
        .first();
      if (latestNudge === null || lead.lastEventAt > latestNudge.ts) continue;
      await ctx.db.patch(lead._id, { stage: "cold", lastEventAt: now });
      await ctx.db.insert("events", { leadId: lead._id, ts: now, type: "stage_changed", payload: { stage: "cold" } });
    }
  },
});

const crons = cronJobs();
crons.interval(
  "process lead maintenance",
  { minutes: 10 },
  internal.crons.processLeadMaintenance,
);

export default crons;
