# Vehicle Acquisition & CRM System – v1 Scope

---

## User Roles

- **Admin** — Full system access (leads, pipeline, inspections, status updates, exports)
- **Inspector** — Access only to assigned inspections and related lead information
- **Seller (Public User)** — Access only to public funnel (no login required)

---

## 1. Public Funnel

The customer-facing flow for submitting a vehicle and booking an appointment.

- **Reg Lookup** — Enter registration plate to auto-populate vehicle details (make, model, year, etc.)
- **Mileage + Condition Inputs** — User provides current mileage and selects condition (e.g. Excellent / Good / Fair / Poor)
- **Contact Details** *(mandatory)* — Full name, phone number, email address
- **Offer Range Display** — Show estimated offer range based on reg + mileage + condition data
- **Appointment Booking** — User selects appointment type, date, and time slot (subject to booking rules)

---

## 2. Admin CRM

Internal dashboard for managing leads from submission through to purchase.

- **Lead List** — Paginated, searchable, and filterable table of all submitted leads
- **Lead Detail View** — Full profile per lead: vehicle info, contact details, offer history, activity log
- **Status Pipeline** — Kanban or dropdown-based pipeline with the following fixed stages:

  ### Status Pipeline (Fixed v1)

  1. New
  2. Contacted
  3. Appointment Booked
  4. Inspected
  5. Offer Approved
  6. Won
  7. Lost

- **Finance Check Status** — HPI/finance check result recorded per vehicle using the following fixed values:

  | Value | Meaning |
  |---|---|
  | Not Checked | Check not yet initiated |
  | Clear | No finance or markers found |
  | Finance Found | Outstanding finance or flag detected |
- **Pre-Purchase Checklist** — Structured checklist to confirm all steps before finalising a purchase
- **Notes** — Free-text notes field per lead, with timestamp and author
- **CSV Export** — Export lead list (full or filtered) to CSV for reporting

---

## 3. Inspector Panel

A dedicated view for assigned inspectors to manage and complete vehicle inspections.

- **Assigned Inspections** — List of inspections assigned to the logged-in inspector, with date/time and customer info
- **Inspection Checklist** — Structured checklist (bodywork, interior, mechanical, tyres, etc.) completed on-site
- **Photo Upload** — Upload photos per checklist section or per vehicle panel
- **Recommend Final Offer** — Inspector submits a recommended offer figure based on physical inspection findings

---

## 4. Notifications

Automated communications triggered by key events.

- **Customer Appointment Confirmation Email** — Sent immediately upon booking (includes date, time, type, and location/video link)
- **Appointment Reminder Email** *(optional)* — Sent to customer 24 hours before their scheduled appointment
- **Admin Alert: New Lead Submission** — Internal notification triggered when a new lead is submitted via the public funnel
- **Admin Alert: Inspection Completion** — Internal notification triggered when an inspector submits their findings and recommended offer

---

## 5. Booking Rules

Constraints applied to the appointment booking system.

| Rule | Detail |
|---|---|
| Available Days | Monday – Saturday |
| In-Person Appointment Duration | 45 minutes |
| Video Appointment Duration | 20 minutes |
| Minimum Notice Required | 24 hours before appointment |

---

## 6. Data Handling

- All lead, inspection, and appointment data stored centrally in the CRM database
- Role-based access control enforced across all panels
- Audit log retained for all status changes and note updates

---

## 7. Security & Abuse Protection

- Server-side reg lookup — DVLA/third-party API keys are never exposed to the client
- Rate limiting applied to the vehicle lookup endpoint to prevent scraping
- Bot protection on the public funnel to block repeated automated submissions
