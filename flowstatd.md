# flowstatd - Flow Statistics Daemon

> **REMINDER**: Update this documentation (and `flowstatd-modules.md`) when features change.
> Last comprehensive update: 2026-03-08
> Recent changes: Schema v3 (category_hours replaces time_buckets), category_history ubus method, group_by_app categories parameter, fdb_refresh/category_flush timers, category_history_days config, rolling 7-day category retention, classifi_data_t refactor

> **API Synchronization Requirement**: When ubus API methods or output formats change in `fsd_ubus.c`, the following files MUST be updated to match:
> - `files/fsd-cli.uc` - ucode script that formats ubus output into tables
> - `files/fsd.sh` - shell helpers that wrap ubus calls
>
> These files directly consume ubus JSON output, so any field name changes, new methods, or structural changes will break them if not synchronized.

## Overview

flowstatd is an event-driven network flow statistics daemon for OpenWrt (and Linux). It monitors network traffic via netfilter conntrack, maintains hierarchical statistics (flow -> host -> device), provides time-series data, and exposes APIs via ubus and optionally Redis.

**Key Features:**
- Real-time flow tracking via netlink conntrack events
- Hierarchical data model: Flow (5-tuple) -> Host (IP) -> Device (MAC)
- Time-series statistics: 5min (x3), 15min (x4), hourly (x24), daily (x7)
- Per-category bandwidth breakdown at device level (via classifi integration) with rolling 7-day hourly history
- DPI integration: protocol classification, protocol stacks, risk scoring, device fingerprinting
- Flow risk scoring from nDPI (56 risk types, aggregated to device-level max risk)
- JA4 client fingerprinting (TLS client fingerprint)
- Async DNS resolution for hostnames
- Idle host/network detection (category + protocol + rate filtering for user vs background traffic)
- Monotonic time for clock-jump-safe elapsed time calculations
- SQLite persistence with WAL journaling for crash recovery
- ubus API for all queries and control, Redis publishing (optional)
- Table-formatted shell output via ucode (`fsd-cli.uc`, `fsd.sh`)

**Source Location:** `shared/smartrg/flowstatd/src/` (relative to smartos root)

## Architecture

### Initialization Sequence (`fsd_core.c:main()`)

```
1. config_load()             - Load configuration (UCI on OpenWrt, file on Linux)
2. tracker_init()            - Initialize AVL trees for flows/hosts/devices
3. idle_init()               - Initialize idle detection module (if enabled)
4. persist_init()            - Open database, create schema, prepare statements
5. persist_load_all()        - Restore device/category/bucket state from database
6. persist_migrate_legacy()  - Import from old JSON format (if present)
7. collector_init()          - Subscribe to netlink conntrack events
8. resolver_init()           - Initialize c-ares async DNS
9. classifi_init()           - Subscribe to classifi ubus events (OpenWrt)
10. neighbor_init()          - Subscribe to netlink neighbor events
11. redis_init()             - Connect to Redis server (optional)
12. ubus_server_init()       - Register ubus methods (OpenWrt)
13. uloop_run()              - Enter event loop
```

### Module Dependency Graph

```
                    ┌────────────────────────────────────────┐
                    │              fsd_core.c                │
                    │    (main, init, timers, signals)       │
                    └────────────────────┬───────────────────┘
                                         │
        ┌──────────────┬─────────────────┼───────────────────┬──────────────┐
        │              │                 │                   │              │
        ▼              ▼                 ▼                   ▼              ▼
   ┌─────────┐   ┌──────────┐      ┌──────────┐       ┌──────────┐   ┌──────────┐
   │Collector│   │ Neighbor │      │ Tracker  │       │   Idle   │   │  Persist │
   │(conntrk)│   │  (ARP)   │      │(AVL tree)│       │(activity)│   │ (SQLite) │
   └────┬────┘   └────┬─────┘      └─────┬────┘       └────┬─────┘   └────┬─────┘
        │             │                  │                 │              │
        │             │                  ├─────────────────┤              │
        │             └───────┬──────────┤                 │              │
        │                     ▼          │                 │              │
        │               ┌──────────┐     │                 │              │
        │               │ Resolver │◄────┘                 │              │
        │               │  (DNS)   │                       │              │
        │               └──────────┘                       │              │
        │                                                  │              │
        └───────────────►┌─────────────────────────────────┼──────────────┘
                         │                                 │
                    ┌────┴────┐                            │
                    │Classifi │                            │
                    │ (DPI)   │                            │
                    └─────────┘                            │
                                                           │
                    ┌──────────────────────────────────────┘
                    ▼                    ▼
              ┌──────────┐         ┌──────────┐
              │   ubus   │         │  Redis   │
              │  (API)   │         │ (publish)│
              └──────────┘         └──────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   Shell Wrappers      │
        │  fsd-cli.uc / fsd.sh  │
        │  (table formatting)   │
        └───────────────────────┘
```

