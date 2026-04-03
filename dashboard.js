/* =============================================================================
   SmartOS Dashboard Prototype — Mock Data & Rendering
   ============================================================================= */

'use strict';

/* ===== Mock Data ===== */
const MOCK = {

  wan: {
    interface: 'WAN0',
    carrier: 'true',
    ip_addr: '198.51.100.43',
    default_route: '198.51.100.1',
    wan_type: 'PPPoE',
    media_type: 'XGSPON',
    mtu: 1492,
    uptime_secs: 573420,
    dns_primary: '8.8.8.8',
    dns_secondary: '8.8.4.4',
    lease_remaining_secs: 7980,
    service_rate_dl: 8000,   // Mbps — plan/contracted rate; 0 = unconfigured
    service_rate_ul: 4000,
    ipv6_prefix: '2001:db8:abcd::/56',
    link_speed: '10 Gbps',
    pppoe_session_id: 0x1A3F,
    sfp_tx_power_dbm: 2.1,
    sfp_rx_power_dbm: -8.4,
    sfp_temp_c: 47.2,
    rx_errors: 12,
    tx_errors: 0,
    rx_drops: 847
  },

  device: {
    model: 'SDG-8734v',
    mac: 'A4:6B:B6:94:C0:12',
    serial: 'SDG8733V-0000123456',
    firmware: '26.3.2.101',
    cdt: 'Adtran',
    cdt_version: 'v1.8.5',
    sys_uptime_secs: 1209600,  // 14 days
    cpu_pct: 23,
    cpu_temp_c: 58,
    flash_pct: 34,
    mem_pct: 61,
    last_upgrade_epoch: 1773219215,  // Mar 11 2026
    connected_clients: 14
  },

  alarms: [
    {
      name: 'WiFi Client Health',
      subjectMAC: 'B4:F1:DA:CF:24:A1',
      status: 'active',
      last_status_change: 1773783606,
      value_string: 'Adams-iPhone-13',
      info: 'Low SNR, high retransmission rate (score 72)',
      severity: 'critical',
      silenced: false
    },
    {
      name: 'WAN Link Flap',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773780000,
      value_string: 'eth0.wan',
      info: 'WAN interface flapped 4 times in the last 30 minutes',
      severity: 'critical',
      silenced: false
    },
    {
      name: 'High CPU Load',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773776400,
      value_string: 'router-cpu',
      info: 'CPU sustained above 85% for over 10 minutes',
      severity: 'error',
      silenced: false
    },
    {
      name: 'WiFi Client Health',
      subjectMAC: '5C:49:79:13:05:B2',
      status: 'active',
      last_status_change: 1773783606,
      value_string: 'SonosZP',
      info: 'High retransmission rate, low PHY rate (score 73)',
      severity: 'warn',
      silenced: false
    },
    {
      name: 'DHCP Pool Exhausted',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773770000,
      value_string: '192.168.1.0/24',
      info: 'LAN DHCP pool 95% allocated, 6 of 125 addresses remaining',
      severity: 'warn',
      silenced: false
    },
    {
      name: 'WiFi Client Health',
      subjectMAC: 'F8:25:51:48:12:01',
      status: 'active',
      last_status_change: 1773700000,
      value_string: 'F8:25:51:48:12:01',
      info: 'Low SNR, high retransmission rate, low PHY rate (score 81)',
      severity: 'warn',
      silenced: false
    },
    {
      name: 'IPv6 Prefix Delegation Failure',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773760000,
      value_string: 'WAN-DHCPv6',
      info: 'DHCPv6 prefix delegation request timed out after 3 attempts',
      severity: 'error',
      silenced: false
    },
    {
      name: 'DNS Resolution Failure',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773755000,
      value_string: '8.8.8.8',
      info: 'Primary DNS unreachable for 45 seconds, fell back to secondary',
      severity: 'warn',
      silenced: false
    },
    {
      name: 'Memory Pressure',
      subjectMAC: '00:1A:2B:3C:4D:5E',
      status: 'active',
      last_status_change: 1773750000,
      value_string: 'router-mem',
      info: 'Available memory below 15% threshold (48 MB free of 512 MB)',
      severity: 'error',
      silenced: false
    },
    {
      name: 'Band Steering Disabled',
      subjectMAC: 'AC:84:C6:AB:22:F0',
      status: 'active',
      last_status_change: 1773745000,
      value_string: 'radio0',
      info: 'Band steering inactive on 2.4 GHz — client refused move 5 times',
      severity: 'warn',
      silenced: false
    }
  ],

  events: [
    { Epoch: 1773783904, Topic_WhatHappened: 'WiFi client health degraded', Topic_Category: 'wifi', Priority: 'critical' },
    { Epoch: 1773783000, Topic_WhatHappened: 'WAN link flap detected', Topic_Category: 'wan', Priority: 'critical' },
    { Epoch: 1773780500, Topic_WhatHappened: 'High CPU load threshold exceeded', Topic_Category: 'system', Priority: 'error' },
    { Epoch: 1773776400, Topic_WhatHappened: 'DHCP pool nearing exhaustion', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1773770000, Topic_WhatHappened: 'IPv6 prefix delegation failed', Topic_Category: 'wan', Priority: 'error' },
    { Epoch: 1773765000, Topic_WhatHappened: 'DNS fallback to secondary server', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1773762960, Topic_WhatHappened: 'System upgrade completed', Topic_Category: 'system', Priority: 'info' },
    { Epoch: 1773758000, Topic_WhatHappened: 'Memory pressure alarm raised', Topic_Category: 'system', Priority: 'error' },
    { Epoch: 1773750000, Topic_WhatHappened: 'Band steering disabled on radio0', Topic_Category: 'wifi', Priority: 'warn' },
    { Epoch: 1773701552, Topic_WhatHappened: 'System going down for upgrade', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1773349224, Topic_WhatHappened: 'Internet connectivity restored', Topic_Category: 'wan', Priority: 'warn' },
    { Epoch: 1773349130, Topic_WhatHappened: 'Internet connectivity lost', Topic_Category: 'wan', Priority: 'critical' },
    { Epoch: 1773216165, Topic_WhatHappened: 'Internet connectivity restored', Topic_Category: 'wan', Priority: 'warn' },
    { Epoch: 1773216062, Topic_WhatHappened: 'Internet connectivity lost', Topic_Category: 'wan', Priority: 'critical' },
    { Epoch: 1772994541, Topic_WhatHappened: 'Power restored after outage', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1772981466, Topic_WhatHappened: 'Power restored after outage', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1772981166, Topic_WhatHappened: 'Power failure detected', Topic_Category: 'system', Priority: 'critical' },
    { Epoch: 1772934063, Topic_WhatHappened: 'Power restored after extended outage', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1772887623, Topic_WhatHappened: 'Power failure detected', Topic_Category: 'system', Priority: 'critical' },
    { Epoch: 1772707529, Topic_WhatHappened: 'Firmware update applied v3.14.2', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1772639843, Topic_WhatHappened: 'Firmware update applied v3.14.1', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1772014358, Topic_WhatHappened: 'System going down for upgrade', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1771500000, Topic_WhatHappened: 'Client roaming failure on 5GHz', Topic_Category: 'wifi', Priority: 'error' },
    { Epoch: 1771200000, Topic_WhatHappened: 'Thermal warning: CPU temp 85C', Topic_Category: 'system', Priority: 'critical' },
    { Epoch: 1770760332, Topic_WhatHappened: 'Firmware update applied v3.13.8', Topic_Category: 'system', Priority: 'warn' },
    { Epoch: 1770500000, Topic_WhatHappened: 'DFS radar detected on ch 52', Topic_Category: 'wifi', Priority: 'error' },
    { Epoch: 1770200000, Topic_WhatHappened: 'WAN MTU mismatch detected', Topic_Category: 'wan', Priority: 'warn' },
    { Epoch: 1769900000, Topic_WhatHappened: 'DHCP lease pool expanded', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1769289060, Topic_WhatHappened: 'Power failure detected', Topic_Category: 'system', Priority: 'critical' },
    { Epoch: 1769230000, Topic_WhatHappened: 'WiFi channel changed to ch 36 due to DFS radar event', Topic_Category: 'wifi', Priority: 'warn' },
    { Epoch: 1769160000, Topic_WhatHappened: 'New client associated on 5GHz radio1', Topic_Category: 'wifi', Priority: 'warn' },
    { Epoch: 1768890000, Topic_WhatHappened: 'PPPoE session renegotiated after timeout', Topic_Category: 'wan', Priority: 'error' },
    { Epoch: 1768820000, Topic_WhatHappened: 'NTP sync failed: all upstream servers unreachable', Topic_Category: 'system', Priority: 'error' },
    { Epoch: 1768750000, Topic_WhatHappened: 'Mesh backhaul link quality degraded below 40%', Topic_Category: 'wifi', Priority: 'critical' },
    { Epoch: 1768680000, Topic_WhatHappened: 'Guest network usage threshold reached (90% quota)', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1768600000, Topic_WhatHappened: 'UPnP port mapping created: TCP/27015 for 192.168.1.47', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1768530000, Topic_WhatHappened: 'Parental controls schedule activated for profile Kids', Topic_Category: 'network', Priority: 'warn' },
    { Epoch: 1767980000, Topic_WhatHappened: 'WPS session timeout after 120s with no client response', Topic_Category: 'wifi', Priority: 'error' },
    { Epoch: 1767400000, Topic_WhatHappened: 'TR-069 inform sent to ACS: connection request acknowledged', Topic_Category: 'system', Priority: 'warn' }
  ],

  // Verbatim from subscriber_diags.json + historical entries for 6mo coverage
  downtime: {
    schema_version: '1.0.0',
    current_epoch: 1773783906,
    current_time: 'Tue Mar 17 21:45:06 WET 2026',
    scan_duration: '365d:00:00',
    down_periods: [
      // Mar–Aug 2025
      { from_epoch: 1742436600, to_epoch: 1742437500, secs_down: 900,  down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '15 minutes' } },
      { from_epoch: 1744126200, to_epoch: 1744126265, secs_down: 65,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.1.980 applied' } },
      { from_epoch: 1746136500, to_epoch: 1746143700, secs_down: 7200, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '2 hours' } },
      { from_epoch: 1747468920, to_epoch: 1747468990, secs_down: 70,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.2.1012 applied' } },
      { from_epoch: 1749624240, to_epoch: 1749625920, secs_down: 1680, down_event: 'internet/down', down_event_data: { Reason: 'Internet Connectivity Lost' } },
      { from_epoch: 1751896500, to_epoch: 1751896562, secs_down: 62,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.2.1100 applied' } },
      { from_epoch: 1753383000, to_epoch: 1753384800, secs_down: 1800, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '30 minutes' } },
      { from_epoch: 1755358800, to_epoch: 1755358868, secs_down: 68,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.3.1180 applied' } },
      { from_epoch: 1756393500, to_epoch: 1756396200, secs_down: 2700, down_event: 'internet/down', down_event_data: { Reason: 'Internet Connectivity Lost' } },
      // Sep 2025 – Feb 2026
      { from_epoch: 1758838920, to_epoch: 1758840720, secs_down: 1800, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '30 minutes' } },
      { from_epoch: 1759300000, to_epoch: 1759310800, secs_down: 10800,down_event: 'internet/down', down_event_data: { Reason: 'ISP backbone maintenance' } },
      { from_epoch: 1759960866, to_epoch: 1759960932, secs_down: 66,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.3.1210 applied' } },
      { from_epoch: 1760996640, to_epoch: 1761003840, secs_down: 7200, down_event: 'internet/down', down_event_data: { Reason: 'ISP DHCP server unreachable' } },
      { from_epoch: 1761500000, to_epoch: 1761507200, secs_down: 7200, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '2 hours' } },
      { from_epoch: 1762207506, to_epoch: 1762218306, secs_down: 10800,down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '3 hours' } },
      { from_epoch: 1762900000, to_epoch: 1762914400, secs_down: 14400,down_event: 'internet/down', down_event_data: { Reason: 'ISP fiber cut, area-wide outage' } },
      { from_epoch: 1763501400, to_epoch: 1763501475, secs_down: 75,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.4.1200 applied' } },
      { from_epoch: 1764200000, to_epoch: 1764210800, secs_down: 10800,down_event: 'internet/down', down_event_data: { Reason: 'PPPoE session rejected by BRAS' } },
      { from_epoch: 1764969306, to_epoch: 1764972006, secs_down: 2700, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '45 minutes' } },
      { from_epoch: 1766440640, to_epoch: 1766440708, secs_down: 68,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.4.1220 applied' } },
      { from_epoch: 1766800000, to_epoch: 1766818000, secs_down: 18000,down_event: 'internet/down', down_event_data: { Reason: 'OLT deregistered ONT, ISP provisioning error' } },
      { from_epoch: 1767907080, to_epoch: 1767914280, secs_down: 7200, down_event: 'internet/down', down_event_data: { Reason: 'DNS resolution failed, upstream unreachable' } },
      { from_epoch: 1769289060, to_epoch: 1769290260, secs_down: 1200, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '20 minutes' } },
      { from_epoch: 1769800000, to_epoch: 1769807200, secs_down: 7200, down_event: 'internet/down', down_event_data: { Reason: 'ISP peering issue, packet loss >90%' } },
      { from_epoch: 1770760260, to_epoch: 1770760332, secs_down: 72,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 5.3.4.1230 applied' } },
      // Recent: Feb 25 – Mar 17 2026
      { from_epoch: 1772014358, to_epoch: 1772014430, secs_down: 72,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware 26.3.2.101 applied' } },
      { from_epoch: 1772639787, to_epoch: 1772639843, secs_down: 56,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'CDT config v1.8.5 applied' } },
      { from_epoch: 1772707474, to_epoch: 1772707529, secs_down: 55,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'CDT config v1.8.5 reapplied' } },
      { from_epoch: 1772887623, to_epoch: 1772902023, secs_down: 14400,down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '4 hours' } },
      { from_epoch: 1772981166, to_epoch: 1772981466, secs_down: 300,  down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '5 minutes' } },
      { from_epoch: 1772993941, to_epoch: 1772994541, secs_down: 600,  down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '10 minutes' } },
      { from_epoch: 1773216062, to_epoch: 1773216165, secs_down: 103,  down_event: 'internet/down', down_event_data: { Reason: 'Internet Connectivity Lost' } },
      { from_epoch: 1773219159, to_epoch: 1773219215, secs_down: 56,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Firmware hotfix applied' } },
      { from_epoch: 1773304684, to_epoch: 1773307864, secs_down: 3180, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '53 minutes' } },
      { from_epoch: 1773349130, to_epoch: 1773349224, secs_down: 94,   down_event: 'internet/down', down_event_data: { Reason: 'Internet Connectivity Lost' } },
      { from_epoch: 1773464586, to_epoch: 1773466686, secs_down: 2100, down_event: 'powerDown',     down_event_data: { Reason: 'Power Lost', OfflineEstimate: '35 minutes' } },
      { from_epoch: 1773701496, to_epoch: 1773701552, secs_down: 56,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'CDT config v1.8.6 applied' } },
      { from_epoch: 1773762884, to_epoch: 1773762960, secs_down: 76,   down_event: 'shutDown',      down_event_data: { Reason: 'Upgrade', ReasonDetail: 'Certificate renewal reboot' } }
    ],
    grey_period: {
      from: 'Sun Feb 15 21:45:06 WET 2026',
      from_epoch: 1771191906,
      to: 'Tue Feb 17 23:46:02 WET 2026',
      to_epoch: 1771371962,
      grey_secs: 180056
    }
  },

  // Verbatim from subscriber_diags.json
  qoe: {
    timestamp_epoch: 1773783904,
    timestamp_iso: '2026-03-17T21:45:04Z',
    qoe_score: 94.2,
    categories: {
      wan:    { score: 100.0, weight: 25, factors: [] },
      system: { score: 96.2,  weight: 15, factors: [
        { type: 'cpu_load', subject: 'System', detail: 'Load average 1.23' }
      ]},
      wifi:   { score: 79.0,  weight: 25, factors: [
        { type: 'wifi_client_health', subject: 'Adams-iPhone-13',      detail: 'WiFi 5G on SDG-8733v-94C0: low SNR, high retransmission rate (score 72)' },
        { type: 'wifi_client_health', subject: 'SonosZP',              detail: 'WiFi 5G on SDG-8733A-B4A0-Livingroom: high retransmission rate, low PHY rate (score 73)' },
        { type: 'wifi_client_health', subject: 'F8:25:51:48:12:01',   detail: 'WiFi 2G on SDG-8733v-94C0: low SNR, high retransmission rate (score 81)' },
        { type: 'wifi_client_health', subject: '38:F8:F6:75:94:C8',   detail: 'WiFi 6G on SDG-8632-2A30-Kitchen: high retransmission rate (score 81)' }
      ]},
      lan:  { score: 100.0, weight: 10, factors: [] },
      mesh: { score: 100.0, weight: 25, factors: [] }
    }
  },

  // Fabricated — matches bbst_speedtest_get_history() format; 30 daily entries + BC
  speedtest: [
    { epoch: 1773783900, server: 'speedtest.adtran.net', download_mbps: 7970, upload_mbps: 3860, idle_avg: 12.1, download_avg: 18.3, upload_avg: 22.4, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1773697500, server: 'speedtest.adtran.net', download_mbps: 6840, upload_mbps: 3210, idle_avg: 11.8, download_avg: 17.9, upload_avg: 21.1, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1773611100, server: 'speedtest.adtran.net', download_mbps: 7350, upload_mbps: 3890, idle_avg: 13.2, download_avg: 19.4, upload_avg: 23.8, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1773524700, server: 'speedtest.adtran.net', download_mbps: 5920, upload_mbps: 2760, idle_avg: 11.2, download_avg: 16.8, upload_avg: 20.3, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1773438300, server: 'speedtest.adtran.net', download_mbps: 4180, upload_mbps: 1840, idle_avg: 14.6, download_avg: 21.2, upload_avg: 26.1, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'C' },
    { epoch: 1773351900, server: 'speedtest.adtran.net', download_mbps: 7540, upload_mbps: 3820, idle_avg: 12.5, download_avg: 18.7, upload_avg: 22.9, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1773265500, server: 'speedtest.adtran.net', download_mbps: 6380, upload_mbps: 2970, idle_avg: 15.8, download_avg: 23.6, upload_avg: 28.4, upload_bufferbloat_grade: 'C', download_bufferbloat_grade: 'C' },
    { epoch: 1773179100, server: 'speedtest.adtran.net', download_mbps: 7790, upload_mbps: 3940, idle_avg: 12.0, download_avg: 17.2, upload_avg: 21.6, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1773092700, server: 'speedtest.adtran.net', download_mbps: 6910, upload_mbps: 3340, idle_avg: 13.9, download_avg: 20.1, upload_avg: 24.7, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1773006300, server: 'speedtest.adtran.net', download_mbps: 5480, upload_mbps: 2540, idle_avg: 15.1, download_avg: 22.3, upload_avg: 27.2, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'C' },
    { epoch: 1772919900, server: 'speedtest.adtran.net', download_mbps: 7210, upload_mbps: 3690, idle_avg: 12.3, download_avg: 18.5, upload_avg: 22.6, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1772833500, server: 'speedtest.adtran.net', download_mbps: 7850, upload_mbps: 3980, idle_avg: 11.5, download_avg: 17.1, upload_avg: 20.8, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1772747100, server: 'speedtest.adtran.net', download_mbps: 4120, upload_mbps: 1780, idle_avg: 16.4, download_avg: 24.8, upload_avg: 30.1, upload_bufferbloat_grade: 'D', download_bufferbloat_grade: 'C' },
    { epoch: 1772660700, server: 'speedtest.adtran.net', download_mbps: 6820, upload_mbps: 3420, idle_avg: 13.6, download_avg: 19.8, upload_avg: 24.1, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1772574300, server: 'speedtest.adtran.net', download_mbps: 7580, upload_mbps: 3950, idle_avg: 12.4, download_avg: 18.2, upload_avg: 22.3, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1772487900, server: 'speedtest.adtran.net', download_mbps: 7210, upload_mbps: 3760, idle_avg: 12.9, download_avg: 19.0, upload_avg: 23.4, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1772401500, server: 'speedtest.adtran.net', download_mbps: 7490, upload_mbps: 3820, idle_avg: 11.7, download_avg: 17.4, upload_avg: 21.3, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1772315100, server: 'speedtest.adtran.net', download_mbps: 5340, upload_mbps: 2540, idle_avg: 15.3, download_avg: 22.8, upload_avg: 27.9, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'C' },
    { epoch: 1772228700, server: 'speedtest.adtran.net', download_mbps: 7310, upload_mbps: 3750, idle_avg: 12.6, download_avg: 18.6, upload_avg: 22.8, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1772142300, server: 'speedtest.adtran.net', download_mbps: 6930, upload_mbps: 3340, idle_avg: 14.2, download_avg: 20.8, upload_avg: 25.3, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1772055900, server: 'speedtest.adtran.net', download_mbps: 7610, upload_mbps: 3920, idle_avg: 11.6, download_avg: 17.3, upload_avg: 21.2, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1771969500, server: 'speedtest.adtran.net', download_mbps: 6880, upload_mbps: 3380, idle_avg: 13.5, download_avg: 19.7, upload_avg: 24.0, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1771883100, server: 'speedtest.adtran.net', download_mbps: 7350, upload_mbps: 3810, idle_avg: 12.7, download_avg: 18.9, upload_avg: 23.1, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1771796700, server: 'speedtest.adtran.net', download_mbps: 6590, upload_mbps: 3160, idle_avg: 14.8, download_avg: 21.6, upload_avg: 26.4, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'C' },
    { epoch: 1771710300, server: 'speedtest.adtran.net', download_mbps: 7660, upload_mbps: 3970, idle_avg: 11.4, download_avg: 16.9, upload_avg: 20.6, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1771623900, server: 'speedtest.adtran.net', download_mbps: 7210, upload_mbps: 3720, idle_avg: 13.1, download_avg: 19.3, upload_avg: 23.6, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1771537500, server: 'speedtest.adtran.net', download_mbps: 7530, upload_mbps: 3870, idle_avg: 12.2, download_avg: 17.8, upload_avg: 21.8, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'A' },
    { epoch: 1771451100, server: 'speedtest.adtran.net', download_mbps: 6940, upload_mbps: 3430, idle_avg: 14.0, download_avg: 20.4, upload_avg: 25.0, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'B' },
    { epoch: 1771364700, server: 'speedtest.adtran.net', download_mbps: 6420, upload_mbps: 3090, idle_avg: 14.9, download_avg: 22.1, upload_avg: 27.0, upload_bufferbloat_grade: 'C', download_bufferbloat_grade: 'C' },
    { epoch: 1771278300, server: 'speedtest.adtran.net', download_mbps: 7190, upload_mbps: 3640, idle_avg: 13.0, download_avg: 19.1, upload_avg: 23.3, upload_bufferbloat_grade: 'A', download_bufferbloat_grade: 'B' },
    { epoch: 1758838920, server: 'speedtest.adtran.net', download_mbps: 3805, upload_mbps: 1820, idle_avg: 14.2, download_avg: 19.8, upload_avg: 24.5, upload_bufferbloat_grade: 'B', download_bufferbloat_grade: 'C', birth_certificate: true }
  ],

  // Fabricated — matches juci.wireless.airtime() format; tx+rx+wifi_int+non_wifi_int+available=100
  airtime: {
    airtime_utilization: [
      { radio_name: 'wlan0', band: '2.4 GHz', channel: 6,   tx: 16, rx: 9,  wifi_int: 11, non_wifi_int: 8,  available: 56, clients: 3 },
      { radio_name: 'wlan1', band: '5 GHz',   channel: 100, tx: 13, rx: 7,  wifi_int: 6,  non_wifi_int: 2,  available: 72, clients: 5 },
      { radio_name: 'wlan2', band: '6 GHz',   channel: 37,  tx: 6,  rx: 4,  wifi_int: 3,  non_wifi_int: 2,  available: 85, clients: 2 }
    ]
  },

  connected_devices: 21,

  flows: [
    { id: 1,  destination: 'yt-video-edge.googlevideo.com',          protocol: 'UDP', app_protocol: 'YouTube',     rx_bps: 45200000, source: 'Living Room TV' },
    { id: 2,  destination: 'sea30s13-in-f14.1e100.net',              protocol: 'UDP', app_protocol: 'Google Meet', rx_bps: 3800000,  source: 'DL-MacBook.lan' },
    { id: 3,  destination: 'cdn-185-23.nflxvideo.net',               protocol: 'TCP', app_protocol: 'Netflix',     rx_bps: 22500000, source: 'Bedroom-FireTV' },
    { id: 4,  destination: 'ec2-52-94-228-6.compute-1.amazonaws.com',protocol: 'TCP', app_protocol: 'AWS',         rx_bps: 8100000,  source: 'DESKTOP-KGB3BNU' },
    { id: 5,  destination: 'server-3-171-171-45.cloudfront.net',     protocol: 'UDP', app_protocol: 'Amazon',      rx_bps: 1520000,  source: 'DLiPhone15Pro' },
    { id: 6,  destination: 'edge-mqtt.facebook.com',                 protocol: 'TCP', app_protocol: 'Facebook',    rx_bps: 240000,   source: 'Adams-iPad' },
    { id: 7,  destination: 'us-east-1.steampowered.com',             protocol: 'TCP', app_protocol: 'Steam',       rx_bps: 67300000, source: 'Gaming-PC.lan' },
    { id: 8,  destination: 'sfo03s29-in-f10.1e100.net',              protocol: 'UDP', app_protocol: 'Google',      rx_bps: 890000,   source: 'Nest-Hub-Kitchen' },
    { id: 9,  destination: 'zoom-us-east-2.zoom.us',                 protocol: 'UDP', app_protocol: 'Zoom',        rx_bps: 2100000,  source: 'Work-Laptop.lan' },
    { id: 10, destination: 'a1049-wss-cf.adnxs.com',                protocol: 'TCP', app_protocol: 'AppNexus',    rx_bps: 150000,   source: 'DLiPhone15Pro' },
  ],
};

