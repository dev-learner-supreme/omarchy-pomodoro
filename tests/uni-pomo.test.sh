#!/bin/bash
# Tests for uni-pomo get/set against a temporary config (never touches the real shell.json).
set -uo pipefail
here=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
export UNI_POMO_CONFIG="$tmp/shell.json"
fail=0
check() { # name expected actual
  if [[ "$2" == "$3" ]]; then echo "ok   $1"; else echo "FAIL $1: expected [$2] got [$3]"; fail=1; fi
}
echo '{"bar":{"center":[{"id":"techywilbur.pomodoro","dnd":false,"focus":50,"overlay":true,"name":"x"}]}}' >"$UNI_POMO_CONFIG"
check "get false boolean"  "false" "$("$here/uni-pomo" get dnd)"
check "get true boolean"   "true"  "$("$here/uni-pomo" get overlay)"
check "get number"         "50"    "$("$here/uni-pomo" get focus)"
check "get string"         "x"     "$("$here/uni-pomo" get name)"
check "get missing key"    ""      "$("$here/uni-pomo" get nothere)"
"$here/uni-pomo" set dnd true >/dev/null
check "set then get"       "true"  "$("$here/uni-pomo" get dnd)"
"$here/uni-pomo" set overlay false >/dev/null
check "set false then get" "false" "$("$here/uni-pomo" get overlay)"
"$here/uni-pomo" set idleAfter 10 >/dev/null
check "set new number"     "10"    "$("$here/uni-pomo" get idleAfter)"
"$here/uni-pomo" set presets '[15,30]' >/dev/null
check "set array"          "[15,30]" "$("$here/uni-pomo" get presets | jq -c .)"
check "set repeated"       "10"    "$("$here/uni-pomo" set idleAfter 10 >/dev/null; "$here/uni-pomo" get idleAfter)"
check "json stays valid"   "ok"    "$(jq -e . "$UNI_POMO_CONFIG" >/dev/null && echo ok)"
exit $fail
