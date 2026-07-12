#!/usr/bin/env bash
set -euo pipefail

usage() {
  printf 'Usage: %s OUTPUT_PATH [TEXT ...]\n' "${0##*/}" >&2
  printf '       printf %%s TEXT | %s OUTPUT_PATH\n' "${0##*/}" >&2
}

if [[ $# -lt 1 ]]; then
  usage
  exit 64
fi

output_path=$1
shift

if [[ -z ${ELEVENLABS_API_KEY:-} ]]; then
  printf 'Error: ELEVENLABS_API_KEY is not set.\n' >&2
  exit 78
fi

if ! command -v curl >/dev/null 2>&1; then
  printf 'Error: curl is required.\n' >&2
  exit 69
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  printf 'Error: ffmpeg is required.\n' >&2
  exit 69
fi

if [[ $# -gt 0 ]]; then
  text=$*
else
  if [[ -t 0 ]]; then
    usage
    exit 64
  fi
  text=$(cat)
fi

if [[ -z $text ]]; then
  printf 'Error: text must not be empty.\n' >&2
  exit 64
fi

output_dir=$(dirname -- "$output_path")
mkdir -p -- "$output_dir"

# ElevenLabs' Adam voice ID. Override with ELEVENLABS_VOICE_ID.
voice_id=${ELEVENLABS_VOICE_ID:-pNInz6obpgDQGcFmaJgB}
tmp_mp3=$(mktemp "${TMPDIR:-/tmp}/dentassist-voice.XXXXXX.mp3")
tmp_ogg=$(mktemp "${output_dir}/.dentassist-voice.XXXXXX.ogg")
cleanup() {
  rm -f -- "$tmp_mp3" "$tmp_ogg"
}
trap cleanup EXIT

request_body=$(TEXT="$text" python3 - <<'PY'
import json
import os

print(json.dumps({
    "text": os.environ["TEXT"],
    "model_id": "eleven_multilingual_v2",
}))
PY
)

http_code=$(curl --silent --show-error \
  --output "$tmp_mp3" \
  --write-out '%{http_code}' \
  --request POST \
  --url "https://api.elevenlabs.io/v1/text-to-speech/${voice_id}?output_format=mp3_44100_128" \
  --header 'Accept: audio/mpeg' \
  --header 'Content-Type: application/json' \
  --header "xi-api-key: ${ELEVENLABS_API_KEY}" \
  --data-binary "$request_body")

if [[ $http_code != 2* ]]; then
  printf 'Error: ElevenLabs request failed with HTTP %s.\n' "$http_code" >&2
  exit 1
fi

ffmpeg -hide_banner -loglevel error -y \
  -i "$tmp_mp3" \
  -c:a libopus \
  -ac 1 \
  -b:a 64k \
  "$tmp_ogg"

mv -- "$tmp_ogg" "$output_path"
printf '%s\n' "$output_path"
