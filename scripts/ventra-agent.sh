#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
# VENTRA Autonomous Agent Runner v3
# Git worktree isolation + Parallel batches + PM/BA agents
#
# Ishlatish:
#   bash scripts/ventra-agent.sh                    # 1 ta task (sequential)
#   bash scripts/ventra-agent.sh --count 5          # 5 ta task (sequential)
#   bash scripts/ventra-agent.sh --dry-run          # faqat ko'rish
#   bash scripts/ventra-agent.sh --zone BACKEND     # faqat backend
#   bash scripts/ventra-agent.sh --priority P0      # faqat P0
#   bash scripts/ventra-agent.sh --parallel 3       # 3 ta parallel
#   bash scripts/ventra-agent.sh --night            # full night mode
#
# Night mode = --yes --count 15 --parallel 3 --with-pm --with-ba
#
# Parallel mode (2 ta terminal):
#   Terminal 1: bash scripts/ventra-agent.sh --yes --zone BACKEND --count 5
#   Terminal 2: bash scripts/ventra-agent.sh --yes --zone FRONTEND --count 5
# ═══════════════════════════════════════════════════════════

set -euo pipefail

# ─── CONFIG ────────────────────────────────────────────────
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TASKS_FILE="$PROJECT_DIR/docs/Tasks.md"
DONE_FILE="$PROJECT_DIR/docs/Done.md"
LOG_DIR="$PROJECT_DIR/scripts/agent-logs"
WORKTREE_BASE="$PROJECT_DIR/.agent-worktrees"
DEVELOPER="Bekzod"
MAX_RETRIES=2
TASK_TIMEOUT=600  # 10 min per task
PM_BA_TIMEOUT=180 # 3 min for PM/BA agents
BATCH_COOLDOWN=30 # 30s cooldown between batches (rate limit himoya)
MAX_API_CALLS=40  # Budget guard: max API calls per session
API_CALL_COUNT=0  # Hozirgi sessiyada qilingan call soni

# ─── ARGUMENTS ─────────────────────────────────────────────
COUNT=1
DRY_RUN=false
ZONE_FILTER=""
PRIORITY_FILTER=""
AUTO_YES=false
PARALLEL=1
WITH_PM=false
WITH_BA=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --count)      COUNT="$2"; shift 2 ;;
    --dry-run)    DRY_RUN=true; shift ;;
    --zone)       ZONE_FILTER="$2"; shift 2 ;;
    --priority)   PRIORITY_FILTER="$2"; shift 2 ;;
    --yes|-y)     AUTO_YES=true; shift ;;
    --parallel)   PARALLEL="$2"; shift 2 ;;
    --with-pm)    WITH_PM=true; shift ;;
    --with-ba)    WITH_BA=true; shift ;;
    --night)
      AUTO_YES=true
      COUNT=15
      PARALLEL=3
      WITH_PM=true
      WITH_BA=true
      shift
      ;;
    --help)
      echo "VENTRA Autonomous Agent Runner v3 (parallel + PM/BA)"
      echo ""
      echo "  --count N      Nechta task bajarish (default: 1)"
      echo "  --dry-run      Faqat task ro'yxatini ko'rsat, bajarma"
      echo "  --zone ZONE    Faqat shu zone: BACKEND, FRONTEND, DEVOPS"
      echo "  --priority P   Faqat shu priority: P0, P1, P2, P3"
      echo "  --yes, -y      Tasdiqlashsiz bajarish"
      echo "  --parallel N   N ta task bir vaqtda (default: 1)"
      echo "  --with-pm      PM Agent: sprint plan + retro"
      echo "  --with-ba      BA Agent: biznes tahlil"
      echo "  --night        = --yes --count 15 --parallel 3 --with-pm --with-ba"
      echo "  --help         Shu yordam"
      echo ""
      echo "Misollar:"
      echo "  pnpm agent:night                    # Full night mode"
      echo "  bash scripts/ventra-agent.sh --parallel 2 --with-pm --count 6"
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
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[AGENT]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[  OK ]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN ]${NC} $1"; }
log_err()   { echo -e "${RED}[FAIL ]${NC} $1"; }
log_task()  { echo -e "${CYAN}[TASK ]${NC} $1"; }
log_pm()    { echo -e "${MAGENTA}[ PM  ]${NC} $1"; }
log_ba()    { echo -e "${MAGENTA}[ BA  ]${NC} $1"; }