// Generate rate history for each flow
MOCK.flows.forEach(f => {
  f.rateHistory = Array.from({ length: 12 }, () => Math.max(0, f.rx_bps + (Math.random() - 0.5) * f.rx_bps * 0.3));
});

/* ===== Multi-WAN mock data ===== */
MOCK.mwan = {
  enabled: true,
  active_policy: 'wan_wwan',  // wan_wwan | wan_only | wwan_only
  interfaces: {
    wan: {
      name: 'WAN',
      enabled: true,
      state: 'online',
      uptime_secs: 345678,
      offline_secs: null,
      latency_ms: 4.2,
      loss_pct: 0,
      track_ips: ['8.8.4.4', '208.67.222.222'],
      device: MOCK.wan.media_type,      // production: juci.wan.status() → media_type
      access_tech: MOCK.wan.media_type, // production: juci.wan.status() → media_type
      ip_addr: MOCK.wan.ip_addr,        // production: juci.wan.status() → ip_addr
      rdns_hostname: 'c-198-51-100-43.consolidated.net', // production: PTR lookup on ip_addr (see README)
      model: null,
      sparklineColor: 'var(--accent-amber)',
      latencyHistory: Array.from({ length: 12 }, () => 3.5 + Math.random() * 2.5)
    },
    wwan: {
      name: 'WWAN',
      enabled: true,
      state: 'online',
      uptime_secs: 12943,
      offline_secs: null,
      latency_ms: 52.1,
      loss_pct: 0,
      track_ips: ['8.8.8.8', '208.67.220.220'],
      device: 'usb0',
      model: 'Inseego USB800',
      access_tech: '4G LTE',    // production: modem manager (inseego-manager.sh / alcatel-manager.sh) → access_technology
      ip_addr: '100.74.23.156',          // production: juci.network.interface() → ipaddr (CGNAT typical for LTE)
      rdns_hostname: 'mip-100-74-23-156.vzwentp.net', // production: PTR lookup on ip_addr (see README)
      sparklineColor: 'var(--accent-cyan)',
      latencyHistory: Array.from({ length: 12 }, () => 44 + Math.random() * 18)
    }
  },
  // Events newest-first. 4-event cycle per outage:
  //   failover → backup_up → recovery → backup_standby
  failover_events: [
    // Cycle 1 — Mar 15: ISP outage, 4h 12m on LTE
    { epoch: 1741996440, event_type: 'failover',       probe_label: 'Primary WAN down',       duration_secs: 15120, dialup_secs: null },
    { epoch: 1741996458, event_type: 'backup_up',      probe_label: 'Backup WAN up',          duration_secs: null,  dialup_secs: 18   },
    { epoch: 1742011560, event_type: 'recovery',       probe_label: 'Primary WAN restored',   duration_secs: null,  dialup_secs: null },
    { epoch: 1742011585, event_type: 'backup_standby', probe_label: 'Backup WAN standing by', duration_secs: null,  dialup_secs: null },
    // Cycle 2 — Mar 9: quick 6-min flap (ONT reboot / power blip)
    { epoch: 1741530120, event_type: 'failover',       probe_label: 'Primary WAN down',       duration_secs: 360,   dialup_secs: null },
    { epoch: 1741530142, event_type: 'backup_up',      probe_label: 'Backup WAN up',          duration_secs: null,  dialup_secs: 22   },
    { epoch: 1741530480, event_type: 'recovery',       probe_label: 'Primary WAN restored',   duration_secs: null,  dialup_secs: null },
    { epoch: 1741530500, event_type: 'backup_standby', probe_label: 'Backup WAN standing by', duration_secs: null,  dialup_secs: null },
    // Cycle 3 — Feb 28: degraded link, 1h 2m before WAN stabilised
    { epoch: 1740785220, event_type: 'failover',       probe_label: 'Primary WAN down',       duration_secs: 3720,  dialup_secs: null },
    { epoch: 1740785235, event_type: 'backup_up',      probe_label: 'Backup WAN up',          duration_secs: null,  dialup_secs: 15   },
    { epoch: 1740788940, event_type: 'recovery',       probe_label: 'Primary WAN restored',   duration_secs: null,  dialup_secs: null },
    { epoch: 1740788970, event_type: 'backup_standby', probe_label: 'Backup WAN standing by', duration_secs: null,  dialup_secs: null },
    // Cycle 4 — Feb 20: 8-min CPE firmware upgrade reboot
    { epoch: 1740021120, event_type: 'failover',       probe_label: 'Primary WAN down',       duration_secs: 480,   dialup_secs: null },
    { epoch: 1740021148, event_type: 'backup_up',      probe_label: 'Backup WAN up',          duration_secs: null,  dialup_secs: 28   },
    { epoch: 1740021600, event_type: 'recovery',       probe_label: 'Primary WAN restored',   duration_secs: null,  dialup_secs: null },
    { epoch: 1740021622, event_type: 'backup_standby', probe_label: 'Backup WAN standing by', duration_secs: null,  dialup_secs: null },
  ],
  usage_30d: {
    wan_secs:    2572320,   // ~29.8 days
    wwan_secs:     19680,   // ~5.5 hours total across 4 events
    offline_secs:      0
  }
};

/* ===== Port Profiles (per-model I/O configuration) ===== */
const MODEL_PORT_PROFILES = {
  'SDG-8733v': {
    label: 'SDG-8733v',
    ports: [
      { id: 'wan0', label: 'WAN',   type: '10GbE',   connector: 'rj45',  role: 'wan',       max_speed_mbps: 10000 },
      { id: 'lan1', label: 'LAN 1', type: '10GbE',   connector: 'rj45',  role: 'lan',       max_speed_mbps: 10000 },
      { id: 'lan2', label: 'LAN 2', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'lan3', label: 'LAN 3', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'lan4', label: 'LAN 4', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'fxs1', label: 'Tel 1', type: 'FXS',     connector: 'rj11',  role: 'fxs',       max_speed_mbps: 0 },
      { id: 'fxs2', label: 'Tel 2', type: 'FXS',     connector: 'rj11',  role: 'fxs',       max_speed_mbps: 0 },
      { id: 'usb0', label: 'USB',   type: 'USB 2.0', connector: 'usb-a', role: 'lte_modem', max_speed_mbps: 0 },
    ]
  },
  'SDG-8734v': {
    label: 'SDG-8734v',
    ports: [
      { id: 'wan0', label: 'WAN',   type: 'SFP+',    connector: 'sfp',   role: 'wan',       max_speed_mbps: 10000 },
      { id: 'lan1', label: 'LAN 1', type: '10GbE',   connector: 'rj45',  role: 'lan',       max_speed_mbps: 10000 },
      { id: 'lan2', label: 'LAN 2', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'lan3', label: 'LAN 3', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'lan4', label: 'LAN 4', type: 'GbE',     connector: 'rj45',  role: 'lan',       max_speed_mbps: 1000 },
      { id: 'fxs1', label: 'Tel 1', type: 'FXS',     connector: 'rj11',  role: 'fxs',       max_speed_mbps: 0 },
      { id: 'fxs2', label: 'Tel 2', type: 'FXS',     connector: 'rj11',  role: 'fxs',       max_speed_mbps: 0 },
      { id: 'usb0', label: 'USB',   type: 'USB 2.0', connector: 'usb-a', role: 'lte_modem', max_speed_mbps: 0 },
    ]
  }
};

/* Runtime port state (all 8 ports, matches SDG-8733v profile) */
MOCK.ports = [
  { id: 'wan0', link_state: 'up', speed_mbps: 10000, duplex: 'full', media_type: 'XGSPON',
    connected_device: { hostname: 'Consolidated Comm.', mac: '00:1A:2B:3C:4D:5E', ip: '198.51.100.43' }, poe: null },
  { id: 'lan1', link_state: 'up', speed_mbps: 2500,  duplex: 'full',
    connected_device: { hostname: 'Gaming-PC', mac: 'A4:83:E7:12:34:56', ip: '192.168.1.101' }, poe: null },
  { id: 'lan2', link_state: 'up', speed_mbps: 100,   duplex: 'full',
    connected_device: { hostname: 'IP-Phone',  mac: '00:0E:A6:EE:FF:03', ip: '192.168.1.150' }, poe: null },
  { id: 'lan3', link_state: 'up', speed_mbps: 1000,  duplex: 'full',
    connected_device: { hostname: 'Smart-TV',  mac: '2C:F0:5D:CC:DD:02', ip: '192.168.1.44' }, poe: null },
  { id: 'lan4', link_state: 'up', speed_mbps: 1000,  duplex: 'full',
    connected_device: { hostname: 'PS5',       mac: 'F8:46:1C:AA:BB:01', ip: '192.168.1.52' }, poe: null },
  { id: 'fxs1', link_state: 'up', speed_mbps: 0, duplex: null, connected_device: null, poe: null,
    fxs: { registered: true, hook_state: 'on-hook', extension: '5001' } },
  { id: 'fxs2', link_state: 'up', speed_mbps: 0, duplex: null, connected_device: null, poe: null,
    fxs: { registered: true, hook_state: 'off-hook', extension: '5002' } },
  { id: 'usb0', link_state: 'up', speed_mbps: 0, duplex: null, connected_device: null, poe: null,
    lte: { model: 'Inseego USB800', carrier: 'Verizon', access_tech: '4G LTE', signal_bars: 3, ip: '100.74.23.156' } },
];

/* Port event history (most recent first) */
MOCK.portEvents = [
  { epoch: Date.now()/1000 - 120,   port: 'LAN 3', state: 'up',   detail: 'Link up at 1 Gbps' },
  { epoch: Date.now()/1000 - 1800,  port: 'LAN 3', state: 'down', detail: 'Link down' },
  { epoch: Date.now()/1000 - 3600,  port: 'WAN',   state: 'up',   detail: 'Link up at 10 Gbps' },
  { epoch: Date.now()/1000 - 3720,  port: 'WAN',   state: 'down', detail: 'Link down' },
  { epoch: Date.now()/1000 - 7200,  port: 'LAN 2', state: 'up',   detail: 'Link up at 100 Mbps' },
  { epoch: Date.now()/1000 - 14400, port: 'LAN 4', state: 'up',   detail: 'Link up at 1 Gbps' },
  { epoch: Date.now()/1000 - 18000, port: 'LAN 1', state: 'up',   detail: 'Link up at 2.5 Gbps' },
  { epoch: Date.now()/1000 - 21600, port: 'Tel 2',  state: 'up',   detail: 'Off-hook' },
  { epoch: Date.now()/1000 - 25200, port: 'Tel 2',  state: 'up',   detail: 'On-hook' },
  { epoch: Date.now()/1000 - 43200, port: 'USB',    state: 'up',   detail: 'LTE modem detected' },
  { epoch: Date.now()/1000 - 86400, port: 'LAN 4', state: 'down', detail: 'Link down' },
  { epoch: Date.now()/1000 - 86500, port: 'LAN 4', state: 'up',   detail: 'Link up at 1 Gbps' },
];

/* ===== State ===== */
let currentHistorySpan = 365; // days
const dismissedAlarms = new Set();
const ackedEvents     = new Set();

/* ===== Free-Placement Grid Layout ===== */

/* Breakpoint detection */
function getGridMode() {
  const w = window.innerWidth;
  if (w >= 1280) return 4;
  if (w >= 768)  return 2;
  return 1;
}

/* 4-column layout (xl: 1280px+) */
const LAYOUT_4COL = {
  'card-qoe':        { col: 1, row: 1, span: 2 },
  'card-wan':        { col: 3, row: 1, span: 1 },
  'card-device':     { col: 4, row: 1, span: 1 },
  'card-history':    { col: 1, row: 2, span: 2 },
  'card-speedtest':  { col: 3, row: 2, span: 2 },
  'card-airtime':    { col: 1, row: 3, span: 2 },
  'card-events':     { col: 3, row: 3, span: 1 },
  'card-alarms':     { col: 4, row: 3, span: 1 },
  'card-wanperf':    { col: 1, row: 4, span: 2 },
  'card-topflows':   { col: 3, row: 4, span: 1 },
  'card-tophosts':   { col: 4, row: 4, span: 1 },
  'card-ports':      { col: 1, row: 5, span: 2 },
  'card-multiwan':   { col: 3, row: 5, span: 1 },
  'card-placeholder':{ col: 4, row: 5, span: 1 },
};

/* 2-column layout (md/lg: 768-1279px) */
const LAYOUT_2COL = {
  'card-qoe':        { col: 1, row: 1, span: 2 },
  'card-wan':        { col: 1, row: 2, span: 1 },
  'card-device':     { col: 2, row: 2, span: 1 },
  'card-history':    { col: 1, row: 3, span: 2 },
  'card-speedtest':  { col: 1, row: 4, span: 2 },
  'card-airtime':    { col: 1, row: 5, span: 2 },
  'card-wanperf':    { col: 1, row: 6, span: 2 },
  'card-events':     { col: 1, row: 7, span: 1 },
  'card-alarms':     { col: 2, row: 7, span: 1 },
  'card-topflows':   { col: 1, row: 8, span: 1 },
  'card-tophosts':   { col: 2, row: 8, span: 1 },
  'card-multiwan':   { col: 1, row: 9, span: 1 },
  'card-placeholder':{ col: 2, row: 9, span: 1 },
  'card-ports':      { col: 1, row: 10, span: 2 },
};

/* Basic view layout (2-col, 5 cards, fixed) */
const LAYOUT_BASIC = {
  'card-qoe':      { col: 1, row: 1, span: 3 },
  'card-wan':      { col: 1, row: 2, span: 1 },
  'card-bbscore':  { col: 2, row: 2, span: 1 },
  'card-device':   { col: 3, row: 2, span: 1 },
  'card-airtime':  { col: 1, row: 3, span: 3 },
  'card-wanperf':  { col: 1, row: 4, span: 3 },
  'card-ports':    { col: 1, row: 5, span: 3 },
  'card-history':  { col: 1, row: 6, span: 3 },
};

/* DEFAULT_LAYOUT is the 4-col version (used for save/load) */
const DEFAULT_LAYOUT = LAYOUT_4COL;

let currentView = 'basic';  // 'basic' or 'tech'
let cardLayout = {};

function loadLayout() {
  try {
    const saved = localStorage.getItem('dashboard_layout');
    if (saved) {
      cardLayout = JSON.parse(saved);
      // Merge any new cards from DEFAULT that aren't in saved
      for (const [id, pos] of Object.entries(DEFAULT_LAYOUT)) {
        if (!cardLayout[id]) cardLayout[id] = { ...pos };
      }
      return;
    }
  } catch(e) {}
  cardLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
}

function saveLayout() {
  localStorage.setItem('dashboard_layout', JSON.stringify(cardLayout));
}

/* ===== View Mode (Basic / Tech) ===== */
function loadView() {
  currentView = localStorage.getItem('dashboard_view') || 'basic';
  document.body.dataset.view = currentView;
  document.querySelectorAll('.view-toggle').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === currentView)
  );
}

function setView(mode) {
  currentView = mode;
  document.body.dataset.view = mode;
  localStorage.setItem('dashboard_view', mode);
  document.querySelectorAll('.view-toggle').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.view === mode)
  );
  if (mode === 'basic') {
    cardLayout = JSON.parse(JSON.stringify(LAYOUT_BASIC));
  } else {
    loadLayout();
  }
  applyLayout();
  // Re-render throughput canvas since container size may change
  requestAnimationFrame(() => initThroughputCanvas());
}

let _lastGridMode = 0;

function applyLayout() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;
  const mode = getGridMode();
  _lastGridMode = mode;

  grid.querySelectorAll(':scope > .card').forEach(card => {
    if (currentView === 'basic') {
      /* Basic view: use fixed 2-col layout for basic cards, hide others via CSS */
      const pos = LAYOUT_BASIC[card.id];
      if (pos) {
        card.style.gridColumn = pos.col + ' / span ' + pos.span;
        card.style.gridRow = String(pos.row);
      } else {
        card.style.gridColumn = '';
        card.style.gridRow = '';
      }
    } else if (mode === 1) {
      /* 1-col: clear JS positions, let CSS order + auto-flow handle it */
      card.style.gridColumn = '';
      card.style.gridRow = '';
    } else if (mode === 2) {
      /* 2-col: use LAYOUT_2COL positions */
      const pos = LAYOUT_2COL[card.id];
      if (pos) {
        card.style.gridColumn = pos.col + ' / span ' + pos.span;
        card.style.gridRow = String(pos.row);
      }
    } else {
      /* 4-col: use user-customized layout */
      const pos = cardLayout[card.id];
      if (pos) {
        card.style.gridColumn = pos.col + ' / span ' + pos.span;
        card.style.gridRow = String(pos.row);
      }
    }
  });
}

/* Re-apply layout on resize (debounced) */
let _resizeTimer;
window.addEventListener('resize', function() {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(function() {
    if (getGridMode() !== _lastGridMode) applyLayout();
  }, 150);
});

function getCellFromPoint(x, y) {
  const grid = document.getElementById('dashboard-grid');
  const rect = grid.getBoundingClientRect();
  const cs = getComputedStyle(grid);
  const gap = parseFloat(cs.gap) || 12;
  const mode = getGridMode();
  const cols = mode >= 4 ? 4 : mode >= 2 ? 2 : 1;
  const colW = (rect.width - gap * (cols - 1)) / cols;
  const rowH = (mode === 1 ? 200 : 260) + gap;
  const col = Math.floor((x - rect.left + gap / 2) / (colW + gap)) + 1;
  const row = Math.floor((y - rect.top + gap / 2) / rowH) + 1;
  return { col: Math.max(1, Math.min(cols, col)), row: Math.max(1, row) };
}

function findCardAt(col, row, excludeId) {
  for (const [id, pos] of Object.entries(cardLayout)) {
    if (id === excludeId) continue;
    if (!document.getElementById(id)) continue; // card not in DOM
    if (row === pos.row && col >= pos.col && col < pos.col + pos.span) return id;
  }
  return null;
}

function getCellRect(col, row, span) {
  const grid = document.getElementById('dashboard-grid');
  const rect = grid.getBoundingClientRect();
  const cs = getComputedStyle(grid);
  const gap = parseFloat(cs.gap) || 12;
  const colW = (rect.width - gap * 3) / 4;
  const rowH = 260 + gap;
  return {
    left: rect.left + (col - 1) * (colW + gap),
    top: rect.top + (row - 1) * rowH,
    width: colW * span + gap * (span - 1),
    height: 260
  };
}

/* ===== Utility Functions ===== */

