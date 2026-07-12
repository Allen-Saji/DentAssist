import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { makeFunctionReference } from "convex/server";
import { useMutation, useQuery } from "convex/react";

type Stage = "missed" | "sms_sent" | "chatting" | "slot_held" | "booked" | "cold";

type Event = {
  _id: string;
  ts: number;
  type: string;
  payload?: unknown;
};

type HeldSlot = {
  requestedTime: number;
  status: "tentative" | "confirmed" | "released";
} | null;

type Lead = {
  _id: string;
  phoneDigits: string;
  stage: Stage;
  firstMissedAt: number;
  latestEventTs: number;
  revenueAtStake?: number;
  revenueAtStakeMin?: number;
  revenueAtStakeMax?: number;
  responseTimeMs: number | null;
  heldSlot: HeldSlot;
  events: Event[];
};

type Clinic = { _id: string; name: string } | null;

const addToWaitlist = makeFunctionReference<
  "mutation",
  { email: string; source: string },
  string
>("waitlist:add");
const listLeads = makeFunctionReference<"query", Record<string, never>, Lead[]>(
  "leads:listLeads",
);
const currentClinic = makeFunctionReference<"query", Record<string, never>, Clinic>(
  "clinics:current",
);

const stageLabels: Record<Stage, string> = {
  missed: "Missed",
  sms_sent: "SMS sent",
  chatting: "Chatting",
  slot_held: "Slot held",
  booked: "Booked",
  cold: "Cold",
};

