# SARDOR — Ochiq Vazifalar
# Fayllar: apps/desktop/, apps/landing/
# Yangilangan: 2026-03-04
# Bajarilganlar → docs/Done.md
# Audit manba: CODE-AUDIT + DEEP-PLATFORM-AUDIT + Analysis-Onboarding
#
# ESLATMA: apps/web/ va apps/extension/ — BEKZOD ZONASI (CLAUDE.md)
# Web Audit tasklar (T-361..T-370, T-377, T-380, T-381) → Tasks-Bekzod.md ga ko'chirildi
# Chrome Extension tasklar (T-216..T-233) → Tasks-Bekzod.md ga ko'chirildi

---

# DESKTOP APP AUDIT — T-315..T-328

> Manba: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P0 — KRITIK (5 ta)

### T-315 | P0 | FRONTEND | Desktop: `sandbox: false` → `true` | 15min
**Sabab:** `window.ts:61` — Chromium sandbox o'chirilgan. XSS orqali OS ga chiqish oson.
**Yechim:** `sandbox: true`, preload ni sandbox rejimiga moslashtirish.

### T-316 | P0 | FRONTEND | Desktop: CSP header qo'shish | 15min
**Sabab:** `window.ts` — Content Security Policy yo'q. Renderer ixtiyoriy skript yuklashi mumkin.
**Yechim:** `session.defaultSession.webRequest.onHeadersReceived` da CSP qo'shish.

### T-317 | P0 | FRONTEND | Desktop: Path traversal — `app://` protocol fix | 15min
**Sabab:** `window.ts:17-44` — `decodeURIComponent` + `join()` = rendererDir dan tashqari fayl o'qish mumkin.
**Yechim:** `resolved.startsWith(rendererDir)` tekshiruvi qo'shish.

### T-318 | P0 | FRONTEND | Desktop: SSRF — API proxy validatsiya | 15min
**Sabab:** `window.ts:22-29` — `/api/` so'rovlar blindly proxy qilinadi. Origin tekshiruvi yo'q.
**Yechim:** `new URL()` bilan safe URL yaratish, origin validatsiya.

### T-319 | P0 | FRONTEND | Desktop: Navigation cheklovlari qo'shish | 15min
**Sabab:** `window.ts` — `will-navigate` va `setWindowOpenHandler` yo'q.
**Yechim:** Faqat `app://` va `localhost` ga ruxsat. Tashqi → `shell.openExternal()`.

## P1 — MUHIM (8 ta)

### T-320 | P1 | FRONTEND | Desktop: `(app as any)` → typed state | 10min
### T-321 | P1 | FRONTEND | Desktop: ipcRenderer.on memory leak fix | 15min
### T-322 | P1 | FRONTEND | Desktop: `console.error` → `electron-log` | 10min
### T-323 | P1 | FRONTEND | Desktop: `setInterval` cleanup | 5min
### T-324 | P1 | FRONTEND | Desktop: `.ico`/`.icns` icon fayllar yaratish | 15min
### T-325 | P1 | FRONTEND | Desktop: IPC notification input validatsiya | 10min
### T-326 | P1 | FRONTEND | Desktop: IPC badge count validatsiya | 5min
### T-327 | P1 | FRONTEND | Desktop: Permission request handler | 10min

> Batafsil sabab/yechim: CODE-AUDIT-DESKTOP-LANDING-2026-03-04.md

## P2 — O'RTA (batch)

### T-328 | P2 | FRONTEND | Desktop P2 batch (10 ta) | 1h

---


# PLATFORMA AUDIT — UX/DESIGN/ONBOARDING (T-377..T-384)

> Manba: DEEP-PLATFORM-AUDIT-2026-03-04.md + Analysis-Onboarding-Multimarketplace.md

### T-382 | P2 | FRONTEND | Landing conversion — 4 ta fix | 4h
**Sabab va yechim:**
1. **Privacy Policy + Terms of Service pages yo'q** — Footer'da link bor, sahifa yo'q. O'zbekiston Shaxsiy Ma'lumotlar Qonuni (2019) talabi
2. **Cookie consent banner yo'q** — legal requirement
3. **Plausible analytics commented out** — enable qilish + CTA click tracking, scroll depth, conversion o'lchash
4. **Video demo yo'q** — pricing'dan oldin 90 sek Loom yoki placeholder section

---

---

# LANDING MANUAL (4 task)

| # | Nima | Vaqt | Holat |
|---|------|------|-------|
| M-001 | Dashboard screenshot'lar | 30min | ⬜ |
| M-002 | Desktop installer build | 20min | ⬜ |
| M-003 | Testimonial ma'lumotlari | 1h | ⬜ |
| M-004 | Domain va hosting | 30min | ⬜ |

---

## XULOSA

| Kategoriya | Soni |
|-----------|------|
| **Platforma P2** (T-382) | **1 task, ~4 fix** |
| Desktop P0 (T-315..T-319) | 5 |
| Desktop P1 (T-320..T-327) | 8 |
| Desktop P2 (T-328) | 10 |
| Landing Manual (M-001..M-004) | 4 |
| **JAMI task ochiq** | **~28** |
| **JAMI bug/fix ochiq** | **~27** |
|  |  |
| ~~Web Audit~~ (T-361..T-370) | → **Bekzod**ga ko'chirildi |
| ~~T-377, T-380, T-381~~ (web app) | → **Bekzod**ga ko'chirildi |
| ~~T-379~~ (Design system) | ✅ DONE (Bekzod, T-379) |
| ~~Chrome Extension~~ (T-216..T-233) | → **Bekzod**ga ko'chirildi |

---

# BAJARILDI → Done.md

**Extension Phase 1-2 (8 ta):** T-208..T-215
**Desktop (1 ta):** T-234
**Landing Dev (24 ta):** L-001..L-024
**Landing Audit (14 ta):** T-329..T-342
**Web App (8 ta):** T-202, T-264, T-266, T-257, T-188..T-192
**i18n Audit (9 ta):** T-271..T-279
**Sprint Frontend (8 ta):** T-237b, T-260, T-261, T-257, T-206, T-284..T-289
**Bekzod Dependent (3 ta):** T-193b, T-196b, T-199b

---
*Tasks-Sardor.md | VENTRA | 2026-03-04 (zone tuzatish: web/extension → Bekzod)*
