#!/bin/bash
# 試験の走らせ方:  bash tests/runv.sh 46 45 ...
#
# 前のサーバーを PID ではなく「残っているもの全部」で落とす。
# 1つでも残っていると港を握ったままになり、次のサーバーが起動に失敗して
# 古いデータのまま試験が走る（実際にそれで19件が偽の失敗になった）。
#
# 注意: このスクリプトを呼ぶコマンド行に server.js という文字を入れないこと。
#       下の kill が自分を呼んだシェルごと落とす（実際に3回やった）。
cd "$(dirname "$0")/.."
APP=$(pwd)
OUT=${OUT:-$APP/tests/out}
mkdir -p "$OUT"

kill_servers() {
  python3 - <<'PYK'
import os, signal, subprocess
out = subprocess.run(['ps', '-eo', 'pid,args'], capture_output=True, text=True).stdout
for l in out.splitlines():
    if 'server.js' in l and 'ps -eo' not in l:
        try:
            os.kill(int(l.split()[0]), signal.SIGTERM)
        except Exception:
            pass
PYK
  for i in $(seq 1 20); do
    curl -sS -m 1 http://localhost:3999/api/version >/dev/null 2>&1 || return 0
    sleep 1
  done
  echo "  ::error::港 3999 が空きません"; return 1
}

for n in "$@"; do
  kill_servers || exit 1
  rm -rf "$OUT/data" && mkdir -p "$OUT/data"
  ROSTER_SYNC=off ADMIN_PASS=test-admin-pass DATA_DIR="$OUT/data" PORT=3999 \
    nohup node "$APP/server.js" >/dev/null 2>&1 &
  ok=0
  for i in $(seq 1 20); do
    curl -sS -m 2 http://localhost:3999/api/version >/dev/null 2>&1 && { ok=1; break; }
    sleep 1
  done
  [ "$ok" = "1" ] || { echo "verify$n  サーバーが起きませんでした"; continue; }
  OUT=$OUT NODE_PATH=$(npm root -g) timeout 300 node "$APP/tests/verify$n.js" \
    > "$OUT/r_$n.out" 2>&1
  echo "verify$n exit=$? pass=$(grep -ac '^PASS' "$OUT/r_$n.out") fail=$(grep -ac '^FAIL' "$OUT/r_$n.out")"
done
kill_servers
echo DONE
