# SmartOS Dashboard — JUCI Integration Guide

This document covers the integration of every widget in the SmartOS Dashboard prototype
into production SmartOS/JUCI. It maps every mock data field to its real SmartOS API source,
defines the JUCI plugin architecture, and calls out open engineering questions.

The prototype is a static HTML/CSS/JS mockup. Production integration means porting each
widget into JUCI's AngularJS + Lua RPC framework, replacing mock data with live ubus calls.

---

## Table of Contents

1. [JUCI Framework Quick Reference](#1-juci-framework-quick-reference)
2. [Recommended Plugin Structure](#2-recommended-plugin-structure)
3. [Widget Catalog & Field Mappings](#3-widget-catalog--field-mappings)
   - 3.1 [System Performance Score (QoE)](#31-system-performance-score-qoe)
   - 3.2 [WAN Status](#32-wan-status)
   - 3.3 [Device Info](#33-device-info)
   - 3.4 [Connection History](#34-connection-history)
   - 3.5 [Speed Test History](#35-speed-test-history)
   - 3.6 [WiFi Airtime](#36-wifi-airtime)
   - 3.7 [Recent Events](#37-recent-events)
   - 3.8 [Active Alarms](#38-active-alarms)
   - 3.9 [WAN Throughput](#39-wan-throughput)
   - 3.10 [Top Active Flows](#310-top-active-flows)
   - 3.11 [Top Bandwidth Hosts](#311-top-bandwidth-hosts)
   - 3.12 [WWAN Failover](#312-wwan-failover)
   - 3.13 [Bufferbloat Score (Simple View)](#313-bufferbloat-score-simple-view)
4. [Grid Layout & Drag-Drop System](#4-grid-layout--drag-drop-system)
5. [Tile Picker / Custom Tiles](#5-tile-picker--custom-tiles)
6. [Simple/Advanced View Toggle](#6-simpleadvanced-view-toggle)
7. [Open Engineering Questions](#7-open-engineering-questions)
8. [CSS & Theming Notes](#8-css--theming-notes)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. JUCI Framework Quick Reference

JUCI is the SmartOS WebUI framework. Key patterns for integration:

### Architecture
- **Frontend**: AngularJS 1.x, directives, controllers, HTML templates
- **Transport**: JSON-RPC 2.0 over WebSocket
- **Backend**: Lua scripts in `/usr/lib/ubus/juci/`, invoked by `ubus-scriptd`
- **Config**: UCI read/write via `$uci.sync()` / `$uci.save()`
- **Auth**: ACL files in `/usr/share/rpcd/acl.d/`

### Key Patterns

**RPC call from frontend:**
```javascript
$rpc.juci.dashboard.status().done(function(result) {
  $scope.data = result;
  $scope.$apply();
});
```

**Parallel fetch:**
```javascript
async.parallel([
  function(cb) { $rpc.juci.dashboard.wan_status().done(function(r) { $scope.wan = r; cb(); }); },
  function(cb) { $rpc.juci.dashboard.qoe().done(function(r) { $scope.qoe = r; cb(); }); }
], function() { $scope.$apply(); });
```

**Polling:**
```javascript
JUCI.interval.repeat("dashboard.refresh", 5000, function(done) {
  // fetch data, then call done()
});
```

**Directive registration:**
```javascript
JUCI.app.directive("dashboardWidget", function() {
  return {
    scope: true,
    templateUrl: "/widgets/dashboard-widget.html",
    controller: "DashboardWidgetCtrl"
  };
});
```

**Lua backend** (`rpc/dashboard.lua`):
```lua
local juci = require("orange/core")
local json = require("orange/json")

local function wan_status()
  local raw = juci.shell("ubus call network.interface.wan status 2>/dev/null")
  return json.decode(raw) or {}
end

return {
  ["wan_status"] = wan_status
}
```

**Access ACL** (`access.acl`):
```
ubus /juci/dashboard wan_status x
ubus /juci/dashboard qoe x
uci network * r
```

---

## 2. Recommended Plugin Structure

```
juci-mod-dashboard/
├── Makefile
├── access.acl
├── rpc/
│   └── dashboard.lua               ← Lua RPC backend (all widget data)
└── src/
    ├── juci-mod-dashboard.js        ← Plugin init
    ├── pages/
    │   ├── dashboard-page.js        ← Main page controller
    │   └── dashboard-page.html      ← Main page template
    ├── widgets/                      ← One directive per widget
    │   ├── wan-status-widget.js
    │   ├── wan-status-widget.html
    │   ├── device-info-widget.js
    │   ├── device-info-widget.html
    │   ├── qoe-widget.js
    │   ├── qoe-widget.html
    │   ├── connection-history-widget.js
    │   ├── connection-history-widget.html
    │   ├── speedtest-widget.js
    │   ├── speedtest-widget.html
    │   ├── airtime-widget.js
    │   ├── airtime-widget.html
    │   ├── events-widget.js
    │   ├── events-widget.html
    │   ├── alarms-widget.js
    │   ├── alarms-widget.html
    │   ├── throughput-widget.js
    │   ├── throughput-widget.html
    │   ├── top-flows-widget.js
    │   ├── top-flows-widget.html
    │   ├── top-hosts-widget.js
    │   ├── top-hosts-widget.html
    │   ├── wwan-failover-widget.js
    │   ├── wwan-failover-widget.html
    │   ├── bbscore-widget.js        ← Bufferbloat Score (Simple view only)
    │   ├── bbscore-widget.html
    │   └── sparkline-directive.js   ← Reusable SVG sparkline
    └── css/
        └── dashboard.css            ← Port from prototype styles.css
```

### Makefile

```makefile
include $(TOPDIR)/rules.mk
PKG_NAME:=juci-mod-dashboard
DEPENDS:=+juci +juci-network-netifd +mwan3-srg +flowstatd

include $(INCLUDE_DIR)/package.mk
include $(JUCIDIR)/juci.mk
$(eval $(call BuildPackage,juci-mod-dashboard))
```

### Access ACL

```
# WAN / Network
ubus /network.interface.wan status x
ubus /network.interface.wwan status x
ubus /juci/dashboard * x

# flowstatd (Top Flows / Top Hosts)
ubus /flowstatd flows x
ubus /flowstatd hosts x
ubus /flowstatd devices x
ubus /flowstatd status x

# mwan3 (WWAN Failover)
ubus /mwan3 status x

# UCI read
uci network * r
uci mwan3 * r
uci wireless * r
uci system * r
uci flowstatd * r
```

---

## 3. Widget Catalog & Field Mappings

Each section below covers one widget. For each:
- **Prototype card ID** and grid position
- **Every displayed field** with its MOCK key and production API source
- **Poll interval** recommendation
- **Render notes** for porting to JUCI

### Grid Layout Reference

```
Row 1: [QoE (span 2)]          [WAN Status (1)]    [Device Info (1)]
Row 2: [Conn. History (span 2)] [Speedtest (span 2)]
Row 3: [WiFi Airtime (span 2)]  [Events (1)]        [Alarms (1)]
Row 4: [WAN Throughput (span 2)][Top Flows (1)]      [Top Hosts (1)]
Row 5: [Placeholder (span 2)]   [—]                  [WWAN Failover (1)]
```

---

### 3.1 System Performance Score (QoE)

**Card ID:** `card-qoe` | **Grid:** col 1, row 1, span 2 | **Poll:** 60s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Overall score (0-100) | `qoe.qoe_score` | `subscriber_diags.json` → `qoe_score` |
| Score timestamp | `qoe.timestamp_epoch` | `subscriber_diags.json` → `timestamp_epoch` |
| Category scores (WAN, System, WiFi, LAN, Mesh) | `qoe.categories.{name}.score` | `subscriber_diags.json` → `categories.{name}.score` |
| Category weights | `qoe.categories.{name}.weight` | `subscriber_diags.json` → `categories.{name}.weight` |
| Issue factors (subject + detail) | `qoe.categories.{name}.factors[]` | `subscriber_diags.json` → `categories.{name}.factors[]` |

**Production API:** `subscriber_diags.json` is generated by the SmartOS diagnostics
framework and exposed via ubus or file read. The Lua backend should call:
```lua
local raw = juci.shell("cat /tmp/subscriber_diags.json 2>/dev/null")
```
Or use whatever ubus method exposes the subscriber diagnostics data.

**Render Notes:**
- Score color: green (>=70), amber (40-69), red (<40) via `scoreClass()`
- Category pills are clickable with hover tooltips showing per-factor detail
- Issues list shows all factors across all categories that have problems
- Card is clickable (navigates to diagnostics page)

---

### 3.2 WAN Status

**Card ID:** `card-wan` | **Grid:** col 3, row 1, span 1 | **Poll:** 5s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| State (UP/DOWN) | `wan.carrier` | `ubus call network.interface.wan status` → `up` |
| IP address | `wan.ip_addr` | `network.interface.wan` → `ipv4-address[0].address` |
| WAN type badge (DHCP/PPPoE/Static) | `wan.wan_type` | `uci get network.wan.proto` |
| Media type badge (XGSPON/GPON/etc) | `wan.media_type` | Device-specific; check `ubus call network.device status '{"name":"wan"}'` or `/sys/class/net/` |
| Gateway | `wan.default_route` | `network.interface.wan` → `route[0].nexthop` |
| DNS Primary / Secondary | `wan.dns_primary`, `wan.dns_secondary` | `network.interface.wan` → `dns-server[]` |
| MTU | `wan.mtu` | `uci get network.wan.mtu` or `network.interface.wan` → `proto` info |
| Link speed | `wan.link_speed` | `ethtool eth0` or SFP module queries |
| Uptime | `wan.uptime_secs` | `network.interface.wan` → `uptime` |
| DHCP lease remaining | `wan.lease_remaining_secs` | `network.interface.wan` → DHCP lease data |
| **Bufferbloat section:** | | |
| Download grade (A/B/C/D) | `speedtest[0].download_bufferbloat_grade` | `bbst_speedtest_get_history()` → latest entry |
| Upload grade | `speedtest[0].upload_bufferbloat_grade` | Same |
| Download speed (Mbps) | `speedtest[0].download_mbps` | Same |
| Upload speed (Mbps) | `speedtest[0].upload_mbps` | Same |
| Idle latency | `speedtest[0].idle_avg` | Same |
| Loaded latency (DL/UL) | `speedtest[0].download_avg`, `upload_avg` | Same |
| Test timestamp | `speedtest[0].epoch` | Same |
| Service rate (DL/UL) for % calc | `wan.service_rate_dl`, `wan.service_rate_ul` | CDT config or UCI `wan.service_rate` |

**Production API (Bufferbloat):** The speed test data comes from `bbst_speedtest_get_history()` —
this is a SmartOS shell function that reads the speed test results database. The Lua backend
should shell out to this or read the results file directly. Only the most recent result is
needed for this card (index 0).

**Render Notes:**
- "Run Test" button triggers a speed test (shell out to `bbst_speedtest_run` or equivalent)
- Grade colors: A=green, B=cyan, C=amber, D=red
- Summary sentence generated by `bbSummary()` based on worst grade
- WAN meta rows: lease row hidden unless `wan_type === 'DHCP'`

---

### 3.3 Device Info

**Card ID:** `card-device` | **Grid:** col 4, row 1, span 1 | **Poll:** 5s (gauges), 60s (meta)

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Device model | `device.model` | `ubus call system board` → `model` |
| MAC address | `device.mac` | `ubus call system board` → `system.mac` or `cat /sys/class/net/br-lan/address` |
| Serial number | `device.serial` | `ubus call system board` → `serial` or manufacturer-specific |
| Firmware version | `device.firmware` | `ubus call system board` → `release.version` |
| CDT / CDT version | `device.cdt`, `device.cdt_version` | CDT provisioning system (SmartOS-specific) |
| System uptime | `device.sys_uptime_secs` | `ubus call system info` → `uptime` |
| Last upgrade date | `device.last_upgrade_epoch` | SmartOS upgrade log or `fwenv` |
| **System Health Gauges:** | | |
| CPU % | `device.cpu_pct` | `/proc/stat` delta calculation or `ubus call system info` |
| CPU temperature (C) | `device.cpu_temp_c` | `/sys/class/thermal/thermal_zone0/temp` (divide by 1000) |
| Flash usage % | `device.flash_pct` | `df /overlay` or `ubus call system info` → `disk` |
| RAM usage % | `device.mem_pct` | `ubus call system info` → `memory` (total - free - buffers - cached) / total * 100 |

**Render Notes:**
- 4 Boeing-inspired needle gauges in a 2x2 grid, rendered on `<canvas>` elements
- Gauges use `drawNeedleGauge()` with configurable warning/critical thresholds ("bugs")
- CPU gauge: no warning bugs (0-100%)
- Temperature gauge: max 125, warning at 115C (amber), critical at 125C (red)
- Flash gauge: warning at 85% (amber), critical at 95% (red)
- RAM gauge: warning at 90% (amber), critical at 98% (red)
- Animation: smooth lerp at 33ms intervals with occasional excursion spikes
- CPU temp correlates with CPU load (steeper slope during excursions)

---

### 3.4 Connection History

**Card ID:** `card-history` | **Grid:** col 1, row 2, span 2 | **Poll:** 300s (slow — data changes infrequently)

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Down periods array | `downtime.down_periods[]` | `subscriber_diags.json` → `down_periods[]` |
| Grey/uncertain period | `downtime.grey_period` | `subscriber_diags.json` → `grey_period` |
| Current epoch | `downtime.current_epoch` | `subscriber_diags.json` → `current_epoch` |
| Scan duration | `downtime.scan_duration` | `subscriber_diags.json` → `scan_duration` (format: "365d:00:00") |

**Down period fields:**

| Field | Description |
|---|---|
| `from_epoch` | Start of downtime |
| `to_epoch` | End of downtime |
| `secs_down` | Duration in seconds |
| `down_event` | Event type: `'powerDown'`, `'internet/down'`, `'shutDown'` |
| `down_event_data.Reason` | Human-readable reason |
| `down_event_data.ReasonDetail` | Firmware version or upgrade detail |
| `down_event_data.OfflineEstimate` | Estimated offline duration (power events) |

**Render Notes:**
- Timeline bar with color-coded segments: green (online), red (internet lost), amber (power loss), blue (upgrade/reboot), grey (uncertain), light grey (no data)
- Time span toggle: 7d / 30d / 1yr (default 1yr)
- 7d and 30d views use wider inner container for scrollable zoom with grab-to-drag
- Hover tooltips on each segment show from/to/duration/reason
- Stats row: uptime %, longest outage, average outage, MTBF
- Monthly uptime badge grid (12 months): green 100%, cyan 99-99.99%, amber 95-99%, red <95%
- Axis labels adapt to zoom level (days for 7d, weeks for 30d, months for 1yr)
- Month boundary shading alternates behind the bar

---

### 3.5 Speed Test History

**Card ID:** `card-speedtest` | **Grid:** col 3, row 2, span 2 | **Poll:** 300s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| 30-day speedtest array | `speedtest[]` | `bbst_speedtest_get_history()` |
| Per-test: epoch | `speedtest[i].epoch` | Same |
| Per-test: download_mbps | `speedtest[i].download_mbps` | Same |
| Per-test: upload_mbps | `speedtest[i].upload_mbps` | Same |
| Per-test: bufferbloat grades | `speedtest[i].download_bufferbloat_grade`, `upload_bufferbloat_grade` | Same |
| Per-test: latency (idle/loaded) | `speedtest[i].idle_avg`, `download_avg`, `upload_avg` | Same |
| Per-test: server | `speedtest[i].server` | Same |
| Birth certificate entry | `speedtest[i].birth_certificate` | Same (first-ever test result, flagged) |
| Service rates for % mode | `wan.service_rate_dl`, `wan.service_rate_ul` | CDT or UCI |

**Render Notes:**
- Canvas-based bar chart with DL (cyan) and UL (green) bars per day
- Mode toggle: "% Util" (bars as % of service rate) vs "Mbps"/"Gbps" (raw)
- Gbps label used when max service rate > 999 Mbps
- % Util mode disabled if service rates are not configured
- Y-axis: fixed 0-100% in pct mode; dynamic ceiling in raw mode (1.3x data max)
- Hover tooltip shows date, server, DL/UL speeds, bufferbloat grades, latency
- Scrollable when many data points (grab-to-drag)
- Birth certificate entry (first test) excluded from chart

---

### 3.6 WiFi Airtime

**Card ID:** `card-airtime` | **Grid:** col 1, row 3, span 2 | **Poll:** 5s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Radio array (3 radios) | `airtime.airtime_utilization[]` | `ubus call juci.wireless airtime` or equivalent |
| Per-radio: band | `radio.band` | e.g. "2.4 GHz", "5 GHz", "6 GHz" |
| Per-radio: channel | `radio.channel` | e.g. 6, 100, 37 |
| Per-radio: tx % | `radio.tx` | Transmit airtime % |
| Per-radio: rx % | `radio.rx` | Receive airtime % |
| Per-radio: wifi_int % | `radio.wifi_int` | WiFi interference % |
| Per-radio: non_wifi_int % | `radio.non_wifi_int` | Non-WiFi interference % |
| Per-radio: available % | `radio.available` | = 100 - tx - rx - wifi_int - non_wifi_int |

**Production API:** `juci.wireless.airtime()` or the underlying hostapd/cfg80211 survey data.
This is typically available via `iw <dev> survey dump` parsed into JSON by a JUCI Lua backend.
The 5 components must sum to 100%.

**Render Notes:**
- 3 stacked horizontal bars (one per radio), each with 4 colored segments
- Colors: cyan (Tx), green (Rx), amber (WiFi interference), red (Non-WiFi interference)
- Animated fill on initial render (800ms ease) via CSS transitions
- Live updates every 5s: segments resize with CSS transition smoothing
- "% in use" label shows tx + rx combined, animated counter
- Hover tooltip on each bar shows all 5 components
- Legend: 5 color swatches (Tx, Rx, WiFi Int., Non-WiFi, Available)

---

### 3.7 Recent Events

**Card ID:** `card-events` | **Grid:** col 3, row 3, span 1 | **Poll:** 30s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Events array | `events[]` | `subscriber_diags.json` → `events[]` or SmartOS event log |
| Per-event: timestamp | `events[i].Epoch` | Event epoch |
| Per-event: description | `events[i].Topic_WhatHappened` | Event description string |
| Per-event: category | `events[i].Topic_Category` | `'wifi'`, `'wan'`, `'system'`, `'network'` |
| Per-event: priority | `events[i].Priority` | `'critical'`, `'error'`, `'warn'`, `'info'` |

**Render Notes:**
- Count badges at top: critical (red) and warning (amber) counts
- Info-priority events are filtered out of display
- Each row has a colored priority bar on the left edge
- Acknowledge button (checkmark) per event; acknowledged events hidden
- ACK state stored in a JS `Set()` (in production: persist via localStorage or backend)
- "View All" link navigates to full events page

---

### 3.8 Active Alarms

**Card ID:** `card-alarms` | **Grid:** col 4, row 3, span 1 | **Poll:** 30s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Alarms array | `alarms[]` | SmartOS alarm framework (subscriber_diags or dedicated alarm API) |
| Per-alarm: name | `alarms[i].name` | Alarm type (e.g. "WiFi Client Health") |
| Per-alarm: subject MAC | `alarms[i].subjectMAC` | MAC of affected device |
| Per-alarm: value string | `alarms[i].value_string` | Human name or MAC of affected entity |
| Per-alarm: info | `alarms[i].info` | Detailed description |
| Per-alarm: severity | `alarms[i].severity` | `'critical'`, `'error'`, `'warn'` |
| Per-alarm: status | `alarms[i].status` | `'active'`, `'cleared'` |

**Render Notes:**
- Severity count pills at top (N crit, N err, N warn)
- Each row: severity dot + value_string + dismiss button
- Dismiss button hides alarm (stored in JS `Set()` by MAC)
- Shows "No active alarms" with green checkmark when all dismissed/empty
- "View All" link navigates to full alarms page

---

### 3.9 WAN Throughput

**Card ID:** `card-wanperf` | **Grid:** col 1, row 4, span 2 | **Poll:** continuous (requestAnimationFrame)

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Live download rate (Mbps) | Generated internally | `flowstatd` → WAN interface stats, or `/sys/class/net/wan/statistics` delta |
| Live upload rate (Mbps) | Generated internally | Same |
| Throughput history (160 points) | Generated internally | Rolling buffer from polling |

**Render Notes:**
- Full-width canvas with scrolling area chart (DL cyan fill, UL green fill)
- Animation at ~60fps via `requestAnimationFrame`
- In prototype: uses a bursty traffic state machine with idle/browse/stream/burst modes
- In production: replace state machine with actual WAN interface byte counter deltas
- Live values displayed to the right: DL arrow (cyan) + UL arrow (green)
- Y-axis auto-scales with smooth interpolation (Mbps or Gbps)
- 4 data points pushed per second (THROUGHPUT_SPEED = 4)

**Production approach:** Poll `/sys/class/net/<wan_dev>/statistics/rx_bytes` and `tx_bytes`
every 250ms, calculate delta in bits/sec, push to circular buffer. Or subscribe to
`flowstatd` events if available.

---

### 3.10 Top Active Flows

**Card ID:** `card-topflows` | **Grid:** col 3, row 4, span 1 | **Poll:** 5s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Flow count badge | `flows.length` | `ubus call flowstatd status` → `flows` |
| Per-flow: destination hostname | `flows[i].destination` | `ubus call flowstatd flows` → `dst_hostname` or `dst_addr` |
| Per-flow: protocol badge | `flows[i].protocol` | `flowstatd.flows` → `protocol` (TCP/UDP) |
| Per-flow: app protocol | `flows[i].app_protocol` | `flowstatd.flows` → `app_protocol` (from classifi DPI) |
| Per-flow: RX bitrate | `flows[i].rx_bps` | `flowstatd.flows` → `rx_bps` (bits/sec) |
| Per-flow: rate sparkline | `flows[i].rateHistory` | Client-side: maintain 12-point history buffer, push rx_bps on each poll |
| Per-flow: source device | `flows[i].source` | `flowstatd.flows` → source hostname or `flowstatd.hosts` → hostname |

**Production API:**
```bash
ubus call flowstatd flows '{"limit":10,"min_rate":1000}'
```

Returns flows sorted by rate. The `destination` field requires DNS resolution (handled by
flowstatd's async resolver). The `source` field maps to the originating device hostname
via the flow's host → device chain.

**Render Notes:**
- Top 7 flows sorted by `rx_bps` descending
- Destination shown with `title` attribute (full hostname on hover)
- Protocol badge: TCP (teal), UDP (purple)
- Sparkline: 48x16 SVG, cyan theme (using `renderFlowSparkline()`)
- Rate formatted: Gbps/Mbps/Kbps/bps via `formatFlowRate()`
- "View All" link navigates to flows page

---

### 3.11 Top Bandwidth Hosts

**Card ID:** `card-tophosts` | **Grid:** col 4, row 4, span 1 | **Poll:** 5s

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Host count badge | `hostMap.length` | `ubus call flowstatd hosts` → count |
| Per-host: device name | Aggregated from `flows[].source` | `flowstatd.hosts` → `hostname` or `flowstatd.devices` → device name |
| Per-host: total RX bitrate | Aggregated `rx_bps` | `flowstatd.hosts` → `rx_bps` (already aggregated per-host) |
| Per-host: rate sparkline | `hostMap[name].rateHistory` | Client-side 12-point history buffer |
| Per-host: flow count | `hostMap[name].flowCount` | `flowstatd.hosts` → `flow_count` |

**Production API:**
```bash
ubus call flowstatd hosts '{"min_rate":1000,"limit":10,"sort_by":"rate"}'
```

**Render Notes:**
- Top 7 hosts sorted by aggregated `rx_bps`
- Green-themed: host names in green, sparklines in green
- Flow count shown as "X flows" or "1 flow"
- "View All" link navigates to devices page

**Key difference from Top Flows:** Flows are per-connection (5-tuple), Hosts aggregate
all flows from a single source device. In production, `flowstatd.hosts` already provides
pre-aggregated data, so the client-side `rebuildHostMap()` aggregation is not needed.

---

### 3.12 WWAN Failover

**Card ID:** `card-multiwan` | **Grid:** col 4, row 5, span 1 | **Poll:** 5s

This is the most complex widget with multiple data sources.

#### Interface Status

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| WAN state (online/offline) | `mwan.interfaces.wan.state` | `rpcd/mwan3` → `/var/state/mwan3/wan/STATE` |
| WWAN state | `mwan.interfaces.wwan.state` | `rpcd/mwan3` → `/var/state/mwan3/wwan/STATE` |
| WAN latency (ms) | `mwan.interfaces.wan.latency_ms` | `rpcd/mwan3` → tracking IP RTT (average across targets) |
| WWAN latency (ms) | `mwan.interfaces.wwan.latency_ms` | Same for wwan |
| WAN packet loss % | `mwan.interfaces.wan.loss_pct` | `rpcd/mwan3` → tracking IP loss (max across targets) |
| WAN uptime | `mwan.interfaces.wan.uptime_secs` | `rpcd/mwan3` → `get_age()` |
| WWAN uptime | `mwan.interfaces.wwan.uptime_secs` | Same for wwan |
| Latency sparkline | `mwan.interfaces.{name}.latencyHistory` | Client-side 12-point buffer |
| WAN access_tech badge | `mwan.interfaces.wan.access_tech` | `network.interface.wan` → `media_type` (XGSPON, GPON, etc.) |
| WWAN access_tech badge | `mwan.interfaces.wwan.access_tech` | Modem manager → RAT field (4G LTE, 5G NR, etc.) See [7.2] |
| WAN IP address | `mwan.interfaces.wan.ip_addr` | `network.interface.wan` → `ipv4-address[0].address` |
| WWAN IP address | `mwan.interfaces.wwan.ip_addr` | `network.interface.wwan` → `ipv4-address[0].address` |
| WAN carrier name | `rdnsToCarrier(wan.rdns_hostname)` | PTR lookup on WAN IP. See [7.1] |
| WWAN carrier name | `rdnsToCarrier(wwan.rdns_hostname)` | PTR lookup on WWAN IP. See [7.1] |
| WWAN modem model | `mwan.interfaces.wwan.model` | `mwan-info.sh` → `wwan.model` |
| Active policy | `mwan.active_policy` | Derive from default route or `mwan3 status` |
| Policy badge | Derived: STANDBY / LTE ACTIVE | `wan_wwan` or `wan_only` → STANDBY; `wwan_only` → LTE ACTIVE |

#### Failover Events

Source: `/FLASH/persist/mwan/mwanlte.log`

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Events array (16 events, 4 cycles) | `mwan.failover_events[]` | Parse `mwanlte.log` (see below) |
| Per-event: type | `event.event_type` | Mapped from log state transitions |
| Per-event: label | `event.probe_label` | `Primary WAN down` / `Backup WAN up` / `Primary WAN restored` / `Backup WAN standing by` |
| Per-event: timestamp | `event.epoch` | From log timestamp |
| Per-event: duration | `event.duration_secs` | Calculated: time between failover and recovery |
| Per-event: dialup time | `event.dialup_secs` | Calculated: time between failover and backup_up |

**Log parsing:** `mwan3track` writes state transitions to `/FLASH/persist/mwan/mwanlte.log`.
Study `ltewan-accounting.py` in the `mwan3-srg` feed for the reference log parser.

**Event type mapping from log transitions:**

| Log transition | `event_type` | `probe_label` |
|---|---|---|
| `wan: online -> offline` | `failover` | `Primary WAN down` |
| `wwan: offline -> online` | `backup_up` | `Backup WAN up` |
| `wan: offline -> online` | `recovery` | `Primary WAN restored` |
| `wwan: online -> offline` | `backup_standby` | `Backup WAN standing by` |

#### 30-Day Usage

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| WAN seconds | `mwan.usage_30d.wan_secs` | `ltewan-accounting.py -d 30` output → parse WAN active time |
| WWAN seconds | `mwan.usage_30d.wwan_secs` | Same → parse WWAN active time |
| Offline seconds | `mwan.usage_30d.offline_secs` | Same → parse offline time |

**Cache this call for 5 minutes.** `ltewan-accounting.py` reads and parses the full log file.

#### Render Notes
- Two side-by-side interface panels (`.mwan-iface-panel`)
- State dot: green (online), red (offline), amber pulse (connecting/dialing)
- Sparkline muted (grey) for WWAN when not the active router
- Sparkline muting driven by `active_policy`, not connection state
- Badge sizing: all badges in `.mwan-iface-row2` normalized to identical height via unified CSS
- Carrier name: bottom-left of panel, IP address: bottom-right
- ISP name from rDNS: `rdnsToCarrier()` function maps registrable domains to human names
- Events list: scrollable, newest-first, 4-event cycle icons (failover ↓ red, backup_up ↑ green, recovery ↑ cyan, standby - grey)
- 30-day usage bar: stacked (WAN amber, WWAN cyan) with legend showing days

---

### 3.13 Bufferbloat Score (Simple View)

**Card ID:** `card-bbscore` | **Grid:** Simple view only, row 2 middle | **Poll:** 300s (shares data with WAN Status card)

This card exists only in Simple view. It extracts the bufferbloat grade data that lives
inside the WAN Status card in Advanced view and presents it as a standalone, glanceable card.

| Displayed Field | MOCK Key | Production Source |
|---|---|---|
| Download bufferbloat grade | `speedtest[0].download_bufferbloat_grade` | `bbst_speedtest_get_history()` latest entry |
| Upload bufferbloat grade | `speedtest[0].upload_bufferbloat_grade` | Same |

**Render Notes:**
- Two large grade pills (Download / Upload) with letter grades A through F
- Grade color coding: A = green, B = cyan, C = amber, D/F = red
- Card uses the `.basic-only` CSS class so it is hidden in Advanced view
- Data source is identical to the bufferbloat section of the WAN Status card (section 3.2)

---

## 4. Grid Layout & Drag-Drop System

The prototype uses a 4-column CSS Grid with free-placement:

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 260px;
  gap: 12px;
}
```

Cards are positioned via `grid-column` and `grid-row` inline styles set by `applyLayout()`.
Layout is persisted in `localStorage` under `'dashboard_layout'`.

**Drag-and-drop:** Cards can be dragged to swap positions. The prototype implements:
- `getCellFromPoint(x, y)` — converts mouse position to grid cell
- `findCardAt(col, row, excludeId)` — finds card occupying a cell
- `getCellRect(col, row, span)` — gets pixel rect for a cell
- CSS wiggle animation during drag mode

**Production consideration:** JUCI may not support localStorage persistence across sessions
in the same way. Consider persisting layout in UCI config or the user's session storage.

---

## 5. Tile Picker / Custom Tiles

The "Add Tile" placeholder card opens a modal with available extra tiles:

| Tile ID | Title | Description |
|---|---|---|
| `tile-sfp` | SFP / Optical Power | Tx/Rx power (dBm), temperature, bias current, voltage |
| `tile-voip` | VoIP Line Status | SIP registration + hook state per FXS port |
| `tile-clients` | Connected Clients by Band | Client count and RSSI per radio band |
| `tile-sysres` | System Resources | CPU %, memory used/free, system uptime |
| `tile-vpn` | VPN Status | WireGuard + Tailscale tunnel state and peer count |
| `tile-poe` | PoE / PSE Port Status | Per-port power delivery, wattage, and fault state |

These are listed in `AVAILABLE_TILES` in `dashboard.js` but are not yet implemented.
They represent future widget candidates. The tile picker modal allows adding them to
the grid or restoring previously hidden tiles.

---

## 6. Simple/Advanced View Toggle

The dashboard supports two view modes, toggled via a pill switch in the top bar.

### Architecture

The view system is CSS-driven. Switching views sets `data-view="basic"` or
`data-view="advanced"` on the `<body>` element. Individual cards and card sub-elements
use two CSS classes to control visibility:

- `.tech-only` -- visible only in Advanced view (hidden when `body[data-view="basic"]`)
- `.basic-only` -- visible only in Simple view (hidden when `body[data-view="advanced"]`)

This approach avoids JS-driven DOM manipulation for show/hide. The toggle function
updates the body attribute, persists the choice to `localStorage` under
`'dashboard_view'`, and the rest is handled by CSS selectors.

### Simple View Layout

Simple view uses a dedicated CSS grid (class `.basic-grid`) with a fixed max-width
of 1100px, centered on the page:

```
Row 1: [QoE Score (full width)]
Row 2: [WAN Status]  [Bufferbloat Score]  [Device Info]
Row 3: [WiFi Airtime (full width)]
Row 4: [WAN Throughput (full width)]
Row 5: [Connection History (full width)]
```

Cards visible in Simple view: `card-qoe`, `card-wan`, `card-bbscore`, `card-device`,
`card-airtime`, `card-wanperf`, `card-history`.

Cards hidden in Simple view (`.tech-only`): `card-speedtest`, `card-events`,
`card-alarms`, `card-topflows`, `card-tophosts`, `card-multiwan`.

### Per-Card Simplifications

In Simple view, several cards hide technical detail rows to reduce information density:

| Card | Hidden Elements |
|---|---|
| QoE | Issues list, "/100" label, score date |
| QoE (added) | "Last Speed Test" section with DL/UL bar graphs as % of service rate |
| WAN Status | WAN Type, Gateway, DNS, MTU, Lease rows; full bufferbloat breakdown, Run Test button, History link |
| Device Info | Serial, MAC, CDT, Upgraded rows; System Health gauge cluster |
| WiFi Airtime | Tx/Rx/WiFi Int/Non-WiFi legend row |
| Connection History | 7d/30d toggle (locked to 1yr); monthly uptime stats row |

### Simple View Responsive Breakpoints

| Breakpoint | Columns | Notes |
|---|---|---|
| 1280px+ | 3 columns | QoE full-width row 1; WAN/BB/Device in row 2; rest full-span |
| 768-1279px | 2 columns | QoE and WAN full-width; BB and Device side-by-side; rest full-span |
| Below 768px | 1 column | All cards stacked with explicit `order` for card sequencing |

All cards use `height: auto` in Simple view (the 260px fixed row height from
Advanced view does not apply).

### Interaction Differences

- **No edit mode** -- Long-press does not trigger wiggle/drag in Simple view
- **No drag-and-drop** -- Card positions are fixed by the CSS grid
- **No tile picker** -- The "Add Tile" placeholder is hidden
- **Restore Default Layout** button is Advanced-view only (appears in edit mode,
  fixed at top of viewport; resets layout to `LAYOUT_4COL`, clears hidden tiles,
  reloads the page)

### Last Speed Test (QoE Card, Simple View)

The QoE card gains a "Last Speed Test" section visible only in Simple view. It displays:
- Download and upload speeds from the most recent speed test
- Horizontal bar graphs where bar length = percentage of ISP service rate (plan limit)
- A "SERVICE RATE" label column with the plan limit value
- A dotted end-cap on each bar marking the 100% service rate boundary

### Speed Test History: Service Rate Reference Lines

In both views, the Speed Test History chart now renders dotted horizontal reference
lines at the configured DL and UL service rates:
- Cyan dotted line at 8000 Mbps (DL service rate), labeled "8G DL" on the left axis
- Green dotted line at 4000 Mbps (UL service rate), labeled "4G UL" on the left axis
- Mock upload values are capped at approximately 4000 Mbps to reflect the asymmetric plan

### WiFi Airtime: Dynamic Client Counts

The WiFi Airtime card now shows a per-band client count that drifts over time in
mock data. On each 5-second animation tick there is a 15% chance per radio of the
client count incrementing or decrementing by 1. The DOM is updated in the same
animation callback that updates the airtime bars.

### localStorage Keys

| Key | Values | Default |
|---|---|---|
| `dashboard_view` | `"basic"`, `"advanced"` | `"basic"` |
| `dashboard_layout` | JSON layout object (Advanced view only) | `LAYOUT_4COL` |

### JUCI Integration Notes

In production JUCI, the view toggle should be ported as:
- A directive or controller method that sets `data-view` on `<body>`
- Persist preference via `localStorage` (same as prototype) or UCI user config
- The `.tech-only` / `.basic-only` CSS classes port directly into the JUCI stylesheet
- The `card-bbscore` widget needs its own JUCI directive but shares the speed test
  data source with the WAN Status widget (section 3.2)
- The "Last Speed Test" section in the QoE card requires the same speed test and
  service rate data used by section 3.5

---

## 7. Open Engineering Questions

### 7.1 Carrier / ISP Name Display

The prototype shows a human-readable ISP name on each WWAN Failover interface panel.
Three candidate sources:

**Option A: Reverse DNS (rDNS)**
Run `resolveip -4 <ip_addr>` on the device, map the registrable domain to a carrier name
using the `rdnsToCarrier()` lookup table in `dashboard.js`. Table includes ~40 US ISPs.

- Works without provisioning
- Unreliable: CGNAT addresses (100.64.0.0/10, common on LTE) often have no PTR record
- Lookup table needs ongoing maintenance
- Must cache per-IP; invalidate on IP change

**Option B: CDT (Configuration/Deployment Template)**
CDT values provisioned onto the device often encode carrier identity. Check whether the
CDT data model includes a human-readable ISP name field.

**Option C: Modem Manager (WWAN only)**
`inseego-manager.sh` and `alcatel-manager.sh` in the mwan3-srg feed query the modem via
JSON RPC / AT commands. They may expose a `carrier_name` or `operator_name` field from
the SIM/network registration.

**Recommendation:** CDT for WAN (if a carrier field exists), modem manager for WWAN,
fall back to rDNS. Never display raw rDNS hostnames. Show nothing if no source resolves.

### 7.2 WWAN Access Technology Badge (4G LTE / 5G NR)

`mwan3track` and `mwan-info.sh` do not expose the radio access technology. This must come
from the modem manager layer. Check `inseego-manager.sh` / `alcatel-manager.sh` for an
`access_technology` or `rat` field in the modem's JSON RPC response.

Expected values: `"4G LTE"`, `"5G NR"`, `"3G"`, `"2G"`. Map to CSS classes:
`media-4glte`, `media-5gnr`, `media-3g`, `media-2g`.

### 7.3 Latency / Loss Aggregation

`mwan3track` tracks multiple IPs per interface (default: 2). The `rpcd/mwan3` script
reports per-target latency and loss. The widget displays a single value per interface.

**Recommendation:** Average latency across all targets; max loss across targets (conservative).

### 7.4 subscriber_diags.json Location & Format

Multiple widgets (QoE, Connection History, Events, Alarms) depend on `subscriber_diags.json`.
Verify:
- Where this file lives on the device (likely `/tmp/subscriber_diags.json`)
- What ubus method (if any) exposes it
- Whether it's generated on-demand or periodically
- The exact JSON schema (the prototype was built from a real sample)

### 7.5 Speed Test API

The prototype assumes `bbst_speedtest_get_history()` returns an array of test results.
Verify:
- The actual shell function name and location
- Whether results are stored in a file or database
- How to trigger a new test from the UI
- Whether the `birth_certificate` flag exists in real data

### 7.6 Throughput Data Source

The WAN Throughput card needs sub-second byte counter polling. Options:
1. Poll `/sys/class/net/<dev>/statistics/{rx,tx}_bytes` every 250ms from JS
2. Use `flowstatd` aggregate stats (but flowstatd's resolution is 60s)
3. Use Netdata's streaming API if available (the "Charts" button already links to Netdata)

Option 1 is simplest. Option 3 is most elegant if Netdata is deployed.

### 7.7 WiFi Airtime Data Source

Verify the exact JUCI API for airtime data. The prototype assumes a
`juci.wireless.airtime()` call returning `airtime_utilization[]` with 5 components per radio
summing to 100%. The underlying data comes from `iw <dev> survey dump`.

### 7.8 flowstatd Availability

Top Flows and Top Hosts depend on `flowstatd`. Verify:
- `flowstatd` is included in the SmartOS build
- `classifi` (DPI) is running for `app_protocol` classification
- `ubus call flowstatd flows` and `ubus call flowstatd hosts` return expected fields
- DNS resolution is enabled for human-readable destination hostnames

If `flowstatd` is not available on a given device, these two cards should gracefully hide
or show a "Not available" state.

---

## 8. CSS & Theming Notes

All CSS is in `styles.css`. The design uses CSS custom properties for theming:

```css
:root[data-theme="dark"] {
  --bg-body: #0e1117;
  --bg-card: #161b22;
  --accent-cyan: #22d3ee;
  --accent-green: #10b981;
  --accent-amber: #f59e0b;
  --accent-red: #ef4444;
  /* ... */
}
```

Light theme is defined with `[data-theme="light"]`. The toggle switches `data-theme`
on `<html>`.

**JUCI theme integration:** Copy the CSS variables and class names into the JUCI plugin's
CSS file. Override JUCI's default theme variables where they conflict.

**Key CSS section headers in `styles.css`:**
- CSS Variables (design system)
- Sidebar + Top Bar
- Card Base + Dashboard Grid (4-column, 260px rows, 12px gap)
- Per-widget sections (WAN, Device, Alarms, Events, Timeline, Airtime, Speedtest, Flows, QoE, MWAN)
- Tile Drag & Drop + Tooltip + Modal

---

## 9. Testing Checklist

### Per-Widget Verification

- [ ] **QoE:** Score renders with correct color class; category pills show tooltips; issues list populated
- [ ] **WAN Status:** IP, gateway, DNS populated from netifd; bufferbloat grades from speedtest history
- [ ] **Device Info:** Model/serial from `system board`; 4 gauges animate smoothly
- [ ] **Connection History:** Timeline segments match `subscriber_diags.json` down periods; zoom 7d/30d/1yr works
- [ ] **Speed Test History:** 30-day chart renders; Mbps/% toggle works; tooltip on hover
- [ ] **WiFi Airtime:** 3 radios render; bars animate; live updates every 5s
- [ ] **Events:** Events list populates; ACK button works; count badges correct
- [ ] **Alarms:** Alarms list populates; dismiss button works; severity pills correct
- [ ] **WAN Throughput:** Canvas chart scrolls; live DL/UL values update
- [ ] **Top Flows:** Flows sorted by rate; sparklines render; app protocol from classifi
- [ ] **Top Hosts:** Hosts aggregated correctly; flow count shown; green theme
- [ ] **WWAN Failover:** Both interface panels render; events list populated; usage bar proportional

- [ ] **Bufferbloat Score:** Grade pills render with correct colors; card hidden in Advanced view
- [ ] **Simple/Advanced Toggle:** Pill switch toggles `data-view` on body; preference persists across reload
- [ ] **Simple View Layout:** 3-col grid at desktop, 2-col at tablet, 1-col at mobile; cards auto-height
- [ ] **Simple View QoE:** Issues list and "/100" hidden; "Last Speed Test" bars render with service rate caps
- [ ] **Simple View WAN:** Technical rows (Gateway, DNS, MTU) hidden; bufferbloat breakdown hidden
- [ ] **Simple View Device:** Serial/MAC/CDT hidden; gauge cluster hidden
- [ ] **Simple View WiFi Airtime:** Legend row hidden; client counts update on tick
- [ ] **Simple View Connection History:** Locked to 1yr; monthly stats hidden
- [ ] **Speed Test Service Rate Lines:** Cyan DL and green UL dotted lines render at correct Y positions
- [ ] **Restore Default Layout:** Button appears in edit mode; resets layout and reloads
- [ ] **WiFi Airtime Client Drift:** Client count changes over time in mock data

### System-Level

- [ ] `ubus call network.interface.wan status` returns expected JSON
- [ ] `ubus call mwan3 status` returns expected JSON — verify exact field names
- [ ] `ubus call flowstatd flows` returns flows with classification data
- [ ] `/FLASH/persist/mwan/mwanlte.log` exists and is parseable
- [ ] `ltewan-accounting.py -d 30` runs without error
- [ ] `subscriber_diags.json` is accessible and contains QoE + downtime data
- [ ] Speed test history API returns array of results
- [ ] Airtime API returns per-radio utilization data
- [ ] `resolveip -4 <wan_ip>` returns PTR record for carrier name feature
- [ ] WWAN modem model string populated from `mwan-info.sh`

### Failover Simulation

- [ ] Disconnect WAN cable → widget transitions to LTE ACTIVE, WAN shows OFFLINE
- [ ] Reconnect WAN → widget returns to STANDBY, events log shows full 4-event cycle
- [ ] WWAN DIALING state: on fresh LTE connection, amber pulsing dot appears
- [ ] Latency sparkline mutes for WWAN when in standby (not active router)
