# VENTRA Database Schema

> Auto-generated from `apps/api/prisma/schema.prisma` on 2026-03-08.
> Do not edit manually. Run `pnpm db:docs` to regenerate.

**Models:** 53 | **Enums:** 14 | **Relations:** 58

## Table of Contents

### Models

**AUTH / BILLING**
- [Account](#account) (`accounts`)
- [User](#user) (`users`)
- [Transaction](#transaction) (`transactions`)
- [AuditEvent](#auditevent) (`audit_events`)

**SYSTEM SETTINGS**
- [SystemSetting](#systemsetting) (`system_settings`)

**UZUM DATA**
- [Shop](#shop) (`shops`)
- [Product](#product) (`products`)
- [Sku](#sku) (`skus`)
- [ProductSnapshot](#productsnapshot) (`product_snapshots`)
- [ProductSnapshotDaily](#productsnapshotdaily) (`product_snapshot_daily`)
- [SkuSnapshot](#skusnapshot) (`sku_snapshots`)

**DISCOVERY**
- [CategoryRun](#categoryrun) (`category_runs`)
- [CategoryWinner](#categorywinner) (`category_winners`)
- [TrackedProduct](#trackedproduct) (`tracked_products`)

**ALERTS**
- [AlertRule](#alertrule) (`alert_rules`)
- [AlertEvent](#alertevent) (`alert_events`)

**AI TABLES**
- [ProductAiAttribute](#productaiattribute) (`product_ai_attributes`)

**SOURCING**
- [CurrencyRate](#currencyrate) (`currency_rates`)
- [CargoProvider](#cargoprovider) (`cargo_providers`)
- [ExternalPriceSearch](#externalpricesearch) (`external_price_searches`)
- [CargoCalculation](#cargocalculation) (`cargo_calculations`)

**EXTERNAL SOURCING**
- [ExternalPlatform](#externalplatform) (`external_platforms`)
- [ExternalSearchJob](#externalsearchjob) (`external_search_jobs`)
- [ExternalSearchResult](#externalsearchresult) (`external_search_results`)
- [ProductAiExplanation](#productaiexplanation) (`product_ai_explanations`)

**COMPETITOR TRACKING**
- [CompetitorTracking](#competitortracking) (`competitor_trackings`)
- [CompetitorPriceSnapshot](#competitorpricesnapshot) (`competitor_price_snapshots`)

**SEASONAL TRENDS**
- [SeasonalTrend](#seasonaltrend) (`seasonal_trends`)

**REFERRAL SYSTEM**
- [Referral](#referral) (`referrals`)

**API KEYS**
- [ApiKey](#apikey) (`api_keys`)

**TELEGRAM LINKING**
- [TelegramLink](#telegramlink) (`telegram_links`)

**CONSULTATIONS (Feature 15 — Konsultatsiya Marketplace)**
- [Consultation](#consultation) (`consultations`)

**PRICE TESTING (Feature 29 — A/B Price Testing)**
- [PriceTest](#pricetest) (`price_tests`)

**PRODUCT CHECKLIST (Feature 28 — Product Launch Checklist)**
- [ProductChecklist](#productchecklist) (`product_checklists`)

**ADS ROI TRACKING (Feature 31 — Uzum Ads ROI Tracker)**
- [AdCampaign](#adcampaign) (`ad_campaigns`)

**TEAM COLLABORATION (Feature 33)**
- [TeamInvite](#teaminvite) (`team_invites`)

**CUSTOM REPORTS (Feature 34 — Custom Report Builder)**
- [CustomReport](#customreport) (`custom_reports`)

**SHARED WATCHLIST (Feature 36 — Watchlist Sharing)**
- [SharedWatchlist](#sharedwatchlist) (`shared_watchlists`)

**COMMUNITY INTELLIGENCE (Feature 38)**
- [CommunityInsight](#communityinsight) (`community_insights`)
- [InsightVote](#insightvote) (`insight_votes`)

**USER ACTIVITY & SESSIONS (Admin v5)**
- [UserActivity](#useractivity) (`user_activities`)
- [UserSession](#usersession) (`user_sessions`)
- [PasswordReset](#passwordreset) (`password_resets`)

**NOTIFICATIONS (Admin v5)**
- [Notification](#notification) (`notifications`)

**FEEDBACK & CHAT (Admin v5)**
- [FeedbackTicket](#feedbackticket) (`feedback_tickets`)
- [FeedbackMessage](#feedbackmessage) (`feedback_messages`)

**NOTIFICATION TEMPLATES (Admin v6)**
- [NotificationTemplate](#notificationtemplate) (`notification_templates`)

**AI USAGE LOG (Admin v6 — Token & Cost Tracking)**
- [AiUsageLog](#aiusagelog) (`ai_usage_logs`)

**SYSTEM ERROR LOG (Admin v6 — Error Tracking)**
- [SystemError](#systemerror) (`system_errors`)

**SYSTEM MONITORING (Monitoring v1)**
- [SystemMetric](#systemmetric) (`system_metrics`)
- [CapacityBaseline](#capacitybaseline) (`capacity_baselines`)
- [SystemAlert](#systemalert) (`system_alerts`)

**PLATFORMS (Multi-marketplace support)**
- [Platform](#platform) (`platforms`)

### Other

- [Enums](#enums)
- [Relations](#relations)
- [ER Diagram](#entity-relationship-diagram)

---

## Models

#### AUTH / BILLING

### Account

**Table:** `accounts`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `name` | String | `@db.VarChar(255)` |  |
| `phone` | String? | `@db.VarChar(20)` |  |
| `status` | AccountStatus | `@default(ACTIVE)` |  |
| `balance` | BigInt | `@default(0)` |  |
| `daily_fee` | BigInt? |  | NULL = global default ishlatiladi |
| `ai_monthly_limit_usd` | Decimal? | `@db.Decimal(10, 2)` | NULL = unlimited, e.g. 5.00 |
| `plan` | String | `@default("FREE")` `@db.VarChar(20)` | FREE \| PRO \| MAX \| COMPANY |
| `plan_expires_at` | DateTime? | `@db.Timestamptz` | null = FREE (unlimited) |
| `analyses_used` | Int | `@default(0)` | monthly counter, reset on 1st |
| `plan_renewed_at` | DateTime? | `@db.Timestamptz` | last payment date |
| `onboarding_completed` | Boolean | `@default(false)` |  |
| `onboarding_step` | Int | `@default(0)` |  |
| `selected_marketplaces` | String[] | `@default(["uzum"])` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `referrals_from` | Referral[] | `@relation("referrer")` |  |
| `referrals_to` | Referral[] | `@relation("referred")` |  |
| `consultant_sessions` | Consultation[] | `@relation("consultant_sessions")` |  |
| `client_sessions` | Consultation[] | `@relation("client_sessions")` |  |

**Relations (back-references):**
- `users` -> `User[]`
- `transactions` -> `Transaction[]`
- `audit_events` -> `AuditEvent[]`
- `category_runs` -> `CategoryRun[]`
- `tracked_products` -> `TrackedProduct[]`
- `alert_rules` -> `AlertRule[]`
- `price_searches` -> `ExternalPriceSearch[]`
- `cargo_calculations` -> `CargoCalculation[]`
- `external_search_jobs` -> `ExternalSearchJob[]`
- `competitor_trackings` -> `CompetitorTracking[]`
- `api_keys` -> `ApiKey[]`
- `price_tests` -> `PriceTest[]`
- `product_checklists` -> `ProductChecklist[]`
- `ad_campaigns` -> `AdCampaign[]`
- `team_invites` -> `TeamInvite[]`
- `custom_reports` -> `CustomReport[]`
- `shared_watchlists` -> `SharedWatchlist[]`
- `community_insights` -> `CommunityInsight[]`
- `notifications` -> `Notification[]`
- `feedback_tickets` -> `FeedbackTicket[]`
- `user_activities` -> `UserActivity[]`
- `telegram_links` -> `TelegramLink[]`

### User

**Table:** `users`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `email` | String | `@unique` `@db.VarChar(255)` |  |
| `password_hash` | String | `@db.VarChar(255)` |  |
| `role` | UserRole | `@default(USER)` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `audit_events` -> `AuditEvent[]`
- `activities` -> `UserActivity[]`
- `sessions` -> `UserSession[]`
- `feedback_tickets` -> `FeedbackTicket[]`
- `feedback_messages` -> `FeedbackMessage[]`
- `password_resets` -> `PasswordReset[]`

**Indexes:**
- `[account_id]`

### Transaction

**Table:** `transactions`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `type` | TransactionType |  |  |
| `amount` | BigInt |  |  |
| `balance_before` | BigInt |  |  |
| `balance_after` | BigInt |  |  |
| `description` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

### AuditEvent

**Table:** `audit_events`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String? |  |  |
| `user_id` | String? |  |  |
| `action` | String | `@db.VarChar(100)` |  |
| `old_value` | Json? |  |  |
| `new_value` | Json? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account? | `@relation(fields: [account_id], references: [id], onDelete: SetNull)` |  |
| `user` | User? | `@relation(fields: [user_id], references: [id], onDelete: SetNull)` |  |

**Indexes:**
- `[account_id]`
- `[created_at]`

#### SYSTEM SETTINGS

### SystemSetting

**Table:** `system_settings`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `key` | String | `@id` `@db.VarChar(100)` |  |
| `value` | String | `@db.Text` |  |
| `updated_at` | DateTime | `@default(now())` `@updatedAt` `@db.Timestamptz` |  |

#### UZUM DATA

### Shop

**Table:** `shops`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | BigInt | `@id` |  |
| `title` | String? | `@db.VarChar(500)` |  |
| `rating` | Decimal? | `@db.Decimal(3, 2)` |  |
| `orders_quantity` | BigInt? |  |  |
| `registered_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |

**Relations (back-references):**
- `products` -> `Product[]`

### Product

**Table:** `products`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | BigInt | `@id` |  |
| `sku_group_id` | BigInt? |  |  |
| `shop_id` | BigInt? |  |  |
| `title` | String | `@db.Text` |  |
| `title_uz` | String? | `@db.Text` | Key 1: uzbekcha nom |
| `category_id` | BigInt? |  |  |
| `category_path` | Json? |  | Key 2: [{id,title}] root→leaf |
| `badges` | Json? |  | Key 3: [{type?,label?,backgroundColor?,textColor?}] |
| `rating` | Decimal? | `@db.Decimal(3, 2)` |  |
| `feedback_quantity` | Int? | `@default(0)` |  |
| `orders_quantity` | BigInt? | `@default(0)` |  |
| `total_available_amount` | BigInt? |  |  |
| `photo_url` | String? | `@db.Text` | Key 13: asosiy rasm |
| `photo_urls` | String[] |  | Key 14: barcha rasmlar |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `shop` | Shop? | `@relation(fields: [shop_id], references: [id])` |  |
| `competitors_from` | CompetitorTracking[] | `@relation("product_competitors")` |  |
| `competitors_of` | CompetitorTracking[] | `@relation("competitor_of")` |  |

**Relations (back-references):**
- `skus` -> `Sku[]`
- `snapshots` -> `ProductSnapshot[]`
- `daily_snapshots` -> `ProductSnapshotDaily[]`
- `tracked_by` -> `TrackedProduct[]`
- `category_winners` -> `CategoryWinner[]`
- `alert_rules` -> `AlertRule[]`
- `alert_events` -> `AlertEvent[]`
- `ai_attributes` -> `ProductAiAttribute?`
- `ai_explanations` -> `ProductAiExplanation[]`
- `external_search_jobs` -> `ExternalSearchJob[]`
- `price_tests` -> `PriceTest[]`

**Indexes:**
- `[category_id, is_active]`

### Sku

**Table:** `skus`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | BigInt | `@id` |  |
| `product_id` | BigInt |  |  |
| `min_sell_price` | BigInt? |  |  |
| `min_full_price` | BigInt? |  |  |
| `stock_type` | String? | `@db.VarChar(10)` |  |
| `is_available` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `sku_snapshots` -> `SkuSnapshot[]`

### ProductSnapshot

**Table:** `product_snapshots`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `product_id` | BigInt |  |  |
| `orders_quantity` | BigInt? |  |  |
| `weekly_bought` | Int? |  |  |
| `weekly_bought_source` | String? | `@db.VarChar(20)` | 'scraped' \| 'calculated' \| 'stored_scraped' |
| `weekly_bought_raw_text` | String? | `@db.Text` | original banner text for debugging |
| `weekly_bought_confidence` | Decimal? | `@db.Decimal(3,2)` | 0.00–1.00 scrape strategy confidence |
| `rating` | Decimal? | `@db.Decimal(3, 2)` |  |
| `feedback_quantity` | Int? |  |  |
| `score` | Decimal? | `@db.Decimal(8, 4)` |  |
| `score_version` | Int | `@default(2)` | scoring formula version (T-388) |
| `snapshot_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `snapshot_bucket` | DateTime? | `@db.Timestamptz` | GENERATED ALWAYS AS (5-min truncation) — DB managed |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `ai_explanations` -> `ProductAiExplanation[]`

**Indexes:**
- `[product_id, snapshot_at]`

**Unique constraints:**
- `[product_id, snapshot_bucket]`

### ProductSnapshotDaily

**Table:** `product_snapshot_daily`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `product_id` | BigInt |  |  |
| `day` | DateTime | `@db.Date` | aggregation day |
| `avg_score` | Decimal? | `@db.Decimal(8, 4)` |  |
| `max_weekly_bought` | Int? |  |  |
| `avg_rating` | Decimal? | `@db.Decimal(3, 2)` |  |
| `max_orders` | BigInt? |  |  |
| `min_price` | BigInt? |  | lowest SKU sell_price that day |
| `snapshot_count` | Int | `@default(1)` | how many raw snapshots aggregated |
| `score_version` | Int | `@default(2)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[product_id, day]`

**Unique constraints:**
- `[product_id, day]`

### SkuSnapshot

**Table:** `sku_snapshots`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `sku_id` | BigInt |  |  |
| `sell_price` | BigInt? |  |  |
| `full_price` | BigInt? |  |  |
| `discount_percent` | Int? |  |  |
| `discount_badge` | String? | `@db.VarChar(100)` | Key 8: "-15%" kabi string badge |
| `charge_price` | BigInt? |  | Key 9: oylik muddatli to'lov (so'm) |
| `charge_quantity` | Int? |  | Key 10: asosiy variant oylari (12) |
| `charge_quantity_alt` | Int? |  | Key 11: qo'shimcha variant oylari (24) |
| `stock_type` | String? | `@db.VarChar(10)` |  |
| `snapshot_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `sku` | Sku | `@relation(fields: [sku_id], references: [id], onDelete: Cascade)` |  |

#### DISCOVERY

### CategoryRun

**Table:** `category_runs`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `category_id` | BigInt |  |  |
| `category_name` | String? | `@db.VarChar(255)` |  |
| `status` | CategoryRunStatus | `@default(PENDING)` |  |
| `total_products` | Int? |  |  |
| `processed` | Int | `@default(0)` |  |
| `started_at` | DateTime? | `@db.Timestamptz` |  |
| `finished_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `winners` -> `CategoryWinner[]`

**Indexes:**
- `[account_id]`
- `[created_at]`

### CategoryWinner

**Table:** `category_winners`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `run_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `score` | Decimal? | `@db.Decimal(8, 4)` |  |
| `rank` | Int? |  |  |
| `weekly_bought` | Int? |  |  |
| `orders_quantity` | BigInt? |  |  |
| `sell_price` | BigInt? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `run` | CategoryRun | `@relation(fields: [run_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

### TrackedProduct

**Table:** `tracked_products`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `is_active` | Boolean | `@default(true)` |  |
| `next_scrape_at` | DateTime? | `@db.Timestamptz` |  |
| `last_scraped_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[created_at]`
- `[next_scrape_at]`

**Unique constraints:**
- `[account_id, product_id]`

#### ALERTS

### AlertRule

**Table:** `alert_rules`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `rule_type` | AlertType |  |  |
| `threshold` | Decimal? | `@db.Decimal(10, 2)` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `events` -> `AlertEvent[]`

**Indexes:**
- `[account_id]`

### AlertEvent

**Table:** `alert_events`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `rule_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `message` | String? | `@db.Text` |  |
| `delivered_at` | DateTime? | `@db.Timestamptz` |  |
| `triggered_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `rule` | AlertRule | `@relation(fields: [rule_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[delivered_at]`

#### AI TABLES

### ProductAiAttribute

**Table:** `product_ai_attributes`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `product_id` | BigInt | `@unique` |  |
| `brand` | String? | `@db.VarChar(255)` |  |
| `model` | String? | `@db.VarChar(255)` |  |
| `type` | String? | `@db.VarChar(255)` |  |
| `color` | String? | `@db.VarChar(255)` |  |
| `raw_json` | Json? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

#### SOURCING

### CurrencyRate

**Table:** `currency_rates`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `from_code` | String | `@db.VarChar(10)` | USD, CNY, EUR |
| `to_code` | String | `@db.VarChar(10)` | UZS |
| `rate` | Decimal | `@db.Decimal(20, 4)` |  |
| `updated_at` | DateTime | `@default(now())` `@updatedAt` `@db.Timestamptz` |  |

**Unique constraints:**
- `[from_code, to_code]`

### CargoProvider

**Table:** `cargo_providers`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `name` | String | `@db.VarChar(255)` |  |
| `origin` | String | `@db.VarChar(10)` | CN, EU |
| `destination` | String | `@db.VarChar(10)` | UZ |
| `method` | String | `@db.VarChar(50)` | AVIA, CARGO, RAIL, AUTO, TURKEY |
| `rate_per_kg` | Decimal | `@db.Decimal(10, 2)` | USD per kg |
| `delivery_days` | Int |  |  |
| `min_weight_kg` | Decimal? | `@db.Decimal(10, 2)` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Relations (back-references):**
- `calculations` -> `CargoCalculation[]`

### ExternalPriceSearch

**Table:** `external_price_searches`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `query` | String | `@db.VarChar(500)` |  |
| `source` | String | `@db.VarChar(50)` | ALIBABA, ALIEXPRESS, SERPAPI |
| `results` | Json? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

### CargoCalculation

**Table:** `cargo_calculations`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `provider_id` | String? |  |  |
| `job_id` | String? |  |  |
| `result_id` | String? |  |  |
| `item_name` | String? | `@db.VarChar(500)` |  |
| `item_cost_usd` | Decimal | `@db.Decimal(20, 2)` |  |
| `weight_kg` | Decimal | `@db.Decimal(10, 2)` |  |
| `quantity` | Int |  |  |
| `customs_rate` | Decimal | `@db.Decimal(5, 4)` | 0.10 = 10% |
| `vat_rate` | Decimal | `@db.Decimal(5, 4)` | 0.12 = 12% |
| `cargo_cost_usd` | Decimal | `@db.Decimal(20, 2)` |  |
| `customs_usd` | Decimal | `@db.Decimal(20, 2)` |  |
| `vat_usd` | Decimal | `@db.Decimal(20, 2)` |  |
| `landed_cost_usd` | Decimal | `@db.Decimal(20, 2)` |  |
| `landed_cost_uzs` | Decimal | `@db.Decimal(20, 2)` |  |
| `sell_price_uzs` | Decimal? | `@db.Decimal(20, 2)` |  |
| `gross_margin` | Decimal? | `@db.Decimal(8, 4)` |  |
| `roi` | Decimal? | `@db.Decimal(8, 4)` |  |
| `usd_rate` | Decimal | `@db.Decimal(20, 4)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `provider` | CargoProvider? | `@relation(fields: [provider_id], references: [id])` |  |
| `job` | ExternalSearchJob? | `@relation(fields: [job_id], references: [id], onDelete: Cascade)` |  |
| `result` | ExternalSearchResult? | `@relation(fields: [result_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### EXTERNAL SOURCING

### ExternalPlatform

**Table:** `external_platforms`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `code` | String | `@unique` `@db.VarChar(50)` | "alibaba", "1688", "taobao", "aliexpress", "amazon_de" |
| `name` | String | `@db.VarChar(100)` |  |
| `country` | String | `@db.VarChar(10)` | "CN", "DE", "US" |
| `base_url` | String | `@db.VarChar(255)` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `api_type` | String | `@db.VarChar(30)` | "serpapi", "affiliate", "playwright", "direct" |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Relations (back-references):**
- `search_results` -> `ExternalSearchResult[]`

### ExternalSearchJob

**Table:** `external_search_jobs`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `query` | String | `@db.Text` |  |
| `status` | ExternalSearchStatus | `@default(PENDING)` |  |
| `platforms` | String[] |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `finished_at` | DateTime? | `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `results` -> `ExternalSearchResult[]`
- `cargo_calculations` -> `CargoCalculation[]`

**Indexes:**
- `[account_id]`

### ExternalSearchResult

**Table:** `external_search_results`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `job_id` | String |  |  |
| `platform_id` | String |  |  |
| `external_id` | String? | `@db.VarChar(255)` |  |
| `title` | String | `@db.Text` |  |
| `price_usd` | Decimal | `@db.Decimal(12, 2)` |  |
| `price_local` | Decimal? | `@db.Decimal(12, 2)` |  |
| `currency` | String | `@db.VarChar(5)` |  |
| `url` | String | `@db.Text` |  |
| `image_url` | String? | `@db.Text` |  |
| `seller_name` | String? | `@db.VarChar(255)` |  |
| `seller_rating` | Decimal? | `@db.Decimal(3, 2)` |  |
| `min_order_qty` | Int? | `@default(1)` |  |
| `shipping_days` | Int? |  |  |
| `ai_match_score` | Decimal? | `@db.Decimal(4, 3)` | 0.000 - 1.000 |
| `ai_notes` | String? | `@db.Text` |  |
| `rank` | Int? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `job` | ExternalSearchJob | `@relation(fields: [job_id], references: [id], onDelete: Cascade)` |  |
| `platform` | ExternalPlatform | `@relation(fields: [platform_id], references: [id])` |  |

**Relations (back-references):**
- `cargo_calculations` -> `CargoCalculation[]`

### ProductAiExplanation

**Table:** `product_ai_explanations`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `product_id` | BigInt |  |  |
| `snapshot_id` | String? |  |  |
| `explanation` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |
| `snapshot` | ProductSnapshot? | `@relation(fields: [snapshot_id], references: [id], onDelete: Cascade)` |  |

#### COMPETITOR TRACKING

### CompetitorTracking

**Table:** `competitor_trackings`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `competitor_product_id` | BigInt |  |  |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation("product_competitors", fields: [product_id], references: [id], onDelete: Cascade)` |  |
| `competitor` | Product | `@relation("competitor_of", fields: [competitor_product_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `snapshots` -> `CompetitorPriceSnapshot[]`

**Unique constraints:**
- `[account_id, product_id, competitor_product_id]`

### CompetitorPriceSnapshot

**Table:** `competitor_price_snapshots`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `tracking_id` | String |  |  |
| `sell_price` | BigInt? |  |  |
| `full_price` | BigInt? |  |  |
| `discount_pct` | Int? | `@default(0)` |  |
| `snapshot_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `tracking` | CompetitorTracking | `@relation(fields: [tracking_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[tracking_id, snapshot_at]`

#### SEASONAL TRENDS

### SeasonalTrend

**Table:** `seasonal_trends`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `category_id` | BigInt? |  |  |
| `season_name` | String | `@db.VarChar(100)` |  |
| `season_start` | Int |  | month (1-12) |
| `season_end` | Int |  | month (1-12) |
| `avg_score_boost` | Decimal? | `@db.Decimal(4, 2)` |  |
| `peak_week` | Int? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

#### REFERRAL SYSTEM

### Referral

**Table:** `referrals`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `referrer_account_id` | String |  |  |
| `referred_account_id` | String? |  |  |
| `code` | String | `@unique` `@db.VarChar(20)` |  |
| `status` | ReferralStatus | `@default(PENDING)` |  |
| `reward_days` | Int | `@default(7)` |  |
| `credited_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `referrer` | Account | `@relation("referrer", fields: [referrer_account_id], references: [id], onDelete: Cascade)` |  |
| `referred` | Account? | `@relation("referred", fields: [referred_account_id], references: [id], onDelete: SetNull)` |  |

**Indexes:**
- `[referrer_account_id]`

#### API KEYS

### ApiKey

**Table:** `api_keys`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `name` | String | `@db.VarChar(100)` |  |
| `key_prefix` | String | `@db.VarChar(12)` |  |
| `key_hash` | String | `@db.VarChar(64)` |  |
| `daily_limit` | Int | `@default(1000)` |  |
| `requests_today` | Int | `@default(0)` |  |
| `last_used_at` | DateTime? | `@db.Timestamptz` |  |
| `last_reset_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### TELEGRAM LINKING

### TelegramLink

**Table:** `telegram_links`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `chat_id` | String | `@unique` `@db.VarChar(50)` |  |
| `username` | String? | `@db.VarChar(100)` |  |
| `linked_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `is_active` | Boolean | `@default(true)` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### CONSULTATIONS (Feature 15 — Konsultatsiya Marketplace)

### Consultation

**Table:** `consultations`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `consultant_id` | String |  |  |
| `client_id` | String? |  |  |
| `title` | String | `@db.VarChar(255)` |  |
| `description` | String? | `@db.Text` |  |
| `category` | String | `@db.VarChar(100)` |  |
| `price_uzs` | BigInt |  |  |
| `duration_min` | Int | `@default(60)` |  |
| `status` | ConsultationStatus | `@default(AVAILABLE)` |  |
| `scheduled_at` | DateTime? | `@db.Timestamptz` |  |
| `completed_at` | DateTime? | `@db.Timestamptz` |  |
| `rating` | Decimal? | `@db.Decimal(2, 1)` |  |
| `review` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `consultant` | Account | `@relation("consultant_sessions", fields: [consultant_id], references: [id])` |  |
| `client` | Account? | `@relation("client_sessions", fields: [client_id], references: [id])` |  |

#### PRICE TESTING (Feature 29 — A/B Price Testing)

### PriceTest

**Table:** `price_tests`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt |  |  |
| `original_price` | BigInt |  |  |
| `test_price` | BigInt |  |  |
| `status` | PriceTestStatus | `@default(PLANNED)` |  |
| `start_date` | DateTime? | `@db.Timestamptz` |  |
| `end_date` | DateTime? | `@db.Timestamptz` |  |
| `original_sales` | Int | `@default(0)` |  |
| `test_sales` | Int | `@default(0)` |  |
| `original_revenue` | BigInt | `@default(0)` |  |
| `test_revenue` | BigInt | `@default(0)` |  |
| `conclusion` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `product` | Product | `@relation(fields: [product_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### PRODUCT CHECKLIST (Feature 28 — Product Launch Checklist)

### ProductChecklist

**Table:** `product_checklists`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt? |  |  |
| `title` | String | `@db.VarChar(255)` |  |
| `items` | Json | `@default("[]")` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### ADS ROI TRACKING (Feature 31 — Uzum Ads ROI Tracker)

### AdCampaign

**Table:** `ad_campaigns`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `product_id` | BigInt? |  |  |
| `name` | String | `@db.VarChar(255)` |  |
| `platform` | String | `@db.VarChar(50)` `@default("uzum")` |  |
| `budget_uzs` | BigInt | `@default(0)` |  |
| `spent_uzs` | BigInt | `@default(0)` |  |
| `impressions` | Int | `@default(0)` |  |
| `clicks` | Int | `@default(0)` |  |
| `conversions` | Int | `@default(0)` |  |
| `revenue_uzs` | BigInt | `@default(0)` |  |
| `status` | AdCampaignStatus | `@default(ACTIVE)` |  |
| `start_date` | DateTime? | `@db.Timestamptz` |  |
| `end_date` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### TEAM COLLABORATION (Feature 33)

### TeamInvite

**Table:** `team_invites`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `email` | String | `@db.VarChar(255)` |  |
| `role` | UserRole | `@default(USER)` |  |
| `token` | String | `@unique` `@db.VarChar(64)` |  |
| `status` | InviteStatus | `@default(PENDING)` |  |
| `invited_by` | String |  |  |
| `expires_at` | DateTime | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### CUSTOM REPORTS (Feature 34 — Custom Report Builder)

### CustomReport

**Table:** `custom_reports`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `title` | String | `@db.VarChar(255)` |  |
| `description` | String? | `@db.Text` |  |
| `report_type` | String | `@db.VarChar(50)` | "product", "category", "shop", "market" |
| `filters` | Json | `@default("{}")` |  |
| `columns` | Json | `@default("[]")` |  |
| `schedule` | String? | `@db.VarChar(50)` | "daily", "weekly", "monthly" |
| `last_run_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### SHARED WATCHLIST (Feature 36 — Watchlist Sharing)

### SharedWatchlist

**Table:** `shared_watchlists`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `name` | String | `@db.VarChar(255)` |  |
| `description` | String? | `@db.Text` |  |
| `product_ids` | Json | `@default("[]")` |  |
| `is_public` | Boolean | `@default(false)` |  |
| `share_token` | String? | `@unique` `@db.VarChar(64)` |  |
| `views` | Int | `@default(0)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[account_id]`

#### COMMUNITY INTELLIGENCE (Feature 38)

### CommunityInsight

**Table:** `community_insights`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `title` | String | `@db.VarChar(255)` |  |
| `content` | String | `@db.Text` |  |
| `category` | String | `@db.VarChar(100)` |  |
| `upvotes` | Int | `@default(0)` |  |
| `downvotes` | Int | `@default(0)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `votes` -> `InsightVote[]`

**Indexes:**
- `[account_id]`

### InsightVote

**Table:** `insight_votes`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `insight_id` | String |  |  |
| `account_id` | String |  |  |
| `vote` | Int |  | +1 or -1 |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `insight` | CommunityInsight | `@relation(fields: [insight_id], references: [id], onDelete: Cascade)` |  |

**Unique constraints:**
- `[insight_id, account_id]`

#### USER ACTIVITY & SESSIONS (Admin v5)

### UserActivity

**Table:** `user_activities`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `user_id` | String |  |  |
| `account_id` | String |  |  |
| `action` | String | `@db.VarChar(50)` |  |
| `details` | Json? |  |  |
| `ip` | String? | `@db.VarChar(45)` |  |
| `user_agent` | String? | `@db.VarChar(500)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `user` | User | `@relation(fields: [user_id], references: [id], onDelete: Cascade)` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[user_id, created_at]`
- `[account_id, created_at]`

### UserSession

**Table:** `user_sessions`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `user_id` | String |  |  |
| `refresh_token_hash` | String? | `@db.VarChar(128)` |  |
| `expires_at` | DateTime? | `@db.Timestamptz` |  |
| `revoked_at` | DateTime? | `@db.Timestamptz` |  |
| `ip` | String? | `@db.VarChar(45)` |  |
| `user_agent` | String? | `@db.VarChar(500)` |  |
| `device_type` | String? | `@db.VarChar(50)` |  |
| `logged_in_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `user` | User | `@relation(fields: [user_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[user_id, logged_in_at]`
- `[refresh_token_hash]`

### PasswordReset

**Table:** `password_resets`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `user_id` | String |  |  |
| `token_hash` | String | `@db.VarChar(64)` |  |
| `expires_at` | DateTime | `@db.Timestamptz` |  |
| `used_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `user` | User | `@relation(fields: [user_id], references: [id], onDelete: Cascade)` |  |

**Indexes:**
- `[token_hash]`
- `[user_id]`

#### NOTIFICATIONS (Admin v5)

### Notification

**Table:** `notifications`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String? |  |  |
| `message` | String | `@db.VarChar(500)` |  |
| `type` | String | `@db.VarChar(20)` `@default("info")` |  |
| `is_read` | Boolean | `@default(false)` |  |
| `created_by` | String? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `account` | Account? | `@relation(fields: [account_id], references: [id])` |  |

**Indexes:**
- `[account_id, is_read]`
- `[created_at]`

#### FEEDBACK & CHAT (Admin v5)

### FeedbackTicket

**Table:** `feedback_tickets`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String |  |  |
| `user_id` | String |  |  |
| `subject` | String | `@db.VarChar(200)` |  |
| `type` | FeedbackType | `@default(OTHER)` |  |
| `priority` | FeedbackPriority | `@default(MEDIUM)` |  |
| `status` | FeedbackStatus | `@default(OPEN)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |
| `account` | Account | `@relation(fields: [account_id], references: [id], onDelete: Cascade)` |  |
| `user` | User | `@relation(fields: [user_id], references: [id], onDelete: Cascade)` |  |

**Relations (back-references):**
- `messages` -> `FeedbackMessage[]`

**Indexes:**
- `[account_id, status]`
- `[status, created_at]`

### FeedbackMessage

**Table:** `feedback_messages`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `ticket_id` | String |  |  |
| `sender_id` | String |  |  |
| `content` | String | `@db.Text` |  |
| `is_admin` | Boolean | `@default(false)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `ticket` | FeedbackTicket | `@relation(fields: [ticket_id], references: [id], onDelete: Cascade)` |  |
| `sender` | User | `@relation(fields: [sender_id], references: [id])` |  |

**Indexes:**
- `[ticket_id, created_at]`

#### NOTIFICATION TEMPLATES (Admin v6)

### NotificationTemplate

**Table:** `notification_templates`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `name` | String | `@db.VarChar(100)` |  |
| `message` | String | `@db.VarChar(500)` |  |
| `type` | String | `@db.VarChar(20)` `@default("info")` |  |
| `created_by` | String? |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |
| `updated_at` | DateTime | `@updatedAt` `@db.Timestamptz` |  |

#### AI USAGE LOG (Admin v6 — Token & Cost Tracking)

### AiUsageLog

**Table:** `ai_usage_logs`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `account_id` | String? |  |  |
| `user_id` | String? |  |  |
| `method` | String | `@db.VarChar(50)` |  |
| `model` | String | `@db.VarChar(50)` |  |
| `input_tokens` | Int | `@default(0)` |  |
| `output_tokens` | Int | `@default(0)` |  |
| `cost_usd` | Decimal | `@db.Decimal(10, 6)` `@default(0)` |  |
| `product_id` | String? | `@db.VarChar(50)` |  |
| `duration_ms` | Int? |  |  |
| `error` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Indexes:**
- `[created_at]`
- `[account_id, created_at]`

#### SYSTEM ERROR LOG (Admin v6 — Error Tracking)

### SystemError

**Table:** `system_errors`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `endpoint` | String | `@db.VarChar(255)` |  |
| `method` | String | `@db.VarChar(10)` |  |
| `status` | Int |  |  |
| `message` | String | `@db.Text` |  |
| `stack` | String? | `@db.Text` |  |
| `account_id` | String? |  |  |
| `user_id` | String? |  |  |
| `ip` | String? | `@db.VarChar(45)` |  |
| `user_agent` | String? | `@db.VarChar(500)` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Indexes:**
- `[created_at]`
- `[endpoint, created_at]`
- `[account_id, created_at]`

#### SYSTEM MONITORING (Monitoring v1)

### SystemMetric

**Table:** `system_metrics`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `heap_used_mb` | Float |  |  |
| `heap_total_mb` | Float |  |  |
| `rss_mb` | Float |  |  |
| `external_mb` | Float |  |  |
| `cpu_pct` | Float |  |  |
| `active_requests` | Int |  |  |
| `peak_concurrent` | Int |  |  |
| `event_loop_lag_ms` | Float |  |  |
| `db_pool_active` | Int |  |  |
| `queue_depths` | Json |  |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Indexes:**
- `[created_at]`

### CapacityBaseline

**Table:** `capacity_baselines`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `label` | String | `@db.VarChar(200)` |  |
| `commit_hash` | String? | `@db.VarChar(40)` |  |
| `heap_idle_mb` | Float |  |  |
| `heap_loaded_mb` | Float |  |  |
| `rss_mb` | Float |  |  |
| `estimated_max_users` | Int |  |  |
| `event_loop_lag_ms` | Float |  |  |
| `notes` | String? | `@db.Text` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

### SystemAlert

**Table:** `system_alerts`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `level` | String | `@db.VarChar(20)` |  |
| `type` | String | `@db.VarChar(50)` |  |
| `message` | String | `@db.Text` |  |
| `value` | Float |  |  |
| `threshold` | Float |  |  |
| `resolved_at` | DateTime? | `@db.Timestamptz` |  |
| `created_at` | DateTime | `@default(now())` `@db.Timestamptz` |  |

**Indexes:**
- `[created_at]`
- `[type, level]`

#### PLATFORMS (Multi-marketplace support)

### Platform

**Table:** `platforms`

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `id` | String | `@id` `@default(uuid())` |  |
| `slug` | String | `@unique` | "uzum", "wildberries", "ozon" |
| `name` | String |  | "Uzum Market", "Wildberries" |
| `is_active` | Boolean | `@default(false)` |  |
| `coming_soon` | Boolean | `@default(true)` |  |
| `logo_url` | String? |  |  |
| `created_at` | DateTime | `@default(now())` |  |

---

## Enums

### AccountStatus

| Value |
|-------|
| `ACTIVE` |
| `PAYMENT_DUE` |
| `SUSPENDED` |

### UserRole

| Value |
|-------|
| `SUPER_ADMIN` |
| `ADMIN` |
| `MODERATOR` |
| `USER` |

### TransactionType

| Value |
|-------|
| `CHARGE` |
| `DEPOSIT` |
| `REFUND` |
| `SUBSCRIPTION` |
| `PLAN_CHANGE` |

### CategoryRunStatus

| Value |
|-------|
| `PENDING` |
| `RUNNING` |
| `DONE` |
| `FAILED` |

### AlertType

| Value |
|-------|
| `PRICE_DROP` |
| `STOCK_LOW` |
| `SCORE_SPIKE` |

### ExternalSearchStatus

| Value |
|-------|
| `PENDING` |
| `RUNNING` |
| `DONE` |
| `FAILED` |

### ReferralStatus

| Value |
|-------|
| `PENDING` |
| `ACTIVE` |
| `EXPIRED` |

### ConsultationStatus

| Value |
|-------|
| `AVAILABLE` |
| `BOOKED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |

### PriceTestStatus

| Value |
|-------|
| `PLANNED` |
| `RUNNING` |
| `COMPLETED` |
| `CANCELLED` |

### AdCampaignStatus

| Value |
|-------|
| `DRAFT` |
| `ACTIVE` |
| `PAUSED` |
| `COMPLETED` |

### InviteStatus

| Value |
|-------|
| `PENDING` |
| `ACCEPTED` |
| `EXPIRED` |

### FeedbackType

| Value |
|-------|
| `BUG` |
| `FEATURE` |
| `QUESTION` |
| `OTHER` |

### FeedbackPriority

| Value |
|-------|
| `LOW` |
| `MEDIUM` |
| `HIGH` |

### FeedbackStatus

| Value |
|-------|
| `OPEN` |
| `IN_PROGRESS` |
| `RESOLVED` |
| `CLOSED` |

---

## Relations

| From | To | FK Field | On Delete | Relation Name |
|------|----|----------|-----------|---------------|
| User | Account | `account_id` | Cascade | - |
| Transaction | Account | `account_id` | Cascade | - |
| AuditEvent | Account | `account_id` | SetNull | - |
| AuditEvent | User | `user_id` | SetNull | - |
| Product | Shop | `shop_id` | none | - |
| Sku | Product | `product_id` | Cascade | - |
| ProductSnapshot | Product | `product_id` | Cascade | - |
| ProductSnapshotDaily | Product | `product_id` | Cascade | - |
| SkuSnapshot | Sku | `sku_id` | Cascade | - |
| CategoryRun | Account | `account_id` | Cascade | - |
| CategoryWinner | CategoryRun | `run_id` | Cascade | - |
| CategoryWinner | Product | `product_id` | Cascade | - |
| TrackedProduct | Account | `account_id` | Cascade | - |
| TrackedProduct | Product | `product_id` | Cascade | - |
| AlertRule | Account | `account_id` | Cascade | - |
| AlertRule | Product | `product_id` | Cascade | - |
| AlertEvent | AlertRule | `rule_id` | Cascade | - |
| AlertEvent | Product | `product_id` | Cascade | - |
| ProductAiAttribute | Product | `product_id` | Cascade | - |
| ExternalPriceSearch | Account | `account_id` | Cascade | - |
| CargoCalculation | Account | `account_id` | Cascade | - |
| CargoCalculation | CargoProvider | `provider_id` | none | - |
| CargoCalculation | ExternalSearchJob | `job_id` | Cascade | - |
| CargoCalculation | ExternalSearchResult | `result_id` | Cascade | - |
| ExternalSearchJob | Account | `account_id` | Cascade | - |
| ExternalSearchJob | Product | `product_id` | Cascade | - |
| ExternalSearchResult | ExternalSearchJob | `job_id` | Cascade | - |
| ExternalSearchResult | ExternalPlatform | `platform_id` | none | - |
| ProductAiExplanation | Product | `product_id` | Cascade | - |
| ProductAiExplanation | ProductSnapshot | `snapshot_id` | Cascade | - |
| CompetitorTracking | Account | `account_id` | Cascade | - |
| CompetitorTracking | Product | `product_id` | Cascade | product_competitors |
| CompetitorTracking | Product | `competitor_product_id` | Cascade | competitor_of |
| CompetitorPriceSnapshot | CompetitorTracking | `tracking_id` | Cascade | - |
| Referral | Account | `referrer_account_id` | Cascade | referrer |
| Referral | Account | `referred_account_id` | SetNull | referred |
| ApiKey | Account | `account_id` | Cascade | - |
| TelegramLink | Account | `account_id` | Cascade | - |
| Consultation | Account | `consultant_id` | none | consultant_sessions |
| Consultation | Account | `client_id` | none | client_sessions |
| PriceTest | Account | `account_id` | Cascade | - |
| PriceTest | Product | `product_id` | Cascade | - |
| ProductChecklist | Account | `account_id` | Cascade | - |
| AdCampaign | Account | `account_id` | Cascade | - |
| TeamInvite | Account | `account_id` | Cascade | - |
| CustomReport | Account | `account_id` | Cascade | - |
| SharedWatchlist | Account | `account_id` | Cascade | - |
| CommunityInsight | Account | `account_id` | Cascade | - |
| InsightVote | CommunityInsight | `insight_id` | Cascade | - |
| UserActivity | User | `user_id` | Cascade | - |
| UserActivity | Account | `account_id` | Cascade | - |
| UserSession | User | `user_id` | Cascade | - |
| PasswordReset | User | `user_id` | Cascade | - |
| Notification | Account | `account_id` | none | - |
| FeedbackTicket | Account | `account_id` | Cascade | - |
| FeedbackTicket | User | `user_id` | Cascade | - |
| FeedbackMessage | FeedbackTicket | `ticket_id` | Cascade | - |
| FeedbackMessage | User | `sender_id` | none | - |

---

## Entity-Relationship Diagram

```mermaid
erDiagram
    %% --- AUTH / BILLING ---
    Account {
        string id PK
        string name
        string phone
        accountstatus status
        bigint balance
        bigint daily_fee
        decimal ai_monthly_limit_usd
        string plan
        datetime plan_expires_at
        int analyses_used
        datetime plan_renewed_at
        boolean onboarding_completed
        int onboarding_step
        string selected_marketplaces
        datetime created_at
    }
    User {
        string id PK
        string account_id FK
        string email
        string password_hash
        userrole role
        boolean is_active
        datetime created_at
    }
    Transaction {
        string id PK
        string account_id FK
        transactiontype type
        bigint amount
        bigint balance_before
        bigint balance_after
        string description
        datetime created_at
    }
    AuditEvent {
        string id PK
        string account_id FK
        string user_id FK
        string action
        json old_value
        json new_value
        datetime created_at
    }
    %% --- SYSTEM SETTINGS ---
    SystemSetting {
        string key PK
        string value
        datetime updated_at
    }
    %% --- UZUM DATA ---
    Shop {
        bigint id PK
        string title
        decimal rating
        bigint orders_quantity
        datetime registered_at
        datetime created_at
        datetime updated_at
    }
    Product {
        bigint id PK
        bigint sku_group_id FK
        bigint shop_id FK
        string title
        string title_uz
        bigint category_id FK
        json category_path
        json badges
        decimal rating
        int feedback_quantity
        bigint orders_quantity
        bigint total_available_amount
        string photo_url
        string photo_urls
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    Sku {
        bigint id PK
        bigint product_id FK
        bigint min_sell_price
        bigint min_full_price
        string stock_type
        boolean is_available
        datetime created_at
    }
    ProductSnapshot {
        string id PK
        bigint product_id FK
        bigint orders_quantity
        int weekly_bought
        string weekly_bought_source
        string weekly_bought_raw_text
        decimal weekly_bought_confidence
        decimal rating
        int feedback_quantity
        decimal score
        int score_version
        datetime snapshot_at
        datetime snapshot_bucket
    }
    ProductSnapshotDaily {
        string id PK
        bigint product_id FK
        datetime day
        decimal avg_score
        int max_weekly_bought
        decimal avg_rating
        bigint max_orders
        bigint min_price
        int snapshot_count
        int score_version
    }
    SkuSnapshot {
        string id PK
        bigint sku_id FK
        bigint sell_price
        bigint full_price
        int discount_percent
        string discount_badge
        bigint charge_price
        int charge_quantity
        int charge_quantity_alt
        string stock_type
        datetime snapshot_at
    }
    %% --- DISCOVERY ---
    CategoryRun {
        string id PK
        string account_id FK
        bigint category_id FK
        string category_name
        categoryrunstatus status
        int total_products
        int processed
        datetime started_at
        datetime finished_at
        datetime created_at
    }
    CategoryWinner {
        string id PK
        string run_id FK
        bigint product_id FK
        decimal score
        int rank
        int weekly_bought
        bigint orders_quantity
        bigint sell_price
        datetime created_at
    }
    TrackedProduct {
        string id PK
        string account_id FK
        bigint product_id FK
        boolean is_active
        datetime next_scrape_at
        datetime last_scraped_at
        datetime created_at
    }
    %% --- ALERTS ---
    AlertRule {
        string id PK
        string account_id FK
        bigint product_id FK
        alerttype rule_type
        decimal threshold
        boolean is_active
        datetime created_at
    }
    AlertEvent {
        string id PK
        string rule_id FK
        bigint product_id FK
        string message
        datetime delivered_at
        datetime triggered_at
    }
    %% --- AI TABLES ---
    ProductAiAttribute {
        string id PK
        bigint product_id FK
        string brand
        string model
        string type
        string color
        json raw_json
        datetime created_at
    }
    %% --- SOURCING ---
    CurrencyRate {
        string id PK
        string from_code
        string to_code
        decimal rate
        datetime updated_at
    }
    CargoProvider {
        string id PK
        string name
        string origin
        string destination
        string method
        decimal rate_per_kg
        int delivery_days
        decimal min_weight_kg
        boolean is_active
        datetime created_at
    }
    ExternalPriceSearch {
        string id PK
        string account_id FK
        string query
        string source
        json results
        datetime created_at
    }
    CargoCalculation {
        string id PK
        string account_id FK
        string provider_id FK
        string job_id FK
        string result_id FK
        string item_name
        decimal item_cost_usd
        decimal weight_kg
        int quantity
        decimal customs_rate
        decimal vat_rate
        decimal cargo_cost_usd
        decimal customs_usd
        decimal vat_usd
        decimal landed_cost_usd
        decimal landed_cost_uzs
        decimal sell_price_uzs
        decimal gross_margin
        decimal roi
        decimal usd_rate
        datetime created_at
    }
    %% --- EXTERNAL SOURCING ---
    ExternalPlatform {
        string id PK
        string code
        string name
        string country
        string base_url
        boolean is_active
        string api_type
        datetime created_at
    }
    ExternalSearchJob {
        string id PK
        string account_id FK
        bigint product_id FK
        string query
        externalsearchstatus status
        string platforms
        datetime created_at
        datetime finished_at
    }
    ExternalSearchResult {
        string id PK
        string job_id FK
        string platform_id FK
        string external_id FK
        string title
        decimal price_usd
        decimal price_local
        string currency
        string url
        string image_url
        string seller_name
        decimal seller_rating
        int min_order_qty
        int shipping_days
        decimal ai_match_score
        string ai_notes
        int rank
        datetime created_at
    }
    ProductAiExplanation {
        string id PK
        bigint product_id FK
        string snapshot_id FK
        string explanation
        datetime created_at
    }
    %% --- COMPETITOR TRACKING ---
    CompetitorTracking {
        string id PK
        string account_id FK
        bigint product_id FK
        bigint competitor_product_id FK
        boolean is_active
        datetime created_at
    }
    CompetitorPriceSnapshot {
        string id PK
        string tracking_id FK
        bigint sell_price
        bigint full_price
        int discount_pct
        datetime snapshot_at
    }
    %% --- SEASONAL TRENDS ---
    SeasonalTrend {
        string id PK
        bigint category_id FK
        string season_name
        int season_start
        int season_end
        decimal avg_score_boost
        int peak_week
        datetime created_at
    }
    %% --- REFERRAL SYSTEM ---
    Referral {
        string id PK
        string referrer_account_id FK
        string referred_account_id FK
        string code
        referralstatus status
        int reward_days
        datetime credited_at
        datetime created_at
    }
    %% --- API KEYS ---
    ApiKey {
        string id PK
        string account_id FK
        string name
        string key_prefix
        string key_hash
        int daily_limit
        int requests_today
        datetime last_used_at
        datetime last_reset_at
        boolean is_active
        datetime created_at
    }
    %% --- TELEGRAM LINKING ---
    TelegramLink {
        string id PK
        string account_id FK
        string chat_id FK
        string username
        datetime linked_at
        boolean is_active
    }
    %% --- CONSULTATIONS (Feature 15 — Konsultatsiya Marketplace) ---
    Consultation {
        string id PK
        string consultant_id FK
        string client_id FK
        string title
        string description
        string category
        bigint price_uzs
        int duration_min
        consultationstatus status
        datetime scheduled_at
        datetime completed_at
        decimal rating
        string review
        datetime created_at
    }
    %% --- PRICE TESTING (Feature 29 — A/B Price Testing) ---
    PriceTest {
        string id PK
        string account_id FK
        bigint product_id FK
        bigint original_price
        bigint test_price
        priceteststatus status
        datetime start_date
        datetime end_date
        int original_sales
        int test_sales
        bigint original_revenue
        bigint test_revenue
        string conclusion
        datetime created_at
    }
    %% --- PRODUCT CHECKLIST (Feature 28 — Product Launch Checklist) ---
    ProductChecklist {
        string id PK
        string account_id FK
        bigint product_id FK
        string title
        json items
        datetime created_at
        datetime updated_at
    }
    %% --- ADS ROI TRACKING (Feature 31 — Uzum Ads ROI Tracker) ---
    AdCampaign {
        string id PK
        string account_id FK
        bigint product_id FK
        string name
        string platform
        bigint budget_uzs
        bigint spent_uzs
        int impressions
        int clicks
        int conversions
        bigint revenue_uzs
        adcampaignstatus status
        datetime start_date
        datetime end_date
        datetime created_at
        datetime updated_at
    }
    %% --- TEAM COLLABORATION (Feature 33) ---
    TeamInvite {
        string id PK
        string account_id FK
        string email
        userrole role
        string token
        invitestatus status
        string invited_by
        datetime expires_at
        datetime created_at
    }
    %% --- CUSTOM REPORTS (Feature 34 — Custom Report Builder) ---
    CustomReport {
        string id PK
        string account_id FK
        string title
        string description
        string report_type
        json filters
        json columns
        string schedule
        datetime last_run_at
        datetime created_at
        datetime updated_at
    }
    %% --- SHARED WATCHLIST (Feature 36 — Watchlist Sharing) ---
    SharedWatchlist {
        string id PK
        string account_id FK
        string name
        string description
        json product_ids
        boolean is_public
        string share_token
        int views
        datetime created_at
        datetime updated_at
    }
    %% --- COMMUNITY INTELLIGENCE (Feature 38) ---
    CommunityInsight {
        string id PK
        string account_id FK
        string title
        string content
        string category
        int upvotes
        int downvotes
        datetime created_at
    }
    InsightVote {
        string id PK
        string insight_id FK
        string account_id FK
        int vote
        datetime created_at
    }
    %% --- USER ACTIVITY & SESSIONS (Admin v5) ---
    UserActivity {
        string id PK
        string user_id FK
        string account_id FK
        string action
        json details
        string ip
        string user_agent
        datetime created_at
    }
    UserSession {
        string id PK
        string user_id FK
        string refresh_token_hash
        datetime expires_at
        datetime revoked_at
        string ip
        string user_agent
        string device_type
        datetime logged_in_at
    }
    PasswordReset {
        string id PK
        string user_id FK
        string token_hash
        datetime expires_at
        datetime used_at
        datetime created_at
    }
    %% --- NOTIFICATIONS (Admin v5) ---
    Notification {
        string id PK
        string account_id FK
        string message
        string type
        boolean is_read
        string created_by
        datetime created_at
    }
    %% --- FEEDBACK & CHAT (Admin v5) ---
    FeedbackTicket {
        string id PK
        string account_id FK
        string user_id FK
        string subject
        feedbacktype type
        feedbackpriority priority
        feedbackstatus status
        datetime created_at
        datetime updated_at
    }
    FeedbackMessage {
        string id PK
        string ticket_id FK
        string sender_id FK
        string content
        boolean is_admin
        datetime created_at
    }
    %% --- NOTIFICATION TEMPLATES (Admin v6) ---
    NotificationTemplate {
        string id PK
        string name
        string message
        string type
        string created_by
        datetime created_at
        datetime updated_at
    }
    %% --- AI USAGE LOG (Admin v6 — Token & Cost Tracking) ---
    AiUsageLog {
        string id PK
        string account_id FK
        string user_id FK
        string method
        string model
        int input_tokens
        int output_tokens
        decimal cost_usd
        string product_id FK
        int duration_ms
        string error
        datetime created_at
    }
    %% --- SYSTEM ERROR LOG (Admin v6 — Error Tracking) ---
    SystemError {
        string id PK
        string endpoint
        string method
        int status
        string message
        string stack
        string account_id FK
        string user_id FK
        string ip
        string user_agent
        datetime created_at
    }
    %% --- SYSTEM MONITORING (Monitoring v1) ---
    SystemMetric {
        string id PK
        float heap_used_mb
        float heap_total_mb
        float rss_mb
        float external_mb
        float cpu_pct
        int active_requests
        int peak_concurrent
        float event_loop_lag_ms
        int db_pool_active
        json queue_depths
        datetime created_at
    }
    CapacityBaseline {
        string id PK
        string label
        string commit_hash
        float heap_idle_mb
        float heap_loaded_mb
        float rss_mb
        int estimated_max_users
        float event_loop_lag_ms
        string notes
        datetime created_at
    }
    SystemAlert {
        string id PK
        string level
        string type
        string message
        float value
        float threshold
        datetime resolved_at
        datetime created_at
    }
    %% --- PLATFORMS (Multi-marketplace support) ---
    Platform {
        string id PK
        string slug
        string name
        boolean is_active
        boolean coming_soon
        string logo_url
        datetime created_at
    }

    Account ||--o{ User : "account_id"
    Account ||--o{ Transaction : "account_id"
    Account ||--o{ AuditEvent : "account_id"
    User ||--o{ AuditEvent : "user_id"
    Shop ||--o{ Product : "shop_id"
    Product ||--o{ Sku : "product_id"
    Product ||--o{ ProductSnapshot : "product_id"
    Product ||--o{ ProductSnapshotDaily : "product_id"
    Sku ||--o{ SkuSnapshot : "sku_id"
    Account ||--o{ CategoryRun : "account_id"
    CategoryRun ||--o{ CategoryWinner : "run_id"
    Product ||--o{ CategoryWinner : "product_id"
    Account ||--o{ TrackedProduct : "account_id"
    Product ||--o{ TrackedProduct : "product_id"
    Account ||--o{ AlertRule : "account_id"
    Product ||--o{ AlertRule : "product_id"
    AlertRule ||--o{ AlertEvent : "rule_id"
    Product ||--o{ AlertEvent : "product_id"
    Product ||--o{ ProductAiAttribute : "product_id"
    Account ||--o{ ExternalPriceSearch : "account_id"
    Account ||--o{ CargoCalculation : "account_id"
    CargoProvider ||--o{ CargoCalculation : "provider_id"
    ExternalSearchJob ||--o{ CargoCalculation : "job_id"
    ExternalSearchResult ||--o{ CargoCalculation : "result_id"
    Account ||--o{ ExternalSearchJob : "account_id"
    Product ||--o{ ExternalSearchJob : "product_id"
    ExternalSearchJob ||--o{ ExternalSearchResult : "job_id"
    ExternalPlatform ||--o{ ExternalSearchResult : "platform_id"
    Product ||--o{ ProductAiExplanation : "product_id"
    ProductSnapshot ||--o{ ProductAiExplanation : "snapshot_id"
    Account ||--o{ CompetitorTracking : "account_id"
    Product ||--o{ CompetitorTracking : "product_competitors"
    Product ||--o{ CompetitorTracking : "competitor_of"
    CompetitorTracking ||--o{ CompetitorPriceSnapshot : "tracking_id"
    Account ||--o{ Referral : "referrer"
    Account ||--o{ Referral : "referred"
    Account ||--o{ ApiKey : "account_id"
    Account ||--o{ TelegramLink : "account_id"
    Account ||--o{ Consultation : "consultant_sessions"
    Account ||--o{ Consultation : "client_sessions"
    Account ||--o{ PriceTest : "account_id"
    Product ||--o{ PriceTest : "product_id"
    Account ||--o{ ProductChecklist : "account_id"
    Account ||--o{ AdCampaign : "account_id"
    Account ||--o{ TeamInvite : "account_id"
    Account ||--o{ CustomReport : "account_id"
    Account ||--o{ SharedWatchlist : "account_id"
    Account ||--o{ CommunityInsight : "account_id"
    CommunityInsight ||--o{ InsightVote : "insight_id"
    User ||--o{ UserActivity : "user_id"
    Account ||--o{ UserActivity : "account_id"
    User ||--o{ UserSession : "user_id"
    User ||--o{ PasswordReset : "user_id"
    Account ||--o{ Notification : "account_id"
    Account ||--o{ FeedbackTicket : "account_id"
    User ||--o{ FeedbackTicket : "user_id"
    FeedbackTicket ||--o{ FeedbackMessage : "ticket_id"
    User ||--o{ FeedbackMessage : "sender_id"
```

---

*Generated by `scripts/generate-db-docs.ts` | 2026-03-08*
