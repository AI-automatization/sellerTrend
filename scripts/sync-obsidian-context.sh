#!/bin/bash
# VENTRA — Obsidian context auto-sync (har 10 daqiqada bir marta ishlaydi)

PROJECT_DIR="$HOME/Desktop/sellerTrend"
CONTEXT_FILE="$HOME/Documents/Obsidian Vault/PROJECTS/sellerTrend/_context.md"
LOCK_FILE="/tmp/ventra-obsidian-sync.last"

# 10 daqiqa = 600 soniya
INTERVAL=600
NOW_SEC=$(date +%s)

if [ -f "$LOCK_FILE" ]; then
  LAST_RUN=$(cat "$LOCK_FILE")
  DIFF=$((NOW_SEC - LAST_RUN))
  if [ "$DIFF" -lt "$INTERVAL" ]; then
    exit 0  # Hali 10 daqiqa o'tmagan
  fi
fi

echo "$NOW_SEC" > "$LOCK_FILE"

cd "$PROJECT_DIR" || exit 1

NOW=$(date "+%Y-%m-%d %H:%M")
BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

# Temp fayllar orqali multiline muammosini hal qilish
COMMITS_FILE=$(mktemp)
PENDING_FILE=$(mktemp)
OPEN_FILE=$(mktemp)

git log --oneline -5 --format="- %ad %s" --date=format:"%Y-%m-%d" 2>/dev/null > "$COMMITS_FILE"

grep "^### T-" "$PROJECT_DIR/docs/Tasks.md" 2>/dev/null \
  | grep "pending\[" \
  | sed 's/### /- /' \
  | head -5 > "$PENDING_FILE"

grep "^### T-" "$PROJECT_DIR/docs/Tasks.md" 2>/dev/null \
  | grep -v "done\[" \
  | grep -v "pending\[" \
  | sed 's/### /- /' \
  | head -5 > "$OPEN_FILE"

TEMP=$(mktemp)
SKIP=0

while IFS= read -r line; do
  if [[ "$line" == "## Последние коммиты" ]]; then
    echo "$line"
    echo ""
    cat "$COMMITS_FILE"
    SKIP=1
    continue
  fi

  if [[ "$line" == "## Авто-синхронизация" ]]; then
    echo "$line"
    echo "*Обновлено: $NOW*"
    echo "Ветка: \`$BRANCH\` | Незакоммиченных файлов: $UNCOMMITTED"
    if [ -s "$PENDING_FILE" ]; then
      echo ""
      echo "**Активные (pending):**"
      cat "$PENDING_FILE"
    fi
    if [ -s "$OPEN_FILE" ]; then
      echo ""
      echo "**Очередь (open):**"
      cat "$OPEN_FILE"
    fi
    SKIP=1
    continue
  fi

  if [[ $SKIP -eq 1 && "$line" == "## "* ]]; then
    SKIP=0
  fi

  if [[ $SKIP -eq 0 ]]; then
    echo "$line"
  fi
done < "$CONTEXT_FILE" > "$TEMP"

mv "$TEMP" "$CONTEXT_FILE"

rm -f "$COMMITS_FILE" "$PENDING_FILE" "$OPEN_FILE"