function formatEpoch(epoch) {
  return new Date(epoch * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function formatEpochDate(epoch) {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function formatEpochShort(epoch) {
  return new Date(epoch * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric'
  });
}

function formatDuration(secs) {
  if (secs < 60)   return secs + 's';
  if (secs < 3600) return Math.round(secs / 60) + 'm';
  if (secs < 86400) {
    const h = Math.floor(secs / 3600);
    const m = Math.round((secs % 3600) / 60);
    return h + 'h ' + (m > 0 ? m + 'm' : '');
  }
  const d = Math.floor(secs / 86400);
  const h = Math.round((secs % 86400) / 3600);
  return d + 'd ' + (h > 0 ? h + 'h' : '');
}

function parseScanDuration(str) {
  // "27d:21:59" -> days:hours:minutes
  const m = str.match(/(\d+)d:(\d+):(\d+)/);
  if (!m) return 0;
  return parseInt(m[1]) * 86400 + parseInt(m[2]) * 3600 + parseInt(m[3]) * 60;
}

function scoreClass(score) {
  if (score >= 70) return 'good';
  if (score >= 40) return 'warn';
  return 'bad';
}

function gradeBadge(grade) {
  if (!grade) return '';
  const g = grade.toUpperCase();
  return `<span class="grade-badge grade-${g}">${g}</span>`;
}

function el(id) { return document.getElementById(id); }

function h(tag, cls, content) {
  return `<${tag}${cls ? ` class="${cls}"` : ''}>${content}</${tag}>`;
}

/* ===== Screen Reader Announcements (EAA / WCAG 4.1.3) ===== */
function announce(message) {
  const box = document.getElementById('sr-announcements');
  if (!box) return;
  box.textContent = '';
  requestAnimationFrame(() => { box.textContent = message; });
}

/* ===== Tooltip ===== */
const tooltip = el('tooltip');
let tooltipVisible = false;

document.addEventListener('mousemove', function(e) {
  if (!tooltipVisible) return;
  const tw = tooltip.offsetWidth, th = tooltip.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  let x = e.clientX + 14, y = e.clientY + 14;
  if (x + tw > vw - 8) x = e.clientX - tw - 14;
  if (y + th > vh - 8) y = e.clientY - th - 14;
  tooltip.style.left = x + 'px';
  tooltip.style.top  = y + 'px';
});

function showTooltip(html) {
  tooltip.innerHTML = html;
  tooltip.style.display = 'block';
  tooltipVisible = true;
}

function hideTooltip() {
  tooltip.style.display = 'none';
  tooltipVisible = false;
}

function ttRow(key, val) {
  return `<div class="tt-row"><span class="tt-key">${key}</span><span class="tt-val">${val}</span></div>`;
}

/* ===== Navigation ===== */
let currentPage = 'dashboard';

function navigateTo(page) {
  if (page === currentPage) return;
  currentPage = page;
  // Update URL hash for deep linking
  window.history.replaceState(null, '', page === 'dashboard' ? '#' : '#' + page);

  // Update sidebar active state
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeNav = page === 'statsview'
    ? document.getElementById('nav-statsview')
    : page === 'pathpulse'
    ? document.getElementById('nav-pathpulse')
    : page === 'netpulse'
    ? document.getElementById('nav-speedtest')
    : document.querySelector('.sidebar-nav .nav-link'); // first = Dashboard
  if (activeNav) activeNav.classList.add('active');

  // Toggle page panels
  const dashGrid = document.getElementById('dashboard-grid');
  const svPage = document.getElementById('page-statsview');
  const ppPage = document.getElementById('page-pathpulse');
  const swPage = document.getElementById('page-netpulse');
  const pageTitle = document.querySelector('.page-title');

  // Hide Simple/Advanced toggle on non-dashboard pages
  const viewToggleGroup = document.querySelector('.view-toggle-group');

  // Hide all pages first
  dashGrid.style.display = 'none';
  svPage.style.display = 'none';
  if (ppPage) ppPage.style.display = 'none';
  if (swPage) swPage.style.display = 'none';
  if (viewToggleGroup) viewToggleGroup.style.display = 'none';
  if (typeof svPause === 'function') svPause();

  if (page === 'statsview') {
    svPage.style.display = '';
    if (pageTitle) pageTitle.textContent = 'StatsView';
    // Initialize StatsView if available
    if (typeof svInit === 'function' && !window._svInitialized) {
      svInit();
      window._svInitialized = true;
    }
    if (typeof svResume === 'function') svResume();
  } else if (page === 'pathpulse') {
    if (ppPage) ppPage.style.display = '';
    if (pageTitle) pageTitle.textContent = 'PathPulse';
    if (viewToggleGroup) viewToggleGroup.style.display = '';
    // Initialize PathPulse if available
    if (typeof ppInit === 'function' && !window._ppInitialized) {
      ppInit();
      window._ppInitialized = true;
    }
  } else if (page === 'netpulse') {
    if (swPage) swPage.style.display = '';
    if (pageTitle) pageTitle.textContent = 'NetPulse';
    // Initialize NetPulse if available
    if (typeof swInit === 'function' && !window._swInitialized) {
      swInit();
      window._swInitialized = true;
    }
  } else {
    dashGrid.style.display = '';
    if (pageTitle) pageTitle.textContent = 'Dashboard';
    if (viewToggleGroup) viewToggleGroup.style.display = '';
    // Reapply dashboard layout after re-show
    requestAnimationFrame(() => applyLayout());
  }
}

// Sidebar click handlers
document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    const label = this.querySelector('.nav-label');
    if (!label) return;
    const text = label.textContent.trim();
    if (text === 'StatsView') {
      navigateTo('statsview');
    } else if (text === 'PathPulse') {
      navigateTo('pathpulse');
    } else if (text === 'NetPulse') {
      navigateTo('netpulse');
    } else if (text === 'Dashboard') {
      navigateTo('dashboard');
    }
    // Close mobile sidebar on navigation
    document.body.classList.remove('sidebar-open');
  });
});

/* ===== Sidebar Toggle ===== */
el('sidebarToggle').addEventListener('click', function() {
  if (getGridMode() < 4) {
    /* Mobile/tablet: toggle overlay sidebar */
    document.body.classList.toggle('sidebar-open');
  } else {
    /* Desktop: toggle collapsed sidebar */
    document.body.classList.toggle('sidebar-collapsed');
  }
  /* EAA: reflect expanded/collapsed state for screen readers */
  const expanded = !document.body.classList.contains('sidebar-collapsed') &&
                   (getGridMode() >= 4 || document.body.classList.contains('sidebar-open'));
  this.setAttribute('aria-expanded', String(expanded));
});

/* Close sidebar when tapping outside it (mobile) */
document.addEventListener('click', function(e) {
  if (document.body.classList.contains('sidebar-open') &&
      !e.target.closest('.sidebar') &&
      !e.target.closest('#sidebarToggle')) {
    document.body.classList.remove('sidebar-open');
  }
});

/* ===== Theme Toggle ===== */
el('themeToggle').addEventListener('click', function() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') !== 'light';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  el('themeIcon').className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
});

/* ===== Topbar Buttons ===== */
el('btnCharts').addEventListener('click', function() {
  navigateTo('statsview');
});
el('btnTopology').addEventListener('click', function() {
  navigateTo('srg-intellifi-devices');
});

/* ===== WAN Card ===== */
function renderWAN() {
  const w = MOCK.wan;
  const isUp = w.carrier === 'true';
  const state = isUp ? 'up' : 'down';

  el('wan-dot').className = `state-dot ${state}`;
  const wanDotSr = el('wan-dot-sr');
  if (wanDotSr) wanDotSr.textContent = isUp ? 'Online' : 'Offline';
  el('wan-state-text').className = `state-badge ${state}`;
  el('wan-state-text').textContent = isUp ? 'UP' : 'DOWN';
  const mediaLabel = w.media_type || w.interface;
  const mediaClass = 'media-' + mediaLabel.toLowerCase().replace(/\./g, '').replace(/\s/g, '');
  el('wan-iface').textContent = mediaLabel;
  el('wan-iface').className = `wan-interface-badge ${mediaClass}`;
  el('wan-ip').textContent = w.ip_addr;
  el('wan-gw').textContent = w.default_route;

  // Bufferbloat score (Option B layout)
  const st = MOCK.speedtest[0];
  if (st) renderWANBufferbloat(st);

  // Left-side meta rows
  el('wan-type').innerHTML = '<span class="wan-type-badge ' + w.wan_type.toLowerCase() + '">' + w.wan_type + '</span>';
  el('wan-uptime').textContent = formatUptime(w.uptime_secs);
  el('wan-dns').textContent    = w.dns_primary + (w.dns_secondary ? ' / ' + w.dns_secondary : '');
  el('wan-mtu').textContent        = w.mtu;
  el('wan-link-speed').textContent  = w.link_speed || '—';

  // Lease row only shown for DHCP
  const leaseRow = el('wan-lease-row');
  if (w.wan_type === 'DHCP') {
    leaseRow.style.display = '';
    el('wan-lease').textContent = 'Expires ' + formatUptime(w.lease_remaining_secs);
  } else {
    leaseRow.style.display = 'none';
  }

  el('card-wan').addEventListener('mouseenter', function() {
    showTooltip(
      `<div class="tt-title">WAN Details</div>` +
      ttRow('Interface', w.interface) +
      ttRow('IP Address', w.ip_addr) +
      ttRow('Gateway', w.default_route) +
      ttRow('Type', w.wan_type) +
      ttRow('State', isUp ? '&#x25CF; UP' : '&#x25CF; DOWN')
    );
  });
  el('card-wan').addEventListener('mouseleave', hideTooltip);
}

/* ===== Device Card ===== */
function renderDevice() {
  const d = MOCK.device;
  el('device-model').textContent = d.model;

  // Items with techOnly:true are hidden in basic view
  const rows = [
    { k: 'MAC',      v: d.mac,                             techOnly: true },
    { k: 'Serial',   v: d.serial,                          techOnly: true },
    { k: 'Firmware', v: d.firmware,                         techOnly: false },
    { k: 'CDT',      v: d.cdt + ' ' + d.cdt_version,      techOnly: true },
    { k: 'Sys Uptime', v: formatUptime(d.sys_uptime_secs), techOnly: false },
    { k: 'Upgraded', v: formatEpochShort(d.last_upgrade_epoch), techOnly: true },
  ];

  // Draw 2x2 gauge cluster
  drawNeedleGauge('gauge-cpu', d.cpu_pct, 100, { bugs: [] }); // no ticks for CPU
  drawNeedleGauge('gauge-cputemp', d.cpu_temp_c, 115, {
    max: 125, unit: '°',
    bugs: [
      { value: 115, color: '#f59e0b' },
      { value: 125, color: '#ef4444' }
    ]
  });
  drawNeedleGauge('gauge-flash', d.flash_pct, 85, {
    bugs: [
      { value: 85, color: '#f59e0b' },
      { value: 95, color: '#ef4444' }
    ]
  });
  drawNeedleGauge('gauge-mem', d.mem_pct, 90, {
    bugs: [
      { value: 90, color: '#f59e0b' },
      { value: 98, color: '#ef4444' }
    ]
  });

  el('device-meta').innerHTML = rows.map(r =>
    `<div class="device-meta-row${r.techOnly ? ' tech-only' : ''}">
      <span class="dmr-key">${r.k}</span>
      <span class="dmr-val">${r.v}</span>
    </div>`
  ).join('');
}

/* ===== Alarms Card ===== */
function dismissAlarm(mac) {
  dismissedAlarms.add(mac);
  renderAlarms();
}

function renderAlarms() {
  const alarms = MOCK.alarms.filter(a => !dismissedAlarms.has(a.subjectMAC));
  const counts = { critical: 0, error: 0, warn: 0 };
  alarms.forEach(a => { if (counts[a.severity] !== undefined) counts[a.severity]++; });

  el('alarm-sev-row').innerHTML =
    `<div class="sev-pill">
      <span class="sev-dot critical"></span>
      <span class="sev-count critical">${counts.critical} crit</span>
    </div>
    <div class="sev-pill">
      <span class="sev-dot error"></span>
      <span class="sev-count error">${counts.error} err</span>
    </div>
    <div class="sev-pill">
      <span class="sev-dot warn"></span>
      <span class="sev-count warn">${counts.warn} warn</span>
    </div>`;

  if (alarms.length === 0) {
    el('alarm-list').innerHTML =
      `<div class="alarm-no-alarms"><i class="fa-solid fa-circle-check"></i> No active alarms</div>`;
  } else {
    el('alarm-list').innerHTML = alarms.map(a =>
      `<div class="alarm-row sev-${a.severity}">
        <span class="sev-dot ${a.severity}" style="flex-shrink:0"></span>
        <span class="alarm-row-name" title="${a.info}">${a.value_string || a.name}</span>
        <button class="btn-dismiss" onclick="dismissAlarm('${a.subjectMAC}')" title="Dismiss">&#x2715;</button>
      </div>`
    ).join('');
  }
}

/* ===== Events Card ===== */
function ackEvent(epoch) {
  ackedEvents.add(epoch);
  renderEvents();
}

function renderEvents() {
  const all = MOCK.events.filter(e => e.Priority !== 'info' && !ackedEvents.has(e.Epoch));
  const counts = { critical: 0, warn: 0 };
  all.forEach(e => { if (counts[e.Priority] !== undefined) counts[e.Priority]++; });

  el('events-counts').innerHTML =
    `<div class="ev-count-badge critical"><i class="fa-solid fa-circle-xmark"></i> ${counts.critical}</div>
     <div class="ev-count-badge warn"><i class="fa-solid fa-triangle-exclamation"></i> ${counts.warn}</div>`;

  el('events-list').innerHTML = all.map(e =>
    `<div class="event-row">
      <div class="event-priority-bar ${e.Priority}"></div>
      <div class="event-body">
        <span class="event-text">${e.Topic_WhatHappened}</span>
        <span class="event-time">${formatEpochShort(e.Epoch)}</span>
      </div>
      <button class="btn-ack" onclick="ackEvent(${e.Epoch})" title="Acknowledge">&#x2713;</button>
    </div>`
  ).join('');
}

/* ===== Connection History Timeline ===== */
function buildTimelineSegments(spanDays) {
  const dt = MOCK.downtime;
  const now = dt.current_epoch;
  const windowSecs = spanDays * 86400;
  const wStart = now - windowSecs;
  const wEnd   = now;

  // When data collection started
  const scanSecs = parseScanDuration(dt.scan_duration);
  const dataStart = now - scanSecs;

  // Build event list (sorted)
  const events = [];
  if (dt.grey_period) {
    events.push({ from: dt.grey_period.from_epoch, to: dt.grey_period.to_epoch, type: 'grey', data: dt.grey_period });
  }
  dt.down_periods.forEach(p => {
    const type = p.down_event === 'internet/down' ? 'internet'
               : p.down_event === 'powerDown'     ? 'power'
               : 'upgrade';
    events.push({ from: p.from_epoch, to: p.to_epoch, type, data: p });
  });
  events.sort((a, b) => a.from - b.from);

  const segments = [];
  let cursor = wStart;

  // No-data region before data collection began
  if (dataStart > wStart) {
    segments.push({ start: wStart, end: Math.min(dataStart, wEnd), type: 'nodata', data: null });
    cursor = Math.min(dataStart, wEnd);
  }

  for (const ev of events) {
    if (ev.to <= wStart || ev.from >= wEnd) continue;
    const evStart = Math.max(ev.from, cursor);
    const evEnd   = Math.min(ev.to,   wEnd);
    if (evStart <= cursor && ev.from < cursor) {
      // overlapping, skip UP gap
    } else if (cursor < evStart) {
      segments.push({ start: cursor, end: evStart, type: 'up', data: null });
    }
    if (evStart < evEnd) {
      segments.push({ start: evStart, end: evEnd, type: ev.type, data: ev.data });
    }
    cursor = Math.max(cursor, evEnd);
  }

  if (cursor < wEnd) {
    segments.push({ start: cursor, end: wEnd, type: 'up', data: null });
  }

  const totalSecs = wEnd - wStart;
  return segments.map(seg => ({
    ...seg,
    leftPct:  ((seg.start - wStart) / totalSecs * 100),
    widthPct: ((seg.end   - seg.start) / totalSecs * 100)
  }));
}

function renderTimeline(spanDays) {
  const segments = buildTimelineSegments(spanDays);
  const bar = el('timeline-bar');
  bar.innerHTML = '';

  const dt = MOCK.downtime;
  const now = dt.current_epoch;
  const wStart = now - spanDays * 86400;
  const wEnd   = now;
  const totalSecs = wEnd - wStart;

  // --- Scrollable zoom: widen inner for 7d/30d ---
  const scrollEl = el('timeline-scroll');
  const innerEl  = el('timeline-inner');
  if (spanDays <= 7) {
    innerEl.style.width = '400%';
    scrollEl.classList.remove('no-scroll');
  } else if (spanDays <= 30) {
    innerEl.style.width = '200%';
    scrollEl.classList.remove('no-scroll');
  } else {
    innerEl.style.width = '100%';
    scrollEl.classList.add('no-scroll');
  }

  // Render segments
  segments.forEach(seg => {
    if (seg.widthPct < 0.01) return;
    const div = document.createElement('div');
    div.className = `tl-seg ${seg.type}`;
    div.style.left  = seg.leftPct.toFixed(4) + '%';
    div.style.width = seg.widthPct.toFixed(4) + '%';

    div.addEventListener('mouseenter', function() {
      let html = '';
      const dur = formatDuration(seg.end - seg.start);
      const from = formatEpoch(seg.start);
      const to   = seg.end >= now - 60 ? 'Now' : formatEpoch(seg.end);

      if (seg.type === 'up') {
        html = `<div class="tt-title" style="color:var(--accent-green)">&#x25CF; Online</div>` +
               ttRow('From', from) + ttRow('To', to) + ttRow('Duration', dur);
      } else if (seg.type === 'internet') {
        const d = seg.data || {};
        html = `<div class="tt-title" style="color:var(--accent-red)">&#x25CF; Internet Lost</div>` +
               ttRow('From', from) + ttRow('To', to) + ttRow('Duration', dur) +
               (d.down_event_data ? ttRow('Reason', d.down_event_data.Reason) : '');
      } else if (seg.type === 'power') {
        const d = seg.data || {};
        const est = d.down_event_data && d.down_event_data.OfflineEstimate ? d.down_event_data.OfflineEstimate : dur;
        html = `<div class="tt-title" style="color:var(--accent-amber)">&#x26A1; Power Loss</div>` +
               ttRow('From', from) + ttRow('To', to) + ttRow('Offline', est);
      } else if (seg.type === 'upgrade') {
        const d = seg.data || {};
        html = `<div class="tt-title" style="color:var(--accent-blue)">&#x21BA; Upgrade / Reboot</div>` +
               ttRow('From', from) + ttRow('To', to) + ttRow('Duration', dur) +
               (d.down_event_data && d.down_event_data.ReasonDetail ? ttRow('Detail', d.down_event_data.ReasonDetail) : '');
      } else if (seg.type === 'grey') {
        html = `<div class="tt-title" style="color:var(--accent-grey)">Uncertain State</div>` +
               ttRow('From', from) + ttRow('To', to) +
               `<div class="tt-note">Data gap — state unknown during this period</div>`;
      } else if (seg.type === 'nodata') {
        html = `<div class="tt-title" style="color:var(--text-muted)">No Data</div>` +
               `<div class="tt-note">Outside monitoring window</div>`;
      }
      showTooltip(html);
    });
    div.addEventListener('mouseleave', hideTooltip);
    bar.appendChild(div);
  });

  // Determine tick + label granularity based on span
  const startDate = new Date(wStart * 1000);
  let labelFmt, advanceTick;
  if (spanDays <= 7) {
    // Day boundaries
    advanceTick = d => d.setDate(d.getDate() + 1);
    labelFmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else if (spanDays <= 30) {
    // Week boundaries (start on Sunday)
    advanceTick = d => d.setDate(d.getDate() + 7);
    labelFmt = d => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } else {
    // Month boundaries
    advanceTick = d => d.setMonth(d.getMonth() + 1);
    labelFmt = d => d.toLocaleDateString(undefined, { month: 'short' });
  }

  // Find first tick boundary after wStart
  let tickDate;
  if (spanDays <= 7) {
    tickDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1, 0, 0, 0, 0);
  } else if (spanDays <= 30) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (7 - d.getDay()) % 7 || 7);
    d.setHours(0, 0, 0, 0);
    tickDate = d;
  } else {
    tickDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  // Render alternating month shading + notch dots behind the bar
  const inner = el('timeline-inner');
  inner.querySelectorAll('.tl-month-shade, .tl-month-notch').forEach(t => t.remove());
  // Collect all boundary positions (including start and end)
  const boundaries = [0]; // start at 0%
  const shadeTick = new Date(tickDate); // tickDate is already at first boundary
  while (shadeTick.getTime() / 1000 < wEnd) {
    const leftPct = ((shadeTick.getTime() / 1000 - wStart) / totalSecs * 100);
    if (leftPct > 0 && leftPct < 100) boundaries.push(leftPct);
    advanceTick(shadeTick);
  }
  boundaries.push(100); // end at 100%
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (i % 2 === 0) continue; // only shade odd columns
    const shade = document.createElement('div');
    shade.className = 'tl-month-shade';
    shade.style.left = boundaries[i].toFixed(3) + '%';
    shade.style.width = (boundaries[i + 1] - boundaries[i]).toFixed(3) + '%';
    inner.appendChild(shade);
  }
  // Add small notch dots at each internal boundary
  for (let i = 1; i < boundaries.length - 1; i++) {
    const notch = document.createElement('div');
    notch.className = 'tl-month-notch';
    notch.style.left = boundaries[i].toFixed(3) + '%';
    inner.appendChild(notch);
  }

  // Axis labels
  const axisEl = el('timeline-axis');
  axisEl.innerHTML = '';

  function addAxisLabel(leftPctVal, text, anchor) {
    const span = document.createElement('span');
    span.textContent = text;
    span.style.position = 'absolute';
    if (anchor === 'right') {
      span.style.right = '0';
    } else {
      span.style.left = leftPctVal.toFixed(2) + '%';
      if (leftPctVal > 3 && leftPctVal < 94) span.style.transform = 'translateX(-50%)';
    }
    axisEl.appendChild(span);
  }

  // Start label
  const startFmt = spanDays <= 30
    ? startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : startDate.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  addAxisLabel(0, startFmt, 'left');

  // Boundary labels (re-iterate)
  let labelDate;
  if (spanDays <= 7) {
    labelDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 1, 0, 0, 0, 0);
  } else if (spanDays <= 30) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + (7 - d.getDay()) % 7 || 7);
    d.setHours(0, 0, 0, 0);
    labelDate = d;
  } else {
    labelDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1, 0, 0, 0, 0);
  }
  while (labelDate.getTime() / 1000 < wEnd) {
    const leftPct = ((labelDate.getTime() / 1000 - wStart) / totalSecs * 100);
    if (leftPct > 4 && leftPct < 93) addAxisLabel(leftPct, labelFmt(labelDate), 'center');
    advanceTick(labelDate);
  }
  addAxisLabel(null, 'Now', 'right');

  // Summary
  const downInWindow = MOCK.downtime.down_periods
    .filter(p => p.to_epoch > wStart && p.from_epoch < wEnd)
    .reduce((sum, p) => sum + Math.min(p.to_epoch, wEnd) - Math.max(p.from_epoch, wStart), 0);
  const downCount = MOCK.downtime.down_periods
    .filter(p => p.to_epoch > wStart && p.from_epoch < wEnd).length;

  el('history-summary').textContent =
    `${downCount} outage${downCount !== 1 ? 's' : ''} \u00b7 ${formatDuration(downInWindow)} total downtime in ${spanDays >= 365 ? '1 year' : spanDays >= 180 ? '6 months' : spanDays + ' days'}`;

  // --- Uptime stats row ---
  const totalWindow = totalSecs;
  const uptimePct = ((1 - downInWindow / totalWindow) * 100);
  const longestOutage = MOCK.downtime.down_periods
    .filter(p => p.to_epoch > wStart && p.from_epoch < wEnd)
    .reduce((max, p) => {
      const dur = Math.min(p.to_epoch, wEnd) - Math.max(p.from_epoch, wStart);
      return dur > max ? dur : max;
    }, 0);
  const avgOutage = downCount > 0 ? Math.round(downInWindow / downCount) : 0;
  // MTBF: mean time between failures
  const uptimeSecs = totalWindow - downInWindow;
  const mtbf = downCount > 0 ? Math.round(uptimeSecs / downCount) : totalWindow;

  const statsEl = el('history-stats');
  statsEl.innerHTML =
    `<span>Uptime <span class="history-stat-val">${uptimePct.toFixed(2)}%</span></span>` +
    `<span>Longest <span class="history-stat-val">${longestOutage ? formatDuration(longestOutage) : 'none'}</span></span>` +
    `<span>Avg <span class="history-stat-val">${avgOutage ? formatDuration(avgOutage) : 'none'}</span></span>` +
    `<span>MTBF <span class="history-stat-val">${formatUptime(mtbf)}</span></span>`;

  // --- Monthly uptime badges (always 12 months) ---
  const monthlyEl = el('history-monthly');
  monthlyEl.innerHTML = '';
  const periods = MOCK.downtime.down_periods;
  // Always show 12 months regardless of current zoom
  const fullStart = now - 365 * 86400;
  const mStart = new Date(fullStart * 1000);
  mStart.setDate(1); mStart.setHours(0,0,0,0);
  const mEnd = new Date(now * 1000);
  const curMonth = new Date(mStart);
  while (curMonth <= mEnd) {
    const moStart = Math.max(curMonth.getTime() / 1000, fullStart);
    const nextMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 1);
    const moEnd = Math.min(nextMonth.getTime() / 1000, now);
    const moTotal = moEnd - moStart;
    if (moTotal <= 0) { curMonth.setMonth(curMonth.getMonth() + 1); continue; }
    const moDown = periods
      .filter(p => p.to_epoch > moStart && p.from_epoch < moEnd)
      .reduce((s, p) => s + Math.min(p.to_epoch, moEnd) - Math.max(p.from_epoch, moStart), 0);
    const moPct = ((1 - moDown / moTotal) * 100);
    const pill = document.createElement('div');
    pill.className = 'monthly-pill';
    // Color: green = 100%, cyan = 99-99.99%, amber = 95-99%, red = <95%
    let bg, fg;
    if (moPct >= 99.995) { bg = 'rgba(16,185,129,0.15)'; fg = 'var(--accent-green)'; }
    else if (moPct >= 99)  { bg = 'rgba(0,200,230,0.12)'; fg = 'var(--accent-cyan)'; }
    else if (moPct >= 95)  { bg = 'rgba(245,158,11,0.15)'; fg = 'var(--accent-amber)'; }
    else                   { bg = 'rgba(239,68,68,0.15)';  fg = 'var(--accent-red)'; }
    pill.style.background = bg;
    pill.style.color = fg;
    const moName = curMonth.toLocaleDateString(undefined, { month: 'short' });
    pill.innerHTML = `<span class="monthly-pill-month">${moName}</span><span class="monthly-pill-pct">${moPct >= 99.995 ? '100%' : moPct.toFixed(1) + '%'}</span>`;
    monthlyEl.appendChild(pill);
    curMonth.setMonth(curMonth.getMonth() + 1);
  }

  // Scroll to the right end (most recent) for zoomed views
  if (spanDays < 180) {
    requestAnimationFrame(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; });
  }
}

