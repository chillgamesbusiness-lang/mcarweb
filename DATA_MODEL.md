# Data Model – Vehicle Acquisition & CRM System v1

---

## Enums

Define each enum once here. Reference these throughout the schema.

```
lead_status:
  - new
  - contacted
  - appointment_booked
  - inspected
  - offer_approved
  - won
  - lost

finance_status:
  - not_checked
  - clear
  - finance_found

appointment_type:
  - in_person
  - video

appointment_status:
  - booked
  - completed
  - cancelled
  - no_show

user_role:
  - admin
  - inspector
```

---

## Tables

---

### `users`

Internal staff accounts only. Public sellers do not have accounts.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `name` | `text` | Full name |
| `email` | `text` | Unique, used for login |
| `role` | `user_role` | Enum: `admin` / `inspector` |
| `is_active` | `boolean` | Default `true`. Set `false` to deactivate without deleting |
| `created_at` | `timestamptz` | Auto-set on insert |
| `last_login_at` | `timestamptz` | Updated on each successful auth |

---

### `leads`

Core table. One row per seller submission.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `created_at` | `timestamptz` | Auto-set on insert |
| **Seller Details** | | |
| `seller_name` | `text` | Full name |
| `seller_phone` | `text` | Required |
| `seller_email` | `text` | Required |
| `seller_postcode` | `text` | Required |
| **Vehicle Details** | | |
| `reg` | `text` | Registration plate (uppercased) |
| `make` | `text` | From reg lookup API |
| `model` | `text` | From reg lookup API |
| `year` | `integer` | Year of manufacture |
| `fuel` | `text` | e.g. Petrol / Diesel / Electric / Hybrid |
| `transmission` | `text` | e.g. Manual / Automatic |
| `colour` | `text` | From reg lookup API (optional) |
| **Condition** | | |
| `mileage` | `integer` | User-entered, in miles |
| `condition` | `text` | Enum-like: `excellent` / `good` / `fair` / `poor` |
| **Offer** | | |
| `estimated_min` | `integer` | Calculated offer range lower bound (£) |
| `estimated_max` | `integer` | Calculated offer range upper bound (£) |
| **CRM State** | | |
| `status` | `lead_status` | Default `new` |
| `finance_status` | `finance_status` | Default `not_checked` |
| `assigned_inspector_id` | `uuid` | Nullable. FK → `users.id` |
| **Attribution** | | |
| `source` | `text` | Optional. e.g. `organic` / `paid_google` / `paid_meta` |
| **Consent** | | |
| `consent_marketing` | `boolean` | Default `false` |
| `consent_data_processing` | `boolean` | Required `true` on submit |

---

### `appointments`

One appointment per lead (v1). Can be extended to multiple in future.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `lead_id` | `uuid` | FK → `leads.id` |
| `type` | `appointment_type` | Enum: `in_person` / `video` |
| `start_at` | `timestamptz` | Appointment start datetime |
| `end_at` | `timestamptz` | Derived from type + booking rules (45min / 20min) |
| `status` | `appointment_status` | Default `booked` |
| `location_or_link` | `text` | Physical address or video call URL |
| `created_at` | `timestamptz` | Auto-set on insert |

---

### `inspections`

One inspection per lead, submitted by the assigned inspector.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `lead_id` | `uuid` | FK → `leads.id` |
| `inspector_id` | `uuid` | FK → `users.id` |
| `checklist_json` | `jsonb` | Structured checklist results (bodywork, interior, mechanical, tyres, etc.) |
| `photo_urls` | `text[]` | Array of uploaded file URLs (Supabase Storage) |
| `recommended_offer` | `integer` | Inspector's recommended offer amount (£) |
| `notes` | `text` | Free-text inspector notes |
| `submitted_at` | `timestamptz` | Set when inspector submits |

> **Note:** If photo management becomes complex, promote `photo_urls` to a separate `inspection_photos` table with `inspection_id`, `url`, `label`, `uploaded_at`.

---

### `notes`

Admin-authored notes attached to a lead. Multiple notes per lead allowed.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `lead_id` | `uuid` | FK → `leads.id` |
| `author_user_id` | `uuid` | FK → `users.id` |
| `body` | `text` | Note content |
| `created_at` | `timestamptz` | Auto-set on insert |

---

### `audit_log`

Immutable event log. Written to on any significant state change. Never updated or deleted.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `lead_id` | `uuid` | FK → `leads.id` |
| `action` | `text` | Fixed values: `status_change` / `finance_change` / `assignment_change` / `note_added` / `inspection_submitted` |
| `actor_user_id` | `uuid` | FK → `users.id` — who triggered the event |
| `old_value` | `jsonb` | Previous state snapshot |
| `new_value` | `jsonb` | New state snapshot |
| `created_at` | `timestamptz` | Auto-set on insert |

---

### `prepurchase_checklist`

One checklist per lead, completed before purchase is finalised.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key |
| `lead_id` | `uuid` | FK → `leads.id` (unique — one per lead) |
| `items_json` | `jsonb` | Key/boolean map of checklist items and completion state |
| `completed_at` | `timestamptz` | Nullable. Set when all items are checked |
| `completed_by` | `uuid` | Nullable. FK → `users.id` |

---

## Relationships Summary

```
users
  ↳ leads.assigned_inspector_id
  ↳ notes.author_user_id
  ↳ inspections.inspector_id
  ↳ audit_log.actor_user_id
  ↳ prepurchase_checklist.completed_by

leads
  ↳ appointments.lead_id
  ↳ inspections.lead_id
  ↳ notes.lead_id
  ↳ audit_log.lead_id
  ↳ prepurchase_checklist.lead_id
```