# ─── BUDGET & RATE LIMIT ──────────────────────────────────

# API call counter — faylda saqlash (subshell safe)
init_budget() {
  echo "0" > "$RESULT_DIR/api_calls" 2>/dev/null || true
}

increment_api_call() {
  local current=0
  [[ -f "$RESULT_DIR/api_calls" ]] && current=$(cat "$RESULT_DIR/api_calls")
  echo $((current + 1)) > "$RESULT_DIR/api_calls"
}

get_api_calls() {
  [[ -f "$RESULT_DIR/api_calls" ]] && cat "$RESULT_DIR/api_calls" || echo "0"
}

check_budget() {
  local current
  current=$(get_api_calls)
  if [[ "$current" -ge "$MAX_API_CALLS" ]]; then
    log_err "BUDGET LIMIT: $current/$MAX_API_CALLS API call ishlatildi. TO'XTATILDI."
    return 1
  fi
  return 0
}

# Log fayldan rate limit yoki token xatolarni aniqlash
check_claude_errors() {
  local log_file="$1"
  [[ ! -f "$log_file" ]] && return 0

  # Rate limit (429)
  if grep -qi "rate.limit\|429\|too.many.requests\|overloaded" "$log_file" 2>/dev/null; then
    log_warn "Rate limit aniqlandi! 60s kutilmoqda..."
    sleep 60
    return 2  # 2 = rate limit, retry qilish mumkin
  fi

  # Token/context limit
  if grep -qi "context.length\|max.tokens\|token.limit\|context.window" "$log_file" 2>/dev/null; then
    log_warn "Token limit — prompt juda katta"
    return 3  # 3 = token limit, prompt kichraytirish kerak
  fi

  # Auth/billing error (API key yoki kredit tugagan)
  if grep -qi "invalid.api.key\|authentication\|insufficient.credit\|billing\|payment.required\|credit.balance" "$log_file" 2>/dev/null; then
    log_err "API KEY yoki KREDIT muammo! BARCHA tasklar to'xtatildi."
    echo "ABORT" > "$RESULT_DIR/abort_flag"
    return 4  # 4 = fatal, davom etish mumkin emas
  fi

  return 0
}

# Abort flag tekshirish (boshqa process fatal xato bergan bo'lsa)
is_aborted() {
  [[ -f "$RESULT_DIR/abort_flag" ]] && return 0 || return 1
}

# ─── SETUP ─────────────────────────────────────────────────
mkdir -p "$LOG_DIR"
mkdir -p "$WORKTREE_BASE"
cd "$PROJECT_DIR"

# Eski qoldiq worktree larni tozalash
git worktree prune 2>/dev/null || true

# Chiqishda worktree larni tozalash
cleanup() {
  log_info "Worktree'larni tozalayapman..."
  # Background processlarni to'xtatish
  jobs -p 2>/dev/null | xargs -r kill 2>/dev/null || true
  git worktree prune 2>/dev/null || true
}
trap cleanup EXIT