### Event Loop Timers (`fsd_core.c`)

| Timer | Default Interval | Function | Purpose |
|-------|------------------|----------|---------|
| Rotation | 60 sec | `rotation_timer_cb()` | Rotate time-series buckets |
| Stats | 60 sec | `stats_timer_cb()` | Log statistics summary |
| Persist | 30 min | `persist_checkpoint_timer_cb()` | Checkpoint to flash |
| Neighbor | 30 sec | `neighbor_refresh_timer_cb()` | Refresh neighbor table |
| Inactive | 10 sec | `inactive_flow_timer_cb()` | Clean up stale flows |
| Redis | 60 sec | `redis_publish_timer_cb()` | Publish to Redis |
| Clock Check | 5 sec | `clock_check_timer_cb()` | Detect clock jumps, repair timestamps |
| FDB Refresh | 5 min | `fdb_refresh_timer_cb()` | Refresh bridge FDB cache |
| Category Flush | hourly (aligned) | `category_flush_timer_cb()` | Flush hourly category accumulators, prune old data |

**Note**: The category flush timer is NOT in the general timer array. It runs on hour boundaries (aligned to wall clock) via `ms_until_next_hour()`. It calls `persist_flush_category_hours()`, `persist_prune_category_hours()`, and `persist_reset_stale_categories()`.

### Signal Handling

- **SIGTERM/SIGINT**: Graceful shutdown with `persist_save_all()` and `persist_checkpoint()`
- **SIGHUP**: Reload configuration (planned)

### Monotonic Time

Flowstatd uses CLOCK_MONOTONIC for all elapsed-time calculations to be immune to clock jumps (NTP sync, RTC corrections, etc.). This is critical for embedded systems that may boot without RTC and start at epoch (1970).

**Implementation** (`fsd_types.h`):
```c
static inline uint64_t monotonic_sec(void)
{
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec;
}

static inline time_t mono_to_wall(uint64_t mono)
{
    if (mono == 0)
        return 0;
    return time(NULL) - (time_t)(monotonic_sec() - mono);
}
```

**Usage**:
- `monotonic_sec()` - Used for rate calculation, bucket rotation, active time tracking, idle detection
- `mono_to_wall()` - Converts monotonic timestamp to wall clock for display/storage
- Wall clock (`time(NULL)`) - Only used for display timestamps stored in database

**Clock Jump Recovery**:
The `clock_check_timer_cb()` runs every 5 seconds to detect when wall clock becomes valid (moves past epoch + reasonable uptime). When detected, `tracker_fix_timestamps()` repairs any affected timestamps.

## Data Model

### Hierarchical Structure

```
Device (MAC address)           <- Aggregated from all hosts
    │
    ├── Host (IP address)      <- Aggregated from all flows
    │       │
    │       ├── Flow (5-tuple) <- Individual connection
    │       ├── Flow
    │       └── Flow
    │
    ├── Host
    │       └── Flow
    │
    └── Category Stats         <- Per-application bandwidth (device level only)
            │                      2-level hierarchy: Category -> App
            ├── Video              <- Category totals
            │   ├── Netflix        <- App (uses app_protocol or master_protocol)
            │   └── YouTube
            ├── Web
            │   ├── TLS            <- Falls back to master_protocol when no app
            │   └── GoogleServices
            └── VPN
                ├── Tailscale
                └── WireGuard
```

