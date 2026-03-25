/* ============================================================
   StatsView - System Statistics Page
   Integrated into SmartOS WebUI Homepage
   ============================================================ */

(function () {
  'use strict';

  let svCharts = {};
  let svTimeRange = parseInt(localStorage.getItem('sv_range')) || 900;
  let svPanOffset = 0; // seconds from "now" for right edge. 0 = live.
  let svInterfaces = [];
  let svDisks = [];
  let svMounts = [];
  let svPollTimer = null;
  const SV_POLL_MS = 2000;
  const SV_MAX_HISTORY = 86400; // 24h

  // --- Formatting ---
  function fmtBits(kbits, compact) {
    const bits = Math.abs(kbits || 0) * 1000;
    if (compact) {
      if (bits >= 1e9) { const v = bits / 1e9; return (v >= 10 ? Math.round(v) : v.toFixed(1)) + ' G'; }
      if (bits >= 1e6) { const v = bits / 1e6; return (v >= 10 ? Math.round(v) : v.toFixed(1)) + ' M'; }
      if (bits >= 1e3) return Math.round(bits / 1e3) + ' K';
      return Math.round(bits) + '';
    }
    if (bits >= 1e9) return (bits / 1e9).toFixed(2) + ' Gbps';
    if (bits >= 1e6) { const v = bits / 1e6; return (v >= 10 ? v.toFixed(0) : v.toFixed(1)) + ' Mbps'; }
    if (bits >= 1e3) return (bits / 1e3).toFixed(0) + ' Kbps';
    return bits.toFixed(0) + ' bps';
  }
  function fmtMiB(mib) { return mib >= 1024 ? (mib / 1024).toFixed(1) + ' GiB' : mib.toFixed(0) + ' MiB'; }
  function fmtGiB(gib) { return gib >= 1024 ? (gib / 1024).toFixed(1) + ' TiB' : gib.toFixed(2) + ' GiB'; }
  function fmtNum(n) { if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'; if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'; return Math.round(n).toString(); }
  function fmtPct(n) { return n.toFixed(1) + '%'; }
  function fmtTime(epoch) { return new Date(epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }

  function cssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function getColors() {
    return {
      cyan: cssVar('--accent-cyan') || '#22d3ee',
      green: cssVar('--accent-green') || '#34d399',
      amber: cssVar('--accent-amber') || '#f59e0b',
      red: cssVar('--accent-red') || '#ef4444',
      purple: cssVar('--accent-purple') || '#a855f7',
      blue: cssVar('--accent-blue') || '#3b82f6',
      grey: cssVar('--accent-grey') || '#6b7280',
    };
  }

  // --- Tooltip ---
  const tooltip = document.getElementById('sv-chart-tooltip');
  function showTooltip(html, x, y) {
    if (!tooltip) return;
    tooltip.innerHTML = html;
    tooltip.classList.add('visible');
    const r = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.min(x + 12, window.innerWidth - r.width - 8) + 'px';
    tooltip.style.top = Math.min(y - 8, window.innerHeight - r.height - 8) + 'px';
  }
  function hideTooltip() { if (tooltip) tooltip.classList.remove('visible'); }

  // --- Adaptive X-axis time format based on range ---
  function xAxisFormat() {
    // Show seconds for short ranges (5m, 15m)
    if (svTimeRange <= 900) return d3.timeFormat('%H:%M:%S');
    return d3.timeFormat('%H:%M');
  }

  /* ============================================================
     D3 Chart Factory
     ============================================================ */
  function createChart(container, config) {
    const {
      type = 'multi-line',
      series = [],
      yFormat = 'number',
      rightYFormat = null,  // If set, series with axis:'right' use a right Y-axis with this format
      height = 100,
      showLegend = true,
      legendTarget = null
    } = config;

    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return null;

    const hasRightAxis = rightYFormat && series.some(s => s.axis === 'right');
    const margin = { top: 6, right: hasRightAxis ? 44 : 8, bottom: 20, left: 46 };
    const chartDiv = document.createElement('div');
    chartDiv.className = 'sv-chart-container';
    el.appendChild(chartDiv);

    const svg = d3.select(chartDiv).append('svg').attr('height', height);
    const clipId = 'sv-clip-' + Math.random().toString(36).slice(2);
    svg.append('defs').append('clipPath').attr('id', clipId).append('rect');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const gGrid = g.append('g').attr('class', 'grid');
    const gArea = g.append('g').attr('clip-path', `url(#${clipId})`);
    const gXAxis = g.append('g').attr('class', 'axis x-axis');
    const gYAxis = g.append('g').attr('class', 'axis y-axis');
    const gYAxisR = hasRightAxis ? g.append('g').attr('class', 'axis y-axis-right') : null;
    const gCrosshair = g.append('line').attr('class', 'sv-crosshair-line').style('display', 'none');
    const gOverlay = g.append('rect').attr('fill', 'none').attr('pointer-events', 'all');

    if (showLegend && series.length > 1) {
      const legendHtml = series.map(s =>
        `<span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${s.color}"></span>${s.label}</span>`
      ).join('');
      const targetEl = legendTarget
        ? (typeof legendTarget === 'string' ? document.querySelector(legendTarget) : legendTarget)
        : null;
      if (targetEl) {
        targetEl.innerHTML = legendHtml;
      } else {
        const legend = document.createElement('div');
        legend.className = 'sv-chart-legend';
        legend.innerHTML = legendHtml;
        chartDiv.appendChild(legend);
      }
    }

    const xScale = d3.scaleTime();
    const yScale = d3.scaleLinear();
    const yScaleR = hasRightAxis ? d3.scaleLinear() : null;
    let lastData = null;

    // Identify which series belong to left vs right axis
    const leftSeries = series.filter(s => s.axis !== 'right');
    const rightSeries = series.filter(s => s.axis === 'right');

    function yFmt(v) {
      if (yFormat === 'percent') return fmtPct(v);
      if (yFormat === 'bits') return fmtBits(v, true);
      if (yFormat === 'mib') return fmtMiB(v);
      if (yFormat === 'gib') return fmtGiB(v);
      return fmtNum(v);
    }
    function yFmtR(v) {
      if (!rightYFormat) return fmtNum(v);
      if (rightYFormat === 'percent') return fmtPct(v);
      if (rightYFormat === 'bits') return fmtBits(v, true);
      return fmtNum(v);
    }

    function render(data) {
      if (!data || !data.data || data.data.length === 0) return;
      lastData = data;

      const W = chartDiv.clientWidth || 400;
      const w = W - margin.left - margin.right;
      const h = height - margin.top - margin.bottom;

      svg.attr('width', W);
      svg.select(`#${clipId} rect`).attr('width', w).attr('height', h);
      gOverlay.attr('width', w).attr('height', h);

      const labels = data.labels;
      const rows = data.data;
      const seriesKeys = series.map(s => s.key);
      const keyIndices = seriesKeys.map(k => labels.indexOf(k));

      xScale.domain([new Date(rows[0][0] * 1000), new Date(rows[rows.length - 1][0] * 1000)]).range([0, w]);

      // Compute Y max for left-axis series
      const leftKeyIndices = leftSeries.map(s => labels.indexOf(s.key));
      const rightKeyIndices = rightSeries.map(s => labels.indexOf(s.key));

      let yMax = 0;
      if (type === 'stacked-area') {
        rows.forEach(row => { let sum = 0; leftKeyIndices.forEach(idx => { if (idx >= 0) sum += Math.abs(row[idx] || 0); }); yMax = Math.max(yMax, sum); });
      } else {
        rows.forEach(row => { leftKeyIndices.forEach(idx => { if (idx >= 0) yMax = Math.max(yMax, Math.abs(row[idx] || 0)); }); });
      }
      if (yFormat === 'percent') yMax = Math.max(yMax, 100);
      yMax = yMax * 1.1 || 1;
      yScale.domain([0, yMax]).range([h, 0]);

      // Compute Y max for right-axis series (if any)
      if (yScaleR && rightKeyIndices.length > 0) {
        let yMaxR = 0;
        rows.forEach(row => { rightKeyIndices.forEach(idx => { if (idx >= 0) yMaxR = Math.max(yMaxR, Math.abs(row[idx] || 0)); }); });
        yMaxR = Math.max(yMaxR * 1.3, 1); // extra headroom so errors are visible
        yScaleR.domain([0, yMaxR]).range([h, 0]);
      }

      const xTickCount = Math.max(2, Math.floor(w / 120));
      gXAxis.attr('transform', `translate(0,${h})`).call(d3.axisBottom(xScale).ticks(xTickCount).tickFormat(xAxisFormat()));
      gYAxis.call(d3.axisLeft(yScale).ticks(4).tickFormat(v => yFmt(v)));
      if (gYAxisR && yScaleR) {
        gYAxisR.attr('transform', `translate(${w},0)`).call(d3.axisRight(yScaleR).ticks(3).tickFormat(v => yFmtR(v)));
      }

      gGrid.selectAll('line').remove();
      yScale.ticks(4).forEach(tick => {
        gGrid.append('line').attr('x1', 0).attr('x2', w).attr('y1', yScale(tick)).attr('y2', yScale(tick));
      });

      gArea.selectAll('*').remove();

      if (type === 'stacked-area') {
        const stackData = rows.map(row => {
          const obj = { time: new Date(row[0] * 1000) };
          seriesKeys.forEach((k, i) => { obj[k] = Math.abs(keyIndices[i] >= 0 ? (row[keyIndices[i]] || 0) : 0); });
          return obj;
        });
        const stacked = d3.stack().keys(seriesKeys)(stackData);
        const area = d3.area().x(d => xScale(d.data.time)).y0(d => yScale(d[0])).y1(d => yScale(d[1])).curve(d3.curveMonotoneX);
        stacked.forEach((layer, i) => {
          gArea.append('path').datum(layer).attr('fill', series[i].color).attr('fill-opacity', 0.35).attr('stroke', series[i].color).attr('stroke-width', 1.5).attr('d', area);
        });
      } else {
        series.forEach((s, i) => {
          const idx = keyIndices[i]; if (idx < 0) return;
          const scale = (s.axis === 'right' && yScaleR) ? yScaleR : yScale;
          const areaGen = d3.area().x(d => xScale(new Date(d[0] * 1000))).y0(h).y1(d => scale(Math.abs(d[idx] || 0))).curve(d3.curveMonotoneX);
          const line = d3.line().x(d => xScale(new Date(d[0] * 1000))).y(d => scale(Math.abs(d[idx] || 0))).curve(d3.curveMonotoneX);
          gArea.append('path').datum(rows).attr('fill', s.color).attr('fill-opacity', s.axis === 'right' ? 0.06 : 0.12).attr('d', areaGen);
          gArea.append('path').datum(rows).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', s.axis === 'right' ? 1 : 1.5).attr('d', line);
        });
      }

      // Crosshair + tooltip + grab-to-pan
      let isPanning = false, panStartX = 0, panStartOffset = 0;

      // Use native DOM events (pointer*) to prevent conflict with grid drag system
      const overlayNode = gOverlay.node();
      overlayNode.style.cursor = 'grab';

      overlayNode.addEventListener('pointerdown', function (event) {
        if (event.button !== 0) return;
        isPanning = true;
        panStartX = event.clientX;
        panStartOffset = svPanOffset;
        overlayNode.style.cursor = 'grabbing';
        overlayNode.setPointerCapture(event.pointerId);
        gCrosshair.style('display', 'none');
        hideTooltip();
        event.stopPropagation(); // prevent grid drag system from seeing this
        event.preventDefault();
      });

      overlayNode.addEventListener('pointermove', function (event) {
        if (isPanning) {
          const dx = event.clientX - panStartX;
          const secPerPx = svTimeRange / w;
          let newOffset = panStartOffset + dx * secPerPx;
          newOffset = Math.max(0, Math.min(SV_MAX_HISTORY - svTimeRange, newOffset));
          if (newOffset !== svPanOffset) {
            svPanOffset = newOffset;
            svUpdateAllCharts();
            svUpdateLiveButton();
          }
          return;
        }
        // Tooltip on hover (no drag)
        const [mx] = d3.pointer(event, overlayNode);
        const time = xScale.invert(mx);
        const idx = Math.min(d3.bisector(d => new Date(d[0] * 1000)).left(rows, time), rows.length - 1);
        const row = rows[idx]; if (!row) return;
        const cx = xScale(new Date(row[0] * 1000));
        gCrosshair.style('display', null).attr('x1', cx).attr('x2', cx).attr('y1', 0).attr('y2', h);
        let html = `<div class="tt-time">${fmtTime(row[0])}</div>`;
        series.forEach((s, si) => {
          const di = keyIndices[si]; if (di < 0) return;
          const fmt = (s.axis === 'right') ? yFmtR : yFmt;
          html += `<div class="tt-row"><span class="tt-swatch" style="background:${s.color}"></span><span class="tt-label">${s.label}</span><span class="tt-value">${fmt(Math.abs(row[di] || 0))}</span></div>`;
        });
        const rect = chartDiv.getBoundingClientRect();
        showTooltip(html, rect.left + margin.left + mx, event.clientY);
      });

      overlayNode.addEventListener('pointerup', function (event) {
        isPanning = false;
        overlayNode.style.cursor = 'grab';
      });

      overlayNode.addEventListener('pointerleave', function () {
        isPanning = false;
        overlayNode.style.cursor = 'grab';
        gCrosshair.style('display', 'none');
        hideTooltip();
      });
    }

    const ro = new ResizeObserver(() => { if (lastData) render(lastData); });
    ro.observe(el);

    return {
      update: render,
      resize() { if (lastData) render(lastData); },
      recolor() { if (lastData) render(lastData); },
      destroy() { ro.disconnect(); chartDiv.remove(); }
    };
  }


  /* ============================================================
     Init Charts
     ============================================================ */

  function initBasicCharts() {
    const C = getColors();
    const ifaceLegend = `
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.cyan}"></span>RX</span>
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.green}"></span>TX</span>
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.red}"></span>Err</span>`;

    // Individual interface cards
    svInterfaces.forEach(iface => {
      const chartEl = document.getElementById(`sv-chart-iface-${iface}`);
      const legendEl = document.getElementById(`sv-legend-iface-${iface}`);
      if (!chartEl) return;
      if (legendEl) legendEl.innerHTML = ifaceLegend;

      svCharts[`net.${iface}`] = createChart(chartEl, {
        series: [
          { key: 'received', color: C.cyan, label: 'RX' },
          { key: 'sent', color: C.green, label: 'TX' },
          { key: 'rx_errors', color: C.red, label: 'RX Err', axis: 'right' },
          { key: 'tx_errors', color: C.amber, label: 'TX Err', axis: 'right' }
        ],
        yFormat: 'bits', rightYFormat: 'number', height: 120, showLegend: false
      });
    });

    // Individual WiFi airtime band cards
    const airtimeLegend = `
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.cyan}"></span>TX</span>
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.green}"></span>RX</span>
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.amber}"></span>Int</span>
      <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.red}"></span>Non</span>`;

    ['2g', '5g', '6g'].forEach(band => {
      const chartEl = document.getElementById(`sv-chart-airtime-${band}`);
      const legendEl = document.getElementById(`sv-legend-airtime-${band}`);
      if (!chartEl) return;
      if (legendEl) legendEl.innerHTML = airtimeLegend;

      svCharts[`wifi_airtime.${band}`] = createChart(chartEl, {
        type: 'stacked-area',
        series: [
          { key: 'tx', color: C.cyan, label: 'TX' },
          { key: 'rx', color: C.green, label: 'RX' },
          { key: 'wifi_int', color: C.amber, label: 'WiFi Int' },
          { key: 'non_wifi', color: C.red, label: 'Non-WiFi' }
        ],
        yFormat: 'percent', height: 120, showLegend: false
      });
    });
  }

  function initAdvancedCharts() {
    const C = getColors();

    // CPU
    svCharts['system.cpu'] = createChart('#sv-cpu-chart', {
      type: 'stacked-area', height: 120,      series: [
        { key: 'user', color: C.cyan, label: 'User' }, { key: 'system', color: C.amber, label: 'System' },
        { key: 'iowait', color: C.red, label: 'I/O Wait' }, { key: 'irq', color: C.purple, label: 'IRQ' },
        { key: 'softirq', color: C.blue, label: 'SoftIRQ' }, { key: 'steal', color: C.grey, label: 'Steal' }
      ], yFormat: 'percent', legendTarget: '#sv-legend-cpu'
    });

    // Memory
    svCharts['system.ram'] = createChart('#sv-memory-chart', {
      type: 'stacked-area', height: 120,      series: [
        { key: 'used', color: C.cyan, label: 'Used' }, { key: 'buffers', color: C.green, label: 'Buffers' },
        { key: 'cached', color: C.amber, label: 'Cached' }, { key: 'free', color: C.grey, label: 'Free' }
      ], yFormat: 'mib', legendTarget: '#sv-legend-memory'
    });

    // System Load
    svCharts['system.load'] = createChart('#sv-load-chart', {
      series: [
        { key: 'load1', color: C.cyan, label: '1 min' },
        { key: 'load5', color: C.amber, label: '5 min' },
        { key: 'load15', color: C.red, label: '15 min' }
      ], height: 120, marginTop: 12, legendTarget: '#sv-legend-load'
    });

    // Disk I/O
    const dioContainer = document.getElementById('sv-diskio-charts');
    if (dioContainer) {
      dioContainer.innerHTML = '';
      const dioLegendSlot = document.getElementById('sv-legend-diskio');
      if (dioLegendSlot) {
        dioLegendSlot.innerHTML = `
          <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.cyan}"></span>Read</span>
          <span class="sv-chart-legend-item"><span class="sv-chart-legend-swatch" style="background:${C.green}"></span>Write</span>`;
      }
      svDisks.forEach(disk => {
        const div = document.createElement('div'); div.id = `sv-chart-diskio-${disk}`;
        div.innerHTML = `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:var(--text-muted);letter-spacing:0.5px;padding:2px 0">${disk.toUpperCase()}</div>`;
        dioContainer.appendChild(div);
        svCharts[`disk.${disk}`] = createChart(`#sv-chart-diskio-${disk}`, {
          series: [{ key: 'reads', color: C.cyan, label: 'Read' }, { key: 'writes', color: C.green, label: 'Write' }],
          height: 120, marginTop: 12, showLegend: false
        });
      });
    }

    // Disk Space - single combined chart with all mounts
    const dsColors = [C.cyan, C.green, C.amber, C.purple];
    const dsSeries = svMounts.map((m, i) => ({
      key: 'used_' + m.name,
      color: dsColors[i % dsColors.length],
      label: m.name === '_' ? '/' : '/' + m.name.replace(/_/g, '/')
    }));
    svCharts['diskspace_combined'] = createChart('#sv-diskspace-body', {
      series: dsSeries,
      yFormat: 'gib', height: 120, marginTop: 12, legendTarget: '#sv-legend-diskspace'
    });

    // Context Switches / Interrupts
    svCharts['system.ctxint'] = createChart('#sv-ctxint-chart', {
      series: [
        { key: 'switches', color: C.cyan, label: 'Ctx Switches' },
        { key: 'interrupts', color: C.amber, label: 'Interrupts' }
      ], height: 120, marginTop: 12, legendTarget: '#sv-legend-ctxint'
    });

    // Processes - historical line chart
    svCharts['system.processes'] = createChart('#sv-processes-body', {
      series: [
        { key: 'running', color: C.green, label: 'Running' },
        { key: 'blocked', color: C.red, label: 'Blocked' }
      ], height: 120, marginTop: 12, legendTarget: '#sv-legend-processes'
    });

    // File Descriptors - historical line chart
    svCharts['system.fds'] = createChart('#sv-fds-body', {
      series: [
        { key: 'allocated', color: C.cyan, label: 'Allocated' }
      ], height: 120, marginTop: 12, legendTarget: '#sv-legend-fds'
    });
  }


  /* ============================================================
     Connected Clients: Summary Card + Drill-Down
     ============================================================ */

  let svSelectedClient = null;
  let svClientCharts = {};

  // Phosphor icon class for device type
  function deviceIcon(devType) {
    const map = {
      'laptop': 'ph ph-laptop', 'phone': 'ph ph-device-mobile', 'tablet': 'ph ph-device-tablet',
      'tv': 'ph ph-television', 'speaker': 'ph ph-speaker-high', 'camera': 'ph ph-security-camera',
      'gaming': 'ph ph-game-controller', 'iot': 'ph ph-plug', 'hub': 'ph ph-circles-three-plus',
      'desktop': 'ph ph-desktop', 'nas': 'ph ph-hard-drives', 'printer': 'ph ph-printer',
      'networking': 'ph ph-git-merge', 'vr': 'ph ph-virtual-reality', 'thermostat': 'ph ph-thermometer-simple',
      'switch': 'ph ph-arrows-split',
    };
    return map[devType] || 'ph ph-question';
  }

  function renderClientBadge(client) {
    if (client.type === 'wired') {
      const speed = client.link_speed || 'ETH';
      const label = speed === '10G' ? '10 GbE' : speed === '2.5G' ? '2.5 GbE' : speed === '1G' ? '1 GbE' : speed === '100M' ? '100M' : speed;
      return `<span class="sv-client-badge wired">${label}</span>`;
    }
    const bandClass = client.band === '2.4 GHz' ? 'wifi-2g' : client.band === '6 GHz' ? 'wifi-6g' : 'wifi-5g';
    return `<span class="sv-client-badge ${bandClass}">${client.band}</span>`;
  }

  function renderCategoryBadge(category) {
    const colors = { 'iot': '--accent-amber', 'media': '--accent-purple', 'computing': '--accent-cyan', 'gaming': '--accent-green', 'networking': '--accent-blue', 'other': '--accent-grey' };
    const labels = { 'iot': 'IoT', 'media': 'Media', 'computing': 'PC', 'gaming': 'Gaming', 'networking': 'Net', 'other': 'Other' };
    const c = colors[category] || '--accent-grey';
    return `<span class="sv-client-cat" style="color:var(${c})">${labels[category] || category}</span>`;
  }

  function renderSparklineSVG(data, color) {
    if (!data || data.length < 2) return '';
    const w = 50, h = 16;
    const vals = data.map(r => r[1] + r[2]);
    const max = Math.max(...vals, 1);
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - (v / max) * h}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/>
    </svg>`;
  }

  function fmtDailyBytes(bytes) {
    if (bytes >= 1e12) return (bytes / 1e12).toFixed(1) + ' TB';
    if (bytes >= 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
    if (bytes >= 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
    if (bytes >= 1e3) return (bytes / 1e3).toFixed(0) + ' KB';
    return bytes.toFixed(0) + ' B';
  }

  function getClientSortFn() {
    const sel = document.getElementById('sv-client-sort');
    const mode = sel ? sel.value : 'throughput';
    return {
      'throughput': (a, b) => (b.rx_kbps + b.tx_kbps) - (a.rx_kbps + a.tx_kbps),
      'daily': (a, b) => (b.daily_rx_bytes + b.daily_tx_bytes) - (a.daily_rx_bytes + a.daily_tx_bytes),
      'airtime': (a, b) => (b.airtime_pct || 0) - (a.airtime_pct || 0),
      'signal': (a, b) => (b.rssi || -100) - (a.rssi || -100),
      'qoe': (a, b) => (b.qoe_score || 0) - (a.qoe_score || 0),
    }[mode] || ((a, b) => 0);
  }

  function renderClientRow(c, sparks) {
    const spark = sparks ? (sparks[c.id] || []) : [];
    const totalRate = c.rx_kbps + c.tx_kbps;
    const dailyTotal = c.daily_rx_bytes + c.daily_tx_bytes;
    return `<div class="sv-client-row" data-client-id="${c.id}">
      <i class="${deviceIcon(c.devType)} sv-client-icon"></i>
      <span class="sv-client-name">${c.name}</span>
      ${renderCategoryBadge(c.category)}
      ${renderClientBadge(c)}
      <span class="sv-client-rate">${fmtBits(totalRate)}</span>
      <span class="sv-client-spark">${renderSparklineSVG(spark.slice(-30), c.type === 'wifi' ? cssVar('--accent-cyan') : cssVar('--accent-grey'))}</span>
      ${c.rssi != null ? `<span class="sv-client-signal">${Math.round(c.rssi)} dBm</span>` : '<span class="sv-client-signal"></span>'}
    </div>`;
  }

  function renderClientsSummary() {
    const body = document.getElementById('sv-clients-body');
    const countEl = document.getElementById('sv-clients-count');
    if (!body) return;

    const allClients = MockEngine.getClientList();
    const clients = window._svClientFilter ? window._svClientFilter(allClients) : allClients;
    if (countEl) countEl.textContent = clients.length + ' / ' + allClients.length + ' clients';

    const sorted = clients.slice().sort(getClientSortFn());
    const sparks = MockEngine.getClientSparklines();

    body.innerHTML = sorted.map(c => {
      let row = renderClientRow(c, sparks);
      if (svSelectedClient && c.id === svSelectedClient) {
        row = row.replace('class="sv-client-row"', 'class="sv-client-row sv-client-selected"');
      }
      return row;
    }).join('');

    body.querySelectorAll('.sv-client-row').forEach(row => {
      row.addEventListener('click', () => openClientDrilldown(row.dataset.clientId));
    });
  }

  function openClientDrilldown(clientId) {
    const clients = MockEngine.getClientList();
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    svSelectedClient = clientId;

    // Show drilldown charts above the client list (don't hide the clients card)
    const drilldown = document.getElementById('sv-client-drilldown');
    if (drilldown) drilldown.style.display = '';

    // Header
    document.getElementById('sv-drilldown-title').textContent = client.name;
    const badges = document.getElementById('sv-drilldown-badges');
    let badgeHtml = renderClientBadge(client);
    if (client.type === 'wifi') {
      badgeHtml += ` <span class="sv-drilldown-badge">${client.wifi_standard}</span>`;
      badgeHtml += ` <span class="sv-drilldown-badge">CH ${client.channel}</span>`;
      badgeHtml += ` <span class="sv-drilldown-conn">Connected to:</span> <span class="sv-drilldown-badge">${client.connected_to}</span>`;
    } else {
      if (client.link_speed) badgeHtml += ` <span class="sv-drilldown-badge">${client.link_speed} ${client.duplex}</span>`;
      if (client.iface) badgeHtml += ` <span class="sv-drilldown-conn">Connected to:</span> <span class="sv-drilldown-badge">${client.iface.toUpperCase()}</span>`;
    }
    badges.innerHTML = badgeHtml;

    // Charts
    const chartsContainer = document.getElementById('sv-drilldown-charts');
    chartsContainer.innerHTML = '';
    Object.values(svClientCharts).forEach(c => { if (c.destroy) c.destroy(); });
    svClientCharts = {};

    const C = getColors();

    // Chart 1: Throughput + Retrans (WiFi) or Throughput + Errors (Wired)
    const chart1 = document.createElement('div');
    chart1.className = 'sv-drilldown-chart-card';
    chart1.innerHTML = `<div class="sv-drilldown-chart-label"><span>Throughput</span><span class="sv-chart-legend" id="sv-cl-legend-tp"></span></div><div id="sv-cl-chart-tp"></div>`;
    chartsContainer.appendChild(chart1);

    svClientCharts['throughput'] = createChart('#sv-cl-chart-tp', {
      series: client.type === 'wifi' ? [
        { key: 'rx_kbps', color: C.cyan, label: 'RX' },
        { key: 'tx_kbps', color: C.green, label: 'TX' },
        { key: 'retrans_pct', color: C.red, label: 'Retrans %', axis: 'right' }
      ] : [
        { key: 'rx_kbps', color: C.cyan, label: 'RX' },
        { key: 'tx_kbps', color: C.green, label: 'TX' }
      ],
      yFormat: 'bits',
      rightYFormat: client.type === 'wifi' ? 'percent' : null,
      height: 120, legendTarget: '#sv-cl-legend-tp'
    });

    if (client.type === 'wifi') {
      // Chart 2: Signal Quality (RSSI + PHY Rate)
      const chart2 = document.createElement('div');
      chart2.className = 'sv-drilldown-chart-card';
      chart2.innerHTML = `<div class="sv-drilldown-chart-label"><span>Signal Quality</span><span class="sv-chart-legend" id="sv-cl-legend-sig"></span></div><div id="sv-cl-chart-sig"></div>`;
      chartsContainer.appendChild(chart2);

      svClientCharts['signal'] = createChart('#sv-cl-chart-sig', {
        series: [
          { key: 'rssi', color: C.amber, label: 'RSSI (dBm)' },
          { key: 'phy_rate', color: C.blue, label: 'PHY Rate', axis: 'right' }
        ],
        yFormat: 'number', rightYFormat: 'number',
        height: 120, legendTarget: '#sv-cl-legend-sig'
      });

      // Chart 3: Utilization (Airtime + QoE)
      const chart3 = document.createElement('div');
      chart3.className = 'sv-drilldown-chart-card';
      chart3.innerHTML = `<div class="sv-drilldown-chart-label"><span>Utilization</span><span class="sv-chart-legend" id="sv-cl-legend-util"></span></div><div id="sv-cl-chart-util"></div>`;
      chartsContainer.appendChild(chart3);

      svClientCharts['utilization'] = createChart('#sv-cl-chart-util', {
        series: [
          { key: 'airtime_pct', color: C.purple, label: 'Airtime %' },
          { key: 'qoe_score', color: C.green, label: 'QoE', axis: 'right' }
        ],
        yFormat: 'percent', rightYFormat: 'number',
        height: 120, legendTarget: '#sv-cl-legend-util'
      });
    }

    // Highlight selected client in the summary list
    renderClientsSummary();

    // Load and render client history - delay slightly so containers have layout
    requestAnimationFrame(() => {
      updateClientCharts();
      // Force resize of drilldown charts after layout
      Object.values(svClientCharts).forEach(c => { if (c.resize) c.resize(); });
    });

    // Back button - close drilldown but keep list
    document.getElementById('sv-drilldown-back').onclick = closeClientDrilldown;
  }

  function closeClientDrilldown() {
    svSelectedClient = null;
    Object.values(svClientCharts).forEach(c => { if (c.destroy) c.destroy(); });
    svClientCharts = {};

    const drilldown = document.getElementById('sv-client-drilldown');
    if (drilldown) drilldown.style.display = 'none';

    // Re-render summary list without highlight
    renderClientsSummary();
  }

  function renderClientList(clients, selectedId) {
    const listBody = document.getElementById('sv-client-list-body');
    if (!listBody) return;

    const sparks = ND_DATA.getClientSparklines();
    const sorted = clients.slice().sort((a, b) => (b.rx_kbps + b.tx_kbps) - (a.rx_kbps + a.tx_kbps));

    listBody.innerHTML = sorted.map(c => {
      const row = renderClientRow(c, sparks);
      // Highlight the selected client
      if (c.id === selectedId) return row.replace('class="sv-client-row"', 'class="sv-client-row" style="background:var(--bg-card-hover)"');
      return row;
    }).join('');

    // Click to switch selected client
    listBody.querySelectorAll('.sv-client-row').forEach(row => {
      row.addEventListener('click', () => openClientDrilldown(row.dataset.clientId));
    });

    // Search filter
    const search = document.getElementById('sv-client-search');
    if (search) {
      search.oninput = () => {
        const q = search.value.toLowerCase();
        listBody.querySelectorAll('.sv-client-row').forEach(row => {
          const name = row.querySelector('.sv-client-name').textContent.toLowerCase();
          row.style.display = name.includes(q) ? '' : 'none';
        });
      };
    }
  }

  function updateClientCharts() {
    if (!svSelectedClient) return;
    const data = MockEngine.getClientHistory(svSelectedClient, svTimeRange + svPanOffset, 600);
    if (!data) return;
    const { right } = svGetVisibleWindow();
    const sliced = svSliceData(data, right, svTimeRange);
    if (!sliced) return;

    Object.values(svClientCharts).forEach(chart => {
      if (chart && chart.update) chart.update(sliced);
    });
  }


  /* ============================================================
     Poll Loop + Data Cache + Windowed Rendering
     ============================================================ */
  let svDataCache = {}; // full 24h data per chart key

  // Slice a data object to a visible time window
  function svSliceData(data, rightEpoch, windowSecs) {
    if (!data || !data.data || data.data.length === 0) return data;
    const leftEpoch = rightEpoch - windowSecs;
    const filtered = data.data.filter(r => r[0] >= leftEpoch && r[0] <= rightEpoch);
    if (filtered.length === 0) return null;
    // Downsample to max 600 points
    let out = filtered;
    if (out.length > 600) {
      const step = out.length / 600;
      const sampled = [];
      for (let i = 0; i < 600; i++) sampled.push(out[Math.floor(i * step)]);
      out = sampled;
    }
    return { labels: data.labels, data: out };
  }

  function svGetVisibleWindow() {
    const now = Math.floor(Date.now() / 1000);
    const rightEdge = now - svPanOffset;
    return { right: rightEdge, left: rightEdge - svTimeRange };
  }

  // Re-render all charts from cache at current pan position + zoom
  function svUpdateAllCharts() {
    const { right } = svGetVisibleWindow();
    const f = svDataCache;

    // Helper to update a chart from cache
    function upd(chartKey, cacheKey) {
      cacheKey = cacheKey || chartKey;
      if (svCharts[chartKey] && f[cacheKey]) {
        svCharts[chartKey].update(svSliceData(f[cacheKey], right, svTimeRange));
      }
    }

    // Individual interface cards
    svInterfaces.forEach(iface => upd(`net.${iface}`));

    // Individual WiFi airtime band cards
    ['wifi_airtime.2g', 'wifi_airtime.5g', 'wifi_airtime.6g'].forEach(key => upd(key));

    // CPU
    upd('system.cpu');
    if (f['system.cpu'] && f['system.cpu'].data.length > 0) {
      const lr = f['system.cpu'].data.at(-1);
      if (lr) {
        const busy = (lr[1]||0)+(lr[2]||0)+(lr[3]||0)+(lr[4]||0)+(lr[5]||0)+(lr[6]||0);
        const m = document.getElementById('sv-cpu-meta'); if (m) m.textContent = busy.toFixed(1) + '% busy';
      }
    }
    // Memory
    upd('system.ram');
    if (f['system.ram'] && f['system.ram'].data.length > 0) {
      const lr = f['system.ram'].data.at(-1);
      if (lr) {
        const m = document.getElementById('sv-memory-meta');
        if (m) m.textContent = fmtMiB(lr[1]||0) + ' / ' + fmtMiB((lr[1]||0)+(lr[2]||0)+(lr[3]||0)+(lr[4]||0));
      }
    }
    // Load
    upd('system.load');
    if (f['system.load'] && f['system.load'].data.length > 0) {
      const lr = f['system.load'].data.at(-1);
      if (lr) {
        const m = document.getElementById('sv-load-meta');
        if (m) m.textContent = `${(lr[1]||0).toFixed(2)} / ${(lr[2]||0).toFixed(2)} / ${(lr[3]||0).toFixed(2)}`;
      }
    }
    // Disk I/O
    svDisks.forEach(disk => upd(`disk.${disk}`));
    // Disk Space combined
    if (svCharts['diskspace_combined'] && svMounts.length > 0 && f[svMounts[0].id]) {
      const firstData = svSliceData(f[svMounts[0].id], right, svTimeRange);
      if (firstData && firstData.data) {
        const mergedLabels = ['time', ...svMounts.map(m => 'used_' + m.name)];
        const mergedData = firstData.data.map((row, ri) => {
          const out = [row[0]];
          svMounts.forEach(m => {
            const d = svSliceData(f[m.id], right, svTimeRange);
            const r = d && d.data && d.data[ri] ? d.data[ri] : null;
            out.push(r ? (r[2] || 0) : 0);
          });
          return out;
        });
        svCharts['diskspace_combined'].update({ labels: mergedLabels, data: mergedData });
      }
    }
    // Context Switches + Interrupts
    const ctxtS = svSliceData(f['system.ctxt'], right, svTimeRange);
    const intrS = svSliceData(f['system.intr'], right, svTimeRange);
    if (ctxtS && intrS && svCharts['system.ctxint']) {
      svCharts['system.ctxint'].update({
        labels: ['time', 'switches', 'interrupts'],
        data: ctxtS.data.map((row, i) => [row[0], row[1]||0, intrS.data[i] ? (intrS.data[i][1]||0) : 0])
      });
    }
    // Processes
    upd('system.processes');
    // File Descriptors
    upd('system.fds');

    // Connected Clients
    renderClientsSummary();
    if (svSelectedClient) updateClientCharts();
  }

  // Fetch full 24h data, store in cache, then render visible window
  async function svPollUpdate() {
    if (!ND_DATA.isLive()) MockEngine.tick();

    const chartKeys = [
      'system.cpu', 'system.ram', 'system.load',
      'system.ctxt', 'system.intr', 'system.fds', 'system.processes',
      'wifi_airtime.2g', 'wifi_airtime.5g', 'wifi_airtime.6g',
      ...svInterfaces.map(i => `net.${i}`),
      ...svDisks.map(d => `disk.${d}`),
      ...svMounts.map(m => m.id)
    ];

    // Always fetch full 24h, downsample to 1200 points
    const results = await Promise.all(chartKeys.map(key => ND_DATA.getData(key, SV_MAX_HISTORY, 1200)));
    chartKeys.forEach((key, i) => { if (results[i]) svDataCache[key] = results[i]; });

    svUpdateAllCharts();
  }

  // "Go to Live" button management
  function svUpdateLiveButton() {
    let btn = document.getElementById('sv-live-btn');
    if (svPanOffset > 2) {
      if (!btn) {
        btn = document.createElement('button');
        btn.id = 'sv-live-btn';
        btn.className = 'sv-pill';
        btn.style.cssText = 'background:var(--accent-green);color:#fff;margin-left:12px;';
        btn.textContent = 'LIVE';
        btn.addEventListener('click', () => { svPanOffset = 0; svUpdateAllCharts(); svUpdateLiveButton(); });
        const header = document.querySelector('.sv-header-left');
        if (header) header.appendChild(btn);
      }
    } else {
      if (btn) btn.remove();
    }
  }


  /* ============================================================
     Tile Management: Layout, Drag, Dismiss, Add, Restore
     ============================================================ */

  // 12-column grid layout
  // Row 1-2: interfaces (3 per row, span-4)
  // Row 3: WiFi airtime bands (3 per row, span-4)
  // Row 4: Connected Clients (span-12)
  // Row 5-6: System cards (4 per row, span-3)
  const SV_DEFAULT_LAYOUT = {
    'sv-card-iface-wan':   { col: 1,  row: 1, span: 4 },
    'sv-card-iface-lan1':  { col: 5,  row: 1, span: 4 },
    'sv-card-iface-lan2':  { col: 9,  row: 1, span: 4 },
    'sv-card-iface-lan3':  { col: 1,  row: 2, span: 4 },
    'sv-card-iface-lan4':  { col: 5,  row: 2, span: 4 },
    'sv-card-iface-wwan':  { col: 9,  row: 2, span: 4 },
    'sv-card-airtime-2g':  { col: 1,  row: 3, span: 4 },
    'sv-card-airtime-5g':  { col: 5,  row: 3, span: 4 },
    'sv-card-airtime-6g':  { col: 9,  row: 3, span: 4 },
    'sv-card-clients':     { col: 1,  row: 4, span: 12 },
    'sv-card-cpu':         { col: 1,  row: 5, span: 3 },
    'sv-card-memory':      { col: 4,  row: 5, span: 3 },
    'sv-card-load':        { col: 7,  row: 5, span: 3 },
    'sv-card-diskio':      { col: 10, row: 5, span: 3 },
    'sv-card-diskspace':   { col: 1,  row: 6, span: 3 },
    'sv-card-processes':   { col: 4,  row: 6, span: 3 },
    'sv-card-ctxint':      { col: 7,  row: 6, span: 3 },
    'sv-card-fds':         { col: 10, row: 6, span: 3 },
    'sv-card-placeholder': { col: 1,  row: 7, span: 3 },
  };

  let svLayout = {};
  let svHiddenTiles = new Set();
  let svIsEditMode = false;
  let svIsDragging = false;
  let svDragCard = null;
  let svDragClone = null;
  let svDragOffX = 0, svDragOffY = 0;
  let svDownCard = null;
  let svStartX = 0, svStartY = 0;
  let svPreMoved = false;
  let svInDragGesture = false;
  let svPressTimer = null;
  let svDropIndicator = null;

  function svLoadLayout() {
    try {
      const saved = localStorage.getItem('sv_layout');
      if (saved) {
        svLayout = JSON.parse(saved);
        for (const [id, pos] of Object.entries(SV_DEFAULT_LAYOUT)) {
          if (!svLayout[id]) svLayout[id] = { ...pos };
        }
        return;
      }
    } catch(e) {}
    svLayout = JSON.parse(JSON.stringify(SV_DEFAULT_LAYOUT));
  }

  function svSaveLayout() {
    localStorage.setItem('sv_layout', JSON.stringify(svLayout));
  }

  function svApplyLayout() {
    const grid = document.getElementById('sv-grid');
    if (!grid) return;
    const mode = svGetGridMode();

    grid.querySelectorAll('.card, #sv-client-drilldown').forEach(el => {
      if (svHiddenTiles.has(el.id)) { el.style.display = 'none'; return; }
      if (el.id === 'sv-client-drilldown') return; // managed separately
      el.style.display = '';
      const pos = svLayout[el.id];
      if (mode === 1) {
        // Mobile: all full width, auto-flow
        el.style.gridColumn = 'span 12'; el.style.gridRow = '';
      } else if (mode === 2) {
        // Tablet: full-width cards stay full, others go half
        const span = pos && pos.span >= 12 ? 12 : 6;
        el.style.gridColumn = 'span ' + span; el.style.gridRow = '';
      } else if (pos) {
        // Desktop: use saved layout positions
        el.style.gridColumn = pos.col + ' / span ' + pos.span;
        el.style.gridRow = String(pos.row);
      }
    });
  }

  function svGetGridMode() {
    const w = window.innerWidth;
    return w >= 1280 ? 12 : w >= 768 ? 2 : 1;
  }

  function svGetCellFromPoint(x, y) {
    const grid = document.getElementById('sv-grid');
    if (!grid) return { col: 1, row: 1 };
    const rect = grid.getBoundingClientRect();
    const gap = 12;
    const cols = 12;
    const colW = (rect.width - gap * (cols - 1)) / cols;
    const rowH = 200 + gap;
    let col = Math.floor((x - rect.left + gap / 2) / (colW + gap)) + 1;
    let row = Math.floor((y - rect.top + gap / 2) / rowH) + 1;
    return { col: Math.max(1, Math.min(cols, col)), row: Math.max(1, row) };
  }

  function svFindCardAt(col, row, excludeId) {
    for (const [id, pos] of Object.entries(svLayout)) {
      if (id === excludeId) continue;
      if (!document.getElementById(id)) continue;
      if (svHiddenTiles.has(id)) continue;
      if (row === pos.row && col >= pos.col && col < pos.col + pos.span) return id;
    }
    return null;
  }

  function svGetCellRect(col, row, span) {
    const grid = document.getElementById('sv-grid');
    if (!grid) return { left: 0, top: 0, width: 0, height: 0 };
    const rect = grid.getBoundingClientRect();
    const gap = 12;
    const colW = (rect.width - gap * 11) / 12;
    const rowH = 200 + gap;
    return {
      left: rect.left + (col - 1) * (colW + gap),
      top: rect.top + (row - 1) * rowH,
      width: colW * span + gap * (span - 1),
      height: 200
    };
  }

  // --- Edit Mode ---
  function svEnterEditMode() {
    svIsEditMode = true;
    const grid = document.getElementById('sv-grid');
    if (!grid) return;
    // Show placeholder
    const ph = document.getElementById('sv-card-placeholder');
    if (ph) ph.style.display = '';
    // Wiggle + dismiss buttons
    grid.querySelectorAll('.card').forEach(card => {
      if (svHiddenTiles.has(card.id)) return;
      card.classList.add('sv-wiggle');
      if (!card.querySelector('.sv-card-dismiss-btn') && card.id !== 'sv-card-placeholder') {
        const btn = document.createElement('button');
        btn.className = 'sv-card-dismiss-btn';
        btn.innerHTML = '&#x2715;';
        btn.addEventListener('click', e => { e.stopPropagation(); svDismissCard(card); });
        card.appendChild(btn);
      }
    });
    // Restore Default button (reuse dashboard styling)
    if (!document.getElementById('sv-restore-btn')) {
      const btn = document.createElement('button');
      btn.id = 'sv-restore-btn';
      btn.className = 'restore-layout-btn';
      btn.innerHTML = '<i class="fa-solid fa-rotate-left" style="margin-right:5px;"></i>Restore Default Layout';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        svLayout = JSON.parse(JSON.stringify(SV_DEFAULT_LAYOUT));
        svSaveLayout();
        svHiddenTiles.clear();
        localStorage.removeItem('sv_hidden_tiles');
        svApplyLayout();
        svExitEditMode();
        location.reload();
      });
      const grid = document.getElementById('sv-grid');
      if (grid) grid.parentNode.insertBefore(btn, grid);
    }
  }

  function svExitEditMode() {
    svIsEditMode = false;
    const grid = document.getElementById('sv-grid');
    if (!grid) return;
    grid.querySelectorAll('.card').forEach(card => {
      card.classList.remove('sv-wiggle');
      card.querySelectorAll('.sv-card-dismiss-btn').forEach(b => b.remove());
    });
    const restoreBtn = document.getElementById('sv-restore-btn');
    if (restoreBtn) restoreBtn.remove();
    if (svDropIndicator) { svDropIndicator.remove(); svDropIndicator = null; }
  }

  function svDismissCard(card) {
    const id = card.id;
    if (id) {
      svHiddenTiles.add(id);
      localStorage.setItem('sv_hidden_tiles', JSON.stringify([...svHiddenTiles]));
    }
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.88)';
    setTimeout(() => { card.style.display = 'none'; card.style.opacity = ''; card.style.transform = ''; }, 260);
  }

  // --- Drag ---
  function svStartDrag(card, cx, cy) {
    svIsDragging = true;
    svDragCard = card;
    const rect = card.getBoundingClientRect();
    svDragOffX = cx - rect.left;
    svDragOffY = cy - rect.top;
    svDragClone = card.cloneNode(true);
    Object.assign(svDragClone.style, {
      position: 'fixed', left: rect.left + 'px', top: rect.top + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
      zIndex: '9000', pointerEvents: 'none', opacity: '0.92',
      transform: 'scale(1.04) rotate(1deg)', transition: 'transform 0.12s ease',
      boxShadow: '0 16px 48px rgba(0,0,0,0.6)', borderRadius: '8px', overflow: 'hidden'
    });
    document.body.appendChild(svDragClone);
    card.classList.add('sv-drag-source');
    card.classList.remove('sv-wiggle');
  }

  function svMoveDrag(cx, cy) {
    if (!svDragClone) return;
    svDragClone.style.left = (cx - svDragOffX) + 'px';
    svDragClone.style.top = (cy - svDragOffY) + 'px';
    const cell = svGetCellFromPoint(cx, cy);
    const pos = svLayout[svDragCard.id];
    const span = pos ? pos.span : 2;
    const col = Math.min(cell.col, 5 - span);
    const row = Math.max(1, cell.row);
    const occupied = svFindCardAt(col, row, svDragCard.id);
    // Drop indicator
    if (!svDropIndicator) {
      svDropIndicator = document.createElement('div');
      svDropIndicator.className = 'sv-drop-indicator';
      document.body.appendChild(svDropIndicator);
    }
    const cr = svGetCellRect(col, row, span);
    Object.assign(svDropIndicator.style, {
      left: cr.left + 'px', top: cr.top + 'px',
      width: cr.width + 'px', height: cr.height + 'px', display: ''
    });
    svDropIndicator.classList.toggle('swap', !!occupied);
    svDropIndicator._target = { col, row, span };
  }

  function svEndDrag() {
    if (!svDragCard || !svDragClone) { svIsDragging = false; return; }
    const target = svDropIndicator ? svDropIndicator._target : null;
    if (target) {
      const oldPos = svLayout[svDragCard.id];
      const occupant = svFindCardAt(target.col, target.row, svDragCard.id);
      if (occupant && oldPos) {
        svLayout[occupant] = { col: oldPos.col, row: oldPos.row, span: svLayout[occupant].span };
      }
      svLayout[svDragCard.id] = { col: target.col, row: target.row, span: target.span };
      svSaveLayout();
      svApplyLayout();
    }
    svDragCard.classList.remove('sv-drag-source');
    svDragClone.remove();
    svDragClone = null;
    svDragCard = null;
    svIsDragging = false;
    if (svDropIndicator) { svDropIndicator.remove(); svDropIndicator = null; }
  }

  // --- Tile Picker ---
  const SV_AVAILABLE_TILES = [
    { id: 'sv-card-iface-wan', title: 'WAN (10GbE)', icon: 'fa-solid fa-globe', desc: 'WAN interface throughput + errors' },
    { id: 'sv-card-iface-lan1', title: 'LAN1 (10GbE)', icon: 'fa-solid fa-ethernet', desc: 'LAN1 interface throughput + errors' },
    { id: 'sv-card-iface-lan2', title: 'LAN2 (GbE)', icon: 'fa-solid fa-ethernet', desc: 'LAN2 interface throughput + errors' },
    { id: 'sv-card-iface-lan3', title: 'LAN3 (GbE)', icon: 'fa-solid fa-ethernet', desc: 'LAN3 interface throughput + errors' },
    { id: 'sv-card-iface-lan4', title: 'LAN4 (GbE)', icon: 'fa-solid fa-ethernet', desc: 'LAN4 interface throughput + errors' },
    { id: 'sv-card-iface-wwan', title: 'WWAN (LTE)', icon: 'fa-solid fa-signal', desc: 'WWAN interface throughput + errors' },
    { id: 'sv-card-airtime-2g', title: 'WiFi 2.4 GHz', icon: 'fa-solid fa-wifi', desc: '2.4 GHz airtime utilization' },
    { id: 'sv-card-airtime-5g', title: 'WiFi 5 GHz', icon: 'fa-solid fa-wifi', desc: '5 GHz airtime utilization' },
    { id: 'sv-card-airtime-6g', title: 'WiFi 6 GHz', icon: 'fa-solid fa-wifi', desc: '6 GHz airtime utilization' },
    { id: 'sv-card-clients', title: 'Connected Clients', icon: 'fa-solid fa-users', desc: 'Top clients by bandwidth with drill-down diagnostics' },
    { id: 'sv-card-cpu', title: 'CPU Utilization', icon: 'fa-solid fa-microchip', desc: 'User, system, iowait, IRQ breakdown' },
    { id: 'sv-card-memory', title: 'Memory', icon: 'fa-solid fa-memory', desc: 'Used, buffers, cached, free' },
    { id: 'sv-card-load', title: 'System Load', icon: 'fa-solid fa-weight-hanging', desc: '1, 5, 15 minute load averages' },
    { id: 'sv-card-diskio', title: 'Disk I/O', icon: 'fa-solid fa-hard-drive', desc: 'Read/write throughput per disk' },
    { id: 'sv-card-diskspace', title: 'Disk Space', icon: 'fa-solid fa-database', desc: 'Usage over time per mount' },
    { id: 'sv-card-processes', title: 'Processes', icon: 'fa-solid fa-list-check', desc: 'Running and blocked process counts' },
    { id: 'sv-card-ctxint', title: 'Context Switches / Interrupts', icon: 'fa-solid fa-arrows-rotate', desc: 'Kernel context switches and hardware interrupts' },
    { id: 'sv-card-fds', title: 'File Descriptors', icon: 'fa-solid fa-file-lines', desc: 'Allocated file descriptor count' },
  ];

  function svOpenTilePicker() {
    const overlay = document.getElementById('sv-tile-picker-overlay');
    if (!overlay) return;
    const grid = document.getElementById('svTilePickerGrid');
    const restoreGrid = document.getElementById('svTilePickerRestoreGrid');
    const restoreSection = document.getElementById('svTilePickerRestore');
    grid.innerHTML = '';
    restoreGrid.innerHTML = '';

    // Restore hidden tiles section
    if (svHiddenTiles.size > 0) {
      restoreSection.classList.remove('hidden');
      svHiddenTiles.forEach(id => {
        const tile = SV_AVAILABLE_TILES.find(t => t.id === id);
        if (!tile) return;
        const opt = document.createElement('div');
        opt.className = 'tile-option';
        opt.innerHTML = `<div class="tile-option-icon"><i class="${tile.icon}"></i></div>
          <div class="tile-option-title">${tile.title}</div>
          <div class="tile-option-desc">${tile.desc}</div>
          <button class="tile-option-restore">Restore</button>`;
        opt.querySelector('button').addEventListener('click', () => {
          svHiddenTiles.delete(id);
          localStorage.setItem('sv_hidden_tiles', JSON.stringify([...svHiddenTiles]));
          const card = document.getElementById(id);
          if (card) { card.style.display = ''; }
          svApplyLayout();
          svCloseTilePicker();
        });
        restoreGrid.appendChild(opt);
      });
    } else {
      restoreSection.classList.add('hidden');
    }

    overlay.classList.remove('hidden');
  }

  function svCloseTilePicker() {
    const overlay = document.getElementById('sv-tile-picker-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  // --- Pointer events for StatsView grid ---
  function svInitDragHandlers() {
    const grid = document.getElementById('sv-grid');
    if (!grid) return;

    grid.addEventListener('pointerdown', function(e) {
      const card = e.target.closest('.card');
      if (e.target.closest('.sv-card-dismiss-btn, button, a, input')) return;

      if (!svIsEditMode) {
        if (!card || e.button !== 0) return;
        svStartX = e.clientX; svStartY = e.clientY; svPreMoved = false;
        svPressTimer = setTimeout(() => { if (!svPreMoved) svEnterEditMode(); }, 250);
      } else {
        if (!card || e.button !== 0) { svExitEditMode(); return; }
        if (card.id === 'sv-card-placeholder') { svOpenTilePicker(); return; }
        svDownCard = card;
        svStartX = e.clientX; svStartY = e.clientY; svInDragGesture = false;
      }
    });

    grid.addEventListener('pointermove', function(e) {
      const dx = e.clientX - svStartX, dy = e.clientY - svStartY;
      if (!svIsEditMode) {
        if (Math.abs(dx) + Math.abs(dy) > 6) { svPreMoved = true; clearTimeout(svPressTimer); }
      } else if (svIsDragging) {
        svMoveDrag(e.clientX, e.clientY);
      } else if (svDownCard && !svInDragGesture) {
        if (Math.abs(dx) + Math.abs(dy) > 8) {
          svInDragGesture = true;
          svStartDrag(svDownCard, svStartX, svStartY);
          svMoveDrag(e.clientX, e.clientY);
        }
      }
    });

    grid.addEventListener('pointerup', function() {
      clearTimeout(svPressTimer);
      if (svIsDragging) svEndDrag();
      svDownCard = null;
      svInDragGesture = false;
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && svIsEditMode) svExitEditMode();
    });

    // Placeholder click
    const ph = document.getElementById('sv-card-placeholder');
    if (ph) ph.addEventListener('click', () => { if (!svIsEditMode) svOpenTilePicker(); });

    // Tile picker close
    const closeBtn = document.getElementById('svTilePickerClose');
    if (closeBtn) closeBtn.addEventListener('click', svCloseTilePicker);
    const overlay = document.getElementById('sv-tile-picker-overlay');
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) svCloseTilePicker(); });

    // Responsive re-layout
    let svLastMode = svGetGridMode();
    window.addEventListener('resize', () => {
      const mode = svGetGridMode();
      if (mode !== svLastMode) { svLastMode = mode; svApplyLayout(); }
    });
  }


  /* ============================================================
     Public API
     ============================================================ */
  window.svInit = async function () {
    const mode = await ND_DATA.init();
    const badge = document.getElementById('sv-status');
    if (badge) {
      badge.className = 'sv-status-badge ' + mode;
      badge.querySelector('.sv-status-label').textContent = mode === 'live' ? 'LIVE' : 'MOCK DATA';
    }
    svInterfaces = ND_DATA.getNetworkInterfaces();
    svDisks = ND_DATA.getDisks();
    svMounts = ND_DATA.getDiskMounts();

    // Load hidden tiles
    try { svHiddenTiles = new Set(JSON.parse(localStorage.getItem('sv_hidden_tiles') || '[]')); } catch(e) { svHiddenTiles = new Set(); }

    initBasicCharts();
    initAdvancedCharts();

    // Layout
    svLoadLayout();
    svApplyLayout();
    svInitDragHandlers();

    svSetTimeRange(svTimeRange);

    // Sort dropdown change
    const sortSelect = document.getElementById('sv-client-sort');
    if (sortSelect) sortSelect.addEventListener('change', renderClientsSummary);

    // --- Client Search & Filter ---
    const searchInput = document.getElementById('sv-client-search');
    const acDropdown = document.getElementById('sv-client-autocomplete');

    let svSearchQuery = '';
    let svFilterBands = new Set(['2.4 GHz', '5 GHz', '6 GHz', 'wired']);
    let svFilterCategories = new Set(['computing', 'media', 'iot', 'gaming', 'networking', 'other']);

    // Expose filter state so renderClientsSummary can use it
    window._svClientFilter = function(clients) {
      return clients.filter(c => {
        // Band filter
        const band = c.type === 'wired' ? 'wired' : (c.band || '');
        if (!svFilterBands.has(band)) return false;
        // Category filter
        if (!svFilterCategories.has(c.category || 'other')) return false;
        // Search filter
        if (svSearchQuery) {
          const q = svSearchQuery.toLowerCase();
          const name = (c.name || '').toLowerCase();
          const id = (c.id || '').toLowerCase();
          const devType = (c.devType || '').toLowerCase();
          const cat = (c.category || '').toLowerCase();
          if (!name.includes(q) && !id.includes(q) && !devType.includes(q) && !cat.includes(q)) return false;
        }
        return true;
      });
    };

    if (searchInput) {
      let acIndex = -1;
      let acItems = [];
      const clearBtn = document.getElementById('sv-client-search-clear');

      searchInput.addEventListener('input', () => {
        if (clearBtn) clearBtn.style.display = searchInput.value.length > 0 ? '' : 'none';
        svSearchQuery = searchInput.value.trim();
        renderClientsSummary();
        // Show autocomplete
        if (svSearchQuery.length >= 1) {
          const clients = MockEngine.getClientList();
          const q = svSearchQuery.toLowerCase();
          acItems = clients.filter(c =>
            (c.name || '').toLowerCase().includes(q) ||
            (c.id || '').toLowerCase().includes(q) ||
            (c.devType || '').toLowerCase().includes(q)
          ).slice(0, 8);
          if (acItems.length > 0) {
            acDropdown.innerHTML = acItems.map((c, i) => {
              const name = c.name.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="sv-client-ac-highlight">$1</span>');
              return `<div class="sv-client-ac-item" data-idx="${i}"><i class="${deviceIcon(c.devType)}"></i>${name}</div>`;
            }).join('');
            acDropdown.classList.add('open');
            acIndex = -1;
          } else {
            acDropdown.classList.remove('open');
          }
        } else {
          acDropdown.classList.remove('open');
        }
      });

      searchInput.addEventListener('keydown', e => {
        if (!acDropdown.classList.contains('open')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); acIndex = Math.min(acIndex + 1, acItems.length - 1); updateAcHighlight(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); acIndex = Math.max(acIndex - 1, 0); updateAcHighlight(); }
        else if (e.key === 'Enter' && acIndex >= 0) { e.preventDefault(); selectAcItem(acIndex); }
        else if (e.key === 'Escape') { acDropdown.classList.remove('open'); }
      });

      acDropdown.addEventListener('click', e => {
        const item = e.target.closest('.sv-client-ac-item');
        if (item) selectAcItem(parseInt(item.dataset.idx));
      });

      function updateAcHighlight() {
        acDropdown.querySelectorAll('.sv-client-ac-item').forEach((el, i) => {
          el.classList.toggle('active', i === acIndex);
        });
      }

      function selectAcItem(idx) {
        const c = acItems[idx];
        if (c) {
          searchInput.value = c.name;
          svSearchQuery = c.name;
          acDropdown.classList.remove('open');
          renderClientsSummary();
          openClientDrilldown(c.id);
        }
      }

      // Clear search button
      if (clearBtn) clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        svSearchQuery = '';
        clearBtn.style.display = 'none';
        acDropdown.classList.remove('open');
        renderClientsSummary();
      });

      // Close autocomplete on outside click
      document.addEventListener('click', e => {
        if (!e.target.closest('.sv-client-search-wrap')) acDropdown.classList.remove('open');
      });
    }

    // Multi-select filter dropdowns
    document.querySelectorAll('#sv-card-clients .cf-multi').forEach(multi => {
      const btn = multi.querySelector('.cf-multi-btn');
      const isBand = multi.id === 'sv-filter-band';
      const filterSet = isBand ? svFilterBands : svFilterCategories;
      const label = isBand ? 'Band' : 'Category';

      btn.addEventListener('click', e => {
        e.stopPropagation();
        // Close other dropdowns
        document.querySelectorAll('.cf-multi.open').forEach(m => { if (m !== multi) m.classList.remove('open'); });
        multi.classList.toggle('open');
      });

      function updateFilterBtn() {
        const total = multi.querySelectorAll('input[type="checkbox"]').length;
        const checked = multi.querySelectorAll('input[type="checkbox"]:checked').length;
        btn.innerHTML = checked < total ? `${label} <span class="cf-count">${checked}</span>` : label;
        renderClientsSummary();
      }

      multi.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', () => {
          if (cb.checked) filterSet.add(cb.value);
          else filterSet.delete(cb.value);
          updateFilterBtn();
        });
      });

      // All / Clear buttons
      const selectAllBtn = multi.querySelector('.cf-select-all');
      const clearAllBtn = multi.querySelector('.cf-clear-all');
      if (selectAllBtn) selectAllBtn.addEventListener('click', e => {
        e.stopPropagation();
        multi.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = true; filterSet.add(cb.value); });
        updateFilterBtn();
      });
      if (clearAllBtn) clearAllBtn.addEventListener('click', e => {
        e.stopPropagation();
        multi.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; filterSet.delete(cb.value); });
        updateFilterBtn();
      });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.cf-multi')) {
        document.querySelectorAll('.cf-multi.open').forEach(m => m.classList.remove('open'));
      }
    });

    // Go-to time handler
    const gotoBtn = document.getElementById('sv-goto-btn');
    const gotoInput = document.getElementById('sv-goto-time');
    if (gotoBtn && gotoInput) {
      // Set default value to "now"
      const now = new Date();
      gotoInput.value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
      gotoBtn.addEventListener('click', () => {
        const target = new Date(gotoInput.value);
        if (isNaN(target.getTime())) return;
        const nowEpoch = Math.floor(Date.now() / 1000);
        const targetEpoch = Math.floor(target.getTime() / 1000);
        // Center the window on the target time
        svPanOffset = Math.max(0, Math.min(SV_MAX_HISTORY - svTimeRange, nowEpoch - targetEpoch - svTimeRange / 2));
        svUpdateAllCharts();
        svUpdateLiveButton();
      });
    }

    svResume();
  };

  window.svResume = function () {
    if (svPollTimer) return;
    svPollUpdate();
    svPollTimer = setInterval(svPollUpdate, SV_POLL_MS);
  };

  window.svPause = function () {
    if (svPollTimer) { clearInterval(svPollTimer); svPollTimer = null; }
  };

  window.svSetTimeRange = function (secs) {
    svTimeRange = secs;
    localStorage.setItem('sv_range', secs);
    document.querySelectorAll('.sv-time-group .sv-pill').forEach(btn =>
      btn.classList.toggle('active', parseInt(btn.dataset.range) === secs));
    // Clamp pan offset if new range would exceed history
    svPanOffset = Math.min(svPanOffset, SV_MAX_HISTORY - secs);
    // Re-render immediately from cache (instant zoom), then next poll will refresh
    if (Object.keys(svDataCache).length > 0) svUpdateAllCharts();
    else if (svPollTimer) svPollUpdate();
  };

})();
