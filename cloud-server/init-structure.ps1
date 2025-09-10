# init-structure.ps1
# Creates the modular folder structure and empty files for your cloud-server project.

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Root folder name (change if you want a different name)
$Root = "cloud-server"

function New-Dir($path) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path | Out-Null
        Write-Host "Created directory: $path"
    }
}

function New-EmptyFile($path) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType File -Path $path | Out-Null
        Write-Host "Created file: $path"
    } else {
        Write-Host "Exists, skipping file: $path"
    }
}

# --- Directories ---
$dirs = @(
    "$Root",
    "$Root/src",
    "$Root/src/config",
    "$Root/src/middlewares",
    "$Root/src/utils",
    "$Root/src/services",
    "$Root/src/routes",
    "$Root/src/queue",
    "$Root/src/workers",
    "$Root/scripts"
)

# --- Files (empty) ---
$files = @(
    # top level
    "$Root/.env",
    "$Root/.env.example",
    "$Root/package.json",
    "$Root/package-lock.json",

    # src root
    "$Root/src/index.js",
    "$Root/src/app.js",

    # config
    "$Root/src/config/index.js",

    # middlewares
    "$Root/src/middlewares/auth.js",
    "$Root/src/middlewares/error.js",

    # utils
    "$Root/src/utils/safePath.js",
    "$Root/src/utils/sanitize.js",
    "$Root/src/utils/mime.js",

    # services
    "$Root/src/services/fsService.js",
    "$Root/src/services/downloadService.js",
    "$Root/src/services/transcodeService.js",

    # routes
    "$Root/src/routes/auth.routes.js",
    "$Root/src/routes/fs.routes.js",
    "$Root/src/routes/remote.routes.js",
    "$Root/src/routes/video.routes.js",

    # queue
    "$Root/src/queue/bull.js",
    "$Root/src/queue/events.js",

    # workers
    "$Root/src/workers/transcode.worker.js",

    # scripts (systemd examples)
    "$Root/scripts/systemd-api.service.example",
    "$Root/scripts/systemd-worker.service.example"
)

# Create everything
foreach ($d in $dirs) { New-Dir $d }
foreach ($f in $files) { New-EmptyFile $f }

Write-Host "`nAll set! Folder structure and empty files created under '$Root/'."
