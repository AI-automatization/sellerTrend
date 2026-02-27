# VENTRA Landing Page — Loyiha Hujjati va Vazifalar
# Yaratilgan: 2026-02-27

---

## LOYIHA TAVSIFI

**VENTRA** — Uzum.uz marketplace sotuvchilari uchun premium SaaS analytics platformasi.

**Maqsad:** Marketing vizitka sayt yaratish. Sayt orqali:
- Platformani tushuntirish (nima qiladi, kimga kerak)
- Desktop ilovani yuklab olish
- Dashboard'ga login qilish
- Yangi leadlarni jalb qilish va ishontirish

**Target auditoriya:** Uzum.uz sotuvchilari — dropshipperlar, magazin egalari, reseller'lar.

---

## TEXNIK STACK

| Texnologiya | Versiya | Izoh |
|-------------|---------|------|
| React | 19 | Monorepo ichida `apps/landing/` |
| Vite | 7 | Build tool |
| Tailwind CSS | v4 | `@tailwindcss/vite` plugin |
| DaisyUI | v5 | Component library |
| Framer Motion | latest | Animatsiyalar |
| React Router | v7 | SPA routing (agar kerak bo'lsa) |

**Dizayn tili:**
- Primary rang: `#2E5BFF` (VENTRA ko'k)
- Dark background: `#0B0F1A`
- Shriftlar: Inter (body), Space Grotesk (headings)
- Gradient: ko'k → binafsha (`#2E5BFF` → `#7C3AED`)

---

## SAYT TUZILMASI (Sections)

### 1. HERO SECTION
**Maqsad:** 5 soniyada leadni "hook" qilish

**Kontent:**
- Sarlavha: "Uzum sotuvingizni 3x oshiring — AI bilan"
- Taglavha: "Qaysi mahsulot trend? Raqibingiz qancha sotayapti? Qayerdan arzon olib kelish mumkin? VENTRA barchasini ko'rsatadi."
- CTA tugmalar:
  - "Bepul boshlash →" (Register ga link)
  - "Desktop yuklab olish" (Download ga link)
- Background: animated gradient mesh / particle animation
- Hero rasm: Dashboard screenshot (real, blurred qismlari bilan)

**Marketing hook'lar:**
- "1000+ Uzum sotuvchi ishonadi"
- "Birinchi 14 kun BEPUL"
- "5 daqiqada trend topish"

### 2. MUAMMO + YECHIM (Pain Points)
**Maqsad:** Sotuvchi o'z muammosini ko'rishi kerak

**3 ta muammo card:**
1. "Qaysi mahsulot sotiladi — bilmaysiz" → VENTRA trend discovery
2. "Raqiblar arzonroq sotayapti — ko'rmaysiz" → VENTRA raqib kuzatuvi
3. "Xitoydan narxni bilmaysiz — qidirib ko'rmaysiz" → VENTRA sourcing

**Dizayn:** Before/After format — muammo (qizil) → yechim (yashil)
**Animatsiya:** Scroll-triggered fade-in + slide-up

### 3. FEATURES (Imkoniyatlar)
**Maqsad:** Platformaning 10 ta asosiy xususiyati

| # | Feature | Tavsif | Icon |
|---|---------|--------|------|
| 1 | Real-time Analytics | Uzum'dan jonli ma'lumotlar — narx, stok, sotuv | ChartBarIcon |
| 2 | Trend Discovery | AI avtomatik trend mahsulotlarni topadi | SparklesIcon |
| 3 | Signal Detection | Narx tushdi, stok tugayapti — darhol xabar | BellAlertIcon |
| 4 | Raqib Kuzatuvi | Raqiblar narxini 24/7 monitoring | EyeIcon |
| 5 | Sourcing Engine | 1688, Taobao, AliExpress dan arzon narx topish | GlobeAltIcon |
| 6 | AI Tahlili | Claude AI mahsulotni tahlil qiladi va maslahat beradi | CpuChipIcon |
| 7 | Profit Kalkulyator | Cargo, bojxona, QQS — aniq foyda hisoblash | CalculatorIcon |
| 8 | Telegram Bot | Muhim yangiliklar to'g'ridan-to'g'ri Telegram'ga | ChatBubbleIcon |
| 9 | Desktop Ilova | Windows/macOS — brauzer ochmasdan ishlash | ComputerDesktopIcon |
| 10 | Browser Extension | Uzum.uz sahifasida 1 klik bilan tahlil | PuzzlePieceIcon |

**Dizayn:** 2x5 grid, har biri hover animation, gradient border
**Animatsiya:** Staggered entrance (har card 100ms kechikish bilan paydo bo'ladi)

### 4. DASHBOARD PREVIEW
**Maqsad:** Mahsulotni ko'rsatish — "seeing is believing"

**Kontent:**
- Interactive screenshot carousel (3-4 ta ekran):
  1. Dashboard — KPI kartochkalari, sparkline grafiklari
  2. Product tahlili — score, chart, AI maslahat
  3. Discovery — trend mahsulotlar ro'yxati
  4. Sourcing — Xitoy narxlari bilan taqqoslash
- Har screenshot ustida qisqa caption
- "Ko'proq ko'rish →" tugma (Register ga link)

**Dizayn:** Laptop/desktop mockup ichida screenshot
**Animatsiya:** Parallax scroll effect, screenshot'lar almashinishi

### 5. RAQAMLAR (Social Proof)
**Maqsad:** Ishonchni oshirish

**4 ta stat counter:**
- "1,000+" — Aktiv sotuvchilar
- "50,000+" — Tahlil qilingan mahsulotlar
- "24/7" — Real-time monitoring
- "10x" — O'rtacha ROI o'sishi

**Dizayn:** Animated counter (scroll trigger, 0 dan songa qadar count up)
**Animatsiya:** CountUp animation 2 soniya

### 6. NARXLAR (Pricing)
**Maqsad:** Leadni harakatga undash

**3 ta tarif:**

| Tarif | Narx | Xususiyatlar |
|-------|------|-------------|
| **Starter** (bepul) | 0 so'm/oy | 5 mahsulot tracking, asosiy analytics, 1 discovery/kun |
| **Pro** | 99,000 so'm/oy | 50 mahsulot, AI tahlili, sourcing, raqib kuzatuvi, Telegram bot |
| **Enterprise** | 299,000 so'm/oy | Cheksiz, API access, team accounts, priority support, custom reports |

**Pro tarif** eng katta card, "Eng mashhur" badge bilan

**Dizayn:** 3 column card, Pro highlighted (scale up, gradient border)
**Animatsiya:** Hover lift effect, CTA pulsating glow

### 7. TESTIMONIALS (Mijozlar fikri)
**Maqsad:** Social proof kuchaytirish

**3-4 ta testimonial:**
- Sotuvchi ismi, do'kon nomi, rasm (placeholder)
- Qisqa fikr: "VENTRA dan keyin sotuvim 3x oshdi"
- Yulduzcha reyting (5/5)

**Dizayn:** Carousel slider, auto-scroll
**Animatsiya:** Smooth slide transition

### 8. FAQ
**Maqsad:** Shubhalarni bartaraf qilish

**Savollar:**
1. "VENTRA nima?" → Uzum sotuvchilari uchun analytics platforma
2. "Bepul foydalansa bo'ladimi?" → Ha, Starter tarif bepul
3. "Ma'lumotlar qayerdan olinadi?" → Uzum.uz dan real-time
4. "Desktop ilova qaysi OS da ishlaydi?" → Windows 10+ va macOS 12+
5. "Telegram bot nima qiladi?" → Narx o'zgarishi, trend signal, stok alert
6. "Ma'lumotlarim xavfsizmi?" → End-to-end encryption, JWT auth
7. "Qanday to'lash mumkin?" → Click, Payme, Uzum nasiya

**Dizayn:** Accordion (collapse/expand)
**Animatsiya:** Smooth height transition

### 9. CTA (Final Call to Action)
**Maqsad:** Oxirgi "push" — lead konversiya

**Kontent:**
- Sarlavha: "Raqiblaringiz allaqachon VENTRA ishlatayapti. Siz-chi?"
- CTA: "Hoziroq boshlash — 14 kun bepul →"
- Pastda: "Bank kartasi talab qilinmaydi"

**Dizayn:** Full-width dark section, gradient text, large CTA button
**Animatsiya:** Pulsating button glow, floating particles background

### 10. FOOTER
**Maqsad:** Navigatsiya + kontakt

**Ustunlar:**
- **Mahsulot:** Features, Pricing, Desktop App, Browser Extension
- **Kompaniya:** Biz haqimizda, Blog, Aloqa
- **Yordam:** FAQ, Documentation, support@ventra.uz
- **Ijtimoiy:** Telegram, Instagram, YouTube

**Pastki qism:** "2026 VENTRA. Barcha huquqlar himoyalangan." + Maxfiylik siyosati link

---

## DESKTOP APP DOWNLOAD SECTION
**Har section'da paydo bo'ladigan download banner:**

```
┌─────────────────────────────────────────────────────┐
│  🖥️ VENTRA Desktop — Brauzer ochmasdan ishlang     │
│                                                      │
│  [Windows yuklab olish]  [macOS yuklab olish]       │
│                                                      │
│  v1.0.0 · 85 MB · Windows 10+ / macOS 12+          │
└─────────────────────────────────────────────────────┘
```

**Yuklab olish linki:** GitHub Releases yoki to'g'ridan-to'g'ri server
**Auto-update:** Electron updater orqali (ichki)

---

## NAVIGATSIYA (Header)

```
VENTRA [logo]    Imkoniyatlar    Narxlar    FAQ    Desktop    [Dashboard →]    [Kirish]
```

- **Scroll effect:** Transparent → blur backdrop on scroll
- **Mobile:** Hamburger menu
- **"Dashboard →"** tugma: `https://app.ventra.uz` ga link
- **"Kirish"** tugma: `https://app.ventra.uz/login` ga link

---

## TEXNIK ARXITEKTURA

```
apps/
  landing/              ← YANGI: Landing page
    src/
      main.tsx          ← Entry point
      App.tsx           ← Router (agar kerak)
      sections/         ← Har section alohida component
        HeroSection.tsx
        PainPointsSection.tsx
        FeaturesSection.tsx
        DashboardPreview.tsx
        StatsSection.tsx
        PricingSection.tsx
        TestimonialsSection.tsx
        FAQSection.tsx
        CTASection.tsx
        FooterSection.tsx
      components/        ← Reusable UI
        Navbar.tsx
        DownloadBanner.tsx
        AnimatedCounter.tsx
        FeatureCard.tsx
        PricingCard.tsx
        TestimonialCard.tsx
        FAQItem.tsx
      hooks/
        useScrollAnimation.ts
        useCountUp.ts
      assets/
        screenshots/     ← Dashboard screenshot'lar
        icons/           ← Feature icons
    index.html
    package.json
    vite.config.ts
    tailwind.config.ts   ← (yoki @tailwindcss/vite)
```

---

# VAZIFALAR

## M-000 | QO'LDA QILINADIGAN ISHLAR (Manual)

### M-001 | Dashboard screenshot'lar tayyorlash | 30min
Real dashboard dan 4 ta professional screenshot olish:
1. DashboardPage — KPI kartochkalari
2. ProductPage — mahsulot tahlili
3. DiscoveryPage — trend discovery
4. SourcingPage — narx taqqoslash
Screenshot'lar `apps/landing/src/assets/screenshots/` ga saqlash.

### M-002 | Desktop installer build qilish | 20min
```bash
cd apps/desktop
pnpm run dist:win   # Windows .exe
pnpm run dist:mac   # macOS .dmg
```
Build'larni GitHub Releases ga yuklash yoki server'ga joylashtirish.

### M-003 | Testimonial ma'lumotlari to'plash | 1h
3-4 ta real yoki realistic testimonial yozish:
- Sotuvchi ismi, do'kon nomi
- Qisqa fikr (1-2 jumla)
- Rasm (placeholder avatar)

### M-004 | Domain va hosting sozlash | 30min
- Landing: `ventra.uz` (root domain)
- App: `app.ventra.uz` (subdomain)
- DNS: A record yoki CNAME sozlash
- SSL: Let's Encrypt yoki Cloudflare

---

## L-P0 | KRITIK — Loyiha setup va asosiy tuzilma

### L-001 | apps/landing/ monorepo package yaratish | 30min
1. `apps/landing/` directory yaratish
2. `package.json` — React 19, Vite 7, Tailwind v4, DaisyUI v5, Framer Motion
3. `vite.config.ts` — @tailwindcss/vite plugin
4. `index.html` — SEO meta taglar, OG taglar, favicon
5. `pnpm-workspace.yaml` ga `apps/landing` qo'shish
6. `turbo.json` ga landing build task qo'shish

### L-002 | Navbar component | 30min
- Logo + 5 ta navigatsiya link (Imkoniyatlar, Narxlar, FAQ, Desktop, Dashboard)
- Scroll effect: transparent → backdrop-blur
- Mobile: hamburger menu (DaisyUI drawer)
- "Dashboard" va "Kirish" CTA tugmalar
- Smooth scroll to section (#features, #pricing, #faq)

### L-003 | Hero Section | 1h
- Sarlavha + taglavha (marketing copy)
- 2 ta CTA tugma (Register + Download)
- Animated gradient mesh background (CSS yoki canvas)
- Dashboard screenshot mockup (laptop frame ichida)
- "1000+ sotuvchi ishonadi" social proof badge
- Responsive: mobile da screenshot pastga tushadi

### L-004 | Pain Points Section | 30min
- 3 ta "muammo → yechim" card
- Qizil (muammo) → yashil (yechim) rang o'tishi
- Scroll-triggered fade-in animatsiya (Framer Motion `useInView`)
- Icon + sarlavha + qisqa tavsif

### L-005 | Features Section (10 ta feature) | 45min
- 2x5 grid layout (desktop), 1 column (mobile)
- Har card: icon + nomi + qisqa tavsif
- Hover effect: gradient border + scale up
- Staggered entrance animatsiya (100ms delay har card)
- Heroicons yoki custom SVG ikonalar

### L-006 | Dashboard Preview Section | 45min
- Screenshot carousel (3-4 ta screenshot)
- Laptop/desktop frame mockup
- Caption har screenshot uchun
- Auto-rotate (5 soniyada) + manual navigation
- Parallax scroll effect

### L-007 | Stats Section (raqamlar) | 20min
- 4 ta animated counter (CountUp)
- Scroll trigger: faqat visible bo'lganda count boshlash
- Katta raqamlar + icon + label
- Gradient background

### L-008 | Pricing Section | 45min
- 3 ta tarif card (Starter, Pro, Enterprise)
- Pro card: highlighted, "Eng mashhur" badge
- Har tarif: narx, xususiyatlar ro'yxati, CTA tugma
- Toggle: oylik / yillik (20% chegirma)
- Hover lift animation

### L-009 | Testimonials Section | 30min
- 3-4 ta testimonial card
- Carousel/slider (auto-scroll)
- Avatar + ism + do'kon + fikr + reyting
- Smooth slide transition

### L-010 | FAQ Section | 20min
- 7 ta savol-javob
- Accordion (DaisyUI collapse)
- Smooth height transition
- Search/filter (optional)

### L-011 | CTA Section (final) | 20min
- Katta sarlavha + CTA tugma
- Dark background + gradient matn
- Pulsating button glow animatsiya
- "Bank kartasi talab qilinmaydi" matn

### L-012 | Footer Section | 20min
- 4 ustunli layout (Mahsulot, Kompaniya, Yordam, Ijtimoiy)
- Social media ikonalar (Telegram, Instagram, YouTube)
- Copyright + Maxfiylik siyosati link
- VENTRA logo

### L-013 | Download Banner (floating) | 20min
- Har section'da paydo bo'ladigan desktop download banner
- Windows + macOS tugmalar
- Versiya va hajm ma'lumoti
- Dismiss tugma (cookie bilan saqlab qo'yish)

---

## L-P1 | MUHIM — Animatsiya va polish

### L-014 | Framer Motion scroll animatsiyalar | 30min
- `useInView` hook bilan scroll-triggered animations
- Fade-in, slide-up, scale-in variantlari
- Staggered children animation
- Smooth page load entrance

### L-015 | Responsive dizayn (mobile + tablet) | 45min
- Mobile: 1 column layout, hamburger menu
- Tablet: 2 column feature grid
- Desktop: to'liq layout
- Touch-friendly: katta tugmalar, swipe gestures

### L-016 | SEO va Meta taglar | 20min
- Title: "VENTRA — Uzum.uz sotuvchilari uchun analytics"
- Description, keywords, OG taglar
- Structured data (JSON-LD)
- Sitemap.xml
- robots.txt

### L-017 | Performance optimizatsiya | 20min
- Image lazy loading
- Screenshot'larni WebP formatga aylantirish
- Font preloading (Inter, Space Grotesk)
- Bundle size < 200KB (gzip)
- Lighthouse score 90+

### L-018 | Dark/Light tema | 15min
- DaisyUI tema toggle
- System preference detect
- Cookie bilan saqlab qo'yish
- Barcha section'larda to'g'ri ranglar

---

## L-P2 | O'RTA — Qo'shimcha funksionallik

### L-019 | Email collection form | 20min
- "Yangiliklardan xabardor bo'ling" form
- Email validation
- Backend endpoint (yoki Mailchimp/ConvertKit integration)
- Success/error toast

### L-020 | Analytics integration | 15min
- Google Analytics 4 yoki Plausible
- UTM parameter tracking
- CTA click tracking
- Scroll depth tracking

### L-021 | Blog/Content section (optional) | 1h
- Statik blog sahifalari
- "Uzum sotuvchilari uchun maslahatlar" kontent
- SEO uchun muhim

### L-022 | Multi-language (uz/ru) | 30min
- i18n setup (uz va ru)
- Til almashtirish tugma
- Barcha matnlar tarjima qilingan

### L-023 | Docker + Nginx config | 20min
- `apps/landing/Dockerfile` yaratish
- Nginx static serve config
- `docker-compose.prod.yml` ga landing service qo'shish
- Railway deploy config

### L-024 | CI/CD — Landing deploy | 15min
- `.github/workflows/ci.yml` ga landing build + deploy qo'shish
- Railway service: `landing`
- Custom domain: `ventra.uz`

---

## XULOSA

| Kategoriya | Tasklar | Taxminiy vaqt |
|------------|---------|---------------|
| Manual (M) | 4 | 2h 20min |
| P0 — Setup + Sections | 13 | 7h |
| P1 — Animation + Polish | 5 | 2h 10min |
| P2 — Qo'shimcha | 6 | 2h 40min |
| **JAMI** | **28** | **~14h** |

---

*LandingTasks.md | VENTRA Analytics Platform | 2026-02-27*