function relativeTime(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return seconds < 5 ? "just now" : `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatResponse(milliseconds: number | null): string {
  if (milliseconds === null) return "Waiting";
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

function formatPhone(digits: string): string {
  if (digits.length !== 10) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
}

function formatMoney(amount?: number): string {
  return amount === undefined
    ? "Not estimated"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
}

function potentialRange(lead: Lead): [number, number] | null {
  if (lead.revenueAtStakeMin !== undefined && lead.revenueAtStakeMax !== undefined) {
    return [lead.revenueAtStakeMin, lead.revenueAtStakeMax];
  }
  return lead.revenueAtStake === undefined
    ? null
    : [lead.revenueAtStake, lead.revenueAtStake];
}

function formatPotential(lead: Lead): string {
  const range = potentialRange(lead);
  if (range === null) return "Not estimated";
  return range[0] === range[1]
    ? formatMoney(range[0])
    : `${formatMoney(range[0])} - ${formatMoney(range[1])}`;
}

function isUrgent(lead: Lead): boolean {
  return lead.events.some((event) => event.type === "emergency_flagged");
}

function formatSlot(timestamp: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function payloadText(payload: unknown): string {
  if (payload === undefined || payload === null) return "No additional details";
  if (typeof payload === "string") return payload;
  if (typeof payload === "number" || typeof payload === "boolean") return String(payload);
  try {
    return JSON.stringify(payload);
  } catch {
    return "Event details unavailable";
  }
}

function Landing(): ReactElement {
  const add = useMutation(addToWaitlist);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      await add({ email, source: "landing" });
      setStatus("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join the waitlist");
      setStatus("error");
    }
  }

  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Primary navigation">
        <a className="brand" href="/">DentAssist</a>
        <a className="board-link" href="/board">Lead board</a>
      </nav>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">AI reception for dental clinics</p>
          <h1>The front desk that never misses a call</h1>
          <p className="hero-sub">Every missed call gets an instant response and a clear path to a booked appointment.</p>
          {status === "success" ? (
            <div className="success" role="status">
              <strong>You are on the list.</strong>
              <span>We will reach out when your clinic can get started.</span>
            </div>
          ) : (
            <form className="waitlist-form" onSubmit={submit} noValidate>
              <label htmlFor="email">Work email</label>
              <div className="form-row">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@clinic.com"
                  aria-describedby={status === "error" ? "email-error" : undefined}
                />
                <button type="submit" disabled={status === "submitting"}>
                  {status === "submitting" ? "Joining..." : "Join waitlist"}
                </button>
              </div>
              {status === "error" && <p id="email-error" className="form-error">{error}</p>}
            </form>
          )}
        </div>
        <div className="hero-proof" aria-label="DentAssist response flow">
          <div className="proof-step">
            <span>Missed call</span>
            <strong>Patient could not reach the desk</strong>
          </div>
          <div className="proof-line" />
          <div className="proof-step active">
            <span>Instant follow-up</span>
            <strong>DentAssist starts the conversation</strong>
          </div>
          <div className="proof-line" />
          <div className="proof-step">
            <span>Appointment</span>
            <strong>A suitable slot is held for the patient</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

function Board(): ReactElement {
  const leads = useQuery(listLeads, {});
  const clinic = useQuery(currentClinic, {});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const now = Date.now();
  const selected = leads?.find((lead) => lead._id === selectedId) ?? null;
  const todayStart = new Date().setHours(0, 0, 0, 0);
  const todayLeads = leads?.filter((lead) => lead.firstMissedAt >= todayStart) ?? [];
  const responded = todayLeads.filter((lead) => lead.responseTimeMs !== null);
  const averageResponse = responded.length === 0
    ? null
    : responded.reduce((total, lead) => total + (lead.responseTimeMs ?? 0), 0) / responded.length;
  const slotsHeld = todayLeads.filter((lead) => lead.heldSlot !== null).length;
  const sortedLeads = useMemo(
    () => [...(leads ?? [])].sort((a, b) => {
      const urgencyDifference = Number(isUrgent(b)) - Number(isUrgent(a));
      return urgencyDifference || b.latestEventTs - a.latestEventTs;
    }),
    [leads],
  );
  const potentialPipeline = (leads ?? []).reduce(
    (total, lead) => {
      const range = potentialRange(lead);
      return range === null
        ? total
        : [total[0] + range[0], total[1] + range[1]] as [number, number];
    },
    [0, 0] as [number, number],
  );
  const estimatedLeadCount = (leads ?? []).filter((lead) => potentialRange(lead) !== null).length;
  const pipelineLabel = estimatedLeadCount === 0
    ? "Not estimated"
    : potentialPipeline[0] === potentialPipeline[1]
      ? formatMoney(potentialPipeline[0])
      : `${formatMoney(potentialPipeline[0])} - ${formatMoney(potentialPipeline[1])}`;

  const metrics = useMemo(() => [
    { label: "Leads today", value: leads === undefined ? "-" : String(todayLeads.length) },
    { label: "Avg first-response time", value: leads === undefined ? "-" : formatResponse(averageResponse) },
    { label: "Slots held", value: leads === undefined ? "-" : String(slotsHeld) },
    { label: "Potential pipeline", value: leads === undefined ? "-" : pipelineLabel },
  ], [averageResponse, leads, pipelineLabel, slotsHeld, todayLeads.length]);

  return (
    <main className="board-page">
      <header className="board-header">
        <div>
          <a className="brand" href="/">DentAssist</a>
          <h1>{clinic === undefined ? "Loading clinic..." : clinic?.name ?? "Clinic lead board"}</h1>
          <p>Live missed-call recovery</p>
        </div>
        <div className="metrics">
          {metrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
        </div>
      </header>

      <section className="board-content">
        <div className="lead-panel">
          <div className="section-heading">
            <h2>Lead activity</h2>
            <span>{leads?.length ?? 0} total</span>
          </div>
          {leads === undefined ? (
            <div className="loading-rows" aria-label="Loading leads">
              <div /><div /><div />
            </div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              <strong>No leads yet</strong>
              <span>The phone has not missed a call today.</span>
            </div>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Phone</th><th>Stage</th><th>Response</th><th>Potential pipeline</th><th>Last activity</th><th>Held slot</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLeads.map((lead) => (
                    <tr
                      key={lead._id}
                      className={`${lead._id === selectedId ? "selected" : ""} ${isUrgent(lead) ? "urgent-row" : ""}`.trim()}
                      onClick={() => setSelectedId(lead._id)}
                    >
                      <td>
                        <button className="row-button" type="button" onClick={() => setSelectedId(lead._id)}>{formatPhone(lead.phoneDigits)}</button>
                        {isUrgent(lead) && <span className="urgent-badge">URGENT</span>}
                      </td>
                      <td><span className={`stage stage-${lead.stage}`}>{stageLabels[lead.stage]}</span></td>
                      <td className="numeric">{formatResponse(lead.responseTimeMs)}</td>
                      <td className="numeric potential-value">{formatPotential(lead)}</td>
                      <td>{relativeTime(lead.latestEventTs, now)}</td>
                      <td>{lead.heldSlot === null ? "-" : formatSlot(lead.heldSlot.requestedTime)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="timeline-panel" aria-live="polite">
          <div className="section-heading">
            <h2>Timeline</h2>
            {selected && <span>{formatPhone(selected.phoneDigits)}</span>}
          </div>
          {selected === null ? (
            <div className="empty-state compact">
              <strong>Select a lead</strong>
              <span>Click a row to inspect every event.</span>
            </div>
          ) : selected.events.length === 0 ? (
            <div className="empty-state compact">
              <strong>No events recorded</strong>
              <span>Activity will appear here as it happens.</span>
            </div>
          ) : (
            <ol className="timeline">
              {selected.events.map((event) => (
                <li key={event._id}>
                  <div className="timeline-meta">
                    <strong>{event.type.replaceAll("_", " ")}</strong>
                    <time dateTime={new Date(event.ts).toISOString()}>{relativeTime(event.ts, now)}</time>
                  </div>
                  <p>{payloadText(event.payload)}</p>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </section>
    </main>
  );
}

export default function App(): ReactElement {
  return window.location.pathname === "/board" ? <Board /> : <Landing />;
}
