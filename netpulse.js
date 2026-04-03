/* =============================================================================
   SmartOS NetPulse Page - Logic, Mock Data & Rendering
   Integrated into SmartOS Dashboard shell
   ============================================================================= */

'use strict';

/* ===== Utilities ===== */
const swEl = id => document.getElementById(id);

function isDarkTheme() {
  return document.documentElement.getAttribute('data-theme') !== 'light';
}

// Returns rgba string for canvas text/grid elements that adapts to theme
function canvasText(alpha) {
  return isDarkTheme()
    ? 'rgba(255,255,255,' + alpha + ')'
    : 'rgba(0,0,0,' + alpha + ')';
}

function swGradeColor(g) {
  return g === 'A' ? 'var(--accent-green)' : g === 'B' ? 'var(--accent-cyan)' : g === 'C' ? 'var(--accent-amber)' : 'var(--accent-red)';
}

function swGradeColorRaw(g) {
  if (isDarkTheme()) {
    return g === 'A' ? '#34d399' : g === 'B' ? '#00C8E6' : g === 'C' ? '#f59e0b' : '#ef4444';
  }
  // Desaturated for light theme
  return g === 'A' ? '#10b981' : g === 'B' ? '#0ea5c9' : g === 'C' ? '#d97706' : '#dc2626';
}

function swGradeTint(g) {
  if (isDarkTheme()) {
    return g === 'A' ? 'rgba(52,211,153,0.12)' : g === 'B' ? 'rgba(0,200,230,0.12)' : g === 'C' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)';
  }
  return g === 'A' ? 'rgba(16,185,129,0.12)' : g === 'B' ? 'rgba(14,165,201,0.12)' : g === 'C' ? 'rgba(217,119,6,0.12)' : 'rgba(220,38,38,0.12)';
}

/* Grade tooltip text - matches SmartOS srg-netpulse.js textGrade array */
const GRADE_INFO = {
  A: { label: 'Excellent', text: 'Your latency under load is excellent.' },
  B: { label: 'Good',      text: 'Your latency under load is good.' },
  C: { label: 'Fair',      text: 'Your latency under load is fair.' },
  D: { label: 'Poor',      text: 'Your latency under load is poor.' },
  U: { label: 'Unknown',   text: 'Your latency under load could not be measured.' }
};

function updateGradeTooltip(tipId, grade) {
  var tip = swEl(tipId);
  if (!tip) return;
  var info = GRADE_INFO[grade] || GRADE_INFO['U'];
  var header = tip.querySelector('.st-grade-tip-header');
  var body = tip.querySelector('.st-grade-tip-body');
  if (header) {
    header.textContent = 'Bufferbloat Grade ' + grade + ': ' + info.label;
    header.style.color = swGradeColor(grade);
  }
  if (body) body.textContent = info.text;
  // Show shaper link when grade is not A
  var shaperLink = tip.querySelector('.st-grade-tip-shaper');
  if (shaperLink) {
    shaperLink.style.display = (grade !== 'A') ? '' : 'none';
  }
}

function swFormatSpeed(mbps) {
  if (mbps >= 1000) return (mbps / 1000).toFixed(2);
  return Math.round(mbps).toString();
}

function swFormatSpeedUnit(mbps) {
  return mbps >= 1000 ? 'Gbps' : 'Mbps';
}

