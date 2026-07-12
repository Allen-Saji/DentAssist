import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { makeFunctionReference } from "convex/server";
import { useMutation } from "convex/react";
import "./landing.css";

const priorities = [
  { level: "P0", title: "Emergency now", detail: "Breathing or swallowing difficulty, uncontrolled bleeding, major facial trauma", action: "Emergency guidance + immediate clinic alert", tone: "red" },
  { level: "P1", title: "Same-day review", detail: "Severe pain, facial swelling, fever, knocked-out or badly broken tooth", action: "Urgent slot or dentist callback", tone: "orange" },
  { level: "P2", title: "Within 24–72 hours", detail: "Persistent pain, lost crown, localised swelling, minor fracture", action: "Priority appointment options", tone: "gold" },
  { level: "P3", title: "Routine care", detail: "Check-up, cleaning, cosmetic or painless consultation", action: "Next suitable standard slot", tone: "green" },
];

const flow = [
  ["01", "A call is missed", "A webhook creates a tracked lead the moment a call goes unanswered."],
  ["02", "WhatsApp or Telegram replies", "The patient receives a clinic-branded message in under two minutes."],
  ["03", "Priority is assigned", "Hermes asks structured questions and routes emergency warning signs safely."],
  ["04", "The right slot is held", "Procedure-aware availability creates a tentative hold for front-desk confirmation."],
];

const addSignup = makeFunctionReference<
  "mutation",
  { clinicName: string; contactName: string; city: string; email: string; phone: string },
  { ok: true; signupId: string }
>("signups:add");
const trackVisit = makeFunctionReference<
  "mutation",
  { sessionId: string; path: string; referrer: string; userAgent: string },
  { ok: true }
>("visits:track");

