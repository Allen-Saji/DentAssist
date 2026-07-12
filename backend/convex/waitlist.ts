import { v } from "convex/values";
import { mutation } from "./functions";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const add = mutation({
  args: { email: v.string(), source: v.string() },
  handler: async (ctx, { email, source }) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      throw new Error("Enter a valid email address");
    }

    const existing = await ctx.db
      .query("waitlist")
      .filter((q) => q.eq(q.field("email"), normalizedEmail))
      .first();
    if (existing !== null) return existing._id;

    return await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      source,
      ts: Date.now(),
    });
  },
});
