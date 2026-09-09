# InduOps — DESIGN_HANDOFF.md
*Final, implementation-ready. Screen-specific composition guidance.*

Read alongside DESIGN_SYSTEM.md (tokens, locked decisions) and COMPONENTS.md (component contracts). Per DESIGN_SYSTEM §19, screenshot variants of the same functional screen are documented here as **states of one screen**, not separate pages.

## Global implementation constraints (apply to every screen below)

This is a **visual-implementation and consistency pass on an existing, functioning application.** The coding agent must not change, under any circumstance:

- Database schema, Prisma models, or any data model.
- API contracts or server actions.
- Authentication or authorization/RBAC.
- Routing.
- Business logic or validation rules.
- Caching behavior or state management.
- Existing workflows or existing functionality of any kind.

Additional rules:
- Reuse components from COMPONENTS.md — do not recreate a component that already exists there.
- Do not invent fields, filters, actions, or navigation not present in the approved screens.
- Every legacy-shell screen migrates its AppShell/Sidebar/TopBar/PageHeader to the canonical v4.2 components (DESIGN_SYSTEM §1) — this is a chrome swap; page-specific fields/columns/controls are preserved exactly.
- Where a screenshot shows an artifact (unlabeled color bar, stray "Id" token, broken spacing, duplicate identity) per DESIGN_SYSTEM §15, build the intended real component and populate it with the application's real data — do not reproduce the artifact and do not invent replacement copy.
- Do not add cards, shadows, gradients, decorative illustration, oversized type, or a generic SaaS aesthetic (DESIGN_SYSTEM §20).

---

## 1. Equipment Detail
**Reference:** CNC Milling Machine detail screenshot.
**Purpose:** Full detail for one equipment asset, with links into its maintenance and downtime history.
**Composition (top to bottom):**
1. DetailHeader: asset-code pill + factory name (no Breadcrumb on this entity — one clear parent list, BackLink-depth navigation is appropriate here per DESIGN_SYSTEM §13), right-aligned "Maintenance history" / "Edit" / "Archive" (outline).
2. H1 entity name.
3. MetadataGrid (3-column): Asset Number / Status (StatusBadge) / Criticality (plain text, no badge); Factory (name + city) / Location / Added (date); Description (full-width).
4. Two SummaryLinkTiles side by side ("View completed work," "View downtime history"), each with an icon, count, and description line.
**Shared components:** AppShell, Sidebar, TopBar, DetailHeader, MetadataGrid, StatusBadge, SummaryLinkTile, Button.
**Page-specific:** SummaryLinkTile (domain-specific, Equipment).
**Responsive:** grid stacks to 1 column; tiles stack vertically (compress → stack → scroll, DESIGN_SYSTEM §16).
**Dark mode:** apply existing dark-mode tokens per DESIGN_SYSTEM §17.

---

## 2. Equipment List
**Reference:** Equipment List screenshot, default and filtered captures.
**Purpose:** Browse, search, and filter equipment; open Add or any asset's detail.
**States:** default (unfiltered) and filtered — **one screen**, per DESIGN_SYSTEM §19.
**Composition:**
1. PageHeader: H1 "Equipment" + subtitle (result count, updates per state) + primary "+ Add equipment."
2. FilterBar: Search, Status select, Criticality select, "Clear" (outline) + "Search" (primary). Uppercase field labels in both states (DESIGN_SYSTEM §8). When filters are active, FilterChips render beneath the bar and the Status select's value text takes on that status's semantic color.
3. DataTable: Equipment (name + section) / Asset Number / Factory / Criticality (plain text) / Status (StatusBadge) / Actions (open-record action, per TableRowAction contract).
4. Pagination (caption-only at this result count).
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, FilterBar, FilterChip, DataTable, StatusBadge, TableRowAction, Pagination.
**Status colors:** Operational = green, Under Maintenance = amber, Offline = red, applied identically in both states (DESIGN_SYSTEM §4.2 — this resolves the prior Offline color conflict).
**Responsive:** filter fields wrap under compression; table scrolls horizontally rather than dropping columns.
**Dark mode:** per §17.

---

