import { type CSSProperties, type ReactElement } from "react";
import { makeFunctionReference } from "convex/server";
import { useQuery } from "convex/react";

type Summary = {
  totals: {
    visits: number;
    uniqueSessions: number;
    signups: number;
    waitlist: number;
    leads: number;
    loggedEvents: number;
    openSlots: number;
    bookedSlots: number;
  };
  byStage: Record<string, number>;
  eventCounts: Record<string, number>;
  pipeline: { min: number; max: number };
  avgResponseMs: number | null;
};

const summaryQuery = makeFunctionReference<"query", Record<string, never>, Summary>(
  "analytics:summary",
);

const wrap: CSSProperties = {
  maxWidth: 1000,
  margin: "0 auto",
  padding: "32px 20px 64px",
  fontFamily: "system-ui, sans-serif",
  color: "#22302F",
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
  gap: 12,
  marginBottom: 28,
};
const tile: CSSProperties = {
  background: "#fff",
  border: "1px solid #E4DED4",
  borderRadius: 12,
  padding: "14px 16px",
};
const tileNum: CSSProperties = { fontSize: 28, fontWeight: 700, color: "#0F5257" };
const tileLabel: CSSProperties = { fontSize: 13, color: "#5B6866", marginTop: 2 };
const h2: CSSProperties = { fontSize: 18, color: "#0F5257", margin: "24px 0 10px" };

function money(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

function mmss(ms: number | null): string {
  if (ms === null) return "n/a";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

const FUNNEL: Array<[string, string]> = [
  ["missed_call", "Missed calls"],
  ["sms_sent", "SMS sent (stage)"],
  ["chatting", "Chatting (stage)"],
  ["booked", "Bookings"],
];

export default function Analytics(): ReactElement {
  const data = useQuery(summaryQuery, {});
  if (data === undefined) {
    return <div style={wrap}><p>Loading live analytics...</p></div>;
  }
  const t = data.totals;
  const funnelCounts = [
    data.eventCounts["missed_call"] ?? 0,
    (data.byStage["sms_sent"] ?? 0) + (data.byStage["chatting"] ?? 0) +
      (data.byStage["slot_held"] ?? 0) + (data.byStage["booked"] ?? 0),
    (data.byStage["chatting"] ?? 0) + (data.byStage["slot_held"] ?? 0) +
      (data.byStage["booked"] ?? 0),
    data.eventCounts["booked"] ?? 0,
  ];
  const maxCount = Math.max(1, ...funnelCounts);
  const tiles: Array<[string | number, string]> = [
    [t.visits, "Landing visits"],
    [t.uniqueSessions, "Unique visitors"],
    [t.signups, "Clinic signups"],
    [t.leads, "Patient leads"],
    [data.eventCounts["missed_call"] ?? 0, "Missed calls captured"],
    [data.eventCounts["booked"] ?? 0, "Appointments booked"],
    [data.eventCounts["emergency_flagged"] ?? 0, "Emergencies flagged"],
    [mmss(data.avgResponseMs), "Avg first response"],
    [t.loggedEvents, "Events logged"],
    [`${t.openSlots} / ${t.openSlots + t.bookedSlots}`, "Slots open / total"],
  ];
  return (
    <div style={wrap}>
      <h1 style={{ color: "#0F5257", fontSize: 26 }}>DentAssist Analytics</h1>
      <p style={{ color: "#5B6866", marginTop: -6 }}>
        Live from Convex. Every number is a real logged row - nothing is estimated
        except the labelled pipeline range.
      </p>
      <div style={grid}>
        {tiles.map(([num, label]) => (
          <div style={tile} key={label}>
            <div style={tileNum}>{num}</div>
            <div style={tileLabel}>{label}</div>
          </div>
        ))}
      </div>
      <h2 style={h2}>Recovery funnel</h2>
      {FUNNEL.map(([, label], i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ width: 150, fontSize: 13, color: "#5B6866" }}>{label}</span>
          <div style={{
            height: 22, borderRadius: 6, background: "#0F5257",
            width: `${Math.max(3, (funnelCounts[i] / maxCount) * 100 * 0.7)}%`,
          }} />
          <strong>{funnelCounts[i]}</strong>
        </div>
      ))}
      <h2 style={h2}>Potential pipeline (price-band estimate, not revenue)</h2>
      <div style={{ ...tile, display: "inline-block", borderColor: "#E76F51" }}>
        <div style={{ ...tileNum, color: "#E76F51" }}>
          {data.pipeline.max === 0 ? "Not yet estimated" : `${money(data.pipeline.min)} - ${money(data.pipeline.max)}`}
        </div>
        <div style={tileLabel}>Sum across active leads with a matched service</div>
      </div>
      <h2 style={h2}>Event log breakdown</h2>
      <div style={grid}>
        {Object.entries(data.eventCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <div style={tile} key={type}>
            <div style={{ ...tileNum, fontSize: 22 }}>{count}</div>
            <div style={tileLabel}>{type}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: 28 }}>
        <a href="/board" style={{ color: "#0F5257" }}>Lead board</a>
        {"  |  "}
        <a href="/" style={{ color: "#0F5257" }}>Landing</a>
      </p>
    </div>
  );
}
