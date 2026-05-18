# 🧪 Manual Test Checklist — Goal Setting & Tracking Portal

Run these in order. Each test should pass before moving to the next phase.

---

## Phase 1: Authentication

| # | Test | Steps | Expected |
|---|---|---|---|
| 1.1 | Login as employee | Open `/auth/login`, click "Employee" demo button, submit | Redirected to `/employee/dashboard` |
| 1.2 | Login as manager | Click "Manager" demo, submit | Redirected to `/manager/dashboard` |
| 1.3 | Login as admin | Click "Admin/HR" demo, submit | Redirected to `/admin/dashboard` |
| 1.4 | Invalid credentials | Enter wrong password | Error message shown, no redirect |
| 1.5 | Protected route | Visit `/admin/dashboard` logged out | Redirected to `/auth/login` |
| 1.6 | Role guard | Login as employee, visit `/admin/dashboard` | Redirected to employee dashboard |
| 1.7 | Sign out | Click "Sign out" in sidebar | Redirected to login |

---

## Phase 2: Employee — Goal Creation

| # | Test | Expected |
|---|---|---|
| 2.1 | Create goal sheet | Click "Create Goal Sheet" | Sheet created, form appears |
| 2.2 | Add goal — valid | Fill all fields, weightage=25 | Goal added, total shows 25% |
| 2.3 | Add goal — below min weightage | Set weightage=5 | Validation error: "Minimum 10%" |
| 2.4 | Add goal — exceed total | Add goals totaling >100% | Error: "would exceed 100%" |
| 2.5 | Add goal #9 | Try to add 9th goal | Button disabled / error: "Maximum 8 goals" |
| 2.6 | Edit goal | Click edit pencil | Form pre-filled, can update |
| 2.7 | Delete goal | Click trash, confirm | Goal removed, weightage recalculated |
| 2.8 | All UoM types | Test each dropdown option | All options selectable |

---

## Phase 3: Employee — Goal Submission

| # | Test | Expected |
|---|---|---|
| 3.1 | Submit with <100% | Total = 80%, click Submit | Error: "Total weightage must be 100%" |
| 3.2 | Submit with exactly 100% | Total = 100%, click Submit | Sheet status → "Submitted" |
| 3.3 | Edit after submit | Try to edit goal | Edit buttons hidden |
| 3.4 | View submitted status | Check status badge | Shows "Submitted" in blue |

---

## Phase 4: Manager — Review Workflow

| # | Test | Expected |
|---|---|---|
| 4.1 | See pending submission | Login as manager | emp2's sheet shows "Submitted" + Approve/Rework buttons |
| 4.2 | Approve sheet | Click "Approve" button | Status → "Approved", success message |
| 4.3 | Send for rework | Click "Rework", enter reason, confirm | Status → "Rework", comment added |
| 4.4 | View sheet detail | Click chevron → review page | Full goal list with UoM and targets |
| 4.5 | Add comment | Type comment, click send | Comment appears in thread |
| 4.6 | Filter by status | Click "Pending Review" stat card | Only submitted sheets shown |

---

## Phase 5: Employee — Rework Flow

| # | Test | Expected |
|---|---|---|
| 5.1 | See rework status | Login as reworked employee | Status badge shows "Rework" in amber |
| 5.2 | View manager comment | Expand comments section | Manager feedback visible |
| 5.3 | Edit goals | Edit is re-enabled | Can modify goals and weightage |
| 5.4 | Resubmit | Fix goals, click Submit | Status → "Submitted" again |

---

## Phase 6: Quarterly Updates (Approved Sheet)

| # | Test | Expected |
|---|---|---|
| 6.1 | See quarterly grid | Login as employee, expand goal | Q1/Q2/Q3/Q4 boxes visible |
| 6.2 | Add Q1 update | Click "Update" on Q1 | Modal opens with form |
| 6.3 | Save update | Fill actual value, status, save | Progress % calculated and shown |
| 6.4 | Progress formula check | Higher-is-better, target=100, actual=80 | Shows 80% |
| 6.5 | Zero-based formula | UoM=zero_based, actual=0 | Shows 100% |
| 6.6 | Lower-is-better | target=5, actual=4 | Shows 125% (capped at 100%) |
| 6.7 | Edit existing update | Click "Edit" on filled quarter | Pre-filled modal |

---

## Phase 7: Admin Functions

| # | Test | Expected |
|---|---|---|
| 7.1 | View all sheets | Admin dashboard table | All employees listed |
| 7.2 | Lock approved sheet | Click "Lock" on approved sheet | Status → "Locked" in purple |
| 7.3 | Unlock locked sheet | Click "Unlock" | Status → "Approved" |
| 7.4 | Export CSV | Click "Export CSV" | CSV downloaded with correct columns |
| 7.5 | Filter by status | Select "submitted" filter | Only submitted sheets |
| 7.6 | Search employee | Type name in search | Filtered results |

---

## Phase 8: User Management

| # | Test | Expected |
|---|---|---|
| 8.1 | View all users | Admin → Users | All users with roles shown |
| 8.2 | Edit user role | Click edit, change role to Manager | Role updated after save |
| 8.3 | Assign manager | Edit user, select manager | Manager relationship saved |
| 8.4 | Deactivate user | Uncheck "Active", save | User shows as inactive |

---

## Phase 9: Shared Goals

| # | Test | Expected |
|---|---|---|
| 9.1 | View shared goals page | Admin → Shared Goals | Goal list + assignment list |
| 9.2 | Assign shared goal | Select goal, employees, weightage, assign | Success message |
| 9.3 | See existing assignments | Right panel | All assignments listed |

---

## Phase 10: Audit Logs

| # | Test | Expected |
|---|---|---|
| 10.1 | View audit logs | Admin → Audit Logs | Last 100 entries |
| 10.2 | Filter by table | Select "goals" table | Only goal changes |
| 10.3 | Filter by action | Select "UPDATE" | Only updates |
| 10.4 | View diff | Click "View diff" | Before/after JSON shown |
| 10.5 | Export audit CSV | Click "Export CSV" | Downloaded CSV |

---

## Phase 11: Reports & Analytics

| # | Test | Expected |
|---|---|---|
| 11.1 | Overview tab | See pie chart and bar chart | Charts render correctly |
| 11.2 | Department chart | Check bars | Stacked by status |
| 11.3 | Details tab | Switch to detailed view | Table with Q1–Q4 progress |
| 11.4 | Filter by year | Select specific year | Charts and table update |
| 11.5 | Full CSV export | Click "Export Full CSV" | Detailed CSV with quarterly data |

---

## Phase 12: Responsive Design

| # | Test | Expected |
|---|---|---|
| 12.1 | Mobile nav | Resize < 1024px | Hamburger menu appears |
| 12.2 | Open mobile drawer | Click menu | Sidebar slides in |
| 12.3 | Close drawer | Click overlay | Drawer closes |
| 12.4 | Cards on mobile | View dashboard | Cards stack vertically |
| 12.5 | Tables on mobile | View tables | Horizontal scroll works |

---

## Business Rules Validation Summary

| Rule | Enforced Where |
|---|---|
| Max 8 goals | Server action + DB trigger |
| Min 10% weightage | Zod schema + form validation |
| Total = 100% | Server action on submit |
| Draft/rework → editable | RLS policy + UI gate |
| Submitted → manager only | RLS policy |
| Locked → admin only to unlock | RLS policy + UI |
| Progress formulas | `calculateProgress()` in utils + PG function |
| Audit logging | DB triggers on all key tables |
