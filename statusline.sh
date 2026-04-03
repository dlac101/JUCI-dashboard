#!/usr/bin/env bash
set -euo pipefail

data=$(cat)

model=$(echo "$data" | jq -r '.model.display_name // "unknown"')
cwd=$(echo "$data" | jq -r '.cwd // "?"')
used_pct=$(echo "$data" | jq -r '.context_window.used_percentage // 0')
total_in=$(echo "$data" | jq -r '.context_window.total_input_tokens // 0')
total_out=$(echo "$data" | jq -r '.context_window.total_output_tokens // 0')
total_tokens=$(( total_in + total_out ))

if (( total_tokens >= 1000000 )); then
    tokens_str="$(( total_tokens / 1000000 )).$(( (total_tokens % 1000000) / 100000 ))M"
elif (( total_tokens >= 1000 )); then
    tokens_str="$(( total_tokens / 1000 ))k"
else
    tokens_str="$total_tokens"
fi

used_int=${used_pct%.*}
: "${used_int:=0}"

branch=""
changes=""
if git_branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null); then
    branch="$git_branch"
    added=$(git -C "$cwd" --no-optional-locks diff --numstat 2>/dev/null | awk '{a+=$1; d+=$2} END {printf "%d %d", a+0, d+0}')
    staged=$(git -C "$cwd" --no-optional-locks diff --cached --numstat 2>/dev/null | awk '{a+=$1; d+=$2} END {printf "%d %d", a+0, d+0}')
    a_add=$(echo "$added" | cut -d' ' -f1)
    a_del=$(echo "$added" | cut -d' ' -f2)
    s_add=$(echo "$staged" | cut -d' ' -f1)
    s_del=$(echo "$staged" | cut -d' ' -f2)
    total_add=$(( a_add + s_add ))
    total_del=$(( a_del + s_del ))
    changes="+${total_add},-${total_del}"
fi

# --- Claude OAuth usage stats ---
USAGE_CACHE="$HOME/.claude/.usage_cache.json"
USAGE_TTL=120
CREDS_FILE="$HOME/.claude/.credentials.json"

time_remaining() {
    local reset_at="$1" fmt="${2:-hm}"
    local reset_epoch now_epoch diff

    local clean_ts
    clean_ts=$(echo "$reset_at" | sed 's/\.[0-9]*//; s/:\([0-9][0-9]\)$/\1/')
    reset_epoch=$(date -d "$clean_ts" +%s 2>/dev/null ||
                  date -j -f "%Y-%m-%dT%H:%M:%S%z" "$clean_ts" +%s 2>/dev/null ||
                  date -j -f "%Y-%m-%dT%H:%M:%SZ" "$clean_ts" +%s 2>/dev/null) || return 1
    now_epoch=$(date +%s)
    diff=$(( reset_epoch - now_epoch ))

    if (( diff <= 0 )); then
        echo "now"
        return
    fi

    if [[ "$fmt" == "days" ]]; then
        local tenths=$(( diff * 10 / 86400 ))
        echo "$((tenths / 10)).$((tenths % 10))d"
    else
        local days=$(( diff / 86400 ))
        local hours=$(( (diff % 86400) / 3600 ))
        local mins=$(( (diff % 3600) / 60 ))
        local result=""
        (( days > 0 )) && result+="${days}d "
        printf -v hm '%d:%02d' "$hours" "$mins"
        result+="$hm"
        echo "$result"
    fi
}

cache_stale=1
if [ -f "$USAGE_CACHE" ]; then
    cache_mtime=$(stat -c %Y "$USAGE_CACHE" 2>/dev/null ||
                  stat -f %m "$USAGE_CACHE" 2>/dev/null || echo 0)
    cache_age=$(( $(date +%s) - cache_mtime ))
    (( cache_age < USAGE_TTL )) && cache_stale=0
fi

if (( cache_stale )); then
    (
        token=$(jq -r '.claudeAiOauth.accessToken // empty' "$CREDS_FILE" 2>/dev/null) || true
        if [ -z "$token" ]; then
            token=$(security find-generic-password -s "Claude Code-credentials" -a "$(whoami)" -w 2>/dev/null |
                    jq -r '.claudeAiOauth.accessToken // empty' 2>/dev/null) || true
        fi
        [ -n "$token" ] || exit 0
        resp=$(curl -s --max-time 5 \
            -H "Authorization: Bearer $token" \
            -H "anthropic-beta: oauth-2025-04-20" \
            -H "Accept: application/json" \
            "https://api.anthropic.com/api/oauth/usage" 2>/dev/null) || exit 0
        echo "$resp" | jq -e '.five_hour' &>/dev/null && echo "$resp" > "$USAGE_CACHE"
    ) &>/dev/null &
    disown 2>/dev/null || true
