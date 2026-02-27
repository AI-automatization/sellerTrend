# SARDOR — Ochiq Vazifalar
# Fayllar: apps/web/, apps/desktop/, apps/extension/, apps/landing/
# Yangilangan: 2026-02-28
# Bajarilganlar → docs/Done.md

---

# WEB APP — OCHIQ TASKLAR

## P1 — MUHIM

### T-202 | ProductPage overall UX — sotuvchi uchun soddalash | 1h
### T-264 | Admin panel — role USER bo'lsa /admin sahifaga redirect yo'q | 30min

## P2 — O'RTA

### T-266 | Shops, Leaderboard, Sourcing — bo'sh sahifa, CTA yo'q | 30min
### T-257 | Granular ErrorBoundary per section | —

## i18n AUDIT

### T-271 | i18n: 23 ta DUPLICATE KEY barcha 3 tilda | 30min
### T-272 | Layout.tsx sidebar section labellar hardcoded | 20min
### T-273 | SignalsPage tab nomlari va content hardcoded | 45min
### T-274 | ScannerTab.tsx (Discovery) butunlay i18n siz | 30min
### T-275 | CargoCalculator.tsx (Sourcing) butunlay i18n siz | 30min
### T-276 | UZ faylida ~85 ta inglizcha tarjima qilinmagan | 60min
### T-277 | RU faylida ~24 ta inglizcha tarjima qilinmagan | 30min
### T-278 | feedback.title UZ da aralash til | 5min
### T-279 | discovery.title barcha 3 tilda tarjima qilinmagan | 5min

---

# BEKZOD DEPENDENT (AVVAL Backend)

| Task | Bekzod qilgach | Sardor ishi |
|------|----------------|-------------|
| T-193b | ✅ T-193a done | ProductPage AI JSON filter |
| T-196b | ✅ T-196 done | "Mening mahsulotim" toggle |
| T-199b | ✅ T-199a done | Frontend trend text |
| T-237b | T-237a kerak | ProductPage/Dashboard rasm |
| T-213 | T-214 kerak | Content script badge (extension) |

---

# DESKTOP APP

### T-234 | Login ishlamaydi — VITE_API_URL yo'q | 30min
E-001 + E-002 + production build fix.

---

# PWA O'CHIRISH — OCHIQ

### T-188 | Service Worker o'chirish + unregister script | 20min
### T-189 | manifest.json va PWA meta taglar o'chirish | 10min
### T-190 | PWA-only ikonalar o'chirish | 5min
### T-192 | dist/manifest.json build artifact tozalash | 5min

---

# CHROME EXTENSION — 26 TASK (T-208..T-233)

| Faza | Tasklar | Vaqt |
|------|---------|------|
| 1. Setup + Auth (P0) | T-208..T-211 | ~7h |
| 2. Content Script (P0) | T-212..T-213 | ~5.5h |
| 3. Popup Dashboard (P1) | T-215..T-216 | ~4.5h |
| 4. Category + Advanced (P1) | T-217..T-219 | ~5h |
| 5. Competitor + Narx (P2) | T-220..T-222 | ~4.5h |
| 6. AI + Hotkeys (P2) | T-223..T-224 | ~2.5h |
| 7. i18n + Testing (P2) | T-225..T-227 | ~4.5h |
| 8. Build + Publish (P1) | T-228..T-229 | ~3h |
| 9. Security + Polish (P1) | T-230..T-233 | ~3.5h |
| **JAMI** | **26 task** | **~41h** |

Batafsil spec: `docs/Tasks.md` Chrome Extension bo'limida.

---

# LANDING PAGE — 28 TASK

## Manual (4 ta)
- M-001: Dashboard screenshot'lar | 30min
- M-002: Desktop installer build | 20min
- M-003: Testimonial ma'lumotlari | 1h
- M-004: Domain va hosting | 30min

## Dev (24 ta: L-001..L-024)

| Faza | Tasklar | Vaqt |
|------|---------|------|
| P0 — Sections | L-001..L-013 | ~6h |
| P1 — Polish | L-014..L-018 | ~2h |
| P2 — Extras | L-019..L-024 | ~3h |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| Web ochiq (P1-P2) | 4 |
| i18n audit | 9 |
| Bekzod dependent | 5 |
| Desktop | 1 |
| PWA cleanup | 4 |
| Chrome Extension | 26 |
| Landing | 28 |
| **JAMI ochiq** | **77** |

**Web app 93% tayyor** — asosiy ish Chrome Extension va Landing.

---
*Tasks-Sardor.md | VENTRA | 2026-02-28*
