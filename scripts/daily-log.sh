#!/bin/bash
# VENTRA — Daily terminal logs → Obsidian DAILY
# Ishlatish: bash scripts/daily-log.sh
# Yoki kechqurun avtomatik: crontab -e → 0 23 * * * bash ~/Desktop/sellerTrend/scripts/daily-log.sh

PROJECT_DIR="$HOME/Desktop/sellerTrend"
DAILY_DIR="$HOME/Documents/Obsidian Vault/DAILY"
TODAY=$(date "+%Y-%m-%d")
WEEK=$(date "+%Y-W%V")
DAILY_FILE="$DAILY_DIR/$TODAY.md"
NOW=$(date "+%H:%M")

# ─── 1. Daily fayl yo'q bo'lsa yaratish ───────────────────
if [ ! -f "$DAILY_FILE" ]; then
  cat > "$DAILY_FILE" <<EOF
---
date: $TODAY
week: $WEEK
---

# $TODAY

> Hafta: [[WEEKLY/$WEEK|$WEEK]]

## Bugungi fokus
-

## Claude sessiyalari
-

## Bajarildi
-

## Terminal loglar

## Eslatmalar
EOF
  echo "✓ Yangi daily fayl yaratildi: $TODAY.md"
fi

# ─── 2. Git commits (bugun) ───────────────────────────────
cd "$PROJECT_DIR" || exit 1

GIT_LOG=$(git log --oneline --format="- \`%ad\` %s" \
  --date=format:"%H:%M" \
  --after="$TODAY 00:00:00" 2>/dev/null)

# ─── 3. Servis loglari ───────────────────────────────────
API_LOG=""
WEB_LOG=""
WORKER_LOG=""

if [ -f /tmp/api.log ]; then
  API_LOG=$(grep -E "\[Nest\].*LOG|ERROR|WARN" /tmp/api.log 2>/dev/null \
    | tail -30 \
    | sed 's/\x1b\[[0-9;]*m//g' \
    | sed 's/^/    /')
fi

if [ -f /tmp/web.log ]; then
  WEB_LOG=$(grep -v "^$" /tmp/web.log 2>/dev/null \
    | tail -10 \
    | sed 's/\x1b\[[0-9;]*m//g' \
    | sed 's/^/    /')
fi

if [ -f /tmp/worker.log ]; then
  WORKER_LOG=$(grep -v "^$" /tmp/worker.log 2>/dev/null \
    | tail -20 \
    | sed 's/\x1b\[[0-9;]*m//g' \
    | sed 's/^/    /')
fi

# ─── 4. Terminal loglar bo'limi kontenti ─────────────────
build_terminal_section() {
  echo "## Terminal loglar"
  echo ""
  echo "### Git commits"
  if [ -n "$GIT_LOG" ]; then
    echo "$GIT_LOG"
  else
    echo "- (bugun commit yo'q)"
  fi
  echo ""

  if [ -n "$API_LOG" ]; then
    echo "### API"
    echo '```'
    echo "$API_LOG"
    echo '```'
    echo ""
  fi

  if [ -n "$WEB_LOG" ]; then
    echo "### Web"
    echo '```'
    echo "$WEB_LOG"
    echo '```'
    echo ""
  fi

  if [ -n "$WORKER_LOG" ]; then
    echo "### Worker"
    echo '```'
    echo "$WORKER_LOG"
    echo '```'
    echo ""
  fi

  echo "*Yangilandi: $TODAY $NOW*"
}

# ─── 5. Faylga yozish ─────────────────────────────────────
TEMP=$(mktemp)

if grep -q "^## Terminal loglar" "$DAILY_FILE"; then
  # Bo'lim bor — yangilash
  SKIP=0
  while IFS= read -r line; do
    if [[ "$line" == "## Terminal loglar" ]]; then
      build_terminal_section
      SKIP=1
      continue
    fi
    if [[ $SKIP -eq 1 && "$line" == "## "* ]]; then
      SKIP=0
    fi
    if [[ $SKIP -eq 0 ]]; then
      echo "$line"
    fi
  done < "$DAILY_FILE" > "$TEMP"
else
  # Bo'lim yo'q — oxiriga qo'shish
  cp "$DAILY_FILE" "$TEMP"
  echo "" >> "$TEMP"
  build_terminal_section >> "$TEMP"
fi

mv "$TEMP" "$DAILY_FILE"

echo "✓ Daily log yangilandi: $DAILY_FILE"
echo "  Git commits: $(echo "$GIT_LOG" | grep -c "^-" 2>/dev/null || echo 0) ta"
[ -n "$API_LOG" ] && echo "  API log: ✓"
[ -n "$WEB_LOG" ] && echo "  Web log: ✓"
[ -n "$WORKER_LOG" ] && echo "  Worker log: ✓"
