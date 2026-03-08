#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# VENTRA Self-Improvement Engine
# Har sessiya oxirida ishga tushiriladi
# Oxirgi commit lardagi xato pattern larni aniqlaydi
# va MEMORY.md ga yozadi
#
# Ishlatish:
#   bash scripts/self-improve.sh              # oxirgi 5 commit
#   bash scripts/self-improve.sh --commits 10 # oxirgi 10 commit
#   bash scripts/self-improve.sh --dry-run    # faqat ko'rish
# ═══════════════════════════════════════════════════════════

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MEMORY_DIR="$HOME/.claude/projects/C--Users-User-Desktop-TrendShopAnalyze/memory"
LEARNING_FILE="$MEMORY_DIR/learning.md"
MEMORY_FILE="$MEMORY_DIR/MEMORY.md"

COMMITS=5
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --commits)  COMMITS="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    *) shift ;;
  esac
done

cd "$PROJECT_DIR"

# ─── COLORS ────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}[SELF-IMPROVE]${NC} Oxirgi $COMMITS commit tahlil qilinmoqda..."
echo ""

# ─── GET DIFF ──────────────────────────────────────────────
DIFF=$(git diff HEAD~"$COMMITS"..HEAD 2>/dev/null || git diff HEAD~1..HEAD 2>/dev/null || echo "")

if [[ -z "$DIFF" ]]; then
  echo -e "${YELLOW}[WARN]${NC} Diff topilmadi. Chiqish."
  exit 0
fi

# ─── PATTERN DETECTION ─────────────────────────────────────
declare -A PATTERNS
declare -A PATTERN_DESC
declare -A PATTERN_RULE

# Pattern definitions
PATTERNS[any_type]=': any'
PATTERN_DESC[any_type]="TypeScript 'any' type ishlatilgan"
PATTERN_RULE[any_type]="any type TAQIQLANGAN — interface yoki type alias ishlatish"

PATTERNS[console_log]='console\.\(log\|warn\|error\|debug\)'
PATTERN_DESC[console_log]="console.log/warn/error ishlatilgan"
PATTERN_RULE[console_log]="Backend: NestJS Logger, Frontend: development only"

PATTERNS[missing_account_id]='findMany\|findFirst\|findUnique\|count\|aggregate'
PATTERN_DESC[missing_account_id]="DB query (account_id filter tekshirilmagan)"
PATTERN_RULE[missing_account_id]="HAR DB query da where: { account_id } SHART"

PATTERNS[bigint_no_tostring]='BigInt\|bigint\|balance\|amount'
PATTERN_DESC[bigint_no_tostring]="BigInt field ishlatilgan (toString tekshirilmagan)"
PATTERN_RULE[bigint_no_tostring]="BigInt → response da .toString() MAJBURIY"

PATTERNS[no_limit]='findMany({[^}]*})'
PATTERN_DESC[no_limit]="findMany da take/LIMIT yo'q bo'lishi mumkin"
PATTERN_RULE[no_limit]="HAR findMany da take: N (max 100) MAJBURIY"

PATTERNS[hardcoded_url]='http://localhost\|https://api\.\|:3000\|:5173'
PATTERN_DESC[hardcoded_url]="Hardcoded URL/port topildi"
PATTERN_RULE[hardcoded_url]="URL/port → env variable orqali (.env)"

PATTERNS[inline_style]='style={{.*}}'
PATTERN_DESC[inline_style]="React inline style ishlatilgan"
PATTERN_RULE[inline_style]="Inline style TAQIQLANGAN — Tailwind class ishlatish"

PATTERNS[magic_number]='=== [0-9][0-9][0-9]\|> [0-9][0-9][0-9]\|< [0-9][0-9][0-9]'
PATTERN_DESC[magic_number]="Magic number topildi (const bilan nomlash kerak)"
PATTERN_RULE[magic_number]="Magic number TAQIQLANGAN — const MAX_ITEMS = 100"

# ─── SCAN ──────────────────────────────────────────────────
FOUND_PATTERNS=()
FOUND_COUNT=0

for key in "${!PATTERNS[@]}"; do
  pattern="${PATTERNS[$key]}"
  matches=$(echo "$DIFF" | grep -c "^+" | head -1 || true)  # added lines only
  added_lines=$(echo "$DIFF" | grep "^+" | grep -c "${pattern}" 2>/dev/null || true)

  if [[ "$added_lines" -gt 0 ]]; then
    FOUND_PATTERNS+=("$key")
    FOUND_COUNT=$((FOUND_COUNT + added_lines))
    echo -e "  ${RED}[!]${NC} ${PATTERN_DESC[$key]} — $added_lines ta topildi"
  fi
