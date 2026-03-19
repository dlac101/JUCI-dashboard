# ClassiFi Daemon Documentation

Technical documentation for the classifi eBPF + nDPI traffic classifier daemon.

## Overview

**ClassiFi** is a hybrid network traffic classifier for OpenWrt that combines:
- **Kernel-space eBPF** for efficient flow tracking and packet sampling
- **User-space nDPI** for deep packet inspection and protocol classification
- **Multi-interface support** for monitoring multiple network interfaces simultaneously
- **ubus integration** for events, queries, and dynamic configuration
- **JA4 fingerprinting** for TLS client identification via external fingerprint database

**License**: GPL-2.0
**nDPI Version**: 5.0 (API compatibility updated from 4.14)

## Component Structure

```
src/
  classifi.c         - Main userspace daemon (1972 lines)
  classifi.h         - Userspace structures and API (229 lines)
  classifi_bpf.h     - BPF/userspace shared structures (130 lines)
  classifi.bpf.c     - eBPF kernel program (267 lines)
  classifi_ubus.c    - ubus service implementation (617 lines)
  classifi_ubus.h    - ubus API declarations (25 lines)
  classifi_pcap.c    - libpcap mode and replay (352 lines)
  classifi_pcap.h    - pcap function declarations (22 lines)
  classifi_dump.c    - PCAPng file writer (293 lines)
  classifi_dump.h    - dump writer declarations (27 lines)
  Makefile           - Build configuration

files/
  classifi.init      - OpenWrt procd init script (60 lines)
  classifi.defaults  - UCI configuration defaults (28 lines)
```

## Architecture

### Two-Tier Design

```
+==============================================================+
|                    USER SPACE (nDPI)                         |
+==============================================================+
|                                                              |
|  classifi.c + classifi_ubus.c                                |
|  - Load/attach BPF (libbpf)                                  |
|  - Poll ring buffer                                          |
|  - Maintain flow hash table                                  |
|  - Multi-interface management                                |
|                                                              |
|    +------------------+       +---------------------+        |
|    | Flow Table       |<------| nDPI v5.0           |        |
|    | - nDPI contexts  |       | - DPI classification|        |
|    | - protocol IDs   |       | - TCP fingerprint   |        |
|    | - TCP fingerprint|       | - JA4 fingerprint   |        |
|    | - JA4/nDPI fp    |       | - Protocol stack    |        |
|    | - timestamps     |       | - master/app/cat    |        |
|    | Expire: 30s/60s  |       +---------------------+        |
|    +--------+---------+                                      |
|             |          +---------------------+               |
|             |          | JA4 Lookup Table    |               |
|             |<---------| AVL tree            |               |
|             |          | protos.txt entries  |               |
|             |          +---------------------+               |
|    +--------v------------------------------------+           |
|    | Output: -v verbose | -s stats               |           |
|    +---------------------------------------------+           |
|             |                                                |
|             +---> ubus event: classifi.classified            |
|             +---> ubus API: status, get_flows, etc.          |
|             +---> stdout/stderr                              |
|                                          |                   |
+==========================================+====================
                                           | zero-copy
+==========================================+====================
|                    KERNEL SPACE (eBPF)                       |
+==============================================================+
|                                                              |
|  classifi.bpf.c (TC program)                                 |
|  - Parse packets (Eth->VLAN->IPv4/6->TCP/UDP)                |
|  - Extract & canonicalize 5-tuple                            |
|  - Track flow state per interface                            |
|                                                              |
|    +-----------------+         +------------------+          |
|    |  flow_map       |         | packet_samples   |          |
|    |  (hash)         |         | (ring buffer)    |          |
|    |  8192 flows     |         | 1MB / 50 pkts    |          |
|    |  stats/state    |         | per flow         |          |
|    +-----------------+         +------------------+          |
|                                                              |
+==============================================================+
                              |
            +-----------------+-----------------+
            |                 |                 |
       TC INGRESS        TC EGRESS         (per interface)
            |                 |                 |
            +-----------------+-----------------+
                              |
            NETWORK INTERFACES (br-lan, br-guest, ...)
```

## Data Structures

### BPF/Userspace Shared (classifi_bpf.h)

**Constants:**
```c
#define MAX_FLOWS 8192           // Maximum tracked flows in BPF map
#define MAX_PACKET_SAMPLE 8192   // Maximum bytes per packet sample (see GRO note below)
#define PACKETS_TO_SAMPLE 50     // Packets to sample per flow

#define FLOW_FAMILY_IPV4 4
#define FLOW_FAMILY_IPV6 6

#define FLOW_STATE_NEW       0   // Flow just created
#define FLOW_STATE_SAMPLED   1   // Reached sampling threshold
#define FLOW_STATE_CLASSIFIED 2  // Classification complete
```
Source: `classifi_bpf.h:23-44`

**struct flow_addr** - 128-bit IP address storage (`classifi_bpf.h` in `struct flow_addr`):
```c
struct flow_addr {
    __u64 hi;    // High 64 bits (IPv6) or 0 (IPv4)
    __u64 lo;    // Low 64 bits (IPv6) or 32-bit IP (IPv4)
} __attribute__((packed));
```

**struct flow_key** - Flow 5-tuple identifier (`classifi_bpf.h` in `struct flow_key`):
```c
struct flow_key {
    __u8 family;           // FLOW_FAMILY_IPV4 or FLOW_FAMILY_IPV6
    __u8 protocol;         // IPPROTO_TCP, IPPROTO_UDP, etc.
    __u16 pad0;
    __u16 src_port;
    __u16 dst_port;
    struct flow_addr src;
    struct flow_addr dst;
} __attribute__((packed));
```

**struct flow_info** - BPF map value for flow statistics (`classifi_bpf.h` in `struct flow_info`):
```c
struct flow_info {
    __u64 packets;
    __u64 bytes;
    __u64 first_seen;   // Nanoseconds since boot
    __u64 last_seen;
    __u8 state;         // FLOW_STATE_*
    __u8 pad[7];
};
```

