param(
  [string]$Server = "your-server",
  [string]$User = "your-user",
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
mkdir -p $RemoteDir/config
tar -xzf /tmp/leanote-mcp-deploy.tar.gz -C $RemoteDir
cd $RemoteDir
if [ ! -f config/leanote.json ]; then
  cp config/leanote.example.json config/leanote.json
  echo 'Created config/leanote.json — set Leanote baseUrl before starting.'
fi
chmod +x deploy.sh
./deploy.sh
"@

Write-Host "==> Done. Configure Cursor MCP (each user adds their own credentials):"
Write-Host @"
{
  `"mcpServers`": {
    `"leanote`": {
      `"type`": `"http`",
      `"url`": `"http://${Server}:3100/mcp`",
      `"headers`": {
        `"Authorization`": `"Bearer `${env:LEANOTE_TOKEN}`"
      }
    }
  }
}
"@
