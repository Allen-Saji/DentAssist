import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const service = v.object({
  name: v.string(),
  priceMin: v.number(),
  priceMax: v.number(),
  notes: v.optional(v.string()),
});

const leadStage = v.union(
  v.literal("missed"),
  v.literal("sms_sent"),
  v.literal("chatting"),
  v.literal("slot_held"),
  v.literal("booked"),
  v.literal("cold"),
);

const schema = defineSchema({
  clinics: defineTable({
    name: v.string(),
    phoneDigits: v.string(),
    services: v.array(service),
    hours: v.optional(v.string()),
    briefText: v.optional(v.string()),
  }),
  leads: defineTable({
    clinicId: v.id("clinics"),
    phoneDigits: v.string(),
    tgUserId: v.optional(v.string()),
    tgUsername: v.optional(v.string()),
    stage: leadStage,
    firstMissedAt: v.number(),
    lastEventAt: v.number(),
    service: v.optional(v.string()),
    revenueAtStake: v.optional(v.number()),
    revenueAtStakeMin: v.optional(v.number()),
    revenueAtStakeMax: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_phone", ["phoneDigits"])
    .index("by_tgUser", ["tgUserId"])
    .index("by_stage", ["stage", "lastEventAt"]),
  events: defineTable({
    leadId: v.id("leads"),
    ts: v.number(),
    type: v.string(),
    payload: v.optional(v.any()),
  }).index("by_lead", ["leadId", "ts"]),
  slots: defineTable({
    leadId: v.id("leads"),
    clinicId: v.id("clinics"),
    requestedTime: v.number(),
    status: v.union(
      v.literal("tentative"),
      v.literal("confirmed"),
      v.literal("released"),
    ),
  })
    .index("by_lead", ["leadId"])
    .index("by_status", ["status"]),
  waitlist: defineTable({
    email: v.string(),
    source: v.string(),
    ts: v.number(),
  }),
  payments: defineTable({
    provider: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    ref: v.string(),
    ts: v.number(),
  }),
});

export default schema;
