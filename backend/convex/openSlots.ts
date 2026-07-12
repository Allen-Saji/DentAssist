import { v } from "convex/values";
import { internalMutation, mutation, query } from "./functions";

const FALLBACK_PAYMENT_URL = "https://app.dodopayments.com/home";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const slots = await ctx.db
      .query("openSlots")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    return slots
      .filter((slot) => slot.ts > now)
      .sort((a, b) => a.ts - b.ts)
      .slice(0, 6)
      .map((slot) => ({ _id: slot._id, ts: slot.ts, label: slot.label }));
  },
});

export const seed = internalMutation({
  args: { slots: v.array(v.object({ ts: v.number(), label: v.string() })) },
  handler: async (ctx, { slots }) => {
    const clinic = await ctx.db.query("clinics").first();
    if (clinic === null) return { error: "Clinic not found" } as const;
    for (const slot of slots) {
      await ctx.db.insert("openSlots", {
        clinicId: clinic._id,
        ts: slot.ts,
        label: slot.label,
        status: "open",
      });
    }
    return { ok: true, count: slots.length } as const;
  },
});

export const book = mutation({
  args: { leadId: v.id("leads"), slotId: v.id("openSlots") },
  handler: async (ctx, { leadId, slotId }) => {
    const lead = await ctx.db.get(leadId);
    if (lead === null) throw new Error("Lead not found");
    const slot = await ctx.db.get(slotId);
    if (slot === null || slot.status !== "open") {
      return { ok: false, reason: "slot_unavailable" } as const;
    }
    const ts = Date.now();
    await ctx.db.patch(slotId, { status: "booked", bookedLeadId: leadId });
    await ctx.db.patch(leadId, { stage: "booked", lastEventAt: ts });
    await ctx.db.insert("events", {
      leadId,
      ts,
      type: "booked",
      payload: { slotId, slotTs: slot.ts, label: slot.label },
    });
    const paymentUrl = process.env.DODO_PAYMENT_LINK ?? FALLBACK_PAYMENT_URL;
    return { ok: true, label: slot.label, paymentUrl } as const;
  },
});
