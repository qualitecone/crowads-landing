# CROWADS — Specifica Tecnica per Developer

**Versione**: 1.0 (Product-Ready, NON MVP)
**Data**: 21 giugno 2026
**Destinatario**: Lead Developer / Engineering Team
**Owner prodotto**: Alessandro Pavan (Qualitec FZE)
**Stato target**: Production-Ready entro 90 giorni dall'inizio sviluppo

---

> **Nota di lettura**: questo documento descrive il PRODOTTO COMPLETO. Non è un MVP. Ogni feature elencata deve essere implementata, testata e in produzione prima del go-live commerciale. La complessità totale stimata: ~3.500 ore engineering, equivalenti a 4 developer senior × 5 mesi, o 2 developer senior × 10 mesi.

---

## INDICE

1. Overview architetturale
2. Stack tecnologico
3. Modello dati (Database schema)
4. Componenti backend
5. API endpoints (REST + WebHook)
6. Componenti frontend
7. Integrazione piattaforme ads (Meta, Google, TikTok)
8. Integrazione provider revenue (Stripe, Shopify, custom)
9. Sistema tracking & attribution
10. Sistema escrow & pagamenti
11. Auth, KYC, AML
12. Multi-tenancy, multi-currency, i18n
13. Dashboard investitori
14. Dashboard startup
15. Admin panel
16. Auto-Pilot algorithm
17. Notifiche & comunicazioni
18. Compliance & audit logging
19. Infrastructure, deployment, monitoring
20. Testing strategy
21. Security requirements
22. Performance requirements
23. Roadmap implementazione

---

## 1. OVERVIEW ARCHITETTURALE

### 1.1 Architettura macro

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                            │
│  Web App (Next.js) · Mobile PWA · Investor Dashboard · Startup  │
│  Dashboard · Admin Panel                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────┐
│                       API GATEWAY                                │
│  Cloudflare · WAF · Rate Limit · Auth · Cache                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                    APPLICATION LAYER                             │
│  Node.js (Fastify) · Auth Service · Campaign Service ·          │
│  Ads Execution Service · Tracking Service · Payment Service ·    │
│  Notification Service · KYC Service · Admin Service              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                       DATA LAYER                                 │
│  PostgreSQL (primary) · Redis (cache, queue) · S3 (assets) ·    │
│  ClickHouse (analytics) · Vault (secrets)                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXTERNAL SERVICES                              │
│  Meta Ads API · Google Ads API · TikTok Ads API · Stripe ·      │
│  Shopify · Sumsub (KYC) · SendGrid (mail) · Twilio (SMS) ·     │
│  Resend · Cloudflare R2                                          │
└──────────────────────────────────────────────────────────────────┘
```

### 1.2 Microservizi separati

| Servizio | Responsabilità | Linguaggio | DB |
|---|---|---|---|
| **auth-service** | Login, signup, JWT, 2FA, KYC | Node.js | PostgreSQL |
| **campaign-service** | CRUD campagne, lifecycle, escrow | Node.js | PostgreSQL |
| **ads-execution-service** | Creazione/gestione ads su piattaforme | Node.js | PostgreSQL |
| **tracking-service** | UTM, pixel, attribution model | Node.js + ClickHouse | ClickHouse |
| **payment-service** | Pagamenti in entrata e in uscita | Node.js | PostgreSQL |
| **notification-service** | Email, push, in-app, SMS | Node.js | Redis |
| **admin-service** | Backoffice operatore | Node.js | PostgreSQL |
| **analytics-service** | Report e dashboard | Node.js | ClickHouse |
| **mario-bridge** | Integrazione Mario AI per creativi | Node.js | (call Mario API) |

---

## 2. STACK TECNOLOGICO

### 2.1 Backend

- **Runtime**: Node.js 22 LTS (ESM)
- **Framework**: Fastify 5.x
- **Type system**: TypeScript 5.5+ in modalità strict
- **ORM**: Prisma 6.x con PostgreSQL
- **Validation**: Zod 4.x per schemi runtime
- **Queue**: BullMQ con Redis
- **Cache**: Redis 7.x
- **Logging**: Pino con OpenTelemetry
- **Testing**: Vitest + Playwright

### 2.2 Frontend

- **Framework**: Next.js 15.x (App Router, RSC)
- **UI**: shadcn/ui + Tailwind CSS 4.x
- **State**: Zustand per client state, TanStack Query per server state
- **Charts**: Recharts + custom D3 components
- **Forms**: React Hook Form + Zod
- **i18n**: next-intl
- **Auth**: NextAuth.js v5 (Auth.js) con custom adapter

### 2.3 Database

- **Primary**: PostgreSQL 17 (Neon o Supabase managed)
- **Analytics**: ClickHouse Cloud (per attribution events ad alto volume)
- **Cache/queue**: Redis 7.x (Upstash managed)
- **Object storage**: Cloudflare R2 (compatibile S3)
- **Search**: Meilisearch (per ricerca campagne, startup, investitori)
- **Secrets vault**: HashiCorp Vault o AWS Secrets Manager

### 2.4 Infrastructure

- **Hosting backend**: Fly.io o Railway (multi-region, EU + UAE)
- **Hosting frontend**: Vercel (Edge Network)
- **DNS/CDN/WAF**: Cloudflare
- **Container orchestration**: opzionale K8s (Hetzner managed) per scala
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (errors) + Grafana Cloud (metrics) + Better Stack (uptime)

### 2.5 External services

| Servizio | Uso | Costo stimato |
|---|---|---|
| Meta Ads API | Esecuzione ads Facebook/Instagram | Gratis (no markup) |
| Google Ads API | Esecuzione ads Google | Gratis (no markup) |
| TikTok Ads API | Esecuzione ads TikTok | Gratis (no markup) |
| LinkedIn Ads API | Esecuzione ads LinkedIn B2B | Gratis (no markup) |
| Stripe | Payments + Connect per split | 1.4% + €0.25 |
| Sumsub | KYC/AML | €1.5/verifica |
| Resend | Transactional email | $20/mese (50k email) |
| Twilio | SMS 2FA + alert | $0.05/SMS |
| SendGrid | Marketing email backup | $89/mese |
| Cloudflare | CDN + WAF + R2 | $20-200/mese |
| Sentry | Error tracking | $26/mese |
| Vercel Pro | Frontend hosting | $20/seat |
| PostgreSQL (Neon) | DB managed | $19-69/mese |
| ClickHouse Cloud | Analytics DB | $80-300/mese |
| Upstash Redis | Cache/queue | $10-100/mese |
| Better Stack | Uptime | $25/mese |

**Costo infrastructure stimato a regime (1.000 campagne attive)**: $500-1.500/mese.

---

## 3. MODELLO DATI (DATABASE SCHEMA)

### 3.1 Tabelle principali (PostgreSQL)

#### `users`
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  full_name TEXT NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('investor', 'startup', 'admin')),
  country_code CHAR(2) NOT NULL,
  language CHAR(2) NOT NULL DEFAULT 'en',
  phone TEXT,
  two_fa_enabled BOOLEAN DEFAULT FALSE,
  two_fa_secret_encrypted TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected')),
  kyc_provider TEXT,
  kyc_external_id TEXT,
  kyc_completed_at TIMESTAMPTZ,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type_status ON users(user_type, account_status);
```

