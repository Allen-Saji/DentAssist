# DentAssist

The front desk that never misses a call.

Clinics miss 20-25 calls a week while staff are mid-procedure. A single implant consult is worth Rs 60,000, and a lead who calls twice without an answer books a competitor the same day. DentAssist turns every missed call into an instant follow-up conversation and a tracked lead, within two minutes, without the front desk lifting a finger.

## How it works

```text
patient calls the clinic ---- nobody picks up
        |
        v
clinic handset (MacroDroid)
  1. logs the missed call to the backend  --->  Convex: lead created
  2. auto-texts the caller a chat link (SMS from the clinic's own number)
        |
        v
caller taps the link  --->  clinic assistant chat (Telegram bot on Hermes)
  - greets the caller already knowing which missed call they are
  - answers service and pricing questions from the clinic's brief
  - holds a tentative appointment slot for the front desk to confirm
  - sends longer answers as voice notes (ElevenLabs)
        |
        v
front desk lead board (Cloudflare Pages + Convex live queries)
  response time | stage | slots held | revenue at stake
```

Silent leads are re-nudged at 24h and 72h, then marked cold. Every conversation turn, slot hold, and nudge is an auditable event on the lead timeline.

## Stack

- Hermes: agent harness. The assistant patients talk to runs on Hermes with a clinic skill; Hermes also built most of this repo as coding partner.
- Convex: leads, events, slots, clinic briefs, crons, website signups, page visits, and the missed-call HTTP webhook.
- Telegram Bot API: conversation channel for day one. WhatsApp Business Cloud API (registered clinic number) is the production channel on the roadmap.
- ElevenLabs: text-to-speech for voice-note replies.
- Cloudflare Pages: hosts the lead board.
- Dodo Payments: clinic pilot subscription checkout.
- MacroDroid: missed-call trigger and first-touch SMS on the clinic handset. Cloud telephony (Exotel missed-call webhook) replaces this for multi-line clinics.

## Repo layout

```text
backend/    Convex app: schema, http webhook, lead functions, crons
skill/      Hermes clinic skill: lead matching, FAQ answers, slot holds, voice notes
dashboard/  Lead board (Vite + React), deployed to Cloudflare Pages
scripts/    Ops helpers: gateway config, voice-note pipeline
docs/       Architecture notes
```

## Setup

```bash
cd backend && npm install && npx convex dev   # Convex functions + dashboard URL
cd dashboard && npm install && npm run dev    # lead board
```

Environment:

| Variable | Where | Purpose |
| --- | --- | --- |
| TELEGRAM_BOT_TOKEN | Hermes gateway | clinic assistant bot |
| ELEVENLABS_API_KEY | Hermes / scripts | voice-note TTS |
| CONVEX_URL | skill, dashboard | backend deployment URL |
| DENTASSIST_WEBHOOK_SECRET | Convex, MacroDroid | shared secret for the missed-call webhook |

MacroDroid macro on the clinic handset: trigger "Call Missed" with two actions, an HTTP POST of the caller number to the Convex webhook and an SMS to the caller containing the bot deep link.

## Status

Built from scratch at the Hermes Buildathon (GrowthX x Nous Research), Gurugram, on July 12, 2026, during the 8-hour on-site sprint. Expect hackathon edges; the lead pipeline, conversations, and payments shown in the demo are real.

Built by Allen Saji (engineering) and team (go-to-market).

The landing page design was contributed by the sales teammate and ported from
[dentassist-missed-call-recovery](https://github.com/Ed-coddy66/dentassist-missed-call-recovery).
Landing-page signups and visit events are stored in Convex.

## License

MIT
