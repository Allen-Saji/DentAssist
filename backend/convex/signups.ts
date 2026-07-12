import { v } from "convex/values";
import { mutation } from "./functions";

const limits = {
  clinicName: 160,
  contactName: 120,
  city: 120,
  email: 200,
  phone: 40,
} as const;

function required(value: string, limit: number): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error("All fields are required");
  return trimmed.slice(0, limit);
}

export const add = mutation({
  args: {
    clinicName: v.string(),
    contactName: v.string(),
    city: v.string(),
    email: v.string(),
    phone: v.string(),
  },
  handler: async (ctx, args) => {
    const signup = {
      clinicName: required(args.clinicName, limits.clinicName),
      contactName: required(args.contactName, limits.contactName),
      city: required(args.city, limits.city),
      email: required(args.email, limits.email).toLowerCase(),
      phone: required(args.phone, limits.phone),
    };
    const existing = await ctx.db
      .query("signups")
      .withIndex("by_email", (q) => q.eq("email", signup.email))
      .first();
    if (existing !== null) return { ok: true as const, signupId: existing._id };

    const signupId = await ctx.db.insert("signups", {
      ...signup,
      plan: "Premium - 5 missed calls",
      source: "website",
      status: "new",
      createdAt: Date.now(),
    });
    return { ok: true as const, signupId };
  },
});