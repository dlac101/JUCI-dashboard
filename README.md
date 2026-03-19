# JUCI Dashboard

A modern dark-themed WebUI dashboard prototype for SmartOS residential gateways (Adtran/SmartRG). Built as a static HTML/CSS/JS single-page app with no framework dependencies.

## Overview

This dashboard provides real-time visibility into router health, WAN connectivity, network traffic, and device activity. Designed for ISP-managed CPE running SmartOS (OpenWrt-based), it integrates with the `flowstatd` flow statistics daemon and `classifi` DPI classification engine.

## Features

### Core Widgets
- **System Performance Score** -- Composite QoE score (0-100) with per-subsystem pill badges (WAN, System, WiFi, LAN, Mesh) and per-device issue list
- **WAN Status + Bufferbloat Score** -- Dual-panel card with WAN metadata (IP, gateway, DNS, MTU, link speed, uptime) and live bufferbloat grade with latency metrics
- **Device Info + System Health** -- Split card: device identity (model, MAC, serial, firmware, CDT) alongside a 2x2 Boeing-inspired needle gauge cluster (CPU, Temp, Flash, RAM) with animated excursions
- **Connection History** -- Interactive timeline bar (7d/30d/1yr) with grab-to-scroll, alternating month shading, uptime stats, and monthly uptime pill badges
- **WAN Throughput** -- Real-time canvas graph with smooth Y-axis lerp scaling and bursty mock traffic patterns
- **Speed Test History** -- Bar chart with DL/UL grouped bars, % utilization toggle, grab-to-scroll, and mouseover detail tooltips
- **WiFi Airtime** -- Per-radio (2.4/5/6 GHz) stacked utilization bars (Tx, Rx, WiFi interference, non-WiFi interference, available)
- **Recent Events** -- Scrollable event list with severity icons and acknowledgment checkmarks
- **Active Alarms** -- Severity-grouped alarm list (critical/error/warn) with dismiss buttons

### FlowSight Integration Widgets
- **Top Active Flows** -- Per-flow ranked list with destination hostnames, protocol badges (TCP/UDP), app classification (YouTube, Netflix, Steam, etc.), inline SVG sparklines, and live rate animation. Maps to `flowstatd.flows` ubus API.
- **Top Bandwidth Hosts** -- Per-device aggregated bandwidth with green-themed sparklines and flow counts. Maps to `flowstatd.hosts` ubus API.

### Dashboard Features
- **Free-placement grid** -- 4-column CSS Grid with explicit `grid-column`/`grid-row` positioning, persistent via localStorage
- **iOS-style edit mode** -- Long-press enters wiggle mode; drag to reorder; Escape or click outside to exit
- **FLIP animations** -- Smooth position transitions when tiles swap during drag
- **Tile picker** -- Add custom widgets (SFP, Multi-WAN, VoIP, VPN, PoE, Connected Clients)
- **Responsive** -- Media queries for 1920px+, 1200px, 768px, and 700px breakpoints

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

See `flowstatd.md`, `flowstatd-modules.md`, and `classifi.md` for detailed API contracts.

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
index.html              Main dashboard page
dashboard.js            All widget logic, mock data, animations, drag-and-drop
styles.css              Complete stylesheet with dark theme and responsive breakpoints
gauge-test.html         Standalone needle gauge test page (Boeing-inspired frown gauges)
mockup-bufferbloat.html Bufferbloat layout comparison mockup
flowstatd.md            Flow statistics daemon API reference
flowstatd-modules.md    Detailed flowstatd module documentation
classifi.md             DPI classification daemon documentation
```

## Design Principles

- **Needle gauges over arc fills** -- Inspired by Boeing engine instruments. Humans have extreme hyperacuity for angular orientation of line segments, making needle position changes detectable in milliseconds. Arc fill gauges lack this perceptual advantage.
- **Information density without clutter** -- Every pixel earns its place. No decorative elements that don't convey data.
- **Dark theme first** -- Optimized for NOC/monitoring environments and reduced eye strain.
- **Progressive disclosure** -- Summary view on dashboard, "View All" links to detail pages.

## License

Proprietary. Copyright Adtran, Inc.
