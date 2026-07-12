import { v } from "convex/values";
import { mutation, query } from "./functions";

const stageValidator = v.union(
  v.literal("missed"),
  v.literal("sms_sent"),
  v.literal("chatting"),
  v.literal("slot_held"),
  v.literal("booked"),
  v.literal("cold"),
);

export const getByDigits = query({
  args: { digits: v.string() },
  handler: async (ctx, { digits }) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phoneDigits", digits))
      .order("desc")
      .first();
  },
});

export const linkTelegram = mutation({
  args: {
    digits: v.string(),
    tgUserId: v.string(),
    tgUsername: v.optional(v.string()),
  },
  handler: async (ctx, { digits, tgUserId, tgUsername }) => {
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_phone", (q) => q.eq("phoneDigits", digits))
      .order("desc")
      .first();
    if (lead === null) throw new Error("Lead not found");

    const ts = Date.now();
    await ctx.db.patch(lead._id, {
      tgUserId,
      tgUsername,
      stage: "chatting",
      lastEventAt: ts,
    });
    await ctx.db.insert("events", {
      leadId: lead._id,
      ts,
      type: "telegram_linked",
      payload: tgUsername === undefined ? { tgUserId } : { tgUserId, tgUsername },
    });

    const updatedLead = await ctx.db.get(lead._id);
    const clinic = await ctx.db.get(lead.clinicId);
    return { lead: updatedLead, clinic };
  },
});

export const logTurn = mutation({
  args: {
    leadId: v.id("leads"),
    type: v.string(),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, { leadId, type, payload }) => {
    const lead = await ctx.db.get(leadId);
    if (lead === null) throw new Error("Lead not found");
    const ts = Date.now();
    const eventId = await ctx.db.insert("events", { leadId, ts, type, payload });
    await ctx.db.patch(leadId, { lastEventAt: ts });
    return eventId;
  },
});

export const holdSlot = mutation({
  args: { leadId: v.id("leads"), requestedTime: v.number() },
  handler: async (ctx, { leadId, requestedTime }) => {
    const lead = await ctx.db.get(leadId);
    if (lead === null) throw new Error("Lead not found");
    const ts = Date.now();
    const slotId = await ctx.db.insert("slots", {
      leadId,
      clinicId: lead.clinicId,
      requestedTime,
      status: "tentative",
    });
    await ctx.db.patch(leadId, { stage: "slot_held", lastEventAt: ts });
    await ctx.db.insert("events", {
      leadId,
      ts,
      type: "slot_held",
      payload: { slotId, requestedTime },
    });
    return slotId;
  },
});

export const setStage = mutation({
  args: { leadId: v.id("leads"), stage: stageValidator },
  handler: async (ctx, { leadId, stage }) => {
    const lead = await ctx.db.get(leadId);
    if (lead === null) throw new Error("Lead not found");
    const ts = Date.now();
    await ctx.db.patch(leadId, { stage, lastEventAt: ts });
    await ctx.db.insert("events", { leadId, ts, type: "stage_changed", payload: { stage } });
    return await ctx.db.get(leadId);
  },
});

export const listLeads = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").order("desc").collect();
    return await Promise.all(
      leads.map(async (lead) => {
        const events = await ctx.db
          .query("events")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .collect();
        const heldSlot = await ctx.db
          .query("slots")
          .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
          .filter((q) => q.eq(q.field("status"), "tentative"))
          .first();
        const firstResponse = events
          .filter((event) => event.type === "bot_msg" || event.type === "sms")
          .sort((a, b) => a.ts - b.ts)[0];
        const latestEventTs = events.reduce(
          (latest, event) => Math.max(latest, event.ts),
          lead.firstMissedAt,
        );
        return {
          ...lead,
          latestEventTs,
          heldSlot,
          responseTimeMs:
            firstResponse === undefined ? null : firstResponse.ts - lead.firstMissedAt,
        };
      }),
    );
  },
});
