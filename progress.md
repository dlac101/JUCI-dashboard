# SmartOS WebUI — Session Progress

## Session: Apr 3 2026

### Completed

**Port Status Widget**
- LAN port labels: "LAN1" → "LAN 1" (with space) everywhere
- SVG status glyphs: replaced font glyphs with clean stroke-based polyline checkmark / paired-line X
- Added SDG-8734v port profile (SFP+ WAN, `sfp` connector shape)
- WAN XGSPON badge on WAN port detail card header
- Down ports show last-connected device: clock icon + "Last: hostname" in `text-secondary`
- WAN tooltip redesigned: quad row (media type | state | speed | duplex) + ISP full-width + IP/MAC
- "Device" label → "ISP" on WAN card and tooltip; ISP name truncated with ellipsis
- Media type (e.g. XGSPON) shown in tooltip Type slot; falls back to connector type

**EAA Accessibility (Port Status widget — complete)**
- `role=button` + `aria-label` on all SVG port shapes; `tabindex=0`
- `role=listitem` + `tabindex=0` on detail cards; `id` linked via `aria-describedby`
- `role=log` + `aria-live=polite` + `aria-relevant=additions` on event log
- `role=tooltip` + `aria-describedby` set/cleared on tooltip show/hide
- Canvas `aria-label` updated with live value on every redraw
- `.sr-only` spans inside color-only state dots
- `:focus-visible` outline + `box-shadow` glow on cards; `filter: drop-shadow` on SVG shapes
- Event log: `insertBefore` + trim pattern (not innerHTML) so live region fires correctly
- State dots: filled (up) vs hollow ring (down) — shape independent of color
- `@media (forced-colors: active)` block: dots, focus rings, badges, LTE bars, tooltip

**EAA Documentation**
- `EAA_Compliance_Review_SDG-8612.md`: updated C.1, C.2, C.3, C.5, C.7, C.14 status; added revision history
- Created `eaa-compliance` skill (patterns + pre-delivery checklist)
- Added EAA section to `smartos-webui` skill
- Added EAA rule to `CLAUDE.md`
- Created `EAA_Improvement_Summary_Apr2026.md` (before/after + remaining work)

### Decisions Made
- High Contrast Mode: rely on OS-level HC (`@media forced-colors`) — no custom in-app toggle
- ISP label: "Device" → "ISP" for WAN role ports only
- Media type strategy: show `p.media_type` alone in Type slot (not connector+media) when set
- Mock ISP: "Consolidated Communications, Inc" (full name, fits at 237px)
- Word summary doc: paused — LED compliance work takes priority

---

## Session: Apr 3 2026 (continued)

### Completed

**LED State Indicator (EAA C.5 / A.1 / A.3 hardware gap mitigation)**
- `led_state: 'HUB_WAN_UP'` added to `MOCK.device` in `dashboard.js`
- `MOCK.led_state_map` defined: all 13 MCU states from LED spec, each with `{ label, pattern, cssClass }`
- Device Info card: LED indicator row added (dot + text label); `role=status`, `aria-live=polite`, `aria-label` updated per state
- CSS: `.led-solid`, `.led-pulse` (1.4s breathing), `.led-blink` (0.8s step-end); forced-colors support
- `renderDevice()` updated to set dot class + label text + aria-label from state map on every render
- EAA review `A.1`, `A.3`, `C.5` rows updated with mitigation evidence
- `EAA_Improvement_Summary_Apr2026.md`: new LED section added, scope updated, C.5 extended, Section A note updated
- Revision history updated in both EAA documents

### Decisions Made
- LED dot color: neutral `var(--accent-cyan)` — animation pattern only, text label carries state meaning
- `led_state_map` lives in `MOCK` object (adjacent to device) — easy to swap to production ubus source
- `SAT_POOR` gets `.led-blink` (distinct from `.led-pulse`) to match MCU's distinct Blink vs Pulse patterns

---

## Session: Apr 3 2026 (continued 2)

### Completed

