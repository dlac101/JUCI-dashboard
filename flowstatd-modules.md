# flowstatd Module Documentation

> **REMINDER**: Update this documentation when module APIs or behavior change.
> Last comprehensive update: 2026-03-08

> **API Synchronization Requirement**: When ubus API methods or output formats change in `fsd_ubus.c`, the following files MUST be updated to match:
> - `files/fsd-cli.uc` - ucode script that formats ubus output into tables
> - `files/fsd.sh` - shell helpers that wrap ubus calls
>
> These files directly consume ubus JSON output, so any field name changes, new methods, or structural changes will break them if not synchronized.

This document provides detailed documentation for each flowstatd module. For architecture overview, see `flowstatd.md`.

**Source Location:** `shared/smartrg/flowstatd/src/` (relative to smartos root)

---

## Table of Contents

1. [Core Module](#core-module)
2. [Types Module](#types-module)
3. [Configuration Module](#configuration-module)
4. [Tracker Module](#tracker-module)
5. [Statistics Module](#statistics-module)
6. [Collector Module](#collector-module)
7. [Neighbor Module](#neighbor-module)
8. [Resolver Module](#resolver-module)
9. [Classification Module](#classification-module)
10. [Risk Module](#risk-module)
11. [Idle Module](#idle-module)
12. [Persistence Module](#persistence-module)
13. [ubus Module](#ubus-module)
14. [Redis Module](#redis-module)
15. [Shell Helpers Module](#shell-helpers-module)

---

## Core Module

**Files:** `fsd_core.c`

### Purpose

Main entry point containing initialization sequence, event loop setup, timer management, and signal handling.

### Key Functions

| Function | Purpose |
|----------|---------|
| `main()` | Entry point, CLI parsing, init sequence |
| `fsd_init()` | Orchestrates module initialization |
| `fsd_cleanup()` | Orchestrates graceful shutdown |
| `rotation_timer_cb()` | Time-series bucket rotation |
| `stats_timer_cb()` | Rate recalculation and summary logging |
| `persist_checkpoint_timer_cb()` | Database save + WAL checkpoint |
| `inactive_flow_timer_cb()` | Stale flow cleanup |
| `fdb_refresh_timer_cb()` | Refresh bridge FDB cache |
| `category_flush_timer_cb()` | Flush hourly category accumulators, prune old data |
| `clock_check_timer_cb()` | Detect clock jumps, repair timestamps |
| `signal_handler()` | SIGTERM/SIGINT handling |
| `timer_set_interval()` | Dynamically adjust timer interval |
| `timer_get_interval()` | Get current timer interval |
| `timer_foreach()` | Iterate all timers |
| `core_get_start_time()` | Get daemon start timestamp |

### Initialization Order

The initialization order in `init_modules()` is critical due to module dependencies:

```c
config_load()            // Must be first - provides settings for other modules
tracker_init()           // Must precede collector - stores incoming data
idle_init()              // After tracker - tracks user activity (if enabled)
persist_init()           // After tracker - opens database
persist_load_all()       // Restores saved state from database
persist_migrate_legacy() // Imports old JSON format if present
collector_init()         // After persist - feeds data into tracker
resolver_init()          // After tracker - resolves hostnames
classifi_init()          // After tracker - classifies flows
neighbor_init()          // After tracker - links hosts to devices
redis_init()             // Optional - publishes data
ubus_server_init()       // Last - exposes API (called after init_modules)
```

### Timer Configuration

Timers are managed via a `timer_config_t` array indexed by `timer_index_t` enum:

```c
typedef enum {
    TIMER_ROTATION = 0,
    TIMER_STATS,
    TIMER_PERSIST_CHECKPOINT,
    TIMER_NEIGHBOR_REFRESH,
    TIMER_INACTIVE_FLOW,
    TIMER_REDIS_PUBLISH,
    TIMER_CLOCK_CHECK,
    TIMER_FDB_REFRESH,
    TIMER_MAX
} timer_index_t;
```

| Timer | Default Interval | Callback | Purpose |
|-------|------------------|----------|---------|
| rotation | 60 sec | `rotation_timer_cb()` | Rotate time-series buckets |
| stats | 60 sec | `stats_timer_cb()` | Log collector/tracker summary |
| persist_checkpoint | 30 min | `persist_checkpoint_timer_cb()` | Save all + checkpoint WAL |
| neighbor | 30 sec | `neighbor_refresh_timer_cb()` | Refresh neighbor table |
| inactive | 10 sec | `inactive_flow_timer_cb()` | Clean up stale flows |
| redis_publish | 60 sec | `redis_publish_timer_cb()` | Publish device stats to Redis |
| clock_check | 5 sec | `clock_check_timer_cb()` | Detect clock jumps |
| fdb_refresh | 5 min | `fdb_refresh_timer_cb()` | Refresh bridge FDB cache |

The `category_flush_timer` is managed separately (not in the array). It aligns to hour boundaries via `ms_until_next_hour()` and calls `persist_flush_category_hours()`, `persist_prune_category_hours()`, and `persist_reset_stale_categories()`.

### Shutdown Sequence

On SIGTERM/SIGINT:
1. `uloop_end()` - Exit event loop
2. `persist_save_all()` - Write all dirty data to database
3. `persist_checkpoint()` - Flush WAL to main database
4. Module cleanup in reverse init order

---

## Types Module

**Files:** `fsd_types.h`

### Purpose

Core type definitions, error codes, logging macros, and monotonic time helpers used throughout the codebase.

### Monotonic Time Helpers

Flowstatd uses CLOCK_MONOTONIC for elapsed-time calculations to be immune to clock jumps:

```c
/* Get monotonic time in seconds (clock-jump-safe) */
static inline uint64_t monotonic_sec(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec;
}

/* Convert monotonic timestamp to wall clock for display */
static inline time_t mono_to_wall(uint64_t mono)
{
    if (mono == 0)
        return 0;
    return time(NULL) - (time_t)(monotonic_sec() - mono);
}
```

**Usage Guidelines**:
- Use `monotonic_sec()` for all elapsed-time calculations (rate computation, bucket rotation, active time tracking)
- Use `mono_to_wall()` only for display purposes (converting timestamps for user-facing output)
- Use wall clock (`time(NULL)`) only for timestamps stored in the database for display

### Error Codes

Error codes are `#define` constants (not an enum):

```c
#define FSD_OK           0
#define FSD_ERR_INVAL   -1
#define FSD_ERR_NOMEM   -2
#define FSD_ERR_NOTFOUND -3
#define FSD_ERR_EXISTS  -4
#define FSD_ERR_IO      -5
#define FSD_ERR_TIMEOUT -6
#define FSD_ERR_PARSE   -7
#define FSD_ERR_SOCKET  -8
#define FSD_ERR_INIT    -9
#define FSD_ERR_BUSY    -10
```

### Logging Macros

```c
#define log_err(fmt, ...)      // Error level
#define log_warning(fmt, ...)  // Warning level
#define log_notice(fmt, ...)   // Notice level
#define log_info(fmt, ...)     // Info level
#define log_debug(fmt, ...)    // Debug level (compile-time guarded with __builtin_expect)
```

All log macros output to stderr with optional timestamps (controlled by `g_log_timestamps`). Log level is checked at runtime against `g_log_level`.

### Common Types

```c
#define MAX_CATEGORIES      32
#define MAX_CATEGORY_NAME   64
#define MAX_HOSTNAME        256

typedef struct flow_key {
    uint8_t family;              // AF_INET or AF_INET6
    uint8_t protocol;            // IPPROTO_TCP, IPPROTO_UDP, etc
    uint16_t src_port;
    uint16_t dst_port;
    union { struct in_addr ipv4; struct in6_addr ipv6; } src;
    union { struct in_addr ipv4; struct in6_addr ipv6; } dst;
} flow_key_t;

typedef struct host_key {
    uint8_t family;
    union { struct in_addr ipv4; struct in6_addr ipv6; } addr;
} host_key_t;

typedef struct device_key {
    struct ether_addr mac;
} device_key_t;
```

---

## Configuration Module

**Files:** `fsd_config.c`, `fsd_config.h`

### Purpose

Load and manage daemon configuration from UCI (OpenWrt) or configuration file (Linux).

### Key Functions

| Function | Purpose |
|----------|---------|
| `config_init_defaults()` | Initialize defaults |
| `config_load()` | Load configuration (UCI on OpenWrt, file on Linux) |
| `config_save()` | Save configuration |
| `config_reload()` | Reload configuration without restart |
| `config_get_global()` | Get pointer to global config |
| `config_add_network_id()` | Add network ID subnet |
| `config_find_network_by_name()` | Find network ID by name |
| `config_find_network_for_addr()` | Find network name for IP address |

### Configuration Structure

```c
typedef struct fsd_config {
    int log_level;                         // 0-7 (LOG_EMERG to LOG_DEBUG), default 6

    bool enable_collection;                // default true
    bool enable_dns_resolution;            // default true
    bool enable_classification;            // future use, default false

    // Time bucket intervals (seconds, non-configurable)
    uint32_t interval_5min;                // 300
    uint32_t interval_15min;               // 900
    uint32_t interval_hour;                // 3600
    uint32_t interval_day;                 // 86400

    // Bucket counts (non-configurable)
    uint8_t buckets_5min;                  // 3
    uint8_t buckets_15min;                 // 4
    uint8_t buckets_hour;                  // 24
    uint8_t buckets_day;                   // 7

    // Configurable intervals
    uint32_t rotation_interval;            // default 60
    uint32_t stats_interval;               // default 300 (0 = disabled)
    uint32_t conntrack_poll_interval;      // default 30 (0 = disabled)
    uint32_t persist_checkpoint_interval;  // default 1800

    // Redis
    bool enable_redis;                     // default false
    char redis_server[256];                // default "127.0.0.1"
    int redis_port;                        // default 6379
    char redis_password[256];              // default ""

    // Network IDs (for filtering, populated from UCI)
    network_id_t network_ids[MAX_NETWORK_IDS];  // MAX_NETWORK_IDS = 16
    int network_id_count;

    // Persistence
    char persist_path[256];

    // Idle detection
    bool enable_idle_detection;            // default true
    uint32_t idle_timeout;                 // seconds, default 120
    uint32_t idle_rate_threshold;          // bytes/sec, default 12500 (100 Kbps)
    uint32_t idle_flow_rate_threshold;     // per-flow bytes/sec, default 1250 (10 Kbps)

    // Device expiry
    uint32_t device_expire_days;           // default 30 (0 = never)

    // Category history retention
    uint32_t category_history_days;        // default 7 (0 = disabled)
} fsd_config_t;
```

The `network_id_t` type maps subnets to names:

```c
typedef struct network_id {
    char name[MAX_NETWORK_NAME_LEN];     // MAX_NETWORK_NAME_LEN = 32
    uint8_t family;
    union {
        struct { struct in_addr addr; uint8_t prefix_len; } ipv4;
        struct { struct in6_addr addr; uint8_t prefix_len; } ipv6;
    };
} network_id_t;
```

### UCI Loading (OpenWrt)

Options are loaded from section type `main` in `/etc/config/flowstatd`:

```c
if ((value = uci_get_option_string(s, "log_level")) != NULL)
    cfg->log_level = atoi(value);

if ((value = uci_get_option_string(s, "enable_collection")) != NULL)
    cfg->enable_collection = (strcmp(value, "1") == 0 || strcmp(value, "true") == 0);

if ((value = uci_get_option_string(s, "conntrack_poll_interval")) != NULL)
    cfg->conntrack_poll_interval = atoi(value);
// ... etc
```

### Network ID Filtering

The `network_id` list determines which interfaces are monitored. Flows on other interfaces are ignored by the collector.

---

## Tracker Module

**Files:** `fsd_tracker.c`, `fsd_tracker.h`

### Purpose

Core data storage using AVL trees for flows, hosts, and devices. Implements reference counting and reader-writer locking.

### Data Structures

#### AVL Trees

Three global AVL trees indexed by their respective keys:

```c
static struct avl_tree flow_tree;   // Indexed by flow_key_t
static struct avl_tree host_tree;   // Indexed by struct in_addr
static struct avl_tree device_tree; // Indexed by device_key_t (MAC)
```

#### Locking Strategy

```c
static pthread_rwlock_t tracker_lock;  // Global tree lock

// Per-device lock for fine-grained category updates
pthread_rwlock_t device->lock;
```

Read operations acquire read lock; modifications acquire write lock.

### Key Functions

#### Flow Management

| Function | Purpose |
|----------|---------|
| `flow_create()` | Allocate and insert new flow |
| `flow_find()` | Lookup flow by key |
| `flow_update()` | Update flow statistics |
| `flow_destroy()` | Mark flow for cleanup |
| `flow_hold()` | Increment reference count |
| `flow_put()` | Decrement refcount, free if zero |
| `flow_foreach()` | Iterate all flows |

#### Host Management

| Function | Purpose |
|----------|---------|
| `host_create()` | Allocate and insert new host |
| `host_find()` | Lookup host by IP |
| `host_find_or_create()` | Get existing or create new |
| `host_update_from_flow()` | Aggregate flow stats to host |
| `host_link_device()` | Associate host with device |
| `host_hold()` / `host_put()` | Reference counting |
| `host_foreach()` | Iterate all hosts |

#### Device Management

| Function | Purpose |
|----------|---------|
| `device_create()` | Allocate and insert new device |
| `device_find()` | Lookup device by MAC |
| `device_add_host()` / `device_remove_host()` | Link/unlink host to device |
| `device_update_from_host()` | Aggregate host stats to device |
| `device_update_category_active_times()` | Update category active time (union semantics: any host active) |
| `device_delete()` | Delete device and all associated data |
| `device_reset_counters()` | Reset device statistics |
| `device_hold()` / `device_put()` | Reference counting |
| `device_foreach()` | Iterate all devices |

### Reference Counting

All tracked objects use atomic reference counting:

```c
flow_t *flow = flow_find(&key);
if (flow) {
    flow_hold(flow);       // Increment refcount
    // ... use flow ...
    flow_put(flow);        // Decrement, may free
}
```

Objects are freed when refcount reaches zero. Parent links (flow->host, host->device) also hold references.

### Statistics Aggregation

Flow updates propagate through the hierarchy:

```c
flow_update(flow, rx, tx, ...);
    |
    +-> host_update_from_flow(flow->host, &delta);
            |
            +-> device_update_from_host(host->device, &delta);
```

The delta (difference from previous values) is passed up, not cumulative totals.

### Device Fields for Idle Detection

```c
struct device {
    // ... existing fields ...
    uint64_t last_user_activity;   // Monotonic timestamp of last non-background traffic
};
```

**Note**: Category statistics are tracked only at the device level, not per-host. The `device->category_list` linked list stores per-category bandwidth breakdown. The `categories_reset_at` field tracks when the category list was last rebuilt from `category_hours`.

### Cleanup

Inactive flows are periodically cleaned by `inactive_flow_timer_cb()` which calls `tracker_check_inactive_flows()`:

| Function | Purpose |
|----------|---------|
| `tracker_check_inactive_flows()` | Scan and remove stale flows |

The cleanup process:

1. Iterate flows with `flow_foreach()`
2. Check `last_seen` against `inactive_timeout`
3. Call `flow_destroy()` on stale flows
4. Flows marked `destroyed` are removed on next iteration

### Destroyed Flows

Recently destroyed flows are kept in a circular buffer for diagnostics and historical analysis:

| Function | Purpose |
|----------|---------|
| `tracker_foreach_destroyed_flow()` | Iterate over destroyed flows |
| `tracker_destroyed_flow_count()` | Get count of stored destroyed flows |

The `destroyed_flow_t` structure preserves complete flow information including:
- 5-tuple key and final statistics
- Duration and timestamps (created_at, destroyed_at)
- Full classification data (master_protocol, app_protocol, category)
- Protocol stack, protocol_by_ip hint, and JA4 client fingerprint
- Risk bitmask and score
- TCP fingerprint and OS hint
- Source and destination hostnames

---

## Statistics Module

**Files:** `fsd_stats.c`, `fsd_stats.h`

### Purpose

Statistics calculation including rate computation with EMA smoothing and time-series circular buffers.

### Key Functions

| Function | Purpose |
|----------|---------|
| `stats_init()` | Initialize stats structure |
| `stats_update()` | Update with new absolute values |
| `stats_add()` | Aggregate stats (for propagation) |
| `stats_reset()` | Reset statistics to zero |
| `stats_update_active_time()` | Update active time based on activity state |
| `time_series_create()` | Allocate time-series |
| `time_series_destroy()` | Free time-series |
| `time_series_update()` | Add data to current bucket |
| `time_series_rotate()` | Advance buckets on interval |
| `time_series_get_bucket()` | Access specific bucket |
| `time_series_get_current()` | Get current bucket for an interval |
| `time_series_sync_current_idx()` | Restore circular buffer state from persisted timestamps |
| `time_series_usage_summarize()` | Compute `device_usage_summary_t` from time-series |
| `category_stats_find()` | Find category stats in list by triple |
| `category_stats_find_or_create()` | Find or create category stats |
| `category_stats_remove()` / `category_stats_remove_all()` | Remove category stats |
| `category_stats_update()` | Update category stats with delta + risk |
| `category_counters_add_delta()` | Add flow delta to category counters |
| `category_counters_update_active_time()` | Update category active time tracking |
| `category_counters_hour_reset()` | Reset hourly accumulators after flush |

### Rate Calculation

Uses delta-based calculation with averaging smoothing. Rates are only calculated after >= 6 seconds of accumulation to smooth hardware offload bursts:

```c
static inline uint64_t
rate_smooth(uint64_t old_rate, uint64_t new_rate, bool has_delta)
{
    if (!has_delta)
        return 0;
    if (old_rate > 0)
        return (old_rate + new_rate) / 2;
    return new_rate;
}

static void
rates_calculate(fsd_stats_t *stats, uint64_t elapsed_sec)
{
    if (elapsed_sec == 0 || elapsed_sec > 3600) {
        // Reset deltas, no valid rate
        stats->rx_bytes_delta = 0;
        stats->tx_bytes_delta = 0;
        return;
    }

    uint64_t new_rx_bps = (stats->rx_bytes_delta / elapsed_sec) * 8;
    uint64_t new_tx_bps = (stats->tx_bytes_delta / elapsed_sec) * 8;

    stats->rx_bps = rate_smooth(stats->rx_bps, new_rx_bps, stats->rx_bytes_delta > 0);
    stats->tx_bps = rate_smooth(stats->tx_bps, new_tx_bps, stats->tx_bytes_delta > 0);

    // Reset deltas for next window
    stats->rx_bytes_delta = 0;
    stats->tx_bytes_delta = 0;
}
```

Rate smoothing uses simple averaging `(old + new) / 2` when both have data. If no delta activity in a direction, rate drops to 0. Stale rates (> 3600 sec elapsed) are reset without calculation.

### Time Series Structure

```c
struct time_series {
    uint8_t current_idx[INTERVAL_MAX];       // Current bucket index per interval
    time_bucket_t *buckets[INTERVAL_MAX];    // Dynamically allocated arrays
    uint64_t last_rotation[INTERVAL_MAX];    // Monotonic timestamps
};

struct time_bucket {
    time_t start_time;
    time_t end_time;
    fsd_stats_t stats;                       // Full stats struct
    uint32_t flow_count;
    bool valid;
};

typedef enum {
    INTERVAL_5MIN = 0,
    INTERVAL_15MIN,
    INTERVAL_HOUR,
    INTERVAL_DAY,
    INTERVAL_MAX
} interval_type_t;
```

### Device Usage Summary

Computed from device `total_history` for the `usage` object in ubus responses:

```c
struct device_usage_summary {
    struct usage_summary fifteen;        // 15-minute window
    struct usage_summary hour;           // 1-hour window
    struct usage_summary day;            // 1-day window
    struct usage_summary week;           // 1-week window
};

struct usage_summary {
    uint64_t rx_bytes;
    uint64_t tx_bytes;
};
```

Helper: `device_usage_summary_is_empty()` returns true if all fields are zero.

### Category Counters

Lightweight per-category tracking without time-series overhead. Hourly accumulators are flushed to `category_hours` DB table on hour boundaries:

```c
struct category_counters {
    uint64_t rx_bytes, tx_bytes;         // Cumulative lifetime
    uint64_t active_time_sec;            // Cumulative active time
    uint64_t last_active_check;          // Monotonic time
    uint64_t last_flow_update;           // Monotonic time
    bool is_currently_active;
    uint64_t rx_bytes_delta, tx_bytes_delta;  // Rate accumulator
    uint64_t first_delta_time;           // Monotonic time
    uint64_t rx_bps, tx_bps;             // Computed rates
    uint64_t hour_rx_bytes;              // Hourly accumulator (flushed to DB)
    uint64_t hour_tx_bytes;
    uint64_t hour_active_time_sec;
};
```

`CATEGORY_ACTIVE_WINDOW_SEC` = 10 seconds (grace period after last packet before category is marked inactive).

### Bucket Rotation

Called by `rotation_timer_cb()` periodically:

```c
void time_series_rotate(time_series_t *ts, time_t now)
{
    for (int i = 0; i < INTERVAL_MAX; i++) {
        uint32_t interval_sec = interval_configs[i].duration_sec;
        if (now - ts->last_rotation[i] >= interval_sec) {
            ts->current_idx[i] = (ts->current_idx[i] + 1) %
                                 interval_configs[i].num_buckets;
            memset(&ts->buckets[i][ts->current_idx[i]], 0,
                   sizeof(time_bucket_t));
            ts->buckets[i][ts->current_idx[i]].start_time = now;
            ts->last_rotation[i] = now;
        }
    }
}
```

### Bucket State Restoration

After loading buckets from the database, the circular buffer state must be restored to match the persisted timestamps:

```c
void time_series_sync_current_idx(time_series_t *ts, time_t wall_now);
```

This function scans all loaded buckets to find the most recent `start_time` for each interval type, then sets `current_idx` and `last_rotation` accordingly. Called by `persist_load_all()` after restoring bucket data to ensure new data accumulates in the correct bucket position.

---

## Collector Module

**Files:** `fsd_collector.c`, `fsd_collector.h`

### Purpose

Subscribe to netfilter conntrack events via netlink and feed flow data into the tracker.

### Key Functions

| Function | Purpose |
|----------|---------|
| `collector_init()` | Open netlink socket, subscribe to events |
| `collector_cleanup()` | Close socket |
| `collector_process()` | Process pending netlink messages |

### Netlink Subscription

Subscribes to conntrack event groups:

```c
struct nfnl_handle *nfnlh = nfnl_open();
struct nfct_handle *cth = nfct_open_nfnl(nfnlh, CONNTRACK);

nfct_callback_register(cth, NFCT_T_ALL, event_callback, NULL);

// Add socket fd to uloop
uloop_fd_add(&collector_fd, ULOOP_READ);
```

### Event Types

| Event | Handling |
|-------|----------|
| `NFCT_T_NEW` | Create new flow in tracker |
| `NFCT_T_UPDATE` | Update flow statistics |
| `NFCT_T_DESTROY` | Mark flow as destroyed |

### Counter Extraction

Conntrack provides counters for both directions (ORIG/REPLY):

```c
static int event_callback(enum nf_conntrack_msg_type type,
                          struct nf_conntrack *ct, void *data)
{
    // Get counter values
    uint64_t orig_bytes = nfct_get_attr_u64(ct, ATTR_ORIG_COUNTER_BYTES);
    uint64_t repl_bytes = nfct_get_attr_u64(ct, ATTR_REPL_COUNTER_BYTES);

    // Determine local IP (matches network_id interface)
    // RX = traffic TO local IP = REPL direction
    // TX = traffic FROM local IP = ORIG direction

    flow_update(flow, repl_bytes, orig_bytes, ...);
}
```

### First-Update Skip

The first UPDATE event after NEW may contain stale counters. Collector tracks `first_update_seen` flag per flow to skip the first update if counters seem invalid.

### Flow Filtering

Flows are filtered based on:
1. Protocol (TCP, UDP only by default)
2. Network interface matching configured `network_id`
3. Non-local addresses (skip localhost)

---

## Neighbor Module

**Files:** `fsd_neighbor.c`, `fsd_neighbor.h`

### Purpose

Monitor ARP/NDP neighbor table via netlink to associate IP addresses with MAC addresses, linking hosts to devices.

### Key Functions

| Function | Purpose |
|----------|---------|
| `neighbor_init()` | Open rtnetlink socket |
| `neighbor_cleanup()` | Close socket |
| `neighbor_refresh()` | Re-dump neighbor table |
| `neighbor_fdb_refresh()` | Refresh bridge FDB cache |
| `neighbor_get_stats()` | Get neighbor statistics |

### Netlink Messages

Subscribes to `RTMGRP_NEIGH` for neighbor table updates:

```c
struct rtnl_handle rth;
rtnl_open(&rth, RTMGRP_NEIGH);
```

### Event Handling

| Message | Handling |
|---------|----------|
| `RTM_NEWNEIGH` | Extract IP-MAC mapping, link host to device |
| `RTM_DELNEIGH` | Mark mapping as stale |

### Host-Device Linking

When a new neighbor appears:

```c
void neighbor_handle_new(struct in_addr *ip, uint8_t *mac)
{
    host_t *host = host_find(ip);
    if (!host)
        return;

    device_key_t key;
    memcpy(key.mac, mac, MAC_ADDR_LEN);

    device_t *device = device_find_or_create(&key);
    host_link_device(host, device);
}
```

### Bridge FDB Support

On bridged networks, also queries bridge FDB for MAC resolution when neighbor table lacks entries.

### Neighbor Statistics

Exposed via `neighbor_get_stats()` and included in `status` ubus method:

```c
typedef struct neighbor_stats {
    uint64_t neigh_new;       // New neighbor events
    uint64_t neigh_update;    // Neighbor update events
    uint64_t neigh_delete;    // Neighbor delete events
    uint64_t neigh_invalid;   // Invalid neighbor events
    uint64_t neigh_filtered;  // Events filtered (not matching network_id)
    uint64_t neigh_enobufs;   // Buffer overrun events (ENOBUFS)
    uint64_t recoveries;      // Recovery dumps after ENOBUFS
    uint64_t fdb_events;      // Bridge FDB events processed
} neighbor_stats_t;
```

---

## Resolver Module

**Files:** `fsd_resolver.c`, `fsd_resolver.h`

### Purpose

Async DNS resolution using c-ares library integrated with uloop.

### Key Functions

| Function | Purpose |
|----------|---------|
| `resolver_init()` | Initialize c-ares channel |
| `resolver_cleanup()` | Destroy channel |
| `resolver_query()` | Queue async PTR lookup (with priority) |
| `resolver_cache_lookup()` | Check hostname cache by IP |

### c-ares Integration

```c
static ares_channel channel;
static struct uloop_fd resolver_fd;

int resolver_init(void)
{
    ares_library_init(ARES_LIB_INIT_ALL);
    ares_init(&channel);

    // Get socket fd for uloop
    int fd = ares_getsock(channel, ...);
    resolver_fd.fd = fd;
    resolver_fd.cb = resolver_fd_cb;
    uloop_fd_add(&resolver_fd, ULOOP_READ);
}
```

### PTR Lookup

```c
void resolver_lookup(struct in_addr *addr, resolver_callback_t cb, void *data)
{
    struct in_addr reversed;
    // Reverse bytes for PTR lookup
    ares_gethostbyaddr(channel, &reversed, sizeof(reversed), AF_INET,
                       resolver_callback, request);
}

static void resolver_callback(void *arg, int status, int timeouts,
                              struct hostent *host)
{
    if (status == ARES_SUCCESS && host->h_name) {
        request->cb(request->addr, host->h_name, request->data);
    }
}
```

### Rate Limiting

Lookups are rate-limited to avoid DNS flooding. Recent lookups are cached to avoid duplicates.

---

## Classification Module

**Files:** `fsd_classifi.c`, `fsd_classifi.h`

### Purpose

Subscribe to DPI classification events from classifi daemon via ubus and cache results.

### Key Functions

| Function | Purpose |
|----------|---------|
| `classifi_init()` | Subscribe to ubus events |
| `classifi_cleanup()` | Unsubscribe |
| `classifi_check_flow()` | Check cache and apply classification to flow |
| `classifi_process_cache()` | Process pending classifications |
| `classifi_get_stats()` | Get classification statistics |

### ubus Event Subscription

```c
static struct ubus_event_handler classifi_handler = {
    .cb = classifi_event_cb,
};

int classifi_init(void)
{
    ubus_register_event_handler(ctx, &classifi_handler, "classifi.classified");
}
```

### Event Format

The classifi daemon sends ubus events with the following fields:

```json
{
    "interface": "br-lan",
    "src_ip": "192.168.1.100",
    "src_port": 12345,
    "dst_ip": "93.184.216.34",
    "dst_port": 443,
    "protocol": 6,
    "master_protocol": "TLS",
    "app_protocol": "Netflix",
    "category": "Video",
    "tcp_fingerprint": "Linux 4.x",
    "os_hint": "Linux",
    "protocol_stack": ["Ethernet", "IPv4", "TCP", "TLS", "Netflix"],
    "risk_score": 100,
    "risks": ["Self-signed Cert"],
    "stream_content": "video/mp4",
    "hostname": "www.netflix.com",
    "protocol_by_ip": "HTTPS",
    "ja4_client": "t13d1516h2_8daaf6152771_b0da82dd1658"
}
```

Required fields: `src_ip`, `dst_ip`, `src_port`, `dst_port`, `protocol`, `master_protocol`, `app_protocol`

Optional fields: All others (category, tcp_fingerprint, os_hint, protocol_stack, risk_score, risks, stream_content, hostname, protocol_by_ip, ja4_client)

### Cache Structure

```c
#define FSD_CLASSIFI_CACHE_MAX 1000
#define FSD_CLASSIFI_CACHE_TTL 20

typedef struct classifi_cache_entry {
    struct list_head list;
    time_t timestamp;
    classifi_cache_key_t key;
    char master_protocol[64];
    char app_protocol[64];
    char category[64];
    char tcp_fingerprint[64];
    char os_hint[32];
    char protocol_stack[8][64];
    int protocol_stack_count;
    uint64_t risk;                   // 64-bit risk bitmask
    uint16_t risk_score;             // Cumulative score
    char stream_content[64];
    char hostname[256];
    char protocol_by_ip[64];         // IP-based protocol hint
    char ja4_client[64];             // JA4 TLS client fingerprint
} classifi_cache_entry_t;

static LIST_HEAD(cache_list);
```

### Cache Statistics

```c
typedef struct classifi_stats {
    uint64_t events_received;        // Total classifi events received
    uint64_t cache_hits;             // Successful cache lookups
    uint64_t cache_misses;           // Failed cache lookups
    uint64_t cache_expired;          // Expired entries removed
    uint32_t cache_count;            // Current cache size
} classifi_stats_t;
```

Access via `classifi_get_stats()`.

### Bidirectional Matching

Classification events may arrive for either direction of a flow. The cache normalizes keys so lookups match regardless of direction:

```c
static void normalize_key(flow_key_t *key)
{
    if (memcmp(&key->src_addr, &key->dst_addr, 4) > 0) {
        // Swap src/dst to normalize
        swap(&key->src_addr, &key->dst_addr);
        swap(&key->src_port, &key->dst_port);
    }
}
```

### Device Category Update

When a flow is classified:

```c
void classifi_apply(flow_t *flow, const classifi_cache_entry_t *entry)
{
    safe_strncpy(flow->classification.master_protocol, entry->master_protocol, ...);
    safe_strncpy(flow->classification.app_protocol, entry->app_protocol, ...);
    safe_strncpy(flow->classification.category, entry->category, ...);
    // Copy fingerprint, os_hint, protocol_stack, risk, etc.
    flow->classification.classified = true;

    if (flow->host && flow->host->device) {
        device_update_category(flow->host->device, ...);
    }
}
```

### Risk Score Filtering

The classifi module only stores risk data for flows with risk_score >= HIGH (100). Lower-severity risks are filtered out to reduce noise:

```c
if (risk_score >= NDPI_SCORE_RISK_HIGH) {
    entry->risk = risk;
    entry->risk_score = risk_score;
}
```

---

## Risk Module

**Files:** `fsd_risk.c`, `fsd_risk.h`

### Purpose

Provides nDPI risk string table for converting between risk bit indices and human-readable names. Mirrors nDPI's `ndpi_risk2str()` output.

### Key Functions

| Function | Purpose |
|----------|---------|
| `risk_str_to_bit()` | Parse risk string to bit index (-1 if not found) |
| `risk_bit_to_str()` | Get risk string for bit index (NULL if invalid) |
| `risk_count_bits()` | Count number of bits set in risk mask |
| `risk_iterate()` | Iterate over set bits, calling callback for each |

### Risk Score Constants

```c
#define NDPI_MAX_RISK 64

#define NDPI_SCORE_RISK_LOW    10
#define NDPI_SCORE_RISK_MEDIUM 50
#define NDPI_SCORE_RISK_HIGH   100
#define NDPI_SCORE_RISK_SEVERE 150
```

### Risk Iteration

```c
typedef void (*risk_iter_cb)(int bit, const char *name, void *ctx);
void risk_iterate(uint64_t risk, risk_iter_cb cb, void *ctx);
```

Example usage in ubus output:

```c
static void add_risk_to_blob(int bit, const char *name, void *ctx)
{
    blobmsg_add_string(&b, NULL, name);
}

// In flow output handler:
if (flow->classification.risk_score > 0) {
    void *risk_tbl = blobmsg_open_table(&b, "risk");
    blobmsg_add_u32(&b, "score", flow->classification.risk_score);
    void *risks_arr = blobmsg_open_array(&b, "risks");
    risk_iterate(flow->classification.risk, add_risk_to_blob, NULL);
    blobmsg_close_array(&b, risks_arr);
    blobmsg_close_table(&b, risk_tbl);
}
```

### Risk Types Table

56 nDPI risk types (bit index -> name):

| Bit | Risk Name |
|-----|-----------|
| 1 | XSS Attack |
| 2 | SQL Injection |
| 3 | RCE Injection |
| 4 | Binary App Transfer |
| 5 | Known Proto on Non Std Port |
| 6 | Self-signed Cert |
| 7 | Obsolete TLS (v1.1 or older) |
| 8 | Weak TLS Cipher |
| 9 | TLS Cert Expired |
| 10 | TLS Cert Mismatch |
| 11 | HTTP Susp User-Agent |
| 12 | HTTP/TLS/QUIC Numeric Hostname/SNI |
| 13 | HTTP Susp URL |
| 14 | HTTP Susp Header |
| 15 | TLS (probably) Not Carrying HTTPS |
| 16 | Susp DGA Domain name |
| 17 | Malformed Packet |
| 18 | SSH Obsolete Cli Vers/Cipher |
| 19 | SSH Obsolete Ser Vers/Cipher |
| 20 | SMB Insecure Vers |
| 21 | Mismatching Protocol with server IP address |
| 22 | Unsafe Protocol |
| 23 | Susp DNS Traffic |
| 24 | Missing SNI TLS Extn |
| 25 | HTTP Susp Content |
| 26 | Risky ASN |
| 27 | Risky Domain Name |
| 28 | Malicious Fingerprint |
| 29 | Malicious SSL Cert/SHA1 Fingerp. |
| 30 | Desktop/File Sharing |
| 31 | Uncommon TLS ALPN |
| 32 | TLS Cert Validity Too Long |
| 33 | TLS Susp Extn |
| 34 | TLS Fatal Alert |
| 35 | Susp Entropy |
| 36 | Clear-Text Credentials |
| 37 | Large DNS Packet (512+ bytes) |
| 38 | Fragmented DNS Message |
| 39 | Non-Printable/Invalid Chars Detected |
| 40 | Possible Exploit Attempt |
| 41 | TLS Cert About To Expire |
| 42 | IDN Domain Name |
| 43 | Error Code |
| 44 | Crawler/Bot |
| 45 | Anonymous Subscriber |
| 46 | Unidirectional Traffic |
| 47 | HTTP Obsolete Server |
| 48 | Periodic Flow |
| 49 | Minor Issues |
| 50 | TCP Connection Issues |
| 51 | Unresolved hostname |
| 52 | ALPN/SNI Mismatch |
| 53 | Client Contacted A Malware Host |
| 54 | Binary File/Data Transfer (Attempt) |
| 55 | Probing Attempt |
| 56 | Obfuscated Traffic |

### Device Risk Aggregation

Devices track the highest risk seen across all flows:

```c
struct device {
    uint64_t max_risk;           // Highest risk mask seen
    uint16_t max_risk_score;     // Highest risk score seen
    time_t max_risk_updated;     // When max risk was updated
};
```

---

## Idle Module

**Files:** `fsd_idle.c`, `fsd_idle.h`

### Purpose

Detect idle hosts and network state by distinguishing user-initiated traffic from background infrastructure traffic.

### Key Functions

| Function | Purpose |
|----------|---------|
| `idle_init()` | Initialize module |
| `idle_cleanup()` | Cleanup |
| `idle_update_from_flow()` | Called on flow activity, updates idle timestamps |
| `idle_is_background_flow()` | Determine if flow is background traffic |
| `idle_device_status()` | Get idle status for specific device |
| `idle_global_status()` | Get global network idle status |

### Idle Status Structure

```c
typedef struct idle_status {
    bool is_idle;                // True if idle conditions met
    uint32_t idle_seconds;       // Seconds since last user activity
    time_t last_activity;        // Timestamp of last user traffic
    uint64_t current_rate_bps;   // Current rate (rx_bps + tx_bps)
} idle_status_t;
```

### Background Traffic Classification

A flow triggers user activity only if it passes all three filters:

1. **Category filter**: Category NOT in background categories list
2. **Protocol filter**: App protocol (or master protocol if no app) NOT in background protocols list
3. **Rate filter**: Flow rate >= `idle_flow_rate_threshold` (default 10 Kbps)

The filtering logic in `idle_is_background_flow()` for classified flows:
1. If `category_is_background(category)` -> background
2. If `protocol_is_background(app_protocol)` -> background
3. If no app_protocol and `protocol_is_background(master_protocol)` -> background
4. Otherwise -> user activity (subject to rate filter)

**Background categories:**
- Network, System, SoftwareUpdate, ConnCheck, Advertisement
- IoT-Scada, DataTransfer, Cloud, VPN, Web

**Background protocols:**
- DNS, NTP, DHCP, MDNS, SSDP, LLMNR, NETBIOS
- IGMP, ICMP, STUN, OCSP, NAT-PMP, DoH_DoT
- ApplePush, Crashlytics, iCloudPrivateRelay
- IPSec, WireGuard, Tailscale, OpenVPN (VPN keepalives)
- TLS, QUIC, HTTP (unclassified generic transport)

**Port-based fallback (for unclassified flows, UDP only):**
| Port | Protocol |
|------|----------|
| 53 | DNS |
| 123 | NTP |
| 67, 68 | DHCP |
| 5353 | mDNS |
| 1900 | SSDP |
| 5355 | LLMNR |
| 137, 138 | NetBIOS |

### Idle Detection Logic

A device (or the network) is considered idle when **both** conditions are true:

1. **Timeout expired**: Seconds since last user activity >= `idle_timeout` (default 120 sec)
2. **Rate below threshold**: Current bandwidth < `idle_rate_threshold` (default 12500 bytes/sec = 100 Kbps)

Status is computed via the internal `status_fill()` helper using monotonic timestamps:

```c
static void status_fill(idle_status_t *status, uint64_t last_activity, uint64_t rate_bps)
{
    uint64_t now = monotonic_sec();
    uint64_t idle_elapsed = (last_activity > 0) ? (now - last_activity) : 0;

    bool timeout_expired = (idle_elapsed >= cfg->idle_timeout);
    bool rate_below = (rate_bps < cfg->idle_rate_threshold);

    status->is_idle = timeout_expired && rate_below;
    status->idle_seconds = idle_elapsed;
    status->last_activity = mono_to_wall(last_activity);
    status->current_rate_bps = rate_bps;
}
```

### Integration with Tracker

Called from `flow_update_stats()` when idle detection is enabled:

```c
if (config_get_global()->enable_idle_detection)
    idle_update_from_flow(flow);
```

The `idle_update_from_flow()` function checks:
1. `idle_is_background_flow()` - skip background traffic
2. Flow rate >= `idle_flow_rate_threshold` - skip low-rate keepalives
3. If both pass, update `device->last_user_activity` and `global_last_user_activity`

---

## Persistence Module

**Files:** `fsd_persist.c`, `fsd_persist.h`

### Purpose

SQLite-based persistence for device statistics, categories, and time-series data. The database resides directly on flash storage with WAL journaling for crash recovery.

### Architecture

```
Database:  /FLASH/persist/flowstatd/flowstatd.db (flash, WAL mode)
```

### Path Constant

```c
#define FSD_PERSIST_DEFAULT_PATH   "/FLASH/persist/flowstatd/flowstatd.db"
```

### Key Functions

| Function | Purpose |
|----------|---------|
| `persist_init()` | Open database, create schema, prepare statements |
| `persist_cleanup()` | Final checkpoint, close DB |
| `persist_save_device()` | Write device to DB |
| `persist_save_category()` | Write category stats to DB |
| `persist_checkpoint()` | Flush WAL to main database |
| `persist_load_all()` | Restore state on startup |
| `persist_save_all()` | Write all dirty data |
| `persist_delete_device()` | Delete device and all associated data (CASCADE) |
| `persist_migrate_legacy()` | Import from old JSON format |
| `persist_is_dirty()` / `persist_mark_dirty()` | Check/set dirty state |
| `persist_get_stats()` | Get persistence statistics |
| `persist_flush_category_hours()` | Upsert hourly accumulators to `category_hours` table |
| `persist_prune_category_hours()` | Delete `category_hours` rows beyond retention window |
| `persist_rebuild_device_categories()` | Rebuild in-memory categories from `category_hours` |
| `persist_reset_stale_categories()` | Remove categories with no recent data |
| `persist_query_category_hours()` | Query `category_hours` with callback |

### Database Setup

```c
int persist_init(const char *user_db_path)
{
    // Ensure directory exists
    ensure_directory(db_dir);

    // Open database
    sqlite3_open(db_path, &db);

    // Use WAL mode for crash recovery
    db_exec("PRAGMA journal_mode=WAL;"
            "PRAGMA synchronous=NORMAL;"
            "PRAGMA foreign_keys=ON;");

    // Create schema (IF NOT EXISTS)
    db_exec(CREATE_DEVICES_SQL);
    db_exec(CREATE_CATEGORIES_SQL);
    db_exec(CREATE_BUCKETS_SQL);
}
```

### Write Operations

All writes go directly to the database:

```c
int persist_save_device(const device_t *device)
{
    // Uses prepared statements for efficiency
    sqlite3_bind_text(stmt_insert_device, 1, device->mac_str, ...);
    sqlite3_bind_int64(stmt_insert_device, 2, device->total_stats.rx_bytes);
    sqlite3_bind_text(stmt_insert_device, 3, device->tcp_fingerprint, ...);
    sqlite3_bind_text(stmt_insert_device, 4, device->os_hint, ...);
    // ... bind other columns ...

    sqlite3_step(stmt_insert_device);
    persist_mark_dirty();
}
```

### Checkpoint (WAL Flush)

Flushes WAL to main database:

```c
int persist_checkpoint(void)
{
    // Checkpoint the WAL
    sqlite3_wal_checkpoint_v2(db, NULL, SQLITE_CHECKPOINT_TRUNCATE, NULL, NULL);

    stats.checkpoints++;
    stats.last_checkpoint = time(NULL);
    dirty = false;
}
```

### Startup Restore

On startup, loads data from database into memory:

```c
int persist_load_all(void)
{
    // Load devices (including new fields)
    sqlite3_prepare_v2(db, SELECT_DEVICES_SQL, -1, &stmt, NULL);
    while (sqlite3_step(stmt) == SQLITE_ROW) {
        device_key_t key;
        parse_mac(sqlite3_column_text(stmt, MAC_COL), key.mac);

        device_t *device = device_find_or_create(&key);
        device->total_stats.rx_bytes = sqlite3_column_int64(stmt, RX_BYTES_COL);
        // Restore fingerprint fields
        device->tcp_fingerprint = strdup(sqlite3_column_text(stmt, FP_COL));
        device->os_hint = strdup(sqlite3_column_text(stmt, OS_COL));
        // ... restore other fields ...
    }

    // Load categories (hierarchical: master_protocol/app_protocol/category)
    // Load time buckets (per-category)

    // Sync circular buffer state from persisted bucket timestamps
    // time_series_sync_current_idx() sets current_idx and last_rotation
    // based on the most recent start_time found in each interval
}
```

### Database Schema (v3)

Schema v3 dropped the old `time_buckets` table (per-category circular buffers) and replaced it with `category_hours` (hourly aggregation with rolling retention).

**Tables**: `schema_version`, `devices`, `categories`, `device_buckets`, `category_hours`

**Devices table**:
```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY,
    mac TEXT UNIQUE NOT NULL,
    interface TEXT,
    rx_bytes INTEGER DEFAULT 0,
    tx_bytes INTEGER DEFAULT 0,
    active_time_sec INTEGER DEFAULT 0,
    tcp_fingerprint TEXT,
    os_hint TEXT,
    fingerprint_updated INTEGER,
    created INTEGER,
    last_seen INTEGER
);
```

**Categories table** (cumulative per-device stats):
```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    master_protocol TEXT,
    app_protocol TEXT,
    category TEXT,
    rx_bytes INTEGER DEFAULT 0,
    tx_bytes INTEGER DEFAULT 0,
    active_time_sec INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (device_id, master_protocol, app_protocol, category)
);
```

**Device buckets table** (device total_history circular buffer):
```sql
CREATE TABLE device_buckets (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    interval_type INTEGER NOT NULL,  -- 0=5min, 1=15min, 2=hour, 3=day
    bucket_index INTEGER NOT NULL,
    start_time INTEGER,
    end_time INTEGER,
    rx_bytes INTEGER DEFAULT 0,
    tx_bytes INTEGER DEFAULT 0,
    flow_count INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (device_id, interval_type, bucket_index)
);
```

**Category hours table** (rolling hourly aggregation, default 7-day retention):
```sql
CREATE TABLE category_hours (
    id INTEGER PRIMARY KEY,
    device_id INTEGER NOT NULL,
    master_protocol TEXT,
    app_protocol TEXT,
    category TEXT,
    hour_ts INTEGER,                 -- Hour boundary timestamp
    rx_bytes INTEGER DEFAULT 0,
    tx_bytes INTEGER DEFAULT 0,
    active_time_sec INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE (device_id, master_protocol, app_protocol, category, hour_ts)
);
```

**Indexes**:
- `idx_devices_mac` on `devices(mac)`
- `idx_categories_device` on `categories(device_id)`
- `idx_device_buckets_device` on `device_buckets(device_id)`
- `idx_category_hours_device_ts` on `category_hours(device_id, hour_ts)`
- `idx_category_hours_ts` on `category_hours(hour_ts)`

### Category Hours Lifecycle

1. In-memory `category_counters_t` accumulates hourly deltas (`hour_rx_bytes`, etc.)
2. On hour boundary: `category_flush_timer_cb()` calls `persist_flush_category_hours()` to UPSERT into `category_hours`
3. After flush: `category_counters_hour_reset()` zeros the hourly accumulators
4. `persist_prune_category_hours()` deletes rows older than `category_history_days` (default 7)
5. `persist_reset_stale_categories()` removes in-memory categories with no recent data
6. On startup: `persist_rebuild_device_categories()` rebuilds in-memory category list by summing `category_hours` rows within retention window

### Query Callback API

```c
typedef void (*persist_category_hour_cb)(
    const char *master, const char *app, const char *category,
    time_t hour_ts, uint64_t rx_bytes, uint64_t tx_bytes,
    uint64_t active_time_sec, void *ctx);

int persist_query_category_hours(const char *mac_str,
    time_t from_ts, time_t to_ts,
    persist_category_hour_cb callback, void *ctx);
```

### Persistence Statistics

```c
typedef struct persist_stats {
    uint64_t wal_writes;        // Total write operations
    uint64_t checkpoints;       // Total checkpoint operations
    uint64_t devices_saved;     // Devices written
    uint64_t categories_saved;  // Categories written
    uint64_t buckets_saved;     // Time buckets written
    time_t last_checkpoint;     // Last checkpoint timestamp
    time_t last_wal_write;      // Last write timestamp
} persist_stats_t;
```

---

## ubus Module

**Files:** `fsd_ubus.c`, `fsd_ubus.h`

### Purpose

OpenWrt ubus API for integration with system services, web UI, and shell helpers (`fsd.sh`, `fsd-cli.uc`).

### Key Functions

| Function | Purpose |
|----------|---------|
| `ubus_init()` | Connect to ubus, register object |
| `ubus_cleanup()` | Disconnect |

### Registered Methods (20 total)

| Method | Parameters | Description |
|--------|------------|-------------|
| `status` | (none) | Daemon status, uptime, counts |
| `config` | (none) | Full configuration dump |
| `memory` | (none) | Memory usage breakdown and object counts |
| `timers` | (none) | Active timer intervals |
| `devices` | `include_hosts` (BOOL) | All devices with stats |
| `device` | `mac` (STRING) | Single device details by MAC |
| `hosts` | `device` (STRING), `min_rate` (INT32), `limit` (INT32), `include_flows` (BOOL), `sort_by` (STRING) | Host statistics with filtering |
| `host` | `address` (STRING) | Single host details by IP |
| `flows` | `device` (STRING), `host` (STRING), `min_rate` (INT32), `limit` (INT32), `protocol` (STRING) | Active flows with filtering |
| `destroyed_flows` | `limit` (INT32), `tcp_udp_only` (BOOL) | Recently destroyed flows from history |
| `categories` | `device` (STRING), `group_by_app` (BOOL) | Per-application breakdown (2-level: Category -> App) |
| `idle` | `mac` (STRING, optional) | Idle status (global if no MAC, device-specific if MAC) |
| `checkpoint` | (none) | Force persistence checkpoint to flash |
| `history` | `device` (STRING/MAC), `interval` (STRING) | Historical time-series data |
| `category_history` | `device` (STRING/MAC), `hours` (INT32) | Hourly category breakdown from `category_hours` table |
| `delete_host` | `address` (STRING) | Delete host from tracking |
| `delete_device` | `mac` (STRING) | Delete device from tracking |
| `reset_counters` | `type` (STRING), `address` (STRING) | Reset statistics counters |
| `set_loglevel` | `level` (INT32) | Change runtime log level |
| `reload_config` | (none) | Reload configuration from UCI |

### ubus Events

The daemon emits events for external systems to subscribe to:

| Event | Payload | Description |
|-------|---------|-------------|
| `flowstatd.device.new` | `mac`, `interface` | Emitted when a new device is first seen |

### Object Registration

```c
static const struct ubus_method flowstatd_methods[] = {
    UBUS_METHOD_NOARG("status", ubus_status),
    UBUS_METHOD("devices", ubus_devices, devices_policy),
    UBUS_METHOD("device", ubus_device, device_policy),
    UBUS_METHOD("hosts", ubus_hosts, hosts_policy),
    UBUS_METHOD("host", ubus_host, host_policy),
    UBUS_METHOD("flows", ubus_flows, flows_policy),
    UBUS_METHOD("destroyed_flows", ubus_destroyed_flows, destroyed_policy),
    UBUS_METHOD("categories", ubus_categories, categories_policy),
    UBUS_METHOD_NOARG("config", ubus_config),
    UBUS_METHOD_NOARG("timers", ubus_timers),
    UBUS_METHOD_NOARG("memory", ubus_memory),
    UBUS_METHOD("idle", ubus_idle, idle_policy),
    UBUS_METHOD_NOARG("checkpoint", ubus_checkpoint),
    UBUS_METHOD("history", ubus_history, history_policy),
    UBUS_METHOD("delete_host", ubus_delete_host, host_policy),
    UBUS_METHOD("delete_device", ubus_delete_device, device_policy),
    UBUS_METHOD("reset_counters", ubus_reset_counters, reset_policy),
    UBUS_METHOD("set_loglevel", ubus_set_loglevel, loglevel_policy),
    UBUS_METHOD_NOARG("reload_config", ubus_reload_config),
    UBUS_METHOD("category_history", ubus_category_history, cat_history_policy),
};
```

### Policy Definitions

```c
// Devices list
static const struct blobmsg_policy devices_policy[] = {
    { "include_hosts", BLOBMSG_TYPE_BOOL },
};

// Single device
static const struct blobmsg_policy device_policy[] = {
    { "mac", BLOBMSG_TYPE_STRING },
};

// Hosts list with filtering
static const struct blobmsg_policy hosts_policy[] = {
    { "device", BLOBMSG_TYPE_STRING },
    { "min_rate", BLOBMSG_TYPE_INT32 },
    { "limit", BLOBMSG_TYPE_INT32 },
    { "include_flows", BLOBMSG_TYPE_BOOL },
    { "sort_by", BLOBMSG_TYPE_STRING },
};

// Single host
static const struct blobmsg_policy host_policy[] = {
    { "address", BLOBMSG_TYPE_STRING },
};

// Flows with filtering
static const struct blobmsg_policy flows_policy[] = {
    { "device", BLOBMSG_TYPE_STRING },
    { "host", BLOBMSG_TYPE_STRING },
    { "min_rate", BLOBMSG_TYPE_INT32 },
    { "limit", BLOBMSG_TYPE_INT32 },
    { "protocol", BLOBMSG_TYPE_STRING },
};

// Destroyed flows
static const struct blobmsg_policy destroyed_policy[] = {
    { "limit", BLOBMSG_TYPE_INT32 },
    { "tcp_udp_only", BLOBMSG_TYPE_BOOL },
};

// Categories
static const struct blobmsg_policy categories_policy[] = {
    { "device", BLOBMSG_TYPE_STRING },
    { "group_by_app", BLOBMSG_TYPE_BOOL },
};

// Category history (hourly breakdown from category_hours table)
static const struct blobmsg_policy cat_history_policy[] = {
    { "device", BLOBMSG_TYPE_STRING },
    { "hours", BLOBMSG_TYPE_INT32 },
};

// Idle status
static const struct blobmsg_policy idle_policy[] = {
    { "mac", BLOBMSG_TYPE_STRING },
};
```

### Category Response Format

Categories are returned as a 2-level hierarchy: Category -> Applications. Each category contains aggregated totals and a nested array of applications. The effective app name uses `app_protocol` if it differs from `master_protocol`, otherwise falls back to `master_protocol`:

```json
{
  "categories": [
    {
      "category": "Video",
      "flow_count": 8,
      "rx_bytes": 2000000,
      "tx_bytes": 230000,
      "rx_bps": 25600,
      "tx_bps": 4800,
      "active_time": 3600,
      "applications": [
        {
          "name": "Netflix",
          "flow_count": 5,
          "rx_bytes": 800000,
          "tx_bytes": 150000,
          "rx_bps": 20000,
          "tx_bps": 3800,
          "active_time": 3600
        },
        {
          "name": "YouTube",
          "flow_count": 3,
          "rx_bytes": 1200000,
          "tx_bytes": 80000,
          "rx_bps": 5600,
          "tx_bps": 1000,
          "active_time": 2400
        }
      ]
    },
    {
      "category": "Web",
      "flow_count": 8,
      "rx_bytes": 1200000,
      "tx_bytes": 80000,
      "rx_bps": 0,
      "tx_bps": 0,
      "active_time": 7200,
      "applications": [
        {
          "name": "TLS",
          "flow_count": 8,
          "rx_bytes": 1200000,
          "tx_bytes": 80000,
          "rx_bps": 0,
          "tx_bps": 0,
          "active_time": 7200
        }
      ]
    }
  ],
  "count": 2
}
```

Apps are grouped by category with stats aggregated at both levels. For example, Netflix traffic over both TLS and HTTP is combined into a single entry under "Video".

### Device Usage Response

Devices include a `usage` object with time-window usage summaries from `total_history`:

```json
{
  "usage": {
    "fifteen": { "rx_bytes": 1234567, "tx_bytes": 234567, "total_bytes": 1469134 },
    "hour": { "rx_bytes": 12345678, "tx_bytes": 2345678, "total_bytes": 14691356 },
    "day": { "rx_bytes": 123456789, "tx_bytes": 23456789, "total_bytes": 146913578 },
    "week": { "rx_bytes": 1234567890, "tx_bytes": 234567890, "total_bytes": 1469135780 }
  }
}
```

Each interval shows cumulative bytes within that time window:
- `fifteen`: Current 15-minute bucket
- `hour`: Sum of 15-min buckets within last hour
- `day`: Sum of hourly buckets within last 24 hours
- `week`: Sum of daily buckets within last 7 days

### Idle Response Format

```json
{
  "global": {
    "is_idle": false,
    "idle_seconds": 45,
    "last_activity": 1702900000,
    "current_rate_bps": 1500000,
    "idle_timeout": 120,
    "idle_rate_threshold": 12500,
    "idle_flow_rate_threshold": 1250
  },
  "devices": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "is_idle": true,
      "idle_seconds": 300,
      "last_activity": 1702899700,
      "current_rate_bps": 1000
    }
  ]
}
```

---

## Redis Module

**Files:** `fsd_redis.c`, `fsd_redis.h`

### Purpose

Publish statistics to Redis for external monitoring and dashboards.

### Key Functions

| Function | Purpose |
|----------|---------|
| `redis_init()` | Connect to Redis server |
| `redis_cleanup()` | Disconnect |
| `redis_publish_talker_stats()` | Publish device talker statistics with ranking |
| `redis_publish_devices()` | Publish all device data |

### Connection

```c
static redisContext *redis_ctx;

int redis_init(void)
{
    if (!config->redis_enabled)
        return FSD_OK;

    struct timeval tv = { .tv_sec = 5 };
    redis_ctx = redisConnectWithTimeout(config->redis_host,
                                        config->redis_port, tv);

    if (redis_ctx->err) {
        FSD_LOG_ERR("Redis connect failed: %s", redis_ctx->errstr);
        return FSD_ERR_IO;
    }
}
```

### Publishing

```c
void redis_publish_talker_stats(const char *mac, const char *interval,
                                 uint64_t rx_bytes, uint64_t tx_bytes,
                                 uint64_t total_bytes, uint32_t rx_rank,
                                 uint32_t tx_rank)
{
    redisCommand(redis_ctx,
        "HSET flowstatd:talkers:%s:%s "
        "rx_bytes %llu tx_bytes %llu total_bytes %llu "
        "rx_rank %u tx_rank %u",
        interval, mac,
        rx_bytes, tx_bytes, total_bytes, rx_rank, tx_rank);

    redisCommand(redis_ctx, "EXPIRE flowstatd:talkers:%s:%s 600",
                 interval, mac);
}

void redis_publish_devices(void);  // Publish all device data
```

### Reconnection

Automatic reconnection with exponential backoff:

```c
static int backoff_sec = 1;

void redis_reconnect(void)
{
    redisFree(redis_ctx);
    redis_ctx = NULL;

    if (redis_init() != FSD_OK) {
        backoff_sec = MIN(backoff_sec * 2, 300);  // Max 5 min
        uloop_timeout_set(&reconnect_timer, backoff_sec * 1000);
    } else {
        backoff_sec = 1;
    }
}
```

---

## Shell Helpers Module

**Files:** `files/fsd-cli.uc`, `files/fsd.sh`

### Purpose

Provides formatted table output for flowstatd data, building on top of the ubus API. Offers three abstraction levels for accessing flowstatd data.

> **API Synchronization**: These files directly consume ubus JSON output. When ubus methods or output formats change in `fsd_ubus.c`, both files MUST be updated to match.

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   fsd.db.*      │     │   fsd.ubus.*    │     │   fsd.*         │
│   (SQL direct)  │     │   (JSON output) │     │   (formatted)   │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         v                       v                       v
┌─────────────────────────────────────────────────────────────────┐
│                         fsd.sh                                   │
│              (shell helpers and wrappers)                        │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  v
┌─────────────────────────────────────────────────────────────────┐
│                       fsd-cli.uc                                 │
│              (ucode formatting engine)                           │
└─────────────────────────────────────────────────────────────────┘
```

### fsd-cli.uc

Ucode script providing formatted table output via ubus calls.

#### Supported Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `flows` | Active flows table | `--limit`, `--device`, `--host`, `--min-rate`, `--protocol` |
| `hosts` | Active hosts table | `--device`, `--limit`, `--min-rate`, `--sort-by` |
| `devices` | Active devices table | `--verbose` (no-op), `--categories` |
| `device` | Single device details | `--mac` (required) |
| `host` | Single host details | `--address` (required) |
| `categories` | Application breakdown (2-level: Category -> App) | `--device` |
| `destroyed` | Recently destroyed flows | `--limit` |
| `idle` | Network idle status | `--mac`, `--all` |
| `history` | Time-series historical data | `--mac` (required), `--interval` |
| `category_history` | Hourly category breakdown | `--mac` (required), `--hours` |
| `status` | Daemon status | - |
| `memory` | Memory usage | - |
| `config` | Configuration | - |
| `timers` | Active timers | - |

#### Formatting Functions

```javascript
// Human-readable byte sizes
function format_bytes(bytes)    // -> "1.23 MB"

// Human-readable bit rates
function format_bps(bps)        // -> "9.84 Mbps"

// Human-readable durations
function format_duration(sec)   // -> "2h 15m"

// Flow classification string
function format_classification(flow)  // -> "HTTP/netflix (streaming)"

// Destination with protocol_by_ip suffix
function format_destination(flow, width, use_ip)  // -> "example.com [HTTP]"

// Risk info for display
function format_risk(risk_info) // -> "score: 100, Self-signed Cert"
```

The `format_destination()` function appends the `protocol_by_ip` hint in square brackets when present:
```
example.com:443 [HTTPS]
192.168.1.1:53 [DNS]
```

#### 2-Level Category Display

Categories are displayed with apps indented under their category (device level only):

```
Category                     Flows           RX           TX      RX Rate      TX Rate     Active
----------------------------------------------------------------------------------------------------
Video                            8      1.91 GB    224.61 MB    2.05 Mbps  240.00 Kbps    2h 15m
  Netflix                        5    800.00 MB    150.00 MB    1.28 Mbps  192.00 Kbps    1h 45m
  YouTube                        3      1.17 GB     74.61 MB  786.43 Kbps   48.00 Kbps      25m
Web                              8      1.14 GB     76.29 MB        0 bps        0 bps    2h 10m
  TLS                            8      1.14 GB     76.29 MB        0 bps        0 bps    2h 10m
```

#### Combined Queries

The script performs combined ubus queries for richer output:

```javascript
// devices command fetches both device and idle data
function cmd_devices(args) {
    let data = ubus.call({ object: "flowstatd", method: "devices", data: params });
    let idle_data = ubus.call({ object: "flowstatd", method: "idle", data: {} });
    print_devices_table(data, args, idle_data);
}
```

### fsd.sh

Shell helper script providing three access patterns.

#### Path Constants

```sh
FSD_DB_PATH="/FLASH/persist/flowstatd/flowstatd.db"
FSD_CLI_SCRIPT="/usr/share/flowstatd/fsd-cli.uc"
```

#### Access Patterns

**1. Direct Database Access (`fsd.db.*`)**

Direct SQL queries to the SQLite database:

```sh
fsd.db.tables                # List tables
fsd.db.schema                # Show schema
fsd.db.stats                 # Database statistics
fsd.db.devices               # Formatted device list
fsd.db.devices.raw           # Raw device data
fsd.db.devices.top [N]       # Top N devices by bytes
fsd.db.device <MAC>          # Single device details
fsd.db.categories            # All categories
fsd.db.categories.raw        # Raw categories
fsd.db.categories.top [N]    # Top N categories by bytes
fsd.db.device.categories <MAC>  # Categories for device
fsd.db.category.hours <MAC> [H] # Category hourly history
fsd.db.category.hours.top [H]   # Top categories by bytes
fsd.db.clear                 # Clear all data (with confirmation)
fsd.db.clear.categories      # Clear categories only
fsd.db.vacuum                # Vacuum database
fsd.db.checkpoint            # Force checkpoint
fsd.db.sql "SELECT..."       # Arbitrary SQL
fsd.db.path                  # Database path and size
```

**2. JSON Output (`fsd.ubus.*`)**

Raw ubus JSON output:

```sh
fsd.ubus.status        # Daemon status
fsd.ubus.devices       # Devices JSON
fsd.ubus.hosts.active  # Hosts with >1KB/s rate
fsd.ubus.flows.tcp     # TCP flows only
fsd.ubus.idle          # Idle status
```

**3. Formatted Tables (`fsd.*`)**

Human-readable table output via fsd-cli.uc:

```sh
fsd.flows                    # Active flows table
fsd.flows.active             # High-rate flows
fsd.flows.tcp / fsd.flows.udp  # Protocol filter
fsd.hosts                    # Active hosts table
fsd.hosts.active             # High-rate hosts
fsd.devices                  # Devices with idle time
fsd.devices.categories       # Devices with category breakdown
fsd.categories [MAC]         # Application breakdown (collapsed by app)
fsd.categories.all [MAC]     # Full category hierarchy
fsd.destroyed [N]            # Destroyed flows
fsd.idle / fsd.idle.all      # Idle status
fsd.history <MAC> [interval] # Time-series buckets (5min/15min/hour/day)
fsd.category.history <MAC> [hours] # Category hourly data
```

#### Maintenance Functions

```sh
fsd.db.clear           # Clear all data (with confirmation)
fsd.db.vacuum          # Reclaim space
fsd.db.checkpoint      # Force WAL checkpoint
fsd.db.path            # Show database path and size
```

### Usage Examples

```sh
# Source the helpers
source /usr/share/flowstatd/fsd.sh

# View active flows with minimum rate
fsd.flows --min-rate 10000

# Show device details with categories
fsd.device aa:bb:cc:dd:ee:ff --categories

# Query database directly
fsd.db.sql "SELECT mac, rx_bytes FROM devices WHERE rx_bytes > 1000000"

# Check idle status
fsd.idle.all

# Get JSON for scripting
fsd.ubus.devices.full | jsonfilter -e '@.devices[*].mac'
```

---

## See Also

- `flowstatd.md` - Architecture overview and user guide
- `libubox.md` - libubox library reference
- `classifi.md` - DPI classification daemon documentation
