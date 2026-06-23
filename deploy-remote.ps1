param(
  [string]$Server = "your-server",
  [string]$User = "your-user",
  [string]$RemoteDir = "/opt/leanote-mcp",
  [ValidateSet("docker", "npm")]
  [string]$DeployMode = "docker"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$DeployScript = if ($DeployMode -eq "npm") { "deploy-npm.sh" } else { "deploy-docker.sh" }

Write-Host "==> Packaging leanote-mcp ($DeployMode) for $User@${Server}:$RemoteDir"

$archive = Join-Path $env:TEMP "leanote-mcp-deploy.tar.gz"
if (Test-Path $archive) { Remove-Item $archive -Force }

tar -czf $archive `
  --exclude=node_modules `
  --exclude=dist `
  --exclude=.git `
  -C $ProjectRoot .

Write-Host "==> Uploading archive..."
scp $archive "${User}@${Server}:/tmp/leanote-mcp-deploy.tar.gz"

Write-Host "==> Running remote deploy ($DeployMode)..."
ssh "${User}@${Server}" @"
set -e
mkdir -p $RemoteDir
tar -xzf /tmp/leanote-mcp-deploy.tar.gz -C $RemoteDir
cd $RemoteDir
chmod +x deploy.sh deploy-docker.sh deploy-npm.sh
./$DeployScript
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