// --- Grab-to-drag scroll for timeline ---
(function initTimelineGrabScroll() {
  const scrollEl = document.getElementById('timeline-scroll');
  if (!scrollEl) return;
  let isDragging = false, startX = 0, startScrollLeft = 0;
  scrollEl.addEventListener('mousedown', e => {
    if (scrollEl.classList.contains('no-scroll')) return;
    isDragging = true;
    startX = e.pageX;
    startScrollLeft = scrollEl.scrollLeft;
    scrollEl.style.cursor = 'grabbing';
    scrollEl.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    scrollEl.scrollLeft = startScrollLeft - dx;
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    scrollEl.style.cursor = '';
    scrollEl.style.userSelect = '';
  });
})();

function setHistorySpan(days) {
  currentHistorySpan = days;
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.span) === days);
  });
  renderTimeline(days);
}

/* ===== WAN Performance Card ===== */
/* ===== Bufferbloat Score (Stacked Stat Cards) ===== */
function gradeColor(g) {
  return g === 'A' ? 'var(--accent-green)' : g === 'B' ? 'var(--accent-cyan)' : g === 'C' ? 'var(--accent-amber)' : 'var(--accent-red)';
}
function gradeTint(g) {
  return g === 'A' ? 'rgba(52,211,153,0.12)' : g === 'B' ? 'rgba(0,200,230,0.12)' : g === 'C' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
}

function gradeRank(g) { return { A: 0, B: 1, C: 2, D: 3, F: 4 }[g] || 4; }

function bbSummary(dlG, ulG) {
  const dlR = gradeRank(dlG), ulR = gradeRank(ulG);
  const worst = dlR > ulR ? dlG : ulG;
  let msg = '';
  if (worst === 'A') {
    msg = 'Connection handles congestion <strong>well</strong>. Latency stays low even under full load.';
  } else if (worst === 'B') {
    msg = 'Connection handles congestion <strong>well</strong>.';
    if (dlR > ulR) msg += ' Download latency increases slightly under load.';
    else if (ulR > dlR) msg += ' Upload latency increases slightly under load.';
    else msg += ' Minor latency increase under load.';
  } else if (worst === 'C') {
    msg = '<strong class="warn">Moderate bufferbloat.</strong>';
    if (dlR >= 2) msg += ' Download latency increases noticeably under load.';
    if (ulR >= 2) msg += ' Upload latency increases noticeably under load.';
  } else {
    msg = '<strong class="bad">Significant bufferbloat.</strong>';
    if (dlR >= 3) msg += ' Download quality degrades under heavy use.';
    if (ulR >= 3) msg += ' Upload quality degrades under heavy use.';
  }
  return msg;
}

function renderWANBufferbloat(st) {
  const dlG = st.download_bufferbloat_grade;
  const ulG = st.upload_bufferbloat_grade;

  // Download row
  el('bb-row-dl').style.borderColor = gradeColor(dlG);
  el('bb-dl-grade').textContent = dlG;
  el('bb-dl-grade').style.color = gradeColor(dlG);
  el('bb-dl-speed').textContent = st.download_mbps.toFixed(0);
  el('bb-dl-lat').textContent   = st.download_avg.toFixed(0) + 'ms loaded / ' + st.idle_avg.toFixed(0) + 'ms idle';

  // Upload row
  el('bb-row-ul').style.borderColor = gradeColor(ulG);
  el('bb-ul-grade').textContent = ulG;
  el('bb-ul-grade').style.color = gradeColor(ulG);
  el('bb-ul-speed').textContent = st.upload_mbps.toFixed(0);
  el('bb-ul-lat').textContent   = st.upload_avg.toFixed(0) + 'ms loaded / ' + st.idle_avg.toFixed(0) + 'ms idle';

  // --- BB options for simple view ---
  // Option A: Grade pills
  const pillDl = document.getElementById('bb-pill-dl-grade');
  const pillUl = document.getElementById('bb-pill-ul-grade');
  if (pillDl) { pillDl.textContent = dlG; pillDl.style.color = gradeColor(dlG); }
  if (pillUl) { pillUl.textContent = ulG; pillUl.style.color = gradeColor(ulG); }
  const pillDlBox = document.getElementById('bb-pill-dl');
  const pillUlBox = document.getElementById('bb-pill-ul');
  if (pillDlBox) pillDlBox.style.borderColor = gradeColor(dlG);
  if (pillUlBox) pillUlBox.style.borderColor = gradeColor(ulG);

  // Option B: Inline colored letters
  const inlineDl = document.getElementById('bb-inline-dl-grade');
  const inlineUl = document.getElementById('bb-inline-ul-grade');
  if (inlineDl) { inlineDl.textContent = dlG; inlineDl.style.color = gradeColor(dlG); }
  if (inlineUl) { inlineUl.textContent = ulG; inlineUl.style.color = gradeColor(ulG); }

  // Option C: Single combined grade
  const gradeMap = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
  const revMap = ['F', 'D', 'C', 'B', 'A'];
  const avg = ((gradeMap[dlG] || 0) + (gradeMap[ulG] || 0)) / 2;
  const combinedG = revMap[Math.round(avg)] || 'C';
  const combEl = document.getElementById('bb-combined-grade');
  const combDot = document.getElementById('bb-combined-dot');
  if (combEl) { combEl.textContent = combinedG; combEl.style.color = gradeColor(combinedG); }
  if (combDot) combDot.style.background = gradeColor(combinedG);

  // Option D: Mini gauge arc
  const miniCanvas = document.getElementById('bb-mini-gauge');
  if (miniCanvas) {
    const dpr = window.devicePixelRatio || 1;
    miniCanvas.width = 48 * dpr; miniCanvas.height = 28 * dpr;
    miniCanvas.style.width = '24px'; miniCanvas.style.height = '14px';
    const mctx = miniCanvas.getContext('2d');
    mctx.scale(dpr, dpr);
    const cx = 24, cy = 16, r = 12;
    // Arc background
    mctx.beginPath(); mctx.arc(cx, cy, r, Math.PI, 0); mctx.lineWidth = 3;
    mctx.strokeStyle = 'rgba(255,255,255,0.08)'; mctx.stroke();
    // Arc fill (based on combined grade)
    const pct = avg / 4;
    mctx.beginPath(); mctx.arc(cx, cy, r, Math.PI, Math.PI + Math.PI * pct);
    mctx.lineWidth = 3; mctx.strokeStyle = gradeColor(combinedG); mctx.stroke();
    // Grade letter
    mctx.textAlign = 'center'; mctx.textBaseline = 'middle';
    mctx.font = 'bold 10px "Poppins", sans-serif'; mctx.fillStyle = gradeColor(combinedG);
    mctx.fillText(combinedG, cx, cy - 2);
  }

  // Summary sentence
  el('bb-summary').innerHTML = bbSummary(dlG, ulG);

  // Timestamp (inline with label)
  const tsText = '- Tested ' + formatEpochShort(st.epoch);
  const tsEl = el('wan-perf-ts-header');
  if (tsEl) tsEl.textContent = tsText;
  const tsMob = el('wan-perf-ts-mobile');
  if (tsMob) tsMob.textContent = tsText;
}

function formatUptime(secs) {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + m + 'm';
  return m + 'm';
}

/* ===== Needle Gauge (Boeing-inspired, frown ∩ shape) ===== */
// opts: { max, unit, bugs: [{value, color}] }
function drawNeedleGauge(canvasId, value, warnThreshold, opts) {
  const canvas = el(canvasId);
  if (!canvas) return;
  const o = opts || {};
  const maxVal = o.max || 100;
  const unit = o.unit || '%';
  const bugs = o.bugs || [{ value: warnThreshold, color: '#f59e0b' }];

  const dpr = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const cssW = Math.max(wrap.clientWidth - 2, 40);
  const cssH = Math.round(cssW * 0.75); // frown proportions: wider than tall
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const DEG = Math.PI / 180;
  const sweepRad = 240 * DEG;
  const startAngle = 150 * DEG;
  const endAngle   = 30 * DEG;

  const cx = cssW / 2;
  const cy = cssH * 0.72;
  const r = Math.min(cy - 10, (cssH - cy - 8) / 0.5, cx - 14);

  const norm = Math.max(0, Math.min(maxVal, value)) / maxVal;
  const needleAngle = startAngle + norm * sweepRad;

  // --- Arc track ---
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle, false);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = Math.max(2, r * 0.04);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  // --- Graduation ticks ---
  for (let i = 0; i <= 10; i++) {
    const a = startAngle + (i / 10) * sweepRad;
    const isMajor = (i % 2 === 0);
    const isEnd = (i === 0 || i === 10);
    const inner = r - (isMajor ? r * 0.18 : r * 0.10);
    const outer = r + 1;
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
    ctx.lineTo(cx + outer * Math.cos(a), cy + outer * Math.sin(a));
    ctx.strokeStyle = isEnd ? 'rgba(255,255,255,0.9)' : (isMajor ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)');
    ctx.lineWidth = isEnd ? 2.5 : (isMajor ? 1.8 : 0.8);
    ctx.stroke();
  }

  // --- Bug markers (T-shape) ---
  bugs.forEach(bug => {
    const bugNorm = Math.max(0, Math.min(maxVal, bug.value)) / maxVal;
    const bugAngle = startAngle + bugNorm * sweepRad;
    const bugR = r + 5;
    const bugLen = Math.max(5, r * 0.1);
    const bx1 = cx + bugR * Math.cos(bugAngle);
    const by1 = cy + bugR * Math.sin(bugAngle);
    const bx2 = cx + (bugR + bugLen) * Math.cos(bugAngle);
    const by2 = cy + (bugR + bugLen) * Math.sin(bugAngle);
    ctx.beginPath();
    ctx.moveTo(bx1, by1);
    ctx.lineTo(bx2, by2);
    ctx.strokeStyle = bug.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    const pA = bugAngle + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(bx2 + 3.5 * Math.cos(pA), by2 + 3.5 * Math.sin(pA));
    ctx.lineTo(bx2 - 3.5 * Math.cos(pA), by2 - 3.5 * Math.sin(pA));
    ctx.stroke();
  });

  // --- Tapered needle ---
  const needleLen = r - 3;
  const tipX = cx + needleLen * Math.cos(needleAngle);
  const tipY = cy + needleLen * Math.sin(needleAngle);
  const baseHalf = Math.max(3, r * 0.06);
  const perpN = needleAngle + Math.PI / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,0.5)';
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(cx + baseHalf * Math.cos(perpN), cy + baseHalf * Math.sin(perpN));
  ctx.lineTo(cx - baseHalf * Math.cos(perpN), cy - baseHalf * Math.sin(perpN));
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();

  // --- Pivot dot ---
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(3, r * 0.06), 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // --- Digital readout (dropped 3-4px lower) ---
  const fontSize = Math.round(r * 0.28);
  ctx.font = '700 ' + fontSize + 'px "Poppins", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Color: warn if past highest bug threshold
  // Determine alert color based on bug thresholds (sorted ascending)
  const sortedBugs = bugs.slice().sort((a, b) => a.value - b.value);
  let alertColor = '#ffffff';
  for (const bug of sortedBugs) {
    if (value >= bug.value) alertColor = bug.color;
  }

  ctx.fillStyle = alertColor;
  const displayVal = unit === '°' ? Math.round(value) + '°' : Math.round(value) + unit;
  ctx.fillText(displayVal, cx, cy + 9);

  // Color the HTML label below the canvas to match
  const label = canvas.parentElement.querySelector('.gauge-label');
  if (label) label.style.color = alertColor === '#ffffff' ? '' : alertColor;

  // EAA: update canvas aria-label with live value for screen readers
  const labelText = label ? label.textContent.trim() : canvasId;
  canvas.setAttribute('aria-label', labelText + ': ' + displayVal);
}

function renderWANPerf() {
  // Timestamp now lives in the WAN Status bufferbloat section
}

function runSpeedtest() {
  const btn = document.querySelector('.btn-run-test');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:5px;"></i> Running...';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:5px;"></i> Run Test';
    btn.disabled = false;
  }, 3000);
}

/* ===== QoE / System Performance Card ===== */
function renderQoE() {
  const q = MOCK.qoe;
  const score = q.qoe_score;
  const cls = scoreClass(score);

  el('qoe-score').className = `qoe-score-num ${cls}`;
  el('qoe-score').textContent = score.toFixed(1);
  el('qoe-ts').textContent = formatEpoch(q.timestamp_epoch);

  const catNames = { wan: 'WAN', system: 'System', wifi: 'WiFi', lan: 'LAN', mesh: 'Mesh' };
  const pillsHtml = Object.entries(q.categories).map(([key, cat]) => {
    const c = scoreClass(cat.score);
    const factors = cat.factors || [];
    const factorJson = encodeURIComponent(JSON.stringify(factors));
    return `<div class="qoe-pill ${c}" data-factors="${factorJson}"
              data-cat="${catNames[key] || key}"
              data-score="${cat.score}"
              onmouseenter="showQoEPillTooltip(this, event)"
              onmouseleave="hideTooltip()">
              <span class="qoe-pill-name">${catNames[key] || key}</span>
              <span class="qoe-pill-score">${cat.score.toFixed(0)}</span>
            </div>`;
  }).join('');

  el('qoe-pills').innerHTML = pillsHtml;

  // Show all factors with issues
  const allFactors = Object.entries(q.categories)
    .flatMap(([, cat]) => cat.factors || [])
    .filter(f => f);

  if (allFactors.length > 0) {
    el('qoe-issues').innerHTML = allFactors.map((f, i) =>
      `<div class="qoe-issue${i > 0 ? ' qoe-issue-sep' : ''}">
        <span class="qoe-issue-subject">${f.subject}</span>
        <span class="qoe-issue-detail"> &mdash; ${f.detail}</span>
      </div>`
    ).join('');
  } else {
    el('qoe-issues').innerHTML = `<div class="qoe-issue" style="color:var(--accent-green)"><i class="fa-solid fa-circle-check"></i> No issues detected</div>`;
  }

  // Render last speedtest mini chart (simple view)
  renderLastSpeedtest();
}

function renderLastSpeedtest() {
  const container = document.getElementById('qoe-last-speedtest');
  if (!container) return;

  // Get the most recent speedtest
  const tests = MOCK.speedtest.filter(s => !s.birth_certificate);
  if (tests.length === 0) { container.innerHTML = ''; return; }
  const latest = tests[0]; // newest first in mock data

  const dlRate = MOCK.wan.service_rate_dl || 0;
  const ulRate = MOCK.wan.service_rate_ul || 0;
  const dlMbps = latest.download_mbps;
  const ulMbps = latest.upload_mbps;

  // Format values
  const fmtSpeed = (v) => v >= 1000 ? (v / 1000).toFixed(1) : v.toFixed(0);
  const fmtUnit  = (v) => v >= 1000 ? 'Gbps' : 'Mbps';
  const hasRates = dlRate > 0 && ulRate > 0;
  const dlPct = dlRate > 0 ? Math.min(100, dlMbps / dlRate * 100) : 0;
  const ulPct = ulRate > 0 ? Math.min(100, ulMbps / ulRate * 100) : 0;

  // Date
  const d = new Date(latest.epoch * 1000);
  const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  container.innerHTML = `
    <div class="lst-header">
      <span class="lst-title">Last Speed Test</span>
      <span class="lst-date">${dateStr}</span>
    </div>
    <div class="lst-bars">
      ${hasRates ? `<div class="lst-bar-group lst-col-headers">
        <div class="lst-bar-label"></div>
        <div class="lst-bar-track" style="background:none;height:auto;"></div>
        <span class="lst-col-header">Service Rate</span>
      </div>` : ''}
      <div class="lst-bar-group">
        <div class="lst-bar-label">
          <span class="lst-arrow dl">↓</span>
          <span class="lst-speed">${fmtSpeed(dlMbps)}</span>
          <span class="lst-unit">${fmtUnit(dlMbps)}</span>
        </div>
        <div class="lst-bar-track">
          <div class="lst-bar-fill dl" style="width:${dlPct}%"></div>
          ${dlRate > 0 ? '<div class="lst-bar-limit"></div>' : ''}
        </div>
        ${dlRate > 0 ? `<span class="lst-plan-label">${fmtSpeed(dlRate)} ${fmtUnit(dlRate)}</span>` : ''}
      </div>
      <div class="lst-bar-group">
        <div class="lst-bar-label">
          <span class="lst-arrow ul">↑</span>
          <span class="lst-speed">${fmtSpeed(ulMbps)}</span>
          <span class="lst-unit">${fmtUnit(ulMbps)}</span>
        </div>
        <div class="lst-bar-track">
          <div class="lst-bar-fill ul" style="width:${ulPct}%"></div>
          ${ulRate > 0 ? '<div class="lst-bar-limit"></div>' : ''}
        </div>
        ${ulRate > 0 ? `<span class="lst-plan-label">${fmtSpeed(ulRate)} ${fmtUnit(ulRate)}</span>` : ''}
      </div>
    </div>
  `;
}

function showQoEPillTooltip(pill) {
  const cat   = pill.dataset.cat;
  const score = parseFloat(pill.dataset.score);
  const factors = JSON.parse(decodeURIComponent(pill.dataset.factors));
  let html = `<div class="tt-title">${cat} — ${score.toFixed(0)} / 100</div>`;
  if (factors.length === 0) {
    html += `<div class="tt-note" style="color:var(--accent-green)">&#x2713; No issues</div>`;
  } else {
    html += factors.map(f =>
      `<hr class="tt-divider">` +
      ttRow('Device', f.subject) +
      `<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${f.detail}</div>`
    ).join('');
  }
  showTooltip(html);
}

/* ===== Devices + Airtime Card ===== */
const bandClass = { '2.4 GHz': 'band-24', '5 GHz': 'band-5', '6 GHz': 'band-6' };

function animatePct(pctEl, from, to, delay) {
  const duration = 800;
  let start = null;
  setTimeout(() => {
    requestAnimationFrame(function tick(ts) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      // same easing as the CSS bars: cubic-bezier(0.4, 0, 0.2, 1) approximated
      const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
      const pctText = Math.round(from + (to - from) * ease) + '% in use';
      // Preserve client count span if present
      const clientSpan = pctEl.querySelector('.airtime-client-count');
      if (clientSpan) {
        // Keep the span, update only the text node after it
        const textNode = clientSpan.nextSibling;
        if (textNode) textNode.textContent = ' \u00B7 ' + pctText;
        else pctEl.appendChild(document.createTextNode(' \u00B7 ' + pctText));
      } else {
        pctEl.textContent = pctText;
      }
      if (progress < 1) requestAnimationFrame(tick);
    });
  }, delay);
}

