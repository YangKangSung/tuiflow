# Windows counterpart of fetch-plugins.sh: download the Business Text plugin into
# grafana/plugins/ from the host (which trusts the corporate proxy CA), so the
# Grafana container never has to reach grafana.com. Falls back to the GitHub
# release asset when grafana.com is blocked.
#
#   .\grafana\fetch-plugins.ps1            # latest from grafana.com
#   .\grafana\fetch-plugins.ps1 -Version 6.3.0
param(
  [string]$Version = "latest",
  [string]$GitHubFallbackTag = "v6.1.0"
)
$ErrorActionPreference = "Stop"
$id = "marcusolsson-dynamictext-panel"
$dest = Join-Path $PSScriptRoot "plugins"
$zip = Join-Path $env:TEMP "$id.zip"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$sources = @(
  "https://grafana.com/api/plugins/$id/versions/$Version/download",
  "https://github.com/VolkovLabs/business-text/releases/download/$GitHubFallbackTag/$id-$($GitHubFallbackTag.TrimStart('v')).zip"
)
$ok = $false
foreach ($url in $sources) {
  try {
    Write-Host "fetching $url"
    Invoke-WebRequest -UseBasicParsing -Uri $url -OutFile $zip -MaximumRedirection 5
    $ok = $true; break
  } catch {
    Write-Warning "failed: $($_.Exception.Message)"
  }
}
if (-not $ok) { throw "could not download $id from any source" }

$target = Join-Path $dest $id
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
Expand-Archive -Force $zip $dest
Remove-Item $zip -ErrorAction SilentlyContinue
$ver = (Get-Content (Join-Path $target "plugin.json") -Raw | ConvertFrom-Json).info.version
Write-Host "  -> $target ($ver)"
