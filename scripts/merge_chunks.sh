#!/usr/bin/env bash
# Joins the muted chunks of each target and adds the mixed soundtrack.
# usage: bash scripts/merge_chunks.sh <job.json>   (chunks in out/chunks/)
set -euo pipefail
JOB="$1"
ID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['id'])" "$JOB")
for target in $(ls out/chunks | sed -E 's/-[0-9]+\.mp4$//' | sort -u); do
  ls out/chunks/${target}-*.mp4 | sort | sed "s|^|file '$PWD/|;s|$|'|" > out/chunks/${target}.txt
  python3 scripts/mix_audio.py "$JOB" "$target" "out/chunks/${target}.m4a"
  name="${ID}-${target}"
  ffmpeg -y -loglevel error -f concat -safe 0 -i out/chunks/${target}.txt -i out/chunks/${target}.m4a -map 0:v -map 1:a -c:v copy -c:a copy -shortest -movflags +faststart "out/${name}.mp4"
  echo "out/${name}.mp4 $(ffprobe -v error -show_entries format=duration -of csv=p=0 out/${name}.mp4) s"
done