## 3. Work Order Detail
**Reference:** "Replace Conveyor Motor" screenshot.
**Purpose:** Full detail and activity history for one maintenance work order; hold/complete actions.
**Composition:**
1. Breadcrumb: `Maintenance > Work Orders > WO-8842-A` (real multi-level hierarchy — Breadcrumb is correct here, per DESIGN_SYSTEM §13).
2. Title row: H1 + inline StatusBadge ("In Progress," amber) + "Hold" (outline) + "Complete Task" (primary).
3. Equipment cross-link line (icon + link text, accent color).
4. Two-column composition: left, a "Task Details" card with description + MetadataGrid (Scheduled Date / Priority Level [PriorityIndicator — dot + text, not a pill] / Estimated Duration / Safety Clearance); right, stacked "Active Assignment" (avatar + name + role) and "Location & Metadata" cards.
5. AuditTable ("Task Activity Log") full width beneath, with Export action.
**Shared components:** AppShell, Sidebar, TopBar, Breadcrumb, StatusBadge, PriorityIndicator, MetadataGrid, Button, AuditTable.
**Page-specific composition:** the two-column task-details + metadata-rail layout is specific to Work Order Detail and is not forced onto other detail pages (DESIGN_SYSTEM §14 — richer metadata on this entity justifies the extra column).
**Responsive:** two columns stack.
**Dark mode:** per §17.

---

## 4. Maintenance History
**Reference:** Maintenance History screenshots (both captured visual treatments).
**Purpose:** Browse completed maintenance task records.
**States:** both captures are **one screen** (DESIGN_SYSTEM §19); build the resolved version below, not two variants.
**Composition:**
1. PageHeader: H1 "Maintenance History" + subtitle + "Export" (outline) + "+ Log Task" (primary).
2. FilterBar: Search Records, Equipment select, Date Range select, "Search" (primary) + "Clear" (outline).
3. DataTable: Completed (date) / Equipment (name + code) / Task Description / Technician (avatar + name) / Priority (PriorityIndicator — dot + text) / Status (StatusBadge) / Actions (open-record action; a separate overflow "⋮" menu only if the row genuinely has multiple secondary actions beyond opening the record).
4. Pagination: numbered buttons + prev/next chevrons + "Showing X to Y of Z records" caption, with ellipsis when the page count is large.
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, FilterBar, DataTable, PriorityIndicator, StatusBadge, Pagination, TableRowAction.
**Dark mode:** per §17.

---

## 5. Reports
**Reference:** Reports screenshots, compact and expanded captures.
**Purpose:** Operational summary of maintenance and downtime for a selected date range.
**States:** compact and expanded are **one screen** at different data/filter depth (DESIGN_SYSTEM §19) — build one Reports screen whose cards expand with technician/equipment/reason breakdowns as data allows.
**Composition:**
1. PageHeader: H1 "Reports" + subtitle + date-range controls (From/To + "Apply Filters") in the header's controls slot.
2. Active-filter summary line with "Clear filters."
3. Two cards side by side: "Maintenance Summary" (ReportMetricTiles for Total Records / Parts Used, a MiniRecordTable, and — when data supports it — "By technician" / "By equipment" breakdown lists) and "Downtime Incidents" (ReportMetricTiles for Total Events / Resolved / Open [flagged/colored-border variant] / MTTR, a "Total Downtime" stat, a MiniRecordTable, and — when data supports it — a "By reason" breakdown with duration bars).
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, Button, StatusBadge.
**Page-specific:** ReportMetricTile, MiniRecordTable (domain-specific, Reports; not promoted to global per COMPONENTS.md).
**Dark mode:** per §17.

---

## 6. User Detail
**Reference:** "Technician User" screenshot.
**Purpose:** Full profile and recent activity for one system user.
**Composition:**
1. Breadcrumb: `Users > Technician User` (real hierarchy).
2. Title row: H1 + inline StatusBadge ("Active") + subline (User ID) + "Reset Password" (outline) + "Edit User" (primary).
3. MetadataGrid ("Core Information"): Full Name / Employee ID; Email / Phone; Primary Role / Department — using the app's real values, with standard MetadataGrid spacing (the large uneven gaps in the source capture are a rendering artifact, not a spacing spec — DESIGN_SYSTEM §15).
4. AuditTable ("Recent Activity Log") with "View All," using real Event values via StatusBadge or plain text — never an unlabeled color bar (§15).
**Shared components:** AppShell, Sidebar, TopBar, Breadcrumb, StatusBadge, MetadataGrid, AuditTable, Button.
**Dark mode:** per §17.

---

## 7. User List
**Reference:** Users list screenshot.
**Purpose:** Browse, search, and filter system users; open Add or any user's detail.
**Composition:**
1. PageHeader: H1 "Users" + subtitle + primary "+ Add user."
2. FilterBar: Search, Role select, Status select, "Clear" (outline) + "Search" (primary).
3. DataTable: Name / Email / Role / Status (StatusBadge — Active green, Inactive neutral gray; render the real label, never an unlabeled bar per §15) / Created (date) / Actions (overflow "⋮" menu, since multiple secondary actions apply to a user row).
4. Pagination: numbered buttons + prev/next + caption.
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, FilterBar, DataTable, StatusBadge, Pagination, TableRowAction.
**Dark mode:** per §17.

