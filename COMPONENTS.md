# InduOps — COMPONENTS.md
*Final, implementation-ready. Reusable component contracts.*

Governing rules (see DESIGN_SYSTEM.md §0, §9, §12):
- **One visual component = one implementation.** If a pattern appears on multiple screens, every screen consumes the same component instance — never a per-page copy.
- **Shared component vs. page composition:** a component belongs here only if it is reused, or is a meaningful, maintainable domain pattern. A page-specific arrangement of shared components (e.g., "the Dashboard layout") is a **composition**, documented in DESIGN_HANDOFF.md, not a new component.
- Scope key: **GLOBAL** (shell-level, every screen) · **SHARED** (reused across multiple pages) · **DOMAIN-SPECIFIC** (belongs to one functional area) · **PAGE-SPECIFIC** (belongs to one screen's composition, not extracted).
- All components consume the tokens in DESIGN_SYSTEM.md (Public Sans, spacing, color, radius). No component defines its own typography or color outside those tokens.

---

## Priority contracts (components most likely to cause implementation drift)

### AppShell
- **Scope:** GLOBAL
- **Purpose:** Overall page frame — Sidebar + TopBar + PageContainer.
- **Used on:** every screen, including migrated legacy screens.
- **Responsibilities:** compose Sidebar + TopBar + content slot; own the app-background color and content gutters.
- **Visual rules:** per DESIGN_SYSTEM §11.
- **Variants:** none — one AppShell for the whole application (the legacy shell is not a variant to preserve; it is migrated away, per DESIGN_SYSTEM §1).
- **States:** n/a.
- **Responsive:** compress → stack → scroll (§16); sidebar collapse follows existing app behavior.
- **Dependencies:** Sidebar, TopBar.
- **Must NOT:** render page-specific content directly; branch its own layout per screen; retain any legacy chrome variant behind a flag "for compatibility."

### Sidebar
- **Scope:** GLOBAL
- **Purpose:** Primary navigation.
- **Used on:** every screen.
- **Responsibilities:** render grouped nav (OVERVIEW / PLANT OPERATIONS / ADMINISTRATION), reflect the active route.
- **Visual rules:** DESIGN_SYSTEM §11 — fixed width, grouped labels, active-state blue fill, one icon per nav concept.
- **Variants:** none. This replaces every legacy sidebar variant (flat list, gray active pill, inconsistent icons/taglines, footer identity card).
- **States:** default item, active item. Hover follows existing app interaction state.
- **Responsive:** collapses per existing app behavior.
- **Dependencies:** NavItem (internal), routing state (existing app — source-of-truth §0 rung 1).
- **Must NOT:** show user identity or sign-out (that lives in TopBar); vary its grouping or icon set by screen; carry forward the legacy footer user-card pattern.

### TopBar
- **Scope:** GLOBAL
- **Purpose:** Branding, global utilities, session identity.
- **Used on:** every screen.
- **Responsibilities:** show "InduOps v4.2" branding text; host dark-mode toggle, global search (if existing in the app — DESIGN_SYSTEM §18), user name/role, sign-out.
- **Visual rules:** DESIGN_SYSTEM §11 — fixed element order (toggle → identity → sign-out), white background, bottom hairline.
- **Variants:** none.
- **States:** default only documented; existing app interaction states apply to the toggle and sign-out control.
- **Responsive:** compress before anything collapses/hides; identity text may abbreviate per existing app pattern if one exists.
- **Dependencies:** Button (icon-only, for utility icons), existing auth/session state (source-of-truth §0 rung 1).
- **Must NOT:** omit global search if it is real existing functionality; introduce a second identity display location; reorder its right-hand elements per screen.

### PageHeader
- **Scope:** SHARED
- **Purpose:** Title + subtitle + primary action, for list/index-style pages.
- **Used on:** Equipment List, Dashboard, Maintenance History, Reports, Downtime Events, User List.
- **Responsibilities:** render H1, optional one-line subtitle, optional single primary action (or, on Reports, a controls slot for date-range + Apply — see DESIGN_HANDOFF.md).
- **Visual rules:** DESIGN_SYSTEM §2, §12.
- **Variants:** with/without subtitle; with/without primary action; controls-slot variant (Reports only).
- **States:** n/a.
- **Responsive:** action button may drop to icon-only or move below the title under compression.
- **Dependencies:** Button.
- **Must NOT:** vary its H1 size by screen (the 40–48px scale applies everywhere post-migration, including migrated legacy screens); grow a second title style for "smaller" pages.

### Button
- **Scope:** GLOBAL
- **Purpose:** All clickable actions.
- **Used on:** every screen.
- **Responsibilities:** render Primary, Secondary, Tertiary/link, and Icon-only variants from one implementation with a `variant` prop.
- **Visual rules:** DESIGN_SYSTEM §7.
- **Variants:** primary (filled), secondary (outline), tertiary (link-style), icon-only.
- **States:** default, plus the existing app's hover/focus/disabled/loading treatments (source-of-truth §0 rung 1) — do not invent new ones.
- **Responsive:** label may hide on icon+label buttons under compression, leaving the icon.
- **Dependencies:** Icon (optional).
- **Must NOT:** hardcode per-page colors outside §4.1 tokens; create a bespoke button for a single screen's action.

### Input
- **Scope:** GLOBAL
- **Purpose:** Free-text entry, including the leading-icon Search variant.
- **Used on:** every filter bar; TopBar global search if applicable.
- **Responsibilities:** render label, placeholder, optional leading icon.
- **Visual rules:** DESIGN_SYSTEM §8.
- **Variants:** default, search (leading icon).
- **States:** default, placeholder; focus/error/disabled follow existing app form-control states.
- **Responsive:** flexes to fill available row width.
- **Dependencies:** Label.
- **Must NOT:** change label casing or position between a page's default and filtered states.

### Select
- **Scope:** GLOBAL
- **Purpose:** Dropdown filter/choice control.
- **Used on:** every filter bar.
- **Responsibilities:** render label, options, trailing chevron; when bound to a status field, render the selected value in that status's semantic color (§4.2).
- **Visual rules:** DESIGN_SYSTEM §8.
- **Variants:** plain, status-colored-value.
- **States:** default; focus/disabled follow existing app form-control states.
- **Dependencies:** Label, semantic color table (§4.2).
- **Must NOT:** hardcode a status color locally — it must read from the shared §4.2 mapping so a future status-color change propagates everywhere at once.

### FilterBar
- **Scope:** SHARED
- **Purpose:** The card containing all filter controls for a list page.
- **Used on:** Equipment List, Maintenance History, Downtime Events, User List, Reports.
- **Responsibilities:** lay out Search/Selects/Date fields + action buttons; render active-filter chips and update the result-count caption when filters are applied.
- **Visual rules:** DESIGN_SYSTEM §14.
- **Variants:** field set differs per page (2–5 fields observed); the card, spacing, and label treatment do not vary.
- **States:** default (no filters), active (chips + updated count).
- **Responsive:** fields wrap to additional rows under compression rather than overflowing.
- **Dependencies:** Input, Select, Button, FilterChip.
- **Must NOT:** change field-label casing between its own default and active states; duplicate a generic "Search" label above every field regardless of what that field actually filters — each field gets its own accurate label.

### Badge
- **Scope:** GLOBAL (primitive)
- **Purpose:** Shared colored-pill visual primitive underlying StatusBadge, PriorityIndicator's dot-and-text is separate (see below), and any domain-specific semantic badge.
- **Used on:** every screen showing a status or semantic value.
- **Responsibilities:** render a background/text color pair and a label at the fixed geometry in DESIGN_SYSTEM §5, §9.1.
- **Visual rules:** rounded rectangle, 4–6px radius, no border.
- **Variants:** color pair is a prop; no shape variants.
- **States:** n/a (presentational only).
- **Dependencies:** none.
- **Must NOT:** be reimplemented per domain — StatusBadge and any role/semantic badge must render through this same primitive.

### StatusBadge
- **Scope:** SHARED (semantic wrapper over Badge)
- **Purpose:** Communicate a lifecycle/state value with the locked color mapping.
- **Used on:** Equipment status, downtime status, work-order/maintenance status, user account status.
- **Responsibilities:** map a status string to the color pair in DESIGN_SYSTEM §4.2 and render via Badge.
- **Visual rules:** inherits Badge; color is looked up, never passed manually per screen.
- **Variants:** one per status value in the §4.2 table.
- **States:** n/a.
- **Dependencies:** Badge, the §4.2 lookup table.
- **Must NOT:** allow a screen to override a status's color; introduce a status value not in the §4.2 table without updating that table first.

### PriorityIndicator
- **Scope:** DOMAIN-SPECIFIC (Maintenance)
- **Purpose:** Communicate work-order/task urgency.
- **Used on:** Work Order Detail, Maintenance History.
- **Responsibilities:** render a colored dot + plain text label per DESIGN_SYSTEM §9.3, §4.3.
- **Visual rules:** dot + text, **not** a filled pill — deliberately distinct from StatusBadge's shape.
- **Variants:** Critical, High, Medium/Routine, Low.
- **States:** n/a.
- **Dependencies:** the §4.3 priority color table.
- **Must NOT:** be rendered as a filled pill on any screen; be merged with or replaced by StatusBadge — priority and status are different concepts and stay visually distinct.

### DataTable
- **Scope:** SHARED
- **Purpose:** Tabular list of records with headers, row actions, and pagination.
- **Used on:** Equipment List, Maintenance History, Downtime Events, User List.
- **Responsibilities:** render header row, body rows, and delegate to Pagination and TableRowAction.
- **Visual rules:** DESIGN_SYSTEM §10.
- **Variants:** column set differs per page; row height/typography/border treatment do not.
- **States:** populated; Empty/Loading/Error via the dedicated components below, following the existing app's data-fetch states.
- **Responsive:** scrolls horizontally under compression rather than dropping columns, per §16.
- **Dependencies:** Badge/StatusBadge, PriorityIndicator (Maintenance only), Pagination, TableRowAction, EmptyState/LoadingState/ErrorState.
- **Must NOT:** hide columns per breakpoint by default without an explicit app requirement; introduce a card-based mobile layout in place of the table (§20 non-goal).

### TableRowAction
- **Scope:** SHARED
- **Purpose:** The trailing "act on this row" control(s).
- **Used on:** every DataTable.
- **Responsibilities:** render exactly one **open-record** action per row (see DESIGN_SYSTEM §17-equivalent rule below), plus, where a row has multiple secondary actions, a separate overflow ("⋮") menu.
- **Visual rules:** the record-opening action is a single shared treatment (text link or icon, styled consistently) used everywhere a row needs to be opened; the overflow menu is a visually distinct, separate control used only for multi-action rows.
- **Variants:** open-record (required, everywhere), overflow-menu (only where multiple secondary actions exist).
- **States:** default.
- **Dependencies:** Button (icon-only, for the overflow trigger).
- **Must NOT:** use the overflow menu as a substitute for the open-record action when both are needed; maintain two different open-record visual treatments (text "View" vs. an eye icon) on different screens — pick one and use it everywhere.

### Pagination
- **Scope:** SHARED
- **Purpose:** Page through a DataTable's results.
- **Used on:** Maintenance History, and any DataTable whose result set exceeds one page.
- **Responsibilities:** render numbered page buttons (current filled), prev/next chevrons, and a "Showing X–Y of Z" caption; collapse to caption-only when everything fits on one page; insert an ellipsis when the page count is large.
- **Visual rules:** DESIGN_SYSTEM §10.
- **Variants:** caption-only (single page), full control set (multi-page), with-ellipsis (large page count).
- **States:** current page, other pages, disabled prev/next at the boundaries (existing app behavior).
- **Dependencies:** Button (icon-only, for chevrons).
- **Must NOT:** be reimplemented per page — one Pagination component parameterized by page/total/pageSize.

### MetadataGrid
- **Scope:** SHARED
- **Purpose:** The label/value grid inside "Core Information"-style cards.
- **Used on:** Equipment Detail, Downtime Detail, User Detail, Work Order Detail.
- **Responsibilities:** lay out MetadataField instances in a 2–3 column grid with consistent spacing.
- **Visual rules:** DESIGN_SYSTEM §3 spacing — consistent row gaps regardless of entity; optional small leading icon per field is a per-instance choice but must be applied consistently within one page, not mixed field-to-field.
- **Variants:** 2-column, 3-column; icon-per-field on/off.
- **States:** n/a.
- **Dependencies:** MetadataField.
- **Must NOT:** carry the large, uneven whitespace observed in one legacy screenshot — that was a rendering artifact (DESIGN_SYSTEM §15), not a spacing option.

### MetadataField
- **Scope:** SHARED
- **Purpose:** Single uppercase-label + value pair.
- **Used on:** every MetadataGrid instance, plus the Dashboard KPI strip (numeric variant).
- **Responsibilities:** render label above value per §2 type roles.
- **Visual rules:** DESIGN_SYSTEM §2.
- **Variants:** text value, numeric/KPI value (larger, bold, optional colored qualifier).
- **Dependencies:** none.
- **Must NOT:** introduce a font family or size outside §2.

### Breadcrumb
- **Scope:** SHARED
- **Purpose:** Hierarchical wayfinding, e.g. `Maintenance > Work Orders > WO-8842-A`.
- **Used on:** entity detail pages with a real multi-level parent hierarchy.
- **Responsibilities:** render an ancestor trail with the current page in a stronger weight; each ancestor segment is a real navigable link.
- **Visual rules:** DESIGN_SYSTEM §13.
- **Dependencies:** routing state (existing app).
- **Must NOT:** be used where the entity has only one obvious parent (use BackLink instead); be forced onto a page whose existing navigation depth doesn't support it.

### BackLink
- **Scope:** SHARED
- **Purpose:** Single "return to parent list" affordance, e.g. `← Back to Equipment`.
- **Used on:** entity detail pages with one clear parent list and no deeper hierarchy.
- **Responsibilities:** navigate to exactly one place.
- **Visual rules:** shares link typography/color with Breadcrumb (§4.1 accent) but is a distinct, simpler component.
- **Dependencies:** routing state.
- **Must NOT:** be treated as interchangeable with Breadcrumb — pick the one that matches the entity's actual navigation depth in the existing app (DESIGN_SYSTEM §13).

### EmptyState
- **Scope:** GLOBAL
- **Purpose:** Standard "no data" presentation for a DataTable or detail page.
- **Used on:** any list/detail view when the existing app has no records to show.
- **Responsibilities:** centered icon + short message, consistent with the restrained visual language (no decorative illustration).
- **Visual rules:** white card, DESIGN_SYSTEM typography/spacing tokens; no shadow/gradient.
- **Dependencies:** none.
- **Must NOT:** introduce a decorative illustration or a different visual language than the rest of the app; be skipped in favor of showing a blank card.

### LoadingState
- **Scope:** GLOBAL
- **Purpose:** Standard in-progress presentation while the existing app fetches data.
- **Responsibilities:** communicate "loading," using the app's existing loading-indicator pattern if one exists (source-of-truth §0, rung 1) rather than a newly invented spinner style.
- **Dependencies:** none.
- **Must NOT:** show a blank/broken layout (see DESIGN_SYSTEM §15 — the unlabeled color-bar artifacts in some screenshots are exactly this failure mode and must not be reproduced).

### ErrorState
- **Scope:** GLOBAL
- **Purpose:** Standard error presentation for a failed fetch/action.
- **Responsibilities:** communicate the error using the app's existing error-handling/messaging pattern (source-of-truth §0, rung 1).
- **Dependencies:** none.
- **Must NOT:** invent new error copy/UX not already established in the application.

---

## Other shared components

### PageContainer — GLOBAL
Consistent gutter/max-width wrapper for content below the TopBar. `#F3F4F6` background, ~40–48px gutters, ~32px vertical rhythm between blocks. No page-specific variants.

### DetailHeader — SHARED
Identity row (Breadcrumb or BackLink) + right-aligned action cluster (secondary outline actions, one primary filled action) + entity-name H1. Each entity's exact sub-structure (whether status renders inline with the title or inside the metadata card, whether there are 2 or 3 actions) may differ by entity per DESIGN_SYSTEM §12/§14 — this is expected, not an inconsistency, provided all of it draws from the shared typography/button/badge tokens.

### FilterChip — SHARED
Removable pill: gray rounded rectangle, "Label: Value ✕". Used wherever FilterBar has active filters.

### AuditTable (TaskActivityLog) — SHARED
Chronological event table at the bottom of detail pages (Work Order, User, Downtime). Heading with optional "Export"/"View All" action, table with Timestamp + Action/Event (as StatusBadge or plain text — never an unlabeled color bar, §15) + Details/Notes columns.

---

## Domain-specific components (not globally reused — kept in their functional area)

- **SummaryLinkTile** (Equipment) — colored-left-border tile linking to related records (maintenance/downtime history) from Equipment Detail.
- **AlertCard** (Dashboard) — colored-border card for critical/overdue conditions.
- **ProgressStat** (Dashboard) — label/count over a horizontal progress bar.
- **EquipmentStatusList** (Dashboard) — status dot + name + outline status pill list; the outline pill reuses StatusBadge's color mapping in an outline visual treatment.
- **ReportMetricTile** (Reports) — bordered stat box inside a Reports summary card; supports a flagged (colored-border) variant for values needing attention.
- **MiniRecordTable** (Reports) — compact embedded table inside a Reports card (no filter bar, no pagination) — distinct from the page-level DataTable.

These stay domain-specific per DESIGN_SYSTEM §12 (shared components vs. page compositions): they are meaningful, reusable *within* their functional area, but are not promoted to GLOBAL/SHARED status merely because they visually resemble something on another page.

---

## Page compositions (not components)

The following are **page-specific arrangements of the components above** — they are documented in DESIGN_HANDOFF.md, not extracted as reusable components, per DESIGN_SYSTEM §12:

- Dashboard's overall layout (KPI strip + 3-column alert/progress/status row + 2-column work/downtime row).
- Equipment Detail's specific card sequence.
- Work Order Detail's two-column task-details + assignment/metadata-rail layout.
- Reports' two-card (Maintenance Summary / Downtime Incidents) layout and its expanded breakdown sections.

Do not extract a "DashboardLayout" or "ReportsLayout" component unless a second screen in the existing application needs the identical arrangement.

---

## Component reuse map

| Component | Reused across |
|---|---|
| AppShell, Sidebar, TopBar, PageContainer | All screens |
| PageHeader | Equipment List, Dashboard, Maintenance History, Reports, Downtime Events, User List |
| DetailHeader, Breadcrumb / BackLink | Equipment Detail, Work Order Detail, User Detail, Downtime Detail (Breadcrumb vs. BackLink chosen per entity depth) |
| FilterBar, Input, Select, FilterChip | Equipment List, Maintenance History, Downtime Events, User List, Reports |
| Badge, StatusBadge | Every list and detail screen |
| PriorityIndicator | Work Order Detail, Maintenance History |
| DataTable, Pagination, TableRowAction | Equipment List, Maintenance History, Downtime Events, User List |
| MetadataGrid, MetadataField | Equipment Detail, Downtime Detail, User Detail, Work Order Detail |
| AuditTable | Work Order Detail, User Detail, Downtime Detail |
| EmptyState, LoadingState, ErrorState | Any data-driven view |
| AlertCard, ProgressStat, EquipmentStatusList | Dashboard only |
| SummaryLinkTile | Equipment Detail only |
| ReportMetricTile, MiniRecordTable | Reports only |
