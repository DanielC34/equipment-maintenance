# InduOps — DESIGN_SYSTEM.md
*Final, implementation-ready. Editorial/consolidation pass — no new screenshot analysis.*

## 0. Source-of-truth hierarchy

When any two sources appear to disagree, resolve using this order. A lower-priority source may add detail; it may never override a higher-priority source.

1. **PRD + existing application** — functionality, data, routing, authentication, authorization/RBAC, workflows, business logic, existing responsive behavior, existing dark-mode functionality. This is the ground truth for anything the app already *does*.
2. **Approved InduOps design decisions** — the canonical v4.2 shell, Public Sans typography, the established semantic color system, established component principles. These are locked; see §1–§9.
3. **Final Stitch/FlutterFlow screenshots** — visual appearance, layout, spacing, component relationships, information hierarchy for each screen.
4. **DESIGN_SYSTEM.md** (this document) — global visual tokens and rules.
5. **COMPONENTS.md** — reusable component contracts and boundaries.
6. **DESIGN_HANDOFF.md** — screen-specific composition and implementation guidance.
7. **Agent inference** — used only when none of the above specifies an answer. Inference must never introduce new functionality, new components, or a new visual language. When an agent must infer, it should follow the nearest established pattern in this document, not invent one.

**Practical rule for this pass:** this is a visual-implementation refinement of an existing, functioning application. Nothing in documents 3–6 authorizes changing anything governed by document 1.

---

## 1. Canonical shell — approved decision

**The v4.2 shell is the canonical InduOps shell.** This is settled; do not treat it as pending.

- All legacy ("v2.4.0") screens migrate their **AppShell, Sidebar, TopBar, and PageHeader** to the v4.2 spec defined in §11–§12.
- Legacy chrome is not a second design system to preserve — it is the pre-migration state of screens whose **page-specific content** (fields, filters, columns, actions) is preserved as-is while their chrome is replaced.
- Any global functionality present in a legacy screen's chrome (e.g., a working global-search input) must be carried into the canonical shell rather than deleted — see §17 (Global search).

---

## 2. Typography — approved decision

**Public Sans is the InduOps application typeface.** This is an established project decision, not an inference from screenshots.

- All shared components consume the type scale below. No component may declare its own font-family or an ad hoc size/weight outside this scale.
- Sizes are the working scale for this implementation; treat them as the working values unless a token source in the existing codebase specifies otherwise (source-of-truth §0, rung 1).

| Role | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| Brand wordmark ("InduOps") | 22–26px | Bold (700) | 1.2 | Sidebar logo lockup |
| Page title (H1) | 40–48px | Bold (700) | 1.1 | Page headers, entity names on detail pages |
| Section/card heading (H2) | 18–20px | Semibold (600) | 1.3 | "Task Details", "Core Information", card titles |
| Body / description text | 16–17px | Regular (400) | 1.5 | Descriptions, task text |
| Secondary text (subtitle) | 15–16px | Regular (400), muted | 1.4 | Page subtitles |
| Field / metadata label | 11–12px | Medium (500), uppercase, letter-spaced ~0.5px | 1.2 | ASSET NUMBER, STATUS, etc. |
| Field / metadata value | 16–18px | Regular–Medium | 1.3 | Values under labels |
| Table column header | 11–12px | Medium (500), uppercase, muted | 1.2 | Table headers |
| Table cell — primary | 16–17px | Semibold (600) | 1.4 | Entity name in a row |
| Table cell — secondary line | 13–14px | Regular, muted | 1.3 | Sub-line under entity name |
| Table cell — body | 15–16px | Regular | 1.4 | Standard cell text |
| Button text | 14–15px | Medium/Semibold (600) | 1 | All buttons |
| Badge / pill text | 12–13px | Medium (600) | 1 | Badges, priority text |
| KPI number | 32–36px | Bold (700) | 1.1 | Dashboard stats |
| KPI label | 11–12px | Medium, uppercase, muted | 1.2 | Dashboard stat labels |
| Nav item text | 15–16px | Medium (500) | 1.2 | Sidebar items |
| Nav group label | 11–12px | Medium, uppercase, letter-spaced | 1.2 | Sidebar group labels |

