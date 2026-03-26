# INVOICE

---

| | |
|---|---|
| **Invoice Number** | MCAR-2026-001 |
| **Date Issued** | 26 March 2026 |
| **Due Date** | 25 April 2026 (Net 30) |

---

## From (Developer)

| | |
|---|---|
| **Name** | *(Your Name)* |
| **Email** | *(your@email.com)* |
| **Phone** | *(your phone)* |
| **Address** | *(your address)* |

---

## Bill To (Client)

| | |
|---|---|
| **Name** | *(Uncle's Full Name)* |
| **Company** | *(Business Name, if applicable)* |
| **Email** | *(uncle's email)* |
| **Phone** | *(uncle's phone)* |
| **Address** | *(uncle's address)* |

---

## Project Summary

**Project:** Vehicle Acquisition & CRM System (MCar Web) — v1  
**Description:** A full-stack web application for a vehicle buying business. The system includes a public-facing customer funnel for instant vehicle valuations and appointment booking, an internal admin CRM for lead management and deal tracking, an inspector panel for on-site vehicle assessments, and a proprietary 16-step valuation engine with fraud detection and market intelligence.

**Deployed on:** Vercel (production)  
**Database:** Supabase (managed PostgreSQL)

---

## Deliverables & Pricing Breakdown

### 1. Public Customer Funnel — £600

A 6-step responsive customer journey accessible without login:

| Feature | Detail |
|---|---|
| Registration Plate Lookup | Instant vehicle identification via DVLA VES API (server-side, never exposes API keys) |
| Vehicle Confirmation Screen | Displays resolved make, model, year, fuel, colour for customer to confirm |
| Mileage & Condition Input | Guided input with validation |
| Contact Details Gate | Name, phone, email, postcode collection with consent checkboxes |
| Instant Offer Range Display | Live valuation powered by the 16-step pricing engine |
| Appointment Booking | Date/time slot picker (Mon–Sat, 24h notice, 45min in-person / 20min video) |
| Booking Confirmation Page | Summary screen with confirmation email triggered automatically |
| Step Progress Indicator | Visual progress bar across all 6 steps |
| Trust Signals UI | "DVLA Verified", "Secure & Encrypted", "No Obligation" badges |

---

### 2. Admin CRM Dashboard — £700

Full internal lead management system for the business:

| Feature | Detail |
|---|---|
| Dashboard Overview | Aggregate stats: total leads, leads by status, upcoming appointments, recent activity |
| Lead List | Paginated, searchable, filterable table of all submitted leads |
| Lead Detail View | Full profile per lead: vehicle info, contact, offer history, activity log |
| Status Pipeline | 7-stage pipeline: New → Contacted → Appointment Booked → Inspected → Offer Approved → Won / Lost |
| Finance Check Tracking | Track HPI/finance status: Not Checked / Clear / Finance Found |
| Inspector Assignment | Assign inspectors to specific leads |
| Notes System | Free-text notes per lead with author and timestamp |
| Pre-Purchase Checklist | Structured checklist to confirm steps before finalising a purchase |
| CSV Export | Export full or filtered lead list to CSV |
| Audit Log | Immutable record of all status changes, assignments, and actions |
| Calendar View | Appointment calendar (day/week view) with linked lead navigation |
| Settings Panel | Editable booking rules, hours, durations, email template configuration |
| Outcome Tracking | Record actual purchase price, resale price, recon costs, days to sale |

---

### 3. Inspector Panel — £350

Dedicated mobile-friendly interface for field inspectors:

| Feature | Detail |
|---|---|
| Assigned Inspections List | Shows only leads assigned to the logged-in inspector |
| Inspection Checklist | Structured checklist (bodywork, interior, mechanical, tyres, etc.) |
| Photo Upload | Multi-file upload to secure cloud storage (Supabase Storage with signed URLs) |
| Recommended Offer Input | Inspector submits a recommended figure based on physical findings |
| Inspection Notes | Free-text notes field |
| Auto Status Update | Submitting inspection automatically updates lead status + audit log |

---

### 4. Valuation Engine (16-Step Pipeline) — £900

The core intellectual property — a proprietary pricing engine purpose-built for used vehicle acquisition:

| Step | What It Does |
|---|---|
| 1. Market Value Anchor | Fuzzy-matched market lookup from 7 data providers |
| 2. Age Depreciation | Non-linear depreciation curve (steeper for older vehicles) |
| 3. Mileage Risk Curve | Penalty scaling based on mileage vs. expected annual rate |
| 4. MOT Risk Adjustment | Penalises recent failures, dangerous defects, structural advisories |
| 5. Fuel & Market Risk | Adjusts for diesel market softness, EV battery concerns |
| 6. ULEZ Compliance | Penalty for non-compliant vehicles (Euro status check) |
| 7. Condition Multiplier | User-declared condition adjustment |
| 8. Anti-Gaming / Input Trust | Detects and penalises suspicious input patterns |
| 9. Regional Pricing | 5-band postcode-based pricing (London, SE, Midlands, North, Scotland/Wales/NI) |
| 10. Mileage Consistency | Penalises odometer rollback or suspicious mileage patterns |
| 11. Volatility Adjustment | Adjusts for market stability of the specific vehicle segment |
| 12. Keeper History | Frequent keeper changes = higher risk |
| 13. SORN Check | Penalises vehicles flagged as off-road |
| 14. Recon Cost Estimation | Estimates reconditioning cost by segment |
| 15. Segment Overlay | Segment-specific (diesel, EV, hybrid, petrol, high-age) pricing logic |
| 16. Final Calculation | Compound multiplier floor (35% normal / 15% liability), spread, rounding to nearest £50 |

**Supporting Modules:**

| Module | Purpose |
|---|---|
| Confidence Scorer | 100-point deduction system across 18+ risk factors — shown to admin |
| Confidence Decay | Valuation expires over time (7-day window) |
| Spec Similarity Engine | 7-dimensional vehicle comparison for comp-based pricing |
| Time-to-Sell Model | Dynamic discount (0–6%) based on segment heat + volatility |
| Sell Cost Model | Itemised sell costs (platform fees, valeting, warranty, admin) by segment |
| TCO Model | Total cost of ownership estimation (service, brakes, tyres, MOT prep, cosmetic) |
| Calibration Store | Transaction feedback loop — engine self-tunes using actual purchase vs. predicted |
| Coefficient Store | Database-backed coefficient management for admin tuning |
| Exposure Cap | Risk exposure management to limit portfolio concentration |
| Promotion Rules | Promotional offer logic |
| Resale Evidence Engine | Multi-source profit simulation with comp analysis |

---

### 5. API & Data Integrations — £500

| Integration | Purpose |
|---|---|
| DVLA VES API | Real-time vehicle identity resolution from registration plate |
| MOT Trade API | Full MOT history — mileage records, test results, defects, advisories |
| Mileage Fraud Detection | Rollback detection + inconsistency analysis across MOT history |
| 7× Market Data Providers | eBay, Regcheck, Brego, OneAuto (×2), MotorSpecs, MarketCheck — parallel fetching with error isolation |
| Resend Email API | Transactional emails (booking confirmation, reminders, admin alerts) |
| Twilio Verify (OTP/SMS) | Phone number verification with abuse guardrails |
| Upstash Redis | Serverless rate limiting |
| Cloudflare Turnstile | Bot protection on public forms |

---

### 6. Database & Security Layer — £350

| Item | Detail |
|---|---|
| PostgreSQL Schema | 10 tables, 5 custom enum types, 13 performance-optimised indexes |
| 12 SQL Migrations | Versioned, ordered migration scripts for reproducible deployments |
| Row-Level Security (RLS) | Database-enforced access control (admin full access, inspector scoped, public none) |
| Role-Based Auth | Supabase Auth with email/password, JWT validation in middleware |
| Rate Limiting | Multi-tier: reg lookup (10/10min per IP), OTP (3/day per phone, 10/day per IP, 60s cooldown) |
| Input Hardening | Boundary enforcement on risk flags, mileage, explanations |
| Signed URLs | Time-limited access to inspection photos (never publicly accessible) |
| HMAC-SHA256 Sessions | Cryptographically signed offer session tokens |
| Immutable Audit Log | UPDATE/DELETE prevented at database level |

---

### 7. DevOps, Testing & Documentation — £250

| Item | Detail |
|---|---|
| Vercel Deployment | Production deployment with zero-config, environment variables, edge functions |
| Engine Test Suite | 4 test files: benchmark, scenario, invariant, and stress testing |
| Simulation Scripts | 50-vehicle valuation simulation for engine validation |
| Smoke Test Script | System health check utility |
| DB State Checker | Database integrity verification |
| 8 Documentation Files | Scope, tech stack, data model, routes, migrations, runbook, valuation engine spec |
| Setup Runbook | Step-by-step environment setup guide for new deployments |

---

## Invoice Total

| Item | Amount |
|---|---|
| 1. Public Customer Funnel | £600 |
| 2. Admin CRM Dashboard | £700 |
| 3. Inspector Panel | £350 |
| 4. Valuation Engine (16-Step) | £900 |
| 5. API & Data Integrations | £500 |
| 6. Database & Security Layer | £350 |
| 7. DevOps, Testing & Docs | £250 |
| | |
| **Subtotal** | **£3,650** |
| **Family Discount (10%)** | **−£365** |
| | |
| **Total Due** | **£3,285** |

---

## Why It Costs This Much — Justification

### What You're Getting

This is a fully custom-built system engineered specifically for your business operations. Every module has been designed around the real-world workflow of acquiring vehicles at scale — from first customer contact to final purchase. What you're getting:

- **121 source code files** written from scratch
- **A proprietary 16-step valuation engine** with fraud detection, margin protection, and self-calibration — this alone would cost £5,000–£10,000 from a specialist consultancy
- **10+ live API integrations** including government data sources (DVLA, MOT), 7 market data providers, SMS verification, email, and security services
- **Enterprise-grade security**: Row-Level Security, OTP verification, signed sessions, rate limiting, bot protection, input hardening, immutable audit logs
- **Three distinct user interfaces**: public customer funnel, admin CRM, and inspector panel — each with role-based access
- **A mileage fraud detection system** that analyses MOT history to flag odometer rollbacks
- **Regional pricing intelligence** across 5 UK regions with segment-specific adjustments for 9 vehicle categories
- **A self-calibrating feedback loop** — the engine learns from completed transactions to improve accuracy over time

### Market Rate Comparison

| Scope | Typical Agency Rate | This Invoice |
|---|---|---|
| Custom CRM build | £5,000–£15,000 | Included |
| Proprietary pricing engine | £5,000–£10,000 | Included |
| Multi-API integration (10+ APIs) | £3,000–£8,000 | Included |
| Public lead capture funnel | £2,000–£5,000 | Included |
| Mobile inspector panel | £2,000–£4,000 | Included |
| Database design + security | £1,500–£3,000 | Included |
| **Typical total** | **£18,500–£45,000** | **£3,285** |

You are receiving this at a **fraction of market rate** because you're family.

---

## Codebase Summary

| Metric | Value |
|---|---|
| Total Files | 121 |
| TypeScript Files | 63 |
| React Components (TSX) | 35 |
| SQL Migrations | 12 |
| Database Tables | 10 |
| Custom Enums | 5 |
| DB Indexes | 13 |
| Valuation Engine Steps | 16 |
| Risk Scoring Factors | 18+ |
| Market Data Providers | 7 |
| API Integrations | 10+ |
| UI Screens | 15+ |
| Vehicle Segments | 9 |
| Region Bands | 5 |
| Documentation Files | 8 |

---

## Payment Terms

- **Net 30** — payment due within 30 days of invoice date
- **5% early payment discount** if paid within 7 days of issue (total: **£3,120.75**)
- This invoice covers the complete v1 deliverable as scoped and agreed
- Future maintenance, hosting costs (Vercel, Supabase, API subscriptions), and feature additions are billed separately

### Bank Transfer Details

| | |
|---|---|
| **Account Name** | *(Your Full Name)* |
| **Bank** | *(Your Bank Name)* |
| **Sort Code** | *(XX-XX-XX)* |
| **Account Number** | *(XXXXXXXX)* |
| **Reference** | MCAR-2026-001 |

---

## Notes

- Ongoing API subscription costs (DVLA, MOT, Twilio, Resend, Upstash, etc.) are the client's responsibility and are **not** included in this invoice
- Vercel and Supabase hosting fees are the client's responsibility
- This invoice covers **development and delivery only** — not ongoing support or maintenance
- Source code and all documentation are included in the deliverable
- A setup runbook is provided for environment configuration

---

## Business Impact

This system is designed to directly improve your bottom line:

| Impact Area | How |
|---|---|
| **Faster Lead Capture** | Customers get an instant valuation in under 60 seconds — no waiting, no callbacks. More leads convert before they shop around. |
| **Higher Margins** | The 16-step engine prices conservatively with built-in margin protection. Every offer already accounts for recon, sell costs, and market risk. |
| **Reduced Losses** | Mileage fraud detection and MOT risk analysis flag dangerous stock before you commit. Finance check tracking catches outstanding finance early. |
| **Improved Close Rate** | The CRM pipeline gives full visibility on every lead. No leads fall through the cracks. Notes, checklists, and audit logs keep your team accountable. |
| **Lower Operational Cost** | Automated emails, self-service booking, and structured inspector workflows reduce the manual work per deal. |
| **Smarter Over Time** | The calibration feedback loop means the engine learns from every completed deal — pricing accuracy improves the more you use it. |

---

## Optional: Ongoing Support & Maintenance

To keep the system running smoothly, monitored, and up to date:

| Plan | Includes | Monthly |
|---|---|---|
| **Essential** | Bug fixes, security patches, uptime monitoring | £150/month |
| **Standard** | Everything in Essential + API monitoring, performance checks, minor adjustments | £250/month |
| **Premium** | Everything in Standard + feature additions, engine tuning, priority response | £400/month |

> Support is optional but recommended. Without a maintenance plan, any issues, updates, or changes after handover will be quoted separately at standard rates.

---

*Thank you for your business!*
