#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# VENTRA Autonomous Agent Runner
# MAX plan bilan ishlaydi — API key KERAK EMAS
#
# Ishlatish:
#   bash scripts/ventra-agent.sh                    # 1 ta task
#   bash scripts/ventra-agent.sh --count 5          # 5 ta task
#   bash scripts/ventra-agent.sh --dry-run          # faqat ko'rish
#   bash scripts/ventra-agent.sh --zone BACKEND     # faqat backend
#   bash scripts/ventra-agent.sh --priority P0      # faqat P0
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── CONFIG ────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKS_FILE="$PROJECT_DIR/docs/Tasks.md"
DONE_FILE="$PROJECT_DIR/docs/Done.md"
LOG_DIR="$PROJECT_DIR/scripts/agent-logs"
DEVELOPER="Bekzod"
MAX_RETRIES=2
TASK_TIMEOUT=600  # 10 min per task

# ─── ARGUMENTS ─────────────────────────────────────────────
COUNT=1
DRY_RUN=false
ZONE_FILTER=""
PRIORITY_FILTER=""
AUTO_YES=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --count)    COUNT="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --zone)     ZONE_FILTER="$2"; shift 2 ;;
    --priority) PRIORITY_FILTER="$2"; shift 2 ;;
    --yes|-y)   AUTO_YES=true; shift ;;
    --help)
      echo "VENTRA Autonomous Agent Runner"
      echo ""
      echo "  --count N      Nechta task bajarish (default: 1)"
      echo "  --dry-run      Faqat task ro'yxatini ko'rsat, bajarma"
      echo "  --zone ZONE    Faqat shu zone: BACKEND, FRONTEND, DEVOPS"
      echo "  --priority P   Faqat shu priority: P0, P1, P2, P3"
      echo "  --help         Shu yordam"
      exit 0
      ;;
    *) echo "Noma'lum argument: $1"; exit 1 ;;
  esac
done

# ─── COLORS ────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[AGENT]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()   { echo -e "${RED}[FAIL]${NC} $1"; }
log_task()  { echo -e "${CYAN}[TASK]${NC} $1"; }

# ─── SETUP ─────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
cd "$PROJECT_DIR"

log_info "VENTRA Autonomous Agent Runner"
log_info "Project: $PROJECT_DIR"
log_info "Developer: $DEVELOPER"
log_info "Tasks to run: $COUNT"
echo ""

# ─── PARSE TASKS ───────────────────────────────────────────
# Tasks.md dan ochiq tasklarni o'qish
# Format: ### T-XXX | P(0-3) | CATEGORY | Title | Time

parse_tasks() {
  local tasks=()
  local current_id=""
  local current_priority=""
  local current_category=""
  local current_title=""
  local current_time=""
  local current_status=""
  local current_description=""
  local current_files=""
  local in_task=false

  while IFS= read -r line; do
    # Format 1: ### T-XXX | P(0-3) | CATEGORY | Title | Time
    # Format 2: ### T-XXX | CATEGORY | Title | Time (P yo'q)
    if [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+)[[:space:]]*\|[[:space:]]*P([0-3])[[:space:]]*\|[[:space:]]*([A-Z]+)[[:space:]]*\|[[:space:]]*(.+)\|[[:space:]]*(.+) ]]; then
      # Oldingi task ni saqlash
      if [[ -n "$current_id" && "$in_task" == true ]]; then
        tasks+=("$current_id|$current_priority|$current_category|$current_title|$current_time|$current_status|$current_description|$current_files")
      fi

      current_id="${BASH_REMATCH[1]}"
      current_priority="${BASH_REMATCH[2]}"
      current_category="${BASH_REMATCH[3]}"
      current_title="${BASH_REMATCH[4]}"
      current_time="${BASH_REMATCH[5]}"
      current_status=""
      current_description=""
      current_files=""
      in_task=true

      # pending status tekshirish
      if [[ "$line" =~ pending\[([^\]]+)\] ]]; then
        current_status="pending[${BASH_REMATCH[1]}]"
      fi

    elif [[ "$line" =~ ^###[[:space:]]+(T-[0-9]+)[[:space:]]*\|[[:space:]]*([A-Z]+)[[:space:]]*\|[[:space:]]*(.+)\|[[:space:]]*(.+) ]]; then
      # Format 2: P yo'q — P2 default
      if [[ -n "$current_id" && "$in_task" == true ]]; then
        tasks+=("$current_id|$current_priority|$current_category|$current_title|$current_time|$current_status|$current_description|$current_files")
      fi

      current_id="${BASH_REMATCH[1]}"
      current_priority="2"
      current_category="${BASH_REMATCH[2]}"
      current_title="${BASH_REMATCH[3]}"
      current_time="${BASH_REMATCH[4]}"
      current_status=""
      current_description=""
      current_files=""
      in_task=true

      if [[ "$line" =~ pending\[([^\]]+)\] ]]; then
        current_status="pending[${BASH_REMATCH[1]}]"
      fi
    elif [[ "$in_task" == true ]]; then
      # Fayllar qatori
      if [[ "$line" =~ \*\*Fayllar?:\*\*[[:space:]]*(.+) ]]; then
        current_files="${BASH_REMATCH[1]}"
      fi
      # Description qo'shish
      current_description+="$line"$'\n'
    fi
  done < "$TASKS_FILE"

  # Oxirgi task
  if [[ -n "$current_id" && "$in_task" == true ]]; then
    tasks+=("$current_id|$current_priority|$current_category|$current_title|$current_time|$current_status|$current_description|$current_files")
  fi

  printf '%s\n' "${tasks[@]}"
}