log_info "VENTRA Autonomous Agent Runner v3 (parallel + PM/BA)"
log_info "Project: $PROJECT_DIR"
log_info "Developer: $DEVELOPER"
log_info "Tasks: $COUNT | Parallel: $PARALLEL | PM: $WITH_PM | BA: $WITH_BA"
[[ -n "$ZONE_FILTER" ]] && log_info "Zone filter: $ZONE_FILTER"
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
  local in_code_block=false

  while IFS= read -r line; do
    # Code block ichidagi tasklarni o'tkazib yuborish (namuna/shablon)
    if [[ "$line" =~ ^\`\`\` ]]; then
      if [[ "$in_code_block" == true ]]; then
        in_code_block=false
      else
        in_code_block=true
      fi
      continue
    fi
    [[ "$in_code_block" == true ]] && continue

    # ~~T-XXX~~ DONE bo'lgan tasklarni o'tkazib yuborish
    if [[ "$line" =~ ^###[[:space:]]+~~T-[0-9]+~~ ]]; then
      continue
    fi

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

# ─── PM AGENT ─────────────────────────────────────────────

run_pm_plan() {
  log_pm "Sprint plan tayyorlayapman..."
  local log_file="$LOG_DIR/pm-plan-$(date +%Y%m%d-%H%M%S).log"
  local tasks_content done_tail git_log

  tasks_content=$(cat "$TASKS_FILE" 2>/dev/null | head -300)
  done_tail=$(tail -100 "$DONE_FILE" 2>/dev/null || echo "(bo'sh)")
  git_log=$(git log --oneline -30 2>/dev/null || echo "(bo'sh)")

  local prompt
  prompt=$(cat <<PMPROMPT
Sen VENTRA loyihasining PM (Project Manager) AGENT isan.
Vazifang: Sprint plan tayyorlash.

## KIRISH MA'LUMOTLARI

### Ochiq tasklar (Tasks.md):
$tasks_content

### Oxirgi bajarilganlar (Done.md tail):
$done_tail

### Oxirgi commitlar:
$git_log

## VAZIFA
1. Tasks.md dan P0 va P1 tasklarni ajrat
2. Dependency graph yoz (qaysi task qaysi taskdan oldin bo'lishi kerak)
3. Parallel batch taqsimotini yoz (bir batch da BIR XIL FAYL o'zgartiruvchi tasklar bo'lmasin)
4. Har batch da max $PARALLEL ta task
5. Developer yuk taqsimoti: Bekzod (backend+frontend), Sardor (landing+desktop)
6. Velocity: oxirgi Done.md yozuvlaridan actual vs planned vaqtni hisobla

## CHIQISH
docs/sprint-plan.md fayliga yoz. Mavjud templateni to'ldir.
Faqat docs/ papkaga yoz, kod fayllarni TEGMA.
PMPROMPT
  )

  if timeout "$PM_BA_TIMEOUT" claude -p "$prompt" \
    --allowedTools "Read,Write,Glob,Grep,Bash" \
    > "$log_file" 2>&1; then
    log_ok "PM plan tayyor → docs/sprint-plan.md"
    return 0
  else
    log_warn "PM Agent timeout yoki xato (log: $log_file)"
    return 1
  fi
}

run_pm_retro() {
  log_pm "Sprint retro yozilmoqda..."
  local log_file="$LOG_DIR/pm-retro-$(date +%Y%m%d-%H%M%S).log"
  local completed_count="$1"
  local failed_count="$2"
  local elapsed_min="$3"

  local prompt
  prompt=$(cat <<PMRETRO
Sen VENTRA loyihasining PM (Project Manager) AGENT isan.
Vazifang: Sprint retro yozish.

## Sprint natijalari
- Bajarildi: $completed_count ta task
- Bajarilmadi: $failed_count ta task
- Sarflangan vaqt: $elapsed_min daqiqa
- Parallel rejim: $PARALLEL ta bir vaqtda

## VAZIFA
1. docs/sprint-plan.md ni o'qi (bu sprint uchun plan bor)
2. scripts/agent-logs/ dagi eng yangi loglarni ko'r (natijalar)
3. Velocity hisobla: plan vs actual vaqt
4. Sprint retro bo'limini docs/sprint-plan.md ga qo'sh:
   - Nima yaxshi ishladi
   - Nima to'siq bo'ldi
   - Keyingi sprint uchun tavsiya
5. Trend: oldingi sprint ga qaraganda tezlashyaptimi yoki sekinlashyaptimi

## CHIQISH
docs/sprint-plan.md faylining "Sprint Retro" bo'limini yangilang.
Faqat docs/ papkaga yoz, kod fayllarni TEGMA.
PMRETRO
  )

  if timeout "$PM_BA_TIMEOUT" claude -p "$prompt" \
    --allowedTools "Read,Write,Edit,Glob,Grep,Bash" \
    > "$log_file" 2>&1; then
    log_ok "PM retro tayyor → docs/sprint-plan.md"
    return 0
  else
    log_warn "PM Retro timeout yoki xato (log: $log_file)"
    return 1
  fi
}

# ─── BA AGENT ─────────────────────────────────────────────

run_ba_analysis() {
  log_ba "Biznes tahlil boshlanmoqda..."
  local log_file="$LOG_DIR/ba-analysis-$(date +%Y%m%d-%H%M%S).log"
  local done_tail schema_summary

  done_tail=$(tail -150 "$DONE_FILE" 2>/dev/null || echo "(bo'sh)")
  schema_summary=$(grep -E "^model |^  [a-z]" "$PROJECT_DIR/apps/api/prisma/schema.prisma" 2>/dev/null | head -80 || echo "(bo'sh)")

  local prompt
  prompt=$(cat <<BAPROMPT
Sen VENTRA loyihasining BA (Business Analytics) AGENT isan.
Vazifang: Marketplace tahlili va biznes hisobot.

## KIRISH MA'LUMOTLARI

### Oxirgi bajarilganlar (Done.md):
$done_tail

### Prisma schema (modellar):
$schema_summary

## Platform haqida
VENTRA — uzum.uz marketplace uchun SaaS analytics.
Asosiy funksiyalar: mahsulot tracking, score hisoblash, niche discovery, sourcing.
Foydalanuvchilar: Uzum sotuvchilari (sellerlar).

## VAZIFA
1. Oxirgi Done.md yozuvlaridan qanday feature'lar qo'shilganini tahlil qil
2. Har feature ning biznesga ta'sirini baholay:
   - Foydalanuvchi qulayligi (UX)
   - Daromadga ta'sir (monetization)
   - Raqobatbardoshlik (competitor advantage)
3. Qaysi yo'nalishlar ustunlik qilishini tavsiya qil:
   - Ko'proq mahsulot tracking → retention
   - Niche discovery yaxshilash → acquisition
   - Billing/premium feature → revenue
4. Keyingi sprint uchun biznes nuqtai nazardan prioritetlar tavsiya qil

## CHIQISH
docs/ba-report.md fayliga yoz. Mavjud templateni to'ldir.
Faqat docs/ papkaga yoz, kod fayllarni TEGMA.
Maxfiy ma'lumotlar (email, password) yozma.
BAPROMPT
  )

  if timeout "$PM_BA_TIMEOUT" claude -p "$prompt" \
    --allowedTools "Read,Write,Glob,Grep,Bash" \
    > "$log_file" 2>&1; then
    log_ok "BA tahlil tayyor → docs/ba-report.md"
    return 0
  else
    log_warn "BA Agent timeout yoki xato (log: $log_file)"
    return 1
  fi
}

run_ba_measure() {
  log_ba "Feature ta'sir o'lchash..."
  local log_file="$LOG_DIR/ba-measure-$(date +%Y%m%d-%H%M%S).log"
  local completed_count="$1"

  local prompt
  prompt=$(cat <<BAMEASURE
Sen VENTRA loyihasining BA (Business Analytics) AGENT isan.
Vazifang: Sprint da bajarilgan ishlar ta'sirini o'lchash.

## Sprint natijalari
- Bu sprintda $completed_count ta task bajarildi

## VAZIFA
1. scripts/agent-logs/ dagi eng yangi loglarni o'qi — nima qilindi
2. docs/ba-report.md dagi mavjud tahlilni o'qi
3. "Feature Impact" bo'limini yangilay:
   - Har bajarilgan task uchun: qanday metrika yaxshilanishi kutiladi
   - UX, performance, revenue ta'sirlari
4. "Tavsiyalar" bo'limini yangilay:
   - Keyingi sprint uchun biznes prioritetlar

## CHIQISH
docs/ba-report.md faylini yangilang.
Faqat docs/ papkaga yoz, kod fayllarni TEGMA.
BAMEASURE
  )

  if timeout "$PM_BA_TIMEOUT" claude -p "$prompt" \
    --allowedTools "Read,Write,Edit,Glob,Grep,Bash" \
    > "$log_file" 2>&1; then
    log_ok "BA measurement tayyor → docs/ba-report.md"
    return 0
  else
    log_warn "BA Measure timeout yoki xato (log: $log_file)"
    return 1
  fi
}

# ─── EXECUTE TASK (WORKTREE ISOLATION) ────────────────────

execute_task() {
  local task_id="$1"
  local category="$2"
  local title="$3"
  local files="$4"
  local description="$5"

  local branch_name="auto/${task_id,,}-$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9-' | head -c 30)"
  local log_file="$LOG_DIR/${task_id}-$(date +%Y%m%d-%H%M%S).log"
  local worktree_dir="$WORKTREE_BASE/${task_id}"
  local prompt
  prompt=$(build_prompt "$task_id" "$category" "$title" "$files" "$description")

  log_task "$task_id — $title"
  log_info "Branch: $branch_name"
  log_info "Worktree: $worktree_dir"
  log_info "Log: $log_file"

  if [[ "$DRY_RUN" == true ]]; then
    log_warn "DRY RUN — bajarilmaydi"
    echo ""
    return 0
  fi

  # ── 1. Eski worktree tozalash ──
  if [[ -d "$worktree_dir" ]]; then
    log_warn "Eski worktree topildi, tozalayapman..."
    git worktree remove "$worktree_dir" --force 2>/dev/null || rm -rf "$worktree_dir"
  fi
  git branch -D "$branch_name" 2>/dev/null || true

  # ── 2. Worktree yaratish (main dan branch) ──
  log_info "Worktree yaratilmoqda..."
  if ! git worktree add "$worktree_dir" -b "$branch_name" main 2>/dev/null; then
    log_err "Worktree yaratishda xato"
    return 1
  fi

  # ── 3. Dependencies o'rnatish (pnpm cache — tez) ──
  log_info "Dependencies o'rnatilmoqda..."
  if ! (cd "$worktree_dir" && pnpm install --frozen-lockfile 2>&1 | tail -3); then
    log_warn "pnpm install xato — davom etyapman"
  fi

  # Prisma client generate
  (cd "$worktree_dir" && pnpm --filter api exec prisma generate 2>/dev/null) || true

  # ── 4. Claude agent ishga tushirish ──
  log_info "Claude Agent ishga tushyapti..."

  local attempt=0
  local success=false

  while [[ $attempt -lt $MAX_RETRIES ]]; do
    attempt=$((attempt + 1))

    # Abort flag tekshirish (boshqa task fatal xato bergan bo'lsa)
    if is_aborted; then
      log_err "$task_id — ABORT: boshqa task fatal xato berdi"
      break
    fi

    # Budget guard tekshirish
    if ! check_budget; then
      log_err "$task_id — BUDGET LIMIT yetildi, o'tkazib yuborildi"
      break
    fi

    log_info "Urinish $attempt/$MAX_RETRIES (API calls: $(get_api_calls)/$MAX_API_CALLS)"

    # API call hisoblagichni oshirish
    increment_api_call

    if (cd "$worktree_dir" && timeout "$TASK_TIMEOUT" claude -p "$prompt" \
      --allowedTools "Read,Edit,Write,Glob,Grep,Bash" \
      > "$log_file" 2>&1); then

      # Claude xatolarni tekshirish (rate limit, token, auth)
      check_claude_errors "$log_file"
      local err_code=$?
      if [[ $err_code -eq 4 ]]; then
        # Fatal error (auth/billing) — barcha tasklarni to'xtatish
        break
      fi

      # 5. Type check (worktree ichida)
      log_info "Type check..."
      local tsc_ok=true

      if [[ "$category" == "BACKEND" || "$category" == "IKKALASI" ]]; then
        if ! (cd "$worktree_dir" && pnpm --filter api exec tsc --noEmit 2>/dev/null); then
          tsc_ok=false
        fi
      fi

      if [[ "$category" == "FRONTEND" || "$category" == "IKKALASI" ]]; then
        if ! (cd "$worktree_dir" && pnpm --filter web exec tsc --noEmit 2>/dev/null); then
          tsc_ok=false
        fi
      fi

      if [[ "$tsc_ok" == true ]]; then
        log_ok "tsc PASS"
        success=true
        break
      else
        log_warn "tsc FAIL — retry"
        local tsc_error
        tsc_error=$(cd "$worktree_dir" && pnpm --filter api exec tsc --noEmit 2>&1 | tail -20)
        prompt="$prompt

## TSC XATOLIK (tuzat!)
$tsc_error"
      fi
    else
      # Claude xato — log dan sababini aniqlash
      check_claude_errors "$log_file"
      local err_code=$?

      if [[ $err_code -eq 4 ]]; then
        # Fatal error — to'xtatish
        break
      elif [[ $err_code -eq 2 ]]; then
        # Rate limit — allaqachon 60s kutilgan, retry
        log_warn "Rate limit — retry qilinadi"
      elif [[ $err_code -eq 3 ]]; then
        # Token limit — promptni qisqartirish
        log_warn "Token limit — description qisqartirildi"
        description=$(echo "$description" | head -30)
        prompt=$(build_prompt "$task_id" "$category" "$title" "$files" "$description")
      else
        log_warn "Claude timeout yoki noma'lum xato — retry"
      fi
    fi
  done

  if [[ "$success" == true ]]; then
    # ── 6. O'zgarishlar bormi? ──
    if (cd "$worktree_dir" && git diff --quiet && git diff --cached --quiet); then
      log_warn "Hech qanday o'zgarish yo'q. Skip."
      git worktree remove "$worktree_dir" --force 2>/dev/null || true
      git branch -D "$branch_name" 2>/dev/null || true
      return 0
    fi

    # ── 7. Commit (worktree ichida) ──
    (cd "$worktree_dir" && git add -A && git commit -m "$(cat <<EOF
feat: $task_id — $title

Autonomous agent tomonidan bajarildi.
Zone: $category
Developer: $DEVELOPER

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
    )")

    # ── 8. Push ──
    if ! (cd "$worktree_dir" && git push -u origin "$branch_name" 2>/dev/null); then
      log_err "Push FAIL"
      git worktree remove "$worktree_dir" --force 2>/dev/null || true
      return 1
    fi

    # ── 9. PR ochish ──
    if command -v gh &> /dev/null; then
      (cd "$worktree_dir" && gh pr create \
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
Generated by VENTRA Autonomous Agent v3 (parallel + PM/BA)
Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
        )" \
        --label "auto-generated" \
        --base main 2>/dev/null) || log_warn "PR yaratishda xato (gh CLI)"

      log_ok "PR ochildi!"
    else
      log_warn "gh CLI topilmadi — PR qo'lda oching"
    fi

    # ── 10. Worktree tozalash ──
    git worktree remove "$worktree_dir" --force 2>/dev/null || true
    log_ok "$task_id TAYYOR!"
    return 0
  else
    log_err "$task_id BAJARILMADI (${MAX_RETRIES} urinish)"
    git worktree remove "$worktree_dir" --force 2>/dev/null || true
    git branch -D "$branch_name" 2>/dev/null || true
    return 1
  fi
}

# ─── PARALLEL BATCH EXECUTOR ──────────────────────────────

# Natija fayllar uchun temp dir
RESULT_DIR=$(mktemp -d)
trap "rm -rf $RESULT_DIR; cleanup" EXIT

execute_batch() {
  local batch_tasks="$1"
  local batch_num="$2"
  local batch_size=0
  local pids=()
  local task_ids=()

  # Abort flag tekshirish
  if is_aborted; then
    log_err "Batch $batch_num O'TKAZILDI — fatal xato aniqlangan"
    return 1
  fi

  # Budget tekshirish
  if ! check_budget; then
    log_err "Batch $batch_num O'TKAZILDI — budget limit"
    return 1
  fi

  echo ""
  echo "┌─────────────────────────────────────────────────┐"
  echo "│  BATCH $batch_num (parallel: $PARALLEL) | API: $(get_api_calls)/$MAX_API_CALLS   │"
  echo "└─────────────────────────────────────────────────┘"

  while IFS='|' read -r priority id category title time files description; do
    [[ -z "$id" ]] && continue
    batch_size=$((batch_size + 1))

    # Background da ishga tushirish
    (
      if execute_task "$id" "$category" "$title" "$files" "$description"; then
        echo "OK" > "$RESULT_DIR/${id}.result"
      else
        echo "FAIL" > "$RESULT_DIR/${id}.result"
      fi
    ) &
    pids+=($!)
    task_ids+=("$id")

    log_info "$id ishga tushdi (PID: ${pids[-1]})"
  done <<< "$batch_tasks"

  if [[ $batch_size -eq 0 ]]; then
    return
  fi

  # Barcha background processlarni kutish
  log_info "Batch $batch_num: $batch_size ta task parallel ishlamoqda..."
  local batch_completed=0
  local batch_failed=0

  for i in "${!pids[@]}"; do
    local pid="${pids[$i]}"
    local tid="${task_ids[$i]}"

    if wait "$pid" 2>/dev/null; then
      : # exit code 0
    fi

    # Natija fayldan o'qish
    if [[ -f "$RESULT_DIR/${tid}.result" && "$(cat "$RESULT_DIR/${tid}.result")" == "OK" ]]; then
      batch_completed=$((batch_completed + 1))
    else
      batch_failed=$((batch_failed + 1))
    fi
  done

  log_info "Batch $batch_num natija: ${batch_completed} OK, ${batch_failed} FAIL"

  # Global counters update (fayllar orqali — subshell safe)
  local prev_ok=0 prev_fail=0
  [[ -f "$RESULT_DIR/total_ok" ]] && prev_ok=$(cat "$RESULT_DIR/total_ok")
  [[ -f "$RESULT_DIR/total_fail" ]] && prev_fail=$(cat "$RESULT_DIR/total_fail")
  echo $((prev_ok + batch_completed)) > "$RESULT_DIR/total_ok"
  echo $((prev_fail + batch_failed)) > "$RESULT_DIR/total_fail"
}

# ─── MAIN ──────────────────────────────────────────────────

main() {
  # Eng yangi main ni olish
  log_info "git pull origin main..."
  git pull origin main 2>/dev/null || true
  echo ""

  local start_time
  start_time=$(date +%s)

  # ═══════════════════════════════════════════════════
  # FAZA 1: PM + BA TAYYORGARLIK (parallel)
  # ═══════════════════════════════════════════════════
  if [[ "$WITH_PM" == true || "$WITH_BA" == true ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo " FAZA 1: TAYYORGARLIK (PM + BA)"
    echo "═══════════════════════════════════════════════════"

    local pm_pid=0
    local ba_pid=0

    if [[ "$WITH_PM" == true ]]; then
      run_pm_plan &
      pm_pid=$!
      log_info "PM Agent ishga tushdi (PID: $pm_pid)"
    fi

    if [[ "$WITH_BA" == true ]]; then
      run_ba_analysis &
      ba_pid=$!
      log_info "BA Agent ishga tushdi (PID: $ba_pid)"
    fi

    # Ikkalasini kutish
    if [[ $pm_pid -ne 0 ]]; then
      wait $pm_pid 2>/dev/null && log_ok "PM Agent tugadi" || log_warn "PM Agent xato"
    fi
    if [[ $ba_pid -ne 0 ]]; then
      wait $ba_pid 2>/dev/null && log_ok "BA Agent tugadi" || log_warn "BA Agent xato"
    fi
  fi

  # ═══════════════════════════════════════════════════
  # FAZA 2: KOD TASKLAR
  # ═══════════════════════════════════════════════════
  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " FAZA 2: KOD TASKLAR"
  echo "═══════════════════════════════════════════════════"

  log_info "Tasklarni tahlil qilyapman..."
  echo ""

  local tasks
  tasks=$(select_tasks)

  if [[ -z "$tasks" ]]; then
    log_warn "Ochiq task topilmadi (filter: zone=$ZONE_FILTER, priority=$PRIORITY_FILTER)"

    # PM/BA retro (hatto task bo'lmasa ham)
    if [[ "$WITH_PM" == true || "$WITH_BA" == true ]]; then
      echo ""
      echo "═══════════════════════════════════════════════════"
      echo " FAZA 3: YAKUNLASH (task yo'q)"
      echo "═══════════════════════════════════════════════════"
      log_info "Task topilmadi, retro o'tkazilmaydi."
    fi
    exit 0
  fi

  # Task ro'yxatini ko'rsatish
  local task_count=0
  echo "┌─────────────────────────────────────────────────┐"
  echo "│  TANLANGAN TASKLAR                              │"
  echo "└─────────────────────────────────────────────────┘"

  while IFS='|' read -r priority id category title time files description; do
    [[ -z "$id" ]] && continue
    task_count=$((task_count + 1))
    echo -e "  ${CYAN}$id${NC} | P$priority | $category | $title | $time"
  done <<< "$tasks"

  echo ""
  log_info "Jami: $task_count ta task | Parallel: $PARALLEL"

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

  # ── Parallel yoki Sequential? ──
  echo "0" > "$RESULT_DIR/total_ok"
  echo "0" > "$RESULT_DIR/total_fail"
  init_budget

  if [[ "$PARALLEL" -gt 1 ]]; then
    # ── PARALLEL MODE: batch bo'lib ishlash ──
    local batch_num=0
    local batch_lines=""
    local batch_count=0

    while IFS='|' read -r priority id category title time files description; do
      [[ -z "$id" ]] && continue

      if [[ -n "$batch_lines" ]]; then
        batch_lines+=$'\n'
      fi
      batch_lines+="$priority|$id|$category|$title|$time|$files|$description"
      batch_count=$((batch_count + 1))

      # Batch to'lganda ishga tushirish
      if [[ $batch_count -ge $PARALLEL ]]; then
        batch_num=$((batch_num + 1))

        # Abort tekshirish
        if is_aborted; then
          log_err "ABORT — qolgan batchlar o'tkazildi"
          break
        fi

        execute_batch "$batch_lines" "$batch_num"
        batch_lines=""
        batch_count=0

        # Batchlar orasida cooldown (rate limit himoya)
        if [[ "$BATCH_COOLDOWN" -gt 0 ]]; then
          log_info "Batch cooldown: ${BATCH_COOLDOWN}s (rate limit himoya)..."
          sleep "$BATCH_COOLDOWN"
        fi
      fi
    done <<< "$tasks"

    # Oxirgi to'lmagan batch
    if [[ -n "$batch_lines" ]] && ! is_aborted; then
      batch_num=$((batch_num + 1))
      execute_batch "$batch_lines" "$batch_num"
    fi

  else
    # ── SEQUENTIAL MODE (v2 bilan bir xil) ──
    while IFS='|' read -r priority id category title time files description; do
      [[ -z "$id" ]] && continue

      # Abort tekshirish
      if is_aborted; then
        log_err "ABORT — qolgan tasklar o'tkazildi"
        break
      fi

      # Budget tekshirish
      if ! check_budget; then
        log_err "BUDGET LIMIT — qolgan tasklar o'tkazildi"
        break
      fi

      echo ""
      echo "───────────────────────────────────────────────────"

      if execute_task "$id" "$category" "$title" "$files" "$description"; then
        local prev_ok=0
        [[ -f "$RESULT_DIR/total_ok" ]] && prev_ok=$(cat "$RESULT_DIR/total_ok")
        echo $((prev_ok + 1)) > "$RESULT_DIR/total_ok"
      else
        local prev_fail=0
        [[ -f "$RESULT_DIR/total_fail" ]] && prev_fail=$(cat "$RESULT_DIR/total_fail")
        echo $((prev_fail + 1)) > "$RESULT_DIR/total_fail"
      fi
    done <<< "$tasks"
  fi

  local completed failed
  completed=$(cat "$RESULT_DIR/total_ok" 2>/dev/null || echo 0)
  failed=$(cat "$RESULT_DIR/total_fail" 2>/dev/null || echo 0)

  # ═══════════════════════════════════════════════════
  # FAZA 3: YAKUNLASH — PM RETRO + BA MEASURE (parallel)
  # ═══════════════════════════════════════════════════
  local end_time elapsed_min
  end_time=$(date +%s)
  elapsed_min=$(( (end_time - start_time) / 60 ))

  if [[ "$WITH_PM" == true || "$WITH_BA" == true ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════"
    echo " FAZA 3: YAKUNLASH (PM RETRO + BA MEASURE)"
    echo "═══════════════════════════════════════════════════"

    local pm_retro_pid=0
    local ba_measure_pid=0

    if [[ "$WITH_PM" == true && "$completed" -gt 0 ]]; then
      run_pm_retro "$completed" "$failed" "$elapsed_min" &
      pm_retro_pid=$!
      log_info "PM Retro ishga tushdi (PID: $pm_retro_pid)"
    fi

    if [[ "$WITH_BA" == true && "$completed" -gt 0 ]]; then
      run_ba_measure "$completed" &
      ba_measure_pid=$!
      log_info "BA Measure ishga tushdi (PID: $ba_measure_pid)"
    fi

    # Kutish
    if [[ $pm_retro_pid -ne 0 ]]; then
      wait $pm_retro_pid 2>/dev/null && log_ok "PM Retro tugadi" || log_warn "PM Retro xato"
    fi
    if [[ $ba_measure_pid -ne 0 ]]; then
      wait $ba_measure_pid 2>/dev/null && log_ok "BA Measure tugadi" || log_warn "BA Measure xato"
    fi
  fi

  # ═══════════════════════════════════════════════════
  # NATIJA
  # ═══════════════════════════════════════════════════
  end_time=$(date +%s)
  elapsed_min=$(( (end_time - start_time) / 60 ))

  echo ""
  echo "═══════════════════════════════════════════════════"
  echo " NATIJA (v3)"
  echo "═══════════════════════════════════════════════════"
  log_ok "Bajarildi: $completed"
  [[ "$failed" -gt 0 ]] && log_err "Bajarilmadi: $failed"
  log_info "Parallel: $PARALLEL"
  log_info "API calls: $(get_api_calls)/$MAX_API_CALLS"
  [[ "$WITH_PM" == true ]] && log_pm "Sprint plan: docs/sprint-plan.md"
  [[ "$WITH_BA" == true ]] && log_ba "Biznes tahlil: docs/ba-report.md"
  is_aborted && log_err "ABORT: sessiya fatal xato bilan to'xtatildi"
  log_info "Vaqt: ${elapsed_min} daqiqa"
  echo "═══════════════════════════════════════════════════"
}

main