**struct packet_sample** - Ring buffer packet sample (`classifi_bpf.h` in `struct packet_sample`):
```c
struct packet_sample {
    struct flow_key key;
    __u64 ts_ns;                      // Timestamp in nanoseconds
    __u32 data_len;                   // Actual captured length
    __u32 ifindex;                    // Interface index (multi-interface support)
    __u16 l3_offset;                  // Offset to L3 header in data[]
    __u8 direction;                   // 0=original, 1=reply
    __u8 pad;
    __u8 data[MAX_PACKET_SAMPLE];     // Packet data (Ethernet frame)
} __attribute__((packed));
```

### Userspace Structures (classifi.h)

**struct ja4_entry** - JA4 fingerprint lookup entry (`classifi.h` in `struct ja4_entry`):
```c
struct ja4_entry {
    struct avl_node node;       // AVL tree node (keyed by fingerprint)
    char fingerprint[40];       // JA4 fingerprint hash
    char client[64];            // Client identification string
};
```

**Constants** (`classifi.h` in constants block):
```c
#define MAX_RULES 32
#define MAX_PATTERN_LEN 256
#define MAX_EXTRACTS 4

#define FLOW_IDLE_TIMEOUT 30
#define FLOW_ABSOLUTE_TIMEOUT 60
#define CLEANUP_INTERVAL 30

#define FLOW_TABLE_SIZE 1024    // Hash table buckets
#define MAX_INTERFACES 8        // Maximum monitored interfaces

#define MAX_PROTOCOL_STACK_SIZE 8
#define MAX_RISK_BITS 64
```

**struct interface_info** - Per-interface state (`classifi.h` in `struct interface_info`):
```c
struct interface_info {
    const char *name;           // Interface name (e.g., "br-lan")
    int ifindex;                // Kernel interface index
    struct flow_addr local_ip;  // Local IP address
    __u8 local_ip_family;       // IPv4 or IPv6
    __u32 local_subnet_mask;    // Subnet mask (IPv4 only)
    __u8 discovered;            // 1 if auto-discovered from UCI
    __u32 tc_handle_ingress;    // TC filter handle for ingress
    __u32 tc_priority_ingress;  // TC filter priority for ingress
    __u32 tc_handle_egress;     // TC filter handle for egress
    __u32 tc_priority_egress;   // TC filter priority for egress
};
```

**struct ndpi_flow** - Userspace flow with nDPI context (`classifi.h` in `struct ndpi_flow`):
```c
struct ndpi_flow {
    struct flow_key key;                    // Canonical flow key
    struct flow_key first_packet_key;       // Original packet direction
    struct ndpi_flow_struct *flow;          // nDPI flow context
    ndpi_protocol protocol;                 // Detected protocol
    int packets_processed;                  // Total packets seen
    int packets_dir0;                       // Packets in direction 0
    int packets_dir1;                       // Packets in direction 1
    int detection_finalized;                // 1 if classification complete
    int protocol_guessed;                   // 1 if result from giveup
    int have_first_packet_key;
    int classification_event_pending;       // Deferred TLS/QUIC event flag
    uint64_t first_seen;                    // Monotonic timestamp (seconds)
    uint64_t last_seen;                     // Monotonic timestamp (seconds)
    char tcp_fingerprint[64];               // TCP fingerprint string
    char os_hint[32];                       // OS hint from fingerprint
    char ja4_fingerprint[40];               // JA4 TLS client fingerprint
    char ndpi_fingerprint[36];              // nDPI fingerprint hash
    char ja4_client[64];                    // JA4 client name (from lookup table)
    char detection_method[32];              // nDPI detection confidence method
    int protocol_stack_count;               // Number of protocols in stack
    u_int16_t protocol_stack[MAX_PROTOCOL_STACK_SIZE]; // Protocol stack
    __u32 rules_matched;                    // Bitmask of matched rule indices
    ndpi_risk risk;                         // Risk bitmask
    u_int16_t risk_score;                   // Combined risk score
    u_int16_t risk_score_client;            // Client-side risk
    u_int16_t risk_score_server;            // Server-side risk
    u_int8_t multimedia_types;              // Stream content types
    struct ndpi_flow_input_info input_info; // nDPI flow direction info
    struct ndpi_flow *next;                 // Hash chain
};
```

**Helper function** - Get display key for flow (`classifi.h` in `flow_display_key()`):
```c
static inline struct flow_key *flow_display_key(struct ndpi_flow *flow)
{
    return flow->have_first_packet_key ? &flow->first_packet_key : &flow->key;
}
```

**struct classifi_ctx** - Main daemon context (`classifi.h` in `struct classifi_ctx`):
```c
struct classifi_ctx {
    struct ndpi_detection_module_struct *ndpi;

    struct avl_tree ja4_table;                     // JA4 fingerprint AVL lookup tree
    int ja4_entries;                               // Number of loaded JA4 entries

    struct ndpi_flow *flow_table[FLOW_TABLE_SIZE];  // 1024 buckets

    struct interface_info interfaces[MAX_INTERFACES]; // Up to 8 interfaces
    int num_interfaces;

    struct classifi_rule *rules;           // Custom action rules list
    int num_rules;

    struct bpf_object *bpf_obj;
    int bpf_prog_fd;
    int flow_map_fd;
    int ringbuf_stats_fd;
    struct ring_buffer *ringbuf;

    struct uloop_fd ringbuf_uloop_fd;      // Ring buffer event handler
    struct uloop_timeout cleanup_timer;    // Flow expiration timer
    struct uloop_timeout stats_timer;      // Statistics timer

    struct ubus_context *ubus_ctx;         // ubus connection

    int verbose;
    int periodic_stats;
    int pcap_mode;

    const char *pcap_ifname;               // Interface for pcap mode

    struct dump_writer *dump;              // PCAPng writer (when -w used)

    __u64 last_ringbuf_drops;              // For delta calculation
};
```

**Visitor Function Type** (`classifi.h` in `flow_visitor_fn`):
```c
typedef void (*flow_visitor_fn)(struct classifi_ctx *ctx,
                                struct ndpi_flow *flow,
                                void *user_data);
```

## BPF Maps (classifi.bpf.c)

| Map Name | Type | Max Entries | Key | Value | Purpose |
|----------|------|-------------|-----|-------|---------|
| flow_map | BPF_MAP_TYPE_LRU_HASH | 8192 | struct flow_key | struct flow_info | Flow statistics and state |
| packet_samples | BPF_MAP_TYPE_RINGBUF | 1MB | - | struct packet_sample | Zero-copy packet delivery |
| ringbuf_stats | BPF_MAP_TYPE_ARRAY | 1 | __u32 | __u64 | Drop counter |