**Implementation rule:** the canonical v4.2 title scale (40–48px H1) applies everywhere after shell migration, including on migrated legacy screens. A migrated screen should not retain a smaller legacy title size — that was chrome, and chrome is replaced per §1.

---

## 3. Spacing

8px-based scale, consistent with the canonical shell:

| Token | Value | Where used |
|---|---|---|
| xs | 4px | Icon-to-text gap in badges, tight label/value gaps |
| sm | 8px | Label-to-value gap; badge vertical padding |
| md | 12–16px | Icon-to-label gap in nav; button internal padding |
| lg | 20–24px | Card internal padding; gap between filter fields |
| xl | 32px | Gap between page header and first content card; gap between stacked cards |
| 2xl | 40–48px | Top-bar height; page content gutter (left/right/top) |

---

## 4. Colors

### 4.1 Neutral & surface tokens

| Token | Value | Usage |
|---|---|---|
| App background | `#F3F4F6` | Content area behind cards |
| Surface / card background | `#FFFFFF` | Sidebar, top bar, cards, tables |
| Border | `#E2E8F0` | Card borders, table dividers, input borders |
| Primary text | `#1E293B` | Titles, primary values, inactive nav |
| Secondary text | `#64748B` | Subtitles, field labels, muted metadata |
| Muted/placeholder text | `#94A3B8` | Placeholders |
| Accent / interactive blue | `#2563EB` | Active nav, links, "open record" action |
| Active-nav background | `#DBEAFE` | Active sidebar item fill |
| Primary button | bg `#1E293B`, text `#FFFFFF` | Filled buttons |
| Secondary button | bg `#FFFFFF`, border `#CBD5E1`, text `#1E293B` | Outline buttons |

### 4.2 Semantic status colors — approved decision, locked

Status color is a function of **semantic value**, never of which screen renders it. Every component that displays a status (StatusBadge, Select value text, EquipmentStatusList dot, AlertCard border, table status cell) draws from this single mapping:

| Semantic value | Color | Applies to |
|---|---|---|
| Operational | Green (bg `#D1FAE5`, text `#047857`) | Equipment status |
| Under Maintenance | **Amber** (bg `#FEF3C7`, text `#B45309`) | Equipment status |
| Offline | **Red** (bg `#FEE2E2`, text `#DC2626`) | Equipment status |
| Active / Open (downtime) | Red (bg `#FEE2E2`, text `#DC2626`) | Downtime status |
| Resolved / Completed | Green (bg `#D1FAE5`, text `#047857`) | Downtime status, Maintenance status, task status |
| In Progress | Amber (bg `#FEF3C7`, text `#B45309`) | Work order / maintenance status |
| Active (user account) | Green | User status |
| Inactive (user account) | Neutral gray (bg `#F1F5F9`, text `#475569`) | User status |
| Neutral / informational | Neutral gray | Filter chips, asset-code pill, non-status metadata |

This resolves the previously observed conflict where "Offline" rendered green on one screen and red on another: **Offline is red everywhere.** Any component or handoff note that contradicts this table is wrong and must be corrected to match it — this table is the single source of truth for status color.

### 4.3 Priority colors

Priority uses its own scale (see §9.3 — PriorityIndicator is a distinct concept from status):

| Priority | Color |
|---|---|
| Critical | Red |
| High | Red/Orange |
| Medium / Routine | Amber or neutral |
| Low | Green |

---

## 5. Borders and radius

| Element | Border | Radius |
|---|---|---|
| Card / panel | 1px solid `#E2E8F0` | 8–10px |
| Button (outline variant) | 1px solid `#CBD5E1` | 6–8px |
| Button (filled variant) | none | 6–8px |
| Input / select | 1px solid `#CBD5E1` | 6–8px |
| Badge / pill | none | 4–6px (rounded rectangle, not a full stadium pill) |
| Table | 1px bottom hairline per row; no vertical rules; no outer border beyond the containing card | n/a |
| Colored-left-border tiles (SummaryLinkTile, AlertCard) | 4px solid accent on the left edge only | matches card radius elsewhere |

---

## 6. Shadows and elevation

No drop shadows, glows, or blur anywhere in the canonical design. Elevation is communicated only through background contrast (white card on `#F3F4F6` page) and 1px borders. Do not add shadow, gradient, or glassmorphism treatments — this is an explicit non-goal (§20 of the implementation brief).

