#!/bin/bash
# AI Office status line for Claude Code.
# Forwards the status JSON (incl. subscription rate limits) to AI Office and prints
# a compact status line: folder · model · remaining % of the 5h window and the week.

PORT="${AI_OFFICE_PORT:-4747}"
input="$(cat)"

(
  curl -s -m 2 -o /dev/null -X POST \
    -H 'Content-Type: application/json' \
    --data-binary @- "http://127.0.0.1:${PORT}/status" <<<"$input" &
) >/dev/null 2>&1

if ! command -v jq >/dev/null 2>&1; then
  echo "AI Office"
  exit 0
fi

printf '%s' "$input" | jq -r '
  def left(w): if w and w.used_percentage != null then "\(100 - (w.used_percentage | floor)) %" else "–" end;
  [
    "📁 \((.workspace.current_dir // .cwd // "") | split("/") | last)",
    (.model.display_name // "Claude"),
    "⛽ 5h \(left(.rate_limits.five_hour)) · týden \(left(.rate_limits.seven_day))"
  ] | join(" · ")' 2>/dev/null || echo "AI Office"
