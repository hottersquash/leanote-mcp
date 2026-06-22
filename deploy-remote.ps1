param(
  [string]$Server = "192.168.2.150",
  [string]$User = "root",
  [string]$RemoteDir = "/opt/leanote-mcp"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "==> Packaging leanote-mcp for $User@${Server}:$RemoteDir"

$archive = Join-Path $env:TEMP "leanote-mcp-deploy.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

tar -czf $archive `
  --exclude=node_modules `
  --exclude=dist `
  --exclude=.git `
  -C $ProjectRoot .

Write-Host "==> Uploading archive..."
scp $archive "${User}@${Server}:/tmp/leanote-mcp-deploy.tar.gz"

Write-Host "==> Running remote deploy..."
ssh "${User}@${Server}" @"
set -e
sudo mkdir -p $RemoteDir
sudo tar -xzf /tmp/leanote-mcp-deploy.tar.gz -C $RemoteDir
cd $RemoteDir
if [ ! -f .env ]; then
  cp .env.example .env
  echo 'Please edit $RemoteDir/.env with Leanote credentials'
fi
chmod +x deploy.sh
./deploy.sh
"@

Write-Host "==> Done. Configure Cursor MCP:"
Write-Host @"
{
  `"mcpServers`": {
    `"leanote`": {
      `"type`": `"http`",
      `"url`": `"http://${Server}:3100/mcp`"
    }
  }
}
"@
