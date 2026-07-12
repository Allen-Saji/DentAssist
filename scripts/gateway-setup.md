# DentAssist clinic bot gateway setup

Use these steps after both `TELEGRAM_BOT_TOKEN` and `CONVEX_URL` exist. They temporarily replace the default profile's personal Telegram bot with the public DentAssist clinic bot. Commands assume the repo is at `/home/allen/dentassist`.

Hermes references verified for this run:

- Telegram setup: https://hermes-agent.nousresearch.com/docs/user-guide/messaging/telegram
- Runtime media behavior: `/home/allen/.hermes/hermes-agent/agent/prompt_builder.py`, lines 657-679
- Runtime OGG/Opus routing: `/home/allen/.hermes/hermes-agent/gateway/platforms/base.py`, lines 110-130
- Runtime MEDIA dispatch: `/home/allen/.hermes/hermes-agent/gateway/run.py`, lines 13146-13242

## 1. Back up the personal-bot configuration

Do not print either secret. Back up the two files before editing:

```bash
set -euo pipefail
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup_dir="$HOME/.hermes/backups/dentassist-gateway-$stamp"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
cp "$HOME/.hermes/.env" "$backup_dir/.env"
cp "$HOME/.hermes/config.yaml" "$backup_dir/config.yaml"
chmod 600 "$backup_dir/.env" "$backup_dir/config.yaml"
printf 'Backup: %s\n' "$backup_dir"
```

Keep the printed backup path for rollback.

## 2. Put the clinic token and Convex URL in the gateway environment

Open the Hermes environment file without putting secrets in shell history:

```bash
${EDITOR:-nano} "$HOME/.hermes/.env"
```

Set or replace these lines manually:

```dotenv
TELEGRAM_BOT_TOKEN=<clinic bot token from BotFather>
TELEGRAM_ALLOW_ALL_USERS=true
CONVEX_URL=<Convex deployment origin, for example https://name.convex.cloud>
```

Leave the existing `ELEVENLABS_API_KEY` unchanged. `ELEVENLABS_VOICE_ID` is optional; when absent, `scripts/voice_note.sh` uses ElevenLabs Adam.

`TELEGRAM_ALLOW_ALL_USERS=true` is required because this is a public patient bot. Do not use `TELEGRAM_ALLOWED_USERS=*` alongside it.

Verify presence without printing values:

```bash
grep -q '^TELEGRAM_BOT_TOKEN=.' "$HOME/.hermes/.env"
grep -q '^TELEGRAM_ALLOW_ALL_USERS=true$' "$HOME/.hermes/.env"
grep -q '^CONVEX_URL=.' "$HOME/.hermes/.env"
grep -q '^ELEVENLABS_API_KEY=.' "$HOME/.hermes/.env"
```

## 3. Activate the repo skill for Telegram

Open the Hermes config:

```bash
${EDITOR:-nano} "$HOME/.hermes/config.yaml"
```

Merge these entries into the existing YAML. Do not create duplicate top-level keys:

```yaml
skills:
  external_dirs:
    - /home/allen/dentassist/skill

platforms:
  telegram:
    enabled: true
```

The external directory makes the committed skill discoverable without copying it into `~/.hermes/skills`. Its frontmatter restricts it to `platforms: [telegram]`, so Hermes offers it only in Telegram sessions; its trigger description causes the gateway agent to load it for clinic conversations.

Ensure it is not disabled for Telegram:

```bash
hermes skills config
```

In the interactive skill list, select the Telegram platform, find `dentassist-clinic`, enable it if disabled, then save and exit.

Validate configuration before restarting:

```bash
hermes config check
hermes skills list | grep -q 'dentassist-clinic'
```

If the skill is missing, confirm the configured external directory is exactly `/home/allen/dentassist/skill` and that `/home/allen/dentassist/skill/dentassist-clinic/SKILL.md` exists.

## 4. Restart the user gateway

```bash
systemctl --user restart hermes-gateway
systemctl --user --no-pager --full status hermes-gateway
```

The service status must be active. If not, inspect the log without exposing environment values:

```bash
journalctl --user -u hermes-gateway -n 100 --no-pager
```

## 5. Verify end to end

Use a real missed-call lead and its real phone digits. Do not seed fake patient data.

1. In Telegram, open the clinic bot through the real deep link (which delivers `/start <DIGITS>`), or send `/start <DIGITS>` directly.
2. Confirm the bot replies with the matched clinic name and the missed-call wording: `You called <clinic> a few minutes ago...`. Ask one clinic FAQ and confirm the answer contains only data from that clinic's backend record.
3. Open the Convex dashboard, find that lead, and confirm the event timeline contains `telegram_linked`, the inbound `patient_msg`, and the outbound `bot_msg` events for the exchange.

Optional voice check: ask for a voice reply and confirm Telegram renders a round voice bubble, not a rectangular audio attachment.

## Outbound Telegram voice behavior

The skill writes OGG/Opus audio to a host-visible absolute path and includes `MEDIA:/absolute/path.ogg` in its final response. The gateway extracts the `MEDIA:` tag, removes it from visible text, and dispatches the file. For Telegram, OGG/Opus marked by `MEDIA:` is treated as voice media and sent through the adapter's `send_voice`/Telegram `sendVoice` path, producing a native inline voice bubble.

This was verified in the official Telegram setup page's `Supported MEDIA file extensions` and `Outgoing Voice` sections, plus the local Hermes source files listed at the top of this document.

## Roll back to the personal bot

Use the backup path printed in step 1. Restoring both files removes the clinic token, public access flag, Convex URL changes, external skill directory changes, and Telegram wildcard skill binding in one operation.

```bash
set -euo pipefail
backup_dir="$HOME/.hermes/backups/dentassist-gateway-<UTC timestamp from step 1>"
test -f "$backup_dir/.env"
test -f "$backup_dir/config.yaml"
cp "$backup_dir/.env" "$HOME/.hermes/.env"
cp "$backup_dir/config.yaml" "$HOME/.hermes/config.yaml"
chmod 600 "$HOME/.hermes/.env" "$HOME/.hermes/config.yaml"
hermes config check
systemctl --user restart hermes-gateway
systemctl --user --no-pager --full status hermes-gateway
```

Verify rollback by messaging the personal bot and confirming it replies. The clinic bot should stop replying after Telegram polling transfers back to the restored personal-bot token.