#### `investor_profiles`
```sql
CREATE TABLE investor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_accredited BOOLEAN DEFAULT FALSE,
  risk_profile TEXT NOT NULL DEFAULT 'medium' CHECK (risk_profile IN ('low', 'medium', 'high')),
  auto_pilot_enabled BOOLEAN DEFAULT FALSE,
  auto_pilot_budget_eur DECIMAL(12,2),
  preferred_verticals TEXT[],
  excluded_verticals TEXT[],
  total_invested_eur DECIMAL(14,2) DEFAULT 0,
  total_returned_eur DECIMAL(14,2) DEFAULT 0,
  fiscal_id TEXT,
  bank_iban TEXT,
  crypto_wallet TEXT,
  source_of_funds_declaration TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `startup_profiles`
```sql
CREATE TABLE startup_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  legal_form TEXT,
  vat_number TEXT,
  registration_number TEXT,
  website TEXT NOT NULL,
  vertical TEXT NOT NULL,
  founded_year INT,
  team_size INT,
  founder_name TEXT NOT NULL,
  founder_linkedin TEXT,
  brand_book_url TEXT,
  pitch_deck_url TEXT,
  monthly_revenue_eur DECIMAL(12,2),
  gross_margin_pct DECIMAL(5,2),
  customer_ltv_eur DECIMAL(10,2),
  target_cac_eur DECIMAL(10,2),
  tier TEXT NOT NULL DEFAULT 'silver' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  rating_score DECIMAL(3,2),
  total_campaigns_count INT DEFAULT 0,
  total_capital_raised_eur DECIMAL(14,2) DEFAULT 0,
  total_revenue_share_paid_eur DECIMAL(14,2) DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `campaigns`
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  startup_id UUID NOT NULL REFERENCES startup_profiles(user_id),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  vertical TEXT NOT NULL,
  geo_targeting TEXT[] NOT NULL,
  
  budget_target_eur DECIMAL(12,2) NOT NULL,
  budget_min_eur DECIMAL(12,2) NOT NULL,
  budget_raised_eur DECIMAL(14,2) DEFAULT 0,
  
  revenue_share_pct DECIMAL(5,2) NOT NULL,
  attribution_window_days INT NOT NULL DEFAULT 90,
  campaign_duration_days INT NOT NULL DEFAULT 90,
  revenue_share_duration_months INT NOT NULL DEFAULT 12,
  
  expected_roas DECIMAL(5,2),
  expected_cac_eur DECIMAL(10,2),
  expected_investor_premium_pct DECIMAL(5,2),
  
  ad_platforms TEXT[] NOT NULL,
  brand_assets_url TEXT,
  buyer_persona JSONB,
  
  setup_fee_eur DECIMAL(10,2) NOT NULL,
  management_fee_pct DECIMAL(5,2) NOT NULL DEFAULT 7.0,
  performance_bonus_threshold_roas DECIMAL(5,2) DEFAULT 3.0,
  performance_bonus_pct DECIMAL(5,2) DEFAULT 50.0,
  
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'open_for_funding', 'fully_funded', 
    'awaiting_ads_launch', 'ads_running', 'ads_completed', 
    'attribution_phase', 'completed', 'cancelled', 'failed'
  )),
  
  funding_open_at TIMESTAMPTZ,
  funding_close_at TIMESTAMPTZ,
  ads_launch_at TIMESTAMPTZ,
  ads_end_at TIMESTAMPTZ,
  attribution_end_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_startup ON campaigns(startup_id);
CREATE INDEX idx_campaigns_vertical ON campaigns(vertical);
```

#### `subscriptions`
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  investor_id UUID NOT NULL REFERENCES investor_profiles(user_id),
  amount_eur DECIMAL(12,2) NOT NULL,
  share_pct DECIMAL(8,5) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('manual', 'auto_pilot')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'paid', 'in_escrow', 'committed', 'distributing', 'completed', 'refunded', 'cancelled'
  )),
  payment_method TEXT NOT NULL,
  payment_provider_ref TEXT,
  paid_at TIMESTAMPTZ,
  committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, investor_id)
);

CREATE INDEX idx_subs_campaign ON subscriptions(campaign_id);
CREATE INDEX idx_subs_investor ON subscriptions(investor_id);
```

#### `ad_accounts`
```sql
CREATE TABLE ad_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok', 'linkedin', 'pinterest', 'snapchat', 'x')),
  external_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active',
  daily_spend_limit_eur DECIMAL(10,2),
  monthly_spend_limit_eur DECIMAL(12,2),
  current_month_spent_eur DECIMAL(12,2) DEFAULT 0,
  health_score DECIMAL(3,2),
  last_health_check_at TIMESTAMPTZ,
  credentials_vault_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(platform, external_account_id)
);
```

#### `ad_campaigns_external`
```sql
CREATE TABLE ad_campaigns_external (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  ad_account_id UUID NOT NULL REFERENCES ad_accounts(id),
  platform TEXT NOT NULL,
  external_campaign_id TEXT,
  external_ad_set_id TEXT,
  status TEXT NOT NULL,
  budget_allocated_eur DECIMAL(10,2) NOT NULL,
  budget_spent_eur DECIMAL(10,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  revenue_attributed_eur DECIMAL(14,2) DEFAULT 0,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `tracking_events` (ClickHouse, NOT PostgreSQL — high volume)
```sql
CREATE TABLE tracking_events (
  event_id UUID,
  campaign_id UUID,
  event_type Enum8('click'=1, 'view'=2, 'conversion'=3, 'purchase'=4, 'refund'=5),
  ad_platform LowCardinality(String),
  utm_source LowCardinality(String),
  utm_medium LowCardinality(String),
  utm_campaign LowCardinality(String),
  utm_content String,
  user_anonymous_id String,
  user_id Nullable(UUID),
  ip String,
  user_agent String,
  country_code FixedString(2),
  referrer String,
  url String,
  revenue_eur Nullable(Decimal(14,2)),
  currency_original Nullable(FixedString(3)),
  revenue_original Nullable(Decimal(14,2)),
  metadata String,  -- JSON
  timestamp DateTime64(3, 'UTC'),
  ingested_at DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (campaign_id, timestamp, event_id);
```

#### `revenue_attributions`
```sql
CREATE TABLE revenue_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  tracking_event_id UUID NOT NULL,
  external_order_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('stripe', 'shopify', 'woocommerce', 'custom_sdk')),
  revenue_gross_eur DECIMAL(12,2) NOT NULL,
  revenue_net_eur DECIMAL(12,2) NOT NULL,
  attributed_at TIMESTAMPTZ NOT NULL,
  refunded BOOLEAN DEFAULT FALSE,
  refunded_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, external_order_id)
);