# ─── FILTER & SORT TASKS ──────────────────────────────────

select_tasks() {
  local all_tasks
  all_tasks=$(parse_tasks)

  local filtered=()

  while IFS='|' read -r id priority category title time status description files; do
    [[ -z "$id" ]] && continue

    # pending bo'lganlarni o'tkazib yuborish
    [[ -n "$status" ]] && continue

    # Zone filter
    if [[ -n "$ZONE_FILTER" && "$category" != "$ZONE_FILTER" ]]; then
      continue
    fi

    # Priority filter
    if [[ -n "$PRIORITY_FILTER" && "P$priority" != "$PRIORITY_FILTER" ]]; then
      continue
    fi

    # Faqat T-XXX formatdagi tasklar (E-, comment, boshqa narsalar emas)
    [[ ! "$id" =~ ^T-[0-9]+$ ]] && continue

    # DEVOPS va CONFIG tasklarni o'tkazib yuborish (qo'lda bajariladi)
    [[ "$category" == "DEVOPS" || "$category" == "CONFIG" ]] && continue

    filtered+=("$priority|$id|$category|$title|$time|$files|$description")
  done <<< "$all_tasks"

  # Priority bo'yicha sort (P0 birinchi)
  printf '%s\n' "${filtered[@]}" | sort -t'|' -k1,1n | head -n "$COUNT"
}

# ─── BUILD PROMPT ──────────────────────────────────────────

build_prompt() {
  local task_id="$1"
  local category="$2"
  local title="$3"
  local files="$4"
  local description="$5"

  # Qaysi CLAUDE_*.md yuklash
  local rules_file="CLAUDE_BACKEND.md"
  local zone_dirs="apps/api/, apps/worker/, apps/bot/, apps/web/, apps/extension/"
  if [[ "$category" == "FRONTEND" ]]; then
    zone_dirs="apps/web/, apps/extension/"
  fi

  cat <<PROMPT
Sen VENTRA loyihasining AUTONOMOUS AGENT isan.
Developer: $DEVELOPER | Zone: $category

## TASK
ID: $task_id
Category: $category
Title: $title
Files: ${files:-"Task tavsifidan aniqla"}

## TASK TAVSIFI
$description

## QOIDALAR (MAJBURIY)
1. any type TAQIQLANGAN — interface yoki type alias ishlatish
2. HAR DB query da account_id filter bo'lishi SHART
3. BigInt fieldlar → .toString() MAJBURIY
4. console.log TAQIQLANGAN — NestJS Logger ishlatish
5. Max 400 qator per fayl
6. Inline styles TAQIQLANGAN — Tailwind class ishlatish
7. i18n: har matn useI18n + t() orqali

## ZONE CHEKLOVI
Faqat shu papkalarda ishla: $zone_dirs
Boshqa papkalarga TEGMA.

## BAJARISH TARTIBI
1. Task tavsifidagi "Muammo" va "Yechim" ni diqqat bilan o'qi
2. Tegishli fayllarni READ qil — avval tushun, keyin o'zgartir
3. Minimal o'zgartirish qil — faqat task so'raganini
4. O'z zone uchun type check qil: pnpm --filter api exec tsc --noEmit
5. Qisqa summary yoz: nima o'zgardi, qaysi fayllar

## CHEKLOVLAR
- Fayllarni o'chirishdan OLDIN ular ishlatilayotganini tekshir
- Yangi dependency qo'shma (agar task talab qilmasa)
- Test buzma
- Agar blocker bo'lsa — STOP, tushuntir, o'zingdan to'qima
PROMPT
}

# ─── EXECUTE TASK ──────────────────────────────────────────

