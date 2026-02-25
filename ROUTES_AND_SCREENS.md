# Routes & Screens – Vehicle Acquisition & CRM System v1

---

## Conventions

- **Access** column uses roles defined in the scope: `Public` (no login), `Admin`, `Inspector`
- **Data** column lists what must be fetched or available for the page to render
- **Actions** column lists what a user can do on that page

---

## Public Funnel

Step-based form flow. No authentication. All state held in session/local storage until submission.

---

### `GET /`

**Purpose:** Marketing home page with CTA to start an offer

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | None (static) |
| **Actions** | Navigate to `/offer` |

---

### `GET /offer`

**Purpose:** Step 1 — Reg plate entry

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | None on load |
| **Actions** | Enter reg plate → trigger server-side reg lookup → advance to `/offer/confirm` |
| **Notes** | Rate limited. Reg lookup hits DVLA/third-party API server-side only |

---

### `GET /offer/confirm`

**Purpose:** Step 2 — Confirm vehicle returned by reg lookup

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | Vehicle data from reg lookup (make, model, year, fuel, transmission, colour) |
| **Actions** | Confirm vehicle → advance to `/offer/details`; or go back to re-enter reg |

---

### `GET /offer/details`

**Purpose:** Step 3 — Mileage and condition input

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | Confirmed vehicle data (carried from previous step) |
| **Actions** | Enter mileage + select condition → advance to `/offer/contact` |

---

### `GET /offer/contact`

**Purpose:** Step 4 — Contact details gate (mandatory before offer is shown)

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | None on load |
| **Actions** | Submit name, phone, email, postcode + consent checkboxes → calculate offer range → advance to `/offer/book` |
| **Notes** | Offer range calculated server-side here. Lead record created in DB at this point |

---

### `GET /offer/book`

**Purpose:** Step 5 — Appointment booking

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | Calculated offer range (min/max); available time slots from booking rules |
| **Actions** | Select appointment type (in-person / video) + date + time slot → submit booking → advance to `/offer/done` |
| **Notes** | Slots filtered by: Mon–Sat only, 24h minimum notice, type-appropriate duration (45min / 20min) |

---

### `GET /offer/done`

**Purpose:** Step 6 — Confirmation screen

| Property | Detail |
|---|---|
| **Access** | Public |
| **Data** | Appointment summary (type, date, time); offer range |
| **Actions** | None (terminal step). Confirmation email triggered server-side |

---

## Admin Panel

All routes require `admin` role. Redirect to login if unauthenticated.

---

### `GET /admin`

**Purpose:** Dashboard overview

| Property | Detail |
|---|---|
| **Access** | Admin |
| **Data** | Aggregate stats: total leads, leads by status, upcoming appointments today/this week, recent activity |
| **Actions** | Navigate to leads, calendar, settings |

---

### `GET /admin/leads`

**Purpose:** Lead list with filtering and search

| Property | Detail |
|---|---|
| **Access** | Admin |
| **Data** | Paginated `leads` rows; filter options: status, finance_status, date range, assigned inspector |
| **Actions** | Search by name/reg/email; filter by status or finance status; open lead detail; export filtered results to CSV |

---

### `GET /admin/leads/:id`

**Purpose:** Full lead detail view

| Property | Detail |
|---|---|
| **Access** | Admin |
| **Data** | Lead record; linked appointment; inspection (if submitted); notes list; audit log; prepurchase checklist |
| **Actions** | Update pipeline status; update finance status; assign inspector; add note; mark prepurchase checklist items; view inspection results and photos |

---

### `GET /admin/calendar`

**Purpose:** Appointment calendar view

| Property | Detail |
|---|---|
| **Access** | Admin |
| **Data** | All appointments with `booked` or `completed` status; linked lead summary per appointment |
| **Actions** | View appointments by day/week; click appointment to open linked lead detail; update appointment status (completed / cancelled / no_show) |

---

### `GET /admin/settings`

**Purpose:** Booking rules and notification template configuration

| Property | Detail |
|---|---|
| **Access** | Admin |
| **Data** | Current booking rules (hours, durations, notice period); email template content |
| **Actions** | Edit available days/hours; edit appointment durations; edit email confirmation template copy |

---

## Inspector Panel

All routes require `inspector` role. Inspectors see only leads assigned to them.

---

### `GET /inspector`

**Purpose:** Assigned inspections list

| Property | Detail |
|---|---|
| **Access** | Inspector |
| **Data** | Leads where `assigned_inspector_id = current user` and `status = appointment_booked` or `inspected`; linked appointment datetime |
| **Actions** | View upcoming and past assignments; open inspection form |

---

### `GET /inspector/:leadId`

**Purpose:** Inspection form for a specific lead

| Property | Detail |
|---|---|
| **Access** | Inspector (assigned to this lead only) |
| **Data** | Lead vehicle details; appointment info; existing inspection record if partially saved |
| **Actions** | Complete checklist sections; upload photos per section; enter recommended offer amount; add notes; submit inspection (triggers admin alert notification) |
| **Notes** | Once submitted, form becomes read-only. Submission sets `lead.status = inspected` and writes to `audit_log` |

---

## Auth

### `GET /login`

| Property | Detail |
|---|---|
| **Access** | Public (unauthenticated only — redirect if already logged in) |
| **Data** | None |
| **Actions** | Email + password login via Supabase Auth; redirects Admin → `/admin`, Inspector → `/inspector` |

---

## Route Access Summary

| Route | Admin | Inspector | Public |
|---|---|---|---|
| `/` | ✓ | ✓ | ✓ |
| `/offer/*` | ✓ | ✓ | ✓ |
| `/admin` | ✓ | ✗ | ✗ |
| `/admin/leads` | ✓ | ✗ | ✗ |
| `/admin/leads/:id` | ✓ | ✗ | ✗ |
| `/admin/calendar` | ✓ | ✗ | ✗ |
| `/admin/settings` | ✓ | ✗ | ✗ |
| `/inspector` | ✗ | ✓ | ✗ |
| `/inspector/:leadId` | ✗ | ✓ (assigned only) | ✗ |
| `/login` | ✓ | ✓ | ✗ |
