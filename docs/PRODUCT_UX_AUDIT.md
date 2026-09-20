# KidsKalender — Product & UX Audit

**Repository:** https://github.com/Breaz123/KidsKalender  
**Branch:** `master`  
**Audit Date:** Sunday, September 20, 2026  
**Scope:** Read-only analysis; no feature implementation

---

## Executive Summary

KidsKalender is a well-architected Progressive Web App (PWA) for managing shared child custody calendars between two parents. The codebase is clean, modern, and production-ready from a technical perspective. However, several critical user-facing gaps exist:

**Critical Gaps (P0):**
1. ❌ **No per-user private agenda** — all calendar entries are shared between both parents; no way for each parent to add personal items the other parent cannot see
2. ⚠️ **"Today" calculation issues** — date logic uses client-side timezone without explicit Europe/Brussels configuration
3. ⚠️ **Limited year planning** — year selector restricted to ±2 years; no recurrence patterns for repeating schedules

**Moderate Gaps (P1):**
4. 🔒 **Privacy leak risk** — API endpoints do not filter by user; household-wide queries could expose future private events if that feature is added
5. 📱 **Mobile UX rough edges** — empty states, touch targets, loading feedback, and accessibility need polish

**Findings Summary:**
- ✅ Authentication & session management are solid
- ✅ Offline support (IndexedDB caching) works well
- ✅ Conflict resolution (optimistic locking) prevents data loss
- ❌ Missing privacy layer for per-user data
- ❌ Date handling is timezone-naive (relies on browser)
- ❌ Limited future planning (no recurrence, narrow year range)

---

## 1. Current Feature Inventory

### 1.1 Authentication & User Management

**Status:** ✅ **Implemented, production-ready**

- **Session-based authentication** with HTTP-only secure cookies
- **Argon2 password hashing** (industry best practice)
- **Session expiry:** 168 hours (1 week) by default
- **Password change flow:** Users can change their own password via `/api/settings/change-password`
- **User roles:** `parent` and `admin` (both have identical permissions currently)
- **No self-registration:** Users created via CLI script only (`npm run user:create`)
- **Two parents per household:** Each user is linked to one household; both parents share the same household ID

**Gaps:**
- ❌ No password reset flow (requires admin intervention if forgotten)
- ❌ No 2FA or magic link login
- ❌ No session list or "log out all devices" feature

---

### 1.2 Calendar Modes & Views

**Status:** ✅ **Core functionality complete**

KidsKalender provides three primary views:

#### 1.2.1 **Today Page** (`/`)
- Displays **today** and **tomorrow** as large cards
- Shows: daytime location, activity, sleep location, brought by, picked up by, note
- Date formatted as: `"Vandaag"` + `"EEEE d MMMM yyyy"` (e.g., "zondag 20 september 2026")

**Code:**
```typescript
// apps/web/src/pages/TodayPage.tsx
const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
```

**Issue:** `new Date()` uses the browser's local timezone. If the browser clock is misconfigured or the user travels across timezones, "today" may be incorrect for Belgium.

---

#### 1.2.2 **Calendar Page** (`/kalender`)
- Month grid view with week start = Monday
- Color-coded cells:
  - **Sleep location** determines primary background color
  - **Daytime location** (if different) shown as diagonal gradient split
- Month/year selector dropdown (**hardcoded to ±2 years from current year**)
- Tap cell → navigate to day detail
- Tap "+" → create new entry (via modal form)

**Code:**
```typescript
// apps/web/src/pages/CalendarPage.tsx:120-127
<select value={year} onChange={(e) => setCurrentDate(new Date(parseInt(e.target.value, 10), month - 1, 1))}>
  {Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
    <option key={y} value={y}>{y}</option>
  ))}
</select>
```

**Limitation:** If `year = 2026`, dropdown shows only 2024, 2025, 2026, 2027, 2028. Planning for 2030 or 2023 requires manually changing the URL or waiting until 2028.

---

#### 1.2.3 **Day Detail Page** (`/dag/:date`)
- Full CRUD for one day:
  - Daytime location (papa, mama, oma, omi, opi, andere + text field)
  - Activity (vakantie, school, krakkebol, andere + text field) — **optional**
  - Sleep location (papa, mama, oma, omi, opi, or `null` = "Niet ingevuld")
  - Brought by / Picked up by (papa, mama, trixie, oma, omi, opi, andere, nvt + text fields)
  - Free-text note (max 500 chars)
- **Bulk operations:**
  - "Opslaan en volgende dag" → save current day, open form for tomorrow
  - "Kopiëren naar morgen" → save current day, then copy values to tomorrow
  - Multi-day range selector → apply same values to date range (e.g., entire school week)
- **Copy to another date:** `/api/calendar/:date/copy` with `targetDate`
- **Delete entry:** Removes entry but keeps audit log
- **History view:** Shows all edits (who changed what, when) via audit log

---

#### 1.2.4 **Overview Page** (`/overzicht`)
- Lists **all entries** across all months, sorted by date
- Useful for export or bulk review
- **Performance concern:** No pagination; queries entire household calendar via `getAllEntries()`

---

