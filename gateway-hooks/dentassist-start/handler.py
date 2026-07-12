"""DentAssist: handle Telegram /start deep links from missed-call SMS.

The gateway normally ignores /start as a platform ping. For non-owner
telegram users this hook intercepts it: links the tapping user to their
missed-call lead in Convex (payload = caller digits) and returns an
instant clinic greeting.
"""
import asyncio
import json
import re
import urllib.request
from pathlib import Path

OWNER_ID = "1327684419"
ENV_FILE = Path.home() / ".hermes" / ".env"

GREETING = (
    "Hi, this is the Smile Dental Care assistant. Sorry we missed your call!\n\n"
    "How can we help today? Ask about treatments, prices or timings, or "
    "describe the problem. Typing or a voice note (Hindi or English) both work."
)


def _convex_url():
    try:
        for line in ENV_FILE.read_text().splitlines():
            if line.startswith("CONVEX_URL="):
                return line.split("=", 1)[1].strip().rstrip("/")
    except OSError:
        pass
    return ""


def _link_lead(digits, user_id):
    url = _convex_url()
    if not url:
        return False
    req = urllib.request.Request(
        url + "/api/mutation",
        data=json.dumps({
            "path": "leads:linkTelegram",
            "args": {"digits": digits, "tgUserId": user_id},
            "format": "json",
        }).encode(),
        headers={"content-type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=6) as resp:
        body = json.loads(resp.read().decode())
    return body.get("status") == "success"


async def handle(event_type, context):
    if context.get("command") != "start" or context.get("platform") != "telegram":
        return {"decision": "allow"}
    user_id = str(context.get("user_id", ""))
    if not user_id or user_id == OWNER_ID:
        return {"decision": "allow"}

    digits = re.sub(r"\D", "", str(context.get("args", "")))[-10:]
    if len(digits) == 10:
        try:
            await asyncio.to_thread(_link_lead, digits, user_id)
        except Exception:
            pass  # linking is best effort; the skill can recover by asking

    return {"decision": "handled", "message": GREETING}