Source: `classifi.bpf.c:39-56`

## eBPF Implementation Notes

### GRO (Generic Receive Offload) Handling

TC hooks see packets after GRO has coalesced multiple TCP segments into a single skb. However, the coalesced data is stored in skb frags, not the linear `skb->data` region. Without intervention, only the first segment's worth of data is accessible.

**Solution**: Use `bpf_skb_pull_data()` to linearize the packet data before sampling:

```c
__u32 pull_len = skb->len < MAX_PACKET_SAMPLE ? skb->len : MAX_PACKET_SAMPLE;
if (bpf_skb_pull_data(skb, pull_len) < 0)
    return TC_ACT_OK;
```

**Important**: `bpf_skb_pull_data()` fails if you request more bytes than `skb->len`. Always use `min(skb->len, MAX_PACKET_SAMPLE)`.

### MAX_PACKET_SAMPLE Sizing (8192 bytes)

The 8192-byte sample size is required because:
1. GRO can coalesce multiple TCP segments into packets larger than MTU
2. TLS ClientHello with many extensions can span multiple coalesced segments
3. TLS certificate data can span multiple segments
4. nDPI needs the complete ClientHello to extract SNI and other metadata

Using smaller values (e.g., 1500 or 4096) can cause TLS classification to fail because the ClientHello or certificate data is truncated.

### BPF Ring Buffer Limitations

**Constant size requirement**: `bpf_ringbuf_reserve()` requires a compile-time constant size. Variable-size allocations are not supported by the BPF verifier:

```c
// FAILS: "R2 is not a known constant"
__u32 sample_size = offsetof(struct packet_sample, data) + len;
sample = bpf_ringbuf_reserve(&packet_samples, sample_size, 0);

// WORKS: compile-time constant
sample = bpf_ringbuf_reserve(&packet_samples, sizeof(*sample), 0);
```

This means each sample reserves the full 8KB+ regardless of actual packet size. The 1MB ring buffer holds ~120 samples.

### BPF Verifier Complexity Limits

Manual byte-copy loops with large iteration counts hit verifier limits:

```c
// FAILS with MAX_PACKET_SAMPLE=8192: "The sequence of 16385 jumps is too complex"
#pragma unroll
for (i = 0; i < MAX_PACKET_SAMPLE && i < len; i++)
    sample->data[i] = *((char *)data + i);
```

**Solution**: Use `bpf_skb_load_bytes()` BPF helper instead:

```c
if (bpf_skb_load_bytes(skb, 0, sample->data, len) < 0) {
    bpf_ringbuf_discard(sample, 0);
    return;
}
```

## Multi-Interface Support

ClassiFi supports monitoring up to 8 network interfaces simultaneously.

### Configuration

**Command-line:**
- `-i <interface>` - Can be specified multiple times (up to 8)
- `-d, --discover` - Auto-discover LAN interfaces from UCI network config

**Examples:**
```bash
# Single interface
classifi -i br-lan /usr/lib/bpf/classifi.bpf.o

# Multiple interfaces
classifi -i br-lan -i br-guest /usr/lib/bpf/classifi.bpf.o

# Auto-discover LAN interfaces from UCI
classifi -d /usr/lib/bpf/classifi.bpf.o
```

### Discovery Logic

Function: `discover_interfaces_from_uci()` in classifi_ubus.c

The discovery process:
1. Reads UCI `network` package
2. Filters interfaces:
   - Skips sections not of type "interface"
   - Skips interfaces starting with "wan"
   - Skips "loopback"
   - Skips disabled interfaces (`disabled=1`)
   - Only includes interfaces with `proto=static`
3. Uses `device` or `name` option for interface name

### Per-Interface Tracking

- Each interface has its own TC hooks (ingress and egress)
- TC handles/priorities stored for proper cleanup
- `packet_sample.ifindex` identifies source interface for each sample
- `interface_info` struct tracks:
  - Interface name and ifindex
  - Local IP address for traffic filtering
  - TC attachment handles for cleanup

## JA4 Fingerprint Database

ClassiFi loads a JA4 fingerprint-to-client mapping database at startup from `/etc/classifi/protos.txt`. This provides TLS client identification independent of nDPI's built-in JA4 handling.

### Why Separate JA4 Lookup

nDPI's built-in JA4 custom rules (via `ndpi_load_protocols_file()`) overwrite `app_protocol` with client identification (e.g., "Safari"), which loses service detection (e.g., "Microsoft365"). ClassiFi handles JA4 client lookup separately to preserve both pieces of information.

### File Format

Each line in `/etc/classifi/protos.txt` follows the format:
```
ja4:<fingerprint>@<client_name>
```

Example:
```
ja4:t13d1516h2_8daaf6152771_b0da82dd1658@Chrome
ja4:t13d1517h2_8daaf6152771_02e80e359dd2@Safari
ja4:t13d1516h2_8daaf6152771_e5627efa2ab1@Firefox
```

Lines starting with `#` or empty lines are ignored. Lines not starting with `ja4:` are skipped.

### Implementation

The fingerprints are stored in an AVL tree (libubox `avl_tree`) for O(log n) lookup. When a TLS flow's JA4 fingerprint is extracted by nDPI, it is looked up in this table. If found, the `ja4_client` field is populated in the flow and included in ubus events/responses.

### Functions

| Function | File | Purpose |
|----------|------|---------|
| `ja4_table_load()` | classifi.c | Parse protos.txt into AVL tree |
| `ja4_table_lookup()` | classifi.c | Look up fingerprint in AVL tree |
| `ja4_table_free()` | classifi.c | Free all AVL entries |

### Data Structure

```c
struct ja4_entry {
    struct avl_node node;       // AVL tree node (keyed by fingerprint string)
    char fingerprint[40];       // JA4 fingerprint hash
    char client[64];            // Client identification string (e.g., "Chrome")
};
```

## ubus API

### Object: `classifi`

Registered in `classifi_ubus_init()` in classifi_ubus.c.

### Methods

**reload_config** (classifi_ubus.c in `classifi_reload_config_handler()`)
```bash
ubus call classifi reload_config
```
Re-reads UCI network configuration and dynamically adds/removes interfaces. Also reloads custom action rules.