**Full Dashboard ARIA Audit (EAA C.1 / C.14)**
- Alarms: sev-dot `aria-hidden`, alarm-row `role=listitem`+`aria-label`, btn-dismiss `aria-label`
- Events: event-row `role=listitem`+`aria-label`, priority bar `aria-hidden`+`.sr-only` severity, count badges labeled, btn-ack `aria-label`, events-list `aria-live=polite`
- Top Flows / Top Hosts: row `role=listitem`+`aria-label` (full plaintext summary), decorative children `aria-hidden`
- MWAN: panels `role=region`+`aria-label`, state-dot `aria-hidden`, latency+loss `aria-label`, event-row `role=listitem`+`aria-label`, FA icons `aria-hidden`, usage bar `role=img`+`aria-label`
- QoE pills: `tabindex=0`, `role=img`, `aria-label`, focus triggers `showTooltipNearEl` keyboard tooltip
- Airtime bars: `tabindex=0`, `role=img`, `aria-label`, focus triggers `showTooltipNearEl`
- Throughput canvas: `aria-label` updated live with DL/UL values
- Flow sparklines: `aria-hidden=true focusable=false` (decorative)
- `index.html`: alarm-list, events-list, topflows-list, tophosts-list all `role=list`; mwan panels `role=region`
- `showTooltipNearEl(html, elem)`: new helper anchors tooltip below element for keyboard users

**WCAG 4.5:1 Contrast Audit (EAA C.4)**
- Programmatic audit in browser across dark + light themes; all failing pairs identified and remediated
- Dark theme: `--text-muted` #6b7280 -> #808898 (4.77:1 card, 5.37:1 sidebar); scoped tooltip override #9ca3af (5.83:1); nav-section-label -> #7a8a9a (5.01:1); nav-sublink -> #808898 (5.37:1)
- Light theme: `--text-muted` -> #5a6a7e (5.53:1); all 6 accent colors darkened (4.83-5.70:1 on white)
- EAA review C.4: CANNOT ASSESS -> PARTIALLY MET
- EAA docs updated with C.4 section in both review and improvement summary

### Decisions Made
- Light theme accent overrides scoped to `[data-theme="light"]` — dark theme palette unchanged
- `showTooltipNearEl` fallback: mouse movement takes over tooltip position once mouse becomes active
- C.4 remaining work: large-text (3:1) and UI-component contrast; 200% magnification layout check; AT testing

---

## Session: Apr 4 2026

### Completed

**WCAG Large-Text 3:1 Scan (EAA C.4)**
- 15 large-text elements scanned in dark theme — zero failures (all 7.54-19.15:1)
- Light-theme scan produced false positives due to test-mode theme switching; user-confirmed correct visually

**WCAG Non-Text Contrast 3:1 Audit (EAA C.4 / WCAG 1.4.11)**
- Identified failures: inputs/selects with --border on dark bg (1.16:1), checkboxes (browser-default black, 1.18:1), buttons using --border on topbar/card bg
- Added `--border-ui: #5a6e82` (3.23:1 on card, 3.64:1 on page, 3.49:1 on topbar)
- Raised `--border-bright: #374151` -> `#6b7280` (3.52:1 on card, fixes btn-ack + badges)
- Applied --border-ui to: shaper-input, shaper-select, sv-goto-input, sv-sort-select, btn-topbar, theme-toggle, st-advanced-toggle, sth-export-btn, shaper-btn-cancel
- Global checkbox/radio: `accent-color: var(--accent-cyan)` + `outline: 1px solid var(--border-ui)` (3.23-3.37:1)
- EAA docs updated: C.4 PARTIALLY MET with full audit scope documented

**Word Document**
- Generated `EAA_Improvement_Summary_Apr2026.docx` (84 KB) using Adtran_Template.dotx
- All 4 sections: Status Changes, What Was Implemented, Remaining Work, Overall Status
- Validation passed: 205 paragraphs, exactly 2 sectPr, correct rIds for header/footer
- No em-dashes, correct cover title/subtitle, version 1.0 April 2026

### Decisions Made
- Borderless filled-bg buttons excluded from 1.4.11: boundary conveyed by cyan fill, not border
- view-toggle active excluded: state communicated by filled background, border is decorative
- `--border` unchanged (decorative dividers don't require 3:1); `--border-ui` only for interactive controls
- Checkbox outline approach (not appearance: none) — least invasive, preserves browser native UX

### TODOs

**Remaining WebUI EAA**
- [ ] Visual shape/pattern coding for throughput, airtime, QoE charts (color-primary indicator gap C.2/C.5)
- [ ] WCAG 1.4.10 reflow at 320px viewport (LOW)
- [ ] Formal AT testing with NVDA/JAWS (C.1/C.14)

**Non-WebUI (other teams)**
- [ ] Tech pubs: HC mode activation guide, accessibility features section, AT compatibility list
- [ ] Tech pubs: Tagged PDF-UA docs with alt-text
- [ ] Hardware: EN 301 489-17 hearing-aid interference testing (CRITICAL)
- [ ] Support/Marketing: Accessibility statement on support pages
