Param()

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Error "npm nao encontrado."
  exit 1
}

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  Write-Error "cargo nao encontrado (instale Rust toolchain)."
  exit 1
}

npm install
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

npm run tauri:build -- --no-bundle
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

$ReleaseDir = Join-Path $Root "src-tauri\target\release"
$Exe = Get-ChildItem -Path $ReleaseDir -Filter "*.exe" |
  Where-Object { $_.Name -notlike "*setup*" -and $_.Name -notlike "*uninstall*" } |
  Select-Object -First 1

if (-not $Exe) {
  Write-Error "Executavel .exe nao encontrado em src-tauri\\target\\release."
  exit 1
}

$PortableDir = Join-Path $Root "dist\portable"
New-Item -ItemType Directory -Path $PortableDir -Force | Out-Null
Copy-Item -Path $Exe.FullName -Destination (Join-Path $PortableDir $Exe.Name) -Force

$ZipPath = Join-Path $Root "dist\Exchange_Airdrop_Analyzer_windows_portable.zip"
if (Test-Path $ZipPath) {
  Remove-Item $ZipPath -Force
}

Compress-Archive -Path (Join-Path $PortableDir "*") -DestinationPath $ZipPath
Write-Host "Artefato gerado: $ZipPath"
