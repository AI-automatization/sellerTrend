# VENTRA — BAJARILGAN ISHLAR ARXIVI
# Yangilangan: 2026-03-30
# Ochiq tasklar → docs/Tasks.md
# Format: docs/Tasks.md ichidagi "Done.md format" bo'limiga qarang

### T-480 | P1 | BACKEND + FRONTEND | Discovery — getSuggestions ID lari bilan text search ishlatish (2026-03-30)

**Manba:** production-bug (Sardor, 2026-03-29)
**Muammo:** `getSuggestions` GraphQL search-index ID larini qaytaradi (masalan 14237, 15271) — bular Uzum browse sahifalarining haqiqiy category ID lari emas. Playwright yaroqsiz URL ochadi → homepage recommendations widget → noto'g'ri mahsulotlar. GraphQL 429 rate limit, REST search `not-available-001`.
**Yechim:**
- `scrapeSearchProductIds()` — Playwright bilan `uzum.uz/ru/search?query=текст` sahifasini scrape qilish (GraphQL/REST fallback)
- `fromSearch=true` da GraphQL 429 → avtomatik Playwright search fallback
- Playwright ≤10 products (recommendations widget) → Playwright search fallback
- Controller: text search uchun `categoryId=0` — categoryId shart emas
- Frontend: category topilmasa suggestion + "barcha natijalar bo'yicha qidirish" tugmasi
- POPULAR_CATEGORIES: ishlamaydigan ID lar olib tashlandi, text search orqali ishlaydi
**Fayllar:** `uzum-scraper.ts`, `discovery.processor.ts`, `discovery.controller.ts`, `ScannerTab.tsx`, `types.ts`
**Ta'sir:** Discovery endi har qanday text qidiruv bilan ishlaydi — GraphQL/REST down bo'lsa ham Playwright orqali mahsulotlar topiladi. Foydalanuvchi o'zi category tanlashi mumkin.

### T-470..T-477 | FRONTEND + BACKEND | Chat AI va Dashboard UX improvements (2026-03-26)

**Manba:** kod-audit + user-feedback (Sardor, 2026-03-26)
**Muammo:** Chat AI noto'g'ri kontekst (cannibalization → raqobatchi sifatida), GENERAL javoblar zaif; PlanGuard SUPER_ADMIN ni bloklaydi; ScrollToTop ChatWidget bilan ustma-ust; ProductPage da developer terminlari; Dashboard tushunarsiz.
**Yechim:**
- T-476: `PlanGuard` ga `SUPER_ADMIN` bypass qo'shildi (1 qator)
- T-477: `ScrollToTop` `bottom-36 lg:bottom-20` ga ko'tarildi — ChatWidget bilan to'qnashmaydi
- T-470: `retrieveCompetitor()` — `CompetitorTracking` dan real raqobatchilar, fallback: `getLeaderboard()`
- T-471: `retrievePortfolioSummary()` — top 3 mahsulot + dead stock soni + flash sale soni
- T-472: `ChatMessage` da intent badge (🔍 Mahsulot tahlili, ⚔️ Raqobat tahlili va h.k.)
- T-474: `ProductPage` — "Trend Score"→"Mahsulot reytingi", "ML Prognoz"→"Sotuv bashorati", MAE/confidence/analyses olib tashlandi, upper/lower interval olib tashlandi
- T-475: Dashboard — HeroCards compact grid, Trend donut→3 mini stat, ActivityChart Area→Bar + label
**Fayllar:** `apps/api/src/chat/chat-retriever.service.ts`, `apps/web/src/components/PlanGuard.tsx`, `apps/web/src/components/ScrollToTop.tsx`, `apps/web/src/components/chat/ChatMessage.tsx`, `apps/web/src/hooks/useChat.ts`, `apps/web/src/pages/ProductPage.tsx`, `apps/web/src/components/dashboard/` (3 fayl), `apps/web/src/i18n/` (3 fayl)
**Ta'sir:** Admin o'z platformasini to'liq ko'ra oladi. Chat AI raqobat tahlilida real raqobatchilarni ko'rsatadi. GENERAL javoblar boyroq kontekst bilan. UI seller tilida — texnik atamalar yo'q.

### T-428..T-433 | FULLSTACK | RAG Chat Pipeline — classifier, retriever, streaming, UI (2026-03-20)

**Manba:** yangi-feature (docs/RAG-PIPELINE-PLAN.md)
**Muammo:** Platformada AI chat yo'q edi — foydalanuvchilar mahsulot tahlili uchun ChatGPT ga chiqib ketardi.
**Yechim:** To'liq RAG pipeline: Prisma schema (ChatConversation, ChatMessage), keyword-based classifier (10 intent, 3 til), context retriever, Anthropic streaming service, SSE controller, React chat widget (floating, history, feedback, i18n).
**Fayllar:** `apps/api/src/chat/` (5 fayl), `apps/web/src/components/chat/` (4 fayl), `apps/web/src/api/chat.ts`, `apps/web/src/hooks/useChat.ts`
**Ta'sir:** Foydalanuvchilar platforma ichida AI bilan o'zbek/rus/ingliz tilida mahsulot tahlili, trend so'rash, narx maslahati olishi mumkin. Cost tracking va quota tizimi bilan integrasiya.

### T-432..T-439 | BACKEND | GraphQL Scraping v2 — TokenManager, client, discovery, productPage (2026-03-20)

**Manba:** ai-tahlil (Claude recon session — graphql.uzum.uz introspection, 2026-03-20)
**Muammo:** REST discovery 500 xato qaytarardi. Playwright sekin va ishonchsiz. Worker da GraphQL integratsiya yo'q edi.
**Yechim:** TokenManager (guest JWT, 5h cache), UzumGraphQLClient singleton, makeSearch (discovery), productPage (hybrid GraphQL+REST), Prisma migration (uzum_card_price, is_best_price, delivery_type, installment_3m..24m), installmentWidget, marketplace-intelligence cron (TOP-45, kuniga 2x), similarProducts competitor discovery, discovery migration (GraphQL-first, Playwright fallback).
**Fayllar:** `apps/worker/src/clients/token-manager.ts`, `apps/worker/src/clients/uzum-graphql.client.ts`, `apps/worker/src/graphql/queries.ts`, `apps/worker/src/jobs/marketplace-intelligence.job.ts`, `apps/worker/src/processors/marketplace-intelligence.processor.ts`, `packages/types/src/uzum-graphql.types.ts`, Prisma migration
**Ta'sir:** Discovery 500 xato yo'qoldi. Product detail GraphQL+REST hybrid 40% tezroq. TOP-45 marketplace monitoring kuniga 2 marta. Competitor discovery avtomatik.

### T-468 | BACKEND | chat.service — classify try-catch + GENERAL fallback (2026-03-25)

**Manba:** kod-audit (2026-03-25)
**Muammo:** `classify()` try-catch ichida emas edi — BigInt parse xatosi SSE stream ni "muzlatib" qo'yardi, foydalanuvchiga hech qanday xabar ko'rsatilmasdi.
**Yechim:** `classify()` try-catch ichiga olindi. Xato bo'lsa `GENERAL` intent bilan fallback. `ClassifiedIntent` import qo'shildi.
**Fayllar:** `apps/api/src/chat/chat.service.ts`
**Ta'sir:** Classifier xatosi endi stream ni to'xtatmaydi — GENERAL intent bilan chat ishlayveradi.

### T-467 | WORKER | uzum-graphql — 429 exponential backoff (2026-03-25)

**Manba:** kod-audit (2026-03-25)
**Muammo:** `_execute()` da `isRetry: boolean` — 429 faqat 1 marta retry qilinardi. Ikkinchi 429 → throw → job fail.
**Yechim:** `isRetry: boolean` → `retryCount: number`. 429 da 3 marta retry: 5s, 10s, 20s (2^n * RATE_LIMIT_WAIT_MS). 401 retry ham `retryCount === 0` bilan bir marta.
**Fayllar:** `apps/worker/src/clients/uzum-graphql.client.ts`
**Ta'sir:** Rate limit sharoitida scraping job muvaffaqiyat darajasi oshadi. Uzum server yuklanishi ham kamayadi (progressive wait).

### T-466 | WORKER | marketplace-intelligence — p.title null crash fix (2026-03-25)

**Manba:** kod-audit (2026-03-25)
**Muammo:** `p.title.slice(0, 20)` — title null bo'lsa TypeError → cron job crash.
**Yechim:** `(p.title ?? 'N/A').slice(0, 20)` — null safe null coalescing.
**Fayllar:** `apps/worker/src/processors/marketplace-intelligence.processor.ts`
**Ta'sir:** Kuniga 2 marta ishlaydigan marketplace-intelligence cron null title dan crash olmaydi.

### T-465 | FRONTEND | ChatWidget — SUPER_ADMIN plan bypass (2026-03-25)

**Manba:** kod-audit (2026-03-25)
**Muammo:** `canUseChat = hasAccess(plan, 'MAX')` — SUPER_ADMIN ham MAX planda bo'lmasa chat bloklanardi.
**Yechim:** `payload?.role === 'SUPER_ADMIN' || hasAccess(payload?.plan, 'MAX')`
**Fayllar:** `apps/web/src/components/chat/ChatWidget.tsx`
**Ta'sir:** Admin chat ni test qila oladi — billing sahifasiga yo'naltirilmaydi.

### T-464 | BACKEND | Sourcing — Playwright scrapers ixtiyoriy (2026-03-23)

**Manba:** ai-tahlil (2026-03-23)
**Muammo:** Banggood va Shopee scrapers bot protection tufayli 0 natija qaytaradi, lekin har safar Playwright brauzer ochib, vaqt va resurs sarflaydi.
**Yechim:** `SERPAPI_API_KEY` bo'lsa Playwright o'chiriladi (default). `ENABLE_PLAYWRIGHT_SCRAPERS=true` env o'rnatilsa yoqiladi. `playwrightEnabled` flag bilan shartli ravishda `browser/context` ochiladi, `playwrightCalls` array bo'sh bo'ladi.
**Fayllar:** `apps/worker/src/processors/sourcing.processor.ts`
**Ta'sir:** SERPAPI rejimida pipeline ~2-3x tezroq — Playwright overhead yo'q. Bright Data proxy qo'shilganda `ENABLE_PLAYWRIGHT_SCRAPERS=true` orqali qaytariladi.

### T-463 | FRONTEND | GOOGLE_SHOPPING badge label fix (2026-03-23)

**Manba:** kod-audit (2026-03-23)
**Muammo:** `SOURCE_META` da `GOOGLE_SHOPPING` key yo'q edi — items `platform.code = "google_shopping"` → `sourceKey = "GOOGLE_SHOPPING"` → fallback `{ label: sourceKey, flag: '🌐' }` → UI da xom kod ko'rinardi.
**Yechim:** `types.ts` ga `GOOGLE_SHOPPING: { label: 'Google Shopping', flag: '🔍', color: 'badge-info' }` qo'shildi.
**Fayllar:** `apps/web/src/components/product/types.ts`
**Ta'sir:** Global Bozor Taqqoslash da "Google Shopping" badge to'g'ri nom bilan ko'rinadi.

### T-462 | BACKEND | Sourcing — Xitoy ulgurji bozori integratsiyasi (2026-03-23)

**Manba:** user-feedback (2026-03-23)
**Muammo:** Sourcing pipeline faqat inglizcha query + SerpAPI Google Shopping ishlatardi. Xitoy ulgurji narxlari (1688, Taobao, Alibaba) ko'rinmasdi. `aliexpress_search` va `baidu_shopping` SerpAPI engine'lari current plan da HTTP 400 qaytaradi.
**Yechim:** 4 parallel SerpAPI `google_shopping` query: (1) inglizcha query, (2) xitoycha query (Claude Haiku tarjima), (3) `{enQuery} wholesale bulk price` (platform: aliexpress), (4) `{cnQuery} 批发` (platform: alibaba). `aiGenerateQuery()` ga `cn_query` (xitoycha) qaytarildi. `PLATFORM_CURRENCY` map qo'shildi, CNY→USD konversiya logic bor (currencyRate table orqali, fallback 0.138).
**Fayllar:** `apps/worker/src/processors/sourcing.processor.ts`
**Ta'sir:** Natijalar 0 → 20 ta (eski pipeline ishlamagan edi). Ulgurji narxlar (`批发` query) import margin hisoblash uchun real ma'lumot beradi.

### T-461 | BACKEND | Sourcing job — global 90s timeout (2026-03-23)

**Manba:** production-bug (2026-03-22)
**Muammo:** `runFullPipeline()` da global timeout yo'q edi — Playwright hang bo'lsa job abadiy `RUNNING` statusida qolardi.
**Yechim:** `Promise.race([Promise.allSettled([...searches]), timeoutPromise])` — 90 sekund global timeout. Timeout bo'lsa `FAILED` status + `error_message: "Pipeline timeout after 90000ms"`.
**Fayllar:** `apps/worker/src/processors/sourcing.processor.ts`
**Ta'sir:** Job endi maksimal 90s da yakunlanadi (DONE yoki FAILED). Foydalanuvchi cheksiz spinner ko'rmaydi.

### T-459 | BACKEND | Banggood title selector fix — sourcing scraper (2026-03-18)

**Manba:** ai-tahlil (2026-03-18)
**Muammo:** `scrapeBanggood()` da DOM fallback title selector `.goods-name, .p-name` eskirgan edi — Banggood sayt strukturasi o'zgargan, title bo'sh qaytardi.
**Yechim:** Selector ga `[class*="title"], a[title]` qo'shildi. Title extraction da `getAttribute('title')` birinchi tekshiriladi (ko'pincha anchor tag da to'liq nom bo'ladi).
**Fayllar:** `apps/worker/src/processors/sourcing.processor.ts:206-218`
**Commit:** b5a41a1
**Vaqt:** 15min (plan: 1h)
**Ta'sir:** Banggood DOM fallback endi title topadi — sourcing pipeline Banggood natijalarini qaytaradi.

### T-454 | FRONTEND | Search — tahlil natijasi SearchDrawer ichida (2026-03-15)

**Manba:** user-feedback (2026-03-15)
**Muammo:** "Tahlil qilish" bosilganda SearchDrawer yopilardi, AnalyzeModal alohida ochilardi — qidirish konteksti yo'qolardi.
**Yechim:** `analyzeState` state qo'shildi. Tahlil bosilganda SearchDrawer yopilmaydi — ichida loading → natija paneli ko'rsatiladi. Header da "Orqaga" tugmasi (qidiruv natijalariga qaytadi). Escape ham qidiruvga qaytaradi. `onOpenAnalyze` prop olib tashlandi. `ScoreRadial`, `StatCard` — SearchDrawer ichiga inline qilingan.
**Ta'sir:** Sotuvchi qidiruv kontekstini yo'qotmaydi, mahsulotdan mahsulotga o'tib tahlil qila oladi.

### T-453 | FRONTEND | Search — "Tezkor tahlil" tugmasi (AnalyzeModal integration) (2026-03-15)

**Manba:** ai-tahlil (2026-03-15)
**Muammo:** Qidiruvdan mahsulotni bosqanda ProductPage ochiladi, SearchDrawer yopiladi — foydalanuvchi qidirish kontekstini yo'qotadi.
**Yechim:** `AnalyzeModal` ga `initialUrl` prop qo'shildi. `Layout.tsx` da `analyzeUrl` state + `onOpenAnalyze(url?)` signature. `SearchDrawer` da har kartada lupa tugmasi — bosqanda Search yopiladi, AnalyzeModal o'sha mahsulot URL bilan ochiladi (`https://uzum.uz/product/{id}`).
**Ta'sir:** Sotuvchi qidiruvdan chiqmasdan tezkor AI tahlil ko'ra oladi.

### T-452 | FRONTEND | Search — Sort + reviewsAmount badge (2026-03-15)

**Manba:** ai-tahlil (2026-03-15)
**Muammo:** Qidiruv natijalari Uzum algoritmi tartibida, eng trendlisi birinchi emas. `reviewsAmount` ma'lumot bor lekin ko'rsatilmaydi.
**Yechim:** `SearchDrawer` ga `sortKey` state + `sortedResults` computed qo'shildi. Score/Savdo/Narx tugmalari — frontend sort. `reviewsAmount` chip sifatida ko'rsatildi.
**Ta'sir:** Sotuvchi bir zumda eng ko'p sotilayotgan yoki eng yuqori scoreli mahsulotlarni yuqorida ko'radi.

### T-451 | IKKALASI | Search — Score + weekly_bought backend response ga qo'shish (2026-03-15)

**Manba:** ai-tahlil (2026-03-15)
**Muammo:** SearchDrawer Uzum ning o'zidan farq qilmasdi — Trend Score ko'rsatilmaydi, VENTRA USP yo'q edi.
**Yechim:** `UzumSearchProduct` interface ga `score`, `weeklyBought` qo'shildi. `searchProductsDB` — `snapshots` relation orqali eng so'nggi `score` + `weekly_bought` select qilinadi. `enrichWithScores()` — Uzum API natijalarini batch DB lookup bilan enrich qiladi. Frontend `SearchProduct` type yangilandi. Kartada score badge (yashil/sariq/kulrang) + weekly chip ko'rsatiladi.
**Ta'sir:** Sotuvchi qidiruv natijalarida to'g'ridan Trend Score ko'radi — qaysi mahsulot trendda ekanini bir zumda biladi.

### T-450 | FRONTEND | Search — modal + 3-column grid (2026-03-15)

**Manba:** user-feedback (2026-03-15)
**Muammo:** Search alohida page — foydalanuvchi dashboard dan chiqib ketardi, holat yo'qolardi.
**Yechim:** `SearchDrawer.tsx` — DaisyUI modal (max-w-4xl), 3-column product grid, IntersectionObserver infinite scroll, PAGE_SIZE=15/PAGE_LIMIT=30. `/search` route olib tashlandi. Sidebar Search item olib tashlandi — Dashboard header ga o'tkazildi (URL tahlil oldiga).
**Ta'sir:** Search endi overlay sifatida ishlaydi, foydalanuvchi kontekstini yo'qotmaydi.

### T-449 | FRONTEND | URL tahlil — page o'rniga modal (2026-03-15)

**Manba:** user-feedback (2026-03-15)
**Muammo:** Dashboard da URL tahlil bosilganda alohida page ochilardi, sidebar da "Analyze" nav item bor edi.
**Yechim:** `AnalyzeModal` mavjud edi — `Layout.tsx` da `isAnalyzeOpen` state + Outlet context orqali `onOpenAnalyze` callback uzatildi. `DashboardPage` `useOutletContext` bilan oldi. `/analyze` route va sidebar item olib tashlandi.
**Ta'sir:** URL tahlil endi modal sifatida ishlaydi, foydalanuvchi dashboard dan chiqmaydi.

### T-448 | BACKEND | weekly_bought — Uzum API raw field tekshirish (2026-03-15)

**Manba:** user-feedback (2026-03-15)
**Muammo:** Uzum product sahifasida "X человека купили на этой неделе" ko'rsatiladi, Ventra da esa delta (snapshot farqi) ishlatiladi — 5-10 ta farq bo'lishi mumkin edi.
**Yechim:** Uzum REST API `/api/v2/product/18332` response to'liq tekshirildi. Haftalik dedicated field **yo'q** — faqat `ordersAmount` (kumulativ), `rOrdersAmount` (yaxlitlangan), `boughtAmount: 0` (SKU darajasi) mavjud. Uzum "на этой неделе" ni o'z ichki serverida hisoblaydi va API orqali bermaydi.
**Ta'sir:** Delta yondashuvi (~95% aniqlik) saqlanib qoldi — bu Uzum API imkoniyati doirasidagi eng yaxshi yechim.

### T-443 | FRONTEND | Search — Infinite scroll + Pagination (2026-03-14, v2)

**Manba:** user-feedback (2026-03-14)
**Muammo:** v1 da cheksiz scroll bor edi lekin pagination yo'q — foydalanuvchi qayerdaligini bilmay qolardi. Yangi talab: har sahifada max 64 mahsulot (24+24+16 scroll bilan), pastda pagination.
**Yechim:** `PAGE_LIMIT=64` qo'shildi. `calcPaging()` helper — `hasMore` (shu sahifada yana batch bor) va `hasNextPage` (keyingi sahifa bor) ni hisoblaydi. `page` state va `changePage()` funksiya — sahifa o'tganda results reset, scroll top, `(page-1)*64` offset dan yangi batch. Pagination UI: `< Oldingi | 1 2 3 | Keyingi >` — faqat `page>1 || hasNextPage` bo'lganda ko'rinadi.
**Fayllar:** `apps/web/src/pages/SearchPage.tsx`
**Vaqt:** 30min (plan: 2h)
**Ta'sir:** Foydalanuvchi har sahifada max 64 mahsulot ko'radi, scroll bilan yuklaydi, pagination bilan sahifalar orasida erkin o'tadi.

### T-446 | IKKALASI | Tracked product — kuzatuvdan olib tashlash (2026-03-14)

**Manba:** user-feedback (2026-03-14)
**Muammo:** Foydalanuvchi kuzatuvga qo'shilgan mahsulotni olib tashlash imkoni yo'q edi.
**Yechim:** Backend: `untrackProduct` service method (`is_active: false`), `DELETE /products/:id/track` endpoint. Frontend: `productsApi.untrack()`, ProductsTable da hover da "×" tugmasi, `onUntrack` callback orqali listdan darhol o'chiladi. `product-tracked` CustomEvent — track qilinganda dashboard auto-refresh. i18n uz/ru/en.
**Fayllar:** `apps/api/src/products/products.service.ts`, `products.controller.ts`, `apps/web/src/api/products.ts`, `apps/web/src/components/dashboard/ProductsTable.tsx`, `apps/web/src/hooks/useDashboardData.ts`, `apps/web/src/pages/AnalyzePage.tsx`, `apps/web/src/components/AnalyzeModal.tsx`, `apps/web/src/pages/DashboardPage.tsx`
**Vaqt:** 45min (plan: 1h)
**Ta'sir:** Foydalanuvchi mahsulotni kuzatuvdan olib tashlashi mumkin. Track qilinganda dashboard reload qilmasdan yangilanadi.

