# JUCI Dashboard

A modern dark-themed WebUI dashboard prototype for SmartOS residential gateways (Adtran/SmartRG). Built as a static HTML/CSS/JS single-page app with no framework dependencies.

## Overview

This dashboard provides real-time visibility into router health, WAN connectivity, network traffic, and device activity. Designed for ISP-managed CPE running SmartOS (OpenWrt-based), it integrates with the `flowstatd` flow statistics daemon and `classifi` DPI classification engine.

## Features

### Core Widgets
- **System Performance Score** -- Composite QoE score (0-100) with per-subsystem pill badges (WAN, System, WiFi, LAN, Mesh) and per-device issue list. Simple view adds inline "Last Speed Test" section with horizontal bar graphs showing download/upload as a percentage of ISP service rate
- **WAN Status + Bufferbloat Score** -- Dual-panel card with WAN metadata (IP, gateway, DNS, MTU, link speed, uptime) and live bufferbloat grade with latency metrics
- **Bufferbloat Score** -- Standalone Simple-view card (`card-bbscore`) showing download and upload bufferbloat grade pills (A/B/C/D/F) with color coding
- **Port Status** -- SVG port diagram (per-model profiles: SDG-8612, SDG-8614, SDG-8734v) with per-port state dots (filled/hollow shape coding independent of color), click/focus detail cards, WAN tooltip with media type/speed/duplex/ISP/IP/MAC, and event log with live ARIA region. Keyboard accessible: all ports and cards reachable via Tab with focus-visible outlines.
- **Device Info + System Health** -- Split card: device identity (model, MAC, serial, firmware, CDT) alongside a 2x2 Boeing-inspired needle gauge cluster (CPU, Temp, Flash, RAM) with animated excursions. LED State row mirrors all 13 front-panel MCU LED states as labeled text (dot + animation class + state name) for EAA A.1/A.3 compliance.
- **Connection History** -- Interactive timeline bar (7d/30d/1yr) with grab-to-scroll, alternating month shading, uptime stats, and monthly uptime pill badges
- **WAN Throughput** -- Real-time canvas graph with smooth Y-axis lerp scaling and bursty mock traffic patterns
- **Speed Test History** -- Bar chart with DL/UL grouped bars, % utilization toggle, grab-to-scroll, mouseover detail tooltips, and dotted service-rate reference lines (cyan for DL, green for UL)
- **WiFi Airtime** -- Per-radio (2.4/5/6 GHz) stacked utilization bars (Tx, Rx, WiFi interference, non-WiFi interference, available) with dynamic per-band client counts that drift in mock data
- **Recent Events** -- Scrollable event list with severity icons and acknowledgment checkmarks
- **Active Alarms** -- Severity-grouped alarm list (critical/error/warn) with dismiss buttons
- **WWAN Failover** -- Dual-panel WAN/WWAN status with latency sparklines, carrier name via rDNS lookup, failover event log (4-event cycle: Primary WAN down, Backup WAN up, Primary WAN restored, Backup WAN standing by), and 30-day WAN/LTE usage bar

### FlowSight Integration Widgets
- **Top Active Flows** -- Per-flow ranked list with destination hostnames, protocol badges (TCP/UDP), app classification (YouTube, Netflix, Steam, etc.), inline SVG sparklines, and live rate animation. Maps to `flowstatd.flows` ubus API.
- **Top Bandwidth Hosts** -- Per-device aggregated bandwidth with green-themed sparklines and flow counts. Maps to `flowstatd.hosts` ubus API.

### Dashboard Features
- **Simple/Advanced view toggle** -- Pill toggle in the top bar switches between a consumer-friendly 6-card Simple view and the full 13-card Advanced technician dashboard. Inspired by Eero/Google Nest simplicity with a UniFi-style advanced toggle. View preference persisted to localStorage
- **Simple view** -- Fixed 3-column centered grid (max-width 1100px) with responsive breakpoints: 3-col at 1280px+, 2-col at 768-1279px, 1-col below 768px. Cards use auto height. Per-card simplifications hide technical details (WAN hides gateway/DNS/MTU; Device Info hides serial/MAC/CDT/gauges; WiFi Airtime hides Tx/Rx legend; Connection History locks to 1yr and hides monthly stats). No edit mode or drag-drop
- **Advanced view** -- Full technician dashboard with drag-and-drop customization, tile picker, and "Restore Default Layout" button in edit mode
- **Free-placement grid** -- 4-column CSS Grid with explicit `grid-column`/`grid-row` positioning, persistent via localStorage
- **iOS-style edit mode** -- Long-press enters wiggle mode; drag to reorder; Escape or click outside to exit
- **Restore Default Layout** -- Fixed-position button visible in edit mode; resets to factory default `LAYOUT_4COL`, clears hidden tiles, reloads page
- **FLIP animations** -- Smooth position transitions when tiles swap during drag
- **Tile picker** -- Add custom widgets (SFP, Multi-WAN, VoIP, VPN, PoE, Connected Clients)
- **Responsive** -- Media queries for 1920px+, 1200px, 768px, and 700px breakpoints; Simple view has its own responsive grid (3-col/2-col/1-col)