execute_task() {
  local task_id="$1"
  local category="$2"
  local title="$3"
  local files="$4"
  local description="$5"

  local branch_name="auto/${task_id,,}-$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | head -c 30)"
  local log_file="$LOG_DIR/${task_id}-$(date +%Y%m%d-%H%M%S).log"
  local prompt
  prompt=$(build_prompt "$task_id" "$category" "$title" "$files" "$description")

  log_task "$task_id — $title"
  log_info "Branch: $branch_name"
  log_info "Log: $log_file"

  if [[ "$DRY_RUN" == true ]]; then
    log_warn "DRY RUN — bajarilmaydi"
    echo ""
    return 0
  fi

  # 1. Branch ochish
  git checkout main 2>/dev/null
  git pull origin main 2>/dev/null || true
  git checkout -b "$branch_name" 2>/dev/null || {
    log_warn "Branch allaqachon bor, o'chiraman"
    git branch -D "$branch_name" 2>/dev/null || true
    git checkout -b "$branch_name"
  }

  # 2. Claude -p bilan task bajarish
  log_info "Claude Agent ishga tushyapti..."

  local attempt=0
  local success=false

  while [[ $attempt -lt $MAX_RETRIES ]]; do
    attempt=$((attempt + 1))
    log_info "Urinish $attempt/$MAX_RETRIES"

    if timeout "$TASK_TIMEOUT" claude -p "$prompt" \
      --allowedTools "Read,Edit,Write,Glob,Grep,Bash" \
      > "$log_file" 2>&1; then

      # 3. Type check
      log_info "Type check..."
      if pnpm --filter api exec tsc --noEmit 2>/dev/null && \
         pnpm --filter web exec tsc --noEmit 2>/dev/null; then
        log_ok "tsc PASS"
        success=true
        break
      else
        log_warn "tsc FAIL — retry"
        # tsc xatosini prompt ga qo'shib qayta urinish
        local tsc_error
        tsc_error=$(pnpm --filter api exec tsc --noEmit 2>&1 | tail -20)
        prompt="$prompt

## TSC XATOLIK (tuzat!)
$tsc_error"
      fi
    else
      log_warn "Claude timeout yoki xato — retry"
    fi
  done

  if [[ "$success" == true ]]; then
    # 4. O'zgarishlar bormi?
    if git diff --quiet && git diff --cached --quiet; then
      log_warn "Hech qanday o'zgarish yo'q. Skip."
      git checkout main 2>/dev/null
      git branch -D "$branch_name" 2>/dev/null || true
      return 0
    fi

    # 5. Commit
    git add -A
    git commit -m "$(cat <<EOF
feat: $task_id — $title

Autonomous agent tomonidan bajarildi.
Zone: $category
Developer: $DEVELOPER

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
    )"

    # 6. Push
    git push -u origin "$branch_name" 2>/dev/null || {
      log_err "Push FAIL"
      git checkout main 2>/dev/null
      return 1
    }

    # 7. PR ochish
    if command -v gh &> /dev/null; then
      gh pr create \
        --title "auto: $task_id — $title" \
        --body "$(cat <<EOF
## Summary
Autonomous agent ($DEVELOPER zone) tomonidan bajarildi.

**Task:** $task_id
**Category:** $category
**Title:** $title

## QA
- [x] tsc --noEmit: PASS
- [ ] Manual review kerak

## Log
Agent log: \`scripts/agent-logs/${task_id}-*.log\`

---
Generated by VENTRA Autonomous Agent
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
        )" \
        --label "auto-generated" \
        --base main 2>/dev/null || log_warn "PR yaratishda xato (gh CLI)"

      log_ok "PR ochildi!"
    else
      log_warn "gh CLI topilmadi — PR qo'lda oching"
    fi

    git checkout main 2>/dev/null
    log_ok "$task_id TAYYOR!"
    return 0
  else
    log_err "$task_id BAJARILMADI (${MAX_RETRIES} urinish)"
    git checkout main 2>/dev/null
    git branch -D "$branch_name" 2>/dev/null || true
    return 1
  fi
}

# ─── MAIN ──────────────────────────────────────────────────

main() {
  log_info "Tasklarni tahlil qilyapman..."
  echo ""

  local tasks
  tasks=$(select_tasks)

  if [[ -z "$tasks" ]]; then
    log_warn "Ochiq task topilmadi (filter: zone=$ZONE_FILTER, priority=$PRIORITY_FILTER)"
    exit 0
  fi

  # Task ro'yxatini ko'rsatish
  local task_count=0
  echo "═══════════════════════════════════════════════════"
  echo " TANLANGAN TASKLAR"
  echo "═══════════════════════════════════════════════════"

  while IFS='|' read -r priority id category title time files description; do
    [[ -z "$id" ]] && continue
    task_count=$((task_count + 1))
    echo -e "  ${CYAN}$id${NC} | P$priority | $category | $title | $time"
  done <<< "$tasks"

  echo "═══════════════════════════════════════════════════"
  echo ""
  log_info "Jami: $task_count ta task"

  if [[ "$DRY_RUN" == true ]]; then
    log_warn "DRY RUN — hech narsa bajarilmaydi"
    exit 0
  fi

  # Tasdiqlash
  if [[ "$AUTO_YES" != true ]]; then
    echo ""
    read -p "Davom etaymi? (y/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_info "Bekor qilindi."
      exit 0
    fi
  fi

  # Tasklar bajarish
  local completed=0
  local failed=0

  while IFS='|' read -r priority id category title time files description; do
    [[ -z "$id" ]] && continue

    echo ""
    echo "───────────────────────────────────────────────────"

    if execute_task "$id" "$category" "$title" "$files" "$description"; then
      completed=$((completed + 1))
    else
      failed=$((failed + 1))
    fi
  done <<< "$tasks"

  # Natija
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " NATIJA"
  echo "═══════════════════════════════════════════════════"
  log_ok "Bajarildi: $completed"
  [[ $failed -gt 0 ]] && log_err "Bajarilmadi: $failed"
  echo "═══════════════════════════════════════════════════"
}

main
