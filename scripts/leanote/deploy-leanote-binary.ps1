param(
  [string]$Server = "leanote-server",
  [string]$Proxy = "http://127.0.0.1:7890",
  [string]$LeanoteVersion = "2.6.1",
  [string]$MongoVersion = "4.0.28",
  [switch]$SkipDownload,
  [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)
$CacheDir = Join-Path $ProjectRoot ".cache\leanote-deploy"
$StagingRemote = "/tmp/leanote-binary-deploy"

# Leanote binary: official link from GitHub release page (hosted on SourceForge)
$LeanoteFile = "leanote-linux-amd64-v${LeanoteVersion}.bin.tar.gz"
$LeanoteUrl = "https://downloads.sourceforge.net/project/leanote-bin/$LeanoteVersion/$LeanoteFile"

# MongoDB: official tarball (compatible with Leanote 2.x)
$MongoFile = "mongodb-linux-x86_64-${MongoVersion}.tgz"
$MongoUrl = "https://fastdl.mongodb.org/linux/$MongoFile"

New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null

function Set-DownloadProxy {
  $env:HTTP_PROXY = $Proxy
  $env:HTTPS_PROXY = $Proxy
  $env:ALL_PROXY = $Proxy
  Write-Host "Proxy: $Proxy"
}

function Download-File {
  param([string]$Url, [string]$OutFile, [switch]$UseProxy)
  if (Test-Path $OutFile) {
    $size = (Get-Item $OutFile).Length
    if ($size -gt 1MB) {
      Write-Host "  cached: $(Split-Path -Leaf $OutFile) ($([math]::Round($size/1MB,1)) MB)"
      return
    }
    Remove-Item $OutFile -Force
  }
  Write-Host "  downloading: $Url"
  if ($UseProxy) {
    Set-DownloadProxy
  } else {
    Remove-Item Env:HTTP_PROXY, Env:HTTPS_PROXY, Env:ALL_PROXY -ErrorAction SilentlyContinue
  }
  curl.exe -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) leanote-deploy" `
    --connect-timeout 30 --retry 3 --retry-delay 2 `
    -o $OutFile $Url
  if (-not (Test-Path $OutFile) -or (Get-Item $OutFile).Length -lt 1MB) {
    throw "Download failed or file too small: $OutFile"
  }
}

Write-Host "==> Leanote binary deploy -> $Server"
Write-Host "    Mongo:  /home/byan/mongo"
Write-Host "    Leanote: /home/byan/leanote"
Write-Host ""

if (-not $SkipDownload) {
  Write-Host "==> Downloading ..."
  Download-File -Url $LeanoteUrl -OutFile (Join-Path $CacheDir $LeanoteFile) -UseProxy
  Download-File -Url $MongoUrl -OutFile (Join-Path $CacheDir $MongoFile)
  Write-Host "    cache: $CacheDir"
}

$leanoteLocal = Join-Path $CacheDir $LeanoteFile
$mongoLocal = Join-Path $CacheDir $MongoFile
if (-not (Test-Path $leanoteLocal)) { throw "Missing $leanoteLocal (run without -SkipDownload)" }
if (-not (Test-Path $mongoLocal)) { throw "Missing $mongoLocal (run without -SkipDownload)" }

if (-not $SkipUpload) {
  Write-Host "==> Uploading to ${Server}:${StagingRemote} ..."
  ssh $Server "mkdir -p $StagingRemote"
  scp $leanoteLocal "${Server}:${StagingRemote}/"
  scp $mongoLocal "${Server}:${StagingRemote}/"
  scp (Join-Path $ScriptDir "install-leanote-binary.sh") "${Server}:${StagingRemote}/"
  scp (Join-Path $ScriptDir "start.sh") "${Server}:${StagingRemote}/"

  Write-Host "==> Running remote install (removes old /home/byan/leanote, migrates DB if present) ..."
  ssh $Server @"
set -e
chmod +x $StagingRemote/install-leanote-binary.sh $StagingRemote/start.sh
STAGING=$StagingRemote bash $StagingRemote/install-leanote-binary.sh
"@

  Write-Host ""
  Write-Host "==> Done."
  Write-Host "    Leanote:  http://192.168.2.150:9002"
  Write-Host "    MCP config baseUrl: http://192.168.2.150:9002"
  Write-Host "    SSH manage: ssh $Server '/home/byan/start.sh status'"
}