**Note**: Category statistics are tracked only at the device level (by MAC address), not per-host. This simplifies the data model since a device may have multiple IPs but classification is MAC-based.

### Key Types (`fsd_types.h`)

```c
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

### Error Codes (`fsd_types.h`)

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

### Core Structures (`fsd_types.h`, `fsd_tracker.h`)

#### Statistics (`fsd_stats_t`)
```c
struct fsd_stats {
    uint64_t rx_bytes;
    uint64_t tx_bytes;
    uint64_t rx_packets;
    uint64_t tx_packets;
    uint64_t rx_bytes_delta;
    uint64_t tx_bytes_delta;
    uint64_t rx_packets_delta;
    uint64_t tx_packets_delta;
    uint64_t rx_bps;                     // Calculated rates (bits/sec)
    uint64_t tx_bps;
    uint64_t rx_pps;                     // Packets per second
    uint64_t tx_pps;
    uint64_t last_update;                // Monotonic timestamp
    uint64_t first_delta_time;           // First time deltas were computed
    uint64_t active_time_sec;            // Cumulative active time (seconds)
    uint64_t last_active_check;          // Monotonic timestamp for active tracking
    bool is_currently_active;
};
```

#### Flow (`flow_t`)
```c
struct flow {
    struct list_head list;               // Node in global flow list
    struct avl_node avl;                 // Node in flow AVL tree (by 5-tuple)
    struct list_head host_list;          // Node in host's flow list
    atomic_uint ref_count;

    flow_key_t key;                      // Flow 5-tuple key (see flow_key_t below)
    fsd_stats_t stats;
    host_t *host;                        // Parent host
    time_t created, last_seen;
    bool destroyed;
    bool counted_in_categories;

    classifi_data_t classification;      // DPI classification data (see classifi_data_t)
    bool classifi_classified;
    time_t classifi_first_seen;
    time_t classifi_last_seen;
};
```

#### Classification Data (`classifi_data_t`)

Shared type used by `flow_t`, `destroyed_flow_t`, and the classification cache:

```c
typedef struct classifi_data {
    char master_protocol[64];
    char app_protocol[64];
    char category[MAX_CATEGORY_NAME];    // MAX_CATEGORY_NAME = 64
    char tcp_fingerprint[64];
    char os_hint[32];
    char stream_content[64];
    char hostname[256];
    char protocol_by_ip[64];
    char ja4_client[64];
    char protocol_stack[CLASSIFICATION_PROTOCOL_STACK_MAX][64]; // max 8
    int protocol_stack_count;
    uint64_t risk;                       // 64-bit risk bitmask
    uint16_t risk_score;
} classifi_data_t;
```

#### Host (`host_t`)
```c
struct host {
    struct list_head list;
    struct avl_node avl;
    struct list_head device_list;
    atomic_uint ref_count;

    host_key_t key;                      // Host IP key (see host_key_t below)
    char addr_str[INET6_ADDRSTRLEN];

    device_t *device;
    struct list_head flow_list;
    uint32_t flow_count;

    fsd_stats_t total_stats;
    time_series_t *total_history;

    const char *network_name;            // Network ID name (or NULL if unassigned)
    bool active;
    time_t created, last_seen;
    char *hostname;                      // Resolved hostname

    struct uloop_timeout dns_timer;      // Deferred DNS lookup
    bool dns_pending;
};
```

#### Device (`device_t`)
```c
struct device {
    struct list_head list;
    struct avl_node avl;
    atomic_uint ref_count;

    device_key_t key;                    // MAC key (see device_key_t below)
    char mac_str[18];
    char interface[IFNAMSIZ];

    struct list_head host_list;
    uint32_t host_count;

    fsd_stats_t total_stats;
    time_series_t *total_history;
    struct list_head category_list;      // List of category_stats_t

    char tcp_fingerprint[64];
    char os_hint[32];
    time_t fingerprint_updated;

    uint64_t max_risk;
    uint16_t max_risk_score;
    time_t max_risk_updated;