export default function Landing(): ReactElement {
  const add = useMutation(addSignup);
  const track = useMutation(trackVisit);
  const [modal, setModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [demoStage, setDemoStage] = useState(0);

  useEffect(() => {
    const key = "dentassist_visit_id";
    let sessionId = sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(key, sessionId);
      void track({ sessionId, path: location.pathname, referrer: document.referrer, userAgent: navigator.userAgent }).catch(() => undefined);
    }
  }, [track]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setFormError("");
    const data = new FormData(e.currentTarget);
    try {
      await add({
        clinicName: String(data.get("clinic") ?? ""),
        contactName: String(data.get("name") ?? ""),
        city: String(data.get("city") ?? ""),
        email: String(data.get("email") ?? ""),
        phone: String(data.get("phone") ?? ""),
      });
      setSubmitted(true);
    } catch {
      setFormError("We couldn’t save your details. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function openTrial() {
    setSubmitted(false);
    setFormError("");
    setModal(true);
  }

  return (
    <main className="landing-page">
      <header className="nav shell">
        <a className="brand" href="#top" aria-label="DentAssist home"><span className="brandmark">D</span>DentAssist</a>
        <nav aria-label="Primary navigation">
          <a href="#how">How it works</a><a href="#emergency">Emergency routing</a><a href="#pricing">Pricing</a>
        </nav>
        <button className="navCta" onClick={openTrial}>Test free 5 missed calls</button>
      </header>

      <section className="hero shell" id="top">
        <div className="heroCopy">
          <p className="eyebrow">Missed-call revenue recovery for dental clinics</p>
          <h1>Turn every missed dental call into the right next action<span>.</span></h1>
          <p className="lede">Follow up on WhatsApp or Telegram in under two minutes, prioritise emergencies, and hold the right appointment slot—even while your team is busy.</p>
          <div className="heroActions">
            <button className="primary" onClick={openTrial}>Test free 5 missed calls</button>
            <a className="secondary" href="#how">See how it works</a>
          </div>
          <p className="micro">No setup call required · Live in minutes · No card details stored</p>
        </div>

        <div className="heroVisual" aria-label="Live missed-call recovery example">
          <div className="portraitWrap"><img src="/dentist-hero.png" alt="Dentist in a bright modern clinic" /></div>
          <div className="liveCard">
            <div className="cardTop"><span><i></i> Live missed call</span><small>10:24 AM</small></div>
            <div className="caller"><b>PS</b><span><strong>Priya S.</strong><small>New patient · severe tooth pain</small></span></div>
            <div className="response"><span>Response time</span><strong>38 sec</strong></div>
            <div className="timeline">
              <p><b className="wa">✓</b><span><strong>Message sent</strong><small>“Hi Priya, are you in severe pain or experiencing swelling?”</small></span></p>
              <p><b>!</b><span><strong>Priority assigned</strong><small>P1 · Same-day review</small></span></p>
              <p><b>▣</b><span><strong>Slot held</strong><small>Today, 4:30 PM · Dr Nidhi</small></span></p>
            </div>
            <div className="statusRow"><span>● Urgent</span><span>▣ Slot held</span></div>
          </div>
          <div className="emergencyMini"><span>Emergency priority</span><strong>P1 · Same-day review</strong><small>Severe pain detected</small></div>
        </div>
      </section>

      <section className="proofRail">
        <div className="shell railInner">
          <span>☎ <b>Missed call</b></span><i></i><span>◉ <b>WhatsApp in &lt;2 min</b></span><i></i><span>★ <b>Priority assigned</b></span><i></i><span>▣ <b>Slot held</b></span>
        </div>
      </section>

      <section className="section shell" id="how">
        <div className="sectionHead"><p className="eyebrow">One patient-safe workflow</p><h2>Your front desk’s fastest pair of hands.</h2><p>DentAssist handles the gap between an unanswered call and a confirmed conversation. Your team stays in control.</p></div>
        <div className="flowGrid">{flow.map(([n,t,d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
      </section>

      <section className="emergencySection" id="emergency">
        <div className="shell">
          <div className="emergencyIntro"><div><p className="eyebrow">Emergency priority routing</p><h2>Urgency first. Revenue second.</h2></div><p>The assistant does not diagnose. It asks clinic-approved questions, detects warning signs and escalates conservatively. Commercial value never overrides clinical priority.</p></div>
          <div className="priorityGrid">{priorities.map(p => <article className={p.tone} key={p.level}><div><span>{p.level}</span><h3>{p.title}</h3></div><p>{p.detail}</p><small>{p.action}</small></article>)}</div>
          <div className="safetyNote"><b>Safety rule:</b> Difficulty breathing or swallowing, rapidly spreading swelling, uncontrolled bleeding or major trauma triggers immediate emergency guidance—not appointment sales. DentAssist supports clinic operations and does not provide diagnosis or treatment advice.</div>
        </div>
      </section>

      <section className="section shell productTest">
        <div className="testCopy"><p className="eyebrow">See the decision logic</p><h2>Try a missed-call journey.</h2><p>Step through a representative patient flow and see what your front desk receives.</p><div className="scenario"><button className={demoStage === 0 ? "active" : ""} onClick={() => setDemoStage(0)}>Missed call</button><button className={demoStage === 1 ? "active" : ""} onClick={() => setDemoStage(1)}>Patient reply</button><button className={demoStage === 2 ? "active" : ""} onClick={() => setDemoStage(2)}>Priority</button><button className={demoStage === 3 ? "active" : ""} onClick={() => setDemoStage(3)}>Slot held</button></div></div>
        <div className="phoneDemo">
          <div className="phoneTop">Smile Dental <span>● Online</span></div>
          {demoStage === 0 && <div className="chat"><p className="system">Missed call captured · 10:24 AM</p><p className="bot">Hi Priya, sorry we missed your call. Are you looking for an appointment, pricing information, or urgent help with pain?</p></div>}
          {demoStage === 1 && <div className="chat"><p className="patient">I have severe tooth pain since last night and my cheek is a little swollen.</p><p className="bot">I’m sorry you’re in pain. Are you having difficulty breathing or swallowing, fever, or rapidly increasing swelling?</p></div>}
          {demoStage === 2 && <div className="chat"><p className="system urgent">P1 · Same-day review</p><p className="bot">Your answers may need urgent dental attention. The clinic has been alerted. I can hold today at 4:30 PM while the team reviews your request.</p></div>}
          {demoStage === 3 && <div className="chat"><p className="system booked">Tentative slot held</p><p className="bot">Today · 4:30 PM with Dr Nidhi<br/>Hold expires in 15 minutes. The clinic will confirm shortly.</p></div>}
          <button onClick={() => setDemoStage((demoStage + 1) % 4)}>Next step →</button>
        </div>
      </section>

      <section className="pricingSection" id="pricing">
        <div className="shell priceLayout">
          <div><p className="eyebrow">Premium test plan</p><h2>Prove it on your own missed calls.</h2><p>Run five real missed-call journeys before committing to a larger deployment. Configure one clinic, its services, pricing bands and appointment rules.</p><ul><li>Setup in minutes</li><li>Clinic-approved emergency questions</li><li>Clear event log for every captured call</li></ul></div>
          <article className="priceCard">
            <div className="premiumLabel">Premium</div><p>Product test</p><h3>₹4,999 <small>/ month</small></h3><div className="capture"><strong>5</strong><span>missed-call captures<br/>included</span></div>
            <ul><li>WhatsApp or Telegram follow-up in under 2 minutes</li><li>Dental intent and emergency prioritisation</li><li>Hindi and English voice notes</li><li>Tentative, procedure-aware slot holds</li><li>24h and 72h follow-up nudges</li><li>Lead board and revenue-at-stake tracking</li><li>Clinic memory for services and pricing bands</li></ul>
            <a className="primary full paymentLink" href="https://app.dodopayments.com/home" target="_blank" rel="noreferrer">Make payment</a><small className="fine">For operational support only. Not a medical diagnosis service.</small>
          </article>
        </div>
      </section>

      <section className="cta shell"><div><p className="eyebrow">Ready when your front desk isn’t</p><h2>Recover the next patient you would have missed.</h2></div><button className="primary" onClick={openTrial}>Test free 5 missed calls</button></section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brandmark">D</span>DentAssist</a><p>Missed-call recovery for modern dental clinics.</p><small>© 2026 DentAssist · Privacy · Terms · Clinical safety</small></footer>

      {modal && <div className="modalBackdrop" onMouseDown={() => setModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="trial-title" onMouseDown={e => e.stopPropagation()}><button className="close" onClick={() => setModal(false)} aria-label="Close">×</button>{submitted ? <div className="success"><span>✓</span><h2 id="trial-title">Your test request is in.</h2><p>Your signup has been saved. We’ll use the clinic details you shared to prepare your five missed-call captures and send the activation link.</p><button className="primary" onClick={() => setModal(false)}>Done</button></div> : <><p className="eyebrow">Premium product test</p><h2 id="trial-title">Test free 5 missed calls.</h2><p className="modalIntro">Tell us where to send your clinic activation details.</p><form onSubmit={submit}><label>Clinic name<input required name="clinic" placeholder="Smile Dental Clinic" /></label><div className="fieldRow"><label>Your name<input required name="name" placeholder="Dr Meera" /></label><label>City<input required name="city" placeholder="Pune" /></label></div><label>Work email<input required type="email" name="email" placeholder="you@clinic.com" /></label><label>WhatsApp number<input required type="tel" name="phone" placeholder="+91 98765 43210" /></label><label className="consent"><input required type="checkbox" /> I agree to be contacted about activation. Patient health information should not be entered here.</label>{formError && <p className="formError">{formError}</p>}<button className="primary full" disabled={submitting} type="submit">{submitting ? "Saving…" : "Continue for Free account"}</button></form></>}</div></div>}
    </main>
  );
}