fi

s_int="" w_int="" s_time="" w_time=""
if [ -f "$USAGE_CACHE" ]; then
    s_util=$(jq -r '.five_hour.utilization // empty' "$USAGE_CACHE" 2>/dev/null) || true
    s_reset=$(jq -r '.five_hour.resets_at // empty' "$USAGE_CACHE" 2>/dev/null) || true
    w_util=$(jq -r '.seven_day.utilization // empty' "$USAGE_CACHE" 2>/dev/null) || true
    w_reset=$(jq -r '.seven_day.resets_at // empty' "$USAGE_CACHE" 2>/dev/null) || true

    if [ -n "${s_util:-}" ]; then
        s_int=${s_util%.*}
        : "${s_int:=0}"
        s_time=$(time_remaining "$s_reset" 2>/dev/null) || s_time=""
    fi
    if [ -n "${w_util:-}" ]; then
        w_int=${w_util%.*}
        : "${w_int:=0}"
        w_time=$(time_remaining "$w_reset" days 2>/dev/null) || w_time=""
    fi
fi

# --- Powerline rendering ---

SEP=$'\xee\x82\xb0'
RSEP=$'\xee\x82\xb2'
BRANCH_ICON=$'\xee\x82\xa0'

declare -a seg_text=() seg_bg=() seg_fg=()

severity_colors() {
    local pct=$1 shade=${2:-0}
    if (( pct < 50 )); then
        (( shade )) && echo "28 158" || echo "22 158"
    elif (( pct < 80 )); then
        (( shade )) && echo "136 223" || echo "130 223"
    else
        (( shade )) && echo "160 224" || echo "124 224"
    fi
}

ctx_colors() {
    local pct=$1
    if (( pct < 65 )); then   echo "54 183"
    elif (( pct < 80 )); then echo "94 223"
    else                      echo "89 218"
    fi
}

# Left segments
if [ -n "$branch" ]; then
    seg_text+=(" $BRANCH_ICON $branch $changes ")
    seg_bg+=(24)
    seg_fg+=(255)
fi

seg_text+=(" $model ")
seg_bg+=(236)
seg_fg+=(250)

seg_text+=(" tok: $tokens_str ")
seg_bg+=(238)
seg_fg+=(252)

if [ -n "$s_int" ]; then
    s_label="ses: ${s_int}%"
    [ -n "$s_time" ] && s_label+=" $s_time"
    read sb sf <<< "$(severity_colors "$s_int" 0)"
    seg_text+=(" $s_label ")
    seg_bg+=("$sb")
    seg_fg+=("$sf")
fi

if [ -n "$w_int" ]; then
    w_label="wk: ${w_int}%"
    [ -n "$w_time" ] && w_label+=" $w_time"
    read wb wf <<< "$(severity_colors "$w_int" 1)"
    seg_text+=(" $w_label ")
    seg_bg+=("$wb")
    seg_fg+=("$wf")
fi

# Right segment (context)
read ctx_bg ctx_fg <<< "$(ctx_colors "$used_int")"

# --- Render ---
left_count=${#seg_text[@]}
{
    for (( i=0; i<left_count; i++ )); do
        printf '\033[38;5;%d;48;5;%dm%s' "${seg_fg[$i]}" "${seg_bg[$i]}" "${seg_text[$i]}"
        if (( i < left_count - 1 )); then
            printf '\033[38;5;%d;48;5;%dm%s' "${seg_bg[$i]}" "${seg_bg[$((i+1))]}" "$SEP"
        else
            printf '\033[0m\033[38;5;%dm%s' "${seg_bg[$i]}" "$SEP"
        fi
    done

    printf '\033[0m '
    printf '\033[38;5;%dm%s' "$ctx_bg" "$RSEP"
    printf '\033[38;5;%d;48;5;%dm ctx: %d%% \033[0m' "$ctx_fg" "$ctx_bg" "$used_int"
    printf '\n'

    printf '\033[38;5;245;48;5;234m %s \033[0m\033[38;5;234m%s\033[0m\n' "$cwd" "$SEP"
}
