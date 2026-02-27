# VENTRA — OCHIQ VAZIFALAR
# Yangilangan: 2026-02-28
# Bajarilganlar → docs/Done.md

---

## QOIDALAR

- Yangi bug/error/task topilganda shu faylga qo'shiladi
- Fix bo'lgandan keyin `docs/Done.md` ga ko'chiriladi
- Format: `T-XXX | [KATEGORIYA] | Sarlavha | Vaqt`
- Kategoriyalar: BACKEND, FRONTEND, DEVOPS, IKKALASI

---

# ═══════════════════════════════════════════════════════════
# QO'LDA QILINADIGAN ISHLAR — .env KALITLARI VA CONFIG
# ═══════════════════════════════════════════════════════════

## ENV-P0 — KRITIK (Ilovasiz ishlamaydi)

### E-001 | DESKTOP | `apps/desktop/.env` fayl YARATISH — login ishlamaydi | 5min
**Fayl yaratish:** `apps/desktop/.env`
```env
VITE_API_URL=http://localhost:3000
```

### E-002 | DESKTOP | `electron.vite.config.ts` ga proxy qo'shish — dev mode login | 10min
**Fayl:** `apps/desktop/electron.vite.config.ts` — renderer.server bo'limiga proxy qo'shish.

## ENV-P1 — MUHIM (Feature'lar ishlamaydi)

### E-006 | CONFIG | `ALIEXPRESS_APP_KEY` + `ALIEXPRESS_APP_SECRET` yo'q | 5min
AliExpress Developer Portal dan key olish va `apps/api/.env` + `apps/worker/.env` ga yozish.

### E-008 | CONFIG | `REDIS_URL` dev da parolsiz — production bilan mos emas | 2min

## ENV-P2 — O'RTA (Optional)

### E-009 | CONFIG | `SENTRY_DSN` yo'q — error tracking o'chirilgan | 2min
### E-010 | CONFIG | `PROXY_URL` yo'q — Uzum API block qilsa kerak bo'ladi | 2min

---

# ═══════════════════════════════════════════════════════════
# DESKTOP APP LOGIN BUG (2026-02-27)
# ═══════════════════════════════════════════════════════════

### T-234 | DESKTOP | Login ishlamaydi — VITE_API_URL yo'q, URL `app://api/v1` bo'ladi | 30min
**Fix:** E-001 + E-002 + production build uchun VITE_API_URL inject qilish.

---

# ═══════════════════════════════════════════════════════════
# BACKEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-267 | P0 | BACKEND | Snapshot deduplication yo'q — bir product uchun sekundiga 10+ snapshot yaratiladi | 1h
**Muammo:** 3 ta joyda `productSnapshot.create()` chaqiriladi — hech birida dedup yo'q.
**Fix:** Oxirgi snapshot 5 minutdan yaqin bo'lsa — yangi yaratmaslik.
**Fayllar:** uzum.service.ts:145, import.processor.ts:108, reanalysis.processor.ts:80

### T-268 | P0 | BACKEND | Score instability — weekly_bought null bo'lganda score 50% ga tushadi | 30min
**Fix:** weekly_bought null bo'lsa oxirgi valid snapshotdan fallback olish.
**Fayllar:** packages/utils/src/index.ts — calculateScore(), uzum.service.ts:137

## P1 — MUHIM

### T-062 | BACKEND | Anthropic client modul yuklanganda yaratiladi — crash xavfi | 20min
**Fix:** Lazy initialization — `getAiClient()` pattern.
**Fayl:** apps/worker/src/processors/uzum-ai-scraper.ts:21

### T-241 | P1 | BACKEND | totalAvailableAmount Prisma schema + saqlash — stock cliff aniq bo'ladi | 30min
**Fix:** Product modeliga `total_available_amount BigInt?` qo'shish, migration, saqlash.

### T-269 | P1 | BACKEND | Eski noto'g'ri snapshot data — weekly_bought=44500 (rOrdersAmount) | 30min
**Fix:** `UPDATE product_snapshots SET weekly_bought = NULL WHERE weekly_bought > 5000;`

### T-270 | P1 | BACKEND | Duplicate snapshot'larni tozalash — 80 ta o'rniga ~20 bo'lishi kerak | 15min
**Fix:** SQL bilan har product/kun uchun faqat eng yaxshi snapshot qoldirish.

### T-214 | P1 | BACKEND | POST /uzum/batch-quick-score endpoint — extension uchun batch scoring | 1h

### T-265 | P1 | BACKEND | Enterprise page — 3 ta API endpoint 404 qaytaradi | 1h

## P2 — O'RTA

