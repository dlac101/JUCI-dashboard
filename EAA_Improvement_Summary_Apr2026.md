# SDG-8612 EAA Compliance: Improvement Summary

**Product:** SDG-8612 / SDG-8614
**Directive:** EU 2019/882 (European Accessibility Act)
**Date:** April 2026
**Scope:** SmartOS WebUI — Port Status widget remediation

---

## 1. Status Changes

| Ref | Requirement | Before | After |
|-----|-------------|--------|-------|
| C.1 | Screen reader compatibility | CANNOT ASSESS | PARTIALLY MET |
| C.2 | Multi-sensory UI feedback | LIKELY GAP | PARTIALLY MET |
| C.3 | Keyboard-only operation | LIKELY MET | LIKELY MET (confirmed) |
| C.5 | Non-color UI indicators | LIKELY GAP | PARTIALLY MET |
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
| HIGH | Dashboard chart indicators | C.2, C.5 | Add shape/pattern alternatives to throughput, airtime, and QoE charts — currently color-primary only |
| HIGH | Remaining dashboard cards | C.1, C.14 | ARIA audit and remediation: QoE score, WAN status, speed test history, events, alarms, flows, hosts, WWAN failover |
| HIGH | Contrast audit | C.4 | Formal WCAG 4.5:1 audit of all text/background combinations in dark and light themes |

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

Sections A, B, E, and G require action by hardware, tech pubs, and marketing teams respectively. Section C is the only area where active remediation is underway.