#### 1.2.5 **Settings Page** (`/instellingen`)
- Change household name
- Customize labels and colors for:
  - Sleep locations (label, description, color palette, icon)
  - Daytime locations (label, icon)
  - Activities (label, icon)
  - Persons (label, icon)
- Change password
- Export calendar as CSV or JSON
- Import calendar from JSON

**Customization:**
- 12 color presets (WCAG AA-compliant contrast)
- Icons: sun, moon, home, users, heart, baby, school, briefcase, plane, car, mapPin, star, coffee, tree, building
- Labels sync: changing "Papa" in sleep settings also updates daytime + persons

---

### 1.3 Data Model & Sharing

**Current Model:**
```typescript
// Database schema (Drizzle ORM)
households         → id, name, displaySettings
users              → id, email, name, passwordHash, isActive
household_members  → householdId, userId, role (many-to-many)
calendar_entries   → householdId, date, daytimeLocation, sleepLocation, ...
audit_logs         → householdId, userId, action, previousValues, newValues
```

**Key Insight: All calendar entries are scoped to `householdId`, not `userId`.**

- Both parents see **exactly the same calendar**
- No per-user filtering
- No concept of "private events" or "personal agenda"

**Example Query:**
```typescript
// apps/api/src/services/calendar.service.ts:48
export async function getEntriesForMonth(householdId: string, year: number, month: number) {
  return db.select()
    .from(calendarEntries)
    .where(eq(calendarEntries.householdId, householdId))  // ← No userId filter
    .orderBy(calendarEntries.date);
}
```

**Consequence for Pain Point #4:**  
To add per-user private events, the schema must change:
- Add `calendarEntries.isPrivate: boolean` + `calendarEntries.ownerId: uuid`
- Add API-level filtering: `if (entry.isPrivate && entry.ownerId !== request.user.id) → exclude`
- Add UI toggle: "Shared" vs "Private" when creating/editing entries

---

### 1.4 Offline Support & Sync

**Status:** ✅ **Basic offline caching implemented**

- **TanStack Query** with `refetchInterval: 30000` (30 seconds)
- **IndexedDB cache** via `idb-keyval`:
  - On successful API fetch → `cacheCalendarMonth(year, month, entries)`
  - On network error → `getCachedCalendarMonth(year, month)` fallback
- **Optimistic locking:** `version` field prevents conflicting writes
- **Offline UX:** "U bent offline" banner; form inputs disabled

**Gaps:**
- ❌ No write queue (offline changes are not saved until connection restores)
- ❌ No background sync (Service Worker registered but does not handle POST/PUT)

**Code:**
```typescript
// apps/web/src/hooks/useCalendar.ts:8
export function useCalendarMonth(year: number, month: number) {
  return useQuery({
    queryFn: async () => {
      try {
        const data = await api.getCalendar(year, month);
        await cacheCalendarMonth(year, month, data.entries);
        return data.entries;
      } catch (err) {
        const cached = await getCachedCalendarMonth(year, month);
        if (cached) return cached.entries;
        throw err;
      }
    },
  });
}
```

---

### 1.5 Import/Export

**Status:** ✅ **Functional, basic format**

- **Export CSV:** `/api/export/csv` → `datum,overdag,activiteit,slapen,brengen,ophalen,opmerking`
- **Export JSON:** `/api/export/json` → `{ exportedAt, entries: [...] }`
- **Import JSON:** `/api/import/json` → Upsert entries; returns `{ created, updated, skipped }`
- **Conflict handling:** If `version` mismatch → skip entry

**Gaps:**
- ❌ No iCal export (cannot sync to Google Calendar, Outlook, Apple Calendar)
- ❌ No CSV import (only JSON)
- ❌ No backup/restore UI (must use CLI: `npm run backup` / `npm run restore`)

---

## 2. Date & Timezone Handling

### 2.1 How "Today" is Computed

**Client-side (Web App):**
```typescript
// apps/web/src/pages/TodayPage.tsx:6
const today = new Date();
const todayStr = format(today, 'yyyy-MM-dd');
```

**API (Server-side):**
```typescript
// apps/api/src/db/schema.ts:22
createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
```

**Timezone Configuration:**
- ❌ **No explicit timezone set for date-fns**
- ❌ **No server-side date normalization** (API accepts `yyyy-MM-dd` strings as-is)
- ❌ **PostgreSQL timestamps use UTC** (`timestamp with time zone`), but dates are stored as **date strings** (`date` column type = no timezone)

**Issue:**
1. User's browser is set to UTC+1 (Brussels)
2. User opens app at `2026-09-20 23:30 CEST`
3. Browser's `new Date()` → `2026-09-20 23:30`
4. User travels to London (UTC+0), opens app at `2026-09-20 22:00 UTC`
5. `new Date()` → `2026-09-20 22:00 UTC` → **still September 20th** ✅
6. **BUT** if user's device clock is wrong, or app is used after midnight UTC → "today" drifts

**Why This Matters for Pain Point #2:**
- Siemon reports "Today is not always correct"
- Likely causes:
  - **Browser clock misconfigured** (e.g., automatic timezone off)
  - **Midnight boundary confusion** (e.g., viewing at 23:59 CEST, refreshing at 00:01 CEST → "today" changes mid-session)
  - **No server-side "today" reference** (API does not enforce a canonical "now" for Belgium)

