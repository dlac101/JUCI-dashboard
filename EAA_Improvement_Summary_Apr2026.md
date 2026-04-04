# SDG-8612 EAA Compliance: Improvement Summary

**Product:** SDG-8612 / SDG-8614
**Directive:** EU 2019/882 (European Accessibility Act)
**Date:** April 2026
**Scope:** SmartOS WebUI — Port Status widget remediation + LED state indicator + full dashboard ARIA audit + WCAG contrast audit

---

## 1. Status Changes

| Ref | Requirement | Before | After |
|-----|-------------|--------|-------|
| C.1 | Screen reader compatibility | CANNOT ASSESS | PARTIALLY MET |
| C.2 | Multi-sensory UI feedback | LIKELY GAP | PARTIALLY MET |
| C.3 | Keyboard-only operation | LIKELY MET | LIKELY MET (confirmed) |
| C.4 | WCAG contrast and magnification | CANNOT ASSESS | PARTIALLY MET |
| C.5 | Non-color UI indicators | LIKELY GAP | PARTIALLY MET (extended) |
| C.7 | Visual clarity / High Contrast | PARTIALLY MET | PARTIALLY MET (extended) |
| C.14 | Assistive technology APIs | CANNOT ASSESS | PARTIALLY MET |

---

## 2. What Was Implemented

### ARIA and Screen Reader Support (C.1, C.14)
- `role=button` + `aria-label` on all interactive SVG port shapes
- `role=listitem` on detail cards; `role=tooltip` on tooltip element
- `role=log` + `aria-live=polite` + `aria-relevant=additions` on event log
- `aria-describedby` set/cleared on tooltip show/hide
- Canvas gauge `aria-label` updated with live value on every redraw
- `.sr-only` spans inside color-only dot indicators ("Online" / "Offline")

### Keyboard Navigation (C.3)
- `tabindex=0` on all SVG port groups and detail cards
- Focus order matches visual reading order
- All Port Status interactions reachable by Tab key alone

### Focus Visibility (WCAG 2.4.7 / 2.4.11)
- `:focus-visible` with outline + `box-shadow` glow on focusable cards and buttons
- SVG port shapes: `filter: drop-shadow` on focus
- Glowing frame visible in both dark and light themes

### Non-Color Indicators (C.5)
- State dots: filled circle (up) vs hollow ring (down) — shape differs independently of color
- Event log dots: same filled/hollow pattern
- Badge and tooltip text labels carry full meaning without color

### Hardware LED State Mirror (C.5 / A.1 / A.3)

The front-panel LED is a single 4-color component (R/G/B/W) controlled by the MCU. The LED spec defines 13 device states. Several states share the same animation pattern and differ only by color (e.g. Hub WAN Down and Satellite Poor Signal both use Pulse Red+Green). This makes them indistinguishable to users with color vision deficiency — an EAA A.1/A.3 hardware gap that cannot be closed without a product redesign.

**WebUI mitigation implemented:**
- `MOCK.device.led_state` field added; production source is the LED control script state machine
- `LED_STATE_MAP` in `dashboard.js` maps all 13 states to `{ label, pattern, cssClass }`
- Device Info card renders a labeled text indicator: dot (animated, neutral color) + state name in monospace text
- Animation classes: `.led-solid` (static), `.led-pulse` (breathing, 1.4s), `.led-blink` (step-end, 0.8s) match MCU patterns
- `role=status` + `aria-live=polite` on the row; `aria-label` updated with current state name on every render
- No color dependency: the text label carries full meaning independently of the dot animation

This does not close the hardware A.1/A.3 gap for users of the physical device, but it ensures any user accessing the WebUI can read the current LED state without relying on color or physical sight of the device.

### Full Dashboard ARIA Audit (C.1, C.14)

A second pass extended ARIA coverage from Port Status to every remaining dashboard card:

- **Alarms:** severity dot `aria-hidden`; alarm row `role=listitem` + `aria-label` (severity + name); dismiss button `aria-label`
- **Events:** event row `role=listitem` + `aria-label`; priority bar `aria-hidden` + `.sr-only` severity text; count badges labeled; acknowledge button `aria-label`; events list `aria-live=polite`
- **Top Flows / Top Hosts:** each row `role=listitem` + `aria-label` (full plaintext summary); decorative cell content `aria-hidden`
- **MWAN:** WAN and WWAN panels `role=region` with `aria-label`; state dot `aria-hidden`; latency and loss chips labeled; MWAN event rows `role=listitem` + `aria-label`; FA icons `aria-hidden`; usage bar `role=img` + `aria-label`
- **QoE pills:** `tabindex=0`, `role=img`, `aria-label` (metric + value + rating); focus triggers `showTooltipNearEl` keyboard-accessible tooltip
- **Airtime bars:** `tabindex=0`, `role=img`, `aria-label` (band + per-client breakdown); focus triggers `showTooltipNearEl`
- **Throughput chart:** live canvas `aria-label` updated with current DL/UL values on every redraw
- **Flow sparklines:** SVG `aria-hidden=true focusable=false` (decorative)