Response:
```json
{
    "added": 1,
    "removed": 0,
    "interfaces": 2
}
```

**status** (classifi_ubus.c in `classifi_status_handler()`)
```bash
ubus call classifi status
```
Returns daemon status, interface list, and configured rules with hit counts.

Response:
```json
{
    "mode": "ebpf",
    "verbose": false,
    "periodic_stats": false,
    "ringbuf_drops": 0,
    "interfaces": [
        {
            "name": "br-lan",
            "ifindex": 5,
            "discovered": true,
            "local_ip": "192.168.1.1",
            "family": "ipv4"
        }
    ],
    "rules": [
        {
            "name": "http_session_capture",
            "enabled": true,
            "dst_ip": "100.87.210.25",
            "host_header": "",
            "dst_port": 8080,
            "protocol": "tcp",
            "pattern": "POST /start_session/([a-f0-9-]+) HTTP",
            "script": "/usr/libexec/classifi/session_handler.sh",
            "hits": 42
        }
    ],
    "num_rules": 1
}
```

**get_flows** (classifi_ubus.c in `classifi_get_flows_handler()`)
```bash
ubus call classifi get_flows
```
Returns all tracked flows with full classification metadata.

Response:
```json
{
    "flows": [
        {
            "src_ip": "192.168.1.100",
            "src_port": 54321,
            "dst_ip": "1.2.3.4",
            "dst_port": 443,
            "protocol": 6,
            "family": "ipv4",
            "master_protocol": "TLS",
            "app_protocol": "HTTPS",
            "category": "Web",
            "protocol_by_ip": "Google",
            "packets": 150,
            "packets_tx": 75,
            "packets_rx": 75,
            "age": 50,
            "idle_time": 10,
            "classified": true,
            "guessed": false,
            "tcp_fingerprint": "65535:128:1:52:M1460,N,W8,N,N,S:.",
            "os_hint": "Windows",
            "ja4": "t13d1516h2_8daaf6152771_b0da82dd1658",
            "ja4_client": "Chrome",
            "ndpi_fingerprint": "1:2:3:4:5",
            "detection_method": "DPI",
            "hostname": "www.google.com",
            "risk_score": 150,
            "risk_score_client": 100,
            "risk_score_server": 50,
            "risks": ["Known Protocol on Non-Standard Port"],
            "protocol_stack": ["IP", "TCP", "TLS", "HTTP"],
            "stream_content": "audio"
        }
    ],
    "count": 1
}
```

**get_flows field reference:**

| Field | Type | Condition | Description |
|-------|------|-----------|-------------|
| `src_ip`, `dst_ip` | string | always | Flow endpoints (first-packet direction) |
| `src_port`, `dst_port` | u32 | always | Port numbers |
| `protocol` | u32 | always | IP protocol (6=TCP, 17=UDP) |
| `family` | string | always | "ipv4" or "ipv6" |
| `master_protocol` | string | always | nDPI master protocol name |
| `app_protocol` | string | always | nDPI application protocol name |
| `category` | string | always | nDPI protocol category |
| `protocol_by_ip` | string | when nDPI identifies proto by IP | Protocol name from IP range match |
| `packets` | u32 | always | Total packets processed |
| `packets_tx` | u32 | always | Packets in direction 0 |
| `packets_rx` | u32 | always | Packets in direction 1 |
| `age` | u32 | always | Seconds since first packet |
| `idle_time` | u32 | always | Seconds since last packet |
| `classified` | bool | always | Whether detection is finalized |
| `guessed` | bool | always | Whether result came from giveup |
| `tcp_fingerprint` | string | when TCP SYN seen | TCP options fingerprint |
| `os_hint` | string | when TCP fingerprint available | OS identification from TCP FP |
| `ja4` | string | when TLS ClientHello seen | JA4 TLS fingerprint hash |
| `ja4_client` | string | when JA4 matches protos.txt | Client name from JA4 lookup |
| `ndpi_fingerprint` | string | when nDPI FP available | nDPI fingerprint hash |
| `detection_method` | string | when confidence known | nDPI detection confidence method |
| `hostname` | string | when SNI/Host available | Server hostname from TLS SNI or HTTP Host |
| `risk_score` | u32 | when any risk detected | Combined risk score |
| `risk_score_client` | u32 | when any risk detected | Client-side risk score |
| `risk_score_server` | u32 | when any risk detected | Server-side risk score |
| `risks` | array | when any risk detected | Array of risk description strings |
| `protocol_stack` | array | when >1 protocol in stack | Protocol layer names |
| `stream_content` | string | when multimedia detected | Stream content type description |

### Events

**classifi.classified** - Emitted when a flow is first classified.

**TLS/QUIC Event Deferral**: For TLS and QUIC flows, the event is deferred until nDPI has processed the ClientHello (which contains SNI). This ensures the `hostname` field is populated in the event. The deferral uses:
- `flow->protos.tls_quic.client_hello_processed` - ClientHello parsed, SNI extracted
- `flow->classification_event_pending` - Flag set when event must be deferred
- `tls_quic_metadata_ready()` - Helper function to check if metadata is ready

Without deferral, TLS events would emit with `hostname: null` because nDPI recognizes the TLS protocol before completing ClientHello parsing.

```bash
ubus listen classifi.classified
```

Event payload (emitted by `emit_classification_event()` in classifi.c):
```json
{
    "interface": "br-lan",
    "src_ip": "192.168.1.100",
    "src_port": 54321,
    "dst_ip": "1.2.3.4",
    "dst_port": 443,
    "protocol": 6,
    "master_protocol": "TLS",
    "app_protocol": "HTTPS",
    "category": "Web",
    "protocol_by_ip": "Google",
    "tcp_fingerprint": "65535:128:1:52:M1460,N,W8,N,N,S:.",
    "os_hint": "Windows",
    "ja4": "t13d1516h2_8daaf6152771_b0da82dd1658",
    "ja4_client": "Chrome",
    "ndpi_fingerprint": "1:2:3:4:5",
    "detection_method": "DPI",
    "hostname": "www.google.com",
    "protocol_stack": ["IP", "TCP", "TLS", "HTTP"],
    "risk_score": 150,
    "risk_score_client": 100,
    "risk_score_server": 50,
    "risks": ["Known Protocol on Non-Standard Port"],
    "stream_content": "audio"
}
```