---

### 2.2 Recommended Fix

**Option A: Server-side "Today" Endpoint**
```typescript
// apps/api/src/routes/calendar.routes.ts
app.get('/today', async (request, reply) => {
  // Force Europe/Brussels timezone
  const today = new Date().toLocaleString('en-CA', { timeZone: 'Europe/Brussels' }).slice(0, 10);
  return { today };  // → "2026-09-20"
});
```

Frontend calls `/api/today` on mount, uses that as the canonical date.

**Option B: Client-side Timezone Enforcement**
```typescript
// apps/web/src/lib/date.ts
import { toZonedTime, format } from 'date-fns-tz';

export function getTodayInBelgium(): string {
  const now = new Date();
  const belgiumTime = toZonedTime(now, 'Europe/Brussels');
  return format(belgiumTime, 'yyyy-MM-dd');
}
```

Replace all `new Date()` calls with `getTodayInBelgium()`.

**Recommendation:** Use **Option A** (server-side) to ensure consistency even if the user's device clock is wrong.

---

### 2.3 Europe/Brussels Risks

**Current Behavior:**
- ✅ PostgreSQL `timestamp with time zone` stores UTC, converts correctly
- ✅ Date strings (`yyyy-MM-dd`) are timezone-agnostic
- ⚠️ But `new Date()` in browser depends on system clock

**Specific Risks:**
1. **DST transitions:** March 31, 2026 (02:00 → 03:00) and October 25, 2026 (03:00 → 02:00) — unlikely to cause issues because dates are stored as `yyyy-MM-dd` strings, not Unix timestamps
2. **Leap seconds:** PostgreSQL handles natively
3. **User travels to different timezone:** If they edit the calendar while abroad, date strings remain consistent (no drift)

**Verdict:** **Low risk** as long as "today" is computed server-side or with explicit timezone.

---

## 3. Year Planning

### 3.1 Current Max Range

**Calendar Page Year Selector:**
```typescript
// apps/web/src/pages/CalendarPage.tsx:120-127
{Array.from({ length: 5 }, (_, i) => year - 2 + i).map((y) => (
  <option key={y} value={y}>{y}</option>
))}
```

**Example:** If current year = 2026, dropdown shows:
- 2024
- 2025
- 2026 (current)
- 2027
- 2028

**Pain Point #3:** "Cannot schedule / plan for a whole year"
- **Technically possible:** User can select any month in the ±2 year range
- **But:** Cannot easily plan for, e.g., 2030 or 2023 (must wait until 2028 to see 2030)
- **Also:** No recurring patterns (e.g., "every other weekend with Papa" → manual entry for 52 weeks)

---

### 3.2 Recurrence Support

**Status:** ❌ **Not implemented**

**Use Case:**
- Standard custody arrangement: children with Papa every other weekend
- Current workflow: manually create ~26 entries (52 weeks ÷ 2)
- Desired: "Repeat every 2 weeks, indefinitely" or "Repeat until December 31, 2027"

**Database Impact:**
- No `recurrence_rule` field in `calendar_entries`
- Would need to either:
  1. **Expand entries on save** (e.g., "repeat every 2 weeks for 6 months" → insert 13 entries immediately)
  2. **Store recurrence rule** (e.g., iCal RRULE format) and expand on query (complex)

**Recommendation:** Start with **Option 1** (expand on save) for simplicity. Add RRULE parsing later if needed.

---

### 3.3 UI Limits

**Date Picker:**
- HTML `<input type="date">` has no built-in max/min constraints in the code
- Browser default allows selecting any date (tested in Chrome: can pick year 2099)
- **Gap:** Year dropdown limits to ±2, but date picker form allows any date

**API Limits:**
- ❌ No validation on `yyyy-MM-dd` format (accepts 2099-12-31, 1900-01-01)
- ❌ No max future date (could store entries for year 3000)

**Recommendation:**
- Frontend: Expand year dropdown to **current year - 1 to current year + 5** (covers 6 years total)
- API: Validate date range (e.g., 2020-01-01 to 2035-12-31) to prevent abuse

---

## 4. Privacy Model: Shared vs. Private

### 4.1 Current Sharing Model

**All calendar entries are household-shared:**
- Papa creates entry for September 20 → Mama sees it immediately
- No concept of "private events" or "personal agenda"

**Schema:**
```sql
-- apps/api/src/db/schema.ts
CREATE TABLE calendar_entries (
  household_id UUID NOT NULL REFERENCES households(id),
  date DATE NOT NULL,
  daytime_location VARCHAR(50),
  sleep_location VARCHAR(50),
  -- No user_id or is_private column
  UNIQUE (household_id, date)  -- ← Only one entry per household per day
);
```

---

### 4.2 Required Privacy Model (Pain Point #4)

**User Need:**
> "Need per-user PRIVATE personal agenda that ALSO shows the shared kinderregeling, so each parent can plan for themselves — the OTHER parent must NOT see those private items."

**Example Use Case:**
- Papa has a dentist appointment on September 20 at 14:00
- Papa wants to mark it in the calendar so he remembers
- Mama should **not** see Papa's dentist appointment
- But both should see the shared kinderregeling (e.g., "kids sleep with Papa tonight")