### T-239 | P2 | BACKEND | Per-user rate limiting — AI endpoint lar uchun ThrottlerGuard | 30min
### T-150 | BACKEND | naming consultant_id aslida account_id | 10min

## P3 — PAST

### T-240 | P3 | BACKEND | DTO validatsiya qo'shish — 5+ endpoint DTO'siz | 30min

---

# ═══════════════════════════════════════════════════════════
# FRONTEND OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P1 — MUHIM

### T-198 | FRONTEND | Haftalik sotuvlar chart — noto'g'ri data ko'rsatadi | 20min
### T-201 | FRONTEND | Raqiblar Narx Kuzatuvi + Global Bozor — loading/bo'sh | 15min
### T-202 | FRONTEND | ProductPage overall UX — sotuvchi uchun soddalash | 1h
### T-206 | FRONTEND | Raqiblar — "50 ta kuzatilmoqda" + "topilmadi" bir vaqtda | 10min
### T-264 | P1 | FRONTEND | Admin panel — role USER bo'lsa /admin sahifaga redirect yo'q | 30min

## PWA O'chirish

### T-188 | FRONTEND | Service Worker o'chirish + unregister script | 20min
### T-189 | FRONTEND | manifest.json va PWA meta taglar o'chirish | 10min
### T-190 | FRONTEND | PWA-only ikonalar o'chirish | 5min
### T-192 | FRONTEND | dist/manifest.json build artifact tozalash | 5min

## P2 — O'RTA

### T-266 | P2 | FRONTEND | Shops, Leaderboard, Sourcing — bo'sh sahifa, yo'naltiruvchi xabar yo'q | 30min
### T-257 | P2 | FRONTEND | Granular ErrorBoundary per section | —
### T-085 | FRONTEND | AnalyzePage tracked=true API xatosida ham o'rnatiladi | 10min
### T-097 | FRONTEND | WebSocket dev proxy yo'q | 15min

## i18n AUDIT

### T-271 | FRONTEND | i18n: 23 ta DUPLICATE KEY barcha 3 tilda | 30min
### T-272 | FRONTEND | Layout.tsx sidebar section labellar hardcoded — i18n yo'q | 20min
### T-273 | FRONTEND | SignalsPage tab nomlari va content hardcoded — i18n yo'q | 45min
### T-274 | FRONTEND | ScannerTab.tsx (Discovery) butunlay i18n siz | 30min
### T-275 | FRONTEND | CargoCalculator.tsx (Sourcing) butunlay i18n siz | 30min
### T-276 | FRONTEND | UZ faylida ~85 ta inglizcha tarjima qilinmagan value | 60min
### T-277 | FRONTEND | RU faylida ~24 ta inglizcha tarjima qilinmagan value | 30min
### T-278 | FRONTEND | feedback.title UZ da aralash til: "Feedback & Yordam" | 5min
### T-279 | FRONTEND | discovery.title barcha 3 tilda tarjima qilinmagan | 5min

---

# ═══════════════════════════════════════════════════════════
# IKKALASI (BACKEND + FRONTEND)
# ═══════════════════════════════════════════════════════════

### T-235 | P1 | BACKEND+WORKER | Playwright bilan weekly_bought DOM scraping | 2h
### T-236 | P1 | BACKEND | parseWeeklyBought kengaytirish — "1,2 тыс" formatlar | 30min
### T-237 | P1 | IKKALASI | ProductPage da mahsulot rasmi ko'rsatish — Uzum API dan photo olish | 2h
### T-260 | P1 | FRONTEND+BACKEND | Discovery — kategoriya nomi ko'rsatish (faqat ID emas) | 1.5h
### T-261 | P1 | IKKALASI | Discovery natijalar drawer — sotuvchi uchun kerakli ma'lumotlar yo'q | 3h

---

# ═══════════════════════════════════════════════════════════
# DEVOPS OCHIQ TASKLAR
# ═══════════════════════════════════════════════════════════

## P0 — KRITIK

### T-262 | P0 | DEVOPS | Railway DB — `prisma db:seed` ishlatilmagan, test data yo'q | 15min
### T-263 | P0 | DEVOPS | Railway — SUPER_ADMIN user yo'q, admin panel 403 Forbidden | 10min

## P1 — MUHIM

### T-177 | DEVOPS | pgvector extension — Railway PostgreSQL | 5min
### T-178 | DEVOPS | Custom domain + SSL — web service | 10min
### T-179 | DEVOPS | Worker memory/CPU limit tekshirish | 15min
### T-180 | DEVOPS | Monitoring + Uptime alert | 15min
### T-181 | DEVOPS | Railway database backup tekshirish | 10min

## P2 — O'RTA