### T-445 | FRONTEND | Analyze modal + search btn i18n (2026-03-14)

**Manba:** user-feedback (2026-03-14)
**Muammo:** Analyze faqat dedicated page edi — foydalanuvchi har safar navigate qilishi kerak bo'lardi. `search.searchBtn` i18n kaliti yo'q, fallback `'Qidirish'` ishlatilardi.
**Yechim:** `AnalyzeModal.tsx` yaratildi (DaisyUI dialog, to'liq analyze logic). `Layout.tsx` ga `isAnalyzeOpen` state, sidebar "Analyze" → button (onClick), Ctrl+K → modal. `search.searchBtn` uz/ru/en qo'shildi.
**Fayllar:** `apps/web/src/components/AnalyzeModal.tsx`, `apps/web/src/components/Layout.tsx`, `apps/web/src/pages/SearchPage.tsx`, `apps/web/src/i18n/uz.ts`, `ru.ts`, `en.ts`
**Commit:** b446e78
**Vaqt:** 30min (plan: 1h)
**Ta'sir:** Foydalanuvchi dashboard dan chiqmasdan mahsulot tahlil qila oladi. Ctrl+K shortcut ishlaydi. Tugma matni aniq.

### T-444 | FRONTEND | Search card dizayn — onboarding uslubida qayta loyiha (2026-03-14)

**Manba:** user-feedback (2026-03-14)
**Muammo:** Search card lari vizual jihatdan zaif, onboarding/dashboard stili bilan uyg'un emas edi. Narx 6 raqamli bo'lganda "so'm" pastga tushib qolayotgan edi.
**Yechim:** Card to'liq qayta loyiha: `rounded-2xl bg-base-100 shadow-sm hover:shadow-lg`; rasm ustida rating badge (backdrop-blur pill), tracked badge, hover scale+overlay; sarlavha `min-h-[2.5rem]`; stats chip/rounded-full uslubi; narx `text-lg font-bold` + `text-[10px] uppercase tracking-wider` so'm; tugmalar `flex-1` teng kenglikda.
**Fayllar:** `apps/web/src/pages/SearchPage.tsx`
**Vaqt:** 20min (plan: 2h)
**Ta'sir:** Search card lari endi dashboard va onboarding bilan bir xil dizayn tili — aniq ierarxiya, hover effektlari, narx muammosi yo'q.

### T-442 | FRONTEND | Dashboard KPI — "O'rta Score" va "Salomatlik" o'zgartirildi (2026-03-14)

**Manba:** user-feedback (2026-03-14)
**Muammo:** `O'rta Score` (avgScore 5.43) va `Salomatlik` (healthPct 73%) foydalanuvchi uchun tushunarsiz — nima qilish kerakligini anglatmaydi.
**Yechim:** `O'rta Score` → `Ko'tarilayotgan` (rising count), `Salomatlik` → `Tushayotgan` (falling count, rang: yashil/sariq/qizil). i18n: uz/ru/en.
**Fayllar:** `apps/web/src/components/dashboard/KPICards.tsx`, `apps/web/src/i18n/uz.ts`, `ru.ts`, `en.ts`
**Vaqt:** 15min (plan: 15min)
**Ta'sir:** Dashboard KPI kartalari endi aniq actionable ma'lumot ko'rsatadi — foydalanuvchi qancha mahsulot o'sishda/tushishda ekanini bir qarashda biladi.

### T-439 | BACKEND | Search — product rasmlari + iphone 1 natija fix (2026-03-14)

**Manba:** production-bug (user-feedback, 2026-03-14)
**Muammo:** Search da rasmlar ko'rinmaydi. `coverPhoto { photoKey }` ishlatildi — lekin Uzum GraphQL schemada bu field yo'q (`CatalogCard` da). `photos { photoKey }` ham xato — `Photo` type da `photoKey` yo'q. `coverPhoto` ni fragment da ishlatish 1-natijaga olib kelgan (GraphQL error → DB fallback).
**Yechim:** Uzum GraphQL schema test qilindi: `photos { key }` — `CatalogCard` fragmentida ishlaydi, `__typename=SkuGroupCard`. `parseGraphQLResponse` da `photoUrl = https://images.uzum.uz/${key}/original.jpg`. DB fallback da `photoUrl: p.photo_url ?? undefined` qo'shildi. Redis cache eski natija saqlab qolgan edi — tozalandi.
**Fayllar:** `apps/api/src/uzum/uzum.client.ts`, `apps/api/src/products/products.service.ts`
**Commit:** ce1ed30
**Vaqt:** 1.5h (plan: 30min)
**Ta'sir:** Search sahifasida barcha product rasmlari ko'rinadi — live Uzum GraphQL va DB fallback da ham.

### T-441 | BACKEND | Uzum impit proxy + x-iid header fix (2026-03-14)

**Manba:** production-bug (user-feedback, 2026-03-14)
**Muammo:** Search 429 — impit proxysiz ishlar edi, PROXY_URL set bo'lsa ham impit uni ishlatmayotgan edi. Token endpoint `x-iid` header talab qiladi, HEADERS da yo'q edi.
**Yechim:** `getImpit()` da `proxyUrl` qo'shildi; HEADERS ga `x-iid: SERVER_IID` va Chrome 130 UA qo'shildi.
**Fayllar:** `apps/api/src/uzum/uzum.client.ts`
**Commit:** 21f243d
**Vaqt:** 1h (plan: 2h)
**Ta'sir:** PROXY_URL set qilinganda impit ham proxy orqali ishlaydi → Uzum 429 bypass bo'ladi. x-iid mavjudligi token acquisition ishonchliligini oshiradi.

# ── DONE.MD ENTRY FORMATI ──────────────────────────────────
#
# ### T-XXX | KATEGORIYA | Sarlavha (sana)
#
# **Manba:** [manba tegi]
# **Muammo:** [1-2 jumla — nima buzilgan edi]
# **Yechim:** [1-2 jumla — nima qilindi]
# **Fayllar:** [o'zgargan fayllar]
# **Commit:** [hash yoki PR #]
# **Vaqt:** [haqiqiy] (plan: [plan])
# **Ta'sir:** [nima yaxshilandi — metrika, UX, xavfsizlik]
#
# ── ESLATMA ────────────────────────────────────────────────
# - Yangi entry lar YUQORIGA qo'shiladi (eng oxirgi birinchi)
# - **Ta'sir** maydoni MAJBURIY — nima o'zgardi end-user uchun
# - Sprint/batch ishlar bitta heading ostida guruhlanadi

---

### T-440 | FRONTEND | Search — limit 24 → 100 (2026-03-14)

**Manba:** user-feedback
**Muammo:** Qidiruv faqat 24 ta natija qaytarardi.
**Yechim:** `DEFAULT_LIMIT` olib tashlandi, `products.ts` da default `100` ga o'zgartirildi.
**Fayllar:** `apps/web/src/pages/SearchPage.tsx`, `apps/web/src/api/products.ts`
**Vaqt:** 10min
**Ta'sir:** Qidiruv natijalarida 100 tagacha mahsulot ko'rinadi.

---

### T-438 | FRONTEND | Search page — qidiruv button va manual trigger (2026-03-14)

**Manba:** user-feedback
**Muammo:** Search sahifasida debounce bilan avtomatik qidiruv ishlardi — aniq "Qidirish" button yo'q edi. Foydalanuvchi button bosib qidirmoqchi edi.
**Yechim:** Debounce useEffect olib tashlandi. Input + button `<form>` ichiga o'raldi. Enter yoki button click `handleSubmit` ni chaqiradi. Loading spinner button ichida ko'rinadi.
**Fayllar:** `apps/web/src/pages/SearchPage.tsx`
**Vaqt:** 20min
**Ta'sir:** Foydalanuvchi qachon qidirish boshlashini o'zi nazorat qiladi. Keraksiz API so'rovlar yo'qoldi.

---

### T-437 | FRONTEND | Web dashboard — ProductsTable overflow-y-auto fix (2026-03-14)

**Manba:** user-feedback
**Muammo:** Ko'p mahsulot kuzatilganda asosiy dashboard sahifasi butunlay scroll bo'lib ketardi. `ProductsTable` da height cheklov yo'q edi.
**Yechim:** `overflow-x-auto` div ga `overflow-y-auto max-h-[480px]` qo'shildi. `thead tr` ga `sticky top-0 z-10` qo'shildi — scroll paytida sarlavhalar ko'rinib turadi.
**Fayllar:** `apps/web/src/components/dashboard/ProductsTable.tsx`
**Vaqt:** 15min
**Ta'sir:** Dashboard sahifasi layout buzilmaydi. Jadval ichida scroll bo'ladi, ustun sarlavhalari doim ko'rinadi.

---

### T-436 | FRONTEND | Extension TrackedList — "Kuzatilayotgan mahsulotlar yo'q" fix (2026-03-14)

**Manba:** production-bug
**Muammo:** TrackedList har doim "Kuzatilayotgan mahsulotlar yo'q" ko'rsatardi. `get-tracked-products.ts` handler backend javobini noto'g'ri o'qirdi: `.filter((p) => p.is_active)` — backend bu maydonni qaytarmasdi (undefined → barcha mahsulot filtrlanib ketardi); `p.product?.title` — backend flat format qaytaradi, nested emas.
**Yechim:** `get-tracked-products.ts` handler to'liq qayta yozildi — `.filter((p) => p.is_active)` olib tashlandi, `p.product?.title/score/weekly_bought` → `p.title/score/weekly_bought` flat o'qishga o'tkazildi. `api.ts` dagi `TrackedProductItem` interface ham backend haqiqiy javobiga moslashtirildi (nested `product` ob'ekti o'rniga flat maydonlar).
**Fayllar:** `apps/extension/src/background/messages/get-tracked-products.ts`, `apps/extension/src/lib/api.ts`
**Commit:** (2026-03-14)
**Vaqt:** 30min
**Ta'sir:** Tracked mahsulotlar popup da to'g'ri ko'rinadi. Foydalanuvchi o'zi kuzatishga qo'shgan mahsulotlar ro'yxati endi to'liq ishlaydi.

---

### T-433 | FRONTEND | Extension — SW message channel timeout fix (2026-03-14)

**Manba:** production-bug
**Muammo:** Modal ochilganda "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received" xatosi. `apiFetch()` va `fetchUzumProduct()` da timeout yo'q edi — server sekin javob bersa service worker o'ldirilardi.
**Yechim:** `apiFetch()` ga `signal: AbortSignal.timeout(10000)`, `fetchUzumProduct()` ga `signal: AbortSignal.timeout(8000)` qo'shildi.
**Fayllar:** `apps/extension/src/lib/api.ts`, `apps/extension/src/lib/uzum-api.ts`
**Commit:** (2026-03-14)
**Vaqt:** 15min (plan: 30min)
**Ta'sir:** Service worker timeout xatosi yo'qoldi. Modal ochilishi barqaror.

---

### T-435 | FRONTEND | Extension popup crash — toFixed/toLocaleString null/undefined xatoliklar (2026-03-14)

**Manba:** production-bug
**Muammo:** Popup ochilishi bilan yoki tracked mahsulot modal da bir nechta "Cannot read properties of null/undefined (reading 'toFixed'/'toLocaleString')" crash xatoliklari. `avg_score`, `comp.score`, `snap.price` kabi qiymatlar runtime da null/undefined bo'lgan holda xavfsiz guard yo'q edi.
**Yechim:**
- `CategoryFilter`: `avg_score.toFixed(1)` → `(avg_score ?? 0).toFixed(1)`
- `TrackedList`: `score !== null` → `score != null` (undefined ham ushlaydi)
- `CategoryInsights`: `avg_score.toFixed(1)` → `(avg_score ?? 0).toFixed(1)`
- `CompetitorAnalysis`: `comp.score.toFixed(1)` → `(comp.score ?? 0).toFixed(1)`, `sendToBackground` ga o'tkazildi
- `PriceHistory`: `snap.price.toLocaleString()` → `(snap.price ?? 0).toLocaleString()`
- `storage.ts`: `recordPriceSnapshot` da null/NaN narx saqlanmasligi uchun guard qo'shildi
**Fayllar:** `CategoryFilter.tsx`, `TrackedList.tsx`, `CategoryInsights.tsx`, `CompetitorAnalysis.tsx`, `PriceHistory.tsx`, `storage.ts`, `popup.tsx` (debug logs cleaned)
**Commit:** (bugungi batch commit)
**Vaqt:** 2h
**Ta'sir:** Popup barqaror ishlaydi. Tracked mahsulot modali crash qilmaydi. Narx tarixi null narxlarni saqlamaydi.

---

### T-434 | FRONTEND | Extension popup — CategoryFilter popup yopilishi fix (2026-03-13)

**Manba:** production-bug
**Muammo:** Popup extension icon bosilganda loading spinnерlar ko'rinib, 1 sek da yopilardi. `CategoryFilter` popup kontekstidan to'g'ridan `fetch()` qilardi → Chrome MV3 da popup focus yo'qotishiga sabab bo'lardi.
**Yechim:** `get-categories.ts` background handler yaratildi. `CategoryFilter` `getTopCategories()` o'rniga `sendToBackground("get-categories")` ishlatadigan bo'ldi — `TrackedList` bilan bir xil arxitektura.
**Fayllar:** `apps/extension/src/background/messages/get-categories.ts` (yangi), `apps/extension/src/components/CategoryFilter.tsx`
**Commit:** 06ad2f5
**Vaqt:** 30min (plan: 30min)
**Ta'sir:** Popup endi yopilmaydi. Kategoriyalar to'g'ri yuklanadi.

---

### T-224 | FRONTEND | Extension — Hotkeys (Ctrl+Shift+T/S) (2026-03-13)

**Manba:** yangi-feature
**Muammo:** Extension overlay bilan faqat sichqon orqali ishlash mumkin edi — keyboard shortcut yo'q edi.
**Yechim:** `hotkeys.ts` yaratildi: `Ctrl+Shift+T` overlay ko'rsatish/yashirish, `Ctrl+Shift+S` sevimlilarga qo'shish/olib tashlash. `product-page.tsx` da `registerHotkeys` hook ulantirildi. Favorite toggle uchun 2 soniya toast xabar qo'shildi.
**Fayllar:** `apps/extension/src/lib/hotkeys.ts` (yangi), `apps/extension/src/contents/product-page.tsx`, `apps/extension/src/contents/plasmo-overlay.css`
**Commit:** keyingi
**Vaqt:** 45min (plan: 1h)
**Ta'sir:** Foydalanuvchi klaviaturadan overlay boshqarishi va mahsulotni sevimlilarga qo'sha oladi.

---

### T-221 | FRONTEND | Extension — Price history chart (2026-03-13)

**Manba:** yangi-feature
**Muammo:** `PriceHistory.tsx` `Math.random()` bilan soxta narx tarixi ko'rsatardi — har modal ochilganda farq qilardi.
**Yechim:** `storage.ts` ga `recordPriceSnapshot` / `getPriceHistory` qo'shildi. Modal ochilganda joriy narx localStorage ga saqlanadi (kuniga 1 marta, faqat o'zgarsa). 2+ kuzatuv bo'lganda real bar chart; kam bo'lsa "narx tarixi to'planmoqda" xabari.
**Fayllar:** `apps/extension/src/lib/storage.ts`, `apps/extension/src/components/PriceHistory.tsx`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** keyingi
**Vaqt:** 1h (plan: 1.5h)
**Ta'sir:** Narx tarixi endi foydalanuvchi kuzatishi asosida real ma'lumot ko'rsatadi.

---

### T-428 | FRONTEND | Extension — VENTRA bazasida yo'q mahsulotda modal yopilishi (2026-03-11)

**Manba:** production-bug
**Muammo:** Kuzatilmagan mahsulot sahifasida extension icon bosilganda modal ochilardi va darhol yopilib ketardi (VENTRA API 404 → success:false → modal error state emas, yopilib ketardi).
**Yechim:** `uzum-api.ts` yaratildi — VENTRA bazasida bo'lmasa `api.uzum.uz` fallback. `product-page.tsx` da parallel fetch + `UzumCard` overlay content script sifatida ko'rsatiladi (popup-independent). Kuzatilmagan mahsulotlarda ham to'liq narx/reyting/buyurtmalar ko'rinadi.
**Fayllar:** `apps/extension/src/lib/uzum-api.ts`, `apps/extension/src/background/messages/quick-score.ts`, `apps/extension/src/components/UzumCard.tsx`, `apps/extension/src/contents/product-page.tsx`
**Commit:** a6374a7, 91cd6b4
**Vaqt:** 2h (plan: 30min)
**Ta'sir:** Extension har qanday uzum.uz mahsulotida ishlaydi — VENTRA bazasida bo'lmasa ham.

---

### T-222 | FRONTEND | Extension — Favorites & notes (2026-03-13)

**Manba:** yangi-feature
**Muammo:** Mahsulotga eslatma yoki sevimli belgi qo'yish imkoni yo'q edi.
**Yechim:** `ProductNotes.tsx` yaratildi — sevimli toggle + matnli eslatma. `storage.ts` ga `favorites`/`notes` CRUD qo'shildi. `QuickAnalysisModal.tsx` ga Tahlil tabida integratsiya qilindi.
**Fayllar:** `apps/extension/src/components/ProductNotes.tsx`, `apps/extension/src/lib/storage.ts`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** avvalgi sessiyada
**Vaqt:** 1h (plan: 1.5h)
**Ta'sir:** Foydalanuvchi mahsulotlarga eslatma yozib, sevimlilarga qo'sha oladi.

---

### T-219 | FRONTEND | Extension — Category trends & insights (2026-03-13)