    bool active;
    time_t created, last_seen;
    uint64_t last_user_activity;         // Monotonic timestamp (idle detection)
};
```

#### Destroyed Flow (`destroyed_flow_t`)

Recently destroyed flows are kept in a circular buffer (max 100) for diagnostics:

```c
struct destroyed_flow {
    struct list_head list;
    flow_key_t key;
    fsd_stats_t final_stats;
    time_t created_at, destroyed_at;
    uint32_t duration_sec;
    char src_addr[INET6_ADDRSTRLEN];
    char dst_addr[INET6_ADDRSTRLEN];
    char src_port_name[16];
    char dst_port_name[16];

    classifi_data_t classification;      // Full DPI classification snapshot
    char src_hostname[256];
    bool classified;
};
```

### Time Series (`fsd_stats.h`)

Circular buffers for historical data:

| Interval | Duration | Buckets | Total Coverage |
|----------|----------|---------|----------------|
| 5 min    | 300 sec  | 3       | 15 minutes     |
| 15 min   | 900 sec  | 4       | 1 hour         |
| Hour     | 3600 sec | 24      | 1 day          |
| Day      | 86400 sec| 7       | 1 week         |

Each bucket stores:
```c
struct time_bucket {
    time_t start_time;
    time_t end_time;
    fsd_stats_t stats;                   // Full stats (rx/tx bytes, packets, rates, etc.)
    uint32_t flow_count;
    bool valid;
};
```

### Category Statistics (`fsd_stats.h`)

Per-category bandwidth tracking on devices (linked list, keyed by master_protocol/app_protocol/category triple). Categories use lightweight counters with hourly accumulators instead of per-category time-series. Historical data is persisted to the `category_hours` database table on hour boundaries.

```c
struct category_counters {
    uint64_t rx_bytes;
    uint64_t tx_bytes;
    uint64_t active_time_sec;
    uint64_t last_active_check;          // Monotonic time
    uint64_t last_flow_update;           // Monotonic time
    bool is_currently_active;
    uint64_t rx_bytes_delta;             // Rate computation accumulator
    uint64_t tx_bytes_delta;
    uint64_t first_delta_time;           // Monotonic time
    uint64_t rx_bps;                     // Computed rate
    uint64_t tx_bps;
    uint64_t hour_rx_bytes;              // Hourly accumulator (flushed to DB)
    uint64_t hour_tx_bytes;
    uint64_t hour_active_time_sec;
};