### T-184 | DEVOPS | Staging environment (optional) | 30min
### T-242 | DEVOPS | SERPAPI_API_KEY — API + Worker | 5min
### T-243 | DEVOPS | ALIEXPRESS_APP_KEY + SECRET — API | 5min
### T-244 | DEVOPS | SENTRY_DSN — API | 5min
### T-245 | DEVOPS | PROXY_URL — API + Worker (optional) | 5min

---

# ═══════════════════════════════════════════════════════════
# CHROME EXTENSION — 26 TASK (T-208..T-233)
# ═══════════════════════════════════════════════════════════
#
# Batafsil spec: git log yoki Done.md da.
# Barcha 26 task OCHIQ — hali boshlanmagan.

## Faza 1 — Setup + Auth (P0) ~7h
### T-208 | P0 | FRONTEND | Monorepo scaffold + Manifest V3 + build pipeline | 2h
### T-209 | P0 | FRONTEND | API client + chrome.storage JWT boshqaruvi | 1.5h
### T-210 | P0 | FRONTEND | Background Service Worker (alarm, badge, messaging) | 2h
### T-211 | P0 | FRONTEND | Popup Login UI + autentifikatsiya holati | 1.5h

## Faza 2 — Content Script Overlay (P0) ~6.5h
### T-212 | P0 | FRONTEND | Content Script — uzum.uz mahsulot overlay | 3h
### T-213 | P0 | FRONTEND | Content Script — katalog/qidiruv badge | 2.5h

## Faza 3 — Popup Dashboard (P1) ~4.5h
### T-215 | P1 | FRONTEND | Popup Dashboard (tracked products, signals, quick analyze) | 3h
### T-216 | P1 | FRONTEND | Popup "Tez Tahlil" funksiyasi | 1.5h

## Faza 4 — Category + Advanced (P1) ~5h
### T-217 | P1 | FRONTEND | Content Script — Kategoriya "Top 10" floating widget | 2h
### T-218 | P1 | FRONTEND | Notifications sistema (chrome.notifications + badge) | 1.5h
### T-219 | P1 | FRONTEND | Options (Sozlamalar) sahifasi | 1.5h

## Faza 5 — Competitor + Narx (P2) ~4.5h
### T-220 | P2 | FRONTEND | Content Script — Raqiblar narx taqqoslash overlay | 2h
### T-221 | P2 | FRONTEND | Content Script — Narx tarix grafigi (mini chart) | 1.5h
### T-222 | P2 | FRONTEND | Context Menu integration (o'ng tugma menu) | 1h

## Faza 6 — AI + Hotkeys (P2) ~2.5h
### T-223 | P2 | FRONTEND | Content Script — AI tahlil natijasini overlay da | 1.5h
### T-224 | P2 | FRONTEND | Keyboard shortcuts (hotkeys) | 1h

## Faza 7 — i18n + Testing + Perf (P2) ~4.5h
### T-225 | P2 | FRONTEND | i18n (uz, ru, en) | 1.5h
### T-226 | P2 | FRONTEND | Unit testlar (Vitest + Testing Library) | 2h
### T-227 | P2 | FRONTEND | Performance optimization + bundle size | 1h

## Faza 8 — Build + Publish (P1) ~3h
### T-228 | P1 | DEVOPS | Production build pipeline + Chrome Web Store publish | 2h
### T-229 | P1 | DEVOPS | Edge/Firefox adaptatsiya tayyorlash | 1h

## Faza 9 — Security + Polish (P1) ~3.5h
### T-230 | P1 | IKKALASI | Security audit + CSP + token xavfsizligi | 1h
### T-231 | P1 | FRONTEND | Onboarding flow (birinchi marta ochganda) | 1h
### T-232 | P2 | FRONTEND | Extension icon set (16/48/128) | 30min
### T-233 | P2 | FRONTEND | Error handling + offline mode + graceful degradation | 1h

---

## BAJARISH KETMA-KETLIGI (TAVSIYA)

### FAZA 1 — KRITIK: Score/Data to'g'rilash
1. T-267 → Snapshot dedup guard (yangi buzilgan data to'xtaydi)
2. T-268 → Score instability fix (weekly_bought null fallback)
3. T-269 → Eski noto'g'ri data tozalash
4. T-270 → Duplicate snapshot tozalash

### FAZA 2 — DEVOPS: Railway production
5. T-262 → Railway DB seed
6. T-263 → SUPER_ADMIN user yaratish

### FAZA 3 — Discovery UX
7. T-260 → Category nomi ko'rsatish
8. T-261 → Discovery drawer data boyitish

### FAZA 4 — Frontend UX polish
9. T-264 → Admin route protection
10. T-265 → Enterprise 404 fix
11. T-266 → Empty state CTA

---

*Tasks.md | VENTRA Analytics Platform | 2026-02-28*
