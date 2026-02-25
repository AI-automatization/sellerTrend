# UZUM TREND FINDER

## Full Risk Analysis & Mitigation Strategy

Version: v1--v4 Consolidated

------------------------------------------------------------------------

# 1. DATA SOURCE RISKS

## 1.1 Uzum GraphQL Structure Change

**Risk:** Uzum frontend GraphQL schema or response format changes.\
**Impact:** Scraping/parsing breaks → data pipeline stops.

### Mitigation

-   Create adapter layer (makeSearchAdapter, productPageAdapter,
    reviewsAdapter)
-   Store raw JSON samples for schema diff comparison
-   Add schema version monitoring
-   Graceful fallback parsing (minimal fields extraction)
-   Error rate monitoring with alerting

------------------------------------------------------------------------

## 1.2 Rate Limiting / Anti-bot Detection

**Risk:** Uzum introduces aggressive rate limits or bot detection.

### Mitigation

-   Strict internal rate control (1--2 req/sec)
-   Queue-based scheduling (BullMQ)
-   Retry with exponential backoff
-   Traffic smoothing (distributed snapshot timing)
-   Crawler health dashboard

------------------------------------------------------------------------

## 1.3 External Marketplace API Instability (Feature 43)

**Risk:** Alibaba/AliExpress/Amazon scraping breaks.

### Mitigation

-   Prefer official APIs (SerpApi, Shopping APIs)
-   Fallback multi-source aggregation
-   Store last valid price with timestamp
-   Confidence scoring system
-   Manual override in admin panel

------------------------------------------------------------------------

# 2. ARCHITECTURAL RISKS

## 2.1 Multi-Tenant Data Leak

**Risk:** One account sees another account's data.\
**Impact:** SaaS collapse.

### Mitigation

-   account_id enforced in every query
-   Prisma middleware tenant enforcement
-   Strict RBAC guard layer
-   Automated integration tests for tenant isolation

------------------------------------------------------------------------

## 2.2 Billing Bypass

**Risk:** User accesses API without payment.

### Mitigation

-   402 Payment Required middleware
-   Worker-level payment validation
-   Cron-based daily balance enforcement
-   Hard stop on queue execution if balance insufficient

------------------------------------------------------------------------

## 2.3 Worker Overload / Queue Explosion

**Risk:** Too many category scans or imports overload system.

### Mitigation

-   Per-account job quota
-   Concurrency limits in BullMQ
-   Priority queues
-   Worker autoscaling support
-   Redis health monitoring

------------------------------------------------------------------------

# 3. DATA INTEGRITY RISKS

## 3.1 Incorrect Snapshot Logic

**Risk:** Snapshot deltas computed incorrectly → false insights.

### Mitigation

-   Store raw lifetime orders
-   Store computed deltas separately
-   Unit tests for every scoring formula
-   Confidence levels on predictions

------------------------------------------------------------------------

## 3.2 Historical Archive Corruption (Feature 40)

**Risk:** Partition errors or archive loss.

### Mitigation

-   Monthly partition automation (pg_partman)
-   S3 replication
-   Weekly backup validation test
-   Snapshot checksum verification

------------------------------------------------------------------------

# 4. ANALYTICS RISKS

## 4.1 Weak Scoring Model

**Risk:** Winner detection unreliable → users lose trust.

### Mitigation

-   Combine multiple signals (weekly delta + rank + velocity)
-   Confidence scoring display
-   A/B testing of scoring formula
-   Continuous model tuning

------------------------------------------------------------------------

## 4.2 ML Overfitting (Feature 11)

**Risk:** Linear regression unreliable on volatile products.

### Mitigation

-   Use rolling window
-   Add confidence threshold
-   Fallback to "stable" label
-   Future upgrade path to Prophet/LSTM

------------------------------------------------------------------------

## 4.3 Algorithm Reverse Engineering Bias (Feature 42)