struct category_stats {
    struct list_head list;
    char master_protocol[MAX_CATEGORY_NAME]; // MAX_CATEGORY_NAME = 64
    char app_protocol[MAX_CATEGORY_NAME];
    char category[MAX_CATEGORY_NAME];
    category_counters_t current;         // Current period + hourly accumulators
    uint32_t flow_count;
    uint64_t max_risk;                   // Highest risk mask seen
    uint16_t max_risk_score;             // Highest risk score seen
};
```

**Category History Model**: In-memory `category_counters_t` accumulates per-hour byte/active-time deltas. On each hour boundary, `category_flush_timer_cb()` calls `persist_flush_category_hours()` to upsert these into the `category_hours` table, then resets the hourly accumulators. Old rows are pruned beyond `category_history_days` (default 7). When a device is restored from persistence, `persist_rebuild_device_categories()` rebuilds the in-memory category list by summing `category_hours` rows within the retention window.

## Module Reference

| Module | File | Purpose |
|--------|------|---------|
| Core | `fsd_core.c` | Main entry, timers, signal handling, init sequence |
| Types | `fsd_types.h` | Core types, error codes, logging macros, monotonic time |
| Config | `fsd_config.c/h` | UCI/file configuration loading |
| Tracker | `fsd_tracker.c/h` | Flow/host/device storage with AVL trees, destroyed flow history |
| Stats | `fsd_stats.c/h` | Statistics calculation, time-series, category counters |
| Collector | `fsd_collector.c/h` | Conntrack netlink event handling |
| Neighbor | `fsd_neighbor.c/h` | ARP/neighbor table monitoring |
| Resolver | `fsd_resolver.c/h` | Async DNS with c-ares |
| Classifi | `fsd_classifi.c/h` | DPI classification cache (ubus events) |
| Risk | `fsd_risk.c/h` | nDPI risk string table and iteration |
| Idle | `fsd_idle.c/h` | Idle host/network detection |
| Persist | `fsd_persist.c/h` | SQLite persistence (WAL journaling) |
| ubus | `fsd_ubus.c/h` | ubus API (OpenWrt, optional) |
| Redis | `fsd_redis.c/h` | Redis publishing (optional) |
| Shell Helpers | `files/fsd-cli.uc`, `files/fsd.sh` | Shell CLI and formatted table output |

See `flowstatd-modules.md` for detailed module documentation.

## Configuration

### UCI Configuration (OpenWrt)

File: `/etc/config/flowstatd`

```
config flowstatd 'main'
    # Logging
    option log_level '6'

    # Collection
    option enable_collection 'true'
    option enable_dns_resolution 'true'
    option enable_classification 'false'

    # Intervals (seconds)
    option rotation_interval '60'
    option stats_interval '60'
    option conntrack_poll_interval '30'
    option persist_checkpoint_interval '1800'

    # Idle detection
    option idle_detection 'true'
    option idle_timeout '120'
    option idle_rate_threshold '12500'
    option idle_flow_rate_threshold '1250'

    # Persistence
    option persist_path '/FLASH/persist/flowstatd/flowstatd.db'

    # Category history
    option category_history_days '7'

    # Redis (optional)
    option enable_redis 'false'
    option redis_host '127.0.0.1'
    option redis_port '6379'
    option redis_password ''
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `log_level` | int | 6 | Logging verbosity (0=EMERG to 7=DEBUG) |
| `enable_collection` | bool | true | Enable traffic collection |
| `enable_dns_resolution` | bool | true | Enable DNS reverse resolution |
| `enable_classification` | bool | false | Enable DPI classification (future) |
| `rotation_interval` | int | 60 | Time-series bucket rotation interval (sec) |
| `stats_interval` | int | 300 | Statistics display/logging interval config (sec); stats timer hardcoded to 60 sec |
| `conntrack_poll_interval` | int | 30 | Conntrack dump polling interval (sec, 0=disable) |
| `persist_checkpoint_interval` | int | 1800 | Flash checkpoint interval (sec) |
| `category_history_days` | int | 7 | Days of hourly category data to retain (0=disabled) |
| `persist_path` | string | /FLASH/persist/flowstatd/flowstatd.db | Database path (flash location) |
| `idle_detection` | bool | true | Enable idle host/network detection |
| `idle_timeout` | int | 120 | Seconds without user activity before idle |
| `idle_rate_threshold` | int | 12500 | Total device bytes/sec below which device is idle (100 Kbps) |
| `idle_flow_rate_threshold` | int | 1250 | Per-flow bytes/sec below which flow doesn't trigger user activity (10 Kbps) |
| `device_expire_days` | int | 30 | Days of inactivity before device deleted (0 = never) |
| `enable_redis` | bool | false | Enable Redis publishing |
| `redis_host` | string | 127.0.0.1 | Redis server address |
| `redis_port` | int | 6379 | Redis server port |
| `redis_password` | string | (empty) | Redis authentication password |

### Idle Detection

Idle detection determines when a device transitions from "active" (user-initiated traffic) to "idle" (only background traffic). This is useful for parental controls, energy management, and usage analytics.

#### User Activity Filter (`fsd_idle.c`)

A flow triggers user activity only if it passes all three filters:

1. **Category filter**: Category NOT in background categories list
2. **Protocol filter**: App protocol (or master protocol if no app) NOT in background protocols list
3. **Rate filter**: Flow rate >= `idle_flow_rate_threshold` (default 10 Kbps)

For classified flows, the check order in `idle_is_background_flow()`:
1. If category is background -> background (skip)
2. If app_protocol is background -> background (skip)
3. If no app_protocol and master_protocol is background -> background (skip)
4. Otherwise -> passes to rate filter

For unclassified flows, falls back to port-based detection (UDP ports 53, 123, 67/68, 5353, 1900, 5355, 137/138).

**Background categories** (always filtered):
- Network, System, SoftwareUpdate, ConnCheck, Advertisement, IoT-Scada, DataTransfer, Cloud, VPN, Web