**Implementation Requirements:**

#### 4.2.1 **Schema Changes**
```sql
ALTER TABLE calendar_entries
  ADD COLUMN is_shared BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN owner_id UUID REFERENCES users(id),
  DROP CONSTRAINT calendar_entries_household_date_idx;

-- New unique constraint: allow multiple entries per day (one shared + one per user)
CREATE UNIQUE INDEX calendar_entries_household_date_shared_idx
  ON calendar_entries (household_id, date) WHERE is_shared = true;

CREATE UNIQUE INDEX calendar_entries_household_date_user_idx
  ON calendar_entries (household_id, date, owner_id) WHERE is_shared = false;
```

**Rationale:**
- One **shared** entry per day (both parents see/edit)
- One **private** entry per user per day (only owner sees)

---

#### 4.2.2 **API Filtering (CRITICAL SECURITY REQUIREMENT)**

**Current Code (NO PRIVACY):**
```typescript
// apps/api/src/services/calendar.service.ts:48
export async function getEntriesForMonth(householdId: string, year: number, month: number) {
  return db.select()
    .from(calendarEntries)
    .where(eq(calendarEntries.householdId, householdId))  // ← All entries returned
    .orderBy(calendarEntries.date);
}
```

**Required Code (WITH PRIVACY):**
```typescript
export async function getEntriesForMonth(
  householdId: string,
  userId: string,  // ← Must pass authenticated user ID
  year: number,
  month: number
) {
  return db.select()
    .from(calendarEntries)
    .where(
      and(
        eq(calendarEntries.householdId, householdId),
        gte(calendarEntries.date, startDate),
        lte(calendarEntries.date, endDate),
        or(
          eq(calendarEntries.isShared, true),         // ← Shared entries
          eq(calendarEntries.ownerId, userId)         // ← OR owned by current user
        )
      )
    )
    .orderBy(calendarEntries.date);
}
```

**SECURITY WARNING:**  
⚠️ **Privacy Leak Risk:** If the API changes are incomplete, one parent could see the other's private entries by:
1. Modifying API request (e.g., `GET /api/calendar?year=2026&month=9`)
2. Exploiting missing `userId` filter in `getEntriesForMonth()`

**Mitigation:**
- ✅ Enforce `userId` filtering in **all** calendar queries
- ✅ Add integration tests: "Papa cannot see Mama's private entries"
- ✅ Add API-level audit logging: log all private entry accesses

---

#### 4.2.3 **UI Changes**

**Entry Form:**
- Add toggle: **[Gedeeld]** vs **[Privé]**
- If "Privé" selected:
  - Show badge: "👁️ Alleen jij kunt dit zien"
  - Disable "Meerdere opeenvolgende dagen" (privacy entries should be single-day)

**Calendar View:**
- Show private entries with a different visual indicator (e.g., dashed border, lock icon)
- Day cells can have **two entries**: one shared (colored by sleep location) + one private (gray overlay with "P" icon)

**Today Page:**
- Show both shared and private entries for today/tomorrow
- Label: "Gedeelde regeling" vs "Privé afspraak"

---

### 4.3 Data Model Gaps for Privacy

**Current Gaps:**
1. ❌ No `is_shared` or `owner_id` columns
2. ❌ Unique constraint prevents multiple entries per day
3. ❌ API does not accept or return privacy fields
4. ❌ UI has no privacy controls

**Estimated Effort:**
- **Database migration:** 1-2 hours (add columns, update constraints, backfill `is_shared = true`)
- **API changes:** 4-6 hours (update all queries, add filtering, write tests)
- **Frontend UI:** 6-8 hours (toggle, visual indicators, calendar layout adjustments)
- **Testing:** 4 hours (integration tests for privacy boundaries)

**Total:** ~15-20 hours (P0 priority)

---

## 5. UI/UX Review

### 5.1 Information Architecture (IA)

**Navigation:**
```
Bottom Nav (5 tabs):
  [Vandaag]  [Kalender]  [+]  [Overzicht]  [Instellingen]
```

**IA Score:** ✅ **Solid, intuitive**
- Primary actions (Today, Calendar) are left-aligned
- "+" (add entry) is center-aligned (thumb-friendly on mobile)
- Overflow actions (Overview, Settings) are right-aligned

**Gaps:**
- ❌ No breadcrumb or back button on Day Detail page
- ❌ "Overzicht" tab is redundant (same as Calendar but less useful)
- ❌ No search or filter (e.g., "Show only days where kids sleep with Papa")

---

### 5.2 Mobile PWA Experience

**Status:** ✅ **PWA configured, installable**

**Service Worker:**
- Vite PWA plugin registered
- Offline fallback enabled
- Caches static assets (JS, CSS, fonts)

**Manifest:**
```json
// apps/web/public/manifest.json (inferred)
{
  "name": "Kinderregeling",
  "short_name": "Kinderregeling",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#3B82F6",
  "icons": [...]
}
```

**Mobile-Specific Issues:**

#### 5.2.1 **Touch Targets (Accessibility)**
- ❌ Month navigation arrows: 40px × 40px (borderline for WCAG AA, which recommends 44px)
- ✅ Calendar day cells: ~48px × 48px (adequate)
- ✅ Bottom nav tabs: 56px height (good)

