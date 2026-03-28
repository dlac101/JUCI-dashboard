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
      { name: "MacBook Pro", role: "Your Device", type: "client-laptop" },
      { name: "Living Room", role: "Satellite", type: "sat" },
      { name: "Upstairs Office", role: "Satellite", type: "sat" },
      { name: "Main Router", role: "Router", type: "hub" },
      { name: "Internet", role: "ISP", type: "wan" }
    ],
    links: [
      {
        quality: "poor", dl: 85, ul: 62, pct: 9,
        label: "Wi-Fi to satellite",
        badge: "Weak signal",
        rec: "<strong>Weak Wi-Fi signal.</strong> Your MacBook Pro has a poor connection to the Living Room satellite. Try moving closer to the satellite, or make sure there aren't thick walls or large appliances between them."
      },
      {
        quality: "moderate", dl: 420, ul: 380, pct: 45,
        label: "Satellite backhaul",
        badge: "Could be better",
        rec: "<strong>Satellite link is slowing things down.</strong> The wireless connection between your Living Room and Upstairs Office satellites is only running at half capacity. Try moving the Living Room satellite to a spot with a clearer line of sight to the Upstairs Office unit."
      },
      {
        quality: "good", dl: 725, ul: 690, pct: 78,
        label: "Satellite to router",
        badge: "Strong",
        rec: "This link is performing well. No action needed."
      },
      {
        quality: "good", dl: 932, ul: 931, pct: 100,
        label: "Internet connection",
        badge: "Full speed",
        rec: "Your internet service is running at full speed."
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
      { name: "iPhone 15", role: "Your Device", type: "client-phone" },
      { name: "Kitchen", role: "Satellite", type: "sat" },
      { name: "Main Router", role: "Router", type: "hub" },
      { name: "Internet", role: "ISP", type: "wan" }
    ],
    links: [
      {
        quality: "good", dl: 620, ul: 580, pct: 66,
        label: "Wi-Fi to satellite",
        badge: "Strong",
        rec: "Good connection to the Kitchen satellite."
      },
      {
        quality: "good", dl: 810, ul: 790, pct: 87,
        label: "Satellite to router",
        badge: "Strong",
        rec: "Strong backhaul link. No issues."
      },
      {
        quality: "good", dl: 945, ul: 940, pct: 100,
        label: "Internet connection",
        badge: "Full speed",
        rec: "Your internet service is running at full speed."
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
      { name: "Galaxy S7", role: "Your Device", type: "client-phone" },
      { name: "Bedroom", role: "Satellite", type: "sat" },
      { name: "Main Router", role: "Router", type: "hub" },
      { name: "Internet", role: "ISP", type: "wan" }
    ],
    links: [
      {
        quality: "poor", dl: 52, ul: 38, pct: 10,
        label: "Wi-Fi to satellite",
        badge: "Old device",
        rec: "<strong>Your device is the bottleneck.</strong> The Galaxy S7 (2016) only supports older, slower Wi-Fi. Even with a strong signal, this device can't go much faster. Upgrading to a newer phone or tablet would make a dramatic difference."
      },
      {
        quality: "good", dl: 750, ul: 720, pct: 94,
        label: "Satellite to router",
        badge: "Strong",
        rec: "Great backhaul performance."
      },
      {
        quality: "moderate", dl: 480, ul: 460, pct: 96,
        label: "Internet connection",
        badge: "Plan speed",
        rec: "Running at your plan speed. Contact your ISP if you'd like a faster plan."
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

  // === Speed Hero ===
  const bottleneckDl = Math.min(...s.links.map(l => l.dl));
  const bottleneckUl = Math.min(...s.links.map(l => l.ul));
  const dlPct = Math.round((bottleneckDl / s.wan.service) * 100);
  const ulPct = Math.round((bottleneckUl / s.wan.service) * 100);
  const dlColor = dlPct >= 60 ? 'var(--accent-green)' : dlPct >= 30 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const dlColorRaw = dlPct >= 60 ? '#34d399' : dlPct >= 30 ? '#f59e0b' : '#ef4444';
  const ulColorRaw = ulPct >= 60 ? '#34d399' : ulPct >= 30 ? '#f59e0b' : '#ef4444';

  html += `
    <div class="pp-hero">
      <div class="pp-hero-speeds">
        <div class="pp-hero-speed">
          <span class="pp-hero-dir">\u2193</span>
          <span class="pp-hero-val" style="color:${dlColorRaw}">${bottleneckDl}</span>
          <span class="pp-hero-unit">Mbps</span>
        </div>
        <div class="pp-hero-speed pp-hero-speed-ul">
          <span class="pp-hero-dir">\u2191</span>
          <span class="pp-hero-val" style="color:${ulColorRaw}">${bottleneckUl}</span>
          <span class="pp-hero-unit">Mbps</span>
        </div>
      </div>
      <div class="pp-hero-meta">
        <div class="pp-hero-label">Your Speed</div>
        <div class="pp-hero-bar">
          <div class="pp-hero-bar-fill" style="width:${dlPct}%;background:${dlColor};"></div>
        </div>
        <div class="pp-hero-of">${dlPct}% of your ${s.wan.service} Mbps plan</div>
      </div>
    </div>`;

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

    html += `
      <div class="pp-node">
        <div class="pp-node-icon ${hasIssue ? 'has-issue' : ''}">${ppNodeIcon(nd.type)}</div>
        <div class="pp-node-name">${nd.name}</div>
        <div class="pp-node-role">${nd.role}</div>
        <div class="pp-node-text-mobile">
          <div class="pp-node-name">${nd.name}</div>
          <div class="pp-node-role">${nd.role}</div>
        </div>
      </div>`;

    if (linkAfter) {
      const lk = linkAfter;
      const isWorst = hasBottleneck && i === worstIdx;
      html += `
        <div class="pp-link q-${lk.quality}${isWorst ? ' worst-link' : ''}" onclick="ppToggleDetail(${i})">
          <div class="pp-link-speed">${lk.dl} <span class="unit">Mbps</span>
            <span class="pp-link-mobile-badge ${lk.quality}">${lk.quality === 'good' ? '\u2713' : lk.quality === 'moderate' ? '!' : '\u2717'}</span>
          </div>
          <div class="pp-link-bar-wrap"><div class="pp-link-bar"><div class="pp-link-bar-fill ${lk.quality}" style="width:${Math.max(15, Math.round((lk.dl / s.wan.service) * 100))}%"></div></div><div class="pp-link-notif"></div></div>
          <div class="pp-link-label">${lk.label}</div>
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

  // === Bottleneck section ===
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

  html += '</div>'; // close .pp-pipe-area

  root.innerHTML = html;

  // Position detail-panel arrows
  requestAnimationFrame(() => {
    const links = root.querySelectorAll('.pp-pipeline .pp-link');
    const details = root.querySelectorAll('.pp-detail-row .pp-detail');
    details.forEach((det, i) => {
      const link = links[i];
      if (!link || !det) return;
      const detRect = det.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      const linkCenter = linkRect.left + linkRect.width / 2;
      const arrowLeft = linkCenter - detRect.left;
      const clamped = Math.max(20, Math.min(arrowLeft, detRect.width - 20));
      det.style.setProperty('--pp-arrow-left', clamped + 'px');
    });
  });
}

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
