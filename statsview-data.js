/* ============================================================
   StatsView - Data Abstraction Layer
   Tries live Netdata REST API, falls back to mock data.
   ============================================================ */

const ND_DATA = (function () {
  let _mode = 'unknown'; // 'live' | 'mock'
  let _baseUrl = '';
  let _charts = null;
  let _info = null;

  async function init(host) {
    _baseUrl = host || `${location.protocol}//${location.hostname}:19999`;
    try {
      const r = await fetch(`${_baseUrl}/api/v1/info`, { signal: AbortSignal.timeout(3000) });
      if (!r.ok) throw new Error(r.status);
      _info = await r.json();
      _mode = 'live';
      _charts = await (await fetch(`${_baseUrl}/api/v1/charts`)).json();
    } catch (e) {
      console.warn('NetData API unreachable, using mock data:', e.message);
      _mode = 'mock';
      _info = MOCK_INFO;
      _charts = MOCK_CHARTS;
      MockEngine.init();
    }
    return _mode;
  }

  function isLive() { return _mode === 'live'; }
  function getMode() { return _mode; }
  function getInfo() { return _info; }
  function getCharts() { return _charts; }

  function getNetworkInterfaces() {
    if (_mode === 'mock') return SV_INTERFACES.map(i => i.id);
    if (!_charts) return [];
    const ifaces = [];
    const charts = _charts.charts || _charts;
    for (const key in charts) {
      if (key.startsWith('net.')) {
        const name = key.slice(4);
        if (name && !name.includes('.') && name !== 'lo') ifaces.push(name);
      }
    }
    return ifaces.length ? ifaces : SV_INTERFACES.map(i => i.id);
  }

  function getInterfaceLabel(id) {
    const entry = SV_INTERFACES.find(i => i.id === id);
    if (!entry) return id;
    return `${entry.name} <span class="sv-iface-media">${entry.media}</span>`;
  }

  function getDisks() {
    if (!_charts) return [];
    const disks = [];
    const charts = _charts.charts || _charts;
    for (const key in charts) {
      if (key.startsWith('disk.') && key.indexOf('.') === 4) {
        const name = key.slice(5);
        if (name && !disks.includes(name)) disks.push(name);
      }
    }
    return disks.length ? disks : ['sda'];
  }

  function getDiskMounts() {
    if (!_charts) return [];
    const mounts = [];
    const charts = _charts.charts || _charts;
    for (const key in charts) {
      if (key.startsWith('disk_space.')) mounts.push({ id: key, name: key.slice(11) });
    }
    return mounts.length ? mounts : [{ id: 'disk_space._', name: '/' }];
  }

  async function getData(chart, afterSecs, points) {
    if (_mode === 'live') {
      try {
        const url = `${_baseUrl}/api/v1/data?chart=${encodeURIComponent(chart)}&after=-${afterSecs}&points=${points}&format=json&options=abs`;
        const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
        return r.json();
      } catch (e) {
        return null;
      }
    }
    return MockEngine.getData(chart, afterSecs, points);
  }

  return { init, isLive, getMode, getInfo, getCharts, getNetworkInterfaces, getInterfaceLabel, getDisks, getDiskMounts, getData };
})();


/* ============================================================
   Mock Info & Chart Definitions
   ============================================================ */

const MOCK_INFO = {
  version: '1.33.1', os_name: 'SmartOS', os_version: 'OpenWrt 22.03',
  kernel_name: 'Linux', hostname: 'smartos-gw', cores_total: 4,
  ram_total: 536870912, memory_mode: 'dbengine', update_every: 2
};

// Interface definitions: id -> display name + media type
const SV_INTERFACES = [
  { id: 'wan',  name: 'WAN',  media: '10GbE' },
  { id: 'lan1', name: 'LAN1', media: '10GbE' },
  { id: 'lan2', name: 'LAN2', media: 'GbE' },
  { id: 'lan3', name: 'LAN3', media: 'GbE' },
  { id: 'lan4', name: 'LAN4', media: 'GbE' },
  { id: 'wwan', name: 'WWAN', media: 'LTE' },
];