### WCAG Contrast Audit (C.4)

A formal WCAG 2.1 AA (4.5:1 normal text) audit was run programmatically in-browser across both dark and light themes. All failing color pairs were identified and remediated:

**Dark theme fixes:**
- `--text-muted` raised from #6b7280 to #808898: 4.77:1 on card bg (#151c2c), 5.37:1 on sidebar bg (#0b0f19)
- Scoped `#tooltip { --text-muted: #9ca3af }` override: 5.83:1 on tooltip bg (#1e2740)
- `.nav-section-label` raised from #4b5563 to #7a8a9a: 5.01:1 on sidebar
- `.nav-sublink` raised from #6b7280 to #808898: 5.37:1 on sidebar

**Light theme fixes:**
- `--text-muted` raised from #9ca3af to #5a6a7e: 5.53:1 on white
- All six accent colors overridden with darker variants (previously 1.92-2.15:1, now all pass):
  - Cyan #00C8E6 -> #0e7490: 5.36:1
  - Green #34d399 -> #15803d: 5.02:1
  - Amber #f59e0b -> #b45309: 5.02:1
  - Red #ef4444 -> #dc2626: 4.83:1
  - Blue #3b82f6 -> #2563eb: 5.17:1
  - Purple #a78bfa -> #7c3aed: 5.70:1

No color dependency was introduced: all overrides are scoped to `[data-theme="light"]`, leaving the dark theme palette unchanged.

### Multi-Sensory Feedback (C.2)
- Tooltips fire on `mouseenter` and `focus`; dismissed on `mouseleave` and `blur`
- WAN tooltip: structured data (media type, state, speed, duplex, ISP, IP, MAC) on focus
- Text alternatives alongside all visual-only indicators in Port Status

### Forced Colors / High Contrast Mode (C.7)
- `@media (forced-colors: active)` block implemented
- Covers: state dots, focus rings, badges, LTE signal bars, tooltip background/borders
- Strategy: relies on OS-level activation (Windows: Settings > Accessibility > Contrast themes) rather than a custom in-app toggle

---

## 3. Remaining Work for Full Compliance

### Software / UI (Engineering)

| Priority | Item | Refs | Action |
|----------|------|------|--------|
| HIGH | Dashboard chart indicators | C.2, C.5 | Add shape/pattern alternatives to throughput, airtime, and QoE charts — currently color-primary only (keyboard tooltips added; visual shape coding outstanding) |
| MEDIUM | Large-text and UI-component contrast | C.4 | Verify 3:1 for large text and UI controls; verify text scaling to 200% does not break layout |
| MEDIUM | AT compatibility testing | C.1, C.14 | Formal screen reader testing with NVDA and JAWS; publish AT compatibility list (B.7) |

### Documentation / Tech Pubs

| Priority | Item | Refs | Action |
|----------|------|------|--------|
| HIGH | PDF accessibility | B.1, B.4 | Produce tagged PDF-UA versions of QSG and User Guide; add alt-text to all figures |
| HIGH | HTML documentation | B.2 | Provide docs in HTML in addition to PDF |
| HIGH | Accessibility features section | B.5, B.6 | Document all accessibility features and how to activate them |
| HIGH | High Contrast Mode guide | B.5, C.7 | Document OS HC mode activation: Windows Settings > Accessibility > Contrast themes |
| HIGH | Assistive technology list | B.7 | List of screen readers and other AT tested with the WebUI |

### Hardware / RF

| Priority | Item | Refs | Action |
|----------|------|------|--------|
| CRITICAL | Hearing aid interference testing | E.1 | Commission EN 301 489-17 testing — no evidence of compliance on file |

### Support / Marketing

| Priority | Item | Refs | Action |
|----------|------|------|--------|
| MEDIUM | Accessibility statement | F.1 | Add accessibility information and contact to support pages |
| MEDIUM | Accessible support formats | F.2 | Expand support beyond phone + email (chat, text, video relay) |

---

## 4. Overall Compliance Status by Section

| Section | Area | Status |
|---------|------|--------|
| A | Product labelling and on-device markings | CONFIRMED GAP |
| B | Documentation | CONFIRMED GAP |
| C | Software / UI | PARTIALLY MET (in progress) |
| D | Physical hardware design | MET |
| E | Hearing technology / RF | CONFIRMED GAP |
| F | Support services | PARTIALLY MET |
| G | Packaging | CONFIRMED GAP |

Sections B, E, and G require action by tech pubs, hardware, and marketing teams respectively. Section A hardware LED gap is partially mitigated at WebUI level (LED state text indicator). Section C is the primary area of active remediation.