CREATE INDEX idx_rev_attr_campaign ON revenue_attributions(campaign_id);
CREATE INDEX idx_rev_attr_attributed_at ON revenue_attributions(attributed_at);
```

#### `revenue_share_payments`
```sql
CREATE TABLE revenue_share_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  period_year INT NOT NULL,
  period_month INT NOT NULL,
  revenue_attributed_eur DECIMAL(14,2) NOT NULL,
  revenue_share_due_eur DECIMAL(14,2) NOT NULL,
  startup_paid_at TIMESTAMPTZ,
  startup_payment_ref TEXT,
  platform_fee_eur DECIMAL(14,2) NOT NULL,
  performance_bonus_eur DECIMAL(14,2) DEFAULT 0,
  distributable_to_investors_eur DECIMAL(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'invoiced', 'partially_paid', 'paid', 'distributed', 'overdue'
  )),
  invoiced_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(campaign_id, period_year, period_month)
);
```

#### `distributions`
```sql
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_share_payment_id UUID NOT NULL REFERENCES revenue_share_payments(id),
  investor_id UUID NOT NULL REFERENCES investor_profiles(user_id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_eur DECIMAL(14,2) NOT NULL,
  share_pct DECIMAL(8,5) NOT NULL,
  payment_method TEXT,
  payment_ref TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'queued', 'sent', 'failed', 'completed'
  )),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `escrow_transactions`
```sql
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  subscription_id UUID REFERENCES subscriptions(id),
  type TEXT NOT NULL CHECK (type IN (
    'deposit', 'commit_to_campaign', 'ad_spend', 'refund', 'distribution', 'fee'
  )),
  amount_eur DECIMAL(14,2) NOT NULL,
  bank_ref TEXT,
  description TEXT,
  balance_after_eur DECIMAL(14,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `audit_log`
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'admin', 'system', 'integration')),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);
```

### 3.2 Tabelle ausiliarie

- `notifications` — notifiche in-app
- `email_log` — log invii email
- `sms_log` — log invii SMS
- `webhooks_inbound` — log webhook ricevuti (Stripe, Shopify)
- `webhooks_outbound` — log webhook inviati
- `verticals` — anagrafica verticali supportate
- `countries` — anagrafica paesi supportati
- `currencies` — tassi di cambio aggiornati
- `support_tickets`
- `support_messages`
- `feature_flags` — gestione rollout graduale

---

## 4. COMPONENTI BACKEND (dettaglio servizi)

### 4.1 auth-service

**Responsabilità:**
- Registrazione utente (investor / startup)
- Login con email/password + 2FA TOTP
- Magic link login (opzionale)
- Gestione sessioni JWT (access + refresh)
- Password reset flow
- Email verification
- KYC orchestration (chiamate a Sumsub)
- Rate limiting su tentativi login

**Endpoints**: `/auth/signup`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/verify-email`, `/auth/reset-password`, `/auth/2fa/enable`, `/auth/2fa/verify`, `/auth/kyc/start`, `/auth/kyc/webhook`

**Sicurezza**:
- Password Argon2id, mai bcrypt
- JWT access 15min, refresh 30gg
- Refresh token rotation
- Lockout dopo 5 tentativi falliti in 15min
- Notifica email su login da nuovo device/IP

### 4.2 campaign-service

**Responsabilità:**
- CRUD campagne
- Lifecycle state machine (draft → pending_review → open_for_funding → ...)
- Validation business logic (budget min, durata, vertical eligibility)
- Calcolo statistiche campagna in tempo reale
- Webhook a notification-service su cambio stato
- Gestione assets startup (brand assets, creativi, persona)
- Approval workflow per admin

**State machine campagna:**
```
draft → pending_review → open_for_funding → fully_funded → 
awaiting_ads_launch → ads_running → ads_completed → 
attribution_phase → completed