## Tech Stack

- Vanilla HTML5 / CSS3 / ES6 JavaScript (no build step, no framework)
- Font Awesome 6 (CDN) for icons
- JetBrains Mono + Inter fonts (CDN)
- Canvas API for throughput and speed test charts
- SVG for inline sparklines
- CSS Grid + Flexbox layout
- CSS custom properties for theming
- localStorage for layout persistence

## Data Architecture

All data is currently mock/simulated for prototyping. In production, widgets connect to SmartOS via:

| Widget | ubus Method | Source Daemon |
|--------|------------|---------------|
| Top Active Flows | `flowstatd.flows` | flowstatd |
| Top Bandwidth Hosts | `flowstatd.hosts` | flowstatd |
| App Classification | `classifi.classified` | classifi (nDPI) |
| WAN Status | `network.interface.wan` | netifd |
| WiFi Airtime | `iwinfo` / `hostapd` | hostapd |
| System Health | `/proc/stat`, `/proc/meminfo` | procd |

| WWAN Failover | `mwan3.status` (rpcd) | mwan3 / mwan3track |
| WWAN Failover events | `/FLASH/persist/mwan/mwanlte.log` | mwan3track |
| WWAN Failover usage | `ltewan-accounting.py` | mwan3 |

See `flowstatd.md`, `flowstatd-modules.md`, and `classifi.md` for detailed API contracts.

---

## Open Engineering Questions

### WWAN Failover Widget: Carrier / ISP Name Display

The WWAN Failover widget shows a carrier/ISP label beneath each interface panel (bottom-left). The mock data currently uses **reverse DNS (PTR) lookup** on the interface IP as a proxy for carrier name:

- WAN example: `c-198-51-100-43.hsd1.ca.comcast.net` → resolves Comcast
- WWAN example: `mip-100-74-23-156.vzwentp.net` → resolves Verizon

**The problem:** rDNS is unreliable as a carrier name source:
- Many ISPs do not set PTR records for customer IPs
- CGNAT addresses (100.64.0.0/10), common on LTE, frequently have no PTR record
- The hostname format varies wildly between ISPs and is not human-friendly
- A PTR lookup adds latency and must be cached to avoid re-querying on every render

**Alternatives to evaluate:**

1. **CDT (Customer Defined Tags / Configuration Template):** The CDT value provisioned onto the device often encodes the carrier or ISP name. This is likely the most reliable source for managed CPE deployments where the CDT is set at provisioning time. Check whether the CDT data model exposes a human-readable carrier name field.

2. **rDNS with parsing:** Run `resolveip -4 <ip>` (available on OpenWrt), cache the result, and parse a recognizable segment from the hostname (e.g. extract the registrable domain). Works without provisioning but fails silently on CGNAT/no-PTR cases.

3. **Modem manager for WWAN:** The Inseego and Alcatel manager scripts (`inseego-manager.sh`, `alcatel-manager.sh`) query the modem directly and may expose the SIM carrier name via AT commands or JSON RPC. This would be authoritative for the WWAN panel specifically.

4. **Static provisioning field:** Add an explicit `isp_name` field to the WAN/WWAN interface config in UCI. Reliable but requires provisioning-time data entry.

**Recommendation:** Use CDT for WAN (if available), modem manager for WWAN, and fall back to rDNS with domain extraction. Never display a raw rDNS hostname without parsing — it will confuse end users.

## Accessibility (EAA EU 2019/882 / EN 301 549 / WCAG 2.1 AA)