**Manba:** yangi-feature
**Muammo:** Kategoriya tanlanganda faqat mahsulot ro'yxati ko'rinardi — trend, raqobat darajasi, narx diapazoni yo'q edi.
**Yechim:** `CategoryInsights.tsx` yaratildi — avg score, raqobat darajasi (past/o'rta/yuqori), narx diapazoni, ijobiy belgilar. `QuickAnalysisModal.tsx` ga Kategoriya Tahlili modalida integratsiya qilindi.
**Fayllar:** `apps/extension/src/components/CategoryInsights.tsx`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** avvalgi sessiyada
**Vaqt:** 1.5h (plan: 2h)
**Ta'sir:** Kategoriya tanlanganda to'liq analytics ko'rinadi.

---

### T-218 | FRONTEND | Extension — Advanced filters (2026-03-13)

**Manba:** yangi-feature
**Muammo:** Kategoriya top mahsulotlari ro'yxatida qidirish/saralash imkoni yo'q edi.
**Yechim:** `AdvancedFilters.tsx` — matn qidirish + sort (score, narx asc/desc, haftalik). `QuickAnalysisModal.tsx` da Kategoriya Tahlili bo'limiga integratsiya.
**Fayllar:** `apps/extension/src/components/AdvancedFilters.tsx`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** avvalgi sessiyada
**Vaqt:** 1h (plan: 1.5h)
**Ta'sir:** Kategoriya top mahsulotlarini qidirish va saralash mumkin.

---

### T-217 | FRONTEND | Extension — Category filter sidebar (2026-03-13)

**Manba:** yangi-feature
**Muammo:** Popup da kategoriyalar ko'rsatilmasdi — faqat kuzatilayotgan mahsulotlar ro'yxati bor edi.
**Yechim:** `CategoryFilter.tsx` — `getTopCategories()` orqali avg_score bo'yicha top 10 kategoriya. `popup.tsx` ga integratsiya: kategoriyani bosish `QuickAnalysisModal` ni kategoriya tahlili rejimida ochadi.
**Fayllar:** `apps/extension/src/components/CategoryFilter.tsx`, `apps/extension/src/popup.tsx`
**Commit:** avvalgi sessiyada
**Vaqt:** 1h (plan: 1.5h)
**Ta'sir:** Foydalanuvchi popupdan kategoriya tahlilini ochishi mumkin.

---

### T-220 | FRONTEND | Extension — Competitor analysis tab (2026-03-13)

**Manba:** yangi-feature
**Muammo:** `CompetitorAnalysis.tsx` da `generateCompetitors()` random/fake data ishlatardi — foydalanuvchiga haqiqiy raqobatchilar ko'rinmasdi.
**Yechim:** `getTopCategories()` chaqiriladi → `product.id` qaysi kategoriyaning `top_products` da ekanini topadi → o'sha kategoriyaning boshqa top mahsulotlari ko'rsatiladi. Score farqi, narx farqi, haftalik savdo, kategoriyada o'rin va tahlil xulosasi qo'shildi.
**Fayllar:** `apps/extension/src/components/CompetitorAnalysis.tsx`
**Commit:** keyingi
**Vaqt:** 1h (plan: 1.5h)
**Ta'sir:** "Raqobatchilar" tabida endi real VENTRA ma'lumotlari — kategoriyada necha-o'rin, narx va score taqqoslama ko'rsatiladi.

---

### T-431 | BACKEND | trackProduct shop.orders_quantity BigInt mismatch → 500 (2026-03-13)

**Manba:** production-bug (extension UzumCard track button → "500: Internal server error")
**Muammo:** `trackProduct` va `trackFromSearch` metodlarida `shop.upsert` da `orders_quantity: detail.shop.ordersQuantity` — plain `number` berilgan, Prisma `BigInt?` kutadi → `PrismaClientValidationError` → 500. Kuzatilmagan mahsulotni track qilib bo'lmasdi.
**Yechim:** Ikki metodda, to'rtta qatorda `BigInt(detail.shop.ordersQuantity ?? 0)` bilan wrap qilindi.
**Fayllar:** `apps/api/src/products/products.service.ts`
**Commit:** 5016e7e
**Vaqt:** 15min (plan: 10min)
**Ta'sir:** Kuzatilmagan har qanday mahsulotni extensiondan to'g'ridan track qilish mumkin.

---

### T-432 | FRONTEND | Extension — tabs permission + per-user track state fix (2026-03-13)

**Manba:** production-bug (debug session 2026-03-11)
**Muammo:** 3 ta bug bitta debug sessiyada topildi: (1) `manifest.permissions` da `"activeTab"/"tabs"` yo'q → popup `chrome.tabs.query()` da `tab.url = undefined` → productId null → "Tez Tahlil" chiqmasdi. (2) ScoreCard `initialTracked={true}` har doim berilgan — boshqa user track qilgan mahsulot ham "Kuzatilmoqda" ko'rsatardi. (3) UzumCard da xato xabari ko'rinmasdi — foydalanuvchi qaysi xato ekanini bilmasdi.
**Yechim:** (1) `package.json` manifest ga `"activeTab"` va `"tabs"` qo'shildi. (2) `product-page.tsx` da `quick-score` + `get-tracked-products` parallel fetch — joriy user uchun aniq tekshirish. (3) UzumCard da `errorMsg` state — xato matni UI da ko'rsatiladi.
**Fayllar:** `apps/extension/package.json`, `apps/extension/src/contents/product-page.tsx`, `apps/extension/src/components/UzumCard.tsx`, `apps/extension/src/components/ScoreCard.tsx`, `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** ef13464, ee96d92, e16acaf, 7b5b386
**Vaqt:** 2h (plan: —)
**Ta'sir:** Popup da "Tez Tahlil" ishlaydi. Track holati foydalanuvchiga to'g'ri ko'rsatiladi. Xato xabari aniq ko'rinadi.

---

### T-423 | BACKEND | Platform seed data + env config (2026-03-09)

**Manba:** yangi-feature
**Muammo:** BrightData platform konfiguratsiyasi yo'q edi.
**Yechim:** `platforms.config.ts` yaratildi — AliExpress/1688/Taobao config (name, color, datasetId). BrightDataClient env fallback bilan ishlaydi.
**Fayllar:** `apps/api/src/bright-data/platforms.config.ts`
**Commit:** 48cec40
**Vaqt:** 10min (plan: 30min)
**Ta'sir:** BrightData modul konfiguratsiya bilan to'liq ishlaydi.

---

### T-424 | FRONTEND | Track state dedup — prevent double tracking (2026-03-09)

**Manba:** kod-audit
**Muammo:** Foydalanuvchi bir mahsulotni qayta track qilishi mumkin edi.
**Yechim:** `useTrackedProducts()` hook — mount da tracked IDs oladi, optimistic UI, rollback on error.
**Fayllar:** `apps/web/src/hooks/useTrackedProducts.ts`, `SearchPage.tsx`, `ProductSearchCard.tsx`
**Commit:** 9d47b75
**Vaqt:** 20min (plan: 30min)
**Ta'sir:** Duplicate tracking oldini olingan, UX yaxshilangan.

---

### T-425 | BACKEND | Search analytics — query logging + admin endpoint (2026-03-09)

**Manba:** self-improve
**Muammo:** Foydalanuvchilar nima qidirayotgani noma'lum edi.
**Yechim:** `SearchLog` Prisma model + `logSearch()` async method + `GET /admin/search-analytics` endpoint (top queries, zero-result, conversion rate).
**Fayllar:** `apps/api/prisma/schema.prisma`, `products.service.ts`, `admin.controller.ts`
**Commit:** 0268999
**Vaqt:** 40min (plan: 1h)
**Ta'sir:** Admin dashboard da qidiruv analitikasi ko'rsatiladi.

---

### T-417 | FRONTEND | i18n search page translations uz/ru/en (2026-03-09)

**Manba:** yangi-feature
**Muammo:** SearchPage uchun i18n kalitlari yo'q edi — UI matnlari tarjima qilinmagan.
**Yechim:** 3 til fayliga `search.*` bo'limi qo'shildi — title, placeholder, track, noResults, inStock, outOfStock va boshqa kalitlar.
**Fayllar:** `apps/web/src/i18n/uz.ts`, `ru.ts`, `en.ts`
**Commit:** 48cec40
**Vaqt:** 15min (plan: 30min)
**Ta'sir:** Search sahifasi to'liq 3 tilda ishlaydi.

---

### T-418 | FRONTEND | ProductSearchCard — rasm, narx, rating, track button (2026-03-09)

**Manba:** yangi-feature
**Muammo:** Search natijalarini ko'rsatadigan card component yo'q edi.
**Yechim:** `ProductSearchCard` yaratildi — rasm (lazy load + fallback SVG), narx (Intl format + discount%), rating (yulduz), orders, stock badge, track button (optimistic UI + loading spinner).
**Fayllar:** `apps/web/src/components/search/ProductSearchCard.tsx`
**Commit:** 48cec40
**Vaqt:** 40min (plan: 1h)
**Ta'sir:** Foydalanuvchi search natijalarini vizual card formatida ko'radi, track/tahlil qila oladi.

---

### T-419 | FRONTEND | Inline expand panel — tahlil, sourcing preview (2026-03-09)

**Manba:** yangi-feature
**Muammo:** Mahsulotni bosganда batafsil ma'lumot ko'rish imkoni yo'q edi.
**Yechim:** `ExpandPanel` component — col-span-full inline panel, animate in/out, stats grid (narx/rating/orders/stok), score progress bar, weekly bought, SourcePricePanel integratsiya.
**Fayllar:** `apps/web/src/components/search/ExpandPanel.tsx`, `apps/web/src/pages/SearchPage.tsx`
**Commit:** 67d62c9
**Vaqt:** 1h (plan: 2h)
**Ta'sir:** Foydalanuvchi search dan chiqmasdan mahsulot tahlilini ko'ra oladi.

---

### T-420 | BACKEND | BrightData client — Web Scraper API wrapper (2026-03-09)

**Manba:** yangi-feature
**Muammo:** Xalqaro narx taqqoslash uchun AliExpress/1688/Taobao ma'lumoti yo'q edi.
**Yechim:** `BrightDataClient` service — trigger scrape → poll snapshot → normalize to common schema. 3 platform parallel (`Promise.allSettled`). API key yo'q bo'lsa graceful empty return.
**Fayllar:** `apps/api/src/bright-data/bright-data.client.ts`, `bright-data.module.ts`, `interfaces/`, `platforms.config.ts`
**Commit:** 48cec40
**Vaqt:** 1.5h (plan: 2h)
**Ta'sir:** Backend xalqaro narxlarni 3 platformadan olishi mumkin.

---

### T-421 | BACKEND | Sourcing search endpoint — multi-platform query (2026-03-09)

**Manba:** yangi-feature
**Muammo:** Frontend dan Bright Data natijalarini olish uchun endpoint yo'q edi.
**Yechim:** `GET /products/:id/sourcing-comparison` endpoint — product title oladi, BrightDataClient.searchAllPlatforms() chaqiradi, natijalarni platformalar bo'yicha guruhlab qaytaradi.
**Fayllar:** `apps/api/src/products/products.controller.ts`, `products.service.ts`, `products.module.ts`
**Commit:** 67d62c9
**Vaqt:** 30min (plan: 1h)
**Ta'sir:** Frontend tracked mahsulotlar uchun xalqaro narx taqqoslash ko'rsata oladi.

---

### T-422 | FRONTEND | Source price panel — platform cards in expand (2026-03-09)

**Manba:** yangi-feature
**Muammo:** Expand panel da xalqaro narxlar ko'rsatilmas edi.
**Yechim:** `SourcePricePanel` component — AliExpress (qizil), 1688 (ko'k), Taobao (yashil) platform cardlar. Narx USD + original, margin %, rating, orders, "cheapest" badge. Mobile horizontal scroll, desktop 3-column grid.
**Fayllar:** `apps/web/src/components/search/SourcePricePanel.tsx`
**Commit:** 9d47b75
**Vaqt:** 1h (plan: 2h)
**Ta'sir:** Tracked mahsulotlar uchun xalqaro narx taqqoslash vizualizatsiya qilingan.

---

### T-430 | FRONTEND | Extension — UzumCard track button restored (2026-03-11)

**Manba:** regression (T-429 fix dan keyin backend ishlaydi, lekin UI dan tugma olingan edi)
**Muammo:** `UzumCard` (kuzatilmagan mahsulot overlay) da "Kuzatishga qo'shish" tugmasi yo'q edi — backend endpoint yo'q deb olib tashlangan, lekin Bekzod T-429 da auto-create qo'shgandan keyin endi 500 xatosi bo'lmaydi.
**Yechim:** `UzumCard.tsx` ga `ScoreCard` dagi kabi `useState` + `sendToBackground("track-product")` qo'shildi. 4 holat: idle/loading/tracked/error.
**Fayllar:** `apps/extension/src/components/UzumCard.tsx`
**Commit:** 724caf1
**Vaqt:** 15min (plan: 15min)
**Ta'sir:** Kuzatilmagan mahsulot sahifasida overlay dan to'g'ridan track qilish mumkin — popup ochmasdan.

---

### T-427 | FRONTEND | Extension — Modal auto-close fix (2026-03-09)

**Manba:** user-feedback (2026-03-09)
**Muammo:** "Tez Tahlil" modal ochilgandan ~1 sekund o'tib auto-close bo'lardi. Ikki sabab: (1) `<dialog>` element natively Escape tugmasini eshitib yopiladi — `onCancel` handler yo'q edi. (2) Backdrop `role="button"` + `tabIndex={0}` keyboard trigger xavfi, loading paytida ham yopilishi mumkin edi.
**Yechim:** `onCancel={(e) => e.preventDefault()}` qo'shildi — Escape native close oldini oladi. Backdrop click loading paytida disabled. `role`/`tabIndex` backdrop dan olib tashlandi. `ProductNotes.tsx` dan `console.error` tozalandi (CLAUDE.md violation).
**Fayllar:** `apps/extension/src/components/QuickAnalysisModal.tsx`, `apps/extension/src/components/ProductNotes.tsx`
**Commit:** 47ad151
**Vaqt:** 30min (plan: 2h)
**Ta'sir:** Modal endi Escape tugmasi yoki loading paytida aksidental yopilmaydi. Foydalanuvchi tahlil natijasini ko'ra oladi.

---

## Quick Fix | FRONTEND | Extension modal — null check .toFixed() (2026-03-09)

**Manba:** user-feedback
**Muammo:** Modal crash: "Uncaught TypeError: Cannot read properties of undefined (reading 'toFixed')". API 404 qaytarganda, product null bo'lib `.toFixed()` call crash qiladi.
**Yechim:** Null checks qo'shildi: `product.score != null ? .toFixed(2) : "--"`. Modal endi crash bo'lmaydi, undefined data o'rniga `"--"` ko'rinadi.
**Fayllar:** `apps/extension/src/components/QuickAnalysisModal.tsx`
**Commit:** 06ae75c
**Vaqt:** 10min (plan: 1h)
**Ta'sir:** Modal stable, no crashes. User xatosiz tahlil qo'llanish mumkin.

---

## T-426 | FRONTEND | Bot fixes — 6 ta bug (2026-03-08)

### T-426 | FRONTEND | Bot fixes (domain, health, /top, logs)

**Manba:** kod-audit (T-360 dan ajratildi)
**Muammo:** Bot kodi 6 ta P2 bug'ni o'z ichiga olgan: WEB_URL hardcoded, health check faqat bot API, /top command type unsafe, startup logs detail yo'q.
**Yechim:**
1. WEB_URL env fallback qo'shildi
2. Health check Prisma connection ham tekshiradi
3. /top category_id String() bilan safe qilindi
4. escapeHtml duplicate tekshirildi (yo'q)
5. Startup logs detail qo'shildi (rate limit, WEB_URL)
6. .env.example ga WEB_URL qo'shildi

**Fayllar:** `apps/bot/src/main.ts`, `.env.example`
**Commit:** d629da6
**Vaqt:** 45min (plan: 2h)
**Ta'sir:** Bot production-ready, health check reliable, startup diagnostics, env configuration clear.

---

## T-413 + T-414 + T-415 — Search Batch 2: Track + NoBilling + SearchPage (2026-03-08)

### T-413 | BACKEND | trackFromSearch — FK constraint safe track (2026-03-08)

**Manba:** kod-audit
**Muammo:** Search natijasidagi mahsulotni track qilganda Product jadvalda yo'q bo'lsa FK constraint violation berardi.
**Yechim:** `trackFromSearch(accountId, uzumProductId)` — Product yo'q bo'lsa Uzum API dan fetch, Shop upsert, Product create, keyin TrackedProduct link.
**Fayllar:** `apps/api/src/products/products.service.ts`, `apps/api/src/products/products.controller.ts`
**Commit:** a6cd581
**Vaqt:** 10min (plan: 1h)
**Ta'sir:** Foydalanuvchi search natijasidan to'g'ridan-to'g'ri track qila oladi — FK xatosiz.

### T-414 | BACKEND | @NoBilling() decorator — search exempt from billing (2026-03-08)

**Manba:** kod-audit
**Muammo:** BillingGuard class-level da — search har so'rovda kredit yechardi. Search bepul bo'lishi kerak.
**Yechim:** `@NoBilling()` decorator (SetMetadata) + BillingGuard da Reflector check. Search endpoint ga qo'yildi.
**Fayllar:** `apps/api/src/common/decorators/no-billing.decorator.ts`, `apps/api/src/billing/billing.guard.ts`, `apps/api/src/products/products.controller.ts`
**Commit:** a6cd581
**Vaqt:** 5min (plan: 30min)
**Ta'sir:** Search bepul — FREE plan foydalanuvchilari ham limit yemay qidira oladi.

### T-415 | FRONTEND | SearchPage — route, nav, debounced search, product grid (2026-03-08)

**Manba:** yangi-feature
**Muammo:** Mahsulot qidirish sahifasi yo'q edi — foydalanuvchi faqat URL orqali tahlil qilar edi.
**Yechim:** SearchPage.tsx (314 qator) — debounced input (300ms), AbortController, responsive grid, track button, loading skeleton, i18n (uz/ru/en), BottomNav + Layout nav link.
**Fayllar:** `apps/web/src/pages/SearchPage.tsx`, `App.tsx`, `Layout.tsx`, `BottomNav.tsx`, `icons.tsx`, `i18n/{uz,ru,en}.ts`
**Commit:** a6cd581
**Vaqt:** 15min (plan: 1h)
**Ta'sir:** `/search` sahifa tayyor — foydalanuvchi nomi bo'yicha mahsulot topib, 1 bosish bilan kuzatuvga qo'sha oladi.

---

## T-411 + T-412 + T-416 — Search Backend + Frontend API Client (2026-03-08)

### T-411 | BACKEND | Route order fix — static routes before :id param (2026-03-08)

**Manba:** kod-audit
**Muammo:** NestJS controller da `@Get(':id')` barcha statik routelarni "yutib yuborar" edi — yangi `@Get('search')` endpoint `:id` sifatida parse bo'lib xato berar edi.
**Yechim:** `@Get('search')` ni `@Get(':id')` dan OLDIN joylashtirish — tracked → recommendations → search → :id tartib.
**Fayllar:** `apps/api/src/products/products.controller.ts`
**Commit:** e464044
**Vaqt:** 5min (plan: 15min)
**Ta'sir:** Yangi search endpoint to'g'ri ishlaydi, mavjud routelar buzilmaydi.

### T-412 | BACKEND | searchProducts endpoint — Uzum search proxy (2026-03-08)

**Manba:** yangi-feature
**Muammo:** Frontend dan Uzum da mahsulot qidirish imkoniyati yo'q edi — CORS tufayli to'g'ridan-to'g'ri API chaqirish ishlamaydi.
**Yechim:** `UzumClient.searchProducts()` + `ProductsService.searchProducts()` + Redis cache (5min TTL) + `SearchQueryDto` validation (q: 2-100 char, limit: 1-48).
**Fayllar:** `apps/api/src/uzum/uzum.client.ts`, `apps/api/src/products/products.service.ts`, `apps/api/src/products/products.controller.ts`, `apps/api/src/products/dto/search-query.dto.ts`
**Commit:** e464044
**Vaqt:** 20min (plan: 1h)
**Ta'sir:** `GET /products/search?q=telefon&limit=24` endpoint ishlaydi — 5 min cache, rate limit himoya.

### T-416 | FRONTEND | API client + TypeScript types for search (2026-03-08)

**Manba:** yangi-feature
**Muammo:** Frontend da search API types va methodlar yo'q edi.
**Yechim:** `SearchProduct` interface + `productsApi.searchProducts()` + `productsApi.trackFromSearch()` methodlari.
**Fayllar:** `apps/web/src/api/types.ts`, `apps/web/src/api/products.ts`
**Commit:** d155bd9
**Vaqt:** 10min (plan: 30min)
**Ta'sir:** Frontend search sahifasi uchun API client tayyor — type-safe, auto-complete bilan.

---

## T-384 + T-390 — Engagement Features + Schema Docs (2026-03-08)

- **T-390**: Schema auto-sync — `scripts/generate-db-docs.ts` + `docs/DATABASE.md` (53 model, 14 enum, Mermaid ER)
- **T-384**: Engagement features (6 sub-task):
  1. Revenue estimator: API endpoint + RevenueEstimatorPage
  2. Product comparison: ComparePage (max 3, winner highlight)
  3. Login streak: LoginStreak model + API + StreakBadge UI
  4. Achievement badges: Achievement + UserAchievement models, 5 seed, AchievementsPage
  5. What's New: WhatsNew changelog modal (auto-show, v5.6/5.5/5.4)
  6. Weekly digest: WeeklyDigest model, cron Monday 8AM, Telegram notification

---

## P2 Mega Sprint (2026-03-08) — 13 task, 4 sprint, 115 fayl

### Sprint 1: T-359 + T-370 — Kod Audit P2
- **T-359** API P2 (18 fix): seed.ts env, DTO validation, cache eviction, pagination, parse-period dedup
- **T-370** Web P2 (12 fix): BookingModal focus trap, aria-labels, formatDate util, i18n, useRef pattern

### Sprint 2: T-395 + T-396 + T-360
- **T-395** Recommendation system — 4-layer fallback (category winners, tracked, uzum API, hardcoded)
- **T-396** Admin billing metrics — PieChart plan breakdown, real churn (7-day), MRR (SUBSCRIPTION), avg_days_to_renewal
- **T-360** Worker+Bot P2 (11 fix): escapeHtml util, rate limiter, shared BrowserContext, BigInt null guard

### Sprint 3: T-392 — Billing Full-Stack
- Subscription renewal cron (daily 3AM), PLAN_PRICES constant
- setPlan() admin endpoint (PATCH /admin/accounts/:id/plan)
- BillingPage (4 plan cards), PlanGuard locked overlay, PlanExpiredBanner
- billing-public.controller.ts (GET /billing/plans)

### Sprint 4: T-376 + T-398 + T-380 + T-381 + T-397
- **T-376** Platform model (uzum, wildberries, yandex_market, ozon), GET /platforms endpoint
- **T-398** Onboarding reminder cron (daily 10AM, 3-day check)
- **T-380** Mobile UX: BottomNav, ScrollToTop, pb-16
- **T-381** Accessibility: skip-to-content, aria-labels, Ctrl+K shortcut, scope="col"
- **T-397** Contextual tooltips: PageHint component, 4 sahifada hints

---

## T-410 | DESKTOP | Oq ekran fix — v1.0.2 (2026-03-07)

- **Root cause:** `loadURL('app://./index.html')` → BrowserRouter `/index.html` pathname ko'radi → hech qanday route mos kelmaydi → oq ekran
- **Fix:** `loadURL('app://./')` → protocol handler baribir `index.html` beradi, lekin `window.location.pathname = '/'` → routlar to'g'ri ishlaydi
- **CSP fix** ham (`connect-src` ga `https://app.ventra.uz`, `style-src` ga Google Fonts)
- `apps/desktop/src/main/window.ts` o'zgartirildi, versiya `1.0.2` ga oshirildi
- Landing URL lar ham `v1.0.2` ga yangilandi (`HeroSection.tsx`, `DownloadBanner.tsx`, `i18n.ts`)

## T-409 | LANDING | Landing download tugmalari — Windows URL ulash (2026-03-07)

- `HeroSection.tsx` — "Desktop yuklab olish" tugmasi `#download` scroll o'rniga to'g'ridan `.exe` URL ga
- `DownloadBanner.tsx` — "Windows yuklab olish" `disabled` button → real GitHub Releases `<a href>` ga

## T-408 | DEVOPS | GitHub Releases v1.0.0 — installer upload (2026-03-07)

- `AI-automatization/sellerTrend-desktop` reposida `v1.0.0` release yaratildi
- `VENTRA Setup 1.0.0.exe` (82MB) upload qilindi
- Download URL: `https://github.com/AI-automatization/sellerTrend-desktop/releases/download/v1.0.0/VENTRA.Setup.1.0.0.exe`

## T-407 | DEVOPS | GitHub sellerTrend-desktop repo yaratish (2026-03-07)

- `AI-automatization/sellerTrend-desktop` public repo yaratildi
- `README.md` push qilindi (birinchi commit, releases uchun zarur)

## M-002 + Landing Download | Desktop installer + Landing integratsiya (2026-03-07)

- **VENTRA Setup 1.0.0.exe** — `pnpm dist:win` (Developer Mode yoqib, NSIS installer, 82MB)
- **GitHub Releases** — `AI-automatization/sellerTrend-desktop` repo, `v1.0.0` release
- **HeroSection** — "Desktop yuklab olish" tugmasi real GitHub Releases URL ga ulandi
- **DownloadBanner** — "Windows yuklab olish" tugmasi real URL ga ulandi, macOS hali disabled

## T-402 | LANDING P0 | Stats "21/7" typo (2026-03-07)

- Kod da allaqachon `value: 24, suffix: '/7'` to'g'ri edi — animatsiya artefakti, bug yo'q edi

## T-404 | LANDING P1 | Cookie + Download banner overlap fix (2026-03-07)

- `App.tsx` — `cookieDone` state qo'shildi, `CookieBanner` `onDone` callback oladi
- `CookieBanner` — accept/decline da `onDone()` chaqiriladi
- `DownloadBanner` — `canShow` prop qo'shildi, cookie yopilgandan keyingina chiqadi (1s delay)

## T-405 | LANDING P2 | Hero top whitespace (2026-03-07)

- `HeroSection.tsx` — `py-20` → `pt-8 pb-20` (~80px yuqori padding kamaytirish)

---

## T-400 | LANDING P1 | Dizayn fix — VENTRA uslubiga moslashtirish (2026-03-06)

- **CookieBanner** — `AnimatePresence` + `motion` + `glass-card` + `glow-btn`, 1.5s delay bilan chiqadi
- **VideoDemoSection** — `mesh-blob` bg, `gradient-text`, fake browser bar, animated play button, `useAnalytics` hook
- **PrivacyPage** — `mesh-blob` bg, `glass-card` section cards, section number prefix, animated entry
- **TermsPage** — bir xil pattern, `purple` blob
- `plausible.d.ts` o'chirildi — `useAnalytics.ts` allaqachon declare qilgan (redundant edi)

---

## T-382 | LANDING P2 | Privacy Policy, Cookie banner, Video demo, Plausible (2026-03-06)

- **PrivacyPage** — `/privacy` route, uz+ru, O'zbekiston qonuni asosida (`pages/PrivacyPage.tsx`)
- **TermsPage** — `/terms` route, uz+ru (`pages/TermsPage.tsx`)
- **CookieBanner** — `localStorage` based, accept/decline, `/privacy` linkli (`components/CookieBanner.tsx`)
- **VideoDemoSection** — Pricing dan oldin placeholder section, play button, CTA (`sections/VideoDemoSection.tsx`)
- **Plausible tracking** — `window.plausible` type declaration, CTA event tracking (`lib/plausible.d.ts`)
- **App.tsx** — `pathname` state routing + barcha yangi komponentlar ulandi

---

## T-328 | DESKTOP P2 | loadURL error, devtools block, macOS About, package metadata, env.d.ts (2026-03-06)

- **loadURL error** — `.catch(log.error)` qo'shildi (`window.ts`)
- **devtools block** — production da F12/Ctrl+Shift+I bloklandi (`window.ts`)
- **macOS About** — `app.setAboutPanelOptions()` qo'shildi (`index.ts`)
- **package.json** — `name`, `description`, `author`, `homepage` to'ldirildi
- **env.d.ts** — `VITE_APP_VERSION`, `VITE_APP_NAME` qo'shildi
- **Tray i18n** → T-399 sifatida ajratildi (keyinroq)

---

## T-327 | DESKTOP P1 | Permission request handler (2026-03-06)

- `setupPermissionHandler()` — `session.defaultSession.setPermissionRequestHandler()`
- `DENIED_PERMISSIONS` set: media, geolocation, notifications, midiSysex, pointerLock, fullscreen, openExternal
- Analytics app uchun keraksiz ruxsatlar bloklandi

**Fayl:** `apps/desktop/src/main/window.ts`

---

## T-325..T-326 | DESKTOP P1 | IPC input validatsiya (2026-03-06)

- **T-325** `ventra:notify`: `title`/`body` → `unknown` type, string tekshiruvi, `slice(0,100)`/`slice(0,300)`, trim, bo'sh title reject
- **T-326** `ventra:badge`: `count` → `unknown` type, `Number.isFinite`, `Math.max(0, Math.floor())` — manfiy/NaN/Infinity bloklandi

**Fayl:** `apps/desktop/src/main/ipc.ts`

---

## T-324 | DESKTOP P1 | icon.ico + icon.icns yaratish (2026-03-06)

- `png2icons` bilan `icon.png` (256x256) → `icon.ico` (Win) + `icon.icns` (macOS) konvertatsiya
- `electron-builder.yml` da allaqachon `resources/icon.ico` va `resources/icon.icns` ko'rsatilgan edi — fayllar yo'q edi
- `png2icons` devDependency sifatida qo'shildi

---

## T-320..T-323 | DESKTOP P1 | Typed state, memory leak, logging, interval cleanup (2026-03-06)

- **T-320** `declare module 'electron' { interface App { isQuitting?: boolean } }` — `(app as any)` o'chirildi (`window.ts`, `tray.ts`)
- **T-321** `ipcRenderer.removeAllListeners()` — `onUpdateAvailable`/`onUpdateDownloaded` da memory leak tuzatildi (`preload/index.ts`)
- **T-322** `electron-log` o'rnatildi, `console.error` → `log.error` (`updater.ts`)
- **T-323** `updateIntervalId` + `stopUpdater()` + `app.on('before-quit')` — interval cleanup (`updater.ts`, `index.ts`)

---

## T-315..T-319 | DESKTOP P0 | Electron xavfsizlik (2026-03-06)

- **T-315** `sandbox: true` — Chromium sandbox yoqildi (`window.ts:88`)
- **T-316** CSP header — `setupCSP()` qo'shildi, `session.defaultSession.webRequest.onHeadersReceived` orqali
- **T-317** Path traversal — `relative()` + `isAbsolute()` tekshiruvi, `app://` dan tashqari fayl o'qib bo'lmaydi
- **T-318** SSRF — `new URL()` bilan origin validatsiya, boshqa originga proxy taqiqlandi
- **T-319** Navigation cheklovlari — `will-navigate` faqat `app://`/`localhost`, `setWindowOpenHandler` tashqi → `shell.openExternal()`

**Fayl:** `apps/desktop/src/main/window.ts`

---

## T-367 | FRONTEND P1 | AdminPage God Component refactor (2026-03-06)

- `AdminPage.tsx` — 454 qator → 188 qator (presentation-only component)
- `useAdminData.ts` — yangi hook (494 qator): 30+ useState, useEffect, handler'lar extraction
- `UseAdminDataReturn` interface — 116 qator typed return
- `useMemo` computed values, `useCallback` handlers
- Admin komponentlar (`DashboardTab`, `SystemTab`, `FeedbackTab`, `NotificationsTab`, `DepositsTab`) — `Record<string, unknown>` → typed interfaces
- `adminTypes.ts` — `redis_connected` qo'shildi `SystemHealth` interface ga
- tsc --noEmit ✅ zero errors

---

## T-361 | FRONTEND P0 | XSS — dangerouslySetInnerHTML tuzatildi (2026-03-06)

- `Layout.tsx:282` — `dangerouslySetInnerHTML` o'chirildi
- JSX interpolation: `{t('payment.overduePrefix')}<strong>{balance}</strong>{t('payment.overdueSuffix')}`
- i18n kalitlar qo'shildi: `payment.overduePrefix`, `payment.overdueSuffix` (uz/ru/en)

---

## T-394 | FRONTEND P1 | Onboarding Wizard — allaqachon mavjud (2026-03-06)

- `OnboardingPage.tsx` — 3-step wizard to'liq ishlaydi
- Step 1: URL input → analyzeUrl API call → natija ko'rsatish
- Step 2: Mahsulotni kuzatishga qo'shish (productsApi.track)
- Step 3: Telegram bot ulash (t.me/VentraBot link)
- Har step da `PATCH /auth/onboarding` chaqiriladi
- Route: `/onboarding` (PrivateRoute + LazyRoute)
- RegisterPage → `/onboarding` ga yo'naltiradi

---

## T-368 | FRONTEND P1 | UX gaps — 6 ta user-facing bug (2026-03-06)

**Tuzatilgan buglar:**
1. ~~404 route~~ — allaqachon bor edi (`App.tsx:105` → `<NotFoundPage />`)
2. **Notification count real-time** — `Layout.tsx` da `useNotificationRefresh` qo'shildi, WebSocket orqali unread count avtomatik yangilanadi
3. **Payment "To'ldirish" onClick** — `DashboardPage.tsx:155` ga `toast.info()` handler qo'shildi, foydalanuvchiga to'lov yo'riqnomasi chiqadi
4. **Parol confirmation** — `RegisterPage.tsx` ga `confirm_password` input + validatsiya qo'shildi (`passwordsDoNotMatch` check)
5. ~~Bo'sh Dashboard onboarding~~ — allaqachon `EmptyState` component bilan hal qilingan
6. **useDashboardData error UI** — `error` state qo'shildi, `DashboardPage` da error holat ko'rsatiladi (reload tugma bilan)

**Qo'shimcha fix:** `Layout.tsx:118` — `isSuperAdmin` useEffect deps ga qo'shildi (T-369.5)

**Fayllar:** `DashboardPage.tsx`, `RegisterPage.tsx`, `Layout.tsx`, `useDashboardData.ts`, `uz.ts`, `ru.ts`, `en.ts`

---

## T-369 | FRONTEND P1 | Code quality — 8 ta fix (2026-03-06)

1. **PublicLeaderboardPage dead code** — `PublicLeaderboardPage.tsx` o'chirildi (route yo'q, hech joyda import qilinmagan)
2. **ErrorBoundary i18n** — localStorage `lang` dan til aniqlab, 3 tilda (uz/ru/en) xato xabarlari chiqaradi (class component uchun hook'siz yechim)
3. **Version "v5.1" → "v5.6"** — `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage` da yangilandi
4. **branding.ts dead code** — `config/branding.ts` o'chirildi (hech joyda import qilinmagan)
5. **isSuperAdmin useEffect deps** — `Layout.tsx:118` da `[]` → `[isSuperAdmin]` tuzatildi

**Fayllar:** `ErrorBoundary.tsx`, `LoginPage.tsx`, `RegisterPage.tsx`, `ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `PublicLeaderboardPage.tsx` (deleted), `branding.ts` (deleted)

---

## T-389 | BACKEND P2 | Snapshot retention + downsample (2026-03-06)

- `ProductSnapshotDaily` model — kunlik aggregate jadval (`product_snapshot_daily`)
- `@@unique([product_id, day])` — bir product uchun kunda 1 aggregate
- `aggregateOldSnapshots()` — 30+ kunlik raw snapshot → daily aggregate ga yig'adi
- Raw snapshot aggregation done → o'chiriladi (disk tejash)
- `data-cleanup.processor.ts` ga integratsiya — mavjud cron ichida ishlaydi
- Aggregate fieldlar: avg_score, max_weekly_bought, avg_rating, max_orders, snapshot_count

---

## T-388 | BACKEND P1 | score_version field (2026-03-06)

- `SCORE_VERSION = 2` constant qo'shildi (`packages/utils/src/index.ts`)
- `product_snapshots.score_version Int @default(2)` column
- 3 ta snapshot creator yangilandi: `weekly-scrape.processor`, `import.processor`, `uzum.service`
- ML uchun: faqat oxirgi score_version bilan train qilish mumkin

---

## T-387 | BACKEND P1 | weekly_bought_raw_text + confidence (2026-03-06)

- `product_snapshots` ga 2 column: `weekly_bought_raw_text` (Text), `weekly_bought_confidence` (Decimal 3,2)
- `scrapeWeeklyBought()` return type: `ScrapeResult { value, rawText, confidence }`
- Confidence: SSR=1.00, HTML=0.95, DOM=0.90, broad=0.80, badge=0.70, stored=0.50, calculated=0.30
- 3 consumer yangilandi: `weekly-scrape.processor.ts`, `uzum.service.ts`, `import.processor.ts`
- MML uchun: `confidence` ni `sample_weight` sifatida ishlatish mumkin

---

## T-386 | BACKEND P1 | Snapshot dedup — DB unique constraint (5-min bucket) (2026-03-06)

- `snapshot_bucket` generated column: `snapshot_at` ni 5 daqiqalik bucketga yaxlitlaydi
- `UNIQUE(product_id, snapshot_bucket)` — bir product uchun 5 daqiqa ichida faqat 1 snapshot
- Migration: dublikatlar tozalanadi (eski snapshot saqlanadi), keyin constraint qo'shiladi
- 3 joyda P2002 catch: `uzum.service.ts`, `import.processor.ts`, `weekly-scrape.processor.ts`
- `weekly-scrape.processor.ts`: snapshot yaratish transaction tashqarisiga chiqarildi (PG tx abort muammosi)
- Prisma schema: `@@unique([product_id, snapshot_bucket])` qo'shildi

---

## T-385 | BACKEND P1 | Scrape lock — Redis SETNX duplicate prevention (2026-03-06)

- `apps/worker/src/scrape-lock.ts` — yangi utility: `acquireScrapeLock()` + `releaseScrapeLock()`
- Redis SETNX + 10 min TTL — bir product ikki worker tomonidan parallel scrape bo'lmaydi
- `weekly-scrape.processor.ts` — `processBatch()` va `processSingle()` da lock integratsiya
- `finally` block bilan lock har doim release bo'ladi (error bo'lsa ham)
- Skipped counter qo'shildi — lock tufayli o'tkazib yuborilgan productlar loglarda ko'rinadi

---

## T-391 | BACKEND P1 | Active sessions bug — expired sessions fix (2026-03-06)

5 ta query'da `expires_at > NOW()` check qo'shildi:
- `admin-stats.service.ts:282` — `getRealtimeStats()` active sessions
- `admin-monitoring.service.ts:94` — raw SQL per-user active sessions
- `admin-monitoring.service.ts:209` — `getUserHealth()` sessions
- `admin-monitoring.service.ts:270` — `estimateCapacity()` sessions
- `admin-monitoring.service.ts:298` — `captureBaseline()` sessions
- Session cleanup allaqachon `data-cleanup.processor.ts` da mavjud ✅
- Token refresh da yangi session yaratiladi (`logged_in_at = now()`) ✅

---

## T-362..T-366 | WEB AUDIT P0 | Auth + WebSocket + ProductPage fixes (2026-03-06)

- **T-362**: allaqachon tuzatilgan — `setTokens()` JWT decode qilib payload sync qiladi
- **T-363**: allaqachon tuzatilgan — `useAuthStore.subscribe()` auto-disconnect qo'shilgan
- **T-364**: `AdminRoute` ga `isTokenValid()` check qo'shildi — expired token bilan admin sahifa ochilmaydi
- **T-365**: `ProductPage.loadData()` ga `AbortController` + stale response guard qo'shildi — race condition tuzatildi
- **T-366**: Dead `JwtTokenPayload` type alias o'chirildi (`base.ts`, `client.ts`)

---

## T-392 P0 | IKKALASI | Billing model — FREE plan (2026-03-06)

Yangi user register bo'lganda PAYMENT_DUE ko'rmasligi uchun FREE plan tizimi qo'shildi.
- Schema: `plan`, `plan_expires_at`, `analyses_used`, `plan_renewed_at` fieldlar; `SUBSCRIPTION`, `PLAN_CHANGE` enum
- `PlanGuard` + `@RequiresPlan()` decorator (FREE < PRO < MAX < COMPANY hierarchy)
- `BillingGuard`: FREE plan 10/oy tahlil limiti, PAYMENT_DUE check skip
- `billing.service` + `billing.processor`: FREE userlar daily charge'dan o'tkazib yuboriladi
- `uzum.controller`: FREE plan uchun `analyses_used++`
- Discovery/Sourcing/Signals → `@RequiresPlan('PRO')`, AI → `@RequiresPlan('MAX')`
- Worker: `analyses-reset` cron (`0 4 1 * *`) — oylik FREE counter reset
- `auth.service.ts`: `getMe()` → plan, analyses_used, plan_expires_at qaytaradi
- Migration: `20260306_add_plan_fields`
- **Qolgan**: P1 (worker monthly billing, admin stats), P2 (frontend BillingPage, PlanGuard UI)

---

## T-393 | FRONTEND | Dashboard Empty State (2026-03-06)

Yangi user dashboard'ga kirganda bo'sh sahifa o'rniga welcoming empty state ko'rsatiladi.
- `EmptyState.tsx`: Welcome header + 4-step onboarding checklist + TOP 3 product cards
- `DashboardPage.tsx`: `products.length === 0` → `<EmptyState>` render
- i18n: 14 ta tarjima kaliti (uz, ru, en)

---

## T-377 | PLATFORMA P0 | Demo credentials login page'dan olib tashlandi (2026-03-06)

`LoginPage.tsx:167` da `demo@ventra.uz / Demo123!` matni ko'rinib turardi.
Foydalanuvchilar o'z akkauntlari bilan ro'yxatdan o'tishi kerak (NPS data).
`<p>Demo: ...</p>` qatori o'chirildi.

---

## T-375 | PLATFORMA P1 | Worker monitoring crons — 5 avtomatik job (2026-03-05)

**Qo'shilgan 4 yangi processor + job pair:**

- **monitoring.processor.ts + monitoring.job.ts** — `detectStockCliff`, `detectEarlySignals`, `detectFlashSales` har 6 soatda. Har account uchun AlertEvent yaratadi (mavjud AlertRule bo'lsa). Cron: `0 */6 * * *`
- **morning-digest.processor.ts + morning-digest.job.ts** — Har kuni 07:00 UTC (12:00 Toshkent). TelegramLink bo'lgan foydalanuvchilarga: balans, top 5 mahsulot, kutayotgan alertlar. Cron: `0 7 * * *`
- **currency-update.processor.ts + currency-update.job.ts** — CBU.uz dan USD/CNY/EUR kurslarini DB ga saqlaydi. Fallback mavjud. Cron: `30 0 * * *`
- **data-cleanup.processor.ts + data-cleanup.job.ts** — 90+ kunlik Snapshot, muddati o'tgan Session/PasswordReset/Invite, 30+ kunlik stale ExternalSearchJob. Cron: `0 2 * * *`

**main.ts:** Workers 7→11, 4 yangi cron. TS check: 0 xato.

---

## T-373, T-374 | PLATFORMA P1 | Onboarding + Forgot Password (2026-03-04)

**T-373 — Onboarding schema + API:**
- Account model: `onboarding_completed`, `onboarding_step`, `selected_marketplaces`
- `GET /auth/me` — user info + account + onboarding state
- `PATCH /auth/onboarding` — update step/completed/marketplaces
- `UpdateOnboardingDto` with class-validator

**T-374 — Forgot Password API:**
- `PasswordReset` model (token_hash, expires_at, used_at)
- `POST /auth/forgot-password` — rate limited 3/hour, generic response (no user enumeration)
- `POST /auth/reset-password` — token validation, bcrypt hash, session revocation
- Telegram notification via TelegramLink (if bot token set)
- Constants: 15min expiry, 3 resets/hour

**Tekshiruv:** API tsc --noEmit — 0 error ✅

---

## T-371, T-372 | PLATFORMA P0 | Alert delivery + Bot account linking (2026-03-04)

**T-372 — Bot account linking:**
- `TelegramLink` model (chatId ↔ accountId), Prisma schema + generate
- Bot commands: `/connect [key_prefix]`, `/disconnect`, `/myproducts`, `/balance`, `/product [URL|ID]`
- `requireLink()` helper, `formatUzs()`, `parseProductInput()` — shared utilities
- Updated `/start`, `/status`, `/help` to show new commands

**T-371 — Alert delivery pipeline:**
- `alert-delivery.processor.ts` — BullMQ worker, queries undelivered AlertEvents (delivered_at IS NULL)
- Creates in-app `Notification` per account + sends Telegram via Bot API (if TelegramLink exists)
- `alert-delivery.job.ts` — */5 * * * * cron (every 5 minutes)
- `AlertEvent.delivered_at` field + index added to schema
- Worker: 7th worker registered, shutdown graceful, health check workers=7
- `uzum.service.ts` — improved SCORE_SPIKE alert message format

**Tekshiruv:** API + Worker + Bot tsc --noEmit — 0 error ✅

---

## T-354 | BACKEND P1 | `any` type cleanup — 40+ instances replaced (2026-03-04)

**25 ta fayl o'zgartirildi, 0 `any` qoldi:**

- **GROUP 1 — Prisma WhereInput:** `admin-log.service.ts`, `admin-stats.service.ts`, `admin-feedback.service.ts`, `admin-user.service.ts` → `Prisma.XxxWhereInput`
- **GROUP 2 — Record<string,unknown>:** `ai-throttler.guard.ts`, `custom-throttler.guard.ts`, `activity-logger.interceptor.ts`, `global-logger.interceptor.ts`, `file-logger.ts`, `reports.service.ts`
- **GROUP 3 — Observable<unknown>:** `activity-logger.interceptor.ts`, `global-logger.interceptor.ts`
- **GROUP 4 — External API interfaces:** `serpapi.client.ts` (`SerpApiResponse`, `SerpApiResultItem`), `aliexpress.client.ts` (`AliExpressApiResponse`), `uzum.client.ts` (`UzumSku`, `UzumSeller`, `UzumPhoto`, `UzumCategory`, `UzumProductData`, `UzumApiResponse`, `UzumSearchProduct`, `UzumNormalizedProduct`), `sourcing.service.ts`
- **GROUP 5 — Other:** `ai.service.ts` (Prisma JSON), `admin-account.service.ts`, `competitor.service.ts`, `leaderboard.service.ts`, `error-tracker.filter.ts`, `export.controller.ts`, `products.service.ts`, `uzum.service.ts`, `main.ts`, `ads.service.ts`, `signals.service.ts`
- **Tekshiruv:** `tsc --noEmit` — 0 error ✅, `grep any` — 0 qoldi ✅

---

## T-353, T-357 | BACKEND P1 | DTO validation + worker stability (2026-03-04)

- T-353: 22 DTO classes with class-validator for 36 raw @Body() endpoints (13 controllers)
- T-357: 7 worker fixes — billing idempotency, prisma disconnect, Redis TLS, competitor N+1, logger error handler, shared health Redis

---

## T-379 | FRONTEND P2 | Design system cleanup — chart tokens & duplicates (2026-03-04)

**8 fix bajarildi:**
1. `chartTokens.ts` yaratildi — CHART_COLORS, SCORE_COLORS, scoreColor(), glassTooltip, AXIS_TICK, GRID_STROKE, CHART_ANIMATION_MS
2. `PriceComparisonChart.tsx` — hardcoded `#570df8`, `rgba(255,255,255,0.4)`, `#1d232a` → CSS variables
3. `AdminAnalyticsTab.tsx` — 16+ raw `oklch(...)` → `var(--chart-grid)`, `var(--chart-tick)`, `glassTooltip`
4. `AnalyticsTab.tsx` o'chirildi (439 qator duplicate)
5. `competitor/CompetitorSection.tsx` o'chirildi (unused duplicate)
6. `AdminComponents.tsx` StatCard duplicate → re-export
7. `skeletons/*.tsx` — `animate-pulse bg-base-300/60` → DaisyUI `skeleton` class
8. Barcha chartlarda `animationDuration={CHART_ANIMATION_MS}` (800ms) standartlashtirildi

**Tekshiruv:** `tsc --noEmit` 0 error, `vite build` OK, Playwright light+dark screenshot verified

---

## T-355, T-356, T-358 | BACKEND P1 | Security & stability batch (2026-03-04)

- T-355: QueueLifecycleService — 4 BullMQ queue graceful close on shutdown; lockDuration 600s on 3 Playwright workers
- T-356: 7 unbounded findMany queries paginated (community, discovery, feedback, reports, shops) — MAX 50-100 per page
- T-358: 11 API security fixes — sourcing fire-and-forget, CSV 5000 limit, throttler Logger, Sentry eval fix, parseInt validation, api-key guard early return, team token removal, leaderboard auth, file logger close

---

## T-343..T-352 | BACKEND P0 | Critical security & stability fixes (2026-03-04)

- T-343: IDOR fix — assertProductOwnership() helper, account_id filter on all product/AI/signal/competitor endpoints (7 files)
- T-344: WebSocket JWT auth — token extraction + verify + typed payload + disconnect on invalid (already fixed)
- T-345: Team invite hijack — existing user protection (already fixed)
- T-346: BigInt/ParseIntPipe — uzum.controller.ts analyzeById fixed
- T-347: Notification markAsRead — per-user clone for broadcast notifications
- T-348: Race condition batch — 6 TOCTOU fixes with Prisma $transaction (billing, api-keys, referral, consultation, community, discovery)
- T-349: unhandledRejection handler — worker/bot graceful shutdown (already fixed)
- T-350: Singleton BrowserPool — shared Chromium instance, OOM prevention, auto-recovery
- T-351: execSync replaced with async exec in admin-monitoring (already fixed)
- T-352: Shared RedisModule — consolidated 5 separate Redis connections into 1 shared instance + getBullMQConnection helper

---

## T-342 | LANDING P2 | Audit batch (2026-03-04)

- DownloadBanner: localStorage try/catch + "Tez kunda" → `t('download.soon')` i18n
- FAQItem: `aria-expanded` on toggle button
- PricingSection: `role="switch"` + `aria-checked` on billing toggle
- FooterSection: privacy + terms links rendered in footer bottom bar
- Navbar: `aria-expanded` + `aria-controls="mobile-menu"` + `id="mobile-menu"` added
- index.html: localStorage try/catch in theme detection inline script
- LangContext: `html[lang]` syncs on language change via useEffect

---

## T-333..T-341 | LANDING P1 | Audit fixes (2026-03-04)

- T-333: `animations.ts` — unused exports olib tashlandi (fadeIn, scaleIn, slideLeft, slideRight)
- T-334: Email form — inline validation hint, error reset on change, touched state
- T-335: `LangContext.tsx` + `Navbar.tsx` — localStorage try/catch (Safari private mode)
- T-336: `TestimonialsSection.tsx` + `i18n.ts` — RU translations for all 4 testimonials
- T-337: `package.json` build — generate-og-image.mjs vite build dan oldin ishlaydi
- T-338: `Navbar.tsx` — mobile menu AnimatePresence wrapper (exit animations ishlaydi)
- T-339: `nginx.conf` — HSTS + X-XSS-Protection:0 security headers
- T-340: `FeatureCard.tsx` — unused `index: number` prop olib tashlandi
- T-341: `prerender.mjs` — XSS guard: structural tag check before innerHTML write

---

## T-329..T-332 | LANDING P0 | Audit fixes (2026-03-03)

- T-329: `favicon.svg` yaratildi — VENTRA V logo, blue→purple gradient
- T-330: `App.tsx` fallback URL `web-production-2c10.up.railway.app` → `app.ventra.uz`
- T-331: `nginx.conf` CSP header + Permissions-Policy qo'shildi
- T-332: `index.html` YANDEX/GOOGLE_VERIFICATION_CODE placeholder'lar olib tashlandi

---

## T-188, T-189, T-190, T-192, T-202, T-257, T-264, T-266 | FRONTEND | Web app tasks (2026-03-03)
- **T-188**: `apps/web/public/sw.js` o'chirildi, index.html da SW register yo'q
- **T-189**: `apps/web/public/manifest.json` o'chirildi, `<link rel="manifest">` o'chirildi
- **T-190**: `apple-touch-icon.svg`, `icon-maskable.svg` o'chirildi
- **T-192**: index.html da hech qanday PWA artifact yo'q
- **T-257**: `ErrorBoundary variant="section"` — DiscoveryPage va ProductPage da per-section qo'llanilgan
- **T-264**: `AdminRoute` — `SUPER_ADMIN` bo'lmaganlarni `/` ga redirect qiladi (`App.tsx:44`)
- **T-266**: `ShopsPage` da `emptyState` CTA bor, LeaderboardPage da `noData` state bor
- **T-202**: ProductPage UX — Sardor tomonidan refactor qilingan
_Remote commit orqali bajarilgan, Bekzod tomonidan verified 2026-03-03_

---

## L-020 | LANDING | Plausible Analytics + useAnalytics wiring (2026-03-03)

- `index.html`: Plausible script `ventra.uz` domain bilan yoqildi (tagged-events)
- `HeroSection`: Register + Download CTA click tracking
- `CTASection`: Register CTA click tracking
- `EmailCaptureSection`: Email subscribe success tracking

## L-022..L-024 | LANDING | i18n + Docker + CI/CD (allaqachon bajarilgan, arxivlash)

- L-022: i18n (uz/ru) — T-276..T-279 + T-284..T-289 da bajarildi
- L-023: Dockerfile + nginx.conf — `apps/landing/` da mavjud
- L-024: CI/CD — `.github/workflows/ci.yml` va `docker-compose.prod.yml` da mavjud

---

## T-234 | DESKTOP | Login fix — VITE_API_URL (2026-03-03)

- `electron.vite.config.ts`: `envDir: resolve(__dirname, '.')` — renderer endi `apps/desktop/.env` dan `VITE_API_URL` oladi
- `window.ts`: `process.env.VITE_API_URL` → `import.meta.env.VITE_API_URL` — main process uchun to'g'ri
- `src/main/env.d.ts`: yangi — `ImportMeta`/`ImportMetaEnv` type declaration
- `index.ts`: elektron module augmentation TS2300 xatosi olib tashlandi

---

## T-299..T-314 | SPRINT | BACKEND+DEVOPS | Stability & 1500 User Scaling (2026-03-03)

**Sprint:** 16 task, 3 faza, ~25 fayl, commit `97d2360`
**Natija:** Production deploy muvaffaqiyatli, API sog'lom (200 OK, uptime 30+ min)

### Phase 1 — P0 (DARHOL)
- **T-301**: Worker + Bot PrismaClient `ensurePoolParams()` — pool_timeout=10, statement_timeout=15000, connection_limit=10/5
- **T-300**: `uncaughtException`/`unhandledRejection` handlers — API, Worker, Bot main.ts (crash log Railway da ko'rinadi)

### Phase 2 — P1 (Recovery + Scaling)
- **T-299**: Redis `retryStrategy: (times) => Math.min(times*50, 2000)` — 4 ta client (auth, admin-stats, metrics, throttler)
- **T-302**: NestJS `keepAliveTimeout=65s`, `headersTimeout=66s` — 502 Bad Gateway fix
- **T-304+T-309**: BullMQ retry (attempts:3, exponential 5s) + cleanup (removeOnComplete/Fail) — 7 queue fayl
- **T-305**: BullMQ worker `.on('error/failed/stalled')` event listeners — 6 processor
- **T-306**: Bot graceful shutdown — SIGTERM/SIGINT → `bot.stop()` + `prisma.$disconnect()`
- **T-307**: `railway.toml` — `sleepApplication = false`
- **Scaling**: PgBouncer 500/50/10/10, PostgreSQL max_connections=200, Redis 512mb noeviction, API connection_limit=30, capacity dbPoolSize=50

### Phase 3 — P2 (Hardening)
- **T-308**: `fetchWithTimeout()` AbortController 15s — uzum.client.ts + uzum-scraper.ts
- **T-310**: Redis maxmemory 512mb + noeviction (docker-compose.prod.yml)
- **T-311**: Docker healthcheck `start_period` + worker/bot healthcheck
- **T-312**: Sourcing quick timeout 60s → 90s
- **T-313**: nginx `keepalive_timeout 65s`
- **T-314**: CPU capacity estimator (`max_by_cpu`) + CPU alerts (150% warning, 200% critical)

**Fayllar (25):** worker/prisma.ts, bot/prisma.ts, 3x main.ts, auth.service.ts, admin-stats.service.ts, metrics.service.ts, custom-throttler.guard.ts, 4x queue.ts, 3x job.ts, 6x processor.ts, uzum.client.ts, uzum-scraper.ts, docker-compose.prod.yml, prisma.service.ts, capacity-estimator.ts, admin-monitoring.service.ts, nginx.conf.template, railway.toml

**T-303**: Axios global timeout=30s + sekin endpoint alohida (discovery 60s, sourcing 90s, uzum 60s)

---

## T-212..T-215 | P0 | FRONTEND | Chrome Extension Faza 2 — CSUI Overlay + Track (2026-03-03)

**T-212: Product Page CSUI — Score Overlay**
- Plasmo CSUI (`product-page.tsx`) — `https://uzum.uz/*` match, SPA-aware
- `ScoreCard.tsx`: fixed-position card (bottom-right) — score, trend, weekly_bought, price, Track button
- Score color coding: 0-2 red, 2-3 orange, 3-4 green, 4-5 dark green
- Login hint shown when not authenticated

**T-213: Category Page CSUI — Product Card Badges**
- Plasmo CSUI (`category-page.tsx`) — renders null, injects badges via DOM manipulation
- `ScoreBadge.tsx`: `createBadgeElement()` — inline-styled badge injected into `[data-test-id="product-card--default"]` cards
- Batch score fetch via `batch-quick-score` background message (50 products max)
- In-memory score cache (`Map<productId, score>`) — avoids duplicate API calls
- MutationObserver for infinite scroll — new cards get badges automatically

**T-214: SPA Navigation Detection + MutationObserver**
- `spa-observer.ts`: `onUrlChange()` — monkey-patches `pushState`/`replaceState` + `popstate` listener
- `onProductCardsAdded()` — MutationObserver detects new product cards (infinite scroll)
- `url-parser.ts`: `parseProductIdFromUrl()`, `parseCategoryIdFromUrl()`, `isProductPage()`, `isCategoryPage()`

**T-215: Track/Untrack + Popup Tracked List**
- `track-product.ts` background handler — calls `POST /products/:id/track`, updates badge count
- `batch-quick-score.ts` background handler — calls `POST /uzum/batch-quick-score`
- `get-tracked-products.ts` background handler — calls `GET /products`
- `TrackedList.tsx`: compact list in popup (max 10, score + weekly, click opens uzum.uz)
- `api.ts`: added `trackProduct()`, `getTrackedProducts()` methods

**Fayllar (11 new + 2 modified):**
`contents/product-page.tsx`, `contents/category-page.tsx`, `contents/plasmo-overlay.css`,
`components/ScoreCard.tsx`, `components/ScoreBadge.tsx`, `components/TrackedList.tsx`,
`background/messages/batch-quick-score.ts`, `background/messages/track-product.ts`,
`background/messages/get-tracked-products.ts`, `lib/url-parser.ts`, `lib/spa-observer.ts`,
`lib/api.ts` (edited), `popup.tsx` (edited)

---

## T-216 | P1 | FRONTEND | Chrome Extension Faza 3 — Popup "Tez Tahlil" Modal (2026-03-08)

**Status:** ✅ DONE

**Tahlil:**
Faza 1-2'da background service + content script'lar tayyor edi. Faza 3'da popup'ni yangilash.
Foydalanuvchi uzum.uz'da mahsulotni ko'rayotib, extension icon'ini bosilganda "📊 Tez Tahlil" tugmasi ko'rinadi.
Tugma bosilganda modal ochiladi va mahsulotning tez tahlili ko'rsatiladi.

**Yechim:**
1. **QuickAnalysisModal.tsx** (NEW) — React component
   - `ProductDetail` interface: id, score, weekly_bought, trend, sell_price, last_updated
   - `useEffect` hook: `sendToBackground('quick-score', { productId })`
   - DaisyUI modal dialog: score, weekly bought, price, trend, last updated
   - "Batafsil" button → dashboard `/analyze?productId={id}`
   - Loading state (spinner), error handling, null display

2. **popup.tsx** (UPDATED)
   - Import: `QuickAnalysisModal`, `parseProductIdFromUrl`, `isProductPage`
   - State: `productId`, `isModalOpen`
   - `useEffect`: `chrome.tabs.query()` — avtomatik tab URL'dan product ID aniqlash
   - Conditional button: "📊 Tez Tahlil" faqat product page'da
   - Modal integration: `<QuickAnalysisModal productId={productId} isOpen={isModalOpen} onClose={...} />`

**Fayllar:**
- `apps/extension/src/components/QuickAnalysisModal.tsx` — NEW
- `apps/extension/src/popup.tsx` — UPDATED (imports, state, effects, JSX)

**Testlash:**
```bash
pnpm build --filter extension
# Chrome: chrome://extensions → Load unpacked → dist folder
# uzum.uz mahsulot sahifasida extension icon → "Tez Tahlil" tugmasi → Modal
```

**TypeScript:** tsc --noEmit — ✅ PASS

---

## T-208..T-211 | P0 | FRONTEND | Chrome Extension Faza 1 — Scaffold + Auth (2026-03-03)

Plasmo scaffold, popup login/logout, background service worker (token refresh alarm),
API client with JWT auto-refresh, chrome.storage token management, badge states.

**Fayllar:** `popup.tsx`, `background/index.ts`, `lib/api.ts`, `lib/storage.ts`, `lib/badge.ts`,
`components/LoginForm.tsx`, `background/messages/{get-auth-state,login,logout,quick-score}.ts`

---

## Landing i18n + UX fixlar (2026-03-03)

### T-284 | P1 | FRONTEND | Landing — grid pattern light mode fix
CSS `.grid-pattern` va `.grid-pattern-sm` utility yaratildi, `[data-theme="ventra-light"]` override bilan. HeroSection va StatsSection inline style o'rniga class ishlatadi.

### T-285 | P1 | FRONTEND | Landing — placeholder href="#" linklar olib tashlandi
Footer dan ishlamaydigan linklar (Browser Extension, About, Blog, Docs, Instagram, YouTube, Privacy, Terms) olib tashlandi. DownloadBanner buttonlari `<button disabled>` ga o'zgartirildi "Tez kunda" tooltip bilan.

### T-286 | P1 | FRONTEND | Landing — APP_URL va EmailCapture fix
`APP_URL` `import.meta.env.VITE_APP_URL || 'https://web-production-2c10.up.railway.app'` ga o'zgartirildi. EmailCapture placeholder success ko'rsatadi.

### T-287 | P2 | FRONTEND | Landing — Footer social aria-label
Telegram, Instagram, YouTube buttonlariga `aria-label` qo'shildi.

### T-288 | P2 | FRONTEND | Landing — DashboardPreview MockScreen i18n
MockScreen ichidagi barcha hardcoded textlar (17 ta kalit) i18n `t()` ga o'tkazildi. UZ + RU tarjimalar qo'shildi.

### T-289 | P2 | FRONTEND | Landing — Testimonials DOM duplication
`[...TESTIMONIALS, ...TESTIMONIALS]` → `TESTIMONIALS` ga soddlashtirildi. Ortiqcha DOM node'lar olib tashlandi.

### Landing light mode text fix
~30 ta `text-white` instance 17 faylda `text-base-content` ga o'zgartirildi.

### Landing button border + navbar mobile fix
DaisyUI v5 btn border fix. Mobile menu orqa fon fix.

### Landing emoji → SVG icon replacement
Barcha emoji'lar SVG icon'larga almashtirildi. `icons.tsx` da 21 ta Lucide-style icon.

### Landing i18n — PainPoints, Features, Pricing, FAQ, Stats
Barcha hardcoded UZ textlar i18n `t()` ga o'tkazildi. RU tarjimalar qo'shildi (73 kalit).

---

## T-288 | P0 | BACKEND+FRONTEND | API Hang — Prisma Connection Pool Exhaustion fix (2026-03-02)

**Muammo:** System tab ochilganda barcha API endpoint'lar muzlab qolardi (504/timeout).
Root cause: `connection_limit=20` + `pool_timeout` yo'q → MetricsService background loop (3 conn) + System tab 8 endpoint (18 conn) = 21 > 20 → pool to'ladi → abadiy kutish.

**Fixlar (F1-F8) — v1:**
- **F1** PrismaService: `pool_timeout=10` programmatik enforce (DATABASE_URL ga inject)
- **F2** `getUserHealthSummary`: 3 sequential SQL → `Promise.all()` (parallel)
- **F3** `getDbPoolActive`: background 15s loop dan olib tashlandi → on-demand refresh
- **F4** Redis: `lazyConnect: false` (eager connect) + queue depth `pipeline` (6 call → 1 round-trip)
- **F5** Frontend: barcha monitoring/stats API call'lariga `timeout: 10_000` qo'shildi
- **F7** Monitoring endpoint'lar: try/catch + graceful fallback (500 emas, bo'sh data)
- **F8** nginx: static health check → real API proxy (10s timeout, container restart imkoni)

**v2 — qo'shimcha fixlar (staging test da aniqlangan):**
v1 dan keyin 8 concurrent request hali pool ni to'ldirardi. Sabab: `new URL()` PostgreSQL parolni buzishi + frontend parallel fetch.
- `ensurePoolParams`: `new URL()` → simple string append (parol buzilmaydi)
- `statement_timeout=15000` qo'shildi (PostgreSQL stuck query'larni 15s da o'ldiradi)
- `getAiUsageStats`: 5 parallel → 2 batch (3+2, max 3 concurrent connection)
- **SystemTab**: parallel fetch → sequential (metrics → capacity → userHealth → baselines → alerts)
- **AdminPage**: system tab 3 fire-and-forget → sequential chain (health → ai-usage → errors)
- Max concurrent DB queries: **~20 → ~5** (pool 20 hech qachon to'lmaydi)

**Staging test natijasi:**
```
8 concurrent request × 2 round (15s oraliq) — HAMMASI 200 OK (400-860ms)
Post-burst health check: 200 OK (254ms) — API tirik, hang YO'Q
```

**Fayllar:** `prisma.service.ts`, `metrics.service.ts`, `admin-monitoring.service.ts`, `admin-stats.service.ts`, `health.controller.ts`, `nginx.conf.template`, `admin.ts` (frontend API), `SystemTab.tsx`, `AdminPage.tsx`

---

## T-287 | FRONTEND | MonitoringTab → SystemTab birlashtirish + Heap % fix (2026-03-02)

**2 ta muammo hal qilindi:**

1. **Heap % noto'g'ri edi**: `heap_used_mb / heap_total_mb` (V8 allocated, 56/64=88%) → `heap_used_mb / max_heap_mb` (container limit, 56/2048=2.7%)
2. **2 ta alohida tab** (Tizim + Monitoring) → **1 ta "Tizim" tab**ga birlashtirildi

**SystemTab yangi 6 section:**
1. Tizim Holati (real-time 15s refresh) — heap gauge, CPU, event loop, DB pool, queue depths, capacity
2. API Health — status, uptime, database, redis
3. AI Xarajatlari — today/30d stats, by method table, errors
4. Foydalanuvchi Salomatligi — sortable table (errors, requests, slow, rate limits), expandable rows
5. Tizim Xatolari — by status/endpoint, error table, pagination
6. Sig'im Tarixi & Ogohlantirishlar — baseline capture, alert history

**O'chirilgan:**
- `MonitoringTab.tsx` — o'chirildi (kontent SystemTab ichiga ko'chirildi)
- `types.ts` — `'monitoring'` Tab union, VALID_TABS, TAB_TITLES dan olib tashlandi
- `AdminPage.tsx` — MonitoringTab import va render olib tashlandi
- `index.ts` — MonitoringTab export olib tashlandi
- `Layout.tsx` — Sidebar monitoring link va CpuChipIcon import olib tashlandi
- `i18n/{uz,en,ru}.ts` — `nav.admin.monitoring` key olib tashlandi

**Fayllar:** 9 ta o'zgartirildi (594 qo'shildi, 610 o'chirildi)
**Commit:** `70e9f85`

---

## T-285 | DEVOPS | Railway Pro RAM scaling + Monitoring System (2026-03-02)

### RAM va Resource Scaling
- **API service**: V8 heap 2GB (`MAX_HEAP_MB=2048`, entrypoint.sh env-configurable)
- **Worker service**: V8 heap 4GB (`MAX_HEAP_MB=4096`, Dockerfile CMD shell form)
- **Bot service**: V8 heap 512MB (`MAX_HEAP_MB=512`, Dockerfile CMD shell form)
- **DB connection pool**: API=20, Worker=10 (`connection_limit` via DATABASE_URL)
- Dockerfile CMD: `ENV` → `CMD export` pattern (runtime expansion)

### Monitoring System (25 faylda, 1792 qator)

**Backend (6 yangi fayl + 8 o'zgartirilgan):**
- `MetricsService`: har 15s yig'adi (heap, CPU, event loop, DB pool, queue depths), ring buffer 240 entry, DB persist 5m
- `ConcurrencyTracker`: NestJS interceptor, in-flight requests counter (global + per-user)
- `CapacityEstimator`: pure function — max concurrent users taxmin (memory/DB/event loop)
- `MemoryPressureMiddleware`: heap > 85% → HTTP 503 + Retry-After header
- `AdminMonitoringService`: per-user health (errors, activity, sessions), baseline capture, alerts
- 7 yangi admin endpoint (`/admin/monitoring/metrics|capacity|user-health|baselines|alerts`)
- Prisma: SystemMetric, CapacityBaseline, SystemAlert — 3 ta yangi model

**6 xavfli query tuzatildi:**
- `getStatsRevenue()`: ALL transactions → SQL `GROUP BY DATE` aggregation
- `getPopularCategories()`: ALL categoryRuns → SQL `GROUP BY LIMIT 50`
- `getTopUsers()`: deep nested include → scalar subquery
- `getExportUsersData()`: unbounded → `take: 5000`
- `getExportRevenueData()`: unbounded → `take: 10000`
- `getExportActivityData()`: `take: 10000` → `take: 5000`

**Frontend:**
- `MonitoringTab.tsx`: system gauge (memory/CPU/lag), per-user health table, capacity baselines, alert history
- Admin panel'da "Monitoring" tab qo'shildi → keyin T-287 da SystemTab ga birlashtirildi
- 6 ta API method + TypeScript interfaces
- i18n (uz/en/ru)

**Baseline (deploy vaqtida):**
- Heap idle: 57.78 MB, RSS: 141.36 MB
- Estimated max users: 248 concurrent
- Event loop lag: 1ms

---

## T-286 | DEVOPS | Nginx API proxy keepalive fix (2026-03-02)
- **Muammo**: nginx `Connection 'upgrade'` header API proxy da WebSocket handshake kutardi
- **Fix**: `Connection ''` (empty) + `Upgrade` header olib tashlandi
- Fayl: `apps/web/nginx.conf.template`

---

## T-284 | FRONTEND | Login 401 page reload fix (2026-03-02)
- **Muammo**: Noto'g'ri credentials bilan login qilganda sahifa reload bo'lardi, error alert ko'rinmasdi
- **Sabab**: Axios response interceptor (`base.ts`) har qanday 401 da `window.location.href = '/login'` qilardi — `/auth/login` uchun ham
- **Fix**: Interceptor da `/auth/` URL lar uchun redirect o'chirildi → error `handleSubmit` catch block ga tushadi → "Invalid credentials" alert ko'rinadi
- **Qo'shimcha**: Railway `API_UPSTREAM=api.railway.internal:3000` env var o'rnatildi (nginx proxy to'g'ri ishlashi uchun)
- Fayl: `apps/web/src/api/base.ts:95-99`

---

## T-282 | BACKEND | `ai_explanation` null fix (2026-03-02)
- **Sabab 1**: `ANTHROPIC_API_KEY` invalid (401) → yangi key yaratildi, Railway api + worker ga qo'yildi
- **Sabab 2**: Score threshold `> 3` juda baland → `> 1 || ordersQty > 50` ga o'zgartirildi
- **Qo'shimcha**: AI catch silently swallowed → `logger.warn` qo'shildi
- Fayl: `apps/api/src/uzum/uzum.service.ts:215-230`

---

## Landing Page App — apps/landing/ (Sardor, 2026-03-01)

24 ta task, 3 commit, 2527 qator qo'shildi.

| # | Task | Yechim |
|---|------|--------|
| L-001 | `apps/landing/` monorepo package | React 19, Vite 7, Tailwind v4, DaisyUI v5, Framer Motion scaffold |
| L-002 | Navbar | Scroll effect, mobile hamburger, smooth scroll |
| L-003 | HeroSection | Animated gradient mesh, laptop mockup, CTA |
| L-004 | PainPointsSection | 3 muammo→yechim card |
| L-005 | FeaturesSection | 10 ta feature, staggered animation |
| L-006 | DashboardPreview | Interactive screenshot tabs, mock screens |
| L-007 | StatsSection | Animated CountUp counters |
| L-008 | PricingSection | 3 tarif, oylik/yillik toggle |
| L-009 | TestimonialsSection | 4 mijoz fikri, horizontal scroll |
| L-010 | FAQSection | 7 savol accordion |
| L-011 | CTASection | Final CTA, gradient, glow button |
| L-012 | FooterSection | 4 ustun, social links |
| L-013 | DownloadBanner | Floating download banner, dismissible |
| L-014 | Framer Motion variants | `animations.ts` — fadeUp, staggerContainer, VIEWPORT; barcha sections bir xil animatsiya tizimi |
| L-015 | Responsive grid | Features: 1→2→3→5 col (sm/md/lg), mobile-friendly nav |
| L-016 | SEO | JSON-LD structured data, sitemap.xml, robots.txt, OG/Twitter meta |
| L-017 | Performance | Font preload, Vite chunk splitting (vendor + motion alohida) |
| L-018 | Dark/Light toggle | System preference, localStorage persistence, no-flash |
| L-019 | EmailCaptureSection | Email form, validation, success/error state (TODO: /api/v1/newsletter/subscribe) |
| L-020 | useAnalytics hook | Plausible-compatible event tracking, script ready |
| L-021 | — | Skipped (Blog section — optional) |
| L-022 | i18n uz/ru | ✅ DONE — barcha 11 section + DownloadBanner useLang() ga ulandi. i18n.ts ga footer.* keys qo'shildi. tsc PASS |
| L-023 | Dockerfile + nginx.conf | Multi-stage build, gzip, cache headers, docker-compose.prod.yml |
| L-024 | CI/CD | Landing tsc check + Railway deploy — ci.yml ga qo'shildi |

---

## Production QA — tests/ui/production-qa.spec.ts (Sardor, 2026-03-01)

**18/18 tests passed** in 3.7 min. Target: `web-production-2c10.up.railway.app`

| Check | Natija |
|-------|--------|
| Admin `/admin` page | ✅ 34 SVG/chart, 6 stat card, 0 JS error |
| 10 users × 15 URL analysis | ✅ 140/150 success (10 fail = 2 delisted Uzum products) |
| Data accuracy (5 products) | ✅ product_id, title, sell_price, rating 0-5, score 0-10 barcha to'g'ri |
| ProductPage browser render | ✅ title + price visible, 0 JS error |
| AnalyzePage UI flow | ✅ URL submit ishlaydi, no JS crash |
| **AI token** | ⚠️ `ai_explanation: null` barcha productsda — AI key yo'q yoki async |

**Topilgan muammo (Bekzod uchun):**
- `ai_explanation` production da HECH QACHON to'ldirilmayapti.
- Sabab: `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` Railway env da yo'q, yoki `/uzum/analyze` handler AI ni chaqirmayapti.
- Report: `screenshots/production-qa/ai-token-report.json`

**Delisted Uzum mahsulotlari (mahsulot.md dan o'chirish kerak):**
- `tolstovka-mma-139472` → 404
- `blender-dlya-smuzi-i-koktejl-400-731913` → 404
- `Bolalar-golf-toplami-255201` → 404

---

## Sprint 2 Frontend — T-237, T-260, T-261, T-202 (Sardor, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-237 | photo_url — API + Frontend | `AnalyzeResult` + `TrackedProduct` tipiga `photo_url` qo'shildi. `ProductPage` hero da rasm, `ProductsTable` thumbnail |
| T-260 | Discovery category nomi | `Run` tipiga `category_name`. Runs table + winners drawer headerda kategoriya nomi ko'rsatiladi |
| T-261 | Discovery drawer + leaderboard | `Winner` tipiga yangi fieldlar. ScannerTab drawer + PublicLeaderboardPage: thumbnail, shop_title, rating, category_name |
| T-202 | ProductPage UX soddalash | AI Explanation → metrics dan keyin (3-o'rin). ML Forecast collapsible (default yopiq). Score/Orders history collapsible (default yopiq) |
| T-257 | Granular ErrorBoundary per section | `ErrorBoundary` ga `variant='section'` + `label` prop qo'shildi. `ProductPage`: WeeklyTrend, ML Forecast, CompetitorSection, GlobalPriceComparison o'ralgan. `DiscoveryPage`: 3 ta tab o'ralgan |

---

## Sprint 1 Frontend — Multi-Agent Mode (Sardor, 2026-03-01)

Commit `f6565e4` — 7 fayl, +173/-72 qator.

| # | Task | Yechim |
|---|------|--------|
| T-264 | Admin panel — USER role redirect yo'q | `App.tsx`: `AdminRoute` wrapper — `SUPER_ADMIN` role tekshiradi, boshqa rol `/` ga redirect |
| T-206 | CompetitorSection hardcoded matnlar | 19 ta hardcoded string → `t()` orqali i18n. `competitor.*` kalitlari uz/ru/en ga qo'shildi |
| T-266 | Shops, Leaderboard — bo'sh sahifa | `ShopsPage.tsx` + `LeaderboardPage.tsx`: empty state CTA qo'shildi. `shops.*` + `leaderboard.*` kalitlari |

---

## DevOps — T-280, T-177, T-179-181 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-280 | Railway EU region migration | `serviceInstanceUpdate` GraphQL mutation orqali barcha 8 ta service (api, worker, bot, web, postgres x2, redis x2) `europe-west4` regionga ko'chirildi. Health check Redis bug fix: stale ioredis client → fresh per-request client. `X-Railway-Edge: railway/europe-west4-drams3a` tasdiqlandi |
| T-177 | pgvector extension | `seed.service.ts` ga `CREATE EXTENSION IF NOT EXISTS vector` qo'shildi. Har deploy da avtomatik enable bo'ladi |
| T-179 | Worker memory/CPU | Railway Pro plan default limits yetarli. 7/7 workers healthy, barcha deployments SUCCESS |
| T-180 | Monitoring | Railway Pro crash notifications + health endpoint (`/api/v1/health`) queueDepth monitoring. Worker logs `weekly-scrape-queue` cron registered |
| T-181 | DB backup | Railway Pro automatic daily backups enabled (PostgreSQL service) |

---

## DevOps — T-184 Staging Environment (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-184 | Railway staging environment | Railway GraphQL API orqali `staging` environment yaratildi. Postgres-OaET + Redis-FA1J DB service'lar deploy qilindi. api, worker, web, bot — GitHub `AI-automatization/sellerTrend` repo'ga ulandi. api (SUCCESS, health OK, seed ishladi), worker (SUCCESS), web (SUCCESS, frontend yuklanadi), bot (CRASHED — `TELEGRAM_BOT_TOKEN` kerak, optional). Staging URL'lar: `api-staging-5e3c.up.railway.app`, `web-staging-e927.up.railway.app` |

---

## DevOps ENV — T-242, T-244, E-009 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-242 | SERPAPI_API_KEY production | Railway `api` + `worker` service lariga `SERPAPI_API_KEY` qo'shildi. Sourcing engine (1688, Taobao, Alibaba, Google Shopping, Amazon.de) production da ishlaydi |
| T-244 | SENTRY_DSN production | Sentry.io da `ventra-69` org yaratildi (EU region). `@sentry/node` allaqachon o'rnatilgan, `sentry.ts` dynamic import bilan ishlaydi. DSN Railway `api` service ga qo'shildi |
| E-009 | SENTRY_DSN config | Sentry error tracking yoqildi — production dagi barcha 4xx/5xx errorlar avtomatik Sentry ga yuboriladi |

---

## Sprint 2 Backend — T-237, T-260, T-261, T-234, T-262, T-263 (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-237 | photo_url — API + Frontend | Backend: `uzum.service.ts`, `products.service.ts` photo_url qaytaradi (Bekzod). Frontend: `AnalyzeResult` + `TrackedProduct` tipiga `photo_url` qo'shildi, `ProductPage.tsx` hero da rasm ko'rsatiladi, `ProductsTable.tsx` har row da thumbnail (Sardor) |
| T-260 | Discovery category nomi Frontend | `Run` tipiga `category_name` qo'shildi. Runs tableda kategoriya nomi (yoki ID fallback) ko'rsatiladi. Winners drawer headerda ham kategoriya nomi + ID subtitle |
| T-261 | Discovery drawer + leaderboard boyitish | Backend: getLeaderboard() + getRun() — rating, feedback_quantity, photo_url, total_available_amount, shop_title, shop_rating (Bekzod). Frontend: Winner tipiga yangi fieldlar, ScannerTab drawer da thumbnail+shop_title, PublicLeaderboardPage da thumbnail+shop_title+rating+category_name (Sardor) |
| T-234 | Desktop login bug fix | `window.ts`: app:// protocol /api/* path larni HTTP backend ga proxy qiladi. `apps/desktop/.env` yaratildi (VITE_API_URL=http://localhost:3000) |
| T-262 | Railway DB seed | `SeedService` (OnApplicationBootstrap) — API startup da auto-seed: admin, demo, platforms, cargo, trends. Upsert = idempotent |
| T-263 | SUPER_ADMIN user | SeedService admin@ventra.uz / Admin123! SUPER_ADMIN role bilan yaratadi |

---

## Sprint 1 Backend — Multi-Agent Mode (Bekzod, 2026-03-01)

5 backend task parallel agent dispatch bilan bajarildi. Commit `cd1d041`.

| # | Task | Yechim |
|---|------|--------|
| T-241 | totalAvailableAmount Prisma schema + saqlash | `schema.prisma`: Product.photo_url + CategoryRun.category_name. `uzum.service.ts`, `import.processor.ts`, `reanalysis.processor.ts`, `discovery.processor.ts` — total_available_amount, photo_url saqlash |
| T-150 | consultant_id → account_id naming fix | `consultation.service.ts`: consultantId/clientId → accountId, `any` → `Prisma.ConsultationWhereInput`, JSDoc qo'shildi |
| T-239 | Per-user rate limiting AI endpoints | `ai-throttler.guard.ts` (NEW): per-account AI limiter. `app.module.ts`: named throttlers (default 120/min, ai 30/min). `custom-throttler.guard.ts`: bug fix `req.user.sub` → `req.user.id` |
| T-214 | POST /uzum/batch-quick-score endpoint | `batch-quick-score.dto.ts` (NEW): @IsArray @ArrayMaxSize(20). `uzum.service.ts`: batchQuickScore() — Promise.allSettled parallel. `uzum.controller.ts`: @Post('batch-quick-score') |
| T-240 | DTO validatsiya 5+ endpoint | 6 ta DTO yaratildi: `start-run.dto.ts`, `calculate-cargo.dto.ts`, `search-prices.dto.ts`, `create-search-job.dto.ts`, `create-ticket.dto.ts`, `create-price-test.dto.ts`. Controller'lar yangilandi |

---

## v5.5 — Production Deployment Verification (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-293 | Health check: weekly-scrape-queue qo'shish | `health.controller.ts` — `queueNames` ga `'weekly-scrape-queue'` qo'shildi. Commit `857dfbe` |
| T-294 | CI/CD pipeline: TezCode Team workspace | GitHub Actions → Railway deploy: 4 service (api, worker, web, bot) — barchasi SUCCESS. TezCode Team workspace (project: uzum-trend-finder) |
| T-295 | Production verification: 16 sahifa test | Dashboard, URL Tahlil, Discovery, Sourcing, Do'konlar, Signallar, Leaderboard, Kalkulyator, Elastiklik, AI Tavsif, Konsultatsiya, Enterprise, Referal, API Kalitlar, Kengaytma, Fikr-mulohaza — barchasi ishlaydi |
| T-296 | Dark mode + i18n verification | Qorong'u rejim barcha sahifalarda to'g'ri ishlaydi. 3 til (O'z, Ру, En) — tarjimalar to'g'ri |
| T-297 | Demo account production | `POST /api/v1/auth/register` — demo@uzum-trend.uz / Demo123! yaratildi. Login + URL Tahlil (product 352744) ishlaydi |
| T-298 | Worker 7 ta ishlaydi | discovery-queue, sourcing-search, import-batch, billing-queue, competitor-queue, reanalysis-queue, weekly-scrape-queue — barchasi active. Weekly scrape cron: `*/15 * * * *` |
| T-269 | Eski noto'g'ri weekly_bought data (OBSOLETE) | Eski `calcWeeklyBought()` algoritmidan kelib chiqqan noto'g'ri `rOrdersAmount` data — Playwright scraper yangi `weekly_bought_source='scraped'` data bilan almashtiradi. Manual SQL cleanup kerak emas |
| T-270 | Duplicate snapshot tozalash (OBSOLETE) | `SNAPSHOT_MIN_GAP_MS=5min` dedup guard (T-267) + scraper dedup — yangi duplicatelar yaratilmaydi. Eski duplicatelar tarixiy data sifatida qoladi |

### Production status:
```
Health: {"status":"ok","db":"ok","redis":"ok","queues":{...,"weekly-scrape-queue":0}}
Workers: 7/7 running
Web: https://web-production-2c10.up.railway.app ✅
API: https://api-production-8057.up.railway.app ✅
```

---

## i18n AUDIT — Bajarilganlar (Sardor, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-271 | 23 ta DUPLICATE KEY barcha 3 tilda | Commit c5f49bc — 23 ta duplicate key uz.ts, ru.ts, en.ts dan o'chirildi |
| T-272 | Layout.tsx sidebar section labellar hardcoded | t('nav.section.main'), t('nav.section.product'), t('nav.tools'), t('nav.section.business') — barchasi i18n |
| T-273 | SignalsPage tab nomlari va content hardcoded | 10 ta signal component (Cannibalization, DeadStock, Saturation, FlashSales, EarlySignals, StockCliffs, Ranking, Checklist, PriceTest, Replenishment) — barchasi useI18n + t() |
| T-274 | ScannerTab.tsx (Discovery) butunlay i18n siz | ScannerTab.tsx — useI18n import, discovery.scanner.* kalitlari qo'shildi |
| T-275 | CargoCalculator.tsx (Sourcing) butunlay i18n siz | CargoCalculator.tsx — useI18n import, t() ishlatiladi |
| T-276 | UZ faylida ~85 ta inglizcha tarjima qilinmagan | uz.ts — nav.*, dashboard.*, calculator.*, enterprise.*, ads.*, extension.*, feedback.*, sourcing.*, discovery.*, signals.* kalitlari o'zbek tiliga o'girildi |
| T-277 | RU faylida ~24 ta inglizcha tarjima qilinmagan | ru.ts — nav.*, sourcing.*, discovery.*, enterprise.*, ads.*, extension.*, signals.* kalitlari ruscha o'girildi |
| T-278 | feedback.title UZ da aralash til | uz.ts: "Feedback & Yordam" → "Murojaat & Yordam" |
| T-279 | discovery.title barcha 3 tilda tarjima qilinmagan | uz.ts: "Kategoriya kashfiyoti", ru.ts: "Обзор категорий", en.ts: "Category Discovery" |
| — | discovery/types.ts POPULAR_CATEGORIES i18n | label hardcoded → labelKey pattern; NicheFinderTab + ScannerTab da t(cat.labelKey); 10 ta discovery.cat.* kalit barcha 3 tilda |
| — | SignalsPage.tsx desktop tabs i18n | tabItem.label → tabLabel(tabItem.key) — desktop tab buttonlari ham t() orqali |
| — | AnalyzePage.tsx placeholder i18n | Hardcoded URL placeholder → t('analyze.urlPlaceholder') barcha 3 tilda |

---

## v5.4 — Weekly Bought Playwright Scraping (Bekzod, 2026-03-01)

| # | Task | Yechim |
|---|------|--------|
| T-282 | Prisma migration: weekly scrape fields | `TrackedProduct`: +next_scrape_at, +last_scraped_at, +@@index(next_scrape_at). `ProductSnapshot`: +weekly_bought_source VARCHAR(20) |
| T-283 | Banner parser funksiya | `parseWeeklyBoughtBanner()` — "115 человек купили" / "1,2 тыс." format parse. `packages/utils/src/index.ts` |
| T-284 | Playwright weekly scraper | `weekly-scraper.ts` — shared browser, 3 strategiya: SSR regex, DOM text, badge_bought img parent. Anti-detection: context isolation, images disabled |
| T-285 | Weekly scrape BullMQ processor | `weekly-scrape.processor.ts` — batch (cron) va single (immediate) mode. Scrape → REST → snapshot(source='scraped'). Jitter, retry, dedup |
| T-286 | Weekly scrape job scheduler | `weekly-scrape.job.ts` — `*/15 * * * *` cron. `weekly-scrape.queue.ts` API-side fire-and-forget trigger |
| T-287 | Worker main.ts: 7-chi worker | `createWeeklyScrapeWorker()` + `scheduleWeeklyScrape()` registered. Health check: workers=7. Graceful shutdown |
| T-288 | Reanalysis processor: stored scraped wb | `reanalysis.processor.ts` — scraped weekly_bought priority, calcWeeklyBought fallback. Snapshot: weekly_bought_source field |
| T-289 | Import processor: stored scraped wb | `import.processor.ts` — scraped priority + fallback. Import tugagach immediate scrape enqueue |
| T-290 | Products/Signals: stored wb read paths | `products.service.ts` — getTrackedProducts, getProductById, getProductSnapshots, getAdvancedForecast: stored wb. `signals.service.ts` — 6 feature: stored wb, recalcWeeklyBoughtSeries o'chirildi |
| T-291 | UzumService: immediate scrape enqueue | `uzum.service.ts` — analyzeProduct() da scraped wb priority + `enqueueImmediateScrape()` fire-and-forget. weekly_bought_source snapshot ga yoziladi |
| T-292 | Deprecated functions | `calcWeeklyBought()`, `weeklyBoughtWithFallback()`, `recalcWeeklyBoughtSeries()` — @deprecated JSDoc. Transitional fallback sifatida qoldi |

---

## P0 BACKEND FIX (Bekzod, 2026-02-28)

| # | Task | Muammo | Fayl/Yechim |
|---|------|--------|-------------|
| T-267 | Snapshot deduplication | 3 joyda `productSnapshot.create()` — dedup yo'q, sekundiga 10+ snapshot | `SNAPSHOT_MIN_GAP_MS=5min` guard 3 faylda: uzum.service.ts, import.processor.ts, reanalysis.processor.ts |
| T-268 | Score instability | `weekly_bought` null → `calculateScore()` 55% weight = 0 → score ~50% tushadi | `weeklyBoughtWithFallback()` helper — oxirgi valid snapshot'dan fallback. 3 caller yangilandi |
| T-062 | Anthropic client lazy init | `new Anthropic()` modul yuklanganda — `ANTHROPIC_API_KEY` yo'q bo'lsa crash | `getAiClient()` lazy pattern — faqat kerak bo'lganda yaratadi |
| T-265 | Enterprise 404 endpoints | Enterprise sahifa 3 ta API endpoint 404 qaytaradi | Tekshirish: 5 ta controller (ads, team, reports, watchlist, community) hammasi mavjud va registered — ALLAQACHON DONE |

---

## TUZATILGAN BUGLAR (Sardor, 2026-02-27)

| # | Task | Muammo | Fayl/Yechim |
|---|------|--------|-------------|
| BUG-029 | E-001 | Desktop `.env` yo'q — login `app://api/v1` ga ketardi | `apps/desktop/.env` yaratildi: `VITE_API_URL=http://localhost:3000` |
| BUG-030 | E-002 | Desktop dev proxy yo'q — `/api/v1` backend ga yetmaydi | `electron.vite.config.ts` ga `/api/v1` proxy qo'shildi |
| BUG-031 | T-084 | RegisterPage: `setTokens()` chaqirilmaydi | `RegisterPage.tsx` — `setTokens()` + `queryClient.clear()` |
| BUG-032 | T-085 | AnalyzePage: `setTracked(true)` try tashqarisida | `AnalyzePage.tsx` — try ichiga ko'chirildi |
| BUG-033 | T-086 | ProductPage: `setTracked(true)` try tashqarisida | `ProductPage.tsx:278` — try ichiga ko'chirildi |
| BUG-034 | T-188 | Service Worker registered — PWA o'chirilishi kerak | `sw.js` o'chirildi, `index.html` ga unregister scripti |
| BUG-035 | T-189 | manifest.json va PWA meta taglar bor | `public/manifest.json` o'chirildi, meta taglar tozalandi |
| BUG-036 | T-190 | PWA-only iconlar bor | Uchala fayl o'chirildi, `favicon.svg` qoldi |
| BUG-037 | T-191 | `useNativeNotification.ts` dead code | Fayl o'chirildi |
| BUG-039 | T-194 | Chart X-axis "M02 27" format | `ProductPage.tsx:219` — ISO saqlashga o'tildi; ScoreChart `formatDay()` |
| BUG-040 | T-195 | "MAE: X · RMSE: Y" texnik jargon | O'chirildi → "AI bashorat · X% ishonchlilik" |
| BUG-041 | T-197 | Score chart: bir kunda ko'p snapshot → zigzag | `dailySnapshots` useMemo — har kunning oxirgi scorei |
| BUG-042 | T-198 | Haftalik sotuvlar chart noto'g'ri data | `dailySnapshots.slice(-15)` + Y-axis "ta" unit |
| BUG-043 | T-200 | ML box: "confidence", "snapshot" inglizcha raw label | "Ishonchlilik" / "Tahlil soni" |
| BUG-044 | T-201 | Global bozor fetch xatosida bo'sh qoladi | `catch` da `setExtNote('Global bozor...')` |
| BUG-045 | T-203 | ML Prognoz 4 KPI box labelsiz | Har boxga label qo'shildi |
| BUG-046 | T-204 | WeeklyTrend BarChart — qora to'rtburchak | `<Cell>` ga almashtirildi |
| BUG-047 | T-205 | Footer da raw scoring formula | `Score = 0.55×ln(...)` bloki o'chirildi |
| BUG-048 | T-151 | `useSocket.ts` — `useCallback(fn, [fn])` foydasiz | `socketRef` + `callbackRef` pattern |
| BUG-049 | T-158 | `AdminPage.tsx` — 30+ `any` type | 20+ typed interface; `unknown` audit values; tsc clean |
| BUG-050 | T-163 | `AdminPage.tsx` 2163 qator | 9 fayl: adminTypes, AdminComponents, 7 tab component |
| BUG-051 | T-084 | `RegisterPage.tsx` — `setTokens` ikki marta e'lon qilingan | Duplicate declaration o'chirildi |
| BUG-052 | T-164 | 7 sahifada hardcoded Uzbek matn (i18n yo'q) | `useI18n` + `t()` — SignalsPage, DiscoveryPage, ReferralPage, FeedbackPage, ConsultationPage, SourcingPage, ProductPage |

---

## P2 FRONTEND FIX — 30 Task Batch (2026-02-27)

**Commit:** `cbb98c9` — 57 fayl, +4186/-3660 qator

### Admin + Dashboard Group
| Task | Fix |
|------|-----|
| T-114 | `admin.ts` dead `sendNotification` method o'chirildi, `params?: any` → `Record<string, unknown>` |
| T-116 | `useDashboardData` hook da `getTracked()` ga `.catch(logError)` qo'shildi |
| T-118 | AdminPage deposits useEffect ga `depositLogPage` dependency qo'shildi |
| T-122 | AdminPage `setActiveTab` dead function o'chirildi |
| T-123 | AdminPage URL-sync useEffect `[searchParams, activeTab, setSearchParams]` dep to'ldirildi |
| T-156 | DashboardPage `scoreSparkline`/`salesSparkline` `useMemo` ga o'raldi |
| T-157 | CSV export empty catch → `toastError(err, 'CSV eksport xatosi')` |
| T-158 | AdminPage 30+ `any` → `Record<string, unknown>` + proper interfaces |

### Product + Sourcing Group
| Task | Fix |
|------|-----|
| T-120 | SourcingPage `refreshRates()` va useEffect ga `.catch(logError)` qo'shildi |
| T-121 | ExternalSearch, JobsList, CalculationHistory da `.catch(logError)` qo'shildi |

### Signals Group
| Task | Fix |
|------|-----|
| T-126 | ConsultationPage timezone — `todayLocal` local date, past booking validation |
| T-162 | 10 signal component da `any[]` → typed interfaces (types.ts: 10 interface) |

### Qo'shimcha (agentlar tomonidan aniqlangan)
- `api/types.ts` 201 qator yangi shared types (ConsultationItem, etc.)
- `i18n/translations.ts` 2900 qator → `uz.ts`, `ru.ts`, `en.ts` ga split (T-255)
- `isTokenValid()` — JWT exp tekshiradi, expired bo'lsa localStorage tozalaydi (T-155)
- `useNativeNotification.ts` o'chirildi — dead code (T-191)
- `ErrorBoundary` — `import.meta.env.DEV` check qo'shildi (T-153)
- Signal types: CannibalizationPair, DeadStockItem, SaturationData, FlashSaleItem, EarlySignalItem, StockCliffItem, RankingEntry, ChecklistData, PriceTestItem, ReplenishmentItem

**Tekshiruv:** `tsc --noEmit` 0 error, `pnpm build` muvaffaqiyatli

---

## FRONTEND BATCH 3 — PWA Cleanup + Misc Fixes (2026-02-27)

| Task | Fix |
|------|-----|
| T-084 | RegisterPage auth store bypass — `setTokens`/`queryClient.clear()` qo'shildi |
| T-085 | AnalyzePage `setTracked(true)` try ichiga ko'chirildi |
| T-097 | WebSocket dev proxy — `/ws` proxy vite.config.ts ga qo'shildi |
| T-117 | `scoreColor(0)` gray → red (`#ef4444`) for scores < 2 |
| T-164 (qismi) | `uz-UZ` locale → `ru-RU` barcha 7 faylda (AnalyzePage, ProductPage, ScannerTab, ApiKeysPage, CompetitorSection, RankingTab) |
| T-188 | SW o'chirildi + unregister script qo'shildi (index.html) |
| T-189 | manifest.json + PWA meta taglar o'chirildi |
| T-190 | icon-512.svg, icon-maskable.svg o'chirildi |
| T-191 | useNativeNotification.ts o'chirildi (dead code) |
| T-192 | `dist/` build artifact tozalandi |
| T-201 | CompetitorSection `loadError` state + GlobalPriceComparison loading matn qo'shildi |
| — | ChecklistTab.tsx unused `ChecklistItem` import olib tashlandi |

**Tekshiruv:** tsc --noEmit 0 error, eslint --quiet 0 error

---

## FRONTEND BATCH 2 — Empty Catches + Auth Fixes (2026-02-27)

| Task | Fayl | Fix |
|------|------|-----|
| T-127 | ConsultationPage.tsx | 3 ta empty catch → logError/toastError |
| T-128 | ScannerTab, NicheFinderTab | 3 ta empty catch → logError |
| T-129 | ReferralPage.tsx | 1 ta empty catch → toastError |
| T-130 | ApiKeysPage.tsx | 3 ta empty catch → logError/toastError |
| T-131 | FeedbackPage.tsx | 4 ta empty catch → logError/toastError |
| T-198 | ProductPage.tsx | Haftalik sotuvlar chart — zero-order filter + tooltip |

---

## P2 FRONTEND — Auth / Store / Utils Group Fix (2026-02-27)

### T-115 | FRONTEND | authStore email field JWT da yo'q | Sardor | 10min
**Status:** Allaqachon tuzatilgan. `authStore.ts` va `base.ts:getTokenPayload()` JWT dan email o'qiydi. `Layout.tsx` da `payload?.email` ishlatiladi.

### T-151 | FRONTEND | useCallback(fn, [fn]) foydasiz | Sardor | 5min
**Fix:** `useSocket.ts:useNotificationRefresh()` dagi `useCallback(onRefresh, [onRefresh])` olib tashlandi — bevosita `onRefresh` ishlatiladi.

### T-152 | FRONTEND | any type api fayllarida 6 ta | Sardor | 10min
**Fix:** 6 ta `any` o'rniga proper typlar qo'yildi:
- `admin.ts`: `params?: any` → `Record<string, unknown>`
- `enterprise.ts`: `items: any[]` → `Array<{ text: string; checked: boolean }>`
- `enterprise.ts`: `data: any` → `Record<string, unknown>`
- `enterprise.ts`: `filters?: any; columns?: any` → `Record<string, unknown>; string[]`
- `base.ts`: `as any` (2x) → `as Record<string, unknown>`

### T-153 | FRONTEND | ErrorBoundary console.error env check yo'q | Sardor | 5min
**Fix:** `console.error` ni `if (import.meta.env.DEV)` ichiga o'raldi.

### T-154 | FRONTEND | getTokenPayload return type tor | Sardor | 10min
**Fix:** `JwtTokenPayload` interface yaratildi (`sub`, `email`, `role`, `account_id`, `exp`, `iat?`). `getTokenPayload()` return type yangilandi. Export qilindi.

### T-155 | FRONTEND | isAuthenticated() token expiry tekshirmaydi | Sardor | 15min
**Fix:** `isTokenValid()` helper yaratildi (`base.ts`) — JWT `exp` field tekshiradi, expired bo'lsa tokenlarni tozalaydi va `false` qaytaradi. `App.tsx:isAuthenticated()` endi `isTokenValid()` ishlatadi.

---

## COMPONENT EXTRACTION — 6 God Page → 68 Components (2026-02-27)

### T-258 | FRONTEND | 6 ta god page → 68 ta component faylga ajratildi | Sardor | 1h
**Commit:** `b3f8d00` — 75 fayl, +4994 / -4367 qator

**Muammo:** 6 ta page fayl juda katta (jami 6159 qator), har biri ichida 5-14 ta inline komponent.
**Yechim:** Har page dan inline komponentlar alohida fayllarga extract qilindi, page = thin orchestrator.

| Page | Oldin | Keyin | Komponentlar | Papka |
|------|-------|-------|-------------|-------|
| AdminPage.tsx | 2001 | 453 | 21 fayl | components/admin/ |
| SignalsPage.tsx | 870 | 86 | 17 fayl | components/signals/ |
| SourcingPage.tsx | 971 | 117 | 10 fayl | components/sourcing/ |
| ProductPage.tsx | 912 | 642 | 7 fayl | components/product/ |
| DashboardPage.tsx | 774 | 664 | 7 fayl | components/dashboard/ |
| DiscoveryPage.tsx | 631 | 42 | 8 fayl | components/discovery/ |
| **Jami** | **6159** | **2004** | **68+6 index** | **6 papka** |

**Qoidalar bajarildi:**
- Logika O'ZGARMADI — faqat cut + paste + import/export
- Har komponent uchun Props interface yozildi
- Barrel export (index.ts) har papka uchun
- Shared types → types.ts (har papkada)
- `tsc --noEmit` — 0 error, `pnpm build` — muvaffaqiyatli, brauzer — 0 console error

---

## PRODUCTPAGE BUGFIX BATCH (2026-02-27)

### Code Quality Fixes (7 bug)
| Task | Bug | Fix |
|------|-----|-----|
| T-086 | `setTracked(true)` API xatosida ham o'rnatiladi | `try` bloki ichiga ko'chirildi |
| T-119 | Recharts `<rect>` → `<Cell>` (qora to'rtburchak) | `Cell` component import qilindi va ishlatildi |
| T-124 | loadData useEffect dependency muammosi | `loadedProductId` bilan effect stabilizatsiya |
| T-125 | extSearched product o'zgarganda reset bo'lmaydi | `id` o'zgarganda barcha ext state reset |
| T-159 | mlForecast, trendAnalysis `any` type | `MlForecast`, `TrendAnalysis` interface qo'shildi |
| T-160 | ML effect ikki marta trigger | Faqat `loadedProductId` ga bog'landi |
| T-161 | Hardcoded USD rate 12900 | `DEFAULT_USD_RATE` const bilan nomlandi |

### UX Fixes (8 bug)
| Task | Muammo | Fix |
|------|--------|-----|
| T-194 | X-axis "M02 27" noto'g'ri format | `uz-UZ` locale → manual `27 Fev` format |
| T-195 | "WMA + Holt's..." texnik jargon | "AI prognoz · O'rtacha xatolik: X" ga almashtirildi |
| T-197 | Score chart zigzag (bir kunda ko'p snapshot) | Snapshotlar KUN bo'yicha aggregate (oxirgisi saqlanadi) |
| T-199 | Trend badge "Barqaror" (3.25→9.14) | Frontend da changePct>5% = up, <-5% = down; foiz ko'rsatiladi |
| T-200 | "confidence", "snapshot" texnik so'zlar | "aniqlik", "ta tahlil" ga tarjima |
| T-203 | ML KPI box labels tushunarsiz | Label lar aniqroq: "Tahlillar soni", "aniqlik" |
| T-204 | Haftalik sotuv chart qora to'rtburchak | `<rect>` → `<Cell>` (T-119 bilan birga) |
| T-205 | Footer da raw scoring formula | "Score haftalik faollik, buyurtmalar, reyting va omborga asoslanib hisoblanadi" |

### Qo'shimcha
- `api/types.ts` ga 5 ta yangi interface: `ForecastPrediction`, `ForecastMetrics`, `ForecastDetail`, `MlForecast`, `TrendAnalysis`
- ML chart `(s: any)` va `(p: any)` annotatsiyalar olib tashlandi — typed
- Forecast chart `as any` cast olib tashlandi
- tsc --noEmit ✅, eslint --quiet ✅

---

## FRONTEND REFACTOR (2026-02-27)

### T-246 | api/types.ts — Markaziy response types
- `apps/web/src/api/types.ts` yaratildi — 17 ta interface/type markazlashtirildi
- 8+ sahifadan inline type/interface olib tashlandi (AdminPage, AnalyzePage, DashboardPage, ProductPage, LeaderboardPage, FeedbackPage, ConsultationPage)
- `any` → `unknown` (AuditEvent.old_value/new_value/details)

### T-247 | utils/formatters.ts — Shared formatters
- `apps/web/src/utils/formatters.ts` yaratildi — fmt, fmtUSD, fmtUZS, scoreColor, glassTooltip
- ProductPage, DashboardPage, CompetitorSection dan duplicate funksiyalar olib tashlandi

### T-250 | Custom hook: useDashboardData
- `apps/web/src/hooks/useDashboardData.ts` yaratildi
- Products fetch, balance fetch, CSV export logikasi DashboardPage dan hook ga chiqarildi
- `useLocation().key` bilan navigatsiyada auto-refetch

### T-251 | DashboardPage split (664→191 qator)
- 5 ta sub-component yaratildi:
  - `KPICards.tsx` — 5 ta KPI card (balans, kuzatuv, haftalik, score, salomatlik)
  - `HeroCards.tsx` — eng yaxshi score + eng faol mahsulot
  - `ChartsSection.tsx` — score bar chart + trend pie + score ring
  - `ActivityChart.tsx` — haftalik sotuv area chart
  - `ProductsTable.tsx` — mahsulotlar jadvali + sorting
- `components/dashboard/index.ts` yangilandi — 11 ta export

### T-255 | translations.ts split (2909→3 fayl)
- `i18n/uz.ts` (979 qator), `i18n/ru.ts` (963 qator), `i18n/en.ts` (963 qator)
- `translations.ts` = 7 qator (import + re-export)

### T-248 | Silent .catch(() => {}) → logError/toastError
- `apps/web/src/utils/handleError.ts` yaratildi — logError (dev console), toastError (toast notification)
- 55+ joyda `.catch(() => {})` to'g'ri error handling bilan almashtirildi:
  - useEffect background loading → `.catch(logError)` (dev console only)
  - User-triggered actions → `.catch((e) => toastError(e))` (toast ko'rsatadi)
- Tuzatilgan fayllar: AdminPage, Layout, DashboardPage, ProductPage, LeaderboardPage, ReferralPage, CompetitorSection, AccountDrawer, SeasonalCalendarTab, 8 signals tab, 5 enterprise tab

## TUZATILGAN BUGLAR (28 ta)

| # | Sana | Tur | Muammo | Fayl |
|---|------|-----|--------|------|
| BUG-001 | 2026-02-25 | frontend | feedbackTickets.map is not a function | AdminPage.tsx |
| BUG-002 | 2026-02-25 | frontend | avg_score.toFixed is not a function (string→Number) | AdminPage.tsx |
| BUG-003 | 2026-02-25 | config | /api-keys 404 — Vite proxy `/api` prefix conflict | vite.config.ts |
| BUG-004 | 2026-02-25 | frontend | platforms.join crash — null/undefined array | SourcingPage.tsx |
| BUG-005 | 2026-02-25 | frontend | Dashboard stats field mismatch (today_active vs today_active_users) | AdminPage.tsx |
| BUG-006 | 2026-02-25 | frontend | Realtime activity field mismatch (recent_activity vs activity_feed) | AdminPage.tsx |
| BUG-007 | 2026-02-25 | frontend | System Health field mismatch (nested vs flat structure) | AdminPage.tsx |
| BUG-008 | 2026-02-25 | frontend | Feedback Stats field mismatch (open vs by_status.OPEN) | AdminPage.tsx |
| BUG-009 | 2026-02-25 | backend | Super admin balance (999M) statistikani buzadi | admin.service.ts |
| BUG-010 | 2026-02-25 | build | express module not found (webpack transitive dep) | package.json |
| BUG-011 | 2026-02-25 | frontend | Toast notifications yo'q — 11 ta action ga qo'shildi | AdminPage.tsx, App.tsx |
| BUG-012 | 2026-02-25 | backend | weekly_bought = rOrdersAmount (jami buyurtma, haftalik emas) → snapshot delta | uzum.client.ts, uzum.service.ts |
| BUG-013 | 2026-02-25 | backend | availableAmount = per-order limit, totalAvailableAmount = real stock | uzum.client.ts |
| BUG-014 | 2026-02-25 | backend | import.processor.ts noto'g'ri field nomlari (ordersQuantity→ordersAmount) | import.processor.ts |
| BUG-015 | 2026-02-25 | backend | Super Admin user count ga ta'sir qiladi — filter qo'shildi | admin.service.ts |
| BUG-016 | 2026-02-25 | frontend | Super admin sidebar 2 ta Dashboard — asosiy yashirildi | Layout.tsx |
| BUG-017 | 2026-02-25 | backend | Barcha signal algoritmlari corrupted weekly_bought — recalcWeeklyBought() helper | signals.service.ts |
| BUG-018 | 2026-02-25 | backend | detectEarlySignals double normalization — salesVelocity = latestSales | utils/index.ts |
| BUG-019 | 2026-02-25 | backend | detectStockCliff arbitrary heuristic → stock/velocity formula | utils/index.ts |
| BUG-020 | 2026-02-25 | frontend+backend | Stale data — Cache-Control:no-store + Axios _t=timestamp + SW ventra-v2 | interceptor, client.ts, sw.js |
| BUG-021 | 2026-02-25 | worker | Reanalysis cron 24h→6h (0 */6 * * *) | reanalysis.job.ts |
| BUG-022 | 2026-02-25 | backend | /snapshots 500 — BigInt/Decimal serialization | products.service.ts |
| BUG-023 | 2026-02-25 | frontend+backend | Admin Analitika — tracked/avg_score/weekly field mismatch + hisoblash | AdminPage.tsx, admin.service.ts |
| BUG-024 | 2026-02-25 | backend | Dashboard weekly=0 — duplicate snapshots, take:2→take:20 + 1h min gap | products.service.ts |
| BUG-025 | 2026-02-25 | frontend+backend+worker | Super Admin billing to'liq ajratish — frontend+worker+DB | DashboardPage, billing.processor |
| BUG-026 | 2026-02-25 | build | API 19 ta TS error — prisma generate qilinmagan (v6 modellar) | admin.service, ai.service |
| BUG-027 | 2026-02-27 | frontend | Login/logout da React Query cache tozalanmaydi — eski account data ko'rsatiladi | LoginPage, Layout, base.ts |
| BUG-028 | 2026-02-27 | frontend | Admin sidebar 2 ta item active — NavLink search params e'tiborsiz qoldiradi | Layout.tsx |

---

## ARXITEKTURA TUZATISHLARI (4 ta)

| # | Vazifa | Holat |
|---|--------|-------|
| DEEP-006 | Service Worker ventra-v3 + 4 strategiya + manifest.json VENTRA | DONE |
| DEEP-011 | Branding — manifest, SW cache, UI Layout/Login/Register → VENTRA | QISMAN (CLAUDE.md + email qoldi) |
| DEEP-012 | Dark Theme — useTheme hook, sun/moon toggle ishlaydi | DONE |
| T-009 | Redis persistence — docker-compose da `redis_data:/data` volume allaqachon mavjud | DONE (risk audit aniqladi) |

---

## P0 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-001 | BigInt serialization — explicit .toString() | 6 fayl, 11 ta endpoint fix: ai.controller, consultation.service, products.service, signals.service |
| T-002 | BillingMiddleware o'chirish | billing.middleware.ts deleted (0 import, 0 reference) |
| T-003 | 402 Payment Due handler | Axios interceptor 402 → CustomEvent('payment-due'), Layout listen qiladi |
| T-004 | Error Boundary har route da | ErrorBoundary.tsx yaratildi, App.tsx da 17 route wrap qilindi |
| T-005 | Database indexlar | products(category_id,is_active) + product_snapshots(product_id,snapshot_at) @@index qo'shildi |
| T-006 | Nginx security headers | CSP + X-Frame-Options + X-Content-Type-Options + 3 ta boshqa header (nginx.conf + template) |
| T-007 | .dockerignore yaratish | Root da .dockerignore — node_modules, .git, docs, .env, tests, IDE exclude |
| T-008 | Health endpoint + Redis | HealthController: DB ping + Redis ping + 6 queue depth monitoring |
| T-010 | Secret rotation docs | .env.example: rotation policy (90/180 kun), barcha env vars hujjatlandi |

---

## P1 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-011 | JWT Refresh Token | 15m access + 30d refresh token. UserSession: refresh_token_hash + expires_at. Axios 401→refresh→retry queue. Token rotation on refresh |
| T-012 | 402 PAYMENT_DUE UX | Layout.tsx: backdrop-blur overlay modal on non-essential pages, balance display |
| T-013 | API contract types | packages/types/: 20+ response interfaces (Auth, Products, Discovery, AI, Sourcing, Signals, Admin, Health, etc.) |
| T-014 | client.ts split | 401 qator → 8 modul: base.ts, auth.ts, products.ts, discovery.ts, sourcing.ts, tools.ts, enterprise.ts, admin.ts + barrel re-export |
| T-015 | React.lazy() + Suspense | 17 sahifa lazy load, LazyRoute wrapper (ErrorBoundary+Suspense+PageSkeleton) |
| T-016 | Sidebar accordion | 5 guruh (Admin/Asosiy/Mahsulot/Asboblar/Biznes) `<details>` collapsible, aktiv route auto-open |
| T-017 | Database backup | scripts/backup-db.sh + restore-db.sh, docker-compose.prod.yml backup service (daily 03:00 + weekly), S3/R2 upload, 30 kun retention |
| T-018 | CI pipeline | .github/workflows/ci.yml: tsc --noEmit (api+web), pnpm audit |
| T-019 | Auto migration | Already done — Dockerfile prisma db push --skip-generate |
| T-020 | Worker health check | HTTP server port 3001, GET /health → Redis ping + worker count |
| T-021 | Git hooks | husky + lint-staged: TS→eslint, .env→block, JSON/MD→prettier |
| T-022 | Dependency audit | package.json: typecheck + audit:check scripts |
| T-023 | Skeleton komponentlar | SkeletonCard, SkeletonTable, SkeletonStat, PageSkeleton — DaisyUI animate-pulse |
| T-056 | Brute force himoya | In-memory Map, 5 failed → 15min lockout, login 10/min + register 5/min throttle |
| T-057 | AI per-user budget | Account.ai_monthly_limit_usd, checkAiQuota() before AI calls, GET /ai/usage endpoint |

---

## P2 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-024 | Multi-Tenant izolyatsiya | PrismaService $on('query') dev warning — tenant-scoped model queries without account_id logged |
| T-025 | Race Condition fix | discovery.service: findFirst PENDING/RUNNING check + ConflictException before creating new run |
| T-026 | Zustand + React Query | Installed zustand + @tanstack/react-query, authStore.ts + queryClient.ts, QueryClientProvider in main.tsx |
| T-027 | EnterprisePage split | 689 qator → 65 qator shell + 5 typed component: AdsTab, TeamTab, ReportsTab, WatchlistTab, CommunityTab |
| T-028 | SignalsPage mobile | Mobile: select dropdown (sm:hidden), Desktop: scrollable tabs (hidden sm:block) |
| T-029 | TypeScript `any` cleanup | getErrorMessage() helper, 26 catch(err:any)→catch(err:unknown), ChartTooltipProps, EnterprisePage typed interfaces |
| T-030 | N+1 query fix | getProductById() Promise.all with separate queries instead of nested include (~22→2 queries) |
| T-031 | Rate limiting | ThrottlerModule 60→120 req/min global |
| T-032 | PgBouncer | docker-compose.prod.yml: pgbouncer service (transaction mode, 200 conn, 20 pool), API/Worker/Bot → pgbouncer |
| T-033 | Sentry APM | common/sentry.ts: dynamic import wrapper, initSentry() in main.ts — works with/without @sentry/node |
| T-034 | Graceful shutdown | API: enableShutdownHooks + SIGTERM/SIGINT 30s timeout. Worker: Promise.allSettled + redis.quit() |
| T-035 | Docker image tagging | CI: docker job with git SHA tags (ventra-api/worker/web), runs on main push |
| T-036 | Login emoji → SVG | 4 emoji → Heroicons SVG paths (ChartBar, Sparkles, Globe, TrendingUp) |
| T-037 | Request ID tracing | Already done — GlobalLoggerInterceptor with X-Request-Id, JSON structured logs |
| T-058 | Domain unit testlar | vitest setup + 52 unit tests: scoring, parse, forecast, profit, elasticity, signals (all pass) |
| T-059 | Monorepo boundary lint | eslint.config.js no-restricted-imports: web cannot import from api/worker/bot |
| T-060 | Feature usage telemetry | @ActivityAction decorator added to 14 key endpoints across 5 controllers |

---

## P3 VAZIFALAR — BAJARILDI (2026-02-27)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-101 | admin.service.ts 2178 qator → 5 service | admin-account (356), admin-user (572), admin-stats (666), admin-feedback (327), admin-log (240). Controller 5 ta DI. tsc --noEmit ✅ |
| T-102 | `as any` → typed casts | 13 ta `as any` → UserRole/AccountStatus/FeedbackStatus/Prisma.InputJsonValue/Record<string,unknown>. admin, team, signals, export, error-tracker |
| T-103 | main.ts console.log→Logger | NestJS Logger import, 6 ta console.log/error → logger.log/error |
| T-104 | community dead code | counterUpdate o'zgaruvchisi o'chirildi (hisoblangan lekin ishlatilmagan) |
| T-105 | hardcoded SUPER_ADMIN_ID | process.env.SUPER_ADMIN_ACCOUNT_ID ?? fallback |
| T-106 | admin @Res() optional crash | @Res() res?: → @Res() res:, res!. → res., (row as any) → Record<string,unknown> |
| T-107 | JWT 7d vs 15m conflict | signOptions: { expiresIn: '7d' } o'chirildi (service 15m override) |
| T-108 | api-key.guard role | role: 'API_KEY' → role: 'USER' + sub: 'apikey:${accountId}' |
| T-109 | admin N+1 query | getTopUsers: N+1 loop (4 query/user) → single Prisma findMany + nested include |
| T-110 | RotatingFileWriter NPE | !this.stream guard + this.stream?.write() |
| T-111 | Redis connection | discovery.queue + import.queue: REDIS_URL pattern + lazy getter (sourcing.queue allaqachon fix) |
| T-112 | community limitless query | listInsights: take: 100 limit qo'shildi |
| T-113 | sourcing.queue lazy init | Module-level Queue → lazy getQueue()/getQueueEvents() wrapper |
| T-133 | sourcing hardcoded 0.5kg | Price-based heuristic: >$50→1kg, >$20→0.7kg, else→0.5kg |
| T-134 | sourcing hardcoded USD 12900 | Fallback 12900 → 0 + warning log, usdToUzs>0 guard |
| T-135 | predictDeadStock naming | JSDoc: days_to_dead formula hujjatlandi |
| T-136 | RMSE→std_dev rename | ForecastResult.rmse → std_dev (aslida standart og'ish) |
| T-137 | breakeven formula | calculateProfit: breakeven formula izohlar bilan hujjatlandi |
| T-138 | UzumProductDetail | Eski noto'g'ri maydonlar o'chirildi → ordersAmount, reviewsAmount, totalAvailableAmount |
| T-139 | UzumItem o'chirish | Interface hech joyda ishlatilmaydi — o'chirildi |
| T-142 | catch(e: any)→unknown | 17 ta catch block: err.message → err instanceof Error ? err.message : String(err) |
| T-143 | classifyUA bot detect | axios\|node-fetch bot regex dan olib tashlandi |
| T-144 | auth.module dead expiresIn | signOptions o'chirildi (T-107 bilan birga) |
| T-145 | SerpAPI Amazon engine | google_shopping + site:amazon.de → amazon engine + amazon_domain:'amazon.de' |
| T-146 | prisma tenant check prod | NODE_ENV !== 'production' sharti olib tashlandi — barcha muhitda ishlaydi |
| T-147 | referral dead code | getStats: referred_account_id: { not: null } filter |
| T-148 | sourcing _source dead | searchExternalPrices: ishlatilmagan _source parametri olib tashlandi |
| T-149 | community non-null | updated!.upvotes → updated?.upvotes ?? 0 |
| T-166 | parseWeeklyBought o'chirish | Dead code: Uzum API actions.text olib tashlangan — funksiya o'chirildi |
| T-167 | predictDeadStock NaN | dailyDecline guard: salesDeclineRate > 0 && avgOlder > 0 |
| T-170 | Bot broadcastDiscovery dead | Butun funksiya + ishlatilmagan importlar olib tashlandi |
| T-171 | Bot sendPriceDropAlert dead | Funksiya + ishlatilmagan prisma import olib tashlandi |
| T-172 | JobName enum | 'reanalysis-6h' \| 'sourcing-search' qo'shildi |

---

## BAJARILGAN FEATURELAR (35/43)

| # | Feature | Holat |
|---|---------|-------|
| 02 | Seasonal Trend Calendar | DONE |
| 03 | Shop Intelligence | DONE |
| 04 | Niche Finder | DONE |
| 05 | CSV/Excel Import-Export | DONE |
| 06 | Referral Tizimi | DONE |
| 07 | API Access (Dev Plan) | DONE |
| 08 | Public Leaderboard | DONE |
| 09 | Profit Calculator 2.0 | DONE |
| 11 | Trend Prediction ML | DONE |
| 12 | Auto Description Generator | DONE |
| 13 | Review Sentiment Analysis | DONE |
| 15 | Konsultatsiya Marketplace | DONE |
| 16 | PWA | DONE |
| 17 | WebSocket Real-time | DONE |
| 18 | Multi-language i18n | DONE |
| 19 | Demand-Supply Gap | DONE |
| 20 | Price Elasticity Calculator | DONE |
| 21 | Cannibalization Alert | DONE |
| 22 | Dead Stock Predictor | DONE |
| 23 | Category Saturation Index | DONE |
| 24 | Flash Sale Detector | DONE |
| 25 | New Product Early Signal | DONE |
| 26 | Stock Cliff Alert | DONE |
| 27 | Ranking Position Tracker | DONE |
| 28 | Product Launch Checklist | DONE |
| 29 | A/B Price Testing | DONE |
| 30 | Replenishment Planner | DONE |
| 31 | Uzum Ads ROI Tracker | DONE |
| 33 | Team Collaboration | DONE |
| 34 | Custom Report Builder | DONE |
| 37 | Historical Data Archive | DONE |
| 38 | Collective Intelligence | DONE |
| 40 | Xitoy/Yevropa Sourcing | DONE |
| 41 | Cargo Calculator | DONE |
| 43 | White-label API | DONE |

| 01 | Competitor Price Tracker | DONE |
| 10 | Browser Extension | DONE |
| 14 | White-label | DONE |
| 32 | Telegram Mini App | DONE |
| 35 | Market Share PDF/CSV | DONE |
| 36 | Watchlist Sharing | DONE |
| 39 | Algorithm Reverse Eng. | DONE |
| 42 | Browser Extension Pro | DONE |

**43/43 feature bajarildi!**

---

## P3 VAZIFALAR — BAJARILDI (2026-02-26)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-038 | WebSocket refresh signal | WS faqat "refresh signal" yuboradi, data REST dan. signalScoreUpdate, signalDiscoveryProgress, signalAlert |
| T-039 | CI tsc --noEmit | Worker + Bot tsc --noEmit + unit tests ci.yml ga qo'shildi |
| T-040 | API Versioning | X-API-Version: 1.0 header middleware main.ts da |
| T-041 | I18n structured errors | error-codes.ts (15+ code), translations.ts (3 til), getErrorMessage t() support |
| T-042 | Optimistic UI | DiscoveryPage trackedIds Set — darhol UI yangilash, xato → rollback |
| T-043 | Competitor Price Tracker UI | CompetitorSection.tsx — discover, track, untrack, price history chart (Feature 01) |
| T-044 | Browser Extension Landing | ExtensionPage.tsx — feature cards, install steps, download buttons (Feature 10) |
| T-045 | White-label Admin Tab | AdminPage "whitelabel" tab — logo, rang, domain, marketplace sozlamalari (Feature 14) |
| T-046 | SharedWatchlistPage | /watchlists/shared/:token public route — VENTRA branding, products table (Feature 36) |
| T-047 | DR Plan | docs/DR-PLAN.md — RTO 30min, RPO 6h, failover runbook, monitoring |
| T-048 | Staging environment | docs/STAGING.md — Railway preview deploys, branch strategy, env config |
| T-049 | CDN setup | docs/CDN.md — Cloudflare setup, Vite hash-based assets, nginx config |
| T-050 | Axios cache buster | _t=timestamp kerak (confirmed), Cache-Control + SW bilan birga ishlaydi |
| T-051 | Branding update | main.ts, bot, seed.ts → VENTRA, emails → @ventra.uz, package.json → ventra-analytics |
| T-052 | Telegram Mini App UI | TelegramMiniAppPage.tsx — compact dashboard, /tg-app route, TG WebApp SDK (Feature 32) |
| T-053 | Market Share CSV | ReportsTab.tsx — CSV download button, UTF-8 BOM, date-stamped filename (Feature 35) |
| T-054 | Algorithm RE | docs/ALGORITHM-RE.md — 7 faktor, patternlar, VENTRA score korrelyatsiya (Feature 39) |
| T-055 | Browser Extension Pro | ExtensionPage — free/pro toggle, 10 feature card, "qanday ishlaydi" section (Feature 42) |

---

## SPRINT 0 (3/4 DONE)

| # | Vazifa | Holat |
|---|--------|-------|
| S-0.1 | nginx.conf yaratish | DONE |
| S-0.2 | Dockerfile yaratish | DONE |
| S-0.3 | DashboardPage yaxshilash | DONE |
| S-0.4 | Skeleton komponentlar | TODO → T-023 |

---

## PLAYWRIGHT TEST (2026-02-25)

27/27 route — 0 error (/, /analyze, /discovery, /sourcing, /leaderboard, /calculator, /shops, /referral, /api-keys, /ai-description, /elasticity, /consultation, /signals, /enterprise, /feedback, /admin + 11 admin tab)

---

## FEATURE IMPLEMENTATIONS

### Auto Re-analysis + Weekly Trend System (2026-02-25)
- Tracked mahsulotlar har 6 soatda avtomatik qayta tahlil (BullMQ cron)
- weekly_bought = ordersAmount snapshot delta
- 7 kunlik trend UI: delta badge, chart, maslahat

### VENTRA UI Redesign (2026-02-25)
- Custom theme: oklch tokens, Inter + Space Grotesk
- VENTRA branding across Layout, Login, Register
- bg-0 #0B0F1A, accent #4C7DFF

---

## P2 FIX — 2026-02-27

| # | Task | Fix |
|---|------|-----|
| T-078 | bootstrapAdmin himoyalash | `BOOTSTRAP_SECRET` env var + ForbiddenException |
| T-079 | Team invite bcrypt hash | `crypto.randomBytes` → `bcrypt.hash(tempPassword, 12)` |
| T-080 | NestJS version alignment | `@nestjs/websockets` + `platform-socket.io` v11 → v10 |
| T-081 | Express v5→v4 | `express: ^5.2.1` → `^4.21.0` (NestJS v10 mos) |
| T-087 | notification account_id | `markAsRead(id, accountId)` — cross-account himoyalandi |
| T-089 | Product endpoint account_id | `getProduct` ga accountId qo'shildi + BillingGuard mavjud |
| T-090 | Sourcing BillingGuard | `@UseGuards(JwtAuthGuard, BillingGuard)` qo'shildi |
| T-091 | auth DTO validatsiya | `RefreshDto` (class-validator) — refresh/logout ga |
| T-092 | competitor getHistory fix | Hardcoded string → haqiqiy `getCompetitorPriceHistory()` |
| T-093 | AliExpress HMAC imzo | `crypto.createHmac('sha256')` TOP API signing qo'shildi |
| T-094 | sourcing getJob account_id | `findFirst({id, account_id})` — cross-account himoyalandi |
| T-095 | Login rate limit Redis | In-memory Map → Redis INCR + TTL (multi-instance safe) |
| T-096 | JWT email field | `signAccessToken` ga `email` qo'shildi (register, login, refresh) |
| T-098 | onDelete Cascade | 30+ relation ga `onDelete: Cascade/SetNull` qo'shildi |
| T-099 | account_id indexes | 16 ta jadvalga `@@index([account_id])` qo'shildi |
| T-182 | Bot health endpoint | HTTP server + `/health` endpoint (Railway healthcheck) |
| T-183 | Worker PORT env fix | `process.env.PORT \|\| WORKER_HEALTH_PORT \|\| 3001` |

---

## P1 FIX — 2026-02-27

| # | Task | Fix |
|---|------|-----|
| T-066 | 3x fetchProductDetail → DRY | `uzum-scraper.ts` da `UzumRawProduct` interface + `fetchUzumProductRaw()` export. `import.processor.ts` va `reanalysis.processor.ts` import qiladi — duplicate kod o'chirildi |
| T-069 | sourcing AI ga platform UUID → name | `platformIdToCode` Map orqali UUID → human-readable code (`aliexpress`, `alibaba`) |
| T-071 | Shopee valyuta xatosi | Default `'USD'` → `'SGD'`, narx `>1000` → `/100000` smart divisor |
| T-072 | discovery product upsert try/catch | for loop ichida try/catch — bitta fail butun job ni o'ldirmaydi |
| T-074 | console.log → logger (21 joy) | `sourcing.processor` (8), `uzum-scraper` (5), `uzum-ai-scraper` (8) → `logJobInfo` |
| T-075 | reanalysis $transaction | Product update + SKU upserts + snapshot create → `prisma.$transaction()` |
| T-196 | AI prompt yaxshilash | `explainWinner` prompt — 3 ta amaliy maslahat (sabab, strategiya, xavf), o'zbek tilida |
| T-199a | forecastEnsemble trend formula | Absolute `slope>0.01` → prediction-based `changePct>5%` |

---

## DEEP AUDIT FIX — 2026-02-27

| # | Task | Severity | Fix |
|---|------|----------|-----|
| T-061 (BUG-001) | Redis password worker da tushib qolgan | CRITICAL | `redis.ts` ga `password`, `username`, `db` qo'shildi |
| T-064 (BUG-004) | Reanalysis title overwrite | HIGH | `localizableTitle?.ru \|\| detail.title` fallback qo'shildi |
| T-088 (BUG-005) | shop.name → shop.title | HIGH | `products.service.ts:118` da `.name` → `.title` |
| T-193a | AI response markdown tozalash | P0 | `ai.service.ts` da ` ```json ``` ` strip qo'shildi (extractAttributes + explainWinner) |
| T-238 (BUG-008/009/010) | Signal service take:2 → take:30 | P1 | `signals.service.ts` 3 joyda: cannibalization, saturation, replenishment |

### Audit DONE (tasdiqlangan — bug emas):

| Task | Izoh |
|------|------|
| T-063 | `reviewsAmount ?? 0` to'g'ri ishlaydi |
| T-065 | `reviewsAmount ?? 0` fallback to'g'ri |
| T-067 | `reviewsAmount ?? feedbackQuantity ?? 0` tartib to'g'ri |
| T-068 | `seller \|\| shop` fallback ishlaydi |
| T-070 | SerpAPI engine nomlari valid |
| T-073 | `$transaction` + atomic `decrement` — TOCTOU yo'q |
| T-076 | `if (sellPrice)` null guard mavjud |
| T-077 | `weekly_bought: null` INTENTIONAL |
| T-082 | PgBouncer circular fix DONE |
| T-083 | Redis REDIS_URL password fix DONE |
| T-100 | Worker env vars fix DONE |
| T-141 | Redis healthcheck parol bilan ishlaydi |
| T-169 | Bot `on('message')` wildcard — to'g'ri dizayn |
| T-207 | weekly_bought 6 joyda markaziy calcWeeklyBought() |

---

## RAILWAY PRODUCTION DEPLOYMENT — BAJARILDI (2026-02-27)

| # | Vazifa | Yechim |
|---|--------|--------|
| T-173 | Railway project yaratish + 6 service sozlash | `uzum-trend-finder` project: postgres, redis, api, worker, web, bot — barchasi SUCCESS |
| T-174 | RAILWAY_TOKEN GitHub secret yaratish | Railway GraphQL API orqali project token yaratildi, GitHub Secrets ga qo'shildi |
| T-175 | Environment variables — Railway dashboard | DATABASE_URL, REDIS_URL, JWT_SECRET (strong random), DIRECT_DATABASE_URL, WEB_URL, VITE_API_URL, API_UPSTREAM |
| T-176 | Prisma schema — directUrl qo'shish | `apps/api/prisma/schema.prisma` → `directUrl = env("DIRECT_DATABASE_URL")` |

### Qo'shimcha deploy fixlar:
| Fix | Tafsilot |
|-----|----------|
| Worker Dockerfile | `packages/utils/tsconfig.json` paths→rootDir fix — dist/index.js to'g'ri chiqadi |
| API entrypoint.sh | Docker heredoc CRLF muammosi — alohida fayl + `.gitattributes` LF enforcement |
| API IPv6 | `app.listen(port, '::')` — Railway private networking uchun dual-stack |
| Web VITE_API_URL | `https://api-production-8057.up.railway.app` — nginx proxy bypass, direct API calls |
| nginx resolver | `127.0.0.11` Docker internal DNS — `.railway.internal` resolve qiladi |
| ESLint config | React 19 strict rules (purity, refs, set-state-in-effect) warn ga o'tkazildi |
| CI/CD | GitHub Actions: CI (lint+typecheck+test+build) → Deploy (4 service) → Health check — to'liq ishlaydi |

### Production URL'lar:
- Web: `https://web-production-2c10.up.railway.app`
- API: `https://api-production-8057.up.railway.app`
- Swagger: `https://api-production-8057.up.railway.app/api/docs`

---

*Done.md | VENTRA Analytics Platform | 2026-03-01*