**Background protocols** (always filtered):
- DNS, NTP, DHCP, MDNS, SSDP, LLMNR, NETBIOS, IGMP, ICMP, STUN, OCSP, NAT-PMP, DoH_DoT
- ApplePush, Crashlytics, iCloudPrivateRelay
- IPSec, WireGuard, Tailscale, OpenVPN (VPN keepalives)
- TLS, QUIC, HTTP (unclassified generic transport)

The rate filter catches low-bandwidth keepalives in "user" categories (e.g., Sonos music app at 16 bps when not actively streaming).

#### Idle State Calculation

A device is marked idle when **both** conditions are met:
1. No user activity for >= `idle_timeout` seconds (default 120)
2. Total device rate < `idle_rate_threshold` (default 100 Kbps)

The second condition prevents false idle detection during large background transfers (e.g., cloud sync).

## ubus API (OpenWrt)

### Registered Object

`flowstatd`

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `flowstatd.device.new` | `mac`, `interface` | Emitted when a new device is first seen |

### Methods (20 total)

| Method | Parameters | Description |
|--------|------------|-------------|
| `status` | (none) | Daemon status, uptime, counts |
| `config` | (none) | Full configuration dump |
| `memory` | (none) | Memory usage breakdown and object counts |
| `timers` | (none) | Active timer intervals |
| `devices` | `include_hosts` | All devices with stats |
| `device` | `mac` | Single device details by MAC |
| `hosts` | `device`, `min_rate`, `limit`, `include_flows`, `sort_by` | Host statistics with filtering |
| `host` | `address` | Single host details by IP |
| `flows` | `device`, `host`, `min_rate`, `limit`, `protocol` | Active flows with filtering |
| `destroyed_flows` | `limit`, `tcp_udp_only` | Recently destroyed flows from history |
| `categories` | `device`, `group_by_app` | Per-application breakdown (2-level: Category -> App) |
| `idle` | `mac` (optional) | Idle status (global if no MAC, device-specific if MAC) |
| `checkpoint` | (none) | Force persistence checkpoint to flash |
| `history` | `device` (MAC), `interval` | Historical time-series data |
| `category_history` | `device` (MAC), `hours` | Hourly category breakdown from `category_hours` table |
| `delete_host` | `address` | Delete host from tracking |
| `delete_device` | `mac` | Delete device from tracking |
| `reset_counters` | `type`, `address` | Reset statistics counters |
| `set_loglevel` | `level` | Change runtime log level |
| `reload_config` | (none) | Reload configuration from UCI |

### Example Usage

```bash
# Get status
ubus call flowstatd status

# List all devices with associated hosts
ubus call flowstatd devices '{"include_hosts":true}'

# Get single device details
ubus call flowstatd device '{"mac":"aa:bb:cc:dd:ee:ff"}'

# Get hosts with minimum rate filter (100 Kbps)
ubus call flowstatd hosts '{"min_rate":100000}'

# Get hosts for a specific device
ubus call flowstatd hosts '{"device":"aa:bb:cc:dd:ee:ff"}'

# Get flows filtered by protocol
ubus call flowstatd flows '{"protocol":"tcp","limit":50}'

# Get global idle status
ubus call flowstatd idle

# Get idle status for specific device
ubus call flowstatd idle '{"mac":"aa:bb:cc:dd:ee:ff"}'

# Get category breakdown for a device
ubus call flowstatd categories '{"device":"aa:bb:cc:dd:ee:ff"}'

# Get historical data for a device
ubus call flowstatd history '{"device":"aa:bb:cc:dd:ee:ff","interval":"hour"}'

# Get hourly category history for a device (last 24 hours)
ubus call flowstatd category_history '{"device":"aa:bb:cc:dd:ee:ff","hours":24}'

# Delete a host
ubus call flowstatd delete_host '{"address":"192.168.1.100"}'

# Reset counters for a device
ubus call flowstatd reset_counters '{"type":"device","address":"aa:bb:cc:dd:ee:ff"}'

# Force checkpoint to flash
ubus call flowstatd checkpoint

# Reload configuration
ubus call flowstatd reload_config
```

### Response Format