Cancellazioni possibili da: draft, pending_review, open_for_funding (con rimborso)
Failure transitions: open_for_funding → cancelled (se non si raggiunge min)
```

### 4.3 ads-execution-service

**Responsabilità:**
- Gestione account pubblicitari multipli (10+ account Meta, Google, TikTok)
- Creazione campaigns e ad sets su piattaforme
- Upload creativi (immagini, video, copy)
- Bidding strategy automation
- A/B testing creativi
- Budget allocation cross-platform
- Sync metriche ogni 30 minuti
- Health check account (banning, spending limit)
- Failover automatico su account alternativi

**Integrazione Mario AI** (via mario-bridge):
- Generazione automatica creativi (Mario Studio Image)
- Generazione video brevi (Mario Studio Video)
- Generazione copy varianti (Mario AI text)
- Generazione persona-targeted creative variants

### 4.4 tracking-service

**Responsabilità:**
- Endpoint ricezione eventi pixel (`/track`)
- Endpoint UTM redirect (`/click/{tracker_id}`)
- Ingestion eventi su ClickHouse (batch ogni 10s)
- Attribution model (last-paid-click default, MTA opzionale)
- Real-time aggregations (CAC, ROAS, CR live)
- Webhook handlers da Stripe, Shopify, WooCommerce
- Server-side tracking (fallback per cookie blocking)
- Fingerprinting per device matching (lite, no PII)

**Performance target**: 50.000 eventi/sec ingestion, <100ms p95 query attribuzione.

### 4.5 payment-service

**Responsabilità:**
- Gestione versamenti investitori (Stripe Checkout, SEPA bonifico verificato)
- Escrow accounting interno (transazioni virtuali su DB)
- Reconciliation con conto bancario (Plaid o open banking EU)
- Distribuzioni mensili agli investitori (Stripe Connect transfer + SEPA batch)
- Fatturazione automatica (eFattura IT, e-invoice UAE)
- Multi-currency con tasso fisso giorno operazione
- Anti-doppio-spend (idempotency keys)
- Refund handling
- Wallet interno per piccoli importi (<€50 accumulano)

### 4.6 notification-service

**Responsabilità:**
- Notifiche transazionali (email + in-app + push web)
- Notifiche marketing previo consenso
- Template editor per admin
- Queue prioritizzata (transactional > marketing)
- Suppression list (unsubscribed, bounced)
- Reporting deliverability

**Canali:**
- Email: Resend (primario) + SendGrid (fallback)
- SMS: Twilio (per 2FA e alert critici)
- Push web: Service Worker custom
- In-app: WebSocket realtime + persistent

### 4.7 admin-service

**Responsabilità:**
- Backoffice operatore CROWADS
- Approvazione/rifiuto KYC
- Approvazione/rifiuto Campagne
- Override manuali su attribuzione (con audit log)
- Reportistica admin (ARR, MRR, take rate, ROI medio campagne)
- Compliance dashboard (sospetti AML, frodi, dispute)
- User support tickets
- Feature flags rollout
- A/B test orchestration

### 4.8 analytics-service

**Responsabilità:**
- Aggregazioni per dashboard investitori, startup, admin
- Cohort analysis investitori
- Funnel analysis acquisizione
- Predictive model per Auto-Pilot (training mensile)
- Esportazione CSV / Excel / API

### 4.9 mario-bridge

**Responsabilità:**
- Wrapper API per chiamate a Mario AI
- Caching risposte (creativi generati, copy)
- Routing tier Claude/Fable/Opus secondo task
- Fallback su altri provider se Mario down
- Rate limiting per evitare cost overrun

---

## 5. API ENDPOINTS

### 5.1 API pubblica REST (Versionata `/api/v1/`)

#### Public (no auth)
- `GET /campaigns` — Lista campagne pubbliche
- `GET /campaigns/{slug}` — Dettaglio campagna
- `GET /verticals` — Lista verticali supportati
- `GET /stats/public` — Statistiche aggregate piattaforma
- `POST /waitlist` — Iscrizione waitlist pre-launch

#### Auth required
- `GET /me` — Profilo utente
- `PATCH /me` — Update profilo
- `POST /me/2fa/enable`
- `POST /me/kyc/start`
- `GET /me/kyc/status`

#### Investor endpoints
- `GET /investor/dashboard` — Dashboard data
- `GET /investor/campaigns/{id}` — Dettaglio campagna sottoscritta
- `POST /investor/campaigns/{id}/subscribe` — Sottoscrivi campagna
- `GET /investor/subscriptions` — Lista sottoscrizioni
- `GET /investor/distributions` — Storico distribuzioni
- `GET /investor/wallet` — Wallet balance
- `POST /investor/wallet/withdraw` — Richiedi withdraw
- `POST /investor/auto-pilot/enable` — Abilita Auto-Pilot
- `PATCH /investor/auto-pilot/settings`
- `POST /investor/payment-methods` — Aggiungi metodo pagamento

#### Startup endpoints
- `GET /startup/dashboard`
- `POST /startup/campaigns` — Crea nuova campagna
- `GET /startup/campaigns/{id}`
- `PATCH /startup/campaigns/{id}` — Update (solo se in `draft`)
- `POST /startup/campaigns/{id}/submit-for-review`
- `POST /startup/campaigns/{id}/assets` — Upload assets
- `GET /startup/campaigns/{id}/metrics` — Metrics live
- `POST /startup/integrations/stripe/connect` — OAuth Stripe
- `POST /startup/integrations/shopify/connect` — OAuth Shopify
- `GET /startup/revenue-share-payments` — Storico pagamenti dovuti
- `POST /startup/revenue-share-payments/{id}/pay` — Conferma pagamento

#### Admin endpoints (separato dominio `/admin/`)
- Tutti i precedenti con override e dati cross-user
- `GET /admin/users` con filtri
- `POST /admin/kyc/{id}/approve` o `/reject`
- `POST /admin/campaigns/{id}/approve` o `/reject`
- `POST /admin/campaigns/{id}/cancel`
- `POST /admin/revenue-attributions/{id}/override`
- `GET /admin/compliance/aml-flags`
- `GET /admin/finance/reconciliation`

### 5.2 Webhook inbound

- `POST /webhooks/stripe` — Eventi Stripe (charge.succeeded, refund, etc.)
- `POST /webhooks/shopify` — Eventi Shopify (orders/create, paid)
- `POST /webhooks/woocommerce` — Custom webhook
- `POST /webhooks/sumsub` — KYC status update
- `POST /webhooks/meta-ads` — Ad performance updates
- `POST /webhooks/google-ads` — Ad performance updates

### 5.3 Webhook outbound (verso terzi che lo richiedono)

- Notifiche custom configurate da startup per integrare CROWADS nei propri sistemi
- Esempi: `campaign.ads_started`, `revenue.attributed`, `payment.due`

### 5.4 Tracking endpoints

- `GET /track/c/{tracker_id}` — Click tracker (redirect rapido a URL finale con UTM)
- `POST /track/event` — Pixel event ingestion (1x1 transparent + JSON beacon)
- `GET /track/pixel/{campaign_id}` — Standalone pixel image

---

## 6. COMPONENTI FRONTEND

### 6.1 App publica (`crowads.com`)

- Landing page (già definita)
- About / Team / Press
- Blog / Resources
- For Startups (sezione dedicata)
- For Investors (sezione dedicata)
- Legal pages
- Auth pages (signup, login, forgot password)

### 6.2 Investor app (`app.crowads.com/investor`)

**Pagine:**
- Dashboard (overview portfolio, distribuzioni, ROI complessivo)
- Discover Campaigns (browse, filter, sort)
- Campaign Detail (deep dive metriche + sottoscrizione)
- My Subscriptions (lista campagne sottoscritte)
- Auto-Pilot (config + storico allocazioni)
- Wallet & Distributions
- Fiscal Reports (download PDF/CSV)
- Settings (profilo, KYC, 2FA, payment methods, notifiche)

**Componenti chiave:**
- Performance charts realtime (Recharts)
- Investment calculator simulator
- Diversification visualizer
- Risk indicator badges
- Skeleton loaders + optimistic UI

### 6.3 Startup app (`app.crowads.com/startup`)

**Pagine:**
- Dashboard (campagne attive, revenue share dovuto)
- Campaign Builder (wizard 7-step per creare nuova campagna)
- Campaign Management (live metrics, creative approval)
- Revenue Share Payments (storico, prossimo dovuto, paga ora)
- Integrations (Stripe, Shopify, WooCommerce)
- Brand Assets Manager
- Settings

**Wizard 7-step Campaign Builder:**
1. Basic info (titolo, descrizione, vertical)
2. Budget & Targets (budget, ROAS expected)
3. Audience (buyer persona, geo)
4. Creatives (upload o genera con Mario)
5. Revenue Share Setup (% offerta a investitori, durata, premio)
6. Legal (firma contratto RSM)
7. Review & Submit

### 6.4 Admin app (`admin.crowads.com`)

- Dashboard ops (ARR, MRR, active campaigns, alerts)
- Users management
- KYC review queue
- Campaign approval queue
- Manual interventions (refund, override, freeze)
- Finance & Reconciliation
- Compliance dashboard (AML flags, suspicious activity)
- Content management (landing copy, email templates)
- Feature flags

### 6.5 Componenti UI condivisi

- DataTable con sorting/filtering/pagination
- ChartCard con drill-down
- StatusBadge per campaign state
- MoneyDisplay con multi-currency
- DateTimeWithTz (multi-timezone aware)
- DocumentUploader con virus scan
- KYCStep components
- PaymentMethodSelector

---

## 7. INTEGRAZIONE PIATTAFORME ADS

### 7.1 Meta Ads (Facebook + Instagram)

- **Auth**: System User Token (long-lived, never expire)
- **Setup account**: Business Manager con MCC structure (parent CROWADS + child per vertical)
- **API**: Marketing API v20.0+
- **Endpoints chiave**:
  - `POST /act_{ad_account_id}/campaigns` — crea campaign
  - `POST /act_{ad_account_id}/adsets` — crea ad set
  - `POST /act_{ad_account_id}/ads` — crea ad
  - `GET /act_{ad_account_id}/insights` — metriche
- **Webhook**: subscribe a `ad_account` topic per real-time updates
- **Limiti**: rate limit 600 calls/hour per account, gestire con queue

### 7.2 Google Ads

- **Auth**: OAuth 2.0 + Developer Token + MCC account
- **API**: Google Ads API v17+
- **Endpoints chiave**:
  - `mutate` su CampaignService, AdGroupService, AdService
  - Query report via GAQL (Google Ads Query Language)
- **Conversion tracking**: setup conversion actions via API
- **Limiti**: 15.000 ops/giorno per developer token level basic, upgrade richiesto

### 7.3 TikTok for Business

- **Auth**: OAuth 2.0 + App approval
- **API**: TikTok Ads API v1.3+
- **Endpoints**: simile a Meta
- **Limiti**: 600 calls/min per app

### 7.4 LinkedIn Ads (B2B)

- **Auth**: OAuth 2.0 + Marketing Developer Platform access
- **API**: REST API v2
- **Use case**: campagne SaaS B2B

### 7.5 Account warming strategy

Nuovi account ads su Meta/Google partono con spending limit basso ($50/giorno). Warming graduale:
- Settimana 1: $50/giorno
- Settimana 2: $200/giorno
- Settimana 3: $500/giorno
- Settimana 4: $2.000/giorno
- Mese 2+: $10.000+/giorno

Strategia di rotazione automatica account per evitare red-flag.

---

## 8. INTEGRAZIONE PROVIDER REVENUE

### 8.1 Stripe (preferito per SaaS + e-commerce custom)

- **OAuth Connect**: Startup autorizza CROWADS a leggere transazioni
- **Webhook**: `charge.succeeded`, `charge.refunded`, `payment_intent.succeeded`
- **Filtering**: solo charges con `metadata.utm_campaign` corrispondente a una nostra campagna
- **Test mode**: validation flow in sandbox

### 8.2 Shopify

- **OAuth app**: install nostro app privato su shop Startup
- **Webhook**: `orders/create`, `orders/paid`, `refunds/create`
- **Scope minimo**: `read_orders`, `read_customers`
- **Attribution**: order.attributes con UTM da landing page tracking

### 8.3 WooCommerce

- **Custom webhook**: nostro plugin WordPress oppure webhook nativo
- **Auth**: API key dedicata

### 8.4 Custom SDK (JS)

Per checkout proprietari, fornire SDK 2KB:

```javascript
// Snippet da inserire nel checkout success page
<script src="https://cdn.crowads.com/sdk/v1/track.min.js"></script>
<script>
  crowads.trackConversion({
    orderId: 'order_123',
    revenue: 99.50,
    currency: 'EUR',
    metadata: { product: 'premium_plan' }
  });
