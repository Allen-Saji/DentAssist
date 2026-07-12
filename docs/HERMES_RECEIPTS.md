# Hermes Session Receipts

DentAssist was built WITH Hermes (coding partner) and RUNS ON Hermes (base
harness -- patients talk to a Hermes Telegram gateway). Every session below is
replayable on this machine via "hermes sessions list" / resume by ID.

## Build sessions (Claude Code orchestrated, Hermes implemented)

| Session ID | What happened |
|---|---|
| 20260712_120432_b08186 | Kickoff sync: plan handed to Hermes |
| 20260712_121822_28bfc2 | Delta sync: WhatsApp -> Telegram channel pivot |
| 20260712_122615_5dda37 | Chunk 1: Convex backend (schema, missed-call webhook, leads, crons) |
| 20260712_123759_662177 | Chunk 2: dentassist-clinic skill + ElevenLabs voice pipeline |
| 20260712_124533_0193b0 | Chunk 3: dashboard (landing + waitlist + lead board) |
| 20260712_134747_1f209f | Chunk 4: emergency triage, qualification, voice-in, dashboard polish |

## Runtime sessions (product IS Hermes)

| Session ID | What happened |
|---|---|
| 20260712_133706_a65f25db | Real patient-side conversation (teammate via t.me/dent_assistbot deep link) |

## Verify live

    hermes sessions list

Gateway: Telegram webhook mode on this machine; skill at skill/dentassist-clinic/;
per-turn logging lands in Convex (leads/events tables) -- cross-check any
Telegram turn against the events table timestamps.