```json
{
  "status": "running",
  "uptime": 3600,
  "devices": 12,
  "hosts": 45,
  "flows": 234
}
```

### Device Usage Data

The `devices` and `device` methods include a `usage` object with time-windowed byte totals from `total_history`:

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

Intervals are computed from device `total_history` buckets:
- `fifteen`: Current 15-minute bucket
- `hour`: Sum of 15-min buckets within last hour
- `day`: Sum of hourly buckets within last 24 hours
- `week`: Sum of daily buckets within last 7 days

## Persistence

### Architecture

Uses SQLite database directly on flash storage:

1. **Database location**: `/FLASH/persist/flowstatd/flowstatd.db`
2. **Periodic checkpoints** ensure durability using SQLite's checkpoint mechanism
3. Uses `journal_mode=WAL` for crash recovery and concurrent read access
4. On SIGTERM: `persist_save_all()` then `persist_checkpoint()` ensures clean shutdown

### Database Location

| Path | Purpose |
|------|---------|
| `/FLASH/persist/flowstatd/flowstatd.db` | Persistent database (active at runtime) |

### Schema

**Schema Version:** 3 (v2: packet counters removed; v3: `time_buckets` dropped, replaced by `category_hours`)

```sql
CREATE TABLE schema_version (
    version INTEGER PRIMARY KEY,
    migrated_at INTEGER
);

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

-- Category cumulative statistics per device
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

-- Device-level time-series buckets (circular buffer for usage summary)
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

-- Hourly category aggregation (rolling retention, default 7 days)
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

-- Indexes
CREATE INDEX idx_devices_mac ON devices(mac);
CREATE INDEX idx_categories_device ON categories(device_id);
CREATE INDEX idx_device_buckets_device ON device_buckets(device_id);
CREATE INDEX idx_category_hours_device_ts ON category_hours(device_id, hour_ts);
CREATE INDEX idx_category_hours_ts ON category_hours(hour_ts);
```

**Schema Migration**: v3 drops the old `time_buckets` table (per-category circular buffers) and replaces it with `category_hours` (simple hourly aggregation). This simplifies the data model and reduces storage overhead while providing better long-term category history queryability.

### Write Strategy

1. All writes go directly to flash database
2. Uses `journal_mode=WAL` for crash recovery and performance
3. Periodic checkpoint (30 min default) flushes WAL to main database
4. On SIGTERM: `persist_save_all()` then `persist_checkpoint()` ensures clean shutdown
5. Crash recovery: WAL replay recovers uncommitted transactions

## Runtime Files

| Path | Purpose |
|------|---------|
| `/FLASH/persist/flowstatd/flowstatd.db` | Persistent database |

## Building

### Dependencies

| Library | Purpose |
|---------|---------|
| libubox | AVL trees, list, uloop |
| libblobmsg_json | JSON generation |
| libnetfilter_conntrack | Conntrack events |
| libnfnetlink | Netlink base |
| libc-ares | Async DNS |
| libsqlite3 | Persistence |
| libuci | UCI config (OpenWrt) |
| libubus | ubus API (OpenWrt) |
| libhiredis | Redis client (optional) |
| libpthread | Threading |

### Build Commands

> **IMPORTANT**: When testing local builds, `make` must be run from the `src/` directory.

```bash
# Linux PC build
cd src && make flowstatd

# OpenWrt build with all features
cd src && make OPENWRT=1 ENABLE_REDIS=1 ENABLE_UBUS=1 flowstatd

# Run tests (from src directory)
cd src && make test_stats test_tracker test_collector test_load
```

### Compile Flags

| Flag | Purpose |
|------|---------|
| `OPENWRT` | Enable OpenWrt features (UCI, netfilter) |
| `LINUX_PC` | Linux desktop build (stubs) |
| `ENABLE_REDIS` | Enable Redis integration |
| `ENABLE_UBUS` | Enable ubus API |

## Troubleshooting

### High CPU Usage

- Check `poll_interval` - increase if too frequent
- Check flow count with `ubus call flowstatd status` - may need inactive timeout
- Verify conntrack table size with `conntrack -C`

### No Flows Appearing

