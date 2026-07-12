import { v } from "convex/values";
import { internalMutation, query } from "./functions";

const serviceValidator = v.object({
  name: v.string(),
  priceMin: v.number(),
  priceMax: v.number(),
  notes: v.optional(v.string()),
});

export const create = internalMutation({
  args: {
    name: v.string(),
    phoneDigits: v.string(),
    services: v.array(serviceValidator),
    hours: v.optional(v.string()),
    briefText: v.optional(v.string()),
  },
  handler: async (ctx, clinic) => {
    return await ctx.db.insert("clinics", clinic);
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const clinic = await ctx.db.query("clinics").first();
    return clinic === null ? null : { _id: clinic._id, name: clinic.name };
  },
});