function swFormatEpoch(epoch) {
  return new Date(epoch * 1000).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function swTimeAgo(epochOrIso) {
  // Accepts Unix epoch (seconds) or ISO string
  var ms = typeof epochOrIso === 'number' ? epochOrIso * 1000 : new Date(epochOrIso).getTime();
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  return Math.floor(hrs / 24) + 'd ago';
}

/* ===== Mock Data ===== */
/* -----------------------------------------------------------------------
   MOCK data matches the real BBST results JSON schema from bbst_latency.c
   and /tmp/bbst_results.json on the router.

   Integration notes:
   - Start test:    execute /usr/srg/scripts/start_bbst
   - Poll progress: read /tmp/bbst_results.json (updated each rate window)
   - Listen events: ubus listen speedtest (channel: "speedtest")
   - Get history:   read /FLASH/persist/bbst_results/bbst_result_*.json
   - Service rates: UCI network.wan.service_rate_ds_mbps / us_mbps
   ----------------------------------------------------------------------- */
const SW_MOCK = {
  // UCI: network.wan.service_rate_ds_mbps / network.wan.service_rate_us_mbps
  wan: {
    service_rate_ds_mbps: 8000,
    service_rate_us_mbps: 4000
  },

  latestResult: {
    test_status: 'completed',
    test_error: 'n/a',
    starttime: 1774295400.00,
    endtime: 1774295442.00,
    runtime: 42.0,
    client_version: 'bbst v0.4.2',
    download: {
      server_url: 'https://speedtest-atl.adtran.net/download/10G.dat',
      status: 'completed', mbps: 7540, pct_utilization: 94,
      total_byte_rx: 9823456000, progress_pct: 100
    },
    upload: {
      server_url: 'https://speedtest-atl.adtran.net/upload',
      status: 'completed', mbps: 3820, pct_utilization: 95,
      total_byte_tx: 4912345000, progress_pct: 100
    },
    latency: {
      host: 'speedtest-atl.adtran.net',
      idle_avg: 8.2, download_avg: 14.6, upload_avg: 20.1,
      idle_jitter: 1.1, download_jitter: 3.4, upload_jitter: 5.2,
      download_bufferbloat_grade: 'A',
      upload_bufferbloat_grade: 'B'
    },
    server_selection: {
      servers: [
        { rank: 1, download_url: 'https://speedtest-atl.adtran.net/download/10G.dat', Status: 'OK', latency: 8.2, selected: 'yes' },
        { rank: 2, download_url: 'https://speedtest-nyc.adtran.net/download/10G.dat', Status: 'OK', latency: 12.4, selected: 'no' },
        { rank: 3, download_url: 'https://speedtest-dc.adtran.net/download/10G.dat', Status: 'OK', latency: 15.1, selected: 'no' }
      ]
    },
    client: { ip: '99.39.42.110', isp: 'AT&T Internet', city: 'Orlando', country: 'US', lat: 28.5383, lon: -81.3792 },
    server: { host: 'speedtest-atl.adtran.net', city: 'Atlanta', country: 'US', lat: '33.7490', lon: '-84.3880', distance: 680.0, isp: '' },
    test_options: {
      client_mode: 'bbst', downstream_service_rate: 8000, upstream_service_rate: 4000,
      num_streams_download: 8, num_streams_upload: 8, sample_interval: 0.25,
      window_size: 5, stop_window_count: 6, wan_interface: 'eth0',
      select_server_from_list: true, server_list_url: '', server_list_filename: '',
      pppoe_encap: false, vlan_tagged: false
    }
  },

  // 30 historical entries, newest-first (mirrors /FLASH/persist/bbst_results/bbst_result_*.json)
  history: (function() {
    var entries = [];
    var baseEpoch = 1774295400;
    var servers = ['speedtest-atl.adtran.net', 'speedtest-nyc.adtran.net', 'speedtest-dc.adtran.net'];
    var cities = ['Atlanta', 'New York', 'Washington DC'];
    var distances = [680.0, 1320.0, 1100.0];
    var dlSpeeds = [7540,6840,7350,5920,4180,7540,6380,7790,6910,5480,7210,7850,4120,6820,7580,7210,7490,5340,7310,6930,7610,6880,7350,6590,7660,7210,7530,6940,6420,7190];
    var ulSpeeds = [3820,3210,3890,2760,1840,3820,2970,3940,3340,2540,3690,3980,1780,3420,3950,3760,3820,2540,3750,3340,3920,3380,3810,3160,3970,3720,3870,3430,3090,3640];

    for (var i = 0; i < 30; i++) {
      var epoch = baseEpoch - i * 86400;
      var dl = dlSpeeds[i];
      var ul = ulSpeeds[i];
      var idle = 8 + Math.random() * 8;
      var dlLat = idle + 3 + Math.random() * 12;
      var ulLat = idle + 6 + Math.random() * 14;
      var si = i % 3;

      entries.push({
        test_status: 'completed',
        test_error: 'n/a',
        starttime: epoch,
        endtime: epoch + 42,
        runtime: 42.0,
        client_version: 'bbst v0.4.2',
        download: {
          server_url: 'https://' + servers[si] + '/download/10G.dat',
          status: 'completed', mbps: dl,
          pct_utilization: Math.round(dl / 80),
          total_byte_rx: Math.round(dl * 1e6 / 8 * 42),
          progress_pct: 100
        },
        upload: {
          server_url: 'https://' + servers[si] + '/upload',
          status: 'completed', mbps: ul,
          pct_utilization: Math.round(ul / 40),
          total_byte_tx: Math.round(ul * 1e6 / 8 * 42),
          progress_pct: 100
        },
        latency: {
          host: servers[si],
          idle_avg: +idle.toFixed(1),
          download_avg: +dlLat.toFixed(1),
          upload_avg: +ulLat.toFixed(1),
          idle_jitter: +(0.5 + Math.random() * 2).toFixed(1),
          download_jitter: +(1 + Math.random() * 5).toFixed(1),
          upload_jitter: +(2 + Math.random() * 6).toFixed(1),
          download_bufferbloat_grade: computeBBGrade(idle, dlLat),
          upload_bufferbloat_grade: computeBBGrade(idle, ulLat)
        },
        server: { host: servers[si], city: cities[si], country: 'US', lat: '33.7490', lon: '-84.3880', distance: distances[si], isp: '' },
        client: { ip: '99.39.42.110', isp: 'AT&T Internet', city: 'Orlando', country: 'US', lat: 28.5383, lon: -81.3792 },
        test_options: {
          client_mode: 'bbst', downstream_service_rate: 8000, upstream_service_rate: 4000,
          num_streams_download: 8, num_streams_upload: 8
        }
      });
    }
    return entries;
  })()
};

// Epoch is already the starttime (Unix epoch double)
SW_MOCK.latestResult.epoch = Math.floor(SW_MOCK.latestResult.starttime);

/* ===== State ===== */
const TestState = { IDLE: 'idle', LATENCY: 'latency', DOWNLOAD: 'download', UPLOAD: 'upload', COMPLETE: 'complete' };
let currentState = TestState.IDLE;
let testRAF = null;
let advancedOpen = false;
let historyWindow = 0; // 0 = all
let historyMode = 'raw';
let realtimeSamples = { dl: [], ul: [] };
let currentResult = SW_MOCK.latestResult;

/* Theme and sidebar are handled by the dashboard shell */

/* ===== Bufferbloat Grading (matches bbst_latency.c thresholds) ===== */
function computeBBGrade(idleAvg, loadedAvg) {
  if (idleAvg <= 0) return 'U';
  var delta = loadedAvg - idleAvg;
  var pctIncrease = (delta / idleAvg) * 100;
  if (delta < 20 || pctIncrease < 50) return 'A';
  if (pctIncrease < 150) return 'B';
  if (pctIncrease < 300) return 'C';
  return 'D';
}

/* ===== Bufferbloat Summary ===== */
function swGradeRank(g) { const r = { A: 0, B: 1, C: 2, D: 3 }; return g in r ? r[g] : 3; }

function swBbSummary(dlG, ulG) {
  const dlR = swGradeRank(dlG), ulR = swGradeRank(ulG);
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

/* ===== Bufferbloat Score Card (Advanced) ===== */
function renderBufferbloatCard(lat) {
  const dlG = lat.download_bufferbloat_grade;
  const ulG = lat.upload_bufferbloat_grade;
  const body = swEl('st-bb-body');
  if (!body) return;

  // Composite grade: worst of the two
  const worst = swGradeRank(dlG) > swGradeRank(ulG) ? dlG : ulG;

  // Stacked bar data
  const scale = 200;
  const idle = lat.idle_avg;
  const dlDelta = Math.max(0, lat.download_avg - lat.idle_avg);
  const ulDelta = Math.max(0, lat.upload_avg - lat.idle_avg);
  const idlePct = (idle / scale * 100).toFixed(1);
  const dlPct = (dlDelta / scale * 100).toFixed(1);
  const ulPct = (ulDelta / scale * 100).toFixed(1);
  const peak = Math.max(lat.download_avg, lat.upload_avg);

  body.innerHTML =
    '<div class="st-bb-top">' +
      '<div class="st-bb-hero">' +
        '<div class="st-bb-hero-grade" style="color:' + swGradeColorRaw(worst) + ';border-color:' + swGradeColorRaw(worst) + ';background:' + swGradeTint(worst) + '">' + worst + '</div>' +
        '<div class="st-bb-hero-label">Overall</div>' +
      '</div>' +
      '<div class="st-bb-rows">' +
        '<div class="st-bb-detail-row">' +
          '<span class="st-bb-detail-dir"><i class="fa-solid fa-arrow-down"></i> Download</span>' +
          '<span class="st-bb-detail-grade" style="background:' + swGradeTint(dlG) + ';color:' + swGradeColorRaw(dlG) + '">' + dlG + '</span>' +
          '<span class="st-bb-detail-lat">+' + dlDelta.toFixed(1) + ' ms latency under load</span>' +
        '</div>' +
        '<div class="st-bb-detail-row">' +
          '<span class="st-bb-detail-dir"><i class="fa-solid fa-arrow-up"></i> Upload</span>' +
          '<span class="st-bb-detail-grade" style="background:' + swGradeTint(ulG) + ';color:' + swGradeColorRaw(ulG) + '">' + ulG + '</span>' +
          '<span class="st-bb-detail-lat">+' + ulDelta.toFixed(1) + ' ms latency under load</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
    // Stacked bar
    '<div class="st-bb-bar-wrap">' +
          '<div class="st-bb-bar-track">' +
            '<div class="st-bb-bar-seg idle" style="width:' + idlePct + '%"></div>' +
            '<div class="st-bb-bar-seg dl" style="width:' + dlPct + '%"></div>' +
            '<div class="st-bb-bar-seg ul" style="width:' + ulPct + '%"></div>' +
          '</div>' +
          '<div class="st-bb-bar-legend">' +
            '<span><span class="st-bb-swatch idle"></span>' + idle.toFixed(1) + ' ms idle</span>' +
            '<span><span class="st-bb-swatch dl"></span>+' + dlDelta.toFixed(1) + ' ms DL</span>' +
            '<span><span class="st-bb-swatch ul"></span>+' + ulDelta.toFixed(1) + ' ms UL</span>' +
            '<span style="color:var(--text-muted)">Peak ' + peak.toFixed(1) + ' ms</span>' +
          '</div>' +
    '</div>' +
    // Summary
    '<div class="st-bb-summary">' + swBbSummary(dlG, ulG) + '</div>';
}


/* ===== Render Results ===== */
function renderResults(result) {
  const dlMbps = result.download.mbps;
  const ulMbps = result.upload.mbps;
  const lat = result.latency;
  const dlRate = SW_MOCK.wan.service_rate_ds_mbps || 0;
  const ulRate = SW_MOCK.wan.service_rate_us_mbps || 0;

  // Speed values
  swEl('st-dl-value').textContent = swFormatSpeed(dlMbps);
  swEl('st-dl-unit').textContent = swFormatSpeedUnit(dlMbps);
  swEl('st-ul-value').textContent = swFormatSpeed(ulMbps);
  swEl('st-ul-unit').textContent = swFormatSpeedUnit(ulMbps);

  // Grade pills in test card + hover tooltips
  const dlPill = swEl('st-dl-grade');
  dlPill.textContent = lat.download_bufferbloat_grade;
  dlPill.setAttribute('data-grade', lat.download_bufferbloat_grade);
  updateGradeTooltip('st-dl-grade-tip', lat.download_bufferbloat_grade);
  const ulPill = swEl('st-ul-grade');
  ulPill.textContent = lat.upload_bufferbloat_grade;
  ulPill.setAttribute('data-grade', lat.upload_bufferbloat_grade);
  updateGradeTooltip('st-ul-grade-tip', lat.upload_bufferbloat_grade);

  // Idle latency in test card
  swEl('st-latency-value').textContent = lat.idle_avg.toFixed(1);

  // Bufferbloat Score card (advanced section)
  renderBufferbloatCard(lat);

  // Utilization bars with prominent plan text
  if (dlRate > 0) {
    const dlPct = Math.min(100, (dlMbps / dlRate) * 100);
    swEl('st-dl-util-fill').style.width = dlPct.toFixed(1) + '%';
    swEl('st-dl-util-fill').style.background = dlPct >= 80 ? 'var(--accent-cyan)' : dlPct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const dlFmt = dlMbps >= 1000 ? (dlMbps/1000).toFixed(2) + ' Gbps' : Math.round(dlMbps) + ' Mbps';
    const dlRateFmt = dlRate >= 1000 ? (dlRate/1000).toFixed(0) + ' Gbps' : dlRate + ' Mbps';
    swEl('st-dl-util-text').textContent = dlFmt + ' of ' + dlRateFmt + ' plan (' + dlPct.toFixed(1) + '%)';
    swEl('st-dl-util').style.display = '';
  } else {
    swEl('st-dl-util').style.display = 'none';
  }

  if (ulRate > 0) {
    const ulPct = Math.min(100, (ulMbps / ulRate) * 100);
    swEl('st-ul-util-fill').style.width = ulPct.toFixed(1) + '%';
    swEl('st-ul-util-fill').style.background = ulPct >= 80 ? 'var(--accent-magenta)' : ulPct >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)';
    const ulFmt = ulMbps >= 1000 ? (ulMbps/1000).toFixed(2) + ' Gbps' : Math.round(ulMbps) + ' Mbps';
    const ulRateFmt = ulRate >= 1000 ? (ulRate/1000).toFixed(0) + ' Gbps' : ulRate + ' Mbps';
    swEl('st-ul-util-text').textContent = ulFmt + ' of ' + ulRateFmt + ' plan (' + ulPct.toFixed(1) + '%)';
    swEl('st-ul-util').style.display = '';
  } else {
    swEl('st-ul-util').style.display = 'none';
  }

  swEl('st-results').style.display = '';
  swEl('st-results').className = 'st-results st-fade-in';

  // Last test time
  swEl('st-last-time').textContent = 'Last test: ' + swTimeAgo(result.starttime);

  // Connection info
  renderConnectionInfo(result);

  // Draw throughput chart if we have realtime samples
  if (realtimeSamples.dl.length > 0 || realtimeSamples.ul.length > 0) {
    swEl('st-realtime-empty').style.display = 'none';
    drawRealtimeChart('st-realtime-adv-canvas');
    swEl('st-realtime-status').textContent = swFormatEpoch(Math.floor(result.starttime));
    swEl('st-realtime-status').className = 'st-realtime-status';
  } else {
    swEl('st-realtime-empty').style.display = '';
  }

  // History chart (always visible in basic view)
  renderHistoryChart();

  // Advanced panels
  renderLatencyGrid(result);

  currentResult = result;
}

/* ===== Connection Info ===== */
function renderConnectionInfo(result) {
  swEl('st-info-server').textContent = result.server.city;
  swEl('st-info-isp').textContent = result.client.isp;
  swEl('st-info-ip').textContent = result.client.ip;
  const dlR = SW_MOCK.wan.service_rate_ds_mbps;
  const ulR = SW_MOCK.wan.service_rate_us_mbps;
  if (dlR > 0 && ulR > 0) {
    const dlFmt = dlR >= 1000 ? (dlR/1000).toFixed(0) + 'G' : dlR + 'M';
    const ulFmt = ulR >= 1000 ? (ulR/1000).toFixed(0) + 'G' : ulR + 'M';
    swEl('st-info-plan').textContent = dlFmt + ' / ' + ulFmt;
  } else {
    swEl('st-info-plan').textContent = 'Not configured';
  }
  // Distance is in km (number). Convert to miles for imperial countries.
  var distKm = result.server.distance || 0;
  if (distKm > 0) {
    var imperialCountries = ['US', 'GB', 'MM', 'LR'];
    if (imperialCountries.indexOf(result.client.country || '') !== -1) {
      swEl('st-info-distance').textContent = Math.round(distKm * 0.621371) + ' mi';
    } else {
      swEl('st-info-distance').textContent = Math.round(distKm) + ' km';
    }
  } else {
    swEl('st-info-distance').textContent = '--';
  }
  swEl('st-info-duration').textContent = result.runtime + 's';
  // Server candidates tested
  var ss = result.server_selection && result.server_selection.servers;
  if (ss && ss.length > 0) {
    const count = ss.length;
    swEl('st-info-servers').textContent = count + ' server' + (count > 1 ? 's' : '') + ' evaluated';
  }
}

/* ===== Latency Grid (Advanced) ===== */
function renderLatencyGrid(result) {
  const lat = result.latency;
  swEl('st-lat-idle-avg').textContent = lat.idle_avg.toFixed(1);
  swEl('st-lat-idle-jitter').textContent = lat.idle_jitter.toFixed(1);
  swEl('st-lat-dl-avg').textContent = lat.download_avg.toFixed(1);
  swEl('st-lat-dl-jitter').textContent = lat.download_jitter.toFixed(1);
  swEl('st-lat-ul-avg').textContent = lat.upload_avg.toFixed(1);
  swEl('st-lat-ul-jitter').textContent = lat.upload_jitter.toFixed(1);

  // Deltas
  const dlDelta = lat.download_avg - lat.idle_avg;
  const ulDelta = lat.upload_avg - lat.idle_avg;

  function deltaClass(d) {
    if (d < 5) return 'good';
    if (d < 20) return 'moderate';
    return 'bad';
  }

  const dlDeltaEl = swEl('st-lat-dl-delta');
  dlDeltaEl.textContent = '+' + dlDelta.toFixed(1) + ' ms';
  dlDeltaEl.className = 'st-latency-delta ' + deltaClass(dlDelta);

  const ulDeltaEl = swEl('st-lat-ul-delta');
  ulDeltaEl.textContent = '+' + ulDelta.toFixed(1) + ' ms';
  ulDeltaEl.className = 'st-latency-delta ' + deltaClass(ulDelta);
}

/* ===== Speed Gauge (Canvas) ===== */
function drawSpeedGauge(value, maxValue, color, phaseLabel) {
  const canvas = swEl('st-gauge-canvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const cssW = wrap.clientWidth;
  const cssH = wrap.clientHeight;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const DEG = Math.PI / 180;
  const sweepRad = 240 * DEG;
  const startAngle = 150 * DEG;
  const endAngle = 30 * DEG;

  const cx = cssW / 2;
  const cy = cssH * 0.55;
  const r = Math.min(cy - 6, cx - 10);

  // Use logarithmic scale for wide speed range
  const logMax = Math.log10(Math.max(10, maxValue));
  const logVal = Math.log10(Math.max(1, value));
  const norm = Math.min(1, logVal / logMax);
  const needleAngle = startAngle + norm * sweepRad;

  // Arc track
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle, false);
  ctx.strokeStyle = canvasText(0.12);
  ctx.lineWidth = Math.max(3, r * 0.035);
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Colored progress arc
  if (value > 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, needleAngle, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, r * 0.035);
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  // Graduation ticks
  const tickValues = [0, 10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
  const visibleTicks = tickValues.filter(v => v <= maxValue);
  visibleTicks.forEach(tv => {
    const tNorm = tv === 0 ? 0 : Math.log10(Math.max(1, tv)) / logMax;
    const a = startAngle + tNorm * sweepRad;
    const isMajor = [0, 100, 1000, 5000, 10000].includes(tv);
    const inner = r - (isMajor ? r * 0.14 : r * 0.08);
    const outer = r + 1;
    ctx.beginPath();
    ctx.moveTo(cx + inner * Math.cos(a), cy + inner * Math.sin(a));
    ctx.lineTo(cx + outer * Math.cos(a), cy + outer * Math.sin(a));
    ctx.strokeStyle = isMajor ? canvasText(0.5) : canvasText(0.2);
    ctx.lineWidth = isMajor ? 1.5 : 0.8;
    ctx.stroke();

    // Tick labels for major ticks
    if (isMajor && tv > 0) {
      const lblR = r - r * 0.24;
      const lx = cx + lblR * Math.cos(a);
      const ly = cy + lblR * Math.sin(a);
      ctx.font = '500 ' + Math.round(r * 0.09) + 'px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = canvasText(0.4);
      const lbl = tv >= 1000 ? (tv/1000) + 'G' : tv.toString();
      ctx.fillText(lbl, lx, ly);
    }
  });

  // Tapered needle
  const needleLen = r - 6;
  const tipX = cx + needleLen * Math.cos(needleAngle);
  const tipY = cy + needleLen * Math.sin(needleAngle);
  const baseHalf = Math.max(3, r * 0.05);
  const perpN = needleAngle + Math.PI / 2;
  ctx.save();
  var needleColor = isDarkTheme() ? '#ffffff' : '#1f2937';
  ctx.shadowColor = canvasText(0.4);
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(cx + baseHalf * Math.cos(perpN), cy + baseHalf * Math.sin(perpN));
  ctx.lineTo(cx - baseHalf * Math.cos(perpN), cy - baseHalf * Math.sin(perpN));
  ctx.closePath();
  ctx.fillStyle = needleColor;
  ctx.fill();
  ctx.restore();

  // Pivot dot
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(3, r * 0.05), 0, Math.PI * 2);
  ctx.fillStyle = needleColor;
  ctx.fill();
}

/* ===== Real-time Throughput Chart ===== */
function drawRealtimeChart(canvasId) {
  const canvas = swEl(canvasId || 'st-realtime-canvas');
  if (!canvas) return;

  const dpr = window.devicePixelRatio || 1;
  const wrap = canvas.parentElement;
  const W = wrap.clientWidth;
  const H = wrap.clientHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const pad = { top: 10, right: 10, bottom: 24, left: 50 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  const allSamples = [...realtimeSamples.dl, ...realtimeSamples.ul];
  if (allSamples.length === 0) {
    ctx.fillStyle = canvasText(0.15);
    ctx.font = '12px "Poppins", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run a test to see throughput data', W / 2, H / 2);
    return;
  }

  const maxT = Math.max(...allSamples.map(s => s.t), 10);
  // Pre-scale Y to service rate so user sees performance relative to plan
  const serviceMax = Math.max(SW_MOCK.wan.service_rate_ds_mbps || 0, SW_MOCK.wan.service_rate_us_mbps || 0);
  const yMax = serviceMax > 0 ? Math.ceil(serviceMax * 1.1 / 100) * 100 : Math.ceil(Math.max(...allSamples.map(s => s.mbps), 100) * 1.15 / 100) * 100;
  const xScale = cW / maxT;
  const yScale = cH / yMax;

  // Grid
  const gridSteps = 4;
  ctx.font = '10px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let i = 0; i <= gridSteps; i++) {
    const val = yMax * i / gridSteps;
    const y = pad.top + cH - val * yScale;
    ctx.strokeStyle = i === 0 ? canvasText(0.15) : canvasText(0.06);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
    const lbl = val >= 1000 ? (val/1000).toFixed(0) + 'G' : Math.round(val).toString();
    ctx.fillStyle = canvasText(0.35);
    ctx.fillText(lbl, pad.left - 5, y);
  }

  // Draw area chart for each direction
  function drawArea(samples, strokeColor, fillTop, fillBot) {
    if (samples.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pad.left + samples[0].t * xScale, pad.top + cH - samples[0].mbps * yScale);
    for (let i = 1; i < samples.length; i++) {
      ctx.lineTo(pad.left + samples[i].t * xScale, pad.top + cH - samples[i].mbps * yScale);
    }
    // Stroke
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Fill
    const lastSample = samples[samples.length - 1];
    ctx.lineTo(pad.left + lastSample.t * xScale, pad.top + cH);
    ctx.lineTo(pad.left + samples[0].t * xScale, pad.top + cH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, fillTop);
    grad.addColorStop(1, fillBot);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // Contracted rate dashed lines
  const dlRate = SW_MOCK.wan.service_rate_ds_mbps;
  const ulRate = SW_MOCK.wan.service_rate_us_mbps;
  ctx.save();
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1;
  ctx.font = '9px monospace';
  ctx.textBaseline = 'bottom';
  if (dlRate > 0 && dlRate <= yMax) {
    const yDl = pad.top + cH - dlRate * yScale;
    ctx.strokeStyle = 'rgba(0,200,230,0.5)';
    ctx.beginPath(); ctx.moveTo(pad.left, yDl); ctx.lineTo(pad.left + cW, yDl); ctx.stroke();
    ctx.fillStyle = 'rgba(0,200,230,0.6)';
    ctx.textAlign = 'right';
    const dlLbl = dlRate >= 1000 ? (dlRate/1000).toFixed(0) + 'G DL' : dlRate + ' DL';
    ctx.fillText(dlLbl, pad.left + cW, yDl - 2);
  }
  if (ulRate > 0 && ulRate <= yMax) {
    const yUl = pad.top + cH - ulRate * yScale;
    ctx.strokeStyle = 'rgba(232,121,249,0.5)';
    ctx.beginPath(); ctx.moveTo(pad.left, yUl); ctx.lineTo(pad.left + cW, yUl); ctx.stroke();
    ctx.fillStyle = 'rgba(232,121,249,0.6)';
    ctx.textAlign = 'right';
    const ulLbl = ulRate >= 1000 ? (ulRate/1000).toFixed(0) + 'G UL' : ulRate + ' UL';
    ctx.fillText(ulLbl, pad.left + cW, yUl - 2);
  }
  ctx.restore();

  drawArea(realtimeSamples.dl, '#00C8E6', 'rgba(0,200,230,0.35)', 'rgba(0,200,230,0.02)');
  drawArea(realtimeSamples.ul, '#e879f9', 'rgba(232,121,249,0.30)', 'rgba(232,121,249,0.02)');

  // X-axis labels
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '10px monospace';
  ctx.fillStyle = canvasText(0.35);
  for (let t = 0; t <= maxT; t += Math.max(1, Math.round(maxT / 6))) {
    const x = pad.left + t * xScale;
    ctx.fillText(t + 's', x, pad.top + cH + 6);
  }
}

/* ===== History Chart ===== */
function setHistoryWindow(days) {
  historyWindow = days;
  document.querySelectorAll('#sth-btn-10, #sth-btn-30, #sth-btn-all').forEach(b => b.classList.remove('active'));
  if (days === 10) swEl('sth-btn-10').classList.add('active');
  else if (days === 30) swEl('sth-btn-30').classList.add('active');
  else swEl('sth-btn-all').classList.add('active');
  renderHistoryChart();
}

function setHistoryMode(mode) {
  const dlRate = SW_MOCK.wan.service_rate_ds_mbps || 0;
  const ulRate = SW_MOCK.wan.service_rate_us_mbps || 0;
  if (mode === 'pct' && (!dlRate || !ulRate)) return;
  historyMode = mode;
  swEl('sth-btn-pct').classList.toggle('active', mode === 'pct');
  swEl('sth-btn-raw').classList.toggle('active', mode === 'raw');
  renderHistoryChart();
}

function renderHistoryChart() {
  const canvas = swEl('st-history-canvas');
  if (!canvas) return;

  const dlRate = SW_MOCK.wan.service_rate_ds_mbps || 0;
  const ulRate = SW_MOCK.wan.service_rate_us_mbps || 0;
  const hasRates = dlRate > 0 && ulRate > 0;

  // Enable/disable pct button
  const pctBtn = swEl('sth-btn-pct');
  if (hasRates) { pctBtn.disabled = false; pctBtn.title = ''; }
  else { pctBtn.disabled = true; pctBtn.title = 'Service rate not configured'; if (historyMode === 'pct') historyMode = 'raw'; }

  const usePct = historyMode === 'pct' && hasRates;
  const maxRate = Math.max(dlRate, ulRate);
  swEl('sth-btn-raw').textContent = maxRate > 999 ? 'Gbps' : 'Mbps';

  // Filter tests
  let tests = SW_MOCK.history.filter(s => s.test_status === 'completed');
  if (historyWindow > 0) tests = tests.slice(0, historyWindow);
  tests = tests.slice().reverse(); // oldest first for drawing
  const n = tests.length;
  if (n === 0) return;

  // Size canvas
  const scrollEl = swEl('sth-scroll');
  const wrapW = scrollEl.clientWidth || 400;
  const H = scrollEl.clientHeight || 250;
  const minGroupW = 52;
  const naturalW = n * minGroupW + 60;
  const W = Math.max(wrapW, naturalW);

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // Sync overlay canvas size (flows in document, overlaps main canvas via negative margin)
  const overlay = swEl('st-history-overlay');
  if (overlay) {
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    overlay.style.width = W + 'px';
    overlay.style.height = H + 'px';
    overlay.style.marginTop = '-' + H + 'px';
  }

  const pad = { top: 10, right: 8, bottom: 50, left: 8 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;

  // Y axis
  let yMax;
  if (usePct) {
    yMax = 100;
  } else {
    const rawMax = Math.max(...tests.map(t => t.download.mbps));
    const headroom = rawMax * 1.3;
    const ceil = rawMax <= 1000 ? Math.ceil(headroom / 100) * 100 : Math.ceil(headroom / 1000) * 1000;
    yMax = Math.min(ceil, 10000);
  }
  const yScale = cH / yMax;

  // Render persistent Y-axis labels into HTML overlay
  const yAxisEl = swEl('sth-yaxis');
  if (yAxisEl) {
    const gridSteps = 4;
    let labels = '';
    for (let i = gridSteps; i >= 0; i--) {
      const val = yMax * i / gridSteps;
      let lbl;
      if (usePct) lbl = i === 0 ? '0' : Math.round(val) + '%';
      else lbl = val === 0 ? '0' : val >= 1000 ? (val/1000).toFixed(0) + 'G' : Math.round(val).toString();
      labels += '<span>' + lbl + '</span>';
    }
    yAxisEl.innerHTML = labels;
  }

  // Grid lines (no Y labels on canvas)
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = yMax * i / gridSteps;
    const y = pad.top + cH - val * yScale;
    ctx.strokeStyle = i === 0 ? canvasText(0.20) : canvasText(0.07);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cW, y); ctx.stroke();
  }

  // Service rate lines
  if (!usePct && hasRates) {
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.2;
    const dlLineY = pad.top + cH - Math.min(dlRate, yMax) * yScale;
    ctx.strokeStyle = 'rgba(0,200,230,0.50)';
    ctx.beginPath(); ctx.moveTo(pad.left, dlLineY); ctx.lineTo(pad.left + cW, dlLineY); ctx.stroke();
    ctx.font = '9px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,200,230,0.65)';
    ctx.fillText((dlRate >= 1000 ? (dlRate/1000).toFixed(0) + 'G' : dlRate + 'M') + ' DL', pad.left + cW - 4, dlLineY - 2);

    const ulLineY = pad.top + cH - Math.min(ulRate, yMax) * yScale;
    ctx.strokeStyle = 'rgba(52,211,153,0.50)';
    ctx.beginPath(); ctx.moveTo(pad.left, ulLineY); ctx.lineTo(pad.left + cW, ulLineY); ctx.stroke();
    ctx.fillStyle = 'rgba(52,211,153,0.65)';
    ctx.fillText((ulRate >= 1000 ? (ulRate/1000).toFixed(0) + 'G' : ulRate + 'M') + ' UL', pad.left + cW - 4, ulLineY - 2);
    ctx.setLineDash([]);
  }

  // Bars - fixed max width so few samples don't produce fat bars
  const maxGroupW = 48;
  const groupW = Math.min(maxGroupW, cW / n);
  const gap = groupW * 0.22;
  const barW = Math.max(2, (groupW - gap * 2) / 2 - 1.5);
  // Center the bar cluster when fewer tests don't fill the chart
  const totalBarsW = groupW * n;
  const barsOffsetX = (cW - totalBarsW) / 2;
  const baseY = pad.top + cH;
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const labelEvery = Math.max(1, Math.floor(n / 7));

  canvas._bars = [];

  tests.forEach((st, i) => {
    const dlMbps = st.download.mbps;
    const ulMbps = st.upload.mbps;
    const dlVal = usePct ? Math.min(100, dlMbps / dlRate * 100) : dlMbps;
    const ulVal = usePct ? Math.min(100, ulMbps / ulRate * 100) : ulMbps;
    const gx = pad.left + barsOffsetX + i * groupW + gap;
    const dlH = Math.max(2, dlVal * yScale);
    const ulH = Math.max(2, ulVal * yScale);
    const dlX = gx;
    const ulX = gx + barW + 1.5;
    const barCx = gx + barW;

    // DL bar (cyan)
    ctx.fillStyle = 'rgba(0,200,230,0.82)';
    ctx.fillRect(dlX, baseY - dlH, barW, dlH);

    // UL bar (green)
    ctx.fillStyle = 'rgba(52,211,153,0.82)';
    ctx.fillRect(ulX, baseY - ulH, barW, ulH);

    // Grade dot below bars
    const worse = swGradeRank(st.latency.download_bufferbloat_grade) > swGradeRank(st.latency.upload_bufferbloat_grade)
      ? st.latency.download_bufferbloat_grade : st.latency.upload_bufferbloat_grade;
    ctx.beginPath();
    ctx.arc(barCx, baseY + 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = swGradeColorRaw(worse);
    ctx.fill();

    // X labels
    const epoch = st.epoch || Math.floor(st.starttime);
    if (i === 0 || i === n - 1 || i % labelEvery === 0) {
      const d = new Date(epoch * 1000);
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = canvasText(0.60); ctx.font = '11px monospace';
      ctx.fillText(DAYS[d.getDay()], barCx, baseY + 10);
      ctx.fillStyle = canvasText(0.35); ctx.font = '10px monospace';
      ctx.fillText((d.getMonth()+1) + '/' + d.getDate(), barCx, baseY + 24);
    }

    canvas._bars.push({
      x1: gx, x2: gx + barW * 2 + 1.5 + gap,
      dlX, dlH, ulX, ulH, barW, baseY,
      dlVal, ulVal, usePct, st, epoch
    });
  });

  // Mouse events
  if (!canvas._sthEvents) {
    canvas._sthEvents = true;
    canvas.addEventListener('mousemove', onHistoryMouseMove);
    canvas.addEventListener('mouseleave', () => { swEl('st-history-tooltip').style.display = 'none'; stopBarHighlight(); });
    canvas.addEventListener('click', onHistoryClick);
  }

  // Scroll to right
  if (W > wrapW) {
    requestAnimationFrame(() => { scrollEl.scrollLeft = scrollEl.scrollWidth; });
  }
}

/* ===== History Bar Highlight / Pulse ===== */
let _hlBar = null, _hlRaf = null;

function startBarHighlight(bar) {
  if (_hlBar === bar) return;
  _hlBar = bar;
  if (!_hlRaf) pulseHighlight();
}

function stopBarHighlight() {
  _hlBar = null;
  if (_hlRaf) { cancelAnimationFrame(_hlRaf); _hlRaf = null; }
  const ov = swEl('st-history-overlay');
  if (ov) {
    const ctx = ov.getContext('2d');
    ctx.clearRect(0, 0, ov.width, ov.height);
  }
}

function pulseHighlight() {
  const ov = swEl('st-history-overlay');
  const bar = _hlBar;
  if (!ov || !bar) { _hlRaf = null; return; }
  const dpr = window.devicePixelRatio || 1;
  const ctx = ov.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ov.width / dpr, ov.height / dpr);

  // Pulse: alpha oscillates between 0.4 and 0.9
  const t = (Math.sin(Date.now() / 400) + 1) / 2;
  const alpha = 0.4 + t * 0.5;

  const r = 3;
  const expand = 3;

  // DL bar glow
  ctx.save();
  ctx.shadowColor = 'rgba(0,200,230,' + alpha + ')';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(0,200,230,' + (alpha * 0.55) + ')';
  roundRect(ctx, bar.dlX - expand, bar.baseY - bar.dlH - expand, bar.barW + expand * 2, bar.dlH + expand, r);
  ctx.fill();
  // Double-draw for stronger glow
  ctx.fill();
  ctx.restore();

  // UL bar glow
  ctx.save();
  ctx.shadowColor = 'rgba(52,211,153,' + alpha + ')';
  ctx.shadowBlur = 18;
  ctx.fillStyle = 'rgba(52,211,153,' + (alpha * 0.55) + ')';
  roundRect(ctx, bar.ulX - expand, bar.baseY - bar.ulH - expand, bar.barW + expand * 2, bar.ulH + expand, r);
  ctx.fill();
  ctx.fill();
  ctx.restore();

  _hlRaf = requestAnimationFrame(pulseHighlight);
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function onHistoryMouseMove(e) {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const bar = (canvas._bars || []).find(b => mx >= b.x1 && mx <= b.x2);
  const tt = swEl('st-history-tooltip');
  if (!bar) {
    tt.style.display = 'none';
    stopBarHighlight();
    return;
  }
  startBarHighlight(bar);

  const st = bar.st;
  const epoch = bar.epoch || Math.floor(st.starttime);
  const d = new Date(epoch * 1000);
  const date = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

  const fmtDL = bar.usePct ? bar.dlVal.toFixed(1) + '%' : (bar.dlVal >= 1000 ? (bar.dlVal/1000).toFixed(2) + ' Gbps' : Math.round(bar.dlVal) + ' Mbps');
  const fmtUL = bar.usePct ? bar.ulVal.toFixed(1) + '%' : (bar.ulVal >= 1000 ? (bar.ulVal/1000).toFixed(2) + ' Gbps' : Math.round(bar.ulVal) + ' Mbps');

  tt.innerHTML =
    `<div class="sth-tt-date">${date}</div>` +
    `<div class="sth-tt-server">${st.server.host || st.server.city}</div>` +
    `<div class="sth-tt-row"><span class="sth-tt-dl">DL</span> ${fmtDL} <span class="sth-tt-grade" data-grade="${st.latency.download_bufferbloat_grade}">${st.latency.download_bufferbloat_grade}</span></div>` +
    `<div class="sth-tt-row"><span class="sth-tt-ul">UL</span> ${fmtUL} <span class="sth-tt-grade" data-grade="${st.latency.upload_bufferbloat_grade}">${st.latency.upload_bufferbloat_grade}</span></div>` +
    `<div class="sth-tt-lat">${st.latency.idle_avg.toFixed(0)} ms idle</div>` +
    `<div class="sth-tt-lat">DL ${st.latency.download_avg.toFixed(0)} ms / UL ${st.latency.upload_avg.toFixed(0)} ms loaded</div>`;
  tt.style.display = 'block';

  const ttW = 170;
  let tx = e.clientX + 12;
  let ty = e.clientY - 10;
  if (tx + ttW > window.innerWidth - 8) tx = e.clientX - ttW - 12;
  if (ty < 0) ty = 4;
  tt.style.left = tx + 'px';
  tt.style.top = ty + 'px';
}

function onHistoryClick(e) {
  const canvas = e.currentTarget;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const bar = (canvas._bars || []).find(b => mx >= b.x1 && mx <= b.x2);
  if (!bar) return;
  renderDetailPanel(bar.st);
}

/* ===== History Grab-to-Scroll ===== */
function initHistoryScroll() {
  const scrollEl = swEl('sth-scroll');
  if (!scrollEl) return;
  let isDragging = false, startX = 0, startScrollLeft = 0;
  scrollEl.addEventListener('mousedown', e => {
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
}

/* ===== Detail Panel ===== */
function renderDetailPanel(result) {
  const panel = swEl('st-detail-card');
  panel.style.display = '';
  const epoch = result.epoch || Math.floor(result.starttime);
  swEl('st-detail-title').textContent = 'Test Detail: ' + new Date(epoch * 1000).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  const dlMbps = result.download.mbps;
  const ulMbps = result.upload.mbps;
  const lat = result.latency;
  const dlRate = SW_MOCK.wan.service_rate_ds_mbps;
  const ulRate = SW_MOCK.wan.service_rate_us_mbps;

  swEl('st-detail-body').innerHTML = `
    <div class="st-detail-section">
      <div class="st-detail-heading">Speed</div>
      <div class="st-detail-row"><span class="st-detail-key">Download</span><span class="st-detail-val">${swFormatSpeed(dlMbps)} ${swFormatSpeedUnit(dlMbps)}</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Upload</span><span class="st-detail-val">${swFormatSpeed(ulMbps)} ${swFormatSpeedUnit(ulMbps)}</span></div>
      ${dlRate > 0 ? `<div class="st-detail-row"><span class="st-detail-key">DL Utilization</span><span class="st-detail-val">${(dlMbps/dlRate*100).toFixed(1)}%</span></div>` : ''}
      ${ulRate > 0 ? `<div class="st-detail-row"><span class="st-detail-key">UL Utilization</span><span class="st-detail-val">${(ulMbps/ulRate*100).toFixed(1)}%</span></div>` : ''}
    </div>
    <div class="st-detail-section">
      <div class="st-detail-heading">Latency</div>
      <div class="st-detail-row"><span class="st-detail-key">Idle</span><span class="st-detail-val">${lat.idle_avg.toFixed(1)} ms</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Download</span><span class="st-detail-val">${lat.download_avg.toFixed(1)} ms (+${(lat.download_avg - lat.idle_avg).toFixed(1)})</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Upload</span><span class="st-detail-val">${lat.upload_avg.toFixed(1)} ms (+${(lat.upload_avg - lat.idle_avg).toFixed(1)})</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Jitter (idle)</span><span class="st-detail-val">${lat.idle_jitter.toFixed(1)} ms</span></div>
    </div>
    <div class="st-detail-section">
      <div class="st-detail-heading">Bufferbloat</div>
      <div class="st-detail-row"><span class="st-detail-key">Download Grade</span><span class="st-detail-val" style="color:${swGradeColorRaw(lat.download_bufferbloat_grade)}">${lat.download_bufferbloat_grade}</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Upload Grade</span><span class="st-detail-val" style="color:${swGradeColorRaw(lat.upload_bufferbloat_grade)}">${lat.upload_bufferbloat_grade}</span></div>
    </div>
    <div class="st-detail-section">
      <div class="st-detail-heading">Server</div>
      <div class="st-detail-row"><span class="st-detail-key">Host</span><span class="st-detail-val">${result.server.host || '--'}</span></div>
      <div class="st-detail-row"><span class="st-detail-key">City</span><span class="st-detail-val">${result.server.city || '--'}</span></div>
      <div class="st-detail-row"><span class="st-detail-key">Distance</span><span class="st-detail-val">${result.server.distance ? Math.round(result.server.distance * 0.621371) + ' mi' : '--'}</span></div>
    </div>
  `;
}

function closeDetail() {
  swEl('st-detail-card').style.display = 'none';
}

/* ===== Export ===== */
function exportHistory() {
  const data = JSON.stringify(SW_MOCK.history, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'speedtest-history.json';
  a.click();
  URL.revokeObjectURL(url);
}

/* ===== Advanced Toggle ===== */
function toggleAdvanced() {
  advancedOpen = !advancedOpen;
  const panel = swEl('st-advanced');
  const btn = swEl('st-advanced-toggle');
  const text = swEl('st-advanced-toggle-text');

  if (advancedOpen) {
    panel.style.display = '';
    btn.classList.add('open');
    text.textContent = 'Hide Advanced Details';
    if (realtimeSamples.dl.length > 0 || realtimeSamples.ul.length > 0) {
      drawRealtimeChart('st-realtime-adv-canvas');
    }
  } else {
    panel.style.display = 'none';
    btn.classList.remove('open');
    text.textContent = 'Show Advanced Details';
  }
  localStorage.setItem('st-advanced', advancedOpen ? '1' : '0');
}

/* ===== Test State Machine ===== */
function generateSpeedCurve(targetMbps, durationMs, sampleIntervalMs) {
  const samples = [];
  const tau = durationMs * 0.25; // time constant
  const numSamples = Math.floor(durationMs / sampleIntervalMs);
  for (let i = 0; i <= numSamples; i++) {
    const t = i * sampleIntervalMs;
    const base = targetMbps * (1 - Math.exp(-t / tau));
    const jitter = targetMbps * 0.04 * (Math.random() - 0.5);
    const val = Math.max(0, base + jitter);
    samples.push({ t: t / 1000, mbps: val });
  }
  return samples;
}

function startTest() {
  if (currentState !== TestState.IDLE) return;

  // Cancel any lingering animation frame from a previous test
  if (testRAF) { cancelAnimationFrame(testRAF); testRAF = null; }

  // Morph GO button into gauge -- hide button, show canvas + live speed
  const goBtn = swEl('st-go-btn');
  goBtn.classList.remove('pulsing');
  goBtn.classList.add('hidden');
  swEl('st-gauge-area').classList.add('testing');
  swEl('st-live-speed').style.display = '';

  // Fade out previous results before hiding
  var fadeEls = [swEl('st-results')];
  fadeEls.forEach(function(elem) {
    if (elem && elem.style.display !== 'none') {
      elem.style.transition = 'opacity 0.6s ease-out';
      elem.style.opacity = '0';
    }
  });
  setTimeout(function() {
    fadeEls.forEach(function(elem) {
      if (elem) { elem.style.display = 'none'; elem.style.opacity = ''; elem.style.transition = ''; }
    });
  }, 600);

  swEl('st-phase-bar').style.display = 'flex';
  swEl('st-realtime-inline').style.display = 'none';
  swEl('st-realtime-empty').style.display = '';
  var rtCanvas = swEl('st-realtime-adv-canvas');
  if (rtCanvas) { var ctx = rtCanvas.getContext('2d'); ctx.clearRect(0, 0, rtCanvas.width, rtCanvas.height); }

  document.querySelectorAll('.st-phase').forEach(p => { p.classList.remove('active', 'done'); });

  if (swEl('st-dl-util-fill')) swEl('st-dl-util-fill').style.width = '0%';
  if (swEl('st-ul-util-fill')) swEl('st-ul-util-fill').style.width = '0%';

  realtimeSamples = { dl: [], ul: [] };

  // Target values (from mock)
  const targetDL = SW_MOCK.latestResult.download.mbps;
  const targetUL = SW_MOCK.latestResult.upload.mbps;
  const targetLat = SW_MOCK.latestResult.latency;

  // Generate speed curves
  const dlCurve = generateSpeedCurve(targetDL, 8000, 50);
  const ulCurve = generateSpeedCurve(targetUL, 8000, 50);

  // Phase 1: Multi-server ping race
  currentState = TestState.LATENCY;
  swEl('st-phase-latency').classList.add('active');
  swEl('st-live-speed').style.display = 'none'; // hide speed readout during race
  swEl('st-gauge-area').classList.add('racing'); // expand to full width for race lanes
  swEl('st-go-subtitle').style.display = '';
  swEl('st-go-subtitle').textContent = 'Evaluating servers';

  // Server race config from mock data (real schema: server_selection.servers[])
  var ssList = SW_MOCK.latestResult.server_selection.servers;
  var cityLookup = {
    'atl': 'Atlanta', 'nyc': 'New York', 'dc': 'Washington DC', 'chi': 'Chicago',
    'dal': 'Dallas', 'den': 'Denver', 'lax': 'Los Angeles', 'sfo': 'San Francisco',
    'sea': 'Seattle', 'mia': 'Miami', 'bos': 'Boston', 'phx': 'Phoenix',
    'hou': 'Houston', 'min': 'Minneapolis', 'stl': 'St. Louis', 'det': 'Detroit',
    'pit': 'Pittsburgh', 'clt': 'Charlotte', 'orl': 'Orlando', 'tam': 'Tampa',
    'jax': 'Jacksonville', 'nas': 'Nashville', 'slc': 'Salt Lake City',
    'kc': 'Kansas City', 'ind': 'Indianapolis', 'col': 'Columbus', 'ral': 'Raleigh',
    'pdx': 'Portland', 'san': 'San Diego', 'sac': 'Sacramento', 'lv': 'Las Vegas'
  };
  var servers = ssList.map(function(s) {
    // Extract city abbreviation from download_url hostname, resolve to full name
    var host = s.download_url.replace(/^https?:\/\//, '').split('/')[0];
    var abbr = host.replace(/speedtest-/, '').replace(/\.adtran\.net.*/, '').toLowerCase();
    var city = cityLookup[abbr] || (abbr.charAt(0).toUpperCase() + abbr.slice(1));
    return { name: city, latency: s.latency, selected: s.selected === 'yes' };
  });
  // Sort by latency so fastest finishes first
  servers.sort(function(a, b) { return a.latency - b.latency; });

  var raceColors = ['#00C8E6', '#e879f9', '#fbbf24']; // cyan, magenta, amber
  var baseCycle = 900; // ms per round-trip for fastest server
  var maxLat = Math.max.apply(null, servers.map(function(s) { return s.latency; }));
  var totalRoundTrips = 1;
  var raceTotalDur = baseCycle * (maxLat / servers[0].latency) * totalRoundTrips;
  var settleDur = 1200;

  var raceStart = performance.now();

  function animatePingRace(now) {
    var elapsed = now - raceStart;
    var canvas = swEl('st-gauge-canvas');
    if (!canvas) return;

    var dpr = window.devicePixelRatio || 1;
    var wrap = canvas.parentElement;
    var cssW = wrap.clientWidth;
    var cssH = wrap.clientHeight;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    var padL = cssW * 0.08;
    var padR = cssW * 0.34; // room for server name labels right of endpoint
    var x0 = padL, x1 = cssW - padR;
    var laneH = 36;
    var startY = cssH * 0.28;

    // "You" label
    ctx.font = '600 11px Poppins, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('YOU', x0, startY - 18);

    // You endpoint dot
    ctx.fillStyle = '#00C8E6';
    ctx.beginPath(); ctx.arc(x0, startY, 4, 0, Math.PI * 2); ctx.fill();

    servers.forEach(function(srv, idx) {
      var color = raceColors[idx] || '#64748b';
      var cycleDur = baseCycle * (srv.latency / servers[0].latency);
      var srvTotalDur = cycleDur * totalRoundTrips;
      var y = startY + idx * laneH;

      // Lane dashed line
      ctx.save();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x0 + 10, y); ctx.lineTo(x1 - 10, y); ctx.stroke();
      ctx.restore();

      // Server label (left of endpoint dot)
      ctx.font = '500 10px Poppins, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(srv.name, x1 + 12, y + 4);

      // Server endpoint
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x1, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      if (elapsed < srvTotalDur) {
        // Animate dot
        var cycleT = (elapsed % cycleDur) / cycleDur;
        var t, goingRight;
        if (cycleT < 0.5) { t = cycleT * 2; goingRight = true; }
        else { t = (cycleT - 0.5) * 2; goingRight = false; }
        var ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        var dotX = goingRight ? x0 + (x1 - x0) * ease : x1 - (x1 - x0) * ease;

        // Glow
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(dotX, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

        // Dot
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(dotX, y, 4, 0, Math.PI * 2); ctx.fill();
      } else {
        // Done: show latency result
        var doneT = Math.min(1, (elapsed - srvTotalDur) / 400);
        ctx.globalAlpha = doneT;
        ctx.font = '600 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.fillText(srv.latency.toFixed(1) + ' ms', (x0 + x1) / 2, y + 4);
        ctx.globalAlpha = 1;
      }
    });

    // Winner highlight after all servers done
    if (elapsed > raceTotalDur + 400) {
      var winT = Math.min(1, (elapsed - raceTotalDur - 400) / 500);
      var winY = startY; // first lane (fastest)
      ctx.save();
      ctx.strokeStyle = '#00C8E6';
      ctx.globalAlpha = winT * 0.5;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.roundRect(x0 - 8, winY - 13, x1 - x0 + 16, 26, 5);
      ctx.stroke();
      ctx.globalAlpha = winT;
      ctx.font = '700 9px Poppins, -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.letterSpacing = '0.05em';
      ctx.fillStyle = '#00C8E6';
      ctx.fillText('SELECTED', x1 - 2, winY - 16);
      ctx.restore();

      // Update subtitle
      swEl('st-go-subtitle').textContent = servers[0].name + ' selected (' + servers[0].latency.toFixed(1) + ' ms)';
    }

    // Check if race + settle is done
    if (elapsed < raceTotalDur + settleDur) {
      testRAF = requestAnimationFrame(animatePingRace);
    } else {
      // Fade out race canvas, then transition to gauge
      var gaugeArea = swEl('st-gauge-area');
      var gaugeCanvas = swEl('st-gauge-canvas');
      // Fade out the race
      gaugeCanvas.style.transition = 'opacity 0.5s ease-out';
      gaugeCanvas.style.opacity = '0';

      setTimeout(function() {
        // Clear and resize for gauge
        ctx.clearRect(0, 0, cssW, cssH);
        gaugeArea.classList.remove('racing');
        gaugeCanvas.style.transition = 'none';
        gaugeCanvas.style.opacity = '0';

        // Show speed readout (also faded in)
        var liveSpeed = swEl('st-live-speed');
        liveSpeed.style.display = '';
        liveSpeed.style.opacity = '0';
        liveSpeed.style.transition = 'opacity 0.4s ease-in';

        swEl('st-phase-latency').classList.remove('active');
        swEl('st-phase-latency').classList.add('done');

        // Short delay then fade in gauge + text
        requestAnimationFrame(function() {
          gaugeCanvas.style.transition = 'opacity 0.4s ease-in';
          gaugeCanvas.style.opacity = '1';
          liveSpeed.style.opacity = '1';
          // Clean up transitions after fade-in
          setTimeout(function() {
            gaugeCanvas.style.transition = '';
            liveSpeed.style.transition = '';
            liveSpeed.style.opacity = '';
          }, 450);
        });

        startDownloadPhase(dlCurve, ulCurve, targetLat);
      }, 600);
      return; // don't request another frame
    }
  }
  testRAF = requestAnimationFrame(animatePingRace);
}

function startDownloadPhase(dlCurve, ulCurve, targetLat) {
  currentState = TestState.DOWNLOAD;
  swEl('st-phase-download').classList.add('active');
  swEl('st-go-subtitle').textContent = 'Testing download';
  swEl('st-realtime-inline').style.display = ''; // show throughput chart now

  const dlStart = performance.now();
  const dlDuration = 8000;
  let sampleIdx = 0;

  function animateDownload(now) {
    const elapsed = now - dlStart;
    const progress = Math.min(1, elapsed / dlDuration);
    const idx = Math.min(dlCurve.length - 1, Math.floor(progress * dlCurve.length));
    const currentSpeed = dlCurve[idx].mbps;

    // Update live display
    if (currentSpeed >= 1000) {
      swEl('st-live-value').textContent = (currentSpeed / 1000).toFixed(2);
      document.querySelector('.st-live-unit').textContent = 'Gbps';
    } else {
      swEl('st-live-value').textContent = Math.round(currentSpeed).toString();
      document.querySelector('.st-live-unit').textContent = 'Mbps';
    }

    // Update gauge
    drawSpeedGauge(currentSpeed, 10000, '#00C8E6', 'Download');

    // Collect real-time samples
    if (idx > sampleIdx) {
      for (let i = sampleIdx + 1; i <= idx; i++) {
        realtimeSamples.dl.push(dlCurve[i]);
      }
      sampleIdx = idx;
      drawRealtimeChart();
    }

    if (progress < 1) {
      testRAF = requestAnimationFrame(animateDownload);
    } else {
      swEl('st-phase-download').classList.remove('active');
      swEl('st-phase-download').classList.add('done');
      startUploadPhase(ulCurve, targetLat);
    }
  }
  testRAF = requestAnimationFrame(animateDownload);
}

function startUploadPhase(ulCurve, targetLat) {
  currentState = TestState.UPLOAD;
  swEl('st-phase-upload').classList.add('active');
  swEl('st-go-subtitle').textContent = 'Testing upload';

  const ulStart = performance.now();
  const ulDuration = 8000;
  let sampleIdx = 0;
  const timeOffset = realtimeSamples.dl.length > 0 ? realtimeSamples.dl[realtimeSamples.dl.length - 1].t + 0.5 : 0;

  function animateUpload(now) {
    const elapsed = now - ulStart;
    const progress = Math.min(1, elapsed / ulDuration);
    const idx = Math.min(ulCurve.length - 1, Math.floor(progress * ulCurve.length));
    const currentSpeed = ulCurve[idx].mbps;

    // Update live display
    if (currentSpeed >= 1000) {
      swEl('st-live-value').textContent = (currentSpeed / 1000).toFixed(2);
      document.querySelector('.st-live-unit').textContent = 'Gbps';
    } else {
      swEl('st-live-value').textContent = Math.round(currentSpeed).toString();
      document.querySelector('.st-live-unit').textContent = 'Mbps';
    }

    // Update gauge
    drawSpeedGauge(currentSpeed, 10000, '#e879f9', 'Upload');

    // Collect real-time samples with time offset
    if (idx > sampleIdx) {
      for (let i = sampleIdx + 1; i <= idx; i++) {
        realtimeSamples.ul.push({ t: ulCurve[i].t + timeOffset, mbps: ulCurve[i].mbps });
      }
      sampleIdx = idx;
      drawRealtimeChart();
    }

    if (progress < 1) {
      testRAF = requestAnimationFrame(animateUpload);
    } else {
      swEl('st-phase-upload').classList.remove('active');
      swEl('st-phase-upload').classList.add('done');
      completeTest();
    }
  }
  testRAF = requestAnimationFrame(animateUpload);
}

function completeTest() {
  currentState = TestState.COMPLETE;

  // Morph gauge back to GO button
  swEl('st-gauge-area').classList.remove('testing');
  swEl('st-live-speed').style.display = 'none';
  // Clear gauge canvas
  const gaugeCanvas = swEl('st-gauge-canvas');
  const gCtx = gaugeCanvas.getContext('2d');
  gCtx.clearRect(0, 0, gaugeCanvas.width, gaugeCanvas.height);

  const goBtn = swEl('st-go-btn');
  goBtn.classList.remove('hidden');
  goBtn.classList.add('pulsing');
  goBtn.querySelector('.st-go-text').textContent = 'GO';
  swEl('st-go-subtitle').style.display = '';
  swEl('st-go-subtitle').textContent = 'Tap to run again';

  // Generate a varied new result based on service rates (not previous result, to avoid drift)
  const baseDl = SW_MOCK.wan.service_rate_ds_mbps * (0.85 + Math.random() * 0.15); // 85-100% of plan
  const baseUl = SW_MOCK.wan.service_rate_us_mbps * (0.85 + Math.random() * 0.15);
  const baseIdle = 6 + Math.random() * 8; // 6-14ms
  const baseDlLat = baseIdle + 2 + Math.random() * 12;
  const baseUlLat = baseIdle + 4 + Math.random() * 16;
  const dlG = computeBBGrade(baseIdle, baseDlLat);
  const ulG = computeBBGrade(baseIdle, baseUlLat);

  const nowEpoch = Date.now() / 1000;
  const dlMbps = Math.round(baseDl);
  const ulMbps = Math.round(baseUl);
  const newResult = {
    test_status: 'completed',
    test_error: 'n/a',
    starttime: nowEpoch,
    endtime: nowEpoch + 42,
    epoch: Math.floor(nowEpoch),
    runtime: 42.0,
    client_version: 'bbst v0.4.2',
    download: {
      server_url: SW_MOCK.latestResult.download.server_url,
      status: 'completed', mbps: dlMbps,
      pct_utilization: Math.round(baseDl / SW_MOCK.wan.service_rate_ds_mbps * 100),
      total_byte_rx: Math.round(dlMbps * 1e6 / 8 * 42),
      progress_pct: 100
    },
    upload: {
      server_url: SW_MOCK.latestResult.upload.server_url,
      status: 'completed', mbps: ulMbps,
      pct_utilization: Math.round(baseUl / SW_MOCK.wan.service_rate_us_mbps * 100),
      total_byte_tx: Math.round(ulMbps * 1e6 / 8 * 42),
      progress_pct: 100
    },
    latency: {
      host: SW_MOCK.latestResult.latency.host,
      idle_avg: +baseIdle.toFixed(1),
      download_avg: +baseDlLat.toFixed(1),
      upload_avg: +baseUlLat.toFixed(1),
      idle_jitter: +(0.5 + Math.random() * 2).toFixed(1),
      download_jitter: +(1 + Math.random() * 5).toFixed(1),
      upload_jitter: +(2 + Math.random() * 6).toFixed(1),
      download_bufferbloat_grade: dlG,
      upload_bufferbloat_grade: ulG
    },
    server_selection: SW_MOCK.latestResult.server_selection,
    server: SW_MOCK.latestResult.server,
    client: SW_MOCK.latestResult.client,
    test_options: SW_MOCK.latestResult.test_options
  };

  // Push to history (newest first) and update latest
  SW_MOCK.history.unshift(newResult);
  SW_MOCK.latestResult = newResult;

  // Fade out inline chart, then fade in throughput card
  var inlineChart = swEl('st-realtime-inline');
  var throughputCard = swEl('st-realtime-card');

  // Fade out inline chart over 1.2s
  inlineChart.style.transition = 'opacity 1.2s ease-out';
  inlineChart.style.opacity = '0';

  // After fade-out completes, clean up and render
  setTimeout(function() {
    inlineChart.style.display = 'none';
    inlineChart.style.transition = '';
    inlineChart.style.opacity = '';

    // Render all results and charts
    renderResults(newResult);
    renderHistoryChart();

    // Prepare throughput card data
    swEl('st-realtime-empty').style.display = 'none';
    swEl('st-realtime-status').textContent = 'just now';
    swEl('st-realtime-status').className = 'st-realtime-status';
    drawRealtimeChart('st-realtime-adv-canvas');

    // Trigger CSS fade-in (1.5s delay + 1.8s fade built into the class)
    throughputCard.classList.remove('st-appear');
    void throughputCard.offsetWidth;
    throughputCard.classList.add('st-appear');
  }, 1300);

  // Reset state
  testRAF = null;
  setTimeout(() => {
    currentState = TestState.IDLE;
    swEl('st-phase-bar').style.display = 'none';
  }, 500);
}

/* ===== Initialize ===== */
function swInit() {
  // Always start with advanced hidden
  advancedOpen = false;
  localStorage.setItem('st-advanced', '0');
  swEl('st-advanced').style.display = 'none';
  swEl('st-advanced-toggle').classList.remove('open');
  swEl('st-advanced-toggle-text').textContent = 'Show Advanced Details';

  // Pulse GO button
  swEl('st-go-btn').classList.add('pulsing');

  // Show last result (renderResults also draws the history chart)
  if (SW_MOCK.latestResult && SW_MOCK.latestResult.test_status === 'completed') {
    renderResults(SW_MOCK.latestResult);
  } else {
    renderHistoryChart();
  }

  // Draw throughput chart if we have samples from a previous test, otherwise show empty state
  if (realtimeSamples.dl.length > 0 || realtimeSamples.ul.length > 0) {
    swEl('st-realtime-empty').style.display = 'none';
    drawRealtimeChart('st-realtime-adv-canvas');
  }

  // Init history scroll
  initHistoryScroll();
}

// swInit() is called lazily by dashboard navigateTo('netpulse')

// Debounced resize handler (only runs when netpulse page is visible)
let _swResizeTimer = null;
window.addEventListener('resize', () => {
  const swPage = document.getElementById('page-netpulse');
  if (swPage && swPage.style.display === 'none') return;
  if (_swResizeTimer) cancelAnimationFrame(_swResizeTimer);
  _swResizeTimer = requestAnimationFrame(() => {
    _swResizeTimer = null;
    renderHistoryChart();
    if (swEl('st-realtime-empty') && swEl('st-realtime-empty').style.display === 'none') {
      drawRealtimeChart('st-realtime-adv-canvas');
    }
    if (currentState !== TestState.IDLE && swEl('st-realtime-inline').style.display !== 'none') drawRealtimeChart();
  });
});

/* =============================================================================
   WAN Shaper Configuration Modal
   Matches SmartOS SQM shaper config (srg-wan-shaper.js)
   UCI: sqm.wan.enabled, sqm.wan.download (kbps), sqm.wan.upload (kbps),
        sqm.wan.qdisc (cake|fq_codel), sqm.wan.script
   ============================================================================= */

// Mock shaper config state (would be UCI sqm.wan in production)
var shaperConfig = {
  enabled: false,
  download: 0,   // kbps
  upload: 0,     // kbps
  qdisc: 'fq_codel',
  script: 'simple.qos'
};

function openShaperModal() {
  var overlay = swEl('shaper-overlay');
  overlay.style.display = '';

  // Populate from current config
  swEl('shaper-enabled').checked = shaperConfig.enabled;
  swEl('shaper-enabled-text').textContent = shaperConfig.enabled ? 'Enabled' : 'Disabled';
  swEl('shaper-warning').style.display = shaperConfig.enabled ? '' : 'none';
  swEl('shaper-dl-rate').value = shaperConfig.download > 0 ? Math.round(shaperConfig.download / 1000) : '';
  swEl('shaper-ul-rate').value = shaperConfig.upload > 0 ? Math.round(shaperConfig.upload / 1000) : '';
  swEl('shaper-source').value = 'manual';
  swEl('shaper-derived-info').style.display = 'none';

  // Disable fields if shaper is off
  updateShaperFieldState();

  // Close any open grade tooltips
  document.querySelectorAll('.st-grade-tooltip').forEach(function(t) { t.style.display = 'none'; });

  // Escape key handler
  document.addEventListener('keydown', shaperEscHandler);
}

function closeShaperModal() {
  swEl('shaper-overlay').style.display = 'none';
  document.removeEventListener('keydown', shaperEscHandler);
  // Re-enable tooltip CSS hover
  document.querySelectorAll('.st-grade-tooltip').forEach(function(t) { t.style.display = ''; });
}

function shaperEscHandler(e) {
  if (e.key === 'Escape') closeShaperModal();
}

function onShaperToggle() {
  var enabled = swEl('shaper-enabled').checked;
  swEl('shaper-enabled-text').textContent = enabled ? 'Enabled' : 'Disabled';
  swEl('shaper-warning').style.display = enabled ? '' : 'none';
  updateShaperFieldState();
}

function updateShaperFieldState() {
  var enabled = swEl('shaper-enabled').checked;
  var fields = ['shaper-source', 'shaper-dl-rate', 'shaper-ul-rate'];
  fields.forEach(function(id) {
    swEl(id).disabled = !enabled;
    swEl(id).style.opacity = enabled ? '1' : '0.4';
  });
}

function onShaperSourceChange() {
  var source = swEl('shaper-source').value;
  var info = swEl('shaper-derived-info');
  var dlInput = swEl('shaper-dl-rate');
  var ulInput = swEl('shaper-ul-rate');

  if (source === 'service') {
    // 90% of provisioned service rate
    var dlRate = SW_MOCK.wan.service_rate_ds_mbps;
    var ulRate = SW_MOCK.wan.service_rate_us_mbps;
    if (dlRate > 0 && ulRate > 0) {
      var dlShaped = Math.floor(dlRate * 0.9);
      var ulShaped = Math.floor(ulRate * 0.9);
      dlInput.value = dlShaped;
      ulInput.value = ulShaped;
      info.textContent = 'Using 90% of service rate: ' + dlRate + ' Mbps DL, ' + ulRate + ' Mbps UL';
      info.style.display = '';
    } else {
      info.textContent = 'Service rates not configured in UCI (network.wan.service_rate_ds_mbps).';
      info.style.display = '';
    }
    dlInput.readOnly = true;
    ulInput.readOnly = true;
  } else if (source === 'speedtest') {
    // Max observed across all history (matches wan_config.lua get_rates)
    var maxDl = 0, maxUl = 0;
    SW_MOCK.history.forEach(function(t) {
      if (t.test_status === 'completed') {
        if (t.download.mbps > maxDl) maxDl = t.download.mbps;
        if (t.upload.mbps > maxUl) maxUl = t.upload.mbps;
      }
    });
    if (SW_MOCK.latestResult && SW_MOCK.latestResult.test_status === 'completed') {
      if (SW_MOCK.latestResult.download.mbps > maxDl) maxDl = SW_MOCK.latestResult.download.mbps;
      if (SW_MOCK.latestResult.upload.mbps > maxUl) maxUl = SW_MOCK.latestResult.upload.mbps;
    }
    dlInput.value = Math.floor(maxDl);
    ulInput.value = Math.floor(maxUl);
    info.textContent = 'Using maximum observed speeds from ' + SW_MOCK.history.length + ' historical tests.';
    info.style.display = '';
    dlInput.readOnly = true;
    ulInput.readOnly = true;
  } else {
    // Manual
    info.style.display = 'none';
    dlInput.readOnly = false;
    ulInput.readOnly = false;
  }
}

function saveShaperConfig() {
  var enabled = swEl('shaper-enabled').checked;
  var dlMbps = parseInt(swEl('shaper-dl-rate').value) || 0;
  var ulMbps = parseInt(swEl('shaper-ul-rate').value) || 0;

  shaperConfig.enabled = enabled;
  shaperConfig.download = dlMbps * 1000; // Convert to kbps for UCI
  shaperConfig.upload = ulMbps * 1000;

  // In production: $uci.$sync('sqm'), set values, $uci.$save()
  // Also toggle firewall.@defaults[0].flow_offloading = enabled ? 0 : 1
  console.log('Shaper config saved (mock):', JSON.stringify(shaperConfig));

  closeShaperModal();

  // Show brief confirmation
  var btn = swEl('st-go-subtitle');
  if (btn) {
    var prev = btn.textContent;
    btn.textContent = enabled
      ? 'Shaper enabled: ' + dlMbps + '/' + ulMbps + ' Mbps'
      : 'Shaper disabled';
    btn.style.color = 'var(--accent-amber)';
    setTimeout(function() {
      btn.textContent = prev;
      btn.style.color = '';
    }, 4000);
  }
}

// Deep link: if URL hash is #netpulse, navigate after full init
if (window.location.hash === '#netpulse') {
  window.addEventListener('load', () => {
    currentPage = null;
    navigateTo('netpulse');
  });
}
