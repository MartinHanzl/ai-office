#!/bin/bash
# AI Office hook: forwards a Claude Code hook payload (stdin JSON) to the
# AI Office app on localhost. Fire-and-forget: never blocks or fails Claude,
# never prints anything (stdout of some hooks is injected into Claude's context).

PORT="${AI_OFFICE_PORT:-4747}"
payload="$(cat)"
# Terminal of the Claude process (lets the office focus the right window on click).
tty_name="$(ps -o tty= -p "$PPID" 2>/dev/null | tr -d ' ')"

# Strip bulky fields (tool output, file contents) – the office only needs metadata.
if command -v jq >/dev/null 2>&1; then
  slim="$(printf '%s' "$payload" | jq -c --arg tty "$tty_name" '
    del(.tool_response)
    | if (.tool_input | type) == "object"
      then .tool_input |= map_values(if type == "string" then .[0:300] else null end)
      else . end
    | if (.error | type) == "string" then .error |= .[0:300] else . end
    | . + {office_tty: $tty}' 2>/dev/null)"
  [ -n "$slim" ] && payload="$slim"
fi

(
  curl -s -m 2 -o /dev/null -X POST \
    -H 'Content-Type: application/json' \
    --data-binary @- "http://127.0.0.1:${PORT}/event" <<<"$payload" &
) >/dev/null 2>&1

exit 0