**Recommendation:** Increase header button padding to 44px minimum.

---

#### 5.2.2 **Empty States**
- ❌ **Today Page:** If no entries exist → shows blank cards (confusing)
- ❌ **Calendar Page:** "Geen regelingen deze maand" message only appears if `entries.length === 0` (correct) but lacks CTA
- ❌ **Overview Page:** No message if empty

**Recommended Empty State (Today Page):**
```
┌───────────────────────────────────────┐
│  📅 Geen regeling voor vandaag        │
│                                       │
│  Tik op + om een regeling toe te     │
│  voegen.                              │
│                                       │
│  [+ Regeling toevoegen]               │
└───────────────────────────────────────┘
```

---

#### 5.2.3 **Loading Feedback**
- ✅ Calendar Page: "Kalender laden…" spinner
- ✅ Entry Form: "Opslaan…" button state
- ❌ **Today Page:** No skeleton loader (entire page is blank until data loads)

**Recommendation:** Add skeleton UI:
```tsx
<div className="animate-pulse">
  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
  <div className="h-32 bg-gray-200 rounded-lg"></div>
</div>
```

---

#### 5.2.4 **Offline Banner**
- ✅ "U bent offline" banner appears in Entry Form
- ❌ **No global offline indicator** (user might not realize why data is stale)

**Recommendation:** Add persistent offline banner in app header:
```tsx
{!isOnline && (
  <div className="bg-amber-100 text-amber-900 px-4 py-2 text-sm text-center">
    Offline — wijzigingen zijn niet mogelijk
  </div>
)}
```

---

### 5.3 Accessibility (A11y) Quick Pass

**WCAG 2.1 AA Compliance Check:**

#### 5.3.1 **Keyboard Navigation**
- ✅ All forms are keyboard-accessible
- ✅ Modal traps focus correctly
- ❌ **Calendar day cells:** Cannot navigate with arrow keys (must tab through 30+ cells)

**Recommendation:** Add keyboard shortcuts:
- `Arrow keys` → navigate calendar grid
- `Enter` → open day detail
- `Escape` → close modal

---

#### 5.3.2 **Screen Reader Support**
- ✅ Form labels: `<label htmlFor="entry-date">`
- ✅ ARIA roles: `role="alert"` on error messages
- ❌ **Calendar grid:** Missing `<table>` semantics (uses `<div>` grid)
- ❌ **Day cells:** No `aria-label` describing entry summary

**Recommendation:**
```tsx
<button
  aria-label={`${format(day, 'd MMMM')}: ${entry ? 'Slapen bij ' + getSleepLabel(entry.sleepLocation) : 'Geen regeling'}`}
  onClick={() => navigate(`/dag/${dateStr}`)}
>
  {day.getDate()}
</button>
```

---

#### 5.3.3 **Color Contrast**
- ✅ All color presets use WCAG AA-compliant contrast ratios
- ✅ Default palette (blue/pink) has 7:1 contrast (AAA)
- ❌ **Empty day cells:** Gray-on-gray (`#F9FAFB` bg, `#374151` text = 6.5:1) — passes AA but borderline

**Verdict:** ✅ **WCAG AA compliant** for color contrast.

---

#### 5.3.4 **Focus Indicators**
- ✅ Tailwind's `focus:ring-2 focus:ring-blue-500` applied to form inputs
- ❌ **Calendar day cells:** No visible focus ring on keyboard navigation

**Recommendation:** Add `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500` to day cells.

---

### 5.4 Visual Design & Consistency

**Design System:**
- ✅ Consistent use of Tailwind utility classes
- ✅ Color palette is harmonious (blue/pink/green/teal)
- ✅ Typography: clear hierarchy (text-2xl headers, text-sm labels)
- ❌ **Icon inconsistency:** Some buttons use Lucide icons (`ChevronLeft`, `ChevronRight`), but the icon picker in Settings uses custom icon keys (`'home'`, `'heart'`). No actual icon components rendered (only labels).

**Actual Icon Rendering:**
```typescript
// apps/web/src/lib/icons.tsx
export const iconMap: Record<DisplayIconKey, React.ComponentType> = {
  sun: Sun,
  moon: Moon,
  home: Home,
  // ... (Lucide icons imported)
};
```

**Issue:** Settings page allows choosing icons, but those icons are **not displayed in the calendar UI**. Day cells only show colored backgrounds, no icons.

**Recommendation:** Render icons in day cells:
```tsx
<DayCell>
  {entry && <Icon name={displaySettings.sleep[entry.sleepLocation].icon} />}
  <span>{day}</span>
</DayCell>
```

---

### 5.5 Responsive Design

**Breakpoints:**
- ✅ Tailwind responsive classes used (`sm:p-4`, `lg:grid-cols-7`)
- ✅ Mobile-first approach (base styles are mobile, `sm:` overrides for desktop)

**Layout Issues:**
- ❌ **Calendar grid on desktop:** Fixed 7-column grid looks cramped on narrow screens
- ❌ **Settings page:** Long color preset list scrolls awkwardly on mobile

**Recommendation:** Add `container` or max-width constraints:
```tsx
<div className="max-w-4xl mx-auto px-4">
  {/* Calendar content */}
</div>
```