</script>
```

### 8.5 Server-to-server webhook custom

```bash
POST https://api.crowads.com/v1/track/conversion
Authorization: Bearer {startup_api_key}
Content-Type: application/json

{
  "order_id": "order_123",
  "revenue_eur": 99.50,
  "utm_campaign": "crowads_campaign_abc",
  "occurred_at": "2026-06-21T14:30:00Z",
  "customer_email_hash": "sha256_hash"
}
```

---

## 9. SISTEMA TRACKING & ATTRIBUTION

### 9.1 Flow click → conversion

```
1. User vede annuncio su Meta (es. Instagram Reel)
2. Click → redirect a https://track.crowads.com/c/{tracker_id}
3. Tracking service registra click su ClickHouse
4. Redirect 302 a URL finale con UTM appended:
   https://startup.com/landing?utm_source=crowads&utm_campaign={campaign_id}&utm_content={ad_id}&cw_click={click_id}
5. User naviga sito Startup → pixel CROWADS fires + cookie/localStorage cw_click_id
6. User completa acquisto
7. Shopify webhook → CROWADS riceve order
8. Match per UTM + click_id + window attribution
9. Crea record in revenue_attributions
10. Aggiorna metriche campagna in real-time
```

### 9.2 Attribution models

**Default**: Last-paid-click con window 30 giorni
**Opzioni configurabili per campagna**:
- Last-click 7d / 14d / 30d / 60d / 90d
- First-click
- Linear multi-touch (peso uguale tutti i tocchi)
- Position-based (40% first, 40% last, 20% middle)
- Data-driven (richiede 100+ conversioni storiche)

### 9.3 De-duplication

Evitare doppi conteggi:
- Stesso order_id non viene mai contato 2 volte (chiave unique `(source, external_order_id)`)
- Stesso click_id genera al massimo 1 conversione attribuita
- Refund chiamato entro 14gg sottrae dal revenue attribuito (compensa il revenue share)

### 9.4 Privacy & cookie-less tracking

- Cookies first-party (`.crowads.com` o sottodominio CNAMEd)
- Server-side conversion API fallback (Meta CAPI, Google Enhanced Conversions)
- LocalStorage + fingerprinting lite (browser + lang + timezone, no fingerprint PII)
- Cookie consent banner integrato (GDPR compliant)

### 9.5 Fraud detection

- IP velocity check
- Click→conversion time anomaly (<5 sec = sospetto)
- User-agent fingerprint mismatch
- Geo mismatch tra click e conversion
- Bot detection (Cloudflare bot management)
- ML model anomaly score (training su storico)

---

## 10. SISTEMA ESCROW & PAGAMENTI

### 10.1 Architettura accounting

**Conto bancario "Escrow Pool"** separato da operativo (banca regolamentata UE/UAE).
**Ledger interno** transazionale su PostgreSQL con campo `balance_after_eur` per ogni movimento.

Riconciliazione automatica giornaliera tra:
- Saldo bancario reale (via Open Banking API)
- Saldo nostro ledger

In caso di discrepanza → alert immediato + freeze operazioni in attesa di review umana.

### 10.2 Flusso ingresso fondi investitore

```
1. Investitore conferma sottoscrizione €1.000 su Campaign X
2. CROWADS genera Stripe Checkout (oppure mostra IBAN per bonifico con causale univoca)
3. User paga
4. Stripe webhook charge.succeeded → CROWADS aggiorna subscription a 'paid'
5. CROWADS muove fondi virtualmente in escrow (record in escrow_transactions)
6. Email conferma a investitore
7. Quando Campagna è 'fully_funded' → fondi committed
8. Quando ads partono → fondi escono progressivamente dall'escrow verso ads
```

### 10.3 Flusso uscita fondi verso ads

```
1. ads-execution-service deve spendere €500/giorno su campaign X
2. payment-service verifica balance escrow campaign X
3. Se OK → registra escrow_transaction tipo 'ad_spend'
4. ads-execution-service procede con spend sull'account Meta/Google
5. Fine giornata: reconciliation con spending effettivo riportato da piattaforme
6. Adjustments se differenza
```

### 10.4 Distribuzioni mensili a investitori

```
Cron mensile (giorno 20):
1. Per ogni campagna in attribution_phase:
   - Calcola revenue_share_payment del mese
2. Per ogni revenue_share_payment paid by startup:
   - Calcola distributions pro-quota