**Risk information filtering**: In classified events, risk data (`risk_score`, `risk_score_client`, `risk_score_server`, `risks`) is only included when `risk_score >= NDPI_SCORE_RISK_HIGH`. In `get_flows` responses, risk data is included whenever any risk bit is set.

**Note on `protocol_by_ip`**: This field is included when nDPI identifies a protocol based on IP address (e.g., known Google, Facebook, or Microsoft IP ranges). It provides an additional classification signal independent of DPI analysis.

**classifi.dns_query** - Emitted when a DNS query is detected.

```bash
ubus listen classifi.dns_query
```

Event payload (emitted by `emit_dns_event()` in classifi.c):
```json
{
    "interface": "br-lan",
    "client_ip": "192.168.1.100",
    "domain": "www.google.com",
    "query_type": "A"
}
```

DNS events are only emitted for UDP flows to port 53, within the first 2 packets of a flow.

**classifi.rule_match** - Emitted when a custom rule matches a flow.

```bash
ubus listen classifi.rule_match
```

Event payload (emitted by `emit_rule_match_event()` in classifi.c):
```json
{
    "rule": "http_session_capture",
    "interface": "br-lan",
    "src_ip": "192.168.1.100",
    "src_port": 54321,
    "dst_ip": "100.87.210.25",
    "dst_port": 8080,
    "protocol": 6,
    "match_1": "7b7ad033-115c-4f7d-a3bf-2df817825457"
}
```

## Custom Action Rules

ClassiFi supports configurable rules that match traffic patterns, extract data using regex capture groups, and trigger actions (ubus events and/or scripts).

### Use Cases

- Extract session IDs from HTTP requests
- Capture authentication tokens from API calls
- Trigger notifications on specific traffic patterns
- Interface with external systems based on traffic content
- Match traffic to CDN/load-balanced services using HTTP Host header (works with DNS-over-HTTPS)

### Rule Configuration

Rules are configured in UCI (`/etc/config/classifi`):

```
config rule 'session_example'
    option enabled '1'
    option name 'http_session_capture'
    option dst_ip '100.87.210.25'
    option dst_port '8080'
    option protocol 'tcp'
    option pattern 'POST /start_session/([a-f0-9-]+) HTTP'
    option script '/usr/libexec/classifi/session_handler.sh'
```

Alternative using `host_header` for hostname-based matching:

```
config rule 'cdn_session'
    option enabled '1'
    option name 'cdn_session_capture'
    option host_header 'poc.cachefly.net'
    option dst_port '8080'
    option protocol 'tcp'
    option pattern 'POST /start_session/([a-f0-9-]+) HTTP'
    option script '/usr/libexec/classifi/session_handler.sh'
```

**Rule Options:**

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| enabled | bool | No | Enable/disable rule (default: 1) |
| name | string | Yes | Human-readable identifier (used in events) |
| dst_ip | string | Conditional | Target server IP (IPv4 or IPv6). Required if host_header not set. |
| host_header | string | Conditional | HTTP Host header value to match. Required if dst_ip not set. |
| dst_port | int | Yes | Target server port |
| protocol | string | No | `tcp` or `udp` (default: tcp) |
| pattern | string | Yes | POSIX extended regex with capture groups |
| script | string | No | Script to execute on match |

**Note:** At least one of `dst_ip` or `host_header` must be specified. Both can be used together for stricter matching.

### Matching Behavior

- **Direction**: Only client-to-server packets are matched (toward dst_ip:dst_port)
- **Frequency**: Each rule matches at most once per flow (prevents duplicate actions)
- **IP matching**: If `dst_ip` is specified, packet destination IP must match
- **Host matching**: If `host_header` is specified, the HTTP Host header must match (case-insensitive, ignores port suffix)
- **Payload**: Pattern is matched against TCP payload (first 1024 bytes)
- **Capture groups**: Up to 4 capture groups extracted per rule

### Actions

**ubus Event** (always emitted on match):

The `classifi.rule_match` event is emitted with:
- `rule`: Rule name from config
- `interface`: Source interface
- `src_ip`, `src_port`: Client address
- `dst_ip`, `dst_port`: Server address
- `protocol`: IP protocol number (6=TCP, 17=UDP)
- `match_1` through `match_4`: Regex capture groups (if any)

**Script Execution** (optional):

If `script` is configured, it is executed via `execl("/bin/sh", "sh", "-c", script)` with environment variables:

```
CLASSIFI_RULE=http_session_capture
CLASSIFI_INTERFACE=br-lan
CLASSIFI_SRC_IP=192.168.1.100
CLASSIFI_DST_IP=100.87.210.25
CLASSIFI_DST_PORT=8080
CLASSIFI_PROTOCOL=6
CLASSIFI_MATCH_1=7b7ad033-115c-4f7d-a3bf-2df817825457
```

Scripts are executed asynchronously via `fork()` (non-blocking). Capture group values are sanitized for shell safety (only alphanumeric, `-`, `_`, `.`, `:`, `/` characters are preserved).

### Example: HTTP Session Capture

**Scenario**: Capture session IDs from POST requests to a local service.

**Traffic pattern**:
```
POST /start_session/7b7ad033-115c-4f7d-a3bf-2df817825457 HTTP/1.1
Host: 100.87.210.25:8080
```

**UCI configuration**:
```
config rule 'session_capture'
    option enabled '1'
    option name 'http_session_capture'
    option dst_ip '100.87.210.25'
    option dst_port '8080'
    option protocol 'tcp'
    option pattern 'POST /start_session/([a-f0-9-]+) HTTP'
    option script '/usr/libexec/classifi/session_handler.sh'
```

**Handler script** (`/usr/libexec/classifi/session_handler.sh`):
```bash
#!/bin/sh
logger -t classifi "Session started: $CLASSIFI_MATCH_1 from $CLASSIFI_SRC_IP"
# Notify other services via ubus
ubus call session_manager notify "{ \"session_id\": \"$CLASSIFI_MATCH_1\", \"client\": \"$CLASSIFI_SRC_IP\" }"
```

### Hot Reload

Rules are reloaded when `ubus call classifi reload_config` is invoked. Existing flows retain their "already matched" state.

### Limits

