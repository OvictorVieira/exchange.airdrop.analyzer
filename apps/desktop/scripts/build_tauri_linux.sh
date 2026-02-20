#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm nao encontrado." >&2
  exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "cargo nao encontrado (instale Rust toolchain)." >&2
  exit 1
fi

npm install
npm run tauri:build -- --bundles appimage

APPIMAGE_PATH="$(find src-tauri/target/release/bundle/appimage -maxdepth 1 -name '*.AppImage' | head -n 1)"
if [[ -z "$APPIMAGE_PATH" ]]; then
  echo "AppImage nao encontrado apos build." >&2
  exit 1
fi

mkdir -p dist
cp "$APPIMAGE_PATH" dist/

echo "Artefato gerado: dist/$(basename "$APPIMAGE_PATH")"