3. Batch SEPA Credit Transfer per importi > €50
4. Wallet accumulation per importi < €50
5. Notifiche email a investitori
6. Audit log entries
```

### 10.5 Fatturazione automatica

- **Investitore versa**: CROWADS emette fattura attiva categoria "Performance Marketing Services - Campaign X"
- **Startup paga revenue share**: emette fattura attiva categoria "Revenue Share - Campaign X"
- **CROWADS distribuisce a investitore**: emette nota di accredito o documento fiscale equivalente

Integrazione SDI (eFattura) per clienti italiani, gestita da Fattura24 o Fatture in Cloud.

---

## 11. AUTH, KYC, AML

### 11.1 Auth stack

- **Identity**: PostgreSQL `users` table
- **Sessions**: JWT con refresh token rotation
- **2FA**: TOTP (Google Authenticator, Authy compatibili) — obbligatorio per investitori con saldo >€10k
- **SSO opzionale**: Sign in with Apple, Google (per signup veloce, MAI per KYC)
- **Magic link**: opzionale per login passwordless
- **Hardware key** (FIDO2): supportato per admin

### 11.2 KYC flow

**Provider**: Sumsub (alternativi Onfido, Persona)

**Step:**
1. Utente carica documento identità (ID/passport/patente)
2. Sumsub fa verifica automatica (OCR, liveness check selfie)
3. Verifica anti-spoofing (challenge facciali)
4. Verifica liste sanzioni (PEP, OFAC, EU sanctions list)
5. Risultato webhook a CROWADS
6. Se approved → user può sottoscrivere campagne / startup attivare
7. Se rejected → review umana admin

**Tempo medio**: 24-72h.
**Costo**: €1.5/verifica.

### 11.3 AML & ongoing monitoring

- Soglia segnalazione automatica: cumulato >€10.000 in 12 mesi
- Verifica origine fondi: richiesta documenti per >€5.000
- Screening continuativo (weekly) su liste sanzioni aggiornate
- Pattern detection: structuring (frazionamento), riciclaggio classico
- SAR (Suspicious Activity Report) generation se trigger
- Compliance officer dedicato (figura umana esterna, retainer mensile)

### 11.4 Right to be forgotten (GDPR)

User può richiedere cancellazione account. Procedure:
1. Sospensione immediata account
2. Anonimizzazione dati identificativi
3. **MANTENIMENTO** dati transazionali per 10 anni (obbligo normativo)
4. Conferma cancellazione entro 30 giorni

---

## 12. MULTI-TENANCY, MULTI-CURRENCY, I18N

### 12.1 Multi-currency

**Currency master**: EUR
**Currencies supportate al lancio**: EUR, USD, GBP, AED, CHF
**Tassi di cambio**: fetched daily da ECB API (EUR base) + conversion API providers

**Regole**:
- Tutti gli importi storage in EUR (per consistenza)
- Display per user in preferred currency con conversion live
- Snapshot tasso a momento operazione per fissare contabilmente
- Transactions cross-currency hanno fee FX trasparente (0.5% sopra mid-market)

### 12.2 Multi-language

**Lingue al lancio**: English (primaria), Italian, Arabic
**Lingue future**: Spanish, French, German
**System**: next-intl + Crowdin per traduzioni community

**Routing**: `/en/...`, `/it/...`, `/ar/...` (RTL supportato per arabo)

### 12.3 Multi-region compliance

| Region | Regulator focus | Requisiti specifici |
|---|---|---|
| EU | GDPR, MiFID II, ECSP | KYC standard EU, ECSP safe harbor |
| UAE | DIFC/ADGM, Central Bank | KYC enhanced, AML strict |
| UK | FCA | Possibile authorisation needed sopra soglie |
| USA | SEC, CFTC | Solo accredited investors al lancio |
| Switzerland | FINMA | KYC enhanced |

### 12.4 Multi-tenancy interno

- Singolo deployment, ogni risorsa è scoped per `user_id` o `startup_id`
- White-label v2: schema multi-tenant per agency che rivendono CROWADS sotto brand proprio
- Row-level security PostgreSQL per isolamento dati

---

## 13. DASHBOARD INVESTITORI (dettaglio)

### 13.1 Overview screen

**Top metrics:**
- Total invested (cumulato)
- Total returned (cumulato)
- Net ROI %
- Active subscriptions count
- Wallet balance

**Charts:**
- Portfolio value over time
- ROI per vertical (pie chart)
- Distribution timeline (next expected payouts)
- Diversification index

**Action cards:**
- New campaigns matching your profile
- Pending distributions
- KYC status
- Recent activity

### 13.2 Campaign Detail screen (live)

**Tabs:**
- **Overview**: budget, raised, status, expected ROAS
- **Live Metrics**: real-time CAC, ROAS, conversions, revenue
- **Investor cohort**: anonimizzato, # investitori, distribuzione ticket
- **Documents**: contratto RSM, brand assets, pitch
- **Activity log**: ogni evento Campagna timestamped

### 13.3 Auto-Pilot screen

**Configurazione**:
- Total budget allocato
- Risk profile (slider low-medium-high)
- Preferred verticals (multi-select)
- Excluded verticals
- Max % per single campaign (cap concentrazione)
- Rebalancing frequency
- Pause / resume button

**Visualizzazione**:
- Current allocation pie chart
- Allocations history timeline
- Forecast distribuzioni 12 mesi

### 13.4 Wallet & Distributions

- Saldo wallet
- Withdraw request flow
- Storico distribuzioni con filtri (date, campaign, vertical)
- Export CSV/PDF per dichiarazione fiscale
- Tax report annuale auto-generato

---

## 14. DASHBOARD STARTUP (dettaglio)

### 14.1 Overview screen

**Top metrics:**
- Active campaigns
- Total capital raised cumulativo
- Total revenue share paid cumulativo
- Total revenue generated da CROWADS campaigns
- Average ROAS your campaigns

**Action cards:**
- Pending revenue share payments
- Action required (assets to upload, contracts to sign)
- Performance alerts (ROAS dropping, ad account issues)

### 14.2 Campaign Builder (wizard)

Già descritto sez. 6.3.

Bonus features:
- Suggested budget basato su vertical benchmark
- Mario AI suggestions per copy ads
- Brand consistency checker (logo, colors)
- Compliance pre-check (vertical eligibility)

### 14.3 Campaign Management

- Live metrics dashboard
- Creative approval workflow (review creatives generated by Mario or manual)
- Pause/restart request
- Communication channel con CROWADS team
- Document repository (contratti, fatture, report mensili)

### 14.4 Revenue Share Payments

- Lista pagamenti dovuti per campagna
- Importi calculated breakdown (revenue, %, fees)
- Pay now button (Stripe checkout o bonifico)
- Overdue alerts
- Storico pagamenti fatti

### 14.5 Integrations

- One-click connect: Stripe, Shopify, WooCommerce
- API key per webhook custom
- SDK snippet generator
- Test conversion flow

---

## 15. ADMIN PANEL (dettaglio)

### 15.1 Operations dashboard

- Real-time platform metrics (campaigns, users, $ flowing)
- Health checks (escrow reconciliation, ad accounts, integrations)
- Alert queue
- Today's tasks

### 15.2 User management

- Search users by email / name / KYC status
- Drill-down user 360 (subscriptions, distributions, audit log)
- Manual actions (suspend, reset 2FA, force logout)

### 15.3 Campaign review queue

- Pending review campaigns
- Side-by-side review (form + assets + tracking setup verification)
- Approve / Reject / Request changes
- Comments thread to startup

### 15.4 Compliance dashboard

- AML flags (alerts auto + reviewed)
- KYC pending queue
- Suspicious patterns
- Sanctions list hits
- SAR report drafts

### 15.5 Finance

- Cash flow ledger
- Escrow reconciliation status
- Distribution queue
- Failed payments
- Pending invoices
- Tax reports per geography

### 15.6 Content & marketing

- Email template editor
- Landing page A/B test orchestration
- Feature flag rollout
- Vertical taxonomy management

---

## 16. AUTO-PILOT ALGORITHM

### 16.1 Obiettivo

Allocare automaticamente il capitale di un Investitore su Campagne attive, ottimizzando per profilo rischio scelto.

### 16.2 Inputs

- Risk profile (low / medium / high)
- Budget totale
- Preferred / excluded verticals
- Max % per singola campagna (default 10%, configurable)
- Min % per singola campagna (default 1%)
- Diversification target (es. minimo 5 campagne)

### 16.3 Scoring campaign

Ogni campagna attiva ottiene uno score composito:

```
score = w1 * historical_roas_vertical
      + w2 * startup_tier_score (bronze=1, silver=2, gold=3, platinum=4)
      + w3 * startup_track_record (campagne precedenti % paid on time)
      + w4 * remaining_budget_ratio (favor campagne quasi-funded per close rapido)
      - p1 * risk_penalty (per high risk se profile low)