- Maximum 32 rules
- Maximum 4 capture groups per rule
- Maximum 256 characters per pattern
- Maximum 128 characters per script path
- TCP payload inspection limited to first 1024 bytes

### Data Structures

**struct classifi_rule** (`classifi.h` in `struct classifi_rule`):
```c
struct classifi_rule {
    char name[64];
    int enabled;
    struct flow_addr dst_ip;
    __u8 dst_family;
    __u16 dst_port;
    __u8 protocol;
    int has_dst_ip;                   // 1 if dst_ip was configured
    char host_header[128];            // HTTP Host header to match (optional)
    char pattern[MAX_PATTERN_LEN];    // 256
    regex_t regex;
    int regex_compiled;
    char script[128];
    uint64_t hits;                    // Match counter
    struct classifi_rule *next;
};
```

**Per-flow tracking** (in `struct ndpi_flow`):
```c
__u32 rules_matched;    // Bitmask of matched rule indices
```

### Functions

| Function | File | Purpose |
|----------|------|---------|
| `rules_load_from_uci()` | classifi_ubus.c | Parse UCI config, compile regex |
| `rules_free()` | classifi_ubus.c | Free rule list and regex |
| `check_rules_and_execute()` | classifi.c | Match rules against packet |
| `get_tcp_payload()` | classifi.c | Extract TCP payload from sample |
| `host_header_match()` | classifi.c | Case-insensitive HTTP Host header matching |
| `emit_rule_match_event()` | classifi.c | Send ubus event |
| `execute_rule_script()` | classifi.c | Fork/exec script with sanitized env vars |
| `sanitize_for_shell()` | classifi.c | Strip unsafe characters from capture groups |

## Key Functions Reference

### BPF Program (classifi.bpf.c)

| Function | Purpose |
|----------|---------|
| `parse_flow_key()` | Extract 5-tuple from packet, handle VLAN tags |
| `sample_packet()` | Copy packet to ring buffer, track drops |
| `classifi()` | Main TC hook, flow lookup/create, sampling decision |

Note: `swap_flow_endpoints()` and `canonicalize_flow_key()` are in classifi_bpf.h for shared use between BPF and userspace.

### Userspace Daemon (classifi.c)

| Function | Purpose |
|----------|---------|
| `setup_ndpi()` | Initialize nDPI with configuration |
| `classify_packet()` | Core classification logic (eBPF mode) |
| `handle_sample()` | Ring buffer callback |
| `attach_tc_program()` | Attach BPF to interface TC hooks |
| `detach_tc_program()` | Cleanup all interface attachments |
| `detach_interface()` | Remove single interface |
| `flow_table_insert()` | Insert flow into hash table |
| `flow_table_lookup()` | Look up flow by key |
| `flow_get_or_create()` | Get existing or create new flow |
| `cleanup_expired_flows()` | Remove idle/old flows |
| `flow_table_iterate()` | Visitor pattern for flow table |
| `tls_quic_metadata_ready()` | Check if TLS/QUIC event can be emitted |
| `emit_classification_event()` | Send ubus classification event |
| `emit_dns_event()` | Send ubus DNS query event |
| `get_interface_ip()` | Retrieve interface IP address |
| `flow_update_metadata()` | Extract TCP FP, JA4, nDPI FP, risk, protocol stack from nDPI flow |
| `flow_get_protocol_names()` | Get master/app protocol name strings |
| `flow_check_dns_query()` | Detect and emit DNS query events |
| `flow_check_detection_finalized()` | Check if nDPI state is CLASSIFIED/MONITORING |
| `flow_detection_giveup()` | Call ndpi_detection_giveup() after packet threshold |
| `flow_process_ndpi_result()` | Process nDPI result: metadata, DNS, finalization, classification |
| `flow_handle_classification()` | Handle classification state changes, emit events |
| `ja4_table_load()` | Parse protos.txt JA4 fingerprint database into AVL tree |
| `ja4_table_lookup()` | Look up JA4 fingerprint in AVL tree |
| `ja4_table_free()` | Free all JA4 AVL tree entries |
| `extract_dns_query_name()` | Parse DNS wire format to extract query domain and type |
| `main()` | Entry point, argument parsing, event loop |

### ubus Module (classifi_ubus.c)

| Function | Purpose |
|----------|---------|
| `classifi_ubus_init()` | Register ubus object |
| `discover_interfaces_from_uci()` | Scan UCI for LAN interfaces |
| `reload_config()` | Hot reload interface and rule configuration |
| `rules_load_from_uci()` | Load custom action rules from UCI |
| `rules_free()` | Free rule list and compiled regex |
| `classifi_reload_config_handler()` | ubus reload_config method handler |
| `classifi_status_handler()` | ubus status method handler |
| `classifi_get_flows_handler()` | ubus get_flows method handler |
| `flow_to_blob()` | Serialize single flow to blobmsg for get_flows |

### PCAP Module (classifi_pcap.c)

| Function | Purpose |
|----------|---------|
| `transport_ports_extract()` | Extract TCP/UDP ports from transport header |
| `parse_packet_libpcap()` | Extract flow key from Ethernet frame |
| `pcap_packet_handler()` | Process captured packet (libpcap callback) |
| `run_pcap_mode()` | Live packet capture using libpcap |
| `print_flow_summary()` | Display final flow statistics (replay mode) |
| `run_pcap_replay()` | Offline analysis of PCAP files |

### PCAPng Dump Module (classifi_dump.c)

| Function | Purpose |
|----------|---------|
| `dump_open()` | Open PCAPng file, write section header |
| `dump_add_interface()` | Add interface description block |
| `dump_write_packet()` | Write enhanced packet block |
| `dump_close()` | Flush and close dump file |

## Flow Lifecycle

1. **NEW** - First packet creates flow in BPF map, sampled immediately
2. **SAMPLING** - Packets 2-50 sampled while state=NEW
3. **SAMPLED** - After 50 packets, state transitions, no more sampling
4. **CLASSIFIED** - nDPI finalizes detection (state=CLASSIFIED or MONITORING)
5. **EXPIRED** - Flow removed after 30s idle or 60s absolute

**Timeouts** (`classifi.h` constants):
```c
#define FLOW_IDLE_TIMEOUT 30       // Seconds before idle flow expires
#define FLOW_ABSOLUTE_TIMEOUT 60   // Max flow lifetime
#define CLEANUP_INTERVAL 30        // How often cleanup runs
```