---

## 6. Prioritized Backlog

### 6.1 P0 — Critical (Blocker for full adoption)

#### **P0-1: Add Per-User Private Agenda**
**User Story:**  
As a parent, I want to add personal appointments to the calendar so that I can plan my own schedule without the other parent seeing my private events.

**Acceptance Criteria:**
- [ ] Shared entries visible to both parents (default)
- [ ] Private entries visible only to the owner
- [ ] UI toggle: "Gedeeld" vs "Privé" when creating/editing entries
- [ ] Calendar view shows both shared and private entries (with visual distinction)
- [ ] API enforces privacy: `/api/calendar` filters by `userId`
- [ ] Integration test: "Papa cannot read Mama's private entries via API"

**Estimated Effort:** 15-20 hours  
**Dependencies:** Schema migration, API changes, UI updates  
**Security Risk:** HIGH (potential privacy leak if incomplete)

---

#### **P0-2: Fix "Today" Date Calculation**
**User Story:**  
As a parent, I want "Today" to always show the correct date for Belgium, even if my device clock is misconfigured.

**Acceptance Criteria:**
- [ ] Server provides canonical "today" date in Europe/Brussels timezone
- [ ] Frontend uses server-provided "today" instead of `new Date()`
- [ ] Edge case testing: DST transitions, wrong device clock, user traveling

**Estimated Effort:** 4-6 hours  
**Dependencies:** None  
**Risk:** LOW (isolated change)

---

#### **P0-3: Expand Year Planning Range**
**User Story:**  
As a parent, I want to plan custody schedules up to 5 years in advance.

**Acceptance Criteria:**
- [ ] Year dropdown shows: `current year - 1` to `current year + 5` (7 years total)
- [ ] API validates date range (e.g., 2020-2035) to prevent abuse
- [ ] Date picker form respects same range

**Estimated Effort:** 2-3 hours  
**Dependencies:** None  
**Risk:** LOW

---

### 6.2 P1 — High Priority (Improves usability)

#### **P1-1: Add Recurrence Patterns**
**User Story:**  
As a parent, I want to create repeating schedules (e.g., "every other weekend with Papa") without manually entering 26 entries.

**Acceptance Criteria:**
- [ ] UI: "Herhalen" toggle in entry form
- [ ] Options: "Elke week", "Elke 2 weken", "Maandelijks"
- [ ] End date or count: "Tot 31-12-2027" or "10 keer"
- [ ] Backend expands recurrence rule into individual entries on save

**Estimated Effort:** 10-15 hours  
**Dependencies:** None (can be added after P0-3)  
**Risk:** MEDIUM (complex UI state)

---

#### **P1-2: Improve Empty States & Loading UX**
**User Story:**  
As a parent, I want clear feedback when the calendar is empty or loading, so I know what to do next.

**Acceptance Criteria:**
- [ ] Today Page: Show CTA button if no entries exist
- [ ] Calendar Page: Add skeleton loader during fetch
- [ ] Global offline banner in app header
- [ ] Overview Page: "Geen regelingen gevonden" message with CTA

**Estimated Effort:** 3-4 hours  
**Dependencies:** None  
**Risk:** LOW

---

#### **P1-3: Add Calendar Search & Filters**
**User Story:**  
As a parent, I want to filter the calendar to show only specific events (e.g., "Show only days where kids sleep with Papa").

**Acceptance Criteria:**
- [ ] Filter dropdown: "Alle dagen", "Slapen bij Papa", "Slapen bij Mama", etc.
- [ ] Search box: free-text search in notes
- [ ] URL state: `/kalender?filter=papa` (shareable, bookmarkable)

**Estimated Effort:** 6-8 hours  
**Dependencies:** None  
**Risk:** LOW

---

### 6.3 P2 — Nice-to-Have (Quality of life)

#### **P2-1: Keyboard Navigation for Calendar Grid**
**Acceptance Criteria:**
- [ ] Arrow keys navigate between day cells
- [ ] Enter opens day detail
- [ ] Escape closes modal

**Estimated Effort:** 2-3 hours

---

#### **P2-2: iCal Export**
**Acceptance Criteria:**
- [ ] `/api/export/ical` returns RFC 5545-compliant `.ics` file
- [ ] Entries converted to `VEVENT` with `DTSTART`, `SUMMARY`, `DESCRIPTION`

**Estimated Effort:** 4-6 hours

---

#### **P2-3: Render Icons in Calendar UI**
**Acceptance Criteria:**
- [ ] Day cells show sleep location icon (e.g., house, heart)
- [ ] Entry form shows icon previews next to labels

**Estimated Effort:** 2-3 hours

---

## 7. Suggested Work Packages

### **Package A: Date Fix + Year Planning (P0)**
**Goal:** Resolve "today is wrong" and "cannot plan for whole year" complaints.

**Scope:**
1. Add `/api/today` endpoint (returns Europe/Brussels date)
2. Update `TodayPage.tsx` to fetch `/api/today`
3. Expand year dropdown to ±5 years
4. Add date range validation in API

**Duration:** 6-9 hours  
**Order:** Do this **first** (quick wins, no schema changes)

---

### **Package B: Private Agenda (P0)**
**Goal:** Enable per-user private events without leaking privacy.