const MOCK_CHARTS = {
  'system.cpu':        { dimensions: { user:{}, system:{}, iowait:{}, irq:{}, softirq:{}, steal:{}, idle:{} } },
  'system.ram':        { dimensions: { used:{}, buffers:{}, cached:{}, free:{} } },
  'system.swap':       { dimensions: { used:{}, free:{} } },
  'system.load':       { dimensions: { load1:{}, load5:{}, load15:{} } },
  'system.net':        { dimensions: { received:{}, sent:{} } },
  'system.ctxt':       { dimensions: { switches:{} } },
  'system.intr':       { dimensions: { interrupts:{} } },
  'system.fds':        { dimensions: { allocated:{}, max:{} } },
  'system.processes':  { dimensions: { running:{}, blocked:{} } },
  // Per-interface: throughput + rx/tx errors combined
  'net.wan':           { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'net.lan1':          { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'net.lan2':          { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'net.lan3':          { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'net.lan4':          { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'net.wwan':          { dimensions: { received:{}, sent:{}, rx_errors:{}, tx_errors:{} } },
  'disk.sda':          { dimensions: { reads:{}, writes:{} } },
  'disk_space._':      { dimensions: { avail:{}, used:{}, reserved:{} } },
  'disk_space._tmp':   { dimensions: { avail:{}, used:{}, reserved:{} } },
  'wifi_airtime.2g':   { dimensions: { tx:{}, rx:{}, wifi_int:{}, non_wifi:{} } },
  'wifi_airtime.5g':   { dimensions: { tx:{}, rx:{}, wifi_int:{}, non_wifi:{} } },
  'wifi_airtime.6g':   { dimensions: { tx:{}, rx:{}, wifi_int:{}, non_wifi:{} } },
};


/* ============================================================
   Mock Data Engine - Pre-fills 24 hours of history
   ============================================================ */

const MockEngine = (function () {
  const _buffers = {};
  const MAX_PTS = 43200; // 24h at 2s

  const _state = {
    cpu_user: 12, cpu_system: 5, cpu_iowait: 1, cpu_irq: 0.5, cpu_softirq: 0.3, cpu_steal: 0,
    ram_used: 280, ram_buffers: 40, ram_cached: 120, ram_free: 72,
    swap_used: 8, swap_free: 504,
    load1: 0.45, load5: 0.38, load15: 0.32,
    // Per-interface throughput (kbits/s) and rx/tx errors/s
    wan_rx: 4500, wan_tx: 1200, wan_rxe: 0, wan_txe: 0,
    lan1_rx: 3800, lan1_tx: 900, lan1_rxe: 0, lan1_txe: 0,
    lan2_rx: 1200, lan2_tx: 400, lan2_rxe: 0, lan2_txe: 0,
    lan3_rx: 800, lan3_tx: 200, lan3_rxe: 0, lan3_txe: 0,
    lan4_rx: 300, lan4_tx: 100, lan4_rxe: 0, lan4_txe: 0,
    wwan_rx: 120, wwan_tx: 30, wwan_rxe: 0, wwan_txe: 0,
    sda_read: 450, sda_write: 200,
    disk_root_used: 1.8, disk_root_avail: 5.6, disk_root_reserved: 0.6,
    disk_tmp_used: 0.12, disk_tmp_avail: 0.85, disk_tmp_reserved: 0.03,
    ctxt: 2400, intr: 1800,
    fds_alloc: 1840, fds_max: 32768,
    proc_running: 2, proc_blocked: 0,
    // Airtime 3 bands
    radio_2g_tx: 8, radio_2g_rx: 12, radio_2g_wifi_int: 5, radio_2g_non_wifi: 3,
    radio_5g_tx: 15, radio_5g_rx: 22, radio_5g_wifi_int: 4, radio_5g_non_wifi: 2,
    radio_6g_tx: 6, radio_6g_rx: 8, radio_6g_wifi_int: 2, radio_6g_non_wifi: 1,
  };

  function drift(val, min, max, step) {
    return Math.max(min, Math.min(max, val + (Math.random() - 0.5) * 2 * step));
  }
  function driftInt(val, min, max, step) {
    return Math.round(drift(val, min, max, step));
  }

  function tick() {
    const s = _state;
    // CPU
    s.cpu_user = drift(s.cpu_user, 2, 60, 3);
    s.cpu_system = drift(s.cpu_system, 1, 25, 1.5);
    s.cpu_iowait = drift(s.cpu_iowait, 0, 15, 1);
    s.cpu_irq = drift(s.cpu_irq, 0, 5, 0.3);
    s.cpu_softirq = drift(s.cpu_softirq, 0, 4, 0.2);
    s.cpu_steal = drift(s.cpu_steal, 0, 2, 0.1);
    const cpuBusy = s.cpu_user + s.cpu_system + s.cpu_iowait + s.cpu_irq + s.cpu_softirq + s.cpu_steal;
    // Memory
    s.ram_used = drift(s.ram_used, 200, 420, 5);
    s.ram_buffers = drift(s.ram_buffers, 20, 80, 2);
    s.ram_cached = drift(s.ram_cached, 60, 180, 3);
    s.ram_free = Math.max(10, 512 - s.ram_used - s.ram_buffers - s.ram_cached);
    s.swap_used = drift(s.swap_used, 0, 50, 1);
    s.swap_free = 512 - s.swap_used;
    // Load
    s.load1 = drift(s.load1, 0.05, 4, 0.08);
    s.load5 = drift(s.load5, 0.05, 3.5, 0.03);
    s.load15 = drift(s.load15, 0.05, 3, 0.01);
    // Network throughput per interface
    s.wan_rx = drift(s.wan_rx, 100, 50000, 800);
    s.wan_tx = drift(s.wan_tx, 50, 20000, 400);
    s.lan1_rx = drift(s.lan1_rx, 50, 40000, 600);
    s.lan1_tx = drift(s.lan1_tx, 20, 15000, 300);
    s.lan2_rx = drift(s.lan2_rx, 20, 8000, 200);
    s.lan2_tx = drift(s.lan2_tx, 10, 4000, 100);
    s.lan3_rx = drift(s.lan3_rx, 10, 5000, 150);
    s.lan3_tx = drift(s.lan3_tx, 5, 2000, 60);
    s.lan4_rx = drift(s.lan4_rx, 5, 3000, 80);
    s.lan4_tx = drift(s.lan4_tx, 2, 1000, 30);
    s.wwan_rx = drift(s.wwan_rx, 0, 5000, 100);
    s.wwan_tx = drift(s.wwan_tx, 0, 2000, 50);
    // Disk I/O
    s.sda_read = drift(s.sda_read, 0, 8000, 300);
    s.sda_write = drift(s.sda_write, 0, 4000, 150);
    // Disk space
    s.disk_root_used = drift(s.disk_root_used, 1.2, 6.5, 0.01);
    s.disk_root_avail = Math.max(0.1, 8.0 - s.disk_root_used - s.disk_root_reserved);
    s.disk_tmp_used = drift(s.disk_tmp_used, 0.01, 0.8, 0.005);
    s.disk_tmp_avail = Math.max(0.01, 1.0 - s.disk_tmp_used - s.disk_tmp_reserved);
    // Context switches / interrupts
    s.ctxt = drift(s.ctxt, 500, 8000, 200);
    s.intr = drift(s.intr, 400, 6000, 150);
    // FDs / processes
    s.fds_alloc = driftInt(s.fds_alloc, 800, 4000, 30);
    s.proc_running = driftInt(s.proc_running, 1, 8, 1);
    s.proc_blocked = Math.random() < 0.1 ? driftInt(s.proc_blocked, 0, 3, 1) : 0;
    // Airtime 3 bands
    s.radio_2g_tx = drift(s.radio_2g_tx, 2, 25, 1.5);
    s.radio_2g_rx = drift(s.radio_2g_rx, 3, 30, 2);
    s.radio_2g_wifi_int = drift(s.radio_2g_wifi_int, 0, 15, 1);
    s.radio_2g_non_wifi = drift(s.radio_2g_non_wifi, 0, 10, 0.5);
    s.radio_5g_tx = drift(s.radio_5g_tx, 5, 35, 2);
    s.radio_5g_rx = drift(s.radio_5g_rx, 8, 40, 2.5);
    s.radio_5g_wifi_int = drift(s.radio_5g_wifi_int, 0, 12, 1);
    s.radio_5g_non_wifi = drift(s.radio_5g_non_wifi, 0, 8, 0.5);
    s.radio_6g_tx = drift(s.radio_6g_tx, 2, 20, 1);
    s.radio_6g_rx = drift(s.radio_6g_rx, 3, 25, 1.5);
    s.radio_6g_wifi_int = drift(s.radio_6g_wifi_int, 0, 8, 0.5);
    s.radio_6g_non_wifi = drift(s.radio_6g_non_wifi, 0, 5, 0.3);
    // Network errors (rx/tx separate) - occasional spikes per interface
    if (Math.random() < 0.02) s.wan_rxe = driftInt(s.wan_rxe, 0, 6, 2);
    else s.wan_rxe = Math.max(0, s.wan_rxe - 1);
    if (Math.random() < 0.01) s.wan_txe = driftInt(s.wan_txe, 0, 3, 1);
    else s.wan_txe = Math.max(0, s.wan_txe - 1);
    if (Math.random() < 0.015) s.lan1_rxe = driftInt(s.lan1_rxe, 0, 5, 2);
    else s.lan1_rxe = Math.max(0, s.lan1_rxe - 1);
    if (Math.random() < 0.008) s.lan1_txe = driftInt(s.lan1_txe, 0, 2, 1);
    else s.lan1_txe = Math.max(0, s.lan1_txe - 1);
    if (Math.random() < 0.008) s.lan2_rxe = driftInt(s.lan2_rxe, 0, 3, 1);
    else s.lan2_rxe = Math.max(0, s.lan2_rxe - 1);
    if (Math.random() < 0.005) s.lan3_rxe = driftInt(s.lan3_rxe, 0, 2, 1);
    else s.lan3_rxe = Math.max(0, s.lan3_rxe - 1);
    if (Math.random() < 0.005) s.lan4_rxe = driftInt(s.lan4_rxe, 0, 2, 1);
    else s.lan4_rxe = Math.max(0, s.lan4_rxe - 1);
    if (Math.random() < 0.01) s.wwan_rxe = driftInt(s.wwan_rxe, 0, 4, 2);
    else s.wwan_rxe = Math.max(0, s.wwan_rxe - 1);
    if (Math.random() < 0.005) s.wwan_txe = driftInt(s.wwan_txe, 0, 2, 1);
    else s.wwan_txe = Math.max(0, s.wwan_txe - 1);
  }

  function pushAll(timestamp) {
    const s = _state;
    const cpuBusy = s.cpu_user + s.cpu_system + s.cpu_iowait + s.cpu_irq + s.cpu_softirq + s.cpu_steal;
    const t = timestamp;
    push('system.cpu', [t, s.cpu_user, s.cpu_system, s.cpu_iowait, s.cpu_irq, s.cpu_softirq, s.cpu_steal, Math.max(0, 100 - cpuBusy)]);
    push('system.ram', [t, s.ram_used, s.ram_buffers, s.ram_cached, s.ram_free]);
    push('system.swap', [t, s.swap_used, s.swap_free]);
    push('system.load', [t, s.load1, s.load5, s.load15]);
    // Per-interface: throughput + rx/tx errors in one chart
    push('net.wan',  [t, s.wan_rx,  s.wan_tx,  s.wan_rxe,  s.wan_txe]);
    push('net.lan1', [t, s.lan1_rx, s.lan1_tx, s.lan1_rxe, s.lan1_txe]);
    push('net.lan2', [t, s.lan2_rx, s.lan2_tx, s.lan2_rxe, s.lan2_txe]);
    push('net.lan3', [t, s.lan3_rx, s.lan3_tx, s.lan3_rxe, s.lan3_txe]);
    push('net.lan4', [t, s.lan4_rx, s.lan4_tx, s.lan4_rxe, s.lan4_txe]);
    push('net.wwan', [t, s.wwan_rx, s.wwan_tx, s.wwan_rxe, s.wwan_txe]);
    push('system.net', [t, s.wan_rx+s.lan1_rx+s.lan2_rx+s.lan3_rx+s.lan4_rx+s.wwan_rx,
                           s.wan_tx+s.lan1_tx+s.lan2_tx+s.lan3_tx+s.lan4_tx+s.wwan_tx]);
    push('disk.sda', [t, s.sda_read, s.sda_write]);
    push('disk_space._', [t, s.disk_root_avail, s.disk_root_used, s.disk_root_reserved]);
    push('disk_space._tmp', [t, s.disk_tmp_avail, s.disk_tmp_used, s.disk_tmp_reserved]);
    push('system.ctxt', [t, s.ctxt]);
    push('system.intr', [t, s.intr]);
    push('system.fds', [t, s.fds_alloc, s.fds_max]);
    push('system.processes', [t, s.proc_running, s.proc_blocked]);
    // Airtime as time-series
    push('wifi_airtime.2g', [t, s.radio_2g_tx, s.radio_2g_rx, s.radio_2g_wifi_int, s.radio_2g_non_wifi]);
    push('wifi_airtime.5g', [t, s.radio_5g_tx, s.radio_5g_rx, s.radio_5g_wifi_int, s.radio_5g_non_wifi]);
    push('wifi_airtime.6g', [t, s.radio_6g_tx, s.radio_6g_rx, s.radio_6g_wifi_int, s.radio_6g_non_wifi]);
  }

  function push(chart, row) {
    if (!_buffers[chart]) _buffers[chart] = [];
    _buffers[chart].push(row);
    if (_buffers[chart].length > MAX_PTS) _buffers[chart].shift();
  }

  function init() {
    // Pre-fill full 24 hours of history (43200 data points at 2s intervals)
    console.time('MockEngine: generating 24h history');
    const now = Math.floor(Date.now() / 1000);
    const totalPoints = MAX_PTS;
    for (let i = totalPoints; i > 0; i--) {
      tick();
      pushAll(now - (i * 2));
    }
    console.timeEnd('MockEngine: generating 24h history');
  }

  function tickAndPush() {
    tick();
    pushAll(Math.floor(Date.now() / 1000));
  }

  function getData(chart, afterSecs, points) {
    const buf = _buffers[chart];
    if (!buf || buf.length === 0) return null;

    const cutoff = Math.floor(Date.now() / 1000) - afterSecs;
    let filtered = buf.filter(r => r[0] >= cutoff);
    if (filtered.length === 0) filtered = buf.slice(-10);

    // Downsample if more points than requested
    if (filtered.length > points && points > 0) {
      const step = filtered.length / points;
      const sampled = [];
      for (let i = 0; i < points; i++) {
        sampled.push(filtered[Math.floor(i * step)]);
      }
      filtered = sampled;
    }

    const chartMeta = MOCK_CHARTS[chart];
    if (!chartMeta) return null;
    const dims = Object.keys(chartMeta.dimensions);

    return {
      labels: ['time', ...dims],
      data: filtered.map(r => r.slice())
    };
  }

  // ---- Client Mock Data ----
  const CLIENT_TICK_INTERVAL = 10; // seconds
  const CLIENT_MAX_HISTORY = 8640; // 24h at 10s
  const CLIENT_SPARKLINE_PTS = 90; // 15 min at 10s

  const _clients = [];
  const _clientHistory = {}; // id -> { full: [[t, rx, tx, rssi, phy, airtime, retrans, qoe], ...], spark: [[t, rx, tx], ...] }

  // Device type -> Phosphor icon name mapping
  const DEVICE_ICONS = {
    'laptop': 'ph-laptop', 'phone': 'ph-device-mobile', 'tablet': 'ph-device-tablet',
    'tv': 'ph-television', 'speaker': 'ph-speaker-high', 'camera': 'ph-security-camera',
    'gaming': 'ph-game-controller', 'iot': 'ph-plug', 'hub': 'ph-circles-three-plus',
    'desktop': 'ph-desktop', 'nas': 'ph-hard-drives', 'printer': 'ph-printer',
    'networking': 'ph-router', 'vr': 'ph-vr-glasses', 'thermostat': 'ph-thermometer-simple',
    'unknown': 'ph-question',
  };

  // Category labels
  const DEVICE_CATEGORIES = { 'iot': 'IoT', 'media': 'Media', 'computing': 'Computing', 'gaming': 'Gaming', 'networking': 'Networking', 'other': 'Other' };

  const CLIENT_DEFS = [
    // WiFi 2.4 GHz (6 clients) - IoT, older devices
    { name: 'Ring Doorbell', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Gateway', rxBase: 1800, txBase: 4500, rssiBase: -62, devType: 'camera', category: 'iot' },
    { name: 'Nest Thermostat', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Gateway', rxBase: 200, txBase: 100, rssiBase: -55, devType: 'thermostat', category: 'iot' },
    { name: 'Echo Dot', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Gateway', rxBase: 3500, txBase: 800, rssiBase: -58, devType: 'speaker', category: 'media' },
    { name: 'Smart Plug 1', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Satellite-1', rxBase: 80, txBase: 40, rssiBase: -70, devType: 'iot', category: 'iot' },
    { name: 'Smart Plug 2', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Satellite-1', rxBase: 80, txBase: 40, rssiBase: -72, devType: 'iot', category: 'iot' },
    { name: 'Old iPad', type: 'wifi', band: '2.4 GHz', wifi_std: 'WiFi 4', channel: 6, ap: 'Gateway', rxBase: 6000, txBase: 1500, rssiBase: -60, devType: 'tablet', category: 'computing' },
    // WiFi 5 GHz (10 clients) - main devices
    { name: 'DL-MacBook Pro', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 6', channel: 36, ap: 'Gateway', rxBase: 45000, txBase: 22000, rssiBase: -42, devType: 'laptop', category: 'computing' },
    { name: 'Living Room TV', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 5', channel: 36, ap: 'Gateway', rxBase: 55000, txBase: 2000, rssiBase: -45, devType: 'tv', category: 'media' },
    { name: 'iPhone 15 Pro', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 6', channel: 36, ap: 'Gateway', rxBase: 28000, txBase: 9000, rssiBase: -38, devType: 'phone', category: 'computing' },
    { name: 'Samsung Galaxy S24', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 6', channel: 36, ap: 'Satellite-1', rxBase: 22000, txBase: 7000, rssiBase: -48, devType: 'phone', category: 'computing' },
    { name: 'iPad Pro 12.9', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 6', channel: 36, ap: 'Gateway', rxBase: 35000, txBase: 12000, rssiBase: -40, devType: 'tablet', category: 'computing' },
    { name: 'Bedroom TV', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 5', channel: 100, ap: 'Satellite-1', rxBase: 48000, txBase: 1500, rssiBase: -52, devType: 'tv', category: 'media' },
    { name: 'Kids Chromebook', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 5', channel: 100, ap: 'Satellite-1', rxBase: 15000, txBase: 5000, rssiBase: -55, devType: 'laptop', category: 'computing' },
    { name: 'Work Laptop', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 6', channel: 36, ap: 'Gateway', rxBase: 40000, txBase: 18000, rssiBase: -44, devType: 'laptop', category: 'computing' },
    { name: 'Sonos Speaker', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 5', channel: 100, ap: 'Satellite-1', rxBase: 8000, txBase: 600, rssiBase: -50, devType: 'speaker', category: 'media' },
    { name: 'Security Camera', type: 'wifi', band: '5 GHz', wifi_std: 'WiFi 5', channel: 100, ap: 'Gateway', rxBase: 2500, txBase: 15000, rssiBase: -58, devType: 'camera', category: 'iot' },
    // WiFi 6 GHz (4 clients) - newest devices
    { name: 'DL-iPhone 16 Pro', type: 'wifi', band: '6 GHz', wifi_std: 'WiFi 6E', channel: 5, ap: 'Gateway', rxBase: 55000, txBase: 22000, rssiBase: -35, devType: 'phone', category: 'computing' },
    { name: 'M4 MacBook Air', type: 'wifi', band: '6 GHz', wifi_std: 'WiFi 6E', channel: 5, ap: 'Gateway', rxBase: 70000, txBase: 30000, rssiBase: -32, devType: 'laptop', category: 'computing' },
    { name: 'Galaxy Tab S9', type: 'wifi', band: '6 GHz', wifi_std: 'WiFi 6E', channel: 5, ap: 'Satellite-1', rxBase: 35000, txBase: 14000, rssiBase: -40, devType: 'tablet', category: 'computing' },
    { name: 'Quest 3', type: 'wifi', band: '6 GHz', wifi_std: 'WiFi 6E', channel: 5, ap: 'Gateway', rxBase: 45000, txBase: 18000, rssiBase: -38, devType: 'vr', category: 'gaming' },
    // Wired (10 clients)
    { name: 'Office Desktop', type: 'wired', iface: 'lan1', link: '10G', duplex: 'Full', rxBase: 35000, txBase: 15000, devType: 'desktop', category: 'computing' },
    { name: 'Synology NAS', type: 'wired', iface: 'lan1', link: '10G', duplex: 'Full', rxBase: 8000, txBase: 25000, devType: 'nas', category: 'networking' },
    { name: 'PS5', type: 'wired', iface: 'lan2', link: '1G', duplex: 'Full', rxBase: 15000, txBase: 3000, devType: 'gaming', category: 'gaming' },
    { name: 'Xbox Series X', type: 'wired', iface: 'lan2', link: '1G', duplex: 'Full', rxBase: 12000, txBase: 2500, devType: 'gaming', category: 'gaming' },
    { name: 'Philips Hue Bridge', type: 'wired', iface: 'lan3', link: '100M', duplex: 'Full', rxBase: 15, txBase: 30, devType: 'hub', category: 'iot' },
    { name: 'Printer', type: 'wired', iface: 'lan3', link: '100M', duplex: 'Full', rxBase: 50, txBase: 120, devType: 'printer', category: 'other' },
    { name: 'UniFi Switch', type: 'wired', iface: 'lan4', link: '1G', duplex: 'Full', rxBase: 6000, txBase: 6000, devType: 'switch', category: 'networking' },
    { name: 'Raspberry Pi', type: 'wired', iface: 'lan4', link: '1G', duplex: 'Full', rxBase: 400, txBase: 200, devType: 'hub', category: 'iot' },
    { name: 'Smart TV (Wired)', type: 'wired', iface: 'lan2', link: '1G', duplex: 'Full', rxBase: 20000, txBase: 500, devType: 'tv', category: 'media' },
    { name: 'Home Assistant', type: 'wired', iface: 'lan3', link: '1G', duplex: 'Full', rxBase: 800, txBase: 400, devType: 'hub', category: 'iot' },
  ];

  function initClients() {
    CLIENT_DEFS.forEach((def, idx) => {
      const mac = 'A4:B1:C2:' + String(idx >> 4).padStart(2, '0') + ':' + String(idx & 0xf).padStart(2, '0') + ':' + String(Math.floor(Math.random() * 256)).toString(16).padStart(2, '0').toUpperCase();
      const client = {
        id: mac, name: def.name, type: def.type,
        band: def.band || null, channel: def.channel || null,
        wifi_standard: def.wifi_std || null, connected_to: def.ap || null,
        iface: def.iface || null, link_speed: def.link || null, duplex: def.duplex || null,
        devType: def.devType || 'unknown', category: def.category || 'other',
        daily_rx_bytes: 0, daily_tx_bytes: 0, // reset at midnight
        // Current values (drifted each tick)
        rx_kbps: def.rxBase, tx_kbps: def.txBase,
        rssi: def.rssiBase || 0, phy_rate: def.type === 'wifi' ? (def.rssiBase > -45 ? 1200 : def.rssiBase > -55 ? 600 : 144) : 0,
        airtime_pct: def.type === 'wifi' ? 5 : 0,
        retrans_pct: def.type === 'wifi' ? 2 : 0,
        qoe_score: def.type === 'wifi' ? 85 : 0,
      };
      _clients.push(client);
      _clientHistory[mac] = { full: [], spark: [] };
    });
  }

  function tickClients(timestamp) {
    _clients.forEach(c => {
      // Throughput drift
      const baseDef = CLIENT_DEFS.find(d => d.name === c.name);
      const rxCeil = baseDef ? baseDef.rxBase * 3 : 50000;
      const txCeil = baseDef ? baseDef.txBase * 3 : 20000;
      c.rx_kbps = drift(c.rx_kbps, 0, rxCeil, c.rx_kbps * 0.25 + 50);
      c.tx_kbps = drift(c.tx_kbps, 0, txCeil, c.tx_kbps * 0.25 + 25);
      // Accumulate daily throughput (kbps * 10sec / 8 = kbytes)
      c.daily_rx_bytes += c.rx_kbps * CLIENT_TICK_INTERVAL * 125; // kbps -> bytes/s * interval
      c.daily_tx_bytes += c.tx_kbps * CLIENT_TICK_INTERVAL * 125;

      if (c.type === 'wifi') {
        // RSSI: slow drift with occasional dips
        c.rssi = drift(c.rssi, -90, -25, 1.5);
        if (Math.random() < 0.005) c.rssi = drift(c.rssi, -90, -25, 8); // occasional deep dip
        // PHY rate correlates with RSSI
        c.phy_rate = c.rssi > -40 ? drift(c.phy_rate, 800, 2400, 50) :
                     c.rssi > -50 ? drift(c.phy_rate, 400, 1200, 30) :
                     c.rssi > -60 ? drift(c.phy_rate, 100, 600, 20) :
                     drift(c.phy_rate, 20, 300, 10);
        // Airtime
        c.airtime_pct = drift(c.airtime_pct, 0.1, 25, 1);
        // Retransmissions: higher when signal is poor
        const retransBase = c.rssi < -65 ? 8 : c.rssi < -55 ? 4 : 1;
        c.retrans_pct = drift(c.retrans_pct, 0, 30, retransBase * 0.5);
        if (Math.random() < 0.01) c.retrans_pct = drift(c.retrans_pct, 0, 30, 5); // spike
        // QoE: inverse of retransmissions + signal quality
        const signalFactor = Math.max(0, (c.rssi + 90) / 60); // 0-1
        const retransFactor = Math.max(0, 1 - c.retrans_pct / 20);
        c.qoe_score = drift(c.qoe_score, 10, 100, 2);
        c.qoe_score = c.qoe_score * 0.7 + (signalFactor * retransFactor * 100) * 0.3;
        c.qoe_score = Math.max(10, Math.min(100, c.qoe_score));
      }

      // Push to history
      const hist = _clientHistory[c.id];
      const row = c.type === 'wifi'
        ? [timestamp, c.rx_kbps, c.tx_kbps, c.rssi, c.phy_rate, c.airtime_pct, c.retrans_pct, c.qoe_score]
        : [timestamp, c.rx_kbps, c.tx_kbps, 0, 0, 0, 0, 0];
      hist.full.push(row);
      if (hist.full.length > CLIENT_MAX_HISTORY) hist.full.shift();
      hist.spark.push([timestamp, c.rx_kbps, c.tx_kbps]);
      if (hist.spark.length > CLIENT_SPARKLINE_PTS) hist.spark.shift();
    });
  }

  function initClientHistory() {
    const now = Math.floor(Date.now() / 1000);
    initClients();
    console.time('MockEngine: generating 24h client history');
    for (let i = CLIENT_MAX_HISTORY; i > 0; i--) {
      tickClients(now - (i * CLIENT_TICK_INTERVAL));
    }
    console.timeEnd('MockEngine: generating 24h client history');
  }

  function getClientList() {
    return _clients.map(c => ({
      id: c.id, name: c.name, type: c.type, band: c.band,
      channel: c.channel, wifi_standard: c.wifi_standard,
      connected_to: c.connected_to, iface: c.iface,
      link_speed: c.link_speed, duplex: c.duplex,
      devType: c.devType, category: c.category,
      rx_kbps: c.rx_kbps, tx_kbps: c.tx_kbps,
      rssi: c.type === 'wifi' ? c.rssi : null,
      qoe_score: c.type === 'wifi' ? c.qoe_score : null,
      airtime_pct: c.type === 'wifi' ? c.airtime_pct : null,
      daily_rx_bytes: c.daily_rx_bytes, daily_tx_bytes: c.daily_tx_bytes,
    }));
  }

  function getClientSparklines() {
    const out = {};
    _clients.forEach(c => { out[c.id] = _clientHistory[c.id].spark.map(r => r.slice()); });
    return out;
  }

  function getClientHistory(clientId, afterSecs, points) {
    const hist = _clientHistory[clientId];
    if (!hist) return null;
    const cutoff = Math.floor(Date.now() / 1000) - afterSecs;
    let filtered = hist.full.filter(r => r[0] >= cutoff);
    if (filtered.length === 0) filtered = hist.full.slice(-10);
    if (filtered.length > points && points > 0) {
      const step = filtered.length / points;
      const sampled = [];
      for (let i = 0; i < points; i++) sampled.push(filtered[Math.floor(i * step)]);
      filtered = sampled;
    }
    const client = _clients.find(c => c.id === clientId);
    const labels = client && client.type === 'wifi'
      ? ['time', 'rx_kbps', 'tx_kbps', 'rssi', 'phy_rate', 'airtime_pct', 'retrans_pct', 'qoe_score']
      : ['time', 'rx_kbps', 'tx_kbps', 'rssi', 'phy_rate', 'airtime_pct', 'retrans_pct', 'qoe_score'];
    return { labels, data: filtered.map(r => r.slice()) };
  }

  // Override init to also generate client data
  const _origInit = init;
  function initAll() {
    _origInit();
    initClientHistory();
  }

  // Override tick to also tick clients (every 5th system tick = 10 sec)
  let _clientTickCounter = 0;
  function tickAll() {
    tick();
    pushAll(Math.floor(Date.now() / 1000));
    _clientTickCounter++;
    if (_clientTickCounter >= 5) { // every 10 sec (5 x 2s)
      _clientTickCounter = 0;
      tickClients(Math.floor(Date.now() / 1000));
    }
  }

  return {
    init: initAll, tick: tickAll, getData,
    getClientList, getClientSparklines, getClientHistory
  };
})();
