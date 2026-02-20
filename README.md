# Exchange Airdrop Analyzer

Exchange Airdrop Analyzer is a desktop app (Tauri + React) that analyzes Backpack `*_position_history.csv` files fully offline.  
It helps users understand trading totals, token estimates, farming cost, break-even, ROI, and sell-plan scenarios with clear, user-friendly summaries.

## Description

Local-first analyzer for airdrop farming performance:
- Import one or more Backpack `position_history` CSV files.
- Add a few manual inputs (`points`, `points gratis`, conversion, token price).
- Get deterministic metrics and a simple diagnosis of farm quality.
- No login, no wallet connect, no seed phrase, no API key.

## Security & Privacy

- 100% local processing (offline-first).
- No telemetry, analytics, or data upload.
- CSV files are not auto-saved by default.
- Only lightweight user inputs may be persisted locally for convenience.

## Download

Builds are published automatically in **Releases** after the CI pipeline finishes.

- Latest release: `https://github.com/<owner>/<repo>/releases/latest`
- Releases page: `https://github.com/<owner>/<repo>/releases`

Artifacts:
- macOS Apple Silicon: `Exchange_Airdrop_Analyzer_macos_aarch64.zip`
- macOS Intel: `Exchange_Airdrop_Analyzer_macos_x64.zip`
- Windows Portable: `Exchange_Airdrop_Analyzer_windows_portable.zip`

## Development

```bash
cd apps/desktop
make install
make dev
```

## Build (local)

```bash
cd apps/desktop
make build-mac
make build-linux
# On Windows
make build-win
```

## CI/CD

Workflow: `.github/workflows/build_desktop.yml`

On manual trigger (`workflow_dispatch`), CI:
1. Builds macOS Apple Silicon (`macos-14`)
2. Builds macOS Intel (`macos-13`)
3. Builds Windows portable (`windows-latest`)
4. Publishes a GitHub Release with all artifacts