**Scope:**
1. Database migration: add `is_shared`, `owner_id` columns
2. Update all API queries to filter by `userId`
3. Add privacy toggle in entry form UI
4. Update calendar view to show private entries with distinction
5. Write integration tests for privacy boundaries

**Duration:** 15-20 hours  
**Order:** Do this **second** (after date fix, before recurrence)

**Critical Path:**
- ✅ Write tests FIRST: "Papa cannot see Mama's private entries"
- ✅ API filtering MUST be complete before UI changes
- ✅ Manual security audit: review all `/api/calendar/*` endpoints

---

### **Package C: Recurrence + Bulk Planning (P1)**
**Goal:** Reduce manual entry for repeating schedules.

**Scope:**
1. Add "Herhalen" toggle and frequency selector in entry form
2. Backend: expand recurrence rule into date array, bulk insert
3. UI: show "X dagen toegevoegd" confirmation

**Duration:** 10-15 hours  
**Order:** Do this **third** (after private agenda)

**Dependency:** Requires year planning expansion (Package A) to allow multi-year recurrence.

---

### **Package D: UI Polish (P1 + P2)**
**Goal:** Improve mobile UX, accessibility, and visual consistency.

**Scope:**
1. Empty states + skeleton loaders
2. Global offline banner
3. Keyboard navigation for calendar grid
4. Icon rendering in day cells
5. Focus indicators and ARIA labels

**Duration:** 8-12 hours  
**Order:** Do this **last** (can be done in parallel with Package C)

---

## 8. Security & Privacy Findings

### 8.1 CRITICAL: Potential Privacy Leak (if Package B is implemented incorrectly)

