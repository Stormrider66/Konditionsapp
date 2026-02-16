param(
  [int]$Workers = 4,
  [int]$BasePort = 3001,
  [int]$ListenPort = 3000,
  [string]$ListenHost = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

Write-Host "Starting $Workers Next.js workers (next start) + local load balancer..."
Write-Host "  LB:      http://$ListenHost`:$ListenPort"
Write-Host "  Workers: $Workers starting at port $BasePort"

$logDir = Join-Path (Get-Location) "load-tests\\cluster-logs"
if (!(Test-Path $logDir)) {
  New-Item -ItemType Directory -Path $logDir | Out-Null
}
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Start Next.js workers.
for ($i = 0; $i -lt $Workers; $i++) {
  $port = $BasePort + $i
  $title = "konditionstest-next-worker-$port"
  $outFile = Join-Path $logDir ("worker-$port-$stamp.out.txt")
  $errFile = Join-Path $logDir ("worker-$port-$stamp.err.txt")

  $cmd = @"
`$host.ui.RawUI.WindowTitle = '$title'
npm run start -- -p $port
"@

  Start-Process -WindowStyle Minimized -WorkingDirectory (Get-Location) -FilePath "powershell.exe" -RedirectStandardOutput $outFile -RedirectStandardError $errFile -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy", "Bypass",
    "-Command", $cmd
  ) | Out-Null
}

# Wait until all workers accept TCP connections (avoid k6 hitting cold-starts).
$deadline = (Get-Date).AddSeconds(180)
while ($true) {
  $ready = $true
  for ($i = 0; $i -lt $Workers; $i++) {
    $port = $BasePort + $i
    $ok = $false
    try {
      $ok = Test-NetConnection -ComputerName "127.0.0.1" -Port $port -InformationLevel Quiet
    } catch {
      $ok = $false
    }
    if (-not $ok) {
      $ready = $false
      break
    }
  }
  if ($ready) { break }
  if ((Get-Date) -gt $deadline) {
    Write-Warning "Timed out waiting for workers to listen; starting LB anyway."
    break
  }
  Start-Sleep -Seconds 2
}

$ports = @()
for ($i = 0; $i -lt $Workers; $i++) { $ports += ($BasePort + $i) }
$portsCsv = ($ports -join ",")

# Start the load balancer on port 3000.
$lbTitle = "konditionstest-local-lb-$ListenPort"
$lbOutFile = Join-Path $logDir ("lb-$ListenPort-$stamp.out.txt")
$lbErrFile = Join-Path $logDir ("lb-$ListenPort-$stamp.err.txt")
$lbCmd = @"
`$host.ui.RawUI.WindowTitle = '$lbTitle'
`$env:LISTEN_HOST = '$ListenHost'
`$env:LISTEN_PORT = '$ListenPort'
`$env:UPSTREAM_HOST = '127.0.0.1'
`$env:UPSTREAM_PORTS = '$portsCsv'
node scripts/local-lb.js
"@

Start-Process -WindowStyle Normal -WorkingDirectory (Get-Location) -FilePath "powershell.exe" -RedirectStandardOutput $lbOutFile -RedirectStandardError $lbErrFile -ArgumentList @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command", $lbCmd
) | Out-Null

Write-Host ""
Write-Host "Cluster started."
Write-Host "Point k6 BASE_URL to: http://$ListenHost`:$ListenPort"
Write-Host "Logs: $logDir"

