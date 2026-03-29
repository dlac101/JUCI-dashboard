/* ============================================================
   PathPulse - Network Path Visualization
   Integrated into SmartOS WebUI
   ============================================================ */

// === SVG ICON MAP (line icons, stroke-based, no fill) ===
const PP_ICONS = {
  laptop: `<svg viewBox="0 0 24 24"><path d="M3.5 14V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9"/><path d="M1.5 17.5a1 1 0 0 1 1-1h19a1 1 0 0 1 1 1v0a1.5 1.5 0 0 1-1.5 1.5h-18A1.5 1.5 0 0 1 1.5 17.5z"/></svg>`,
  phone: `<svg viewBox="0 0 24 24"><rect x="7" y="2" width="10" height="20" rx="2.5"/><line x1="10" y1="18" x2="14" y2="18"/></svg>`,
  satellite: `<svg viewBox="0 0 24 24"><circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none"/><path d="M8.5 16.5a5 5 0 0 1 7 0"/><path d="M5.5 13.5a9 9 0 0 1 13 0"/><path d="M2.5 10.5a13 13 0 0 1 19 0"/></svg>`,
  router: `<svg viewBox="0 0 24 24"><rect x="2" y="12" width="20" height="7" rx="1.5"/><circle cx="6" cy="15.5" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="15.5" r="1" fill="currentColor" stroke="none"/><path d="M8 5v7"/><path d="M16 3v9"/></svg>`,
  globe: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><ellipse cx="12" cy="12" rx="4.5" ry="10"/><path d="M2 12h20"/></svg>`
};

// Bottleneck status icons (stroke-based)
const PP_STATUS_ICONS = {
  warning: `<svg viewBox="0 0 24 24" stroke="var(--accent-red)"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  ok: `<svg viewBox="0 0 24 24" stroke="var(--accent-green)"><circle cx="12" cy="12" r="10"/><polyline points="16 9 10.5 15 8 12.5"/></svg>`,
  device: `<svg viewBox="0 0 24 24" stroke="var(--accent-amber)"><rect x="7" y="2" width="10" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>`
};

// Map node types to icons
function ppNodeIcon(type) {
  if (type === 'client-laptop') return PP_ICONS.laptop;
  if (type === 'client-phone') return PP_ICONS.phone;
  if (type === 'sat') return PP_ICONS.satellite;
  if (type === 'hub') return PP_ICONS.router;
  if (type === 'wan') return PP_ICONS.globe;
  return PP_ICONS.laptop;
}

