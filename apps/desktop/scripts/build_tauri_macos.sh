#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "build_tauri_macos.sh precisa rodar no macOS." >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo nao encontrado (instale Rust toolchain)." >&2
  exit 1
fi

npm install
npm run tauri:build -- --bundles app

APP_PATH="$(find src-tauri/target/release/bundle/macos -maxdepth 1 -name '*.app' | head -n 1)"
if [[ -z "$APP_PATH" ]]; then
  echo "App macOS nao encontrado apos build." >&2
  exit 1
fi

mkdir -p dist
ZIP_PATH="dist/Exchange_Airdrop_Analyzer_macos.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP_PATH" "$ZIP_PATH"

echo "Artefato gerado: $ZIP_PATH"
