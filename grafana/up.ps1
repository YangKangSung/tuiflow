# Start (or stop) the Grafana stack with Docker Engine running inside WSL —
# no Docker Desktop needed.
#
#   .\grafana\up.ps1          # start, wait until healthy, print the URL
#   .\grafana\up.ps1 -Down    # stop the container
#
# Why the keep-alive: WSL shuts the VM down about a minute after the last
# wsl.exe session exits, which SIGTERMs dockerd and the container (that is
# the "ERR_CONNECTION_REFUSED on :3000" symptom). A hidden `sleep infinity`
# session keeps the VM up until you log off or run -Down.
param(
  [string]$Distro = "Ubuntu-24.04",
  [switch]$Down
)
$ErrorActionPreference = "Stop"
$dir = (wsl -d $Distro -e wslpath -a $PSScriptRoot).Trim()

function Invoke-Wsl([string]$cmd) { wsl -d $Distro -u root -e bash -lc $cmd }

if ($Down) {
  Invoke-Wsl "cd '$dir' && docker compose down"
  Get-CimInstance Win32_Process -Filter "Name = 'wsl.exe'" |
    Where-Object { $_.CommandLine -like "*$Distro*sleep infinity*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
  Write-Host "stopped"
  return
}

if (-not (Test-Path (Join-Path $PSScriptRoot "plugins\marcusolsson-dynamictext-panel"))) {
  & (Join-Path $PSScriptRoot "fetch-plugins.ps1")
}

Invoke-Wsl "systemctl is-active --quiet docker || systemctl start docker"
Invoke-Wsl "cd '$dir' && docker compose up -d"

# keep the WSL VM alive; -Down finds this session by its command line
$alive = Get-CimInstance Win32_Process -Filter "Name = 'wsl.exe'" | Where-Object { $_.CommandLine -like "*$Distro*sleep infinity*" }
if (-not $alive) {
  Start-Process -WindowStyle Hidden -FilePath wsl -ArgumentList "-d $Distro --exec sleep infinity"
}

$url = "http://localhost:3000"
for ($i = 0; $i -lt 45; $i++) {
  try { Invoke-RestMethod "$url/api/health" | Out-Null; break } catch { Start-Sleep -Seconds 2 }
}
Write-Host "Grafana: $url/d/tuiflow-demo/?theme=matrix   (admin / admin)"
Write-Host "Kiosk:   $url/d/tuiflow-demo/?theme=matrix&kiosk"
