#!/usr/bin/env bash
# Detached watcher for the Preprod deploy. Survives harness task reaping (run via setsid).
# Appends a status line to logs/preprod-watch.log every 90s and a sentinel on completion.
cd /mnt/d/midnight-hackathon/cli || exit 1
L=logs/preprod-detached.log
W=logs/preprod-watch.log
echo "watch-start $(date -u +%H:%M:%S)" >> "$W"
while true; do
  ts=$(date -u +%H:%M:%S)
  rss=$(ps -eo rss,args | awk '/preprod\.ts/ && /--max-old-space/{print int($1/1024)}' | sort -rn | head -1)
  if [ -z "$rss" ]; then echo "$ts WATCH_NODE_DIED" >> "$W"; break; fi
  ph=$(grep -aoE 'Contract   : [a-f0-9]{6}|Proving|: . VERIFIED|card data written|Deploying' "$L" 2>/dev/null | tail -1)
  echo "$ts rss=${rss}MiB ${ph}" >> "$W"
  if grep -qa 'card data written' "$L" 2>/dev/null; then echo "$ts WATCH_DONE_OK" >> "$W"; break; fi
  if grep -qaE 'FATAL|out of memory|heap limit' "$L" 2>/dev/null; then echo "$ts WATCH_DONE_ERR" >> "$W"; break; fi
  sleep 90
done