---

## 7. Buttons

| Variant | Height | Padding | Typography | Radius | Icon | Border |
|---|---|---|---|---|---|---|
| Primary (filled) | 40–44px | 12px / 16–20px | 14–15px medium, white | 6–8px | optional leading, ~16px, 8px gap | none |
| Secondary (outline) | 40–44px | same | 14–15px medium, dark | 6–8px | optional leading | 1px `#CBD5E1` |
| Tertiary / link-style | auto | none | 14–16px medium, blue | none | none | none |
| Icon-only | ~36–40px square | — | — | 6–8px or circular | ~18–20px | none |

**States:** default and active-selected states are established from the app's existing interactive-state system (source-of-truth §0, rung 1) — hover/focus/disabled must follow the application's existing button interaction states, not be newly invented per component.

---

## 8. Inputs and selects

| Property | Value |
|---|---|
| Height | 40–44px |
| Padding | 10–12px / 12–14px (16–36px left with a leading icon) |
| Border | 1px `#CBD5E1` |
| Radius | 6–8px |
| Placeholder | `#94A3B8` |
| Label | Uppercase, above the field, consistent across every filter bar and every state of a filter bar — a filter field's label text and casing must not change between a page's default and filtered states |
| Select trailing icon | Chevron-down, ~16px |
| Search leading icon | Magnifying glass, ~16px |
| Select value color | A Select bound to a status value (e.g., the Equipment Status filter) renders its selected value text in that status's semantic color from §4.2 |

Focus, error, and disabled visuals follow the application's existing form-control interaction states (source-of-truth §0, rung 1); do not design new ones.

---

## 9. Badge architecture — approved decision

**Badge is the single shared visual primitive.** All pill/chip-shaped status and priority indicators in the product are built from this one primitive — geometry (§5), padding (§3), and typography (§2) are defined once, here, and reused everywhere. No screen or domain gets its own badge implementation.

### 9.1 Badge (primitive)
Rounded rectangle, 4–6px radius, ~4px vertical / 10–12px horizontal padding, 12–13px medium text, colored background + colored text, no border. Accepts a color pair (background/text) and a label; has no built-in semantic meaning of its own.

### 9.2 StatusBadge
A semantic wrapper around Badge. Takes a status value (Operational, Under Maintenance, Offline, Open, Resolved, Completed, In Progress, Active, Inactive) and resolves it to the fixed color pair in §4.2. StatusBadge is used for equipment status, downtime status, work-order/maintenance status, and user account status. **One implementation, driven by a status→color lookup table — not a per-page or per-entity component.**

### 9.3 PriorityIndicator
**Locked geometry: colored dot + plain text label**, not a filled pill. This is deliberately visually distinct from StatusBadge because it represents a different concept — urgency, not lifecycle state — and using the same filled-pill shape for both would blur that distinction. Used for maintenance/work-order priority (Critical, High, Medium/Routine, Low) wherever priority appears (Work Order Detail, Maintenance History). One implementation, reused on every screen that shows priority — do not build a second, pill-shaped priority treatment on any screen.

### 9.4 Domain-specific badges
Role badges, user-status badges, and any other semantic badge variant reuse the **Badge primitive's geometry and tokens**; they only supply their own value→color mapping. They must not introduce a different padding, radius, or type scale.

**Governing rule: one visual component = one implementation.** If the same visual pattern appears on multiple screens, every screen consumes the same shared component instance — screens do not get their own copies merely because a screenshot rendered them slightly differently. Where screenshots showed two different treatments of the same concept (e.g., priority-as-pill on one Maintenance History capture vs. priority-as-dot on another), the dot+text form in §9.3 is the one to build; the pill form was an exploration artifact, not a second component to preserve.

---

## 10. Tables

| Property | Value |
|---|---|
| Header row | Uppercase muted labels, 11–12px, same background as body (no distinct header fill) |
| Row height | 64–80px (room for a two-line primary cell) |
| Cell padding | ~16px vertical / 16–24px horizontal |
| Borders | 1px horizontal hairline between rows; no vertical rules |
| Alignment | Left-aligned text/name columns; trailing Actions column left-aligned within its own column |
| Typography | Per §2 table roles |
| Row-opening action | See §17 (Table actions) — one shared "open record" interaction, not per-page variants |
| Pagination | Numbered page buttons (current page filled, others outline) + prev/next chevrons + "Showing X–Y of Z" caption; caption renders alone, with no page buttons, when the result set fits on one page |

