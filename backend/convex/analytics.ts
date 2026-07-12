import { query } from "./functions";

export const summary = query({
  args: {},
  handler: async (ctx) => {
    const [leads, events, visits, signups, waitlist, slots] = await Promise.all([
      ctx.db.query("leads").collect(),
      ctx.db.query("events").collect(),
      ctx.db.query("pageVisits").collect(),
      ctx.db.query("signups").collect(),
      ctx.db.query("waitlist").collect(),
      ctx.db.query("openSlots").collect(),
    ]);

    const byStage: Record<string, number> = {};
    for (const lead of leads) byStage[lead.stage] = (byStage[lead.stage] ?? 0) + 1;

    const eventCounts: Record<string, number> = {};
    for (const event of events) eventCounts[event.type] = (eventCounts[event.type] ?? 0) + 1;

    let pipelineMin = 0;
    let pipelineMax = 0;
    for (const lead of leads) {
      if (lead.stage === "cold") continue;
      if (lead.revenueAtStakeMin !== undefined) pipelineMin += lead.revenueAtStakeMin;
      if (lead.revenueAtStakeMax !== undefined) pipelineMax += lead.revenueAtStakeMax;
    }

    const responseTimes: number[] = [];
    for (const lead of leads) {
      const firstReply = events
        .filter((event) => event.leadId === lead._id && event.type === "bot_msg")
        .sort((a, b) => a.ts - b.ts)[0];
      if (firstReply !== undefined) {
        responseTimes.push(Math.max(0, firstReply.ts - lead.firstMissedAt));
      }
    }
    const avgResponseMs =
      responseTimes.length === 0
        ? null
        : Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);

    return {
      totals: {
        visits: visits.length,
        uniqueSessions: new Set(visits.map((v) => v.sessionId)).size,
        signups: signups.length,
        waitlist: waitlist.length,
        leads: leads.length,
        loggedEvents: events.length,
        openSlots: slots.filter((s) => s.status === "open").length,
        bookedSlots: slots.filter((s) => s.status === "booked").length,
      },
      byStage,
      eventCounts,
      pipeline: { min: pipelineMin, max: pipelineMax },
      avgResponseMs,
    };
  },
});