**Risk:** False conclusions about ranking factors.

### Mitigation

-   Minimum dataset threshold (10k+ snapshots)
-   Statistical significance tests
-   Monthly recalibration
-   Display "Estimated" disclaimer

------------------------------------------------------------------------

# 5. FINANCIAL RISKS

## 5.1 Incorrect Cargo Calculations (Feature 43b)

**Risk:** Wrong landed cost → user financial loss.

### Mitigation

-   Admin-managed cargo rates
-   Versioned customs tables
-   Clear "estimate only" disclaimer
-   Manual override support

------------------------------------------------------------------------

## 5.2 Currency Rate Volatility

**Risk:** Exchange rates outdated.

### Mitigation

-   Daily cron rate update (CBU official source)
-   Cache with timestamp
-   Force refresh option

------------------------------------------------------------------------

# 6. SECURITY RISKS

## 6.1 API Key Leakage

**Risk:** Developer API key exposure.

### Mitigation

-   Store only SHA-256 hash
-   Prefix-based identification
-   Rate limit per key
-   Key rotation support

------------------------------------------------------------------------

## 6.2 Telegram Auth Forgery (Feature 32)

**Risk:** Fake Telegram WebApp auth.

### Mitigation

-   HMAC validation with BOT_TOKEN
-   JWT short expiration
-   IP anomaly detection

------------------------------------------------------------------------

## 6.3 PDF Report Injection

**Risk:** XSS inside generated reports.

### Mitigation

-   Sanitize HTML blocks
-   Strict block type validation
-   Escape user-generated content

------------------------------------------------------------------------

# 7. PERFORMANCE RISKS

## 7.1 Category Scan Too Heavy

**Risk:** Full category scans overload DB.

### Mitigation

-   Progressive discovery (top N only)
-   Cached shortlist stage
-   Incremental crawling
-   Nighttime heavy jobs scheduling

------------------------------------------------------------------------

## 7.2 Real-time WebSocket Flood

**Risk:** Too many broadcast events.

### Mitigation

-   Room-based subscription
-   Debounce updates
-   Batch score updates

------------------------------------------------------------------------

# 8. PRODUCT RISKS

## 8.1 Feature Overload Before Monetization

**Risk:** Too many features before revenue.

### Mitigation

-   Strict phased roadmap (v1 → revenue first)
-   Moat features only after paying users
-   KPI-based feature release

------------------------------------------------------------------------

## 8.2 Low Retention

**Risk:** Users churn after 7 days.

### Mitigation

-   Alert-driven engagement
-   Weekly summary emails
-   ROI-focused dashboard
-   Visible value in first 10 minutes

------------------------------------------------------------------------

# 9. LEGAL & COMPLIANCE RISKS

## 9.1 Terms of Service Violations

**Risk:** Data source restrictions.

### Mitigation

-   Respect rate limits
-   Avoid bypass techniques
-   Use public data only
-   Add legal disclaimer

------------------------------------------------------------------------

## 9.2 Data Privacy

**Risk:** Improper storage of personal data.

### Mitigation

-   No personal review user data stored beyond necessary fields
-   Aggregate-only collective intelligence
-   GDPR-style delete endpoint

------------------------------------------------------------------------

# 10. STRATEGIC RISKS

## 10.1 Competitor Cloning

**Risk:** Someone copies idea.

### Mitigation

-   Historical data accumulation (time-based moat)
-   Collective intelligence network effect
-   Sourcing + Cargo integration uniqueness
-   Strong brand + SEO footprint

------------------------------------------------------------------------

# CONCLUSION

Major Strategic Moats: 1. Historical Data Archive (Time advantage) 2.
Collective Intelligence Signals 3. Sourcing + Cargo Landed Cost Engine
4. Full Seller Workflow Ecosystem

Critical Success Priorities: - Billing enforcement - Snapshot
reliability - Discovery engine strength - Early data accumulation

This document should be updated quarterly.
