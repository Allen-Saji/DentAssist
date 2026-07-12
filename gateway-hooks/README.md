# Gateway Hooks

Hermes gateway extensions. Install by copying each directory into
~/.hermes/hooks/ and restarting the gateway.

- dentassist-start: intercepts Telegram /start deep links (which the
  gateway otherwise ignores as platform pings) for non-owner users,
  links the tapping user to their missed-call lead in Convex, and
  replies with an instant clinic greeting.
