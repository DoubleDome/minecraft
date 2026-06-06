<#
.SYNOPSIS
    Copy the live Minecraft server config into the repo's server-config/ folder,
    scrubbing secrets. The live server is the source of truth; this keeps the
    tracked snapshot current.

.DESCRIPTION
    Copies a fixed allow-list of config files from the live server directory into
    server-config/. server.properties is read, its secret fields are blanked, and
    it is written back out (UTF-8, no BOM, original line endings preserved). All
    other files are copied byte-for-byte.

    Deliberately does NOT copy usercache.json, world/, logs/, crash-reports/,
    server.jar, versions/, or libraries/.

.PARAMETER ServerDir
    Path to the live server directory. Defaults to the live box.

.EXAMPLE
    powershell -File scripts/sync-config.ps1
    powershell -File scripts/sync-config.ps1 -ServerDir "D:\some-other-server"
#>
param(
    [string]$ServerDir = "D:\jakarta-vanilla-26.1.2"
)

$ErrorActionPreference = 'Stop'

# Repo's server-config/ sits next to this script's parent (scripts/ -> repo root).
$RepoRoot  = Split-Path -Parent $PSScriptRoot
$DestDir   = Join-Path $RepoRoot 'server-config'

if (-not (Test-Path $ServerDir)) {
    throw "Server directory not found: $ServerDir"
}
if (-not (Test-Path $DestDir)) {
    New-Item -ItemType Directory -Path $DestDir | Out-Null
}

# Files copied verbatim (no secrets).
$plainFiles = @(
    'start-server.bat',
    'eula.txt',
    'ops.json',
    'whitelist.json',
    'banned-players.json',
    'banned-ips.json'
)

# Secret keys in server.properties to blank out (value cleared, key kept).
$secretKeys = @(
    'management-server-secret',
    'rcon.password',
    'management-server-tls-keystore-password'
)

$copied = 0

# --- server.properties: copy + scrub ---
$propsSrc = Join-Path $ServerDir 'server.properties'
if (Test-Path $propsSrc) {
    $raw = Get-Content -Path $propsSrc -Raw   # -Raw preserves exact line endings
    foreach ($key in $secretKeys) {
        $escaped = [regex]::Escape($key)
        $raw = $raw -replace "(?m)^$escaped=.*$", "$key="
    }
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Join-Path $DestDir 'server.properties'), $raw, $utf8NoBom)
    Write-Host "Synced (scrubbed): server.properties" -ForegroundColor Green
    $copied++
} else {
    Write-Warning "Missing: server.properties"
}

# --- plain files: copy verbatim ---
foreach ($name in $plainFiles) {
    $src = Join-Path $ServerDir $name
    if (Test-Path $src) {
        Copy-Item -Path $src -Destination (Join-Path $DestDir $name) -Force
        Write-Host "Synced: $name" -ForegroundColor Green
        $copied++
    } else {
        Write-Warning "Missing (skipped): $name"
    }
}

Write-Host ""
Write-Host "Done. $copied file(s) synced into server-config/." -ForegroundColor Cyan
Write-Host "Review the diff and commit:  git -C `"$RepoRoot`" diff -- server-config" -ForegroundColor Cyan