## Metadata Extraction Pipeline

When nDPI processes a packet, `flow_update_metadata()` extracts all available metadata from the nDPI flow context:

1. **TCP fingerprint** - From `flow->tcp.fingerprint` (SYN packet TCP options)
2. **OS hint** - From `flow->tcp.os_hint` via `ndpi_print_os_hint()`
3. **JA4 fingerprint** - From `flow->protos.tls_quic.ja4_client` (TLS ClientHello)
4. **JA4 client lookup** - Fingerprint matched against protos.txt database
5. **nDPI fingerprint** - From `flow->ndpi.fingerprint`
6. **Protocol stack** - From `protocol.protocol_stack.protos[]`
7. **Risk assessment** - From `flow->risk` via `ndpi_risk2score()`
8. **Multimedia types** - From `flow->flow_multimedia_types`
9. **Detection method** - From `flow->confidence` via `ndpi_confidence_get_name()`

Each metadata field is extracted only once (on first availability) to avoid overwriting.

## nDPI Configuration

Configured in `setup_ndpi()` in classifi.c:

```c
ndpi_set_config(ndpi, NULL, "tcp_ack_payload_heuristic", "enable");
ndpi_set_config(ndpi, NULL, "packets_limit_per_flow", "50");
ndpi_set_config(ndpi, "tls", "application_blocks_tracking", "enable");
ndpi_set_config(ndpi, "dns", "subclassification", "enable");
ndpi_set_config(ndpi, NULL, "fully_encrypted_heuristic", "enable");
ndpi_set_config(ndpi, "tls", "dpi.heuristics", "0x07");
ndpi_set_config(ndpi, NULL, "lru.tls_cert.size", "4096");
ndpi_set_config(ndpi, NULL, "lru.stun.size", "4096");
ndpi_set_config(ndpi, NULL, "lru.fpc_dns.size", "4096");
ndpi_set_config(ndpi, "any", "ip_list.load", "enable");
ndpi_set_config(ndpi, NULL, "dpi.guess_ip_before_port", "enable");
ndpi_set_config(ndpi, NULL, "hostname_dns_check", "1");
ndpi_set_config(ndpi, NULL, "metadata.tcp_fingerprint", "1");
ndpi_set_config(ndpi, "tls", "blocks_analysis", "1");
ndpi_set_config(ndpi, NULL, "metadata.ndpi_fingerprint", "enable");
ndpi_set_config(ndpi, NULL, "metadata.ndpi_fingerprint_format", "1");
```

## UCI Configuration

**Config file:** `/etc/config/classifi`

**Default configuration** (files/classifi.defaults):
```
config classifi 'config'
    option discover '1'
    option enabled '1'
```

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | bool | 1 | Enable/disable service |
| discover | bool | 1 | Auto-discover LAN interfaces from UCI |
| interface | list | - | Manual interface list (when discover=0) |

**Manual interface configuration:**
```
config classifi 'config'
    option discover '0'
    option enabled '1'
    list interface 'br-lan'
    list interface 'br-guest'
```