1. Verify conntrack is enabled: `lsmod | grep nf_conntrack`
2. Check network_id matches interface: `uci show flowstatd`
3. Verify traffic is flowing: `conntrack -L`
4. Check logs: `logread | grep flowstatd`

### Persistence Issues

1. Check database paths: `fsd.db.path` (shell helper) or `ls -la /tmp/flowstatd/ /FLASH/persist/flowstatd/`
2. Force checkpoint: `ubus call flowstatd checkpoint` or `fsd.db.checkpoint`
3. Check memory stats: `ubus call flowstatd memory`

### Missing Categories

- Verify classifi daemon is running: `pgrep classifi`
- Check ubus event subscription: `ubus list | grep classifi`
- Categories appear after DPI classification completes

### Factory Reset Behavior

The database is removed during `factory_reset --clean`:
- Path `/FLASH/persist/flowstatd/` is removed with all persist directories
- Daemon starts fresh after factory reset with no historical data

## Integration Points

### Hotplug (`/etc/hotplug.d/iface/20-flowstatd`)

Restarts daemon on interface changes to resubscribe to netlink.

### Init Script (`/etc/init.d/flowstatd`)

procd-based init with:
- Automatic restart on crash
- Resource limits
- Proper signal handling

### Redis Integration

When enabled, publishes device stats to Redis:
```
HSET flowstatd:devices:<mac> rx_bytes <value> tx_bytes <value> ...
```

### classifi Integration

Subscribes to `classifi.classified` ubus events:
```json
{
  "flow": "192.168.1.100:12345-93.184.216.34:443-6",
  "category_id": 15,
  "category_name": "streaming",
  "application": "netflix"
}
```

## Code Conventions

- **Variable/function naming**: `snake_case`
- **Function pattern**: `<module>_<action>` (e.g., `flow_create()`, `stats_update()`)
- **Error handling**: Return `FSD_OK`/`FSD_ERR_*` constants
- **Memory**: Reference counting with `*_hold()` and `*_put()`
- **Locking**: `pthread_rwlock_t` for reader-writer access
- **Logging**: `log_*` macros with levels (log_debug, log_info, log_notice, log_warning, log_err)
- **Time**: Use `monotonic_sec()` for elapsed time, `mono_to_wall()` for display

## Shell Helpers

Shell helpers in `files/fsd.sh` and table formatting in `files/fsd-cli.uc` provide convenient CLI access.

### Three Abstraction Levels

| Level | Prefix | Description |
|-------|--------|-------------|
| Database | `fsd.db.*` | Direct SQLite queries on persistence database |
| ubus JSON | `fsd.ubus.*` | Raw ubus calls returning JSON |
| Table | `fsd.*` | Formatted table output via ucode script |

### Common Commands

```bash
# Table-formatted output
fsd.flows              # Active flows table
fsd.hosts              # Hosts table
fsd.devices            # Devices table
fsd.device <mac>       # Single device details
fsd.host <ip>          # Single host details
fsd.categories         # Category breakdown
fsd.categories.all     # Full category hierarchy
fsd.category.history   # Hourly category data
fsd.idle               # Idle status
fsd.history            # Time-series history

# JSON output (ubus)
fsd.ubus.status        # Status JSON
fsd.ubus.devices       # Devices JSON
fsd.ubus.hosts         # Hosts JSON
fsd.ubus.flows         # Flows JSON
fsd.ubus.idle          # Idle JSON

# Database operations
fsd.db.devices         # Query devices table
fsd.db.categories      # Query categories table
fsd.db.category.hours  # Query category_hours table
fsd.db.path            # Show active database paths
fsd.db.checkpoint      # Force checkpoint to flash
fsd.db.vacuum          # Vacuum database
fsd.db.clear           # Clear all data (with confirmation)
```

### Table Output Filtering

```bash
# Filter by device
fsd.hosts --device aa:bb:cc:dd:ee:ff

# Filter by minimum rate
fsd.flows --min-rate 100000

# Limit results
fsd.flows --limit 20

# Include categories with devices
fsd.devices --categories
```

## See Also

- `flowstatd-modules.md` - Detailed module documentation
- `libubox.md` - libubox library reference
- `classifi.md` - DPI classification daemon