Empty, loading, and error states, and responsive table behavior, follow the application's existing table implementation (source-of-truth §0, rung 1) and the EmptyState/LoadingState/ErrorState contracts in COMPONENTS.md — they are not newly designed here.

---

## 11. Navigation (canonical v4.2 shell)

- **Sidebar:** fixed-width, ~280–300px, white, full height, 1px right border.
  - Logo lockup at top: icon + "InduOps" wordmark, Public Sans Bold.
  - Nav items grouped under uppercase muted section labels: **OVERVIEW**, **PLANT OPERATIONS**, **ADMINISTRATION**.
  - Item: icon (~20px) + label (15–16px medium), ~48–56px row height, ~8px radius, full-width click target.
  - Active state: `#DBEAFE` background fill across the full item width, blue icon and text.
  - Inactive: muted icon/text, no fill.
  - One nav-icon mapping per nav concept, used everywhere that item appears (Equipment always uses the same icon, Maintenance always uses the same icon, etc.) — no per-screen icon substitution.
- **Top bar:** white, full width, ~72–80px, 1px bottom border.
  - Left: "InduOps v4.2" page-level branding text.
  - Right: dark-mode toggle, user name + role (two-line), sign-out control, in that fixed order on every screen.
  - Global search: see §17 — if the existing application has a working global-search feature, it is placed in the canonical top bar (a reasonable position is left of the utility icon group) during migration; it is not deleted, and it is not newly invented if it doesn't already exist in the app.

**Migration rule for legacy screens:** every legacy sidebar/top-bar variant (grouped vs. flat, different taglines, different icon sets, different active-state treatments, identity in different locations) collapses into the single Sidebar/TopBar described above. There is one Sidebar component and one TopBar component in the implementation.

---

## 12. Page headers

- **Standard PageHeader:** H1 (40–48px bold) flush-left, one-line muted subtitle beneath, optional primary action button top-right, aligned to the H1.
- **DetailHeader** (entity detail pages): identity row above the H1 (breadcrumb or back-link — see §13), plus a right-aligned cluster of secondary (outline) actions and one primary (filled) action; H1 beneath as the entity name.
- Detail pages are not required to share identical header sub-structure with each other — see §14 (Detail page structure). What they must share is typography, spacing, button styles, and badge styles, per §2, §3, §7, §9.

---

## 13. Breadcrumb vs. BackLink

These are related but distinct components; do not merge them or force every detail page to use the same one.

- **Breadcrumb:** hierarchical trail, e.g. `Maintenance > Work Orders > WO-8842-A`. Used where the entity has a real multi-level parent hierarchy (Work Orders under Maintenance, Users under Users list, Downtime records under Downtime).
- **BackLink:** a single "return to the parent list" affordance, e.g. `← Back to Equipment`. Used where there is one obvious parent list and no deeper hierarchy to expose.

Both share the same link typography and color token (§4.1 accent blue) but are separate components with separate behavior — Breadcrumb navigates to any ancestor level; BackLink navigates to exactly one place. Use whichever one matches the entity's real navigation depth in the existing application (source-of-truth §0, rung 1) rather than picking one pattern and forcing it onto every detail page.

---

## 14. Forms

- Filter bars are a white card (§5 card styling) directly beneath the page header, before the results table.
- Fields lay out in a single row: search input flexes, selects are fixed-width, action buttons close the row.
- Field label sits ~8px above its input, uppercase, consistent in every state of the page (§8).
- Active filters render as removable chips (FilterChip — gray rounded rectangle, label + value + "✕") beneath the filter card, with the results caption updating accordingly.

---

## 15. Screenshot artifacts — implementation rule

Some captured screenshots contain rendering artifacts, not intended UI. Treat the following as **artifacts to be excluded**, not specifications to implement literally:

- Unlabeled solid color bars standing in for a badge or label (seen in place of some status/event values).
- Unresolved template tokens such as a literal word "Id" appearing where a real value belongs.
- Broken/inconsistent whitespace inside an otherwise-regular metadata grid.
- Duplicated or contradictory identity data within a single screenshot (e.g., two different user names shown at once).