// === SCENARIO DATA ===
const ppScenarios = {
  problem: {
    name: "Problem Network",
    wan: { dl: 932, ul: 931, service: 1000 },
    nodes: [
      { name: "MacBook Pro", role: "Your Device", type: "client-laptop", tip: { conn: "Wi-Fi 6 (802.11ax)", ip: "192.168.1.47", mac: "A8:5C:2C:9D:1B:04" }, tech: { ip: "192.168.1.47", mac: "A8:5C:2C:9D:1B:04", wifiStd: "802.11ax", band: "5 GHz", uptime: null } },
      { name: "Living Room", role: "Satellite", type: "sat", tip: { model: "SDG-8622v", hostname: "livingroom-sat.local", ip: "192.168.1.2", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.2", mac: "00:A1:B2:C3:D4:02", model: "SDG-8622v", firmware: "26.3.2.1", uptime: "14d 7h 22m", cpu: 18, mem: 42 } },
      { name: "Upstairs Office", role: "Satellite", type: "sat", tip: { model: "SDG-8622v", hostname: "office-sat.local", ip: "192.168.1.3", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.3", mac: "00:A1:B2:C3:D4:03", model: "SDG-8622v", firmware: "26.3.2.1", uptime: "14d 7h 22m", cpu: 12, mem: 38 } },
      { name: "Laundry Room", role: "Router", type: "hub", tip: { model: "SDG-8733v", hostname: "router.local", ip: "192.168.1.1", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.1", mac: "00:A1:B2:C3:D4:01", model: "SDG-8733v", firmware: "26.3.2.1", uptime: "14d 7h 23m", cpu: 24, mem: 56 } },
      { name: "Internet", role: "ISP", type: "wan", tip: { isp: "Consolidated Communications", wanType: "XGSPON", linkSpeed: "10 Gbps", service: "1,000 / 1,000 Mbps", ip: "198.51.100.43" }, tech: { ip: "198.51.100.43", gateway: "198.51.100.1", dns: ["8.8.8.8", "8.8.4.4"], wanType: "XGSPON", phyRate: "10 Gbps" } }
    ],
    links: [
      {
        quality: "poor", dl: 85, ul: 62, pct: 9,
        label: "Wi-Fi to satellite",
        badge: "Weak signal",
        rec: "<strong>Weak Wi-Fi signal.</strong> Your MacBook Pro has a poor connection to the Living Room satellite. Try moving closer to the satellite, or make sure there aren't thick walls or large appliances between them.",
        tech: { medium: "Wi-Fi 6", band: "5 GHz", channel: 149, width: "80 MHz", qoe: 24, noise: -92, mcs: 5, ss: 2, phyRate: 360, txRetries: 12.4, latency: 14.2, jitter: 8.1 }
      },
      {
        quality: "moderate", dl: 420, ul: 380, pct: 45,
        label: "Satellite backhaul",
        badge: "Could be better",
        rec: "<strong>Satellite link is slowing things down.</strong> The wireless connection between your Living Room and Upstairs Office satellites is only running at half capacity. Try moving the Living Room satellite to a spot with a clearer line of sight to the Upstairs Office unit.",
        tech: { medium: "Wi-Fi 6", band: "5 GHz", channel: 36, width: "160 MHz", qoe: 58, noise: -95, mcs: 9, ss: 2, phyRate: 1201, txRetries: 3.1, latency: 4.8, jitter: 1.9 }
      },
      {
        quality: "good", dl: 725, ul: 690, pct: 78,
        label: "Satellite to router",
        badge: "Strong",
        rec: "This link is performing well. No action needed.",
        tech: { medium: "Wi-Fi 6", band: "5 GHz", channel: 100, width: "160 MHz", qoe: 91, noise: -95, mcs: 11, ss: 4, phyRate: 2402, txRetries: 0.4, latency: 1.2, jitter: 0.3 }
      },
      {
        quality: "good", dl: 932, ul: 931, pct: 100,
        label: "Internet connection",
        badge: "Full speed",
        rec: "Your internet service is running at full speed.",
        tech: { medium: "XGSPON", qoe: 98, phyRate: 10000, latency: 2.1, jitter: 0.5 }
      }
    ],
    bottleneck: {
      type: "has-issue",
      icon: "warning",
      title: "Weak Wi-Fi to Living Room",
      text: "Your device can only get about 85 Mbps through this link, even though your internet plan delivers 932 Mbps. Fixing this connection would make the biggest improvement."
    }
  },
  good: {
    name: "Healthy Network",
    wan: { dl: 945, ul: 940, service: 1000 },
    nodes: [
      { name: "iPhone 15", role: "Your Device", type: "client-phone", tip: { conn: "Wi-Fi 6E (802.11ax)", ip: "192.168.1.52", mac: "F4:A9:3B:2E:7C:01" }, tech: { ip: "192.168.1.52", mac: "F4:A9:3B:2E:7C:01", wifiStd: "802.11ax", band: "6 GHz", uptime: null } },
      { name: "Kitchen", role: "Satellite", type: "sat", tip: { model: "SDG-8622v", hostname: "kitchen-sat.local", ip: "192.168.1.4", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.4", mac: "00:A1:B2:C3:D4:04", model: "SDG-8622v", firmware: "26.3.2.1", uptime: "22d 3h 15m", cpu: 9, mem: 34 } },
      { name: "Laundry Room", role: "Router", type: "hub", tip: { model: "SDG-8733v", hostname: "router.local", ip: "192.168.1.1", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.1", mac: "00:A1:B2:C3:D4:01", model: "SDG-8733v", firmware: "26.3.2.1", uptime: "22d 3h 16m", cpu: 19, mem: 51 } },
      { name: "Internet", role: "ISP", type: "wan", tip: { isp: "Consolidated Communications", wanType: "XGSPON", linkSpeed: "10 Gbps", service: "1,000 / 1,000 Mbps", ip: "198.51.100.43" }, tech: { ip: "198.51.100.43", gateway: "198.51.100.1", dns: ["8.8.8.8", "8.8.4.4"], wanType: "XGSPON", phyRate: "10 Gbps" } }
    ],
    links: [
      {
        quality: "good", dl: 620, ul: 580, pct: 66,
        label: "Wi-Fi to satellite",
        badge: "Strong",
        rec: "Good connection to the Kitchen satellite.",
        tech: { medium: "Wi-Fi 6E", band: "6 GHz", channel: 37, width: "160 MHz", qoe: 95, noise: -95, mcs: 11, ss: 2, phyRate: 2402, txRetries: 0.2, latency: 1.1, jitter: 0.2 }
      },
      {
        quality: "good", dl: 810, ul: 790, pct: 87,
        label: "Satellite to router",
        badge: "Strong",
        rec: "Strong backhaul link. No issues.",
        tech: { medium: "Wi-Fi 6", band: "5 GHz", channel: 149, width: "160 MHz", qoe: 93, noise: -95, mcs: 11, ss: 4, phyRate: 2402, txRetries: 0.3, latency: 1.0, jitter: 0.2 }
      },
      {
        quality: "good", dl: 945, ul: 940, pct: 100,
        label: "Internet connection",
        badge: "Full speed",
        rec: "Your internet service is running at full speed.",
        tech: { medium: "XGSPON", qoe: 99, phyRate: 10000, latency: 2.0, jitter: 0.4 }
      }
    ],
    bottleneck: {
      type: "all-good",
      icon: "ok",
      title: "All Clear",
      text: "Every link in your network is performing well. Your end-to-end speed is limited only by your Wi-Fi device capability, which is normal."
    }
  },
  oldclient: {
    name: "Old Device",
    wan: { dl: 480, ul: 460, service: 500 },
    nodes: [
      { name: "Galaxy S7", role: "Your Device", type: "client-phone", tip: { conn: "Wi-Fi 5 (802.11ac)", ip: "192.168.1.61", mac: "C0:D3:44:8A:EF:22" }, tech: { ip: "192.168.1.61", mac: "C0:D3:44:8A:EF:22", wifiStd: "802.11ac", band: "5 GHz", uptime: null } },
      { name: "Bedroom", role: "Satellite", type: "sat", tip: { model: "SDG-8622v", hostname: "bedroom-sat.local", ip: "192.168.1.5", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.5", mac: "00:A1:B2:C3:D4:05", model: "SDG-8622v", firmware: "26.3.2.1", uptime: "8d 11h 42m", cpu: 14, mem: 37 } },
      { name: "Laundry Room", role: "Router", type: "hub", tip: { model: "SDG-8733v", hostname: "router.local", ip: "192.168.1.1", firmware: "26.3.2.1" }, tech: { ip: "192.168.1.1", mac: "00:A1:B2:C3:D4:01", model: "SDG-8733v", firmware: "26.3.2.1", uptime: "8d 11h 43m", cpu: 21, mem: 53 } },
      { name: "Internet", role: "ISP", type: "wan", tip: { isp: "Consolidated Communications", wanType: "XGSPON", linkSpeed: "10 Gbps", service: "1,000 / 1,000 Mbps", ip: "198.51.100.43" }, tech: { ip: "198.51.100.43", gateway: "198.51.100.1", dns: ["8.8.8.8", "8.8.4.4"], wanType: "XGSPON", phyRate: "10 Gbps" } }
    ],
    links: [
      {
        quality: "poor", dl: 52, ul: 38, pct: 10,
        label: "Wi-Fi to satellite",
        badge: "Old device",
        rec: "<strong>Your device is the bottleneck.</strong> The Galaxy S7 (2016) only supports older, slower Wi-Fi. Even with a strong signal, this device can't go much faster. Upgrading to a newer phone or tablet would make a dramatic difference.",
        tech: { medium: "Wi-Fi 5", band: "5 GHz", channel: 36, width: "80 MHz", qoe: 42, noise: -93, mcs: 7, ss: 1, phyRate: 292, txRetries: 1.8, latency: 3.2, jitter: 1.1 }
      },
      {
        quality: "good", dl: 750, ul: 720, pct: 94,
        label: "Satellite to router",
        badge: "Strong",
        rec: "Great backhaul performance.",
        tech: { medium: "Wi-Fi 6", band: "5 GHz", channel: 100, width: "160 MHz", qoe: 90, noise: -95, mcs: 11, ss: 4, phyRate: 2402, txRetries: 0.5, latency: 1.3, jitter: 0.4 }
      },
      {
        quality: "moderate", dl: 480, ul: 460, pct: 96,
        label: "Internet connection",
        badge: "Plan speed",
        rec: "Running at your plan speed. Contact your ISP if you'd like a faster plan.",
        tech: { medium: "GPON", qoe: 82, phyRate: 2488, latency: 3.4, jitter: 0.8 }
      }
    ],
    bottleneck: {
      type: "has-issue",
      icon: "device",
      title: "Old device is the bottleneck",
      text: "Your Galaxy S7 (2016) uses older Wi-Fi technology that maxes out around 50 Mbps. Your network and internet connection are fast. A newer device would unlock speeds 10x faster."
    }
  }
};

let ppCurrent = 'problem';
let ppOpenDetail = -1;
let ppBottleneckExpanded = true;

function ppSetScenario(key) {
  ppCurrent = key;
  ppOpenDetail = -1;
  ppBottleneckExpanded = ppScenarios[key].bottleneck.type !== 'all-good';
  // Update scenario buttons
  document.querySelectorAll('.pp-scenario-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.scenario === key);
  });
  ppRender();
}

function ppToggleDetail(idx) {
  ppOpenDetail = ppOpenDetail === idx ? -1 : idx;
  ppRender();
}

function ppToggleBottleneck() {
  ppBottleneckExpanded = !ppBottleneckExpanded;
  ppRender();
}

function ppRender() {
  const root = document.getElementById('pp-path-root');
  if (!root) return;

  const s = ppScenarios[ppCurrent];
  let html = '';

  // === Scenario selector ===
  html += '<div class="pp-scenario-bar">';
  for (const [key, sc] of Object.entries(ppScenarios)) {
    html += `<button class="pp-scenario-btn${key === ppCurrent ? ' active' : ''}" data-scenario="${key}" onclick="ppSetScenario('${key}')">${sc.name}</button>`;
  }
  html += '</div>';

  // === Bottleneck section (top of card) ===
  const bnTitle = s.bottleneck.title || 'What can I do?';
  const chevronSvg = `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>`;
  html += `
    <div class="pp-bottleneck ${s.bottleneck.type}${ppBottleneckExpanded ? ' expanded' : ''}" onclick="ppToggleBottleneck()">
      <div class="pp-bottleneck-header">
        <span class="pp-bottleneck-icon">${PP_STATUS_ICONS[s.bottleneck.icon] || s.bottleneck.icon}</span>
        <span class="pp-bottleneck-title">${bnTitle}</span>
        <span class="pp-bottleneck-chevron">${chevronSvg}</span>
      </div>
      <div class="pp-bottleneck-body">
        <div class="pp-bottleneck-text">${s.bottleneck.text}</div>
      </div>
    </div>`;

  // === Speed Hero ===
  const bottleneckDl = Math.min(...s.links.map(l => l.dl));
  const bottleneckUl = Math.min(...s.links.map(l => l.ul));
  const dlPct = Math.round((bottleneckDl / s.wan.service) * 100);
  const ulPct = Math.round((bottleneckUl / s.wan.service) * 100);
  const dlColor = dlPct >= 60 ? 'var(--accent-green)' : dlPct >= 30 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const dlColorRaw = dlPct >= 60 ? '#34d399' : dlPct >= 30 ? '#f59e0b' : '#ef4444';
  const ulColorRaw = ulPct >= 60 ? '#34d399' : ulPct >= 30 ? '#f59e0b' : '#ef4444';
  const fmtService = s.wan.service.toLocaleString();

  const heroVariant = new URLSearchParams(window.location.search).get('hero') || 'a';

  if (heroVariant === 'b') {
    html += `
    <div class="pp-hero-b">
      <div class="pp-hero-b-main">
        <span class="pp-hero-b-val" style="color:${dlColorRaw}">${bottleneckDl}</span>
        <span class="pp-hero-b-unit">Mbps</span>
      </div>
      <div class="pp-hero-b-label">Download to your device</div>
      <div class="pp-hero-b-secondary">
        <div class="pp-hero-b-item">
          <span class="pp-hero-b-item-label">Upload</span>
          <span class="pp-hero-b-item-val" style="color:${ulColorRaw}">${bottleneckUl} Mbps</span>
        </div>
        <div class="pp-hero-b-item">
          <span class="pp-hero-b-item-label">Plan</span>
          <span class="pp-hero-b-item-val">${fmtService} Mbps</span>
        </div>
        <div class="pp-hero-b-item">
          <span class="pp-hero-b-item-label">Utilization</span>
          <span class="pp-hero-b-item-val">${dlPct}%</span>
        </div>
      </div>
    </div>`;
  } else if (heroVariant === 'c') {
    html += `
    <div class="pp-hero-c">
      <div class="pp-hero-c-cards">
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${dlColorRaw}">\u2193</span> Download</div>
          <div><span class="pp-hero-c-val" style="color:${dlColorRaw}">${bottleneckDl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${dlPct}%;background:${dlColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${dlPct}% of ${fmtService} Mbps</div>
        </div>
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${ulColorRaw}">\u2191</span> Upload</div>
          <div><span class="pp-hero-c-val" style="color:${ulColorRaw}">${bottleneckUl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${ulPct}%;background:${ulColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${ulPct}% of ${fmtService} Mbps</div>
        </div>
      </div>
    </div>`;
  } else if (heroVariant === 'c2') {
    // Compact left-aligned
    html += `
    <div class="pp-hero-c2">
      <div class="pp-hero-c-cards">
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${dlColorRaw}">\u2193</span> Download</div>
          <div><span class="pp-hero-c-val" style="color:${dlColorRaw}">${bottleneckDl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${dlPct}%;background:${dlColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${dlPct}% of ${fmtService} Mbps</div>
        </div>
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${ulColorRaw}">\u2191</span> Upload</div>
          <div><span class="pp-hero-c-val" style="color:${ulColorRaw}">${bottleneckUl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${ulPct}%;background:${ulColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${ulPct}% of ${fmtService} Mbps</div>
        </div>
      </div>
    </div>`;
  } else if (heroVariant === 'c3') {
    // Centered narrow
    html += `
    <div class="pp-hero-c3">
      <div class="pp-hero-c-cards">
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${dlColorRaw}">\u2193</span> Download</div>
          <div><span class="pp-hero-c-val" style="color:${dlColorRaw}">${bottleneckDl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${dlPct}%;background:${dlColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${dlPct}% of ${fmtService} Mbps</div>
        </div>
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${ulColorRaw}">\u2191</span> Upload</div>
          <div><span class="pp-hero-c-val" style="color:${ulColorRaw}">${bottleneckUl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${ulPct}%;background:${ulColorRaw}"></div></div>
          <div class="pp-hero-c-pct">${ulPct}% of ${fmtService} Mbps</div>
        </div>
      </div>
    </div>`;
  } else if (heroVariant === 'c4') {
    // Centered inline with plan context below
    html += `
    <div class="pp-hero-c4">
      <div class="pp-hero-c-cards">
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${dlColorRaw}">\u2193</span> Download</div>
          <div><span class="pp-hero-c-val" style="color:${dlColorRaw}">${bottleneckDl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${dlPct}%;background:${dlColorRaw}"></div></div>
        </div>
        <div class="pp-hero-c-card">
          <div class="pp-hero-c-card-label"><span class="pp-hero-c-arrow" style="color:${ulColorRaw}">\u2191</span> Upload</div>
          <div><span class="pp-hero-c-val" style="color:${ulColorRaw}">${bottleneckUl}</span> <span class="pp-hero-c-unit">Mbps</span></div>
          <div class="pp-hero-c-bar"><div class="pp-hero-c-bar-fill" style="width:${ulPct}%;background:${ulColorRaw}"></div></div>
        </div>
      </div>
      <div class="pp-hero-c4-plan">${dlPct}% of your ${fmtService} Mbps plan</div>
    </div>`;
  } else if (heroVariant === 'f') {
    html += `
    <div class="pp-hero-f">
      <div class="pp-hero-f-sentence">
        Your device can download at <span class="pp-hero-f-speed" style="color:${dlColorRaw}">${bottleneckDl} Mbps</span> and upload at <span class="pp-hero-f-speed" style="color:${ulColorRaw}">${bottleneckUl} Mbps</span> through this path, out of your <span class="pp-hero-f-plan">${fmtService} Mbps</span> plan.
      </div>
      <div class="pp-hero-f-bar"><div class="pp-hero-f-bar-fill" style="width:${dlPct}%;background:${dlColorRaw}"></div></div>
    </div>`;
  } else {
    // No hero section in advanced view - throughput shown on pipes instead
    html += '';
  }

  // === Find worst link ===
  let worstIdx = -1, worstDl = Infinity;
  s.links.forEach((lk, i) => { if (lk.dl < worstDl) { worstDl = lk.dl; worstIdx = i; } });
  const hasBottleneck = s.links[worstIdx] && s.links[worstIdx].quality !== 'good';

  // === Pipeline row ===
  html += '<div class="pp-pipe-area"><div class="pp-pipeline">';
  for (let i = 0; i < s.nodes.length; i++) {
    const nd = s.nodes[i];
    const hasIssue = i > 0 && s.links[i-1] && s.links[i-1].quality === 'poor';
    const linkAfter = s.links[i];
    // For WAN nodes, resolve ISP name from rDNS if available
    const nodeRole = (nd.type === 'wan' && typeof rdnsToCarrier === 'function'
      && MOCK?.mwan?.interfaces?.wan?.rdns_hostname)
      ? (rdnsToCarrier(MOCK.mwan.interfaces.wan.rdns_hostname) || nd.role)
      : nd.role;

    // Build node tooltip
    let nodeTipHtml = '';
    if (nd.tip) {
      const t = nd.tip;
      if (nd.type === 'wan') {
        const mediaClass = t.wanType ? 'media-' + t.wanType.toLowerCase().replace(/[\s\/]/g, '') : '';
        nodeTipHtml = `<div class="pp-tip-header">${t.isp || 'Internet'}</div>`
          + (t.wanType ? `<div class="pp-ntip-row"><span class="pp-ntip-label">WAN</span><span class="wan-interface-badge ${mediaClass}">${t.wanType}</span></div>` : '')
          + (t.linkSpeed ? `<div class="pp-ntip-row"><span class="pp-ntip-label">Link</span><span class="pp-ntip-val">${t.linkSpeed}</span></div>` : '')
          + (t.service ? `<div class="pp-ntip-row"><span class="pp-ntip-label">Service</span><span class="pp-ntip-val">${t.service}</span></div>` : '')
          + (t.ip ? `<div class="pp-ntip-row"><span class="pp-ntip-label">IP</span><span class="pp-ntip-val">${t.ip}</span></div>` : '');
      } else if (nd.type === 'sat' || nd.type === 'hub') {
        nodeTipHtml = `<div class="pp-tip-header">${nd.name}</div>`
          + (t.model ? `<div class="pp-ntip-row"><span class="pp-ntip-label">Model</span><span class="pp-ntip-val">${t.model}</span></div>` : '')
          + (t.hostname ? `<div class="pp-ntip-row"><span class="pp-ntip-label">Host</span><span class="pp-ntip-val">${t.hostname}</span></div>` : '')
          + (t.ip ? `<div class="pp-ntip-row"><span class="pp-ntip-label">IP</span><span class="pp-ntip-val">${t.ip}</span></div>` : '')
          + (t.firmware ? `<div class="pp-ntip-row"><span class="pp-ntip-label">FW</span><span class="pp-ntip-val">${t.firmware}</span></div>` : '');
      } else {
        nodeTipHtml = `<div class="pp-tip-header">${nd.name}</div>`
          + (t.conn ? `<div class="pp-ntip-row"><span class="pp-ntip-label">Link</span><span class="pp-ntip-val">${t.conn}</span></div>` : '')
          + (t.ip ? `<div class="pp-ntip-row"><span class="pp-ntip-label">IP</span><span class="pp-ntip-val">${t.ip}</span></div>` : '')
          + (t.mac ? `<div class="pp-ntip-row"><span class="pp-ntip-label">MAC</span><span class="pp-ntip-val">${t.mac}</span></div>` : '');
      }
    }

    // Build tech-only node detail line
    let nodeTechHtml = '';
    if (nd.tech) {
      const nt = nd.tech;
      const ipHtml = nd.type === 'wan'
        ? `<span class="pp-node-tech-val">${nt.ip}</span>`
        : `<a class="pp-node-tech-val pp-node-ip-link" href="http://${nt.ip}" target="_blank" rel="noopener">${nt.ip}</a>`;
      if (nd.type === 'sat' || nd.type === 'hub') {
        nodeTechHtml = `<div class="pp-node-tech tech-only">${ipHtml}${nt.cpu != null ? `<span class="pp-node-tech-chip">CPU ${nt.cpu}%</span>` : ''}</div>`;
      } else {
        nodeTechHtml = `<div class="pp-node-tech tech-only">${ipHtml}</div>`;
      }
    }

    html += `
      <div class="pp-node">
        <div class="pp-node-icon ${hasIssue ? 'has-issue' : ''}">${ppNodeIcon(nd.type)}${nodeTipHtml ? `<div class="pp-node-tooltip">${nodeTipHtml}</div>` : ''}</div>
        <div class="pp-node-name">${nd.name}</div>
        <div class="pp-node-role">${nodeRole}</div>
        ${nodeTechHtml}
        <div class="pp-node-text-mobile">
          <div class="pp-node-name">${nd.name}</div>
          <div class="pp-node-role">${nodeRole}</div>
        </div>
      </div>`;

    if (linkAfter) {
      const lk = linkAfter;
      const isWorst = hasBottleneck && i === worstIdx;
      const fmt = n => n >= 1000 ? n.toLocaleString() : n;
      const qColor = lk.quality === 'poor' ? 'var(--accent-red)' : (lk.quality === 'fair' || lk.quality === 'moderate') ? 'var(--accent-amber)' : 'var(--accent-green)';
      const tipHtml = `<div class="pp-tip-header">Link Speed</div>`
        + `<div class="pp-tip-row" style="color:${qColor}">\u2193 ${fmt(lk.dl)} / ${fmt(s.wan.service)} Mbps</div>`
        + `<div class="pp-tip-row" style="color:${qColor}">\u2191 ${fmt(lk.ul)} / ${fmt(s.wan.service)} Mbps</div>`;
      // Build tech-only compact inline chip for link
      let techChipHtml = '';
      if (lk.tech) {
        const t = lk.tech;
        let chipParts = [];
        if (t.qoe != null) {
          const qoeColor = t.qoe >= 75 ? 'var(--accent-green)' : t.qoe >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
          chipParts.push(`<span style="color:${qoeColor}">QoE ${t.qoe}</span>`);
        }
        if (t.latency != null) {
          const latColor = t.latency <= 3 ? 'var(--accent-green)' : t.latency <= 10 ? 'var(--accent-amber)' : 'var(--accent-red)';
          chipParts.push(`<span style="color:${latColor}">${t.latency}ms</span>`);
        }
        if (chipParts.length) {
          techChipHtml = `<div class="pp-link-tech-chip tech-only">${chipParts.join(' / ')}</div>`;
        }
      }

      const throughputHtml = `<div class="pp-link-throughput tech-only" style="color:${qColor}">${fmt(lk.dl)} / ${fmt(lk.ul)}</div>`;

      html += `
        <div class="pp-link q-${lk.quality}${isWorst ? ' worst-link' : ''}" onclick="ppToggleDetail(${i})">
          <div class="pp-link-tooltip">${tipHtml}</div>
          ${throughputHtml}
          <div class="pp-link-bar-wrap"><div class="pp-link-bar ${lk.quality}"></div><div class="pp-link-notif"></div></div>
          <div class="pp-link-label">${lk.label}</div>
          ${techChipHtml}
        </div>`;
    }
  }
  html += '</div>'; // close .pp-pipeline

  // === Detail panels ===
  for (let i = 0; i < s.links.length; i++) {
    const lk = s.links[i];
    const isOpen = ppOpenDetail === i;
    const fillPct = Math.min(lk.pct, 100);
    const fromNode = s.nodes[i].name;
    const toNode = s.nodes[i + 1].name;

    html += `
      <div class="pp-detail-row ${isOpen ? 'open' : ''}">
        <div class="pp-detail">
          <div class="pp-detail-speeds">
            <div>
              <div class="pp-detail-speed-row">
                <span class="pp-detail-dir dl">\u2193</span>
                <span class="pp-detail-val">${lk.dl}</span>
                <span class="pp-detail-unit">Mbps</span>
              </div>
            </div>
            <div>
              <div class="pp-detail-speed-row">
                <span class="pp-detail-dir ul">\u2191</span>
                <span class="pp-detail-val">${lk.ul}</span>
                <span class="pp-detail-unit">Mbps</span>
              </div>
            </div>
            <div class="pp-detail-bar-wrap">
              <div class="pp-detail-bar">
                <div class="pp-detail-bar-fill ${lk.quality}" style="width:${fillPct}%"></div>
              </div>
              <div class="pp-detail-pct">${fillPct}%</div>
            </div>
          </div>
          <div class="pp-detail-rec">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="pp-detail-badge ${lk.quality}">${lk.badge}</span>
              <span style="font-size:10px;color:var(--text-muted)">${fromNode} \u2192 ${toNode}</span>
            </div>
            <div class="pp-detail-rec-text">${lk.rec}</div>
          </div>
          <button class="pp-detail-close" onclick="event.stopPropagation();ppToggleDetail(${i})">\u2715</button>
        </div>
      </div>`;
  }

  // === Drop lines container (connects pipeline to tables) ===
  html += `<div class="pp-drop-lines tech-only"></div>`;


  // === Tech-only: Hop-by-hop metrics (transposed: columns = hops, rows = metrics) ===
  // Pre-compute per-link data
  const fmt = n => n >= 1000 ? n.toLocaleString() : n;
  const linkData = s.links.map((lk, i) => {
    const t = lk.tech || {};
    const qoeColor = t.qoe == null ? '' : t.qoe >= 75 ? 'var(--accent-green)' : t.qoe >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const snr = (t.noise != null && t.qoe != null) ? Math.round(t.qoe * 0.5 + 10) : null;
    const snrColor = snr == null ? '' : snr >= 30 ? 'var(--accent-green)' : snr >= 20 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const retryColor = t.txRetries == null ? '' : t.txRetries <= 1 ? 'var(--accent-green)' : t.txRetries <= 5 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const latColor = t.latency == null ? '' : t.latency <= 3 ? 'var(--accent-green)' : t.latency <= 10 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const phyFmt = t.phyRate == null ? '-' : t.phyRate >= 1000 ? (t.phyRate / 1000).toFixed(1) + ' Gbps' : t.phyRate + ' Mbps';
    return {
      label: lk.label,
      from: s.nodes[i].name, to: s.nodes[i+1].name,
      warn: lk.quality === 'poor',
      medium: t.medium || '-',
      channel: t.channel != null ? `${t.channel} / ${t.width || ''}` : '-',
      mcsPhyRate: t.mcs != null ? `${t.mcs} / ${phyFmt}` : phyFmt,
      dlUl: `${fmt(lk.dl)} / ${fmt(lk.ul)}`,
      qoe: { val: t.qoe != null ? t.qoe : '-', color: qoeColor },
      noise: t.noise != null ? t.noise + ' dBm' : '-',
      snr: { val: snr != null ? snr + ' dB' : '-', color: snrColor },
      ss: t.ss != null ? t.ss + 't' + t.ss + 'r' : '-',
      retries: { val: t.txRetries != null ? t.txRetries + '%' : '-', color: retryColor },
      latency: { val: t.latency != null ? t.latency + ' ms' : '-', color: latColor },
      jitter: t.jitter != null ? t.jitter + ' ms' : '-'
    };
  });
  const totalLat = s.links.reduce((sum, lk) => sum + (lk.tech?.latency || 0), 0);
  const totalJitter = Math.sqrt(s.links.reduce((sum, lk) => sum + Math.pow(lk.tech?.jitter || 0, 2), 0));

  // Hop table: [Label] [MBP node col] [4 link cols on pipes] [Internet node col]
  const totalLatColor = totalLat <= 10 ? 'var(--accent-green)' : totalLat <= 30 ? 'var(--accent-amber)' : 'var(--accent-red)';
  html += `<div class="pp-tech-table-wrap tech-only">
    <div class="pp-tech-table-title">Hop-by-Hop Metrics</div>
    <table class="pp-tech-table pp-tech-table-transposed pp-hop-table" style="table-layout:fixed">
      <colgroup><col class="pp-col-label">`;
  s.links.forEach(() => { html += `<col class="pp-col-link">`; });
  html += `<col class="pp-col-endpoint pp-col-ep-last"><col class="pp-col-spacer"></colgroup>`;
  // Header: 4 link labels, "Total" (aligned to Internet node), spacer
  html += `<thead><tr><th></th>`;
  linkData.forEach(d => {
    html += `<th class="${d.warn ? 'pp-tech-col-warn' : ''}">${d.label}</th>`;
  });
  html += `<th>Total</th><th></th></tr></thead><tbody>`;

  // Helper: 4 link values + empty Total cell + spacer
  function techRow(label, vals) {
    html += `<tr><td class="pp-tech-row-label">${label}</td>`;
    vals.forEach(v => {
      if (v && typeof v === 'object') {
        html += v.color ? `<td style="color:${v.color}">${v.val}</td>` : `<td>${v.val}</td>`;
      } else {
        html += `<td>${v}</td>`;
      }
    });
    html += `<td></td><td></td></tr>`; // Total + spacer
  }

  techRow('Medium', linkData.map(d => d.medium));
  techRow('Channel', linkData.map(d => d.channel));
  techRow('MCS / PHY Rate', linkData.map(d => d.mcsPhyRate));
  techRow('DL / UL', linkData.map(d => d.dlUl));
  techRow('QoE', linkData.map(d => d.qoe));
  techRow('Noise', linkData.map(d => d.noise));
  techRow('SNR', linkData.map(d => d.snr));
  techRow('Spatial Streams', linkData.map(d => d.ss));
  techRow('Retries', linkData.map(d => d.retries));
  // Latency: per-hop values in link cols, total in Internet node col
  html += `<tr><td class="pp-tech-row-label">Latency</td>`;
  linkData.forEach(d => {
    const v = d.latency;
    html += v && typeof v === 'object' && v.color ? `<td style="color:${v.color}">${v.val}</td>` : `<td>${v}</td>`;
  });
  html += `<td class="pp-tech-col-total"><span style="color:${totalLatColor}">${totalLat.toFixed(1)} ms</span></td>`;
  html += `<td></td></tr>`;
  // Jitter: per-hop values in link cols, total in Internet node col
  html += `<tr><td class="pp-tech-row-label">Jitter</td>`;
  linkData.forEach(d => { html += `<td>${d.jitter}</td>`; });
  html += `<td class="pp-tech-col-total">${totalJitter.toFixed(1)} ms</td>`;
  html += `<td></td></tr>`;

  html += `</tbody></table>`;

  // === Tech-only: Node inventory (transposed: columns = nodes, rows = properties) ===
  html += `<div class="pp-tech-table-title" style="margin-top:16px">Node Inventory</div>
    <table class="pp-tech-table pp-tech-table-transposed pp-node-table" style="table-layout:fixed">
      <colgroup><col class="pp-col-label">`;
  s.nodes.forEach(() => { html += `<col class="pp-col-node">`; });
  html += `<col class="pp-col-spacer"></colgroup>`;
  html += `<thead><tr><th></th>`;
  s.nodes.forEach(nd => { html += `<th>${nd.name}</th>`; });
  html += `<th></th></tr></thead><tbody>`;

  function nodeRow(label, getter) {
    html += `<tr><td class="pp-tech-row-label">${label}</td>`;
    s.nodes.forEach(nd => {
      const val = getter(nd);
      if (typeof val === 'object' && val.color) {
        html += `<td style="color:${val.color}">${val.val}</td>`;
      } else {
        html += `<td>${val}</td>`;
      }
    });
    html += `<td></td></tr>`;
  }

  nodeRow('Role', nd => nd.role);
  nodeRow('Model', nd => nd.tech?.model || '-');
  nodeRow('IP', nd => nd.tech?.ip || '-');
  nodeRow('MAC', nd => nd.tech?.mac || '-');
  nodeRow('Firmware', nd => nd.tech?.firmware || '-');
  nodeRow('Uptime', nd => nd.tech?.uptime || '-');
  nodeRow('CPU', nd => {
    const v = nd.tech?.cpu;
    if (v == null) return '-';
    const c = v <= 50 ? 'var(--accent-green)' : v <= 80 ? 'var(--accent-amber)' : 'var(--accent-red)';
    return { val: v + '%', color: c };
  });
  nodeRow('Memory', nd => {
    const v = nd.tech?.mem;
    if (v == null) return '-';
    const c = v <= 60 ? 'var(--accent-green)' : v <= 85 ? 'var(--accent-amber)' : 'var(--accent-red)';
    return { val: v + '%', color: c };
  });

  html += `</tbody></table></div>`;

  html += '</div>'; // close .pp-pipe-area

  root.innerHTML = html;

  // Initial layout pass after DOM is ready
  requestAnimationFrame(() => {
    ppAlignLayout();
    // Apply column stripe style (once)
    const tableWrap = root.querySelector('.pp-tech-table-wrap');
    if (tableWrap) tableWrap.classList.add('pp-style-c');
  });
}

// Standalone alignment function: re-measures pipeline positions and updates
// table columns, drop lines, and detail arrows. Called on render and on resize/zoom.
function ppAlignLayout() {
  const root = document.getElementById('page-pathpulse');
  if (!root || root.style.display === 'none') return;

  const pipelineEl = root.querySelector('.pp-pipeline');
  const linkEls = root.querySelectorAll('.pp-pipeline .pp-link');
  const nodeEls = root.querySelectorAll('.pp-pipeline .pp-node');
  const details = root.querySelectorAll('.pp-detail-row .pp-detail');

  // Detail panel arrows
  details.forEach((det, i) => {
    const link = linkEls[i];
    if (!link || !det) return;
    const detRect = det.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const linkCenter = linkRect.left + linkRect.width / 2;
    const arrowLeft = linkCenter - detRect.left;
    const clamped = Math.max(20, Math.min(arrowLeft, detRect.width - 20));
    det.style.setProperty('--pp-arrow-left', clamped + 'px');
  });

  // Align tech table columns with pipeline elements + draw drop lines
  if (!pipelineEl || document.body.dataset.view === 'basic') return;
  const hopTable = root.querySelector('.pp-hop-table');
  const nodeTable = root.querySelector('.pp-node-table');
  const dropLinesEl = root.querySelector('.pp-drop-lines');
  if (!hopTable && !nodeTable) return;

  const pipeArea = root.querySelector('.pp-pipe-area');
  if (!pipeArea) return;
  const areaLeft = pipeArea.getBoundingClientRect().left;

  const linkPositions = [...linkEls].map(el => {
    const r = el.getBoundingClientRect();
    return { left: r.left - areaLeft, right: r.right - areaLeft, center: (r.left + r.right) / 2 - areaLeft, width: r.width };
  });
  const nodePositions = [...nodeEls].map(el => {
    const icon = el.querySelector('.pp-node-icon') || el;
    const r = icon.getBoundingClientRect();
    return { left: r.left - areaLeft, right: r.right - areaLeft, center: (r.left + r.right) / 2 - areaLeft, width: r.width };
  });

  // Center-anchored column alignment: width = 2*(targetCenter - leftEdge).
  // Spacer absorbs remainder so table-layout:fixed never redistributes.
  function alignTableColumns(table, positions, colClass) {
    if (!table || !positions.length) return;
    const tableRect = table.getBoundingClientRect();
    const tableLeft = tableRect.left - areaLeft;
    const tableWidth = Math.round(tableRect.width);
    const cols = table.querySelectorAll('col.' + colClass);
    const labelCol = table.querySelector('col.pp-col-label');
    const spacerCol = table.querySelector('col.pp-col-spacer');

    const n = positions.length;
    const centers = positions.map(p => Math.round(p.center - tableLeft));
    const labelWidth = Math.max(50, Math.round(centers[0] - (n > 1 ? (centers[1] - centers[0]) / 2 : positions[0].width / 2)));
    const colWidths = [];
    let x = labelWidth;
    for (let i = 0; i < n; i++) {
      const w = 2 * (centers[i] - x);
      const clamped = Math.max(40, Math.round(w));
      colWidths.push(clamped);
      x += clamped;
    }
    let usedWidth = labelWidth + colWidths.reduce((a, b) => a + b, 0);

    if (labelCol) labelCol.style.width = labelWidth + 'px';
    cols.forEach((col, i) => {
      if (colWidths[i] != null) col.style.width = colWidths[i] + 'px';
    });
    if (spacerCol) spacerCol.style.width = Math.max(0, tableWidth - usedWidth) + 'px';
  }

  // Hop table: link columns on pipe centers, Total on Internet node
  // Store computed hop column edges for node table alignment below
  let hopLabelWidth = 0;
  let hopColWidths = [];
  if (hopTable && linkPositions.length && nodePositions.length) {
    const tableRect = hopTable.getBoundingClientRect();
    const tableLeft = tableRect.left - areaLeft;
    const tableWidth = Math.round(tableRect.width);
    const labelCol = hopTable.querySelector('col.pp-col-label');
    const linkCols = hopTable.querySelectorAll('col.pp-col-link');
    const epLast = hopTable.querySelector('col.pp-col-ep-last');
    const spacerCol = hopTable.querySelector('col.pp-col-spacer');

    const nLinks = linkPositions.length;
    const lastNode = nodePositions[nodePositions.length - 1];
    const allCenters = [
      ...linkPositions.map(p => Math.round(p.center - tableLeft)),
      Math.round(lastNode.center - tableLeft)
    ];
    const allCols = [...linkCols, epLast].filter(Boolean);

    hopLabelWidth = Math.max(50, Math.round(allCenters[0] - (allCenters.length > 1 ? (allCenters[1] - allCenters[0]) / 2 : linkPositions[0].width / 2)));
    let x = hopLabelWidth;
    for (let i = 0; i < allCenters.length; i++) {
      const w = Math.max(40, Math.round(2 * (allCenters[i] - x)));
      hopColWidths.push(w);
      x += w;
    }
    // Enforce minimum width on TOTAL column (last); steal half from
    // the previous column so the TOTAL stays centered on the Internet node
    const lastIdx = hopColWidths.length - 1;
    const minTotal = 100;
    if (hopColWidths[lastIdx] < minTotal) {
      const deficit = minTotal - hopColWidths[lastIdx];
      const stealLeft = Math.ceil(deficit / 2);
      hopColWidths[lastIdx] = minTotal;
      if (lastIdx > 0) hopColWidths[lastIdx - 1] -= stealLeft;
    }
    let usedWidth = hopLabelWidth + hopColWidths.reduce((a, b) => a + b, 0);

    if (labelCol) labelCol.style.width = hopLabelWidth + 'px';
    allCols.forEach((col, i) => {
      if (hopColWidths[i] != null) col.style.width = hopColWidths[i] + 'px';
    });
    if (spacerCol) spacerCol.style.width = Math.max(0, tableWidth - usedWidth) + 'px';
  }

  // Node table: column edges align with hop column centers (link centers)
  // so each node column spans from one link center to the next
  if (nodeTable && linkPositions.length && nodePositions.length) {
    const tableRect = nodeTable.getBoundingClientRect();
    const tableLeft = tableRect.left - areaLeft;
    const tableWidth = Math.round(tableRect.width);
    const cols = nodeTable.querySelectorAll('col.pp-col-node');
    const labelCol = nodeTable.querySelector('col.pp-col-label');
    const spacerCol = nodeTable.querySelector('col.pp-col-spacer');

    const nNodes = nodePositions.length;
    const nLinks = linkPositions.length;
    // Link centers relative to node table = boundaries between node columns
    const linkCenters = linkPositions.map(p => Math.round(p.center - tableLeft));
    // Last node (Internet) center for sizing the final column
    const lastNodeCenter = Math.round(nodePositions[nNodes - 1].center - tableLeft);

    // Label width: position first node center symmetrically within column 0
    // Column 0 right edge = linkCenters[0], so label = 2*nodeCenter[0] - linkCenters[0]
    const firstNodeCenter = Math.round(nodePositions[0].center - tableLeft);
    const labelWidth = Math.max(50, Math.round(2 * firstNodeCenter - linkCenters[0]));

    const colWidths = [];
    let x = labelWidth;
    for (let i = 0; i < nNodes; i++) {
      let rightEdge;
      if (i < nLinks) {
        // Node column right edge = center of the link to its right
        rightEdge = linkCenters[i];
      } else {
        // Last node (Internet): mirror around its center from the last link
        rightEdge = Math.round(2 * lastNodeCenter - linkCenters[nLinks - 1]);
        // Enforce same minimum as hop TOTAL column
        rightEdge = Math.max(rightEdge, x + 100);
      }
      const w = Math.max(40, rightEdge - x);
      colWidths.push(w);
      x += w;
    }
    let usedWidth = labelWidth + colWidths.reduce((a, b) => a + b, 0);

    if (labelCol) labelCol.style.width = labelWidth + 'px';
    cols.forEach((col, i) => {
      if (colWidths[i] != null) col.style.width = colWidths[i] + 'px';
    });
    if (spacerCol) spacerCol.style.width = Math.max(0, tableWidth - usedWidth) + 'px';
  }

  // Drop lines
  if (dropLinesEl) {
    const areaRect = pipeArea.getBoundingClientRect();
    const pipeRect = pipelineEl.getBoundingClientRect();
    const topOffset = pipeRect.bottom - areaRect.top;

    const titles = root.querySelectorAll('.pp-tech-table-title');
    const hopTitle = titles[0];
    const nodeTitle = titles[1];

    const hopTitleBottom = hopTitle
      ? hopTitle.getBoundingClientRect().bottom - areaRect.top
      : topOffset + 60;
    const nodeTitleBottom = nodeTitle
      ? nodeTitle.getBoundingClientRect().bottom - areaRect.top
      : hopTitleBottom + 40;

    const linkHeight = hopTitleBottom - topOffset;
    const nodeHeight = nodeTitleBottom - topOffset;

    let linesHtml = '';
    const lastNodeIdx = nodePositions.length - 1;
    nodePositions.forEach((pos, i) => {
      const h = i === lastNodeIdx ? linkHeight : nodeHeight;
      linesHtml += `<div class="pp-drop-line pp-drop-node" style="left:${pos.center}px;top:0;height:${h}px"></div>`;
    });
    linkPositions.forEach(pos => {
      linesHtml += `<div class="pp-drop-line pp-drop-link" style="left:${pos.center}px;top:0;height:${linkHeight}px"></div>`;
    });

    dropLinesEl.style.top = topOffset + 'px';
    dropLinesEl.style.height = nodeHeight + 'px';
    dropLinesEl.style.bottom = 'auto';
    dropLinesEl.innerHTML = linesHtml;
  }
}

// Re-align on resize/zoom (debounced)
let ppResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(ppResizeTimer);
  ppResizeTimer = setTimeout(() => {
    requestAnimationFrame(ppAlignLayout);
  }, 100);
});

// Close detail panel on click outside
document.addEventListener('click', function(e) {
  if (ppOpenDetail === -1) return;
  if (e.target.closest('.pp-link') || e.target.closest('.pp-detail')) return;
  // Only close if we're on the PathPulse page
  if (document.getElementById('page-pathpulse')?.style.display !== 'none') {
    ppOpenDetail = -1;
    ppRender();
  }
});

// Initialize PathPulse (called by navigateTo)
function ppInit() {
  ppRender();
}

// Deep link: if URL hash is #pathpulse, navigate after full init
if (window.location.hash === '#pathpulse') {
  window.addEventListener('load', () => {
    currentPage = null;
    navigateTo('pathpulse');
  });
}