done

if [[ ${#FOUND_PATTERNS[@]} -eq 0 ]]; then
  echo -e "${GREEN}[OK]${NC} Hech qanday xato pattern topilmadi!"
  exit 0
fi

echo ""
echo -e "${YELLOW}[WARN]${NC} ${#FOUND_PATTERNS[@]} ta pattern topildi ($FOUND_COUNT ta match)"
echo ""

# ─── UPDATE LEARNING FILE ─────────────────────────────────

mkdir -p "$MEMORY_DIR"

# learning.md yaratish (agar yo'q bo'lsa)
if [[ ! -f "$LEARNING_FILE" ]]; then
  cat > "$LEARNING_FILE" <<'HEADER'
# VENTRA — Agent Learning Log
# Self-improvement engine tomonidan avtomatik yangilanadi
# Format: pattern | occurrences | first_seen | last_seen | promoted

HEADER
fi

TODAY=$(date +%Y-%m-%d)

for key in "${!FOUND_PATTERNS[@]}"; do
  pattern_name="${FOUND_PATTERNS[$key]}"

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "  ${CYAN}[DRY]${NC} Would log: $pattern_name"
    continue
  fi

  # Mavjud entry bormi?
  if grep -q "^| $pattern_name |" "$LEARNING_FILE" 2>/dev/null; then
    # Occurrences oshirish
    # Oddiy approach: sed bilan counter oshirish
    current_count=$(grep "^| $pattern_name |" "$LEARNING_FILE" | awk -F'|' '{print $3}' | tr -d ' ')
    new_count=$((current_count + 1))

    # Update line
    sed -i "s/^| $pattern_name | $current_count /| $pattern_name | $new_count /" "$LEARNING_FILE"
    # Update last_seen
    sed -i "/^| $pattern_name /s/| [0-9-]* | \(yes\|no\) |/| $TODAY | \1 |/" "$LEARNING_FILE"

    echo -e "  ${YELLOW}[UPD]${NC} $pattern_name: $current_count → $new_count"

    # Promotion check: 3+ occurrences
    if [[ $new_count -ge 3 ]]; then
      # Check if already promoted
      if grep "^| $pattern_name " "$LEARNING_FILE" | grep -q "| no |"; then
        echo -e "  ${RED}[PROMOTE]${NC} $pattern_name → CLAUDE.md ga qoida qo'shilishi kerak!"
        sed -i "s/^| $pattern_name \(.*\)| no |/| $pattern_name \1| yes |/" "$LEARNING_FILE"

        # MEMORY.md ga ham yozish
        echo "" >> "$MEMORY_FILE"
        echo "## Auto-learned Rule ($TODAY)" >> "$MEMORY_FILE"
        echo "- ${PATTERN_RULE[$pattern_name]}" >> "$MEMORY_FILE"
      fi
    fi
  else
    # Yangi entry
    echo "| $pattern_name | 1 | $TODAY | $TODAY | no |" >> "$LEARNING_FILE"
    echo -e "  ${GREEN}[NEW]${NC} $pattern_name: birinchi marta qayd etildi"
  fi
done

echo ""
echo -e "${GREEN}[DONE]${NC} Learning log yangilandi: $LEARNING_FILE"

# ─── SUMMARY ───────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════"
echo " SELF-IMPROVEMENT SUMMARY"
echo "═══════════════════════════════════════════════════"
echo ""
echo " Tahlil qilingan: $COMMITS commit"
echo " Topilgan pattern: ${#FOUND_PATTERNS[@]}"
echo " Jami match: $FOUND_COUNT"
echo ""

if [[ -f "$LEARNING_FILE" ]]; then
  promoted=$(grep -c "| yes |" "$LEARNING_FILE" 2>/dev/null || echo "0")
  total_patterns=$(grep -c "^|" "$LEARNING_FILE" 2>/dev/null || echo "0")
  echo " Learning log: $total_patterns pattern kuzatilmoqda"
  echo " CLAUDE.md ga promote: $promoted ta"
fi

echo ""
echo "═══════════════════════════════════════════════════"