**Custom action rules** (see [Custom Action Rules](#custom-action-rules) section):
```
config rule 'example'
    option enabled '1'
    option name 'rule_name'
    option dst_ip '192.168.1.1'       # or use host_header instead
    option dst_port '8080'
    option protocol 'tcp'
    option pattern 'regex pattern with (capture groups)'
    option script '/path/to/handler.sh'

config rule 'hostname_example'
    option enabled '1'
    option name 'cdn_rule'
    option host_header 'api.example.com'
    option dst_port '443'
    option protocol 'tcp'
    option pattern 'POST /api/v1/([a-z]+)'
```

## Init Script

**File:** `files/classifi.init`

**Key behavior:**
1. Only runs in "router" operating mode (line 18)
2. Checks `enabled` option (line 23-24)
3. If `discover=1`, uses `-d` flag (line 29-30)
4. Otherwise, builds `-i` arguments from interface list (line 32)
5. Falls back to `br-lan` if no interfaces specified (line 33-34)

**Service triggers:**
- Reloads on network configuration changes (`service_triggers()`)

## Event Loop Integration

The daemon uses libubox uloop for event handling:

**Ring buffer fd** (classifi.c in `main()`):
```c
ctx.ringbuf_uloop_fd.fd = rb_epoll_fd;
ctx.ringbuf_uloop_fd.cb = ringbuf_fd_cb;
uloop_fd_add(&ctx.ringbuf_uloop_fd, ULOOP_READ);
```

**Cleanup timer** (30s interval):
```c
ctx.cleanup_timer.cb = cleanup_timer_cb;
uloop_timeout_set(&ctx.cleanup_timer, CLEANUP_INTERVAL * 1000);
```

**Stats timer** (10s interval):
```c
ctx.stats_timer.cb = stats_timer_cb;
uloop_timeout_set(&ctx.stats_timer, 10 * 1000);
```

## Runtime Modes

**eBPF Mode** (default):
```bash
classifi -i br-lan /usr/lib/bpf/classifi.bpf.o
classifi -d /usr/lib/bpf/classifi.bpf.o   # auto-discover
```

**eBPF Mode with PCAPng Dump** (write sampled packets to file):
```bash
classifi -i br-lan -w /tmp/capture.pcapng /usr/lib/bpf/classifi.bpf.o
```

**libpcap Mode** (slower, single interface only):
```bash
classifi -p -i eth0
```

**PCAP Replay Mode** (offline analysis):
```bash
classifi -r capture.pcap
```

**Command-line Options:**
| Option | Description |
|--------|-------------|
| `-h, --help` | Display usage information |
| `-i, --interface <name>` | Interface to monitor (repeatable) |
| `-d, --discover` | Auto-discover LAN interfaces from UCI |
| `-v, --verbose` | Detailed per-packet logging |
| `-s, --stats` | Periodic statistics every 10 seconds |
| `-p, --pcap` | Use libpcap instead of eBPF |
| `-w, --write <file>` | Write packet samples to PCAPng file (eBPF mode only) |
| `-r, --read <file>` | Replay packets from PCAP file for offline analysis |

## Source Code Reference Map

| Component | File | Lines | Description |
|-----------|------|-------|-------------|
| BPF program | classifi.bpf.c | 267 | Kernel-space flow tracking |
| BPF structures | classifi_bpf.h | 130 | Shared data structures |
| Main daemon | classifi.c | 1972 | Userspace classifier |
| Daemon structures | classifi.h | 229 | Userspace data structures |
| ubus service | classifi_ubus.c | 617 | ubus methods and UCI discovery |
| ubus API | classifi_ubus.h | 25 | ubus function declarations |
| PCAP mode | classifi_pcap.c | 352 | libpcap capture and replay |
| PCAP API | classifi_pcap.h | 22 | pcap function declarations |
| PCAPng dump | classifi_dump.c | 293 | PCAPng file writer |
| Dump API | classifi_dump.h | 27 | dump writer declarations |
| Init script | classifi.init | 60 | procd service management |
| UCI defaults | classifi.defaults | 28 | Default configuration |

## Performance Considerations

- **CPU**: <1% overhead for typical traffic
- **Memory**: ~15 MB (8192 flows + 1MB ringbuf + JA4 table)
- **Latency**: <5 seconds classification time
- **Capacity**: 8192 concurrent flows, 8 interfaces

### Memory Usage Estimates

**Per Flow**:
- Kernel (flow_map): 40 + 56 = 96 bytes
- Userspace (struct ndpi_flow): ~360 bytes
- nDPI context: ~1024 bytes
- **Total**: ~1480 bytes/flow

**8192 Flows**:
- Kernel: 786 KB
- Userspace: 11.8 MB
- **Total**: ~12.6 MB

**Ring Buffer**: 1 MB
- Each packet_sample: ~8256 bytes (64 byte header + 8192 data)
- Capacity: ~120 samples in flight

**JA4 Lookup Table**: Variable (depends on protos.txt size)
- Per entry: ~112 bytes (avl_node + fingerprint + client)

**Grand Total**: ~15 MB (with typical JA4 table)

## Hardware Flow Offload Incompatibility

**Problem**: Hardware flow offload bypasses kernel after connection established, preventing eBPF from capturing samples needed for classification.

**Solutions**:

1. **Disable flow offload** (complete classification):
   ```bash
   uci set firewall.@defaults[0].flow_offloading='0'
   uci commit firewall
   fw4 reload
   ```

2. **Keep flow offload enabled** (accept partial classification):
   - No configuration needed
   - Short flows: Classified successfully
   - Long flows: May show "Unknown" if offloaded before 50 packets

## nDPI 5.0 API Changes

**Updated from nDPI 4.14 to 5.0**

### Removed APIs
- `NDPI_PROTOCOL_BITMASK` type
- `NDPI_BITMASK_SET_ALL()` macro
- `ndpi_set_protocol_detection_bitmask2()` function

All protocols are now enabled by default; no bitmask setup required.

### Changed APIs

**`ndpi_finalize_initialization()`**:
- Old: `void ndpi_finalize_initialization(ndpi_struct)`
- New: `int ndpi_finalize_initialization(ndpi_struct)` returns 0 on success

**`ndpi_detection_giveup()`**:
- Old: `ndpi_protocol ndpi_detection_giveup(ndpi, flow, &proto_guessed)`
- New: `ndpi_protocol ndpi_detection_giveup(ndpi, flow)` (2 args)

### New Features

**`ndpi_protocol.state`**: Classification state enum
- `NDPI_STATE_INSPECTING`: Detection ongoing
- `NDPI_STATE_PARTIAL`: Some info extracted
- `NDPI_STATE_MONITORING`: Protocol detected, collecting metadata
- `NDPI_STATE_CLASSIFIED`: Detection complete

**TCP Fingerprint** (`flow->flow->tcp.fingerprint`):
- OS detection based on TCP options
- Enabled via `ndpi_set_config(ndpi, NULL, "metadata.tcp_fingerprint", "1")`

**JA4 Fingerprint** (`flow->protos.tls_quic.ja4_client`):
- TLS client fingerprinting from ClientHello

**nDPI Fingerprint** (`flow->ndpi.fingerprint`):
- Enabled via `ndpi_set_config(ndpi, NULL, "metadata.ndpi_fingerprint", "enable")`

**Detection Confidence** (`flow->confidence`):
- Detection method/confidence via `ndpi_confidence_get_name()`

**Protocol Stack** (`protocol.protocol_stack.protos[]`):
- Multi-layer protocol detection (e.g., IP -> TCP -> TLS -> HTTP)

## Summary

### Core Concepts

1. **Hybrid Architecture**: eBPF (kernel flow tracking) + nDPI (userspace DPI)
2. **Multi-Interface Support**: Up to 8 interfaces, auto-discovery from UCI
3. **Bidirectional Flows**: Canonical 5-tuple, direction tracking
4. **Sampling Strategy**: First 50 packets per flow (8192 bytes each for GRO support)
5. **Zero-Copy Communication**: Ring buffer (1MB) for kernel->userspace
6. **GRO Handling**: `bpf_skb_pull_data()` linearizes coalesced TCP segments
7. **Aggressive Timeouts**: 30s idle, 60s absolute (prevents memory leaks)
8. **ubus Integration**: Real-time events, query API, dynamic config reload
9. **Custom Action Rules**: Regex-based pattern matching with data extraction and script triggers
10. **Offline Analysis**: PCAP replay mode for analyzing packet captures
11. **Packet Capture**: PCAPng dump mode for recording sampled traffic
12. **JA4 Fingerprinting**: TLS client identification via external fingerprint database
13. **Rich Metadata**: TCP FP, JA4, nDPI FP, risk scoring, detection confidence, multimedia types

### Integration Points

- **Input**: Network interfaces via TC ingress/egress hooks, or PCAP files
- **Output**:
  - ubus: `classifi.classified` events (on new classification)
  - ubus: `classifi.dns_query` events (on DNS queries)
  - ubus: `classifi.rule_match` events (on custom rule match)
  - ubus: `status`, `get_flows` methods
  - PCAPng: Packet samples written to file (with `-w` option)
  - Script execution: Custom scripts triggered by rule matches
  - stdout: Debug/stats output
- **Configuration**: UCI (`/etc/config/classifi`), `/etc/classifi/protos.txt` (JA4 database)
- **Dynamic Management**: `ubus call classifi reload_config`