```

Pesi `w` tuned via ML model riaddestrato mensile su outcomes storici.

### 16.4 Allocation algorithm

1. Filter campagne aperte per vertical preferred + risk-profile-compatible
2. Calcolare score
3. Allocare con constraint: max % per campagna, min # campagne
4. Quadratic programming per ottimizzare expected ROI / variance

### 16.5 Rebalancing

Mensile o on-trigger (nuova campagna alto-rated, fine campagna):
- Capitale liberato (distribuzioni) viene riallocato automaticamente
- No riallocazione di capitale già committed (rispetto vincoli legali)

---

## 17. NOTIFICHE & COMUNICAZIONI

### 17.1 Eventi trigger

**Investor:**
- Campaign you might like (nuova campagna matching profile)
- Subscription confirmed
- Campaign fully funded
- Ads launched on your campaign
- Monthly distribution received
- Campaign ending soon
- KYC status updates

**Startup:**
- Campaign approved / rejected
- Campaign fully funded (ads launching soon)
- Daily performance digest
- Revenue share payment due (T-7, T-3, T-0, overdue)
- Asset needed (creative refresh requested)

**Admin:**
- New campaign pending review
- New KYC pending
- AML flag
- Reconciliation discrepancy
- Failed distribution
- Ad account banned

### 17.2 Canali

| Type | Email | In-app | Push | SMS |
|---|---|---|---|---|
| Transactional critical | ✅ | ✅ | ✅ | ✅ (selected) |
| Transactional standard | ✅ | ✅ | ✅ | ❌ |
| Marketing | ✅ (opt-in) | ❌ | ❌ | ❌ |
| Alerts admin | ✅ | ✅ | ✅ | ✅ |

### 17.3 Templating

- Engine: MJML per email, JSX for in-app
- Variables system con i18n
- A/B test on subject lines
- Suppression list automatic
- Track open / click rates

---

## 18. COMPLIANCE & AUDIT LOGGING

### 18.1 Audit log requirements

Ogni azione critica registrata in `audit_log`:
- User actions: login, signup, KYC submit, subscription, withdrawal
- Admin actions: approve/reject, manual override, refund
- System actions: distribuzioni, payments, attribution updates
- Integration events: webhook ricevuti, sync ads

Retention: 7 anni minimum, 10 anni per dati finanziari.

### 18.2 Immutability

Audit log su PostgreSQL append-only. Periodicamente sealed con hash chain (blockchain-lite o WORM storage) per immutabilità verificabile.

### 18.3 Reporting per regulator

- Annual report ECSP-style (anche se non regolati, per trasparenza)
- KYC stats report
- AML SAR submissions
- Tax reports per geography (FATCA, CRS, italiano 730/sostitutiva)

---

## 19. INFRASTRUCTURE, DEPLOYMENT, MONITORING

### 19.1 Architettura deployment

**Production**:
- Backend: Fly.io multi-region (EU-Frankfurt + UAE-Dubai)
- Frontend: Vercel Edge
- Database: Neon PostgreSQL primary EU + read replica UAE
- ClickHouse: Cloud (EU)
- Redis: Upstash global
- R2: Cloudflare (geo-distributed)

**Staging**: stesso stack scale-down
**Dev**: locale Docker Compose

### 19.2 CI/CD

- **Repo**: monorepo (Turborepo)
- **CI**: GitHub Actions
- **Tests obbligatori**: unit (>80% coverage), integration, e2e Playwright
- **Linting**: ESLint, Prettier, TypeScript strict
- **Pre-commit**: Husky + lint-staged
- **Deploy**: auto su `main` per staging, manual approval per prod

### 19.3 Monitoring

- **Errors**: Sentry (frontend + backend)
- **APM**: Grafana Cloud (OpenTelemetry)
- **Logs**: Better Stack / Logtail
- **Uptime**: Better Stack synthetic checks
- **Custom dashboards**: Grafana per business metrics (subscriptions/day, $ flowing/hour)
- **Alerting**: PagerDuty per critical, Slack per warning, email per info

### 19.4 Backup & disaster recovery

- DB backup giornaliero + PITR (point-in-time recovery)
- ClickHouse snapshot settimanale
- R2 geo-replication
- Documented DR runbook
- Quarterly DR drill

### 19.5 Performance targets

- API p95 latency < 200ms
- API p99 latency < 500ms
- Tracking event ingestion < 50ms
- Page load (LCP) < 2.5s mobile, < 1.5s desktop
- Uptime SLO 99.9% (allowable downtime: ~9h/year)

---

## 20. TESTING STRATEGY

### 20.1 Test pyramid

- **Unit tests** (Vitest): >80% coverage, fast feedback
- **Integration tests** (Vitest + Testcontainers): per ogni servizio
- **API contract tests** (Pact o equivalente)
- **E2E tests** (Playwright): critical paths user journey
- **Load tests** (k6): >10x expected production load
- **Security tests** (OWASP ZAP automated, pentest manuale annuale)

### 20.2 Critical user journeys da testare e2e

1. Investor signup → KYC → first subscription → distribution received
2. Startup signup → KYC → campaign create → submit → approve → ads launch → first revenue → revenue share paid → investor distribution
3. Auto-Pilot activation → first allocation → rebalancing
4. Refund flow
5. Dispute attribution flow
6. Admin manual override

### 20.3 Test data

- Seed scripts per ambiente dev/staging
- Mock servers per Meta/Google/TikTok API (per test isolati)
- Test mode Stripe + Shopify

---

## 21. SECURITY REQUIREMENTS

### 21.1 Application security

- OWASP Top 10 mitigations
- CSP, HSTS, X-Frame-Options, etc.
- Input validation via Zod su ogni endpoint
- Output encoding XSS prevention
- SQL injection prevention via Prisma parametrized queries
- CSRF tokens on state-changing actions
- Rate limiting per endpoint
- Bot management via Cloudflare

### 21.2 Auth security

- Password Argon2id, min 12 chars, breached password check (HaveIBeenPwned API)
- 2FA obbligatorio per investitori con saldo >€10k, raccomandato per tutti
- Session timeout 30min idle, max session 30gg
- Login notifications su nuovo device

### 21.3 Data security

- Encryption at rest (AES-256) su PostgreSQL, R2
- Encryption in transit (TLS 1.3 only)
- Secrets in Vault, mai in env files in repo
- PII pseudonymization per analytics
- Regular pentest (annual) + bug bounty program

### 21.4 Infrastructure security

- Network isolation (VPC private)
- IAM least privilege
- MFA per access dev/prod
- Audit log accessi infrastruttura
- Vulnerability scanning continui (Snyk, Dependabot)

### 21.5 Compliance certifications target

- **Year 1**: GDPR compliance + SOC 2 Type I
- **Year 2**: SOC 2 Type II + ISO 27001
- **Year 3**: PCI DSS Level 2 (anche se non strettamente richiesto, dimostra serietà)

---

## 22. PERFORMANCE REQUIREMENTS

### 22.1 Throughput targets (production a regime)

- 1.000 campagne attive contemporaneamente
- 10.000 utenti attivi mensili (sum investor + startup)
- 100.000 tracking events / minuto (picco)
- 10.000 sottoscrizioni / giorno
- 100.000 distribuzioni / mese

### 22.2 Latency targets

- API p95: <200ms
- Tracking ingestion: <50ms
- Dashboard load: <2s
- Search campaigns: <300ms

### 22.3 Scaling strategy

- Stateless services → horizontal scale
- DB read replicas per analytics queries
- ClickHouse partitioning per data
- CDN Cloudflare per static assets
- Queue per heavy ops (distribuzioni mensili, batch analytics)

---

## 23. ROADMAP IMPLEMENTAZIONE (suggerita)

### Fase 1 — Foundation (settimane 1-4)
- Setup monorepo, CI/CD, infra base
- Auth service (signup, login, JWT)
- KYC integration Sumsub
- DB schema base
- Admin panel skeleton

### Fase 2 — Campaign lifecycle (settimane 5-8)
- Campaign CRUD + state machine
- Subscription flow + Stripe Checkout
- Escrow accounting interno
- Basic investor dashboard
- Basic startup dashboard

### Fase 3 — Ads execution (settimane 9-12)
- Meta Ads integration
- Google Ads integration
- TikTok Ads integration
- ads-execution-service core
- Mario AI bridge per creativi

### Fase 4 — Tracking & attribution (settimane 13-16)
- ClickHouse setup
- Click tracker
- Pixel ingestion
- Stripe + Shopify webhook integration
- Attribution model
- Revenue attribution flow

### Fase 5 — Payments & distributions (settimane 17-20)
- Payment service (in/out)
- Distribution batching
- Multi-currency
- Fatturazione automatica
- Wallet investor

### Fase 6 — Polish & Auto-Pilot (settimane 21-24)
- Auto-Pilot algorithm
- Notifications system completo
- Analytics dashboards polish
- A/B test framework
- Documentation API pubblica

### Fase 7 — Compliance & launch prep (settimane 25-28)
- Legal review final
- Pentest + remediation
- Load testing
- Disaster recovery drill
- Pilot launch con 3 campagne interne

### Fase 8 — Soft launch (settimane 29-32)
- 10 campagne pilota
- 100 investitori
- Monitoring intensivo
- Quick iterations

### Fase 9 — Public launch (settimane 33+)
- Marketing push
- Scale infrastructure
- Hire team operations

**Tempo totale stimato**: 8 mesi con team di 4 developer senior + 1 designer + 1 PM.

---

## APPENDICE A — ESEMPI CODE SAMPLES

### A.1 Esempio: subscription creation endpoint

```typescript
// app/api/v1/investor/campaigns/[id]/subscribe/route.ts
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth, requireKyc } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