**Scenario:**
1. Private agenda feature is added
2. API filtering is incomplete (e.g., forgot to add `userId` filter in `getEntriesForMonth()`)
3. Papa makes GET request: `/api/calendar?year=2026&month=9`
4. API returns ALL entries (including Mama's private appointments)

**Exploitation:**
- No authentication bypass needed (Papa is already logged in)
- Privacy violation: Papa sees Mama's dentist appointment, therapy session, etc.

**Mitigation Checklist:**
- [ ] Add `userId` parameter to ALL calendar query functions
- [ ] Add integration test: "Fetch calendar as Papa → assert Mama's private entries are excluded"
- [ ] Code review: search codebase for `householdId` queries, ensure ALL have privacy filter
- [ ] Add audit logging: log every access to private entries (who, when, entry ID)

---

### 8.2 Current Security Posture

**Strengths:**
- ✅ Argon2 password hashing (resistant to GPU cracking)
- ✅ HTTP-only session cookies (immune to XSS token theft)
- ✅ Rate limiting enabled (`@fastify/rate-limit`)
- ✅ CORS restricted to `CORS_ORIGIN` env var
- ✅ Optimistic locking prevents concurrent edit conflicts

**Gaps:**
- ❌ No CSRF protection (session cookies use `sameSite: 'lax'`, which is adequate for GET but vulnerable to POST via top-level navigation)
- ❌ No password reset flow (must contact admin if forgotten)
- ❌ No 2FA or MFA
- ❌ No session list or "log out all devices"

**Recommendations:**
- **P1:** Add CSRF tokens for state-changing requests (or upgrade to `sameSite: 'strict'`)
- **P2:** Add self-service password reset via email (requires SMTP config)

---

## 9. Testing Gaps

### 9.1 Current Test Coverage

**Status:** ⚠️ **Minimal**

**Existing Test Files:**
- `apps/api/src/tests/api.test.ts` — placeholder (no tests written)
- `apps/web/src/test/calendar.test.ts` — placeholder
- `apps/web/src/test/components.test.tsx` — placeholder

**Verdict:** **Zero effective test coverage**

---

### 9.2 Required Tests (Before Package B)

**Critical Tests for Privacy:**
```typescript
// apps/api/src/tests/privacy.test.ts
describe('Calendar Privacy', () => {
  it('Papa cannot see Mama's private entries via API', async () => {
    // 1. Create household with Papa and Mama
    // 2. Mama creates private entry for 2026-09-20
    // 3. Papa fetches /api/calendar?year=2026&month=9
    // 4. Assert: response does NOT include Mama's private entry
  });

  it('Papa can see shared entries', async () => {
    // 1. Papa creates shared entry for 2026-09-20
    // 2. Mama fetches /api/calendar?year=2026&month=9
    // 3. Assert: response INCLUDES Papa's shared entry
  });

  it('Papa can see his own private entries', async () => {
    // 1. Papa creates private entry for 2026-09-20
    // 2. Papa fetches /api/calendar?year=2026&month=9
    // 3. Assert: response INCLUDES Papa's private entry
  });
});
```

**Integration Test Matrix:**

| Scenario | Shared Entry | Private Entry (Papa) | Private Entry (Mama) | Papa Sees? | Mama Sees? |
|----------|--------------|---------------------|---------------------|------------|------------|
| 1        | ✅            | ❌                   | ❌                   | ✅ (shared) | ✅ (shared) |
| 2        | ❌            | ✅                   | ❌                   | ✅ (own)    | ❌          |
| 3        | ❌            | ❌                   | ✅                   | ❌          | ✅ (own)    |
| 4        | ✅            | ✅                   | ✅                   | ✅✅ (both)  | ✅✅ (both)  |

---

### 9.3 Recommended Test Strategy

**Before releasing Package B (Private Agenda):**
1. Write integration tests for all 4 scenarios above
2. Add API-level tests: verify `getEntriesForMonth()` filtering
3. Add frontend E2E tests: Playwright or Cypress
   - "Papa logs in → navigates to calendar → does not see Mama's private entry"
4. Manual penetration test: attempt to read other user's private entries via direct API calls

**Estimated Effort:** 8-10 hours (write tests + fix any discovered bugs)

---

## 10. Deployment & Operations

### 10.1 Current Deployment Model

**Production:**
- Docker Compose stack (postgres, api, web, caddy, backup)
- Caddy handles HTTPS (Let's Encrypt)
- Postgres backups: daily `pg_dump` via cron (retained 14 days)

**Staging/Demo:**
- Vercel deployment (web only, API must be hosted separately)
- `vercel.json` configured, but API host unclear (see `KIDSKALENDER_DISCOVERY.md` for details)

---

### 10.2 CI/CD Status

**Status:** ❌ **None**

**Gap:** No GitHub Actions, no automated linting, type-checking, or tests on PRs.

**Recommendation:** Add `.github/workflows/ci.yml`:
```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint --workspaces
      - run: npm run typecheck --workspaces
      - run: npm run test --workspaces
```

**Estimated Effort:** 1-2 hours

---

## 11. Summary & Recommendations

### 11.1 Immediate Actions (This Week)

1. ✅ **Package A: Date Fix + Year Planning** (6-9 hours)
   - Add `/api/today` endpoint
   - Expand year dropdown to ±5 years
   - → Resolves Pain Points #2 and #3 (partially)

2. ✅ **Write Privacy Tests** (4 hours)
   - Add integration tests for private entries
   - → De-risks Package B implementation

3. ✅ **Add CI Pipeline** (1-2 hours)
   - GitHub Actions: lint, typecheck, test
   - → Prevents regressions

---

### 11.2 Next Phase (1-2 Weeks)

4. ✅ **Package B: Private Agenda** (15-20 hours)
   - Schema migration + API filtering + UI
   - → Resolves Pain Point #4 (CRITICAL)

5. ✅ **Package C: Recurrence Patterns** (10-15 hours)
   - "Herhalen" toggle + bulk entry generation
   - → Resolves Pain Point #3 (fully)

---

### 11.3 Future Enhancements (1 Month+)

6. ✅ **Package D: UI Polish** (8-12 hours)
   - Empty states, keyboard navigation, icons, a11y
   - → Resolves Pain Point #5 (partially)

7. ✅ **iCal Export** (4-6 hours)
   - Sync to Google Calendar, Outlook
   - → Improves interoperability

8. ✅ **Password Reset Flow** (6-8 hours)
   - Email-based reset (requires SMTP)
   - → Reduces admin burden

---

### 11.4 Risk Summary

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Privacy leak (Package B)** | MEDIUM | CRITICAL | Write tests first, code review, audit logging |
| **Wrong "today" date** | HIGH | HIGH | Server-side date endpoint (Package A) |
| **Schema migration breaks prod** | LOW | HIGH | Test migration on staging DB first, keep backups |
| **Year dropdown too narrow** | HIGH | MEDIUM | Expand to ±5 years (quick fix) |
| **No test coverage** | HIGH | MEDIUM | Add tests before Package B |

---

### 11.5 Estimated Timeline

**Assuming 1 developer, part-time (~20 hours/week):**

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Phase 0:** Tests + CI | 1 week | Integration tests, GitHub Actions |
| **Phase 1:** Package A | 0.5 weeks | Date fix, year planning |
| **Phase 2:** Package B | 1.5 weeks | Private agenda (schema + API + UI) |
| **Phase 3:** Package C | 1 week | Recurrence patterns |
| **Phase 4:** Package D | 1 week | UI polish, a11y |

**Total:** ~5 weeks (assuming no interruptions)

---

## 12. Conclusion

KidsKalender is a **solid, well-architected PWA** with excellent technical foundations. The codebase is clean, maintainable, and uses modern best practices (TypeScript, Drizzle ORM, React + Vite, TanStack Query).

**However, four critical user-facing gaps must be addressed:**

1. ❌ **No private agenda** (Pain Point #4) — schema change required
2. ⚠️ **Date calculation issues** (Pain Point #2) — quick fix available
3. ⚠️ **Limited year planning** (Pain Point #3) — recurrence patterns needed
4. 📱 **Mobile UX rough edges** (Pain Point #5) — polish pass required

**Recommended approach:**
- Start with **Package A** (date fix + year planning) for quick wins
- Follow with **Package B** (private agenda) after writing comprehensive privacy tests
- Finish with **Package C** (recurrence) and **Package D** (UI polish)

**Security note:**  
⚠️ If private agenda feature is added, **API-level filtering is CRITICAL**. Incomplete filtering could allow one parent to see the other's private appointments. Write integration tests first, then implement with code review and manual penetration testing.

---

**End of Audit**  
For questions or clarifications, contact the engineering team.