function renderAirtimeBars(animate) {
  el('airtime-bars').innerHTML = MOCK.airtime.airtime_utilization.map((r, idx) => {
    const bc = bandClass[r.band] || 'band-5';
    const inUse = r.tx + r.rx;
    const cl = r.clients || 0;
    const clLabel = cl === 1 ? '1 client' : cl + ' clients';

    return `<div class="airtime-bar-row">
      <div class="airtime-bar-header">
        <span class="airtime-band-label ${bc}">${r.band} &middot; ch ${r.channel}</span>
        <span class="airtime-band-pct"><span class="airtime-client-count">${clLabel}</span> &middot; ${animate ? '0% in use' : inUse + '% in use'}</span>
      </div>
      <div class="airtime-track"
           onmouseenter="showAirtimeTooltip(event, ${idx})"
           onmouseleave="hideTooltip()">
        <div class="airtime-stacked">
          <div class="airtime-seg airtime-tx" style="width:${animate ? 0 : r.tx}%" data-target="${r.tx}"></div>
          <div class="airtime-seg airtime-rx" style="width:${animate ? 0 : r.rx}%" data-target="${r.rx}"></div>
          <div class="airtime-seg airtime-wifi-int" style="width:${animate ? 0 : r.wifi_int}%" data-target="${r.wifi_int}"></div>
          <div class="airtime-seg airtime-non-wifi-int" style="width:${animate ? 0 : r.non_wifi_int}%" data-target="${r.non_wifi_int}"></div>
        </div>
      </div>
    </div>`;
  }).join('');

  if (animate) {
    requestAnimationFrame(() => {
      const rows = document.querySelectorAll('.airtime-bar-row');
      MOCK.airtime.airtime_utilization.forEach((r, i) => {
        if (!rows[i]) return;
        rows[i].querySelectorAll('.airtime-seg').forEach(seg => {
          setTimeout(() => { seg.style.width = seg.dataset.target + '%'; }, 120);
        });
        const pct = rows[i].querySelector('.airtime-band-pct');
        if (pct) animatePct(pct, 0, r.tx + r.rx, 120);
      });
    });
  }
}

function updateAirtimeMock() {
  MOCK.airtime.airtime_utilization = MOCK.airtime.airtime_utilization.map(r => {
    // Nudge each component by a small random delta, keep total = 100
    const delta = () => Math.round((Math.random() - 0.5) * 6);
    let tx  = Math.max(2,  Math.min(40, r.tx  + delta()));
    let rx  = Math.max(1,  Math.min(30, r.rx  + delta()));
    let wi  = Math.max(0,  Math.min(25, r.wifi_int     + delta()));
    let nwi = Math.max(0,  Math.min(20, r.non_wifi_int + delta()));
    const used = tx + rx + wi + nwi;
    const avail = Math.max(5, 100 - used);
    // Re-normalize to exactly 100
    const total = tx + rx + wi + nwi + avail;
    const scale = 100 / total;
    tx  = Math.round(tx  * scale);
    rx  = Math.round(rx  * scale);
    wi  = Math.round(wi  * scale);
    nwi = Math.round(nwi * scale);
    // Occasionally drift client count by +/-1
    let clients = r.clients || 0;
    if (Math.random() < 0.15) clients = Math.max(0, clients + (Math.random() < 0.5 ? 1 : -1));
    return { ...r, tx, rx, wifi_int: wi, non_wifi_int: nwi, available: 100 - tx - rx - wi - nwi, clients };
  });
}

function renderDevices() {
  renderAirtimeBars(true);

  el('airtime-legend').innerHTML =
    `<div class="airtime-legend-item"><div class="al-sw al-tx"></div>Tx</div>
     <div class="airtime-legend-item"><div class="al-sw al-rx"></div>Rx</div>
     <div class="airtime-legend-item"><div class="al-sw al-wifi-int"></div>WiFi Int.</div>
     <div class="airtime-legend-item"><div class="al-sw al-non-wifi"></div>Non-WiFi</div>
     <div class="airtime-legend-item"><div class="al-sw al-avail"></div>Available</div>`;

  // Realtime update every 5 seconds — update widths in-place so CSS transitions animate smoothly
  setInterval(() => {
    const rows = document.querySelectorAll('.airtime-bar-row');
    const prevTotals = MOCK.airtime.airtime_utilization.map(r => r.tx + r.rx);
    updateAirtimeMock();
    MOCK.airtime.airtime_utilization.forEach((r, i) => {
      if (!rows[i]) return;
      const segs = rows[i].querySelectorAll('.airtime-seg');
      const vals = [r.tx, r.rx, r.wifi_int, r.non_wifi_int];
      segs.forEach((seg, j) => { seg.style.width = vals[j] + '%'; });
      const pct = rows[i].querySelector('.airtime-band-pct');
      if (pct) animatePct(pct, prevTotals[i], r.tx + r.rx, 0);
      const clSpan = rows[i].querySelector('.airtime-client-count');
      if (clSpan) clSpan.textContent = (r.clients === 1 ? '1 client' : (r.clients || 0) + ' clients');
    });
  }, 5000);
}

function showAirtimeTooltip(event, idx) {
  const radio = MOCK.airtime.airtime_utilization[idx];
  const inUse = radio.tx + radio.rx;
  showTooltip(
    `<div class="tt-title">${radio.band} &mdash; ch ${radio.channel}</div>` +
    ttRow('Transmit (Tx)', radio.tx + '%') +
    ttRow('Receive (Rx)', radio.rx + '%') +
    ttRow('WiFi Interference', radio.wifi_int + '%') +
    ttRow('Non-WiFi Int.', radio.non_wifi_int + '%') +
    ttRow('Available', radio.available + '%') +
    `<hr class="tt-divider">` +
    ttRow('Total in use', inUse + '%')
  );
}

/* ===== System Health Gauge Animation ===== */
(function initHealthAnimation() {
  // CPU + Temp state
  let cpuTarget = 23, cpuCurrent = 23;
  let tempCurrent = 58;
  let cpuSpikeTimer = 0;

  // Flash + RAM state (slow drift with occasional excursions)
  let flashTarget = 34, flashCurrent = 34;
  let ramTarget = 61, ramCurrent = 61;
  let excursionTimer = 0;
  let excursionActive = null; // null, 'flash', 'ram', or 'temp'

  // Every 1s: update CPU target + occasionally trigger excursions
  setInterval(() => {
    cpuSpikeTimer++;
    // CPU spikes
    if (Math.random() < 0.2 || cpuSpikeTimer > 8) {
      cpuSpikeTimer = 0;
      cpuTarget = Math.min(100, 23 + 30 + Math.random() * 55);
    } else {
      cpuTarget = 23 + (Math.random() - 0.3) * 15;
    }
    cpuTarget = Math.max(5, Math.min(100, cpuTarget));

    // Flash/RAM jitter (small drift)
    flashTarget += (Math.random() - 0.5) * 2;
    ramTarget += (Math.random() - 0.5) * 3;

    // Occasional excursion into warning/critical zones (~every 15-25s)
    excursionTimer++;
    if (!excursionActive && excursionTimer > 15 && Math.random() < 0.15) {
      excursionTimer = 0;
      const pick = Math.random();
      if (pick < 0.35) {
        // Temp excursion: CPU pegs high, temp climbs to 115-122°C
        excursionActive = 'temp';
        cpuTarget = 95 + Math.random() * 5;
      } else if (pick < 0.65) {
        // RAM excursion: spikes to 90-97%
        excursionActive = 'ram';
        ramTarget = 90 + Math.random() * 7;
      } else {
        // Flash excursion: spikes to 86-94%
        excursionActive = 'flash';
        flashTarget = 86 + Math.random() * 8;
      }
      // Auto-recover after 4-8 seconds
      setTimeout(() => {
        if (excursionActive === 'temp') cpuTarget = 23;
        if (excursionActive === 'ram') ramTarget = 61 + Math.random() * 5;
        if (excursionActive === 'flash') flashTarget = 34 + Math.random() * 3;
        excursionActive = null;
      }, 4000 + Math.random() * 4000);
    }

    // Clamp
    flashTarget = Math.max(25, Math.min(96, flashTarget));
    ramTarget = Math.max(50, Math.min(98, ramTarget));
  }, 1000);

  // Smooth animation at 30fps
  setInterval(() => {
    // CPU lerp
    cpuCurrent += (cpuTarget - cpuCurrent) * 0.15;
    // Temp correlates with CPU, lags behind
    const tempTarget = 58 + (cpuCurrent - 23) * 0.75; // steeper slope for excursions
    tempCurrent += (tempTarget - tempCurrent) * 0.06;
    // Flash + RAM lerp (slower)
    flashCurrent += (flashTarget - flashCurrent) * 0.08;
    ramCurrent += (ramTarget - ramCurrent) * 0.08;

    MOCK.device.cpu_pct = Math.round(cpuCurrent);
    MOCK.device.cpu_temp_c = Math.round(tempCurrent);
    MOCK.device.flash_pct = Math.round(flashCurrent);
    MOCK.device.mem_pct = Math.round(ramCurrent);

    drawNeedleGauge('gauge-cpu', cpuCurrent, 100, { bugs: [] });
    drawNeedleGauge('gauge-cputemp', tempCurrent, 115, {
      max: 125, unit: '°',
      bugs: [
        { value: 115, color: '#f59e0b' },
        { value: 125, color: '#ef4444' }
      ]
    });
    drawNeedleGauge('gauge-flash', flashCurrent, 85, {
      bugs: [
        { value: 85, color: '#f59e0b' },
        { value: 95, color: '#ef4444' }
      ]
    });
    drawNeedleGauge('gauge-mem', ramCurrent, 90, {
      bugs: [
        { value: 90, color: '#f59e0b' },
        { value: 98, color: '#ef4444' }
      ]
    });
  }, 33);
})();

/* ===== Top Active Flows Card ===== */
function formatFlowRate(bps) {
  if (bps >= 1e9) return (bps / 1e9).toFixed(2) + ' Gbps';
  if (bps >= 1e6) return (bps / 1e6).toFixed(1) + ' Mbps';
  if (bps >= 1e3) return (bps / 1e3).toFixed(0) + ' Kbps';
  return bps + ' bps';
}