**Implementation rule:** when a component reads as one of the above, build the component to its intended structure (a real StatusBadge with real text, a real value in the field, one consistent identity) and populate it with the **application's real data** (source-of-truth §0, rung 1), rather than reproducing the placeholder or inventing new copy to fill the gap. If the correct real value genuinely cannot be determined from any source-of-truth level, leave that one field as a clearly-empty state rather than guessing at content — do not silently fabricate a plausible-looking value.

---

## 16. Responsive system

The existing application already has responsive behavior; this document does not replace it (source-of-truth §0, rung 1). Where the screenshot set doesn't visually specify a breakpoint treatment, apply the established InduOps principle:

**compress → stack → scroll**

1. **Compress** — reduce padding/gutters and font-scale modestly before changing structure.
2. **Stack** — multi-column layouts (KPI strips, two-column detail layouts, filter-bar rows) become single-column in document order.
3. **Scroll** — wide tables that can no longer compress or stack become horizontally scrollable rather than dropping columns or restructuring into cards.

Constraints: never let content overflow or break interaction; never redesign a desktop layout's information hierarchy for mobile; do not introduce new responsive-only components unless the existing app's responsive system requires one. Sidebar collapse behavior (icon-rail or off-canvas) follows the existing application's current implementation.

---

## 17. Dark mode

**InduOps already has dark-mode functionality.** The dark-mode toggle in the canonical top bar is real, existing functionality, not a placeholder — preserve it exactly as it exists in the application (source-of-truth §0, rung 1).

The screenshot set does not include a dark-mode capture, which means only that this document cannot re-verify dark mode's exact pixel appearance from screenshots. It does not mean dark mode should be disabled, hidden, or newly designed:

- Preserve the existing dark-mode implementation and toggle behavior as-is.
- Apply the same shared components and semantic tokens (§4, §9) in dark mode that are used in light mode — a StatusBadge is still a StatusBadge, with the same status→color mapping, just against the app's existing dark surface tokens.
- Do not invent a new dark palette not already present in the application; do not remove or gate the toggle.

---

## 18. Global search

The legacy shell's top bar includes a global search input; the canonical v4.2 shell's top bar as captured in screenshots does not show one. Resolve per source-of-truth §0, rung 1:

- If global search is existing, functional application behavior, it is **preserved** and placed within the canonical TopBar (§11) during shell migration — do not delete working functionality because the newer screenshots happened not to frame it.
- If no such functionality exists in the application and the legacy search field was only ever a visual element, do not build new search functionality to match it.

Either way, this is a functionality question answered by the existing application, not by the screenshots or by this document.

---

## 19. Screen states vs. separate pages — approved decision

The following screenshot pairs/sets are **one screen each**, with multiple captured states — not separate pages or separate components:

- **Equipment List**: default state and filtered state (search/status/criticality applied) are the same screen. Build one FilterBar + DataTable with a filtered/unfiltered state, not two.
- **Reports**: the compact and expanded captures are the same Reports screen at different data/filter depth. Build one Reports screen whose summary cards expand their content (technician/equipment/reason breakdowns) based on available data.
- **Maintenance History**: both captured visual treatments represent the same functional screen explored during design; build the one, resolved version specified in this document (uppercase filter labels per §8, PriorityIndicator per §9.3, standard Pagination per §10) — not two permanent variants.

Do not implement screenshot variants as separate routes or duplicate components unless the existing application actually has separate routes for them (source-of-truth §0, rung 1).

---

## 20. Non-goals — explicit exclusions

This is a visual-implementation and consistency pass over an approved design, not a redesign. Do not, anywhere in this implementation:

- Add cards, shadows, gradients, or glassmorphism not specified above.
- Add decorative illustrations or a generic SaaS-dashboard aesthetic.
- Enlarge typography beyond §2's scale.
- Redesign a screen's information hierarchy.
- Add filters, actions, or navigation items not present in the approved screens.
- Replace tables with cards.
- Change functionality, data, schema, API contracts, routing, auth/RBAC, business logic, or state management (see COMPONENTS.md and DESIGN_HANDOFF.md implementation constraints, and source-of-truth §0, rung 1).