---

## 8. Dashboard
**Reference:** Dashboard screenshot.
**Purpose:** At-a-glance operational overview.
**Composition (a page-specific composition of shared components, not a new reusable component — DESIGN_SYSTEM §12):**
1. PageHeader: H1 "Dashboard" + subtitle (date-stamped overview line).
2. KPI strip: one card, four MetadataField (KPI variant) stats — Equipment, Active Maintenance, Open Downtime, MTTR.
3. Three-column row: Critical Alerts (AlertCards — red for open downtime, amber/orange for overdue maintenance), Maintenance Status (ProgressStat rows), Equipment Status (EquipmentStatusList — dot + name + outline StatusBadge).
4. Two-column row: Upcoming Work (MiniRecordTable: Task/Equipment/Due) and Recent Downtime (MiniRecordTable: Equipment/Duration/Status via StatusBadge).
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, MetadataField, StatusBadge.
**Page-specific:** AlertCard, ProgressStat, EquipmentStatusList (domain-specific, Dashboard).
**Responsive:** 3-column and 2-column rows stack to 1 column under compression.
**Dark mode:** per §17 — the dark-mode toggle present in this screen's top bar is real, preserved functionality.

---

## 9. Downtime Detail
**Reference:** HPR-004-Downtime screenshot.
**Purpose:** Full detail for one downtime incident; resolve action.
**Composition:**
1. Breadcrumb: `Downtime > HPR-004-Downtime`.
2. Title row: H1 + inline StatusBadge (real status, e.g. "Open," red — not an unlabeled bar, §15) + subline (Record ID) + "Edit Record" (outline) + "Resolve Downtime" (primary).
3. MetadataGrid ("Core Information," icon-per-field): Equipment / Location; Reason / Reported By; Started / Duration (duration in the appropriate status color when ongoing).
4. AuditTable ("Recent Activity Log") with real Event values via StatusBadge.
**Shared components:** AppShell, Sidebar, TopBar, Breadcrumb, StatusBadge, MetadataGrid, AuditTable, Button.
**Dark mode:** per §17.

---

## 10. Downtime Events
**Reference:** Downtime Events screenshot.
**Purpose:** Browse, search, and filter downtime incidents; log a new one.
**Composition:**
1. PageHeader: H1 "Downtime Events" + subtitle + "Export" (outline) + "+ Log Downtime" (primary).
2. FilterBar: Search, Equipment select, Status select, From Date, To Date, each with its own accurate label (not a repeated generic "Search" label above every field — that duplication in the source capture is an artifact per §15) + "Apply Filters" (primary).
3. DataTable: Started (date+time) / Equipment (real value — the "Id" placeholder text seen in the source capture is an artifact, not content to reproduce, §15) / Reason / Duration (with "ongoing" indicator when open) / Reported By / Status (StatusBadge — Open red, Resolved green) / Ended / Actions (open-record action).
4. Pagination.
**Shared components:** AppShell, Sidebar, TopBar, PageHeader, FilterBar, DataTable, StatusBadge, Pagination, TableRowAction.
**Dark mode:** per §17.

---

## Cross-screen consistency — resolved decisions in effect

All items below were previously open questions; they are now locked (DESIGN_SYSTEM §0–§19) and apply uniformly across every screen above:

| Area | Locked resolution |
|---|---|
| Shell | v4.2 canonical everywhere; legacy chrome migrated, not preserved (§1) |
| Typography | Public Sans, one type scale (§2) |
| "Offline" status color | Red, everywhere (§4.2) |
| "Under Maintenance" status color | Amber, distinct from Operational's green (§4.2) |
| Filter label casing | Uppercase, consistent across default/filtered states (§8) |
| Priority component | Dot + text, one implementation, used everywhere priority appears (§9.3) |
| Badge architecture | One Badge primitive; StatusBadge and domain badges wrap it (§9) |
| Table open-record action | One shared interaction (text or icon, picked once, used everywhere); overflow menu reserved for genuinely multi-action rows (COMPONENTS.md, TableRowAction) |
| Equipment List states | One screen, not two (§19) |
| Reports states | One screen, not two (§19) |
| Maintenance History variants | One screen, not two (§19) |
| Dark mode | Existing functionality, preserved as-is, not disabled or newly designed (§17) |
| Responsive behavior | Existing behavior preserved; compress → stack → scroll where unspecified (§16) |
| Global search | Preserved if it exists in the app; not invented if it doesn't (§18) |
| Screenshot artifacts (color bars, stray "Id," broken spacing, duplicate identity) | Not implemented literally; real component + real data used instead (§15) |

No further confirmation is required on any of the above before implementation.