function renderFlowSparkline(dataPoints, color) {
  const w = 48, h = 16;
  if (!dataPoints || dataPoints.length < 2) return '';
  const stroke = color || 'var(--accent-cyan)';
  const fill = color === 'var(--accent-green)' ? 'rgba(52,211,153,0.12)' : 'rgba(0,200,230,0.12)';
  const min = Math.min(...dataPoints);
  const max = Math.max(...dataPoints);
  const range = max - min || 1;
  const coords = dataPoints.map((val, i) => {
    const x = (i / (dataPoints.length - 1)) * w;
    const y = h - ((val - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyline = coords.join(' ');
  const fillPath = `M${coords[0]} L${polyline} L${w},${h} L0,${h} Z`;
  return `<svg class="tf-sparkline" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${fillPath}" fill="${fill}" />
    <polyline points="${polyline}" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
  </svg>`;
}

function renderTopFlows() {
  const list = el('topflows-list');
  if (!list) return;
  const sorted = MOCK.flows.slice().sort((a, b) => b.rx_bps - a.rx_bps);
  const top = sorted.slice(0, 7);

  const countEl = el('topflows-count');
  if (countEl) countEl.textContent = MOCK.flows.length;

  list.innerHTML = top.map(f => `
    <div class="tf-row">
      <div class="tf-header">
        <span class="tf-dest" title="${f.destination}">${f.destination}</span>
        <div class="tf-rate-group">
          <span class="tf-rate">${formatFlowRate(f.rx_bps)}</span>
          ${renderFlowSparkline(f.rateHistory)}
        </div>
      </div>
      <div class="tf-meta">
        <span class="tf-proto-badge ${f.protocol.toLowerCase()}">${f.protocol}</span>
        <span class="tf-app">${f.app_protocol}</span>
        <span class="tf-source">${f.source}</span>
      </div>
    </div>
  `).join('');
}

/* ===== Top Bandwidth Hosts Card ===== */
// Aggregate flows by source device into host objects
const hostMap = {};
function rebuildHostMap() {
  // Clear and re-aggregate
  for (const k in hostMap) delete hostMap[k];
  MOCK.flows.forEach(f => {
    if (!hostMap[f.source]) {
      hostMap[f.source] = { name: f.source, rx_bps: 0, tx_bps: 0, flowCount: 0, rateHistory: [] };
    }
    hostMap[f.source].rx_bps += f.rx_bps;
    hostMap[f.source].flowCount++;
  });
  // Init rate history if missing
  Object.values(hostMap).forEach(h => {
    if (h.rateHistory.length < 12) {
      h.rateHistory = Array.from({ length: 12 }, () => Math.max(0, h.rx_bps + (Math.random() - 0.5) * h.rx_bps * 0.2));
    }
  });
}
rebuildHostMap();

function renderTopHosts() {
  const list = el('tophosts-list');
  if (!list) return;

  // Re-aggregate rates from current flow data
  const agg = {};
  MOCK.flows.forEach(f => {
    if (!agg[f.source]) agg[f.source] = { name: f.source, rx_bps: 0, flowCount: 0 };
    agg[f.source].rx_bps += f.rx_bps;
    agg[f.source].flowCount++;
  });

  // Update hostMap with new rates + history
  Object.entries(agg).forEach(([name, data]) => {
    if (!hostMap[name]) hostMap[name] = { name, rx_bps: 0, flowCount: 0, rateHistory: [] };
    hostMap[name].rx_bps = data.rx_bps;
    hostMap[name].flowCount = data.flowCount;
    hostMap[name].rateHistory.push(data.rx_bps);
    if (hostMap[name].rateHistory.length > 12) hostMap[name].rateHistory.shift();
  });

  const sorted = Object.values(hostMap).sort((a, b) => b.rx_bps - a.rx_bps);
  const top = sorted.slice(0, 7);

  const countEl = el('tophosts-count');
  if (countEl) countEl.textContent = Object.keys(hostMap).length;

  list.innerHTML = top.map(h => `
    <div class="tf-row">
      <div class="tf-header">
        <span class="tf-dest tf-host-name" title="${h.name}">${h.name}</span>
        <div class="tf-rate-group">
          <span class="tf-rate tf-host-rate">${formatFlowRate(h.rx_bps)}</span>
          ${renderFlowSparkline(h.rateHistory, 'var(--accent-green)')}
        </div>
      </div>
      <div class="tf-meta">
        <span class="tf-flow-count">${h.flowCount} flow${h.flowCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  `).join('');
}

// Animate flows + hosts: drift rates + update sparklines every 5s
(function initFlowAnimation() {
  setInterval(() => {
    MOCK.flows.forEach(f => {
      const drift = 1 + (Math.random() - 0.5) * 0.3;
      f.rx_bps = Math.max(1000, f.rx_bps * drift);
      f.rateHistory.shift();
      f.rateHistory.push(f.rx_bps);
    });
    renderTopFlows();
    renderTopHosts();
    // Drift mwan latencies + increment uptimes
    const mw = MOCK.mwan;
    const iwan  = mw.interfaces.wan;
    const iwwan = mw.interfaces.wwan;
    iwan.latency_ms  = Math.max(1, iwan.latency_ms  + (Math.random() - 0.5) * 1.0);
    iwwan.latency_ms = Math.max(10, iwwan.latency_ms + (Math.random() - 0.5) * 6.0);
    iwan.latencyHistory.shift();  iwan.latencyHistory.push(iwan.latency_ms);
    iwwan.latencyHistory.shift(); iwwan.latencyHistory.push(iwwan.latency_ms);
    if (iwan.state  === 'online') iwan.uptime_secs  += 5;
    if (iwwan.state === 'online') iwwan.uptime_secs += 5;
    renderMWAN();
  }, 5000);
})();

/* ===== Multi-WAN Card ===== */

// Map rDNS registrable domain → human carrier name.
// Production: PTR lookup on interface IP via resolveip / nslookup, then run through here.
// See README for open engineering question on carrier name sourcing (CDT vs rDNS vs modem AT).
function rdnsToCarrier(hostname) {
  if (!hostname) return '';
  const parts  = hostname.split('.');
  if (parts.length < 2) return '';
  const domain = parts.slice(-2).join('.').toLowerCase();
  const ISP_MAP = {
    // Fiber / DSL / Cable
    'consolidated.net':  'Consolidated Communications',
    'comcast.net':       'Comcast',
    'xfinity.com':       'Xfinity',
    'att.net':           'AT&T',
    'sbcglobal.net':     'AT&T',
    'bellsouth.net':     'AT&T',
    'att.com':           'AT&T',
    'spectrum.com':      'Spectrum',
    'charter.com':       'Spectrum',
    'rr.com':            'Spectrum',
    'twc.com':           'Spectrum',
    'twcable.com':       'Spectrum',
    'cox.net':           'Cox',
    'cox.com':           'Cox',
    'centurylink.net':   'CenturyLink',
    'centurylink.com':   'CenturyLink',
    'lumen.com':         'Lumen',
    'qwest.net':         'Lumen',
    'frontier.com':      'Frontier',
    'frontiernet.net':   'Frontier',
    'windstream.net':    'Windstream',
    'windstream.com':    'Windstream',
    'optimum.net':       'Optimum',
    'optonline.net':     'Optimum',
    'cablevision.com':   'Optimum',
    'suddenlink.net':    'Optimum',
    'mediacom.com':      'Mediacom',
    'mchsi.com':         'Mediacom',
    'tds.net':           'TDS Telecom',
    'rcn.net':           'RCN',
    'earthlink.net':     'EarthLink',
    'midco.net':         'Midco',
    'wowway.net':        'WOW!',
    'wow-net.net':       'WOW!',
    'cincinnati.com':    'Cincinnati Bell',
    'hawaiiantel.net':   'Hawaiian Telcom',
    // Cellular / LTE
    'vzwentp.net':       'Verizon',
    'verizon.net':       'Verizon',
    'vzw.net':           'Verizon',
    'mycingular.net':    'AT&T Mobility',
    'tmobile.com':       'T-Mobile',
    'tmo.net':           'T-Mobile',
    't-mobile.com':      'T-Mobile',
    'sprint.com':        'T-Mobile',
    'uscellular.net':    'UScellular',
    'uscc.net':          'UScellular',
  };
  return ISP_MAP[domain] || ''; // blank fallback — show nothing rather than a confusing fragment
}

function formatMWANUptime(secs) {
  if (!secs || secs < 0) return '0s';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMWANEventDate(epoch) {
  const d = new Date(epoch * 1000);
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const hh  = String(d.getHours()).padStart(2, '0');
  const mm  = String(d.getMinutes()).padStart(2, '0');
  return `${mon} ${day}, ${hh}:${mm}`;
}

function formatMWANDuration(secs) {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function mwanPolicyLabel(policy) {
  if (policy === 'wwan_only') return 'LTE ACTIVE';
  return 'STANDBY';
}

function renderMWANIfacePanel(panelEl, iface, isActiveRouter) {
  const stateClass    = iface.state || 'disabled';
  // 'connecting' maps to the dialing CSS class (amber pulse) but displays as "DIALING"
  const stateCssClass = stateClass === 'connecting' ? 'connecting' : stateClass;
  const stateLabel    = stateClass === 'connecting' ? 'DIALING' : stateClass.toUpperCase();
  const lossWarnClass = iface.loss_pct > 5 ? 'loss-crit' : iface.loss_pct > 1 ? 'loss-warn' : '';
  // Sparkline muted when interface is online but not the active router (backup mode)
  const isDimmed      = !isActiveRouter && iface.state === 'online';
  const latColor      = iface.latency_ms > 150 ? 'var(--accent-red)'
                      : isDimmed               ? 'var(--text-muted)'
                      : iface.latency_ms > 50  ? 'var(--accent-amber)'
                      : iface.sparklineColor || 'var(--accent-amber)';
  const uptimeLabel   = (iface.state === 'online')
    ? `Up ${formatMWANUptime(iface.uptime_secs)}`
    : iface.offline_secs
      ? `Offline ${formatMWANUptime(iface.offline_secs)} ago`
      : 'Offline';
  const techLabel = iface.access_tech || iface.device;
  const techClass = 'media-' + techLabel.toLowerCase().replace(/\./g, '').replace(/\s/g, '');
  // WWAN only: modem model shown above the bottom row
  const modelLine = iface.model
    ? `<div class="mwan-iface-device">${iface.model}</div>`
    : '';
  const carrierLabel = rdnsToCarrier(iface.rdns_hostname);

  panelEl.innerHTML = `
    <div class="mwan-iface-header">
      <div class="mwan-state-dot ${stateCssClass}"></div>
      <span class="mwan-iface-name">${iface.name}</span>
      <div class="mwan-lat-group">
        <span class="mwan-lat-val" style="color:${latColor}">${iface.latency_ms.toFixed(1)}ms</span>
        ${renderFlowSparkline(iface.latencyHistory, latColor)}
      </div>
    </div>
    <div class="mwan-iface-row2">
      <span class="wan-interface-badge ${techClass}">${techLabel}</span>
      <span class="mwan-state-badge ${stateCssClass}">${stateLabel}</span>
      <div class="mwan-metric-chip ${lossWarnClass}">
        <span class="chip-label">loss</span>
        <span class="chip-val">${iface.loss_pct}%</span>
      </div>
      <span class="mwan-uptime">${uptimeLabel}</span>
    </div>
    <div class="mwan-iface-bottom">
      <span class="mwan-iface-device" title="${iface.rdns_hostname || ''}">${carrierLabel}</span>
      ${iface.ip_addr ? `<span class="mwan-iface-ip">${iface.ip_addr}</span>` : ''}
    </div>
  `;
}

function renderMWAN() {
  const mw = MOCK.mwan;

  // Policy badge
  const badge = el('mwan-policy-badge');
  if (badge) badge.textContent = mwanPolicyLabel(mw.active_policy);

  // Display states map directly from mwan3track: online / offline / connecting (→ DIALING) / disabled
  // Sparkline muting is separate: WWAN is dimmed whenever it's not the active router.
  const wwanIsActiveRouter = mw.active_policy === 'wwan_only';

  // Interface panels
  const panelWan  = el('mwan-panel-wan');
  const panelWwan = el('mwan-panel-wwan');
  if (panelWan)  renderMWANIfacePanel(panelWan,  mw.interfaces.wan,  true);
  if (panelWwan) renderMWANIfacePanel(panelWwan, mw.interfaces.wwan, wwanIsActiveRouter);

  // Failover events
  const evList = el('mwan-events-list');
  if (evList) {
    const iconMap = {
      failover:       { cls: 'failover',       tag: '<i class="fa-solid fa-arrow-down"></i>' },
      backup_up:      { cls: 'backup-up',      tag: '<i class="fa-solid fa-arrow-up"></i>'   },
      recovery:       { cls: 'recovery',       tag: '<i class="fa-solid fa-arrow-up"></i>'   },
      backup_standby: { cls: 'backup-standby', tag: '<i class="fa-solid fa-minus"></i>'      },
    };
    evList.innerHTML = mw.failover_events.map(ev => {
      const icon = iconMap[ev.event_type] || iconMap.recovery;
      const dur  = formatMWANDuration(ev.duration_secs);
      const durHtml    = dur ? `<span class="mwan-event-dur">${dur}</span>` : '';
      const dialupHtml = ev.dialup_secs ? `<span class="mwan-event-dur">+${ev.dialup_secs}s</span>` : '';
      return `
        <div class="mwan-event-row">
          <span class="mwan-event-icon ${icon.cls}">${icon.tag}</span>
          <span class="mwan-event-path">
            <span class="ev-probe">${ev.probe_label}</span>
          </span>
          <span class="mwan-event-ts">${formatMWANEventDate(ev.epoch)}</span>
          ${durHtml}${dialupHtml}
        </div>
      `;
    }).join('');
  }

  // 30-day usage bar
  const total = mw.usage_30d.wan_secs + mw.usage_30d.wwan_secs + mw.usage_30d.offline_secs;
  const wanPct  = total > 0 ? (mw.usage_30d.wan_secs  / total * 100).toFixed(1) : 0;
  const wwanPct = total > 0 ? (mw.usage_30d.wwan_secs / total * 100).toFixed(1) : 0;
  const wanDays  = (mw.usage_30d.wan_secs  / 86400).toFixed(1);
  const wwanDays = (mw.usage_30d.wwan_secs / 86400).toFixed(1);

  const barWan  = el('mwan-bar-wan');
  const barWwan = el('mwan-bar-wwan');
  if (barWan)  barWan.style.width  = wanPct  + '%';
  if (barWwan) barWwan.style.width = wwanPct + '%';

  const legend = el('mwan-usage-legend');
  if (legend) {
    legend.innerHTML = `
      <div class="mwan-legend-item">
        <div class="mwan-legend-dot wan"></div>
        WAN <span class="mwan-legend-days">${wanDays}d</span>
      </div>
      <div class="mwan-legend-item">
        <div class="mwan-legend-dot wwan"></div>
        LTE <span class="mwan-legend-days">${wwanDays}d</span>
      </div>
      ${mw.usage_30d.offline_secs > 0 ? `
      <div class="mwan-legend-item">
        <div class="mwan-legend-dot offline"></div>
        Offline <span class="mwan-legend-days">${(mw.usage_30d.offline_secs/86400).toFixed(1)}d</span>
      </div>` : ''}
    `;
  }
}

/* ===== Port Status Card ===== */

function formatPortSpeed(mbps) {
  if (mbps >= 1000) return (mbps / 1000) + ' Gbps';
  return mbps + ' Mbps';
}

/* SVG rear-panel diagram (per-model, distinct connector shapes) */

/* Connector shape dimensions (proportional to real mm at ~3px/mm)
   RJ-45:  11.7 x 8.3 mm  -> 35 x 25 px  (ratio 1.41:1)
   RJ-11:   9.7 x 6.6 mm  -> 29 x 20 px  (ratio 1.46:1)
   USB-A:  13.1 x 5.5 mm  -> 39 x 17 px  (ratio 2.38:1)
   SFP+:   14.0 x 9.0 mm  -> 42 x 27 px  (ratio 1.56:1)
*/
const PORT_SHAPES = {
  'rj45':  { w: 35, h: 25 },
  'rj11':  { w: 29, h: 20 },
  'usb-a': { w: 39, h: 17 },
  'sfp':   { w: 42, h: 27 },
  'usb-c': { w: 25, h: 8 },
};

/* Draw a single connector shape, returns SVG markup */
function svgPortShape(connector, px, py, fillColor, portId, ariaLabel) {
  const s = PORT_SHAPES[connector] || PORT_SHAPES['rj45'];
  const common = `data-port-id="${portId}" tabindex="0" role="button" aria-label="${ariaLabel}" aria-describedby="port-detail-${portId}"`;
  const stroke = 'var(--border-bright)';
  let out = `<g ${common}>`;

  if (connector === 'rj45') {
    // RJ-45: rectangle with latch tab at top
    out += `<rect x="${px}" y="${py}" width="${s.w}" height="${s.h}" rx="2" ry="2"
      fill="${fillColor}" stroke="${stroke}" stroke-width="1.2"/>`;
    const tabW = 10, tabH = 4;
    out += `<rect x="${px + s.w/2 - tabW/2}" y="${py - tabH + 1}" width="${tabW}" height="${tabH}" rx="1"
      fill="${fillColor}" stroke="${stroke}" stroke-width="0.8"/>`;

  } else if (connector === 'rj11') {
    // RJ-11: narrower rectangle with latch tab at top
    out += `<rect x="${px}" y="${py}" width="${s.w}" height="${s.h}" rx="2" ry="2"
      fill="${fillColor}" stroke="${stroke}" stroke-width="1.2"/>`;
    const tabW = 8, tabH = 3;
    out += `<rect x="${px + s.w/2 - tabW/2}" y="${py - tabH + 1}" width="${tabW}" height="${tabH}" rx="1"
      fill="${fillColor}" stroke="${stroke}" stroke-width="0.8"/>`;

  } else if (connector === 'usb-a') {
    // USB Type-A: wide flat rectangle
    out += `<rect x="${px}" y="${py}" width="${s.w}" height="${s.h}" rx="1.5" ry="1.5"
      fill="${fillColor}" stroke="${stroke}" stroke-width="1.2"/>`;

  } else if (connector === 'sfp') {
    // SFP+ cage: rectangle with bail latch handle at bottom
    out += `<rect x="${px}" y="${py}" width="${s.w}" height="${s.h}" rx="2" ry="2"
      fill="${fillColor}" stroke="${stroke}" stroke-width="1.2"/>`;
    const bailW = 14, bailH = 5;
    out += `<rect x="${px + s.w/2 - bailW/2}" y="${py + s.h - 1}" width="${bailW}" height="${bailH}" rx="1.5"
      fill="${fillColor}" stroke="${stroke}" stroke-width="0.8"/>`;

  } else if (connector === 'usb-c') {
    // USB Type-C: slim pill shape
    out += `<rect x="${px}" y="${py}" width="${s.w}" height="${s.h}" rx="4" ry="4"
      fill="${fillColor}" stroke="${stroke}" stroke-width="1"/>`;
  }

  out += '</g>';
  return out;
}

function svgPortDiagram(modelKey, portStates, profile) {
  const ports = profile.ports;

  // Group ports by connector type for visual clustering
  const groups = [];
  let currentGroup = null;
  ports.forEach(prof => {
    if (!currentGroup || currentGroup.connector !== prof.connector) {
      currentGroup = { connector: prof.connector, ports: [] };
      groups.push(currentGroup);
    }
    currentGroup.ports.push(prof);
  });

  // Calculate total width: sum of port widths + intra-group gaps + inter-group gaps
  const intraGap = 6;    // gap between ports within a group
  const interGap = 16;   // gap between groups (with separator)
  const bodyPadX = 14;   // padding inside device body
  let totalPortsW = 0;
  groups.forEach((g, gi) => {
    g.ports.forEach((p, pi) => {
      totalPortsW += PORT_SHAPES[p.connector].w;
      if (pi < g.ports.length - 1) totalPortsW += intraGap;
    });
    if (gi < groups.length - 1) totalPortsW += interGap;
  });

  const bodyW = totalPortsW + bodyPadX * 2;
  const w = bodyW + 20;
  // Body height: port shapes sit in the upper zone, labels in the lower zone inside the body
  const maxPortH = Math.max(...ports.map(p => PORT_SHAPES[p.connector].h));
  const labelZone = 12;  // space for label text inside body
  const portPadY = 6;    // padding above ports
  const bodyH = portPadY + maxPortH + 4 + labelZone + 4;
  const h = bodyH + 14;  // minimal margin around body
  const bodyX = 7, bodyY = 7;

  let svg = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;max-height:80px;">`;

  // Device body (rear panel silhouette)
  svg += `<rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="5" ry="5"
    fill="var(--bg-input)" stroke="var(--border-light)" stroke-width="1.2"/>`;

  // Place ports group by group
  let curX = bodyX + bodyPadX;
  groups.forEach((g, gi) => {
    g.ports.forEach((prof, pi) => {
      const s = PORT_SHAPES[prof.connector];
      const ps = portStates.find(p => p.id === prof.id);
      const state = ps ? ps.link_state : 'down';
      const isUp = state === 'up';

      // Port fill color: simple green/red for all ports
      const fillColor = isUp ? 'var(--accent-green)' : 'var(--accent-red)';

      // Position port in upper zone of body, vertically centered within the port area
      const portAreaTop = bodyY + portPadY;
      const py = portAreaTop + (maxPortH - s.h) / 2;

      // Build aria label
      let ariaDesc = prof.label + ': ' + (isUp ? 'connected' : 'disconnected');
      if (isUp && ps && ps.speed_mbps) ariaDesc += ', ' + formatPortSpeed(ps.speed_mbps);
      if (ps && ps.fxs) ariaDesc += ', ' + (ps.fxs.registered ? 'registered' : 'unregistered');
      if (ps && ps.lte) ariaDesc += ', ' + ps.lte.carrier + ' ' + ps.lte.access_tech;

      svg += svgPortShape(prof.connector, curX, py, fillColor, prof.id, ariaDesc);

      // Status glyph inside the shape (WCAG 1.4.1) — clean SVG paths, no font dependency
      const glyphX = curX + s.w / 2;
      const glyphY = py + s.h / 2;
      const hs = Math.min(s.h - 4, 11) / 2;
      const sw = Math.max(1.2, hs * 0.28);
      if (isUp) {
        const pts = `${glyphX - hs*0.50},${glyphY} ${glyphX - hs*0.08},${glyphY + hs*0.52} ${glyphX + hs*0.52},${glyphY - hs*0.46}`;
        svg += `<polyline points="${pts}" fill="none" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" aria-hidden="true"/>`;
      } else {
        svg += `<line x1="${glyphX - hs*0.46}" y1="${glyphY - hs*0.46}" x2="${glyphX + hs*0.46}" y2="${glyphY + hs*0.46}" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" pointer-events="none" aria-hidden="true"/>`;
        svg += `<line x1="${glyphX + hs*0.46}" y1="${glyphY - hs*0.46}" x2="${glyphX - hs*0.46}" y2="${glyphY + hs*0.46}" stroke="#fff" stroke-width="${sw}" stroke-linecap="round" pointer-events="none" aria-hidden="true"/>`;
      }

      // Port label INSIDE the body, below the port shapes
      const labelY = bodyY + portPadY + maxPortH + 4 + labelZone / 2 + 1;
      svg += `<text x="${curX + s.w / 2}" y="${labelY}" text-anchor="middle" dominant-baseline="central"
        font-size="7.5" font-family="'Poppins', sans-serif" font-weight="600" letter-spacing="0.2"
        fill="var(--text-primary)" pointer-events="none">${prof.label}</text>`;

      curX += s.w + intraGap;
    });

    // Inter-group separator (thin vertical line)
    if (gi < groups.length - 1) {
      curX -= intraGap;
      const sepX = curX + interGap / 2;
      svg += `<line x1="${sepX}" y1="${bodyY + 6}" x2="${sepX}" y2="${bodyY + bodyH - 4}"
        stroke="var(--border-light)" stroke-width="0.7" stroke-dasharray="2,2"/>`;
      curX += interGap;
    }
  });

  svg += '</svg>';
  return svg;
}

/* Render port status (both Simple and Advanced views) */
function renderPortStatus() {
  const model = MOCK.device.model;
  const profile = MODEL_PORT_PROFILES[model] || MODEL_PORT_PROFILES['SDG-8733v'];
  const ports = MOCK.ports;

  // Model badge
  const badge = el('port-model-badge');
  if (badge) badge.textContent = profile.label;

  // --- Simple view: compact list ---
  const listEl = el('port-list');
  if (listEl) {
    listEl.innerHTML = ports.map(p => {
      const prof = profile.ports.find(pp => pp.id === p.id);
      if (!prof) return '';
      const state = p.link_state;
      const isUp = state === 'up';

      // Role-specific simple view content
      let stateLabel, rightInfo = '';
      if (prof.role === 'fxs') {
        stateLabel = p.fxs && p.fxs.registered ? 'REGISTERED' : 'UNREGISTERED';
        rightInfo = p.fxs ? p.fxs.extension : '';
      } else if (prof.role === 'lte_modem') {
        stateLabel = isUp ? 'CONNECTED' : 'EMPTY';
        rightInfo = p.lte ? p.lte.model : '';
      } else {
        stateLabel = isUp ? 'UP' : 'DOWN';
        rightInfo = p.connected_device ? p.connected_device.hostname : '';
      }

      const listMediaHtml = p.media_type
        ? `<span class="wan-interface-badge media-${p.media_type.toLowerCase().replace(/\./g,'').replace(/\s/g,'')}">${p.media_type}</span>`
        : '';

      return `<div class="port-list-item" role="listitem">
        <div class="state-dot ${state}"><span class="sr-only">${isUp ? 'Online' : 'Offline'}</span></div>
        <span class="port-list-label">${prof.label}</span>
        ${listMediaHtml || `<span class="port-list-type">${prof.type}</span>`}
        <span class="state-badge ${state}">${stateLabel}</span>
        ${rightInfo ? `<span class="port-list-device">${rightInfo}</span>` : ''}
      </div>`;
    }).join('');
  }

  // --- Advanced view: SVG diagram + detail grid ---
  const svgWrap = el('port-svg-wrap');
  if (svgWrap) svgWrap.innerHTML = svgPortDiagram(model, ports, profile);

  const detailEl = el('port-detail-grid');
  if (detailEl) {
    detailEl.innerHTML = ports.map(p => {
      const prof = profile.ports.find(pp => pp.id === p.id);
      if (!prof) return '';
      const state = p.link_state;
      const isUp = state === 'up';

      // --- FXS telephony card ---
      if (prof.role === 'fxs') {
        const fxs = p.fxs || {};
        const regState = fxs.registered ? 'Registered' : 'Unregistered';
        const hookClass = fxs.hook_state === 'off-hook' ? 'offhook' : 'onhook';
        const hookLabel = fxs.hook_state === 'off-hook' ? 'Off-hook' : 'On-hook';
        return `<div class="port-detail-item" id="port-detail-${prof.id}" data-port-id="${prof.id}" role="listitem" tabindex="0">
          <div class="port-detail-header">
            <div class="state-dot ${fxs.registered ? 'up' : 'down'}"><span class="sr-only">${regState}</span></div>
            <span class="port-detail-name">${prof.label}</span>
            <span class="state-badge ${fxs.registered ? 'up' : 'down'}">${regState.toUpperCase()}</span>
          </div>
          <div class="port-detail-row"><span class="port-dk">Status</span><span class="port-dv"><span class="fxs-hook-badge ${hookClass}">${hookLabel}</span></span></div>
          <div class="port-detail-row"><span class="port-dk">Ext</span><span class="port-dv">${fxs.extension || '\u2014'}</span></div>
        </div>`;
      }

      // --- LTE modem card ---
      if (prof.role === 'lte_modem') {
        const lte = p.lte;
        if (!isUp || !lte) {
          return `<div class="port-detail-item" id="port-detail-${prof.id}" data-port-id="${prof.id}" role="listitem" tabindex="0">
            <div class="port-detail-header">
              <div class="state-dot down"><span class="sr-only">Empty</span></div>
              <span class="port-detail-name">${prof.label}</span>
              <span class="state-badge down">EMPTY</span>
            </div>
            <div class="port-detail-row"><span class="port-dk">Status</span><span class="port-dv">No modem</span></div>
          </div>`;
        }
        const bars = lte.signal_bars || 0;
        const signalHtml = '<span class="lte-signal-bars">' +
          [1,2,3,4].map(i => `<span class="lte-bar${i <= bars ? ' active' : ''}"></span>`).join('') +
          '</span>';
        return `<div class="port-detail-item" id="port-detail-${prof.id}" data-port-id="${prof.id}" role="listitem" tabindex="0">
          <div class="port-detail-header">
            <div class="state-dot up"><span class="sr-only">Connected</span></div>
            <span class="port-detail-name">${prof.label}</span>
            <span class="state-badge up">CONNECTED</span>
          </div>
          <div class="port-detail-row"><span class="port-dk">Carrier</span><span class="port-dv">${lte.carrier} ${signalHtml}</span></div>
          <div class="port-detail-row"><span class="port-dk">Tech</span><span class="port-dv">${lte.access_tech}</span></div>
        </div>`;
      }

      // --- Ethernet (LAN/WAN) card ---
      const speedLabel = isUp ? formatPortSpeed(p.speed_mbps) : '\u2014';
      const clockSvg = `<svg class="port-last-icon" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.2"/><line x1="6" y1="6" x2="6" y2="3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="6" y1="6" x2="8.5" y2="7.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
      const deviceHtml = p.connected_device
        ? (isUp
            ? `<span>${p.connected_device.hostname}</span>`
            : `<span class="port-last-device">${clockSvg}Last: ${p.connected_device.hostname}</span>`)
        : '\u2014';
      const poeHtml = p.poe
        ? `<div class="port-detail-row"><span class="port-dk">PoE</span><span class="port-dv">${p.poe.watts}W</span></div>`
        : '';
      const mediaHtml = p.media_type
        ? `<span class="wan-interface-badge media-${p.media_type.toLowerCase().replace(/\./g,'').replace(/\s/g,'')}">${p.media_type}</span>`
        : '';

      return `<div class="port-detail-item" id="port-detail-${prof.id}" data-port-id="${prof.id}" role="listitem" tabindex="0">
        <div class="port-detail-header">
          <div class="state-dot ${state}"><span class="sr-only">${isUp ? 'Online' : 'Offline'}</span></div>
          <span class="port-detail-name">${prof.label}</span>
          ${mediaHtml}
          <span class="state-badge ${state}">${isUp ? 'UP' : 'DOWN'}</span>
        </div>
        <div class="port-detail-row"><span class="port-dk">Speed</span><span class="port-dv">${speedLabel}</span></div>
        <div class="port-detail-row"><span class="port-dk">${prof.role === 'wan' ? 'ISP' : 'Device'}</span><span class="port-dv${prof.role === 'wan' ? ' port-dv-isp' : ''}">${deviceHtml}</span></div>
        ${poeHtml}
      </div>`;
    }).join('');
  }

  // Tooltip handlers for SVG port shapes AND detail cards (MAC/IP in tooltip)
  /* 4-column table tooltip helpers (Infrastructure mode style) */
  const r1 = (l, v) => `<tr><td class="ptt-lbl">${l}</td><td class="ptt-val" colspan="3">${v}</td></tr>`;
  const r2 = (l1, v1, l2, v2) => `<tr><td class="ptt-lbl">${l1}</td><td class="ptt-val">${v1}</td><td class="ptt-lbl">${l2}</td><td class="ptt-val">${v2}</td></tr>`;

  function bindPortTooltip(elem, p, prof) {
    const showHandler = () => {
      const isUp = p.link_state === 'up';
      let html = `<div class="ptt-title">${prof.label} <span class="ptt-type">${prof.type}</span></div>`;

      if (prof.role === 'wan') {
        // WAN: quad first row (Type | State | Speed | Duplex) + ISP full-width + IP | MAC
        const speed  = isUp && p.speed_mbps ? formatPortSpeed(p.speed_mbps) : '\u2014';
        const duplex = isUp && p.duplex ? (p.duplex === 'full' ? 'Full' : 'Half') : '\u2014';
        const dev    = p.connected_device;
        html += `<div class="ptt-wan-grid">
          <div class="ptt-pair"><span class="ptt-lbl">Type</span><span class="ptt-pv">${prof.type}</span></div>
          <div class="ptt-pair"><span class="ptt-lbl">State</span><span class="ptt-pv">${isUp ? 'UP' : 'DOWN'}</span></div>
          <div class="ptt-pair"><span class="ptt-lbl">Speed</span><span class="ptt-pv">${speed}</span></div>
          <div class="ptt-pair"><span class="ptt-lbl">Duplex</span><span class="ptt-pv">${duplex}</span></div>
        </div>`;
        html += '<table class="ptt-tbl">';
        html += `<tr><td class="ptt-lbl">ISP</td><td class="ptt-val ptt-isp-val" colspan="3">${dev ? dev.hostname : '\u2014'}</td></tr>`;
        html += r2('IP', dev && dev.ip ? dev.ip : '\u2014', 'MAC', dev ? dev.mac : '\u2014');
        html += '</table>';

      } else if (prof.role === 'fxs' && p.fxs) {
        html += '<table class="ptt-tbl">';
        html += r2('State', p.fxs.registered ? 'Registered' : 'Unregistered',
                    'Status', p.fxs.hook_state);
        html += r1('Extension', p.fxs.extension || '\u2014');
        html += '</table>';

      } else if (prof.role === 'lte_modem' && p.lte) {
        html += '<table class="ptt-tbl">';
        html += r1('Type', prof.type);
        html += r2('Modem', p.lte.model, 'Carrier', p.lte.carrier);
        html += r2('Tech', p.lte.access_tech, 'Signal', p.lte.signal_bars + '/4 bars');
        if (p.lte.ip) html += r1('IP', p.lte.ip);
        html += '</table>';

      } else {
        // LAN Ethernet — 4-row compact layout
        html += '<table class="ptt-tbl">';
        const duplex = (isUp && p.duplex) ? (p.duplex === 'full' ? 'Full' : 'Half') : '\u2014';
        const speed  = (isUp && p.speed_mbps) ? formatPortSpeed(p.speed_mbps) : '\u2014';
        const dev    = p.connected_device;
        html += r2('Type',   prof.type,                     'State',  isUp ? 'UP' : 'DOWN');
        html += r2('Speed',  speed,                         'Duplex', duplex);
        html += r2('Device', dev ? dev.hostname : '\u2014', 'IP',     dev && dev.ip ? dev.ip : '\u2014');
        html += r1('MAC',    dev ? dev.mac : '\u2014');
        html += '</table>';
      }

      showTooltip(html);
      elem.setAttribute('aria-describedby', 'tooltip');
    };
    const hideHandler = () => {
      hideTooltip();
      elem.removeAttribute('aria-describedby');
    };
    elem.addEventListener('mouseenter', showHandler);
    elem.addEventListener('focus', showHandler);
    elem.addEventListener('mouseleave', hideHandler);
    elem.addEventListener('blur', hideHandler);
  }

  // Bind tooltips on SVG port shapes
  if (svgWrap) {
    svgWrap.querySelectorAll('[data-port-id]').forEach(group => {
      const pid = group.getAttribute('data-port-id');
      const p = ports.find(pp => pp.id === pid);
      const prof = profile.ports.find(pp => pp.id === pid);
      if (p && prof) bindPortTooltip(group, p, prof);
    });
  }

  // Bind tooltips on detail cards
  if (detailEl) {
    detailEl.querySelectorAll('[data-port-id]').forEach(card => {
      const pid = card.getAttribute('data-port-id');
      const p = ports.find(pp => pp.id === pid);
      const prof = profile.ports.find(pp => pp.id === pid);
      if (p && prof) bindPortTooltip(card, p, prof);
    });
  }

  // --- Port event history log (initial render only) ---
  // Subsequent events are prepended by prependPortEvent() to preserve role="log" live region
  const evList = el('port-events-list');
  if (evList && !evList.dataset.initialized) {
    evList.innerHTML = MOCK.portEvents.map(ev => buildPortEventRow(ev)).join('');
    evList.dataset.initialized = '1';
  }
}

/* Build a single port event row element */
function buildPortEventRow(ev) {
  const ago = formatTimeAgo(ev.epoch);
  return `<div class="port-event-row">
    <div class="port-event-dot ${ev.state}" aria-hidden="true"></div>
    <span class="port-event-time">${ago}</span>
    <span class="port-event-port">${ev.port}</span>
    <span class="port-event-state">${ev.detail}</span>
  </div>`;
}

/* Prepend a new event to the live log region without replacing existing entries */
function prependPortEvent(ev) {
  const evList = el('port-events-list');
  if (!evList) return;
  const row = document.createElement('div');
  row.innerHTML = buildPortEventRow(ev);
  evList.insertBefore(row.firstElementChild, evList.firstChild);
  // Trim to max 20 entries to prevent unbounded growth
  while (evList.children.length > 20) evList.removeChild(evList.lastChild);
}

/* Format epoch to relative time string */
function formatTimeAgo(epoch) {
  const secs = Math.floor(Date.now() / 1000 - epoch);
  if (secs < 60)   return secs + 's ago';
  if (secs < 3600) return Math.floor(secs / 60) + 'm ago';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h ago';
  return Math.floor(secs / 86400) + 'd ago';
}

/* Port state drift animation (mock data) */
(function initPortAnimation() {
  setInterval(function() {
    const profile = MODEL_PORT_PROFILES[MOCK.device.model];
    if (!profile) return;
    let changed = false;
    MOCK.ports.forEach(function(p) {
      const prof = profile.ports.find(pp => pp.id === p.id);
      if (!prof) return;

      // FXS: toggle hook state (5% chance)
      if (prof.role === 'fxs' && p.fxs && Math.random() < 0.05) {
        p.fxs.hook_state = p.fxs.hook_state === 'on-hook' ? 'off-hook' : 'on-hook';
        const ev = { epoch: Date.now()/1000, port: prof.label, state: 'up', detail: p.fxs.hook_state === 'off-hook' ? 'Off-hook' : 'On-hook' };
        MOCK.portEvents.unshift(ev);
        prependPortEvent(ev);
        changed = true;
        const announceEl = el('port-status-announce');
        if (announceEl) announceEl.textContent = prof.label + ' is now ' + p.fxs.hook_state;
      }
      // LTE modem: drift signal bars (8% chance)
      else if (prof.role === 'lte_modem' && p.lte && Math.random() < 0.08) {
        p.lte.signal_bars = Math.max(1, Math.min(4, p.lte.signal_bars + (Math.random() < 0.5 ? 1 : -1)));
        changed = true;
      }
      // Ethernet: toggle link state (2% chance)
      else if ((prof.role === 'lan' || prof.role === 'wan') && Math.random() < 0.02) {
        const wasUp = p.link_state === 'up';
        p.link_state = wasUp ? 'down' : 'up';
        if (!wasUp) p.speed_mbps = prof.max_speed_mbps;
        const evDetail = p.link_state === 'up' ? 'Link up at ' + formatPortSpeed(p.speed_mbps) : 'Link down';
        const ev = { epoch: Date.now()/1000, port: prof.label, state: p.link_state, detail: evDetail };
        MOCK.portEvents.unshift(ev);
        prependPortEvent(ev);
        changed = true;
        const announceEl = el('port-status-announce');
        if (announceEl) announceEl.textContent = prof.label + ' port is now ' + p.link_state;
      }
    });
    if (changed) renderPortStatus();
  }, 8000);
})();

/* ===== Speedtest History Card ===== */
let speedtestMode = 'raw'; // 'pct' or 'raw'

function setSpeedtestMode(mode) {
  const dlRate = MOCK.wan.service_rate_dl || 0;
  const ulRate = MOCK.wan.service_rate_ul || 0;
  if (mode === 'pct' && (!dlRate || !ulRate)) return; // no rates configured
  speedtestMode = mode;
  el('sth-btn-pct').classList.toggle('active', mode === 'pct');
  el('sth-btn-raw').classList.toggle('active', mode === 'raw');
  renderSpeedtestHistory();
}

function renderSpeedtestHistory() {
  const canvas = el('speedtest-canvas');
  if (!canvas) return;

  const dlRate = MOCK.wan.service_rate_dl || 0;
  const ulRate = MOCK.wan.service_rate_ul || 0;
  const hasRates = dlRate > 0 && ulRate > 0;

  // Enable/disable pct button and label raw button Gbps vs Mbps
  const pctBtn = el('sth-btn-pct');
  const rawBtn = el('sth-btn-raw');
  const maxRate = Math.max(dlRate, ulRate);
  rawBtn.textContent = maxRate > 999 ? 'Gbps' : 'Mbps';
  if (hasRates) {
    pctBtn.disabled = false;
    pctBtn.title = '';
  } else {
    pctBtn.disabled = true;
    pctBtn.title = 'Service rate not configured';
    if (speedtestMode === 'pct') { speedtestMode = 'raw'; }
  }
  el('sth-btn-pct').classList.toggle('active', speedtestMode === 'pct');
  el('sth-btn-raw').classList.toggle('active', speedtestMode === 'raw');

  const usePct = speedtestMode === 'pct' && hasRates;

  // One test per calendar day — keep the most recent for each day, oldest→newest
  const seen = new Set();
  const tests = MOCK.speedtest
    .filter(s => !s.birth_certificate)
    .filter(s => {
      const day = new Date(s.epoch * 1000).toDateString();
      if (seen.has(day)) return false;
      seen.add(day);
      return true;
    })
    .slice(0, 30)
    .reverse();
  const n = tests.length;

  // Size canvas — widen if there are many data points for scrolling
  const scrollEl = el('sth-scroll');
  const wrapW = scrollEl.clientWidth || 400;
  const H = scrollEl.clientHeight || 230;
  const minGroupW = 52; // minimum pixels per day group for readability
  const naturalW = n * minGroupW + 58; // 58 = left pad + right pad
  const W = Math.max(wrapW, naturalW);
  const needsScroll = W > wrapW;
  scrollEl.classList.toggle('no-scroll', !needsScroll);
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Layout padding — reduce left pad on narrow screens where fixed Y-axis overlay handles labels
  const useOverlay = window.innerWidth < 1280;
  const pad = { top: 10, right: 8, bottom: useOverlay ? 36 : 50, left: useOverlay ? 10 : 50 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  // Y axis max
  // In pct mode: fixed 0–100% axis so bars reflect true plan utilisation.
  // In raw mode: scale to 1.3× the data max so bars sit well below the ceiling
  // and the two modes look visually distinct even when service_rate ≈ data_max.
  let yMax;
  if (usePct) {
    yMax = 100;
  } else {
    const rawMax = Math.max(...tests.map(t => t.download_mbps));
    const headroom = rawMax * 1.30;
    const ceil = rawMax <= 1000
      ? Math.ceil(headroom / 100) * 100
      : Math.ceil(headroom / 1000) * 1000;
    yMax = Math.min(ceil, 10000); // never exceed 10G
  }
  const yScale = cH / yMax;

  // Grid lines + Y labels
  const gridSteps = 4;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.font = '11px "Poppins", sans-serif';
  for (let i = 0; i <= gridSteps; i++) {
    const val = yMax * i / gridSteps;
    const y = pad.top + cH - val * yScale;
    ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    let lbl;
    if (usePct) {
      lbl = i === 0 ? '0' : Math.round(val) + '%';
    } else {
      lbl = val === 0 ? '0' : val >= 1000 ? (val / 1000).toFixed(0) + 'G' : Math.round(val) + '';
    }
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.fillText(lbl, pad.left - 5, y);
  }

  // Populate fixed Y-axis overlay (for mobile scroll)
  const yaxisEl = el('sth-yaxis');
  if (yaxisEl) {
    yaxisEl.innerHTML = '';
    for (let i = gridSteps; i >= 0; i--) {
      const val = yMax * i / gridSteps;
      let lbl;
      if (usePct) {
        lbl = i === 0 ? '0' : Math.round(val) + '%';
      } else {
        lbl = val === 0 ? '0' : val >= 1000 ? (val / 1000).toFixed(0) + 'G' : Math.round(val) + '';
      }
      const tick = document.createElement('div');
      tick.className = 'sth-yaxis-tick';
      tick.textContent = lbl;
      yaxisEl.appendChild(tick);
    }
  }

  // Service rate dotted lines (DL and UL plan limits)
  if (!usePct && hasRates) {
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    // DL service rate line (cyan)
    const dlLineY = pad.top + cH - Math.min(dlRate, yMax) * yScale;
    ctx.strokeStyle = 'rgba(0,200,230,0.50)';
    ctx.beginPath(); ctx.moveTo(pad.left, dlLineY); ctx.lineTo(pad.left + cW, dlLineY); ctx.stroke();
    // DL rate label
    ctx.font = '9px "Poppins", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,200,230,0.65)';
    const dlLabel = dlRate >= 1000 ? (dlRate / 1000).toFixed(0) + 'G DL' : dlRate + 'M DL';
    ctx.fillText(dlLabel, pad.left + 4, dlLineY - 2);
    // UL service rate line (green)
    const ulLineY = pad.top + cH - Math.min(ulRate, yMax) * yScale;
    ctx.strokeStyle = 'rgba(52,211,153,0.50)';
    ctx.beginPath(); ctx.moveTo(pad.left, ulLineY); ctx.lineTo(pad.left + cW, ulLineY); ctx.stroke();
    // UL rate label
    ctx.fillStyle = 'rgba(52,211,153,0.65)';
    const ulLabel = ulRate >= 1000 ? (ulRate / 1000).toFixed(0) + 'G UL' : ulRate + 'M UL';
    ctx.fillText(ulLabel, pad.left + 4, ulLineY - 2);
    ctx.setLineDash([]);
  }

  // Bars
  const groupW = cW / n;
  const gap    = groupW * 0.22;          // breathing room between groups
  const barW   = Math.max(2, (groupW - gap * 2) / 2 - 1.5);
  const baseY  = pad.top + cH;
  // Helper: simple rectangular bar (squared-off caps)
  function drawBar(x, y, w, h) {
    ctx.fillRect(x, y, w, h);
  }

  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const labelEvery = Math.max(1, Math.floor(n / 6));

  canvas._bars = [];

  tests.forEach((st, i) => {
    const dlVal = usePct ? Math.min(100, st.download_mbps / dlRate * 100) : st.download_mbps;
    const ulVal = usePct ? Math.min(100, st.upload_mbps  / ulRate * 100) : st.upload_mbps;
    const gx  = pad.left + i * groupW + gap;
    const dlH = Math.max(2, dlVal * yScale);
    const ulH = Math.max(2, ulVal * yScale);
    const dlX = gx;
    const ulX = gx + barW + 1.5;
    const cx  = gx + barW;  // center of pair for label alignment

    // DL bar (cyan) with rounded top
    ctx.fillStyle = 'rgba(0,200,230,0.82)';
    drawBar(dlX, baseY - dlH, barW, dlH);

    // UL bar (green) with rounded top
    ctx.fillStyle = 'rgba(52,211,153,0.82)';
    drawBar(ulX, baseY - ulH, barW, ulH);

    // X-axis labels: day abbrev + m/d, shown every ~7th + first + last
    if (i === 0 || i === n - 1 || i % labelEvery === 0) {
      const d   = new Date(st.epoch * 1000);
      const day = DAYS[d.getDay()];
      const date = (d.getMonth() + 1) + '/' + d.getDate();
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle    = 'rgba(255,255,255,0.60)';
      ctx.font         = '11px monospace';
      ctx.fillText(day, cx, baseY + 6);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font      = '10px monospace';
      ctx.fillText(date, cx, baseY + 20);
    }

    canvas._bars.push({
      x1: gx, x2: gx + barW * 2 + 1.5 + gap,
      dlVal, ulVal, usePct, st
    });
  });

  // Attach mouse events once
  if (!canvas._sthEvents) {
    canvas._sthEvents = true;
    canvas.addEventListener('mousemove', onSthMouseMove);
    canvas.addEventListener('mouseleave', () => { el('speedtest-tooltip').style.display = 'none'; });
  }

  // Scroll to right (most recent) if scrollable
  if (needsScroll) {
    requestAnimationFrame(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; });
  }
}

function onSthMouseMove(e) {
  const canvas = e.currentTarget;
  const rect   = canvas.getBoundingClientRect();
  const mx     = e.clientX - rect.left;
  const bar    = (canvas._bars || []).find(b => mx >= b.x1 && mx <= b.x2);
  const tt     = el('speedtest-tooltip');
  if (!bar) { tt.style.display = 'none'; return; }

  const st   = bar.st;
  const d    = new Date(st.epoch * 1000);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const unit = bar.usePct ? '%' : ' Mbps';
  const fmtDL = bar.usePct ? bar.dlVal.toFixed(1) + '%' : (bar.dlVal >= 1000 ? (bar.dlVal/1000).toFixed(2)+' Gbps' : Math.round(bar.dlVal)+' Mbps');
  const fmtUL = bar.usePct ? bar.ulVal.toFixed(1) + '%' : (bar.ulVal >= 1000 ? (bar.ulVal/1000).toFixed(2)+' Gbps' : Math.round(bar.ulVal)+' Mbps');

  tt.innerHTML =
    `<div class="sth-tt-date">${date}</div>` +
    `<div class="sth-tt-server">${st.server}</div>` +
    `<div class="sth-tt-row"><span class="sth-tt-dl">DL</span> ${fmtDL} <span class="sth-tt-grade" data-grade="${st.download_bufferbloat_grade}">${st.download_bufferbloat_grade}</span></div>` +
    `<div class="sth-tt-row"><span class="sth-tt-ul">UL</span> ${fmtUL} <span class="sth-tt-grade" data-grade="${st.upload_bufferbloat_grade}">${st.upload_bufferbloat_grade}</span></div>` +
    `<div class="sth-tt-lat">${st.idle_avg.toFixed(0)} ms idle &nbsp;/&nbsp; ${st.download_avg.toFixed(0)} ms loaded</div>`;
  tt.style.display = 'block';

  // Position: follow cursor, flip left if near right edge
  const wrap    = canvas.parentElement;
  const wRect   = wrap.getBoundingClientRect();
  const ttW     = 170;
  let tx = e.clientX - wRect.left + 12;
  let ty = e.clientY - wRect.top  - 10;
  if (tx + ttW > wRect.width - 4) tx = e.clientX - wRect.left - ttW - 12;
  if (ty < 0) ty = 4;
  tt.style.left = tx + 'px';
  tt.style.top  = ty + 'px';
}

// --- Grab-to-scroll for speedtest chart ---
(function initSthGrabScroll() {
  const scrollEl = document.getElementById('sth-scroll');
  if (!scrollEl) return;
  let isDragging = false, startX = 0, startScrollLeft = 0;
  scrollEl.addEventListener('mousedown', e => {
    if (scrollEl.classList.contains('no-scroll')) return;
    isDragging = true;
    startX = e.pageX;
    startScrollLeft = scrollEl.scrollLeft;
    scrollEl.style.cursor = 'grabbing';
    scrollEl.style.userSelect = 'none';
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    scrollEl.scrollLeft = startScrollLeft - (e.pageX - startX);
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    scrollEl.style.cursor = '';
    scrollEl.style.userSelect = '';
  });
})();

/* ===== Real-time Throughput Graph ===== */
const THROUGHPUT_POINTS = 160;
const throughputDL = new Array(THROUGHPUT_POINTS).fill(30);
const throughputUL = new Array(THROUGHPUT_POINTS).fill(5);
let throughputT    = 0;
let throughputScrollOffset = 0;
let throughputRAF  = null;
let lastThroughputTime = 0;
const THROUGHPUT_SPEED = 4; // data points per second
let currentMaxY = 0;         // smoothly interpolated Y-axis ceiling

// Format Mbps value for display — Gbps when >= 1000
function formatThroughput(mbps) {
  if (mbps >= 1000) return { val: (mbps / 1000).toFixed(2), unit: 'Gbps' };
  if (mbps >= 100)  return { val: mbps.toFixed(0), unit: 'Mbps' };
  return { val: mbps.toFixed(1), unit: 'Mbps' };
}

// Bursty traffic state machine: models real residential usage
const tpState = {
  dl: { mode: 'idle', remaining: 0, level: 50, target: 50 },
  ul: { mode: 'idle', remaining: 0, level: 10, target: 10 }
};

function nextTrafficState(s, isUl) {
  const r = Math.random();
  if (s.remaining > 0) {
    s.remaining--;
  } else {
    // Pick next state
    if (s.mode === 'idle') {
      if (r < 0.04) {
        // Big burst: large file download, OS update, game install
        s.mode = 'burst'; s.remaining = 8 + Math.floor(Math.random() * 25);
        s.target = isUl ? (600 + Math.random() * 1400) : (2500 + Math.random() * 5500);
      } else if (r < 0.12) {
        // Streaming: video call, Netflix, Twitch
        s.mode = 'stream'; s.remaining = 30 + Math.floor(Math.random() * 100);
        s.target = isUl ? (3 + Math.random() * 25) : (15 + Math.random() * 60);
      } else if (r < 0.25) {
        // Web browsing: quick page loads
        s.mode = 'browse'; s.remaining = 2 + Math.floor(Math.random() * 4);
        s.target = isUl ? (10 + Math.random() * 60) : (100 + Math.random() * 600);
      } else {
        // Stay idle a bit longer
        s.remaining = 3 + Math.floor(Math.random() * 15);
        s.target = isUl ? (1 + Math.random() * 8) : (3 + Math.random() * 25);
      }
    } else {
      // Return to idle
      s.mode = 'idle'; s.remaining = 4 + Math.floor(Math.random() * 20);
      s.target = isUl ? (1 + Math.random() * 8) : (3 + Math.random() * 25);
    }
  }
  // Ease toward target with mode-appropriate speed + jitter
  const ease = s.mode === 'burst' ? 0.35 : s.mode === 'browse' ? 0.5 : s.mode === 'stream' ? 0.06 : 0.12;
  const jitterScale = s.mode === 'idle' ? 15 : s.target * 0.08;
  const jitter = (Math.random() - 0.5) * jitterScale;
  s.level += (s.target - s.level) * ease + jitter;
  s.level = Math.max(0, Math.min(isUl ? 2000 : 8000, s.level));
}

function generateThroughputPoint(t) {
  nextTrafficState(tpState.dl, false);
  nextTrafficState(tpState.ul, true);
  return { dl: tpState.dl.level, ul: tpState.ul.level };
}

function drawThroughput(timestamp) {
  throughputRAF = requestAnimationFrame(drawThroughput);

  const dt = Math.min((timestamp - lastThroughputTime) / 1000, 0.1);
  lastThroughputTime = timestamp;

  throughputScrollOffset += THROUGHPUT_SPEED * dt;
  while (throughputScrollOffset >= 1) {
    throughputScrollOffset -= 1;
    throughputT++;
    const pt = generateThroughputPoint(throughputT);
    throughputDL.push(pt.dl);  throughputDL.shift();
    throughputUL.push(pt.ul);  throughputUL.shift();
  }

  const canvas = el('throughput-canvas');
  if (!canvas || !canvas.width) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Y-axis layout
  const padL = 40;  // left padding for Y-axis labels
  const padB = 12;  // bottom padding so "0" label isn't clipped
  const chartW = W - padL;
  const chartH = H - padB;

  // Clip to canvas
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  const dlMax = Math.max(...throughputDL);
  const ulMax = Math.max(...throughputUL);
  const targetMaxY = Math.max(dlMax, ulMax) * 1.25;
  if (currentMaxY === 0) currentMaxY = targetMaxY;
  currentMaxY += (targetMaxY - currentMaxY) * 0.06;
  const maxY = currentMaxY;
  const N    = THROUGHPUT_POINTS;
  const step = chartW / (N - 2);
  const offsetPx = throughputScrollOffset * step;

  // Draw Y-axis grid lines and labels
  const ySteps = 4;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.font = '10px "Poppins", sans-serif';
  for (let i = 0; i <= ySteps; i++) {
    const val = maxY * i / ySteps;
    const y = chartH - (val / maxY) * chartH * 0.92;
    // Grid line
    ctx.strokeStyle = i === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W, y); ctx.stroke();
    // Label
    if (maxY > 0) {
      let lbl;
      if (val === 0) lbl = '0';
      else if (val >= 1000) lbl = (val / 1000).toFixed(1) + 'G';
      else if (val >= 1) lbl = Math.round(val) + '';
      else lbl = val.toFixed(1);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '11px "Poppins", sans-serif';
      ctx.fillText(lbl, padL - 8, Math.round(y));
    }
  }

  function drawTrace(data, strokeColor, r, g, b, yMult) {
    const pts = [];
    for (let i = 0; i < N; i++) {
      pts.push([
        padL + i * step - offsetPx,
        chartH - Math.min(1, data[i] / maxY * yMult) * chartH * 0.92
      ]);
    }
    const grad = ctx.createLinearGradient(0, 0, 0, chartH);
    grad.addColorStop(0, `rgba(${r},${g},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0.03)`);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], chartH);
    pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(pts[N - 1][0], chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < N; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  drawTrace(throughputDL, '#00C8E6', 0, 200, 230, 1.0);
  drawTrace(throughputUL, '#34d399', 52, 211, 153, 1.0);

  ctx.restore();

  // Current value labels
  const last = N - 1;
  const dlFmt = formatThroughput(throughputDL[last]);
  const ulFmt = formatThroughput(throughputUL[last]);
  const dlEl = el('throughput-dl-val');   if (dlEl) dlEl.textContent = dlFmt.val;
  const ulEl = el('throughput-ul-val');   if (ulEl) ulEl.textContent = ulFmt.val;
  const dlUnitEl = el('throughput-dl-unit'); if (dlUnitEl) dlUnitEl.textContent = dlFmt.unit;
  const ulUnitEl = el('throughput-ul-unit'); if (ulUnitEl) ulUnitEl.textContent = ulFmt.unit;
}

function initThroughputCanvas() {
  const canvas = el('throughput-canvas');
  if (!canvas) return;
  const card = el('card-wanperf');
  const canvasCol = canvas.parentElement;
  canvas.width  = canvasCol.clientWidth - 4;
  canvas.height = Math.max(60, canvasCol.clientHeight - 11);

  // Pre-fill with realistic data
  for (let i = 0; i < THROUGHPUT_POINTS; i++) {
    throughputT++;
    const pt = generateThroughputPoint(throughputT);
    throughputDL.push(pt.dl); throughputDL.shift();
    throughputUL.push(pt.ul); throughputUL.shift();
  }

  if (throughputRAF) cancelAnimationFrame(throughputRAF);
  lastThroughputTime = performance.now();
  throughputRAF = requestAnimationFrame(drawThroughput);
}

/* ===== Page Subtitle ===== */
function renderPageSubtitle() {
  const sub = el('pageSubtitle');
  if (!sub) return;
  const d = MOCK.device;
  const w = MOCK.wan;
  sub.textContent = `${d.model} \u00b7 ${d.mac} \u00b7 ${w.ip_addr}`;
}

/* ===== Init ===== */
function init() {
  loadView();
  if (currentView === 'basic') {
    cardLayout = JSON.parse(JSON.stringify(LAYOUT_BASIC));
  } else {
    loadLayout();
  }
  applyLayout();
  renderPageSubtitle();
  renderWAN();
  renderDevice();
  renderAlarms();
  renderEvents();
  renderTimeline(currentHistorySpan);
  renderWANPerf();
  renderQoE();
  renderDevices();
  renderSpeedtestHistory();
  renderTopFlows();
  renderTopHosts();
  renderMWAN();
  renderPortStatus();
  // Canvas needs layout to be done first
  requestAnimationFrame(() => initThroughputCanvas());
  // Deep link: check URL hash for page routing (handled in each page's script)
}

/* ===== Tile Drag & Drop + Hide ===== */
const hiddenTiles = new Set(JSON.parse(localStorage.getItem('dashboard_hidden_tiles') || '[]'));
const addedTiles   = new Set(JSON.parse(localStorage.getItem('dashboard_added_tiles')   || '[]'));

/* ===== Add Tile Picker ===== */
const AVAILABLE_TILES = [
  { id: 'tile-sfp',       title: 'SFP / Optical Power',       icon: 'fa-solid fa-fire-flame-curved', desc: 'Tx/Rx power (dBm), temperature, bias current, voltage', strip: '.strip-3', accentColor: 'var(--accent-cyan)' },
  { id: 'tile-voip',      title: 'VoIP Line Status',           icon: 'fa-solid fa-phone',             desc: 'SIP registration + hook state per FXS port',            strip: '.strip-3', accentColor: 'var(--accent-green)' },
  { id: 'tile-clients',   title: 'Connected Clients by Band',  icon: 'fa-solid fa-laptop',            desc: 'Client count and RSSI per radio band',                  strip: '.strip-3', accentColor: 'var(--accent-cyan)' },
  { id: 'tile-sysres',    title: 'System Resources',           icon: 'fa-solid fa-microchip',         desc: 'CPU %, memory used/free, system uptime',                strip: '.strip-3', accentColor: 'var(--accent-purple)' },
  { id: 'tile-vpn',       title: 'VPN Status',                 icon: 'fa-solid fa-lock',              desc: 'WireGuard + Tailscale tunnel state and peer count',     strip: '.strip-3', accentColor: 'var(--accent-blue)' },
  { id: 'tile-poe',       title: 'PoE / PSE Port Status',      icon: 'fa-solid fa-plug',              desc: 'Per-port power delivery, wattage, and fault state',     strip: '.strip-3', accentColor: 'var(--accent-amber)' },
];

function openTilePicker() {
  const overlay = el('tile-picker-overlay');
  if (!overlay) return;

  // Populate available tiles
  const grid = el('tilePickerGrid');
  grid.innerHTML = '';
  AVAILABLE_TILES.forEach(t => {
    if (addedTiles.has(t.id)) return; // already on dashboard
    grid.appendChild(buildTileOption(t, false));
  });
  if (!grid.children.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);font-size:11px;padding:8px 0;">All available tiles are already on the dashboard.</div>';
  }

  // Populate restore section for hidden tiles
  const restoreSection = el('tilePickerRestore');
  const restoreGrid    = el('tilePickerRestoreGrid');
  restoreGrid.innerHTML = '';
  hiddenTiles.forEach(id => {
    const tDef = AVAILABLE_TILES.find(t => t.id === id);
    const label = tDef ? tDef.title : id.replace('tile-', '').replace(/-/g, ' ');
    const icon  = tDef ? tDef.icon : 'fa-solid fa-square';
    const pseudo = { id, title: label, icon, desc: 'Previously hidden tile', strip: tDef ? tDef.strip : '.strip-3', accentColor: tDef ? tDef.accentColor : 'var(--text-muted)' };
    restoreGrid.appendChild(buildTileOption(pseudo, true));
  });
  restoreSection.classList.toggle('hidden', hiddenTiles.size === 0);

  overlay.classList.remove('hidden');
}

function closeTilePicker() {
  const overlay = el('tile-picker-overlay');
  if (overlay) overlay.classList.add('hidden');
}

function buildTileOption(t, isRestore) {
  const card = document.createElement('div');
  card.className = 'tile-option';

  const iconEl = document.createElement('div');
  iconEl.className = 'tile-option-icon';
  iconEl.innerHTML = `<i class="${t.icon}" style="color:${t.accentColor}"></i>`;

  const titleEl = document.createElement('div');
  titleEl.className = 'tile-option-title';
  titleEl.textContent = t.title;

  const descEl = document.createElement('div');
  descEl.className = 'tile-option-desc';
  descEl.textContent = t.desc;

  const btn = document.createElement('button');
  btn.className = isRestore ? 'tile-option-restore' : 'tile-option-add';
  btn.textContent = isRestore ? 'Restore' : '+ Add';
  btn.addEventListener('click', () => {
    if (isRestore) restoreTile(t.id);
    else           addTile(t);
    closeTilePicker();
  });

  card.append(iconEl, titleEl, descEl, btn);
  return card;
}

function addTile(tileDef) {
  addedTiles.add(tileDef.id);
  localStorage.setItem('dashboard_added_tiles', JSON.stringify([...addedTiles]));

  const strip = document.querySelector(tileDef.strip);
  const placeholder = el('card-placeholder');
  if (!strip) return;

  const card = document.createElement('div');
  card.className = 'card';
  card.id = tileDef.id;

  card.innerHTML = `
    <div class="card-label">
      <span class="card-label-dot" style="background:${tileDef.accentColor}"></span>
      ${tileDef.title}
    </div>
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:20px 0;">
      <i class="${tileDef.icon}" style="font-size:28px;color:${tileDef.accentColor};opacity:0.6;"></i>
      <div style="font-size:11px;color:var(--text-muted);text-align:center;">${tileDef.desc}</div>
      <div style="font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:0.08em;">Coming Soon</div>
    </div>`;

  // Add grip icon for drag discoverability
  const grip = document.createElement('span');
  grip.className = 'card-grip';
  grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
  grip.title = 'Drag to reorder';
  card.appendChild(grip);

  // Animate in
  card.style.opacity = '0';
  card.style.transform = 'scale(0.9)';
  if (placeholder && placeholder.parentElement === strip) {
    strip.insertBefore(card, placeholder);
  } else {
    strip.appendChild(card);
  }
  requestAnimationFrame(() => {
    card.style.transition = 'opacity 0.3s ease, transform 0.3s cubic-bezier(0.34,1.4,0.64,1)';
    card.style.opacity = '1';
    card.style.transform = 'scale(1)';
  });
}

function restoreTile(id) {
  hiddenTiles.delete(id);
  localStorage.setItem('dashboard_hidden_tiles', JSON.stringify([...hiddenTiles]));
  const tileDef = AVAILABLE_TILES.find(t => t.id === id);
  if (tileDef) addTile(tileDef);
}

// Wire up placeholder card click and close handlers
document.addEventListener('DOMContentLoaded', () => {
  const placeholder = el('card-placeholder');
  if (placeholder) {
    placeholder.addEventListener('click', e => {
      if (!e.target.closest('.card-dismiss-btn')) openTilePicker();
    });
  }

  el('tilePickerClose').addEventListener('click', closeTilePicker);

  el('tile-picker-overlay').addEventListener('click', e => {
    if (e.target === el('tile-picker-overlay')) closeTilePicker();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeTilePicker();
  });
});

(function initTileDrag() {
  // Inject grip icons into dashboard cards (not StatsView cards)
  document.querySelectorAll('#dashboard-grid .card').forEach(card => {
    if (card.querySelector('.card-grip')) return;
    const grip = document.createElement('span');
    grip.className = 'card-grip';
    grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
    grip.title = 'Drag to reorder';
    card.appendChild(grip);
  });

  // Two separate states: edit mode (wiggle + ✕) and drag mode (tile following pointer)
  let isEditMode = false;
  let isDragging = false;
  let dragCard = null;
  let dragClone = null;
  let dragOriginStrip = null;
  let dragOffX = 0, dragOffY = 0;
  let dragOverCard = null;
  let pressTimer = null;
  let downCard = null;       // card pressed in edit mode (candidate for drag)
  let startX = 0, startY = 0;
  let preMoved = false;      // moved before long-press fired (cancels enter-edit)
  let inDragGesture = false; // moved enough in edit mode to start drag

  function getCards(strip) {
    return [...strip.querySelectorAll(':scope > .card')];
  }

  function getAllCards() {
    return [...document.querySelectorAll('#dashboard-grid > .card')];
  }

  function addDismissBtn(card) {
    if (card.querySelector('.card-dismiss-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'card-dismiss-btn';
    btn.innerHTML = '&#x2715;';
    btn.title = 'Hide tile';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      dismissCard(card);
    });
    card.appendChild(btn);
    requestAnimationFrame(() => btn.classList.add('visible'));
  }

  function removeDismissBtns() {
    document.querySelectorAll('.card-dismiss-btn').forEach(b => b.remove());
  }

  function enterEditMode() {
    isEditMode = true;
    // Restore placeholder card so user can add tiles while in edit mode
    const strip3 = document.getElementById('dashboard-grid');
    if (strip3 && !el('card-placeholder')) {
      const ph = document.createElement('div');
      ph.className = 'card';
      ph.id = 'card-placeholder';
      ph.innerHTML = `<div class="card-label"><span class="card-label-dot" style="background:var(--border-bright)"></span>Custom Tile</div>
<div class="placeholder-content"><div class="placeholder-add-icon"><i class="fa-solid fa-plus-circle"></i></div><div class="placeholder-add-text">Add Tile</div></div>`;
      ph.addEventListener('click', e => { if (!e.target.closest('.card-dismiss-btn')) openTilePicker(); });
      strip3.appendChild(ph);
      // Also inject grip icon
      const grip = document.createElement('span');
      grip.className = 'card-grip';
      grip.innerHTML = '<i class="fa-solid fa-grip-vertical"></i>';
      grip.title = 'Drag to reorder';
      ph.appendChild(grip);
      // Ensure placeholder has a layout position
      if (!cardLayout['card-placeholder']) {
        cardLayout['card-placeholder'] = { col: 3, row: 4, span: 2 };
      }
      applyLayout();
    }
    getAllCards().forEach(c => { c.classList.add('wiggle'); addDismissBtn(c); });
    // Show restore default layout button
    if (!document.getElementById('restore-layout-btn')) {
      const btn = document.createElement('button');
      btn.id = 'restore-layout-btn';
      btn.className = 'restore-layout-btn';
      btn.innerHTML = '<i class="fa-solid fa-rotate-left" style="margin-right:5px;"></i>Restore Default Layout';
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        cardLayout = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
        saveLayout();
        hiddenTiles.clear();
        localStorage.removeItem('dashboard_hidden_tiles');
        applyLayout();
        exitEditMode();
        location.reload();
      });
      const grid = document.getElementById('dashboard-grid');
      if (grid) grid.parentNode.insertBefore(btn, grid);
    }
  }

  function exitEditMode() {
    isEditMode = false;
    if (isDragging) endDrag(true);
    getAllCards().forEach(c => c.classList.remove('wiggle'));
    removeDismissBtns();
    // Remove the temporarily restored placeholder
    const ph = el('card-placeholder');
    if (ph) ph.remove();
    // Remove restore layout button
    const rlb = document.getElementById('restore-layout-btn');
    if (rlb) rlb.remove();
  }

  function dismissCard(card) {
    const id = card.id;
    if (id) {
      hiddenTiles.add(id);
      localStorage.setItem('dashboard_hidden_tiles', JSON.stringify([...hiddenTiles]));
    }
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.88)';
    setTimeout(() => card.remove(), 260);
    if (isDragging && dragCard === card) endDrag(true);
  }

  function startDrag(card, clientX, clientY) {
    isDragging = true;
    dragCard = card;
    dragOriginStrip = document.getElementById('dashboard-grid');
    const rect = card.getBoundingClientRect();
    dragOffX = clientX - rect.left;
    dragOffY = clientY - rect.top;

    dragClone = card.cloneNode(true);
    Object.assign(dragClone.style, {
      position: 'fixed',
      left: rect.left + 'px',
      top: rect.top + 'px',
      width: rect.width + 'px',
      height: rect.height + 'px',
      zIndex: '9000',
      pointerEvents: 'none',
      opacity: '0.92',
      transform: 'scale(1.04) rotate(1deg)',
      transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
      borderRadius: '8px',
      overflow: 'hidden',
    });
    document.body.appendChild(dragClone);
    card.classList.add('drag-source');
    card.classList.remove('wiggle');
    dragOverCard = null;
  }

  // --- Drop indicator ---
  let dropIndicator = null;
  function ensureDropIndicator() {
    if (!dropIndicator) {
      dropIndicator = document.createElement('div');
      dropIndicator.className = 'grid-drop-indicator';
      document.body.appendChild(dropIndicator);
    }
    return dropIndicator;
  }

  function showDropIndicator(col, row, span, isSwap) {
    const ind = ensureDropIndicator();
    const r = getCellRect(col, row, span);
    Object.assign(ind.style, {
      left: r.left + 'px', top: r.top + 'px',
      width: r.width + 'px', height: r.height + 'px',
      position: 'fixed'
    });
    ind.classList.toggle('swap', isSwap);
    ind.classList.add('visible');
  }

  function hideDropIndicator() {
    if (dropIndicator) dropIndicator.classList.remove('visible');
  }

  let dropTarget = { col: 0, row: 0 }; // current hover cell

  function moveDrag(clientX, clientY) {
    dragClone.style.left = (clientX - dragOffX) + 'px';
    dragClone.style.top  = (clientY - dragOffY) + 'px';

    const cell = getCellFromPoint(clientX, clientY);
    const dragPos = cardLayout[dragCard.id];
    const span = dragPos ? dragPos.span : 1;

    // Clamp so card doesn't overflow grid columns
    const clampedCol = Math.min(cell.col, 5 - span);
    const clampedRow = Math.max(1, cell.row);

    dropTarget = { col: clampedCol, row: clampedRow };

    // Check if cell is occupied
    let occupied = false;
    for (let c = clampedCol; c < clampedCol + span; c++) {
      if (findCardAt(c, clampedRow, dragCard.id)) { occupied = true; break; }
    }

    showDropIndicator(clampedCol, clampedRow, span, occupied);
  }

  function endDrag(skipAnimation) {
    isDragging = false;
    hideDropIndicator();

    if (!skipAnimation && dragCard && dragClone && dropTarget.row > 0) {
      const dragId = dragCard.id;
      const dragPos = cardLayout[dragId];
      const span = dragPos ? dragPos.span : 1;
      const newCol = dropTarget.col;
      const newRow = dropTarget.row;

      // Capture pre-move positions for FLIP
      const allCards = getAllCards();
      const firstRects = new Map(allCards.map(c => [c, c.getBoundingClientRect()]));

      // Check for occupied cells and swap if needed
      for (let c = newCol; c < newCol + span; c++) {
        const occupantId = findCardAt(c, newRow, dragId);
        if (occupantId && cardLayout[occupantId]) {
          // Swap: move occupant to dragged card's old position
          cardLayout[occupantId].col = dragPos.col;
          cardLayout[occupantId].row = dragPos.row;
        }
      }

      // Place dragged card at new position
      cardLayout[dragId] = { col: newCol, row: newRow, span: span };
      applyLayout();
      saveLayout();

      // FLIP animate all cards to new positions
      const lastRects = new Map(allCards.map(c => [c, c.getBoundingClientRect()]));
      allCards.forEach(c => {
        if (c === dragCard) return;
        const f = firstRects.get(c), l = lastRects.get(c);
        if (!f || !l) return;
        const dx = f.left - l.left, dy = f.top - l.top;
        if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
        c.style.animationPlayState = 'paused';
        c.style.transition = 'none';
        c.style.transform = `translate(${dx}px,${dy}px)`;
        requestAnimationFrame(() => requestAnimationFrame(() => {
          c.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1)';
          c.style.transform = '';
          setTimeout(() => { c.style.animationPlayState = ''; c.style.transition = ''; }, 300);
        }));
      });

      // Animate clone back to final position
      const finalRect = dragCard.getBoundingClientRect();
      dragClone.style.transition = 'all 0.18s cubic-bezier(0.4,0,0.2,1)';
      dragClone.style.left = finalRect.left + 'px';
      dragClone.style.top  = finalRect.top  + 'px';
      dragClone.style.transform = 'scale(1) rotate(0deg)';
      dragClone.style.opacity = '0';
      setTimeout(() => { if (dragClone) dragClone.remove(); dragClone = null; }, 200);
    } else if (dragClone) {
      dragClone.remove(); dragClone = null;
    }

    if (dragCard) {
      dragCard.classList.remove('drag-source');
      if (isEditMode) dragCard.classList.add('wiggle');
    }
    dragCard = null;
    dragOverCard = null;
    dropTarget = { col: 0, row: 0 };
  }

  document.addEventListener('pointerdown', e => {
    if (e.target.closest('.card-dismiss-btn')) return;
    const card = e.target.closest('.card');

    if (!isEditMode) {
      // Long-press anywhere on a card → enter edit mode (don't start drag yet)
      // But skip if inside a scrollable/interactive region (timeline, charts, buttons)
      if (!card || e.button !== 0) return;
      if (e.target.closest('.timeline-scroll, .sth-chart-wrap, canvas, button, .btn-run-test, .alarm-row, .event-row')) return;
      startX = e.clientX; startY = e.clientY; preMoved = false;
      pressTimer = setTimeout(() => { if (!preMoved) enterEditMode(); }, 250);
    } else {
      // Already in edit mode: pressing outside a card exits; pressing a card arms drag
      if (!card || e.button !== 0) { exitEditMode(); return; }
      downCard = card;
      startX = e.clientX; startY = e.clientY; inDragGesture = false;
    }
  });

  document.addEventListener('pointermove', e => {
    const dx = e.clientX - startX, dy = e.clientY - startY;

    if (!isEditMode) {
      if (Math.abs(dx) + Math.abs(dy) > 6) {
        preMoved = true;
        clearTimeout(pressTimer); pressTimer = null;
      }
    } else if (isDragging) {
      moveDrag(e.clientX, e.clientY);
    } else if (downCard && !inDragGesture) {
      if (Math.abs(dx) + Math.abs(dy) > 8) {
        inDragGesture = true;
        startDrag(downCard, startX, startY);
        moveDrag(e.clientX, e.clientY);
      }
    }
  });

  document.addEventListener('pointerup', () => {
    clearTimeout(pressTimer); pressTimer = null;
    if (isDragging) endDrag();
    downCard = null;
    inDragGesture = false;
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isEditMode) exitEditMode();
  });
})();

document.addEventListener('DOMContentLoaded', init);

// Smooth wheel scrolling for overflow containers
(function() {
  function applySmoothWheel(selector) {
    document.querySelectorAll(selector).forEach(el => {
      let current = el.scrollTop;
      let target  = el.scrollTop;
      let raf     = null;

      function tick() {
        current += (target - current) * 0.15;
        if (Math.abs(target - current) < 0.5) {
          current = target;
          raf = null;
        } else {
          raf = requestAnimationFrame(tick);
        }
        el.scrollTop = current;
      }

      el.addEventListener('wheel', e => {
        e.preventDefault();
        target = Math.max(0, Math.min(el.scrollHeight - el.clientHeight, target + e.deltaY));
        if (!raf) raf = requestAnimationFrame(tick);
      }, { passive: false });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applySmoothWheel('.strip-1 .alarm-list');
    applySmoothWheel('.strip-1 .events-list');
  });
})();

/* =============================================================================
   Easter Egg: Type "comicsans" to toggle Comic Sans mode
   ============================================================================= */
(function() {
  const CODE = 'comicsans';
  let buf = '';
  let active = false;
  let styleEl = null;

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'Escape' && active) {
      active = false;
      if (styleEl) { styleEl.remove(); styleEl = null; }
      console.log('%c Comic Sans mode deactivated ', 'color:#666;font-size:12px;');
      return;
    }
    buf += e.key.toLowerCase();
    if (buf.length > CODE.length) buf = buf.slice(-CODE.length);
    if (buf === CODE) {
      buf = '';
      active = !active;
      if (active) {
        const f = "'Comic Sans MS', 'Comic Sans', cursive";
        styleEl = document.createElement('style');
        styleEl.id = 'comicsans-egg';
        styleEl.textContent =
          ':root{--font-sans:' + f + ';--font-mono:' + f + ';}' +
          'html,body,div,span,p,a,li,ul,button,input,label,h1,h2,h3,h4,h5,h6,td,th,caption,nav,' +
          '.sidebar,.sidebar-nav,.nav-label,.nav-link,.page-title,.topbar,.search-input,' +
          '.card,.card-label,.card-value,.stat-label,.stat-value,.tt-row,.tt-label,.tt-value,' +
          '.pp-node-name,.pp-node-role,.pp-link-label,.pp-link-tooltip,.pp-link-speed,' +
          '.pp-bottleneck-title,.pp-bottleneck-msg,.pp-detail-label,.pp-detail-value,' +
          '.sv-card-title,.sv-card-value,.sv-fd-label,.sv-fd-value' +
          '{font-family:' + f + '!important}';
        document.head.appendChild(styleEl);
        console.log('%c COMIC SANS MODE ACTIVATED ', 'background:#ff69b4;color:#fff;font-family:Comic Sans MS;font-size:24px;padding:8px;border-radius:8px;');
      } else {
        if (styleEl) { styleEl.remove(); styleEl = null; }
        console.log('%c Comic Sans mode deactivated ', 'color:#666;font-size:12px;');
      }
    }
  });
})();