const subscribeSchema = z.object({
  amount_eur: z.number().min(100).max(1_000_000),
  payment_method: z.enum(['stripe_checkout', 'sepa_transfer']),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await requireAuth(req);
  await requireKyc(user);

  const body = subscribeSchema.parse(await req.json());

  const campaign = await db.campaign.findUnique({ where: { id: params.id } });
  if (!campaign || campaign.status !== 'open_for_funding') {
    return Response.json({ error: 'Campaign not available' }, { status: 400 });
  }

  if (campaign.budget_raised_eur + body.amount_eur > campaign.budget_target_eur) {
    return Response.json({ error: 'Exceeds remaining budget' }, { status: 400 });
  }

  const subscription = await db.subscription.create({
    data: {
      campaign_id: campaign.id,
      investor_id: user.id,
      amount_eur: body.amount_eur,
      share_pct: body.amount_eur / campaign.budget_target_eur * 100,
      status: 'pending',
      payment_method: body.payment_method,
    },
  });

  if (body.payment_method === 'stripe_checkout') {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: `CROWADS - Campaign ${campaign.title}` },
          unit_amount: Math.round(body.amount_eur * 100),
        },
        quantity: 1,
      }],
      success_url: `${process.env.APP_URL}/investor/subscriptions/${subscription.id}?success=1`,
      cancel_url: `${process.env.APP_URL}/campaigns/${campaign.slug}`,
      metadata: { subscription_id: subscription.id },
    });
    return Response.json({ checkout_url: session.url });
  }

  return Response.json({ subscription, iban_instructions: '...' });
}
```

### A.2 Esempio: pixel tracking endpoint

```typescript
// app/api/track/event/route.ts
import { clickhouse } from '@/lib/clickhouse';
import { z } from 'zod';

const eventSchema = z.object({
  campaign_id: z.string().uuid(),
  event_type: z.enum(['view', 'click', 'conversion']),
  utm_source: z.string(),
  utm_campaign: z.string(),
  url: z.string().url(),
  revenue_eur: z.number().optional(),
});

export async function POST(req: Request) {
  const data = eventSchema.parse(await req.json());

  await clickhouse.insert({
    table: 'tracking_events',
    values: [{
      event_id: crypto.randomUUID(),
      campaign_id: data.campaign_id,
      event_type: data.event_type,
      utm_source: data.utm_source,
      utm_campaign: data.utm_campaign,
      url: data.url,
      ip: req.headers.get('x-forwarded-for') ?? '',
      user_agent: req.headers.get('user-agent') ?? '',
      country_code: req.headers.get('cf-ipcountry') ?? '',
      revenue_eur: data.revenue_eur ?? null,
      timestamp: new Date(),
    }],
  });

  return new Response('', { status: 204 });
}
```

---

## APPENDICE B — DELIVERABLE FINALI ATTESI

Alla fine dello sviluppo:

1. **Codebase monorepo** completa, documentata, testata
2. **Documentazione tecnica live** (Mintlify / Docusaurus)
3. **API reference** auto-generata da OpenAPI
4. **Postman collection** per testing
5. **Admin runbook** per operations team
6. **Disaster recovery plan** documentato
7. **Security playbook**
8. **Onboarding doc** per nuovi developer
9. **Architecture diagrams** (Mermaid / Excalidraw)
10. **Pentest report clean** + remediations

---

## CHIUSURA

Questo documento è il riferimento di verità per il prodotto CROWADS. Ogni feature implementata, ogni decisione architetturale, ogni endpoint API deve essere coerente con queste specifiche. Per modifiche significative, richiedere approval da product owner (Alessandro Pavan).

Per chiarimenti: tech@crowads.com

---

*© 2026 Qualitec FZE — CROWADS Engineering Spec v1.0*