The WebUI is under active EAA compliance remediation for the SDG-8612/8614 product family. Reference documents: `EAA_Compliance_Review_SDG-8612.md` and `EAA_Improvement_Summary_Apr2026.docx`.

### Current status (Apr 2026)

| Section | Area | Status |
|---------|------|--------|
| A | On-device LED indicators | WebUI partial mitigation (text mirror of 13 LED states) |
| B | Documentation | Confirmed gap (Tech Pubs action required) |
| C | Software / UI | Partially met (active remediation) |
| D | Physical hardware | Met |
| E | Hearing technology / RF | Confirmed gap (EN 301 489-17 testing required) |
| F | Support services | Partially met |
| G | Packaging | Confirmed gap |

### WebUI accessibility features implemented

- **ARIA:** Full dashboard audit complete. All interactive elements use `role`, `aria-label`, `aria-live`, and `aria-describedby` per widget type (port shapes, detail cards, event log, tooltip, alarms, events, flows, hosts, MWAN panels, QoE pills, airtime bars, throughput canvas).
- **Keyboard navigation:** All Port Status ports and cards reachable via Tab. QoE pills and airtime bars expose keyboard-triggered tooltips via `showTooltipNearEl`.
- **Focus visibility:** `:focus-visible` outline + glow on all interactive cards and buttons; `filter: drop-shadow` on SVG port shapes.
- **Non-color indicators:** Port state dots use filled circle (up) vs hollow ring (down). LED state text label carries full meaning independently of dot color or animation.
- **High Contrast Mode:** `@media (forced-colors: active)` block covers dots, focus rings, badges, LTE bars, and tooltip.
- **Contrast (WCAG 1.4.3 / 1.4.11):** Full programmatic audit completed. All normal-text pairs pass 4.5:1 in both dark and light themes. All large-text elements pass 3:1. Interactive component borders use `--border-ui: #5a6e82` (min 3.23:1). Checkboxes and radios use `accent-color` plus `outline: --border-ui`.
- **LED state mirror (EAA A.1/A.3):** Device Info card displays current MCU LED state as labeled text indicator, mitigating the hardware gap where physical LED states differ only by color.

### Remaining WebUI gaps
- Chart shape/pattern alternatives for throughput, airtime, and QoE (C.2/C.5)
- WCAG 1.4.10 reflow at 320px viewport
- Formal AT compatibility testing (NVDA, JAWS)

---

## Quick Start

Serve the directory with any static HTTP server:

```bash
# Python
python -m http.server 8080

# Node
npx serve -p 8080

# Or just open index.html directly in a browser
```

## File Structure

```
index.html                              Main dashboard page
dashboard.js                            All widget logic, mock data, animations, drag-and-drop
styles.css                              Complete stylesheet with dark/light themes and responsive breakpoints
gauge-test.html                         Standalone needle gauge test page (Boeing-inspired frown gauges)
mockup-bufferbloat.html                 Bufferbloat layout comparison mockup
flowstatd.md                            Flow statistics daemon API reference
flowstatd-modules.md                    Detailed flowstatd module documentation
classifi.md                             DPI classification daemon documentation
SOS_Dashboard2.0_Integration_Guide.md  Full JUCI integration guide for all 12 widgets
EAA_Compliance_Review_SDG-8612.md      EAA EU 2019/882 compliance assessment (all sections A-G)
EAA_Improvement_Summary_Apr2026.md     Engineering improvement summary with before/after status
EAA_Improvement_Summary_Apr2026.docx   Adtran-formatted Word version of the improvement summary
progress.md                             Session-by-session development log and open TODOs
session_handoff.md                      Next-session context: goal, files, constraints, ordered steps
```

## Design Principles

- **Needle gauges over arc fills** -- Inspired by Boeing engine instruments. Humans have extreme hyperacuity for angular orientation of line segments, making needle position changes detectable in milliseconds. Arc fill gauges lack this perceptual advantage.
- **Information density without clutter** -- Every pixel earns its place. No decorative elements that don't convey data.
- **Dark theme first** -- Optimized for NOC/monitoring environments and reduced eye strain.
- **Progressive disclosure** -- Simple view for consumers, Advanced view for technicians. "View All" links to detail pages. Per-card content simplification hides technical rows in Simple mode via CSS-driven `body[data-view="basic"]` and `.tech-only` / `.basic-only` classes.

## License

Proprietary. Copyright Adtran, Inc.
