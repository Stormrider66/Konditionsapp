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

$allPorts = @($ListenPort)
for ($i = 0; $i -lt $Workers; $i++) { $allPorts += ($BasePort + $i) }

# Kill anything already listening on our ports to avoid EADDRINUSE.
foreach ($port in $allPorts) {
  try {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($conn -and $conn.OwningProcess) {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
  } catch {
    # ignore
  }
}

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
# Some production-only env vars are validated on startup (instrumentation hook).
# For local perf testing we set harmless dummy values so workers can boot.
if (-not `$env:STRIPE_SECRET_KEY) { `$env:STRIPE_SECRET_KEY = 'sk_test_dummy' }
if (-not `$env:STRIPE_WEBHOOK_SECRET) { `$env:STRIPE_WEBHOOK_SECRET = 'whsec_dummy' }
if (-not `$env:NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) { `$env:NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_dummy' }
if (-not `$env:NEXT_PUBLIC_APP_URL) { `$env:NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3000' }
if (-not `$env:LOAD_TEST_BYPASS_SECRET) { `$env:LOAD_TEST_BYPASS_SECRET = 'local-k6-bypass-secret' }
if (-not `$env:LOAD_TEST_BYPASS_USER_EMAIL) { `$env:LOAD_TEST_BYPASS_USER_EMAIL = 'henrik.lundholm@gmail.com' }

# Supabase pooler can hard-limit session connections. When we run multiple local workers,
# Prisma's default pool size can exhaust the pool and cause random workers to 500.
# For load tests, cap Prisma connections per worker aggressively.
if (-not `$env:DATABASE_URL) {
  # In many setups, DATABASE_URL is stored in .env.local rather than exported in the shell.
  # Since we need to rewrite it for load tests, we load it here if missing.
  `$envFiles = @('.env.local', '.env.production.local', '.env.production', '.env')
  foreach (`$f in `$envFiles) {
    `$p = Join-Path (Get-Location) `$f
    if (-not (Test-Path `$p)) { continue }
    try {
      `$line = Get-Content `$p -ErrorAction SilentlyContinue | Where-Object { `$_ -match '^DATABASE_URL=' } | Select-Object -First 1
      if (`$line) {
        `$val = `$line.Substring('DATABASE_URL='.Length).Trim()
        if ((`$val.StartsWith('\"') -and `$val.EndsWith('\"')) -or (`$val.StartsWith(\"'\") -and `$val.EndsWith(\"'\"))) {
          `$val = `$val.Substring(1, `$val.Length - 2)
        }
        if (`$val) { `$env:DATABASE_URL = `$val; break }
      }
    } catch {
      # ignore
    }
  }
}
if (`$env:DATABASE_URL) {
  # Prefer transaction pooler over session pooler for load tests.
  # Supabase pooler host stays the same; only the port changes.
  # Session pooler:       5432 (low max clients in session mode)
  # Transaction pooler:   6543 (better for high concurrency + pgbouncer)
  if (`$env:DATABASE_URL -match '\\.pooler\\.supabase\\.com:5432') {
    # Examples:
    # - aws-1-eu-north-1.pooler.supabase.com:5432  -> :6543
    # - pooler.supabase.com:5432                   -> :6543
    `$env:DATABASE_URL = `$env:DATABASE_URL -replace '(\\.pooler\\.supabase\\.com):5432', '`$1:6543'
  }

  # Ensure Prisma uses pgbouncer mode + very small per-process pool.
  if (-not (`$env:DATABASE_URL -match '(^|[?&])pgbouncer=')) {
    # NOTE: In PowerShell `-like '*?*'` treats `?` as a wildcard. Use regex for a literal `?`.
    `$sep = if (`$env:DATABASE_URL -match '\?') { '&' } else { '?' }
    `$env:DATABASE_URL = `$env:DATABASE_URL + `$sep + 'pgbouncer=true'
  }
  if (-not (`$env:DATABASE_URL -match '(^|[?&])connection_limit=')) {
    `$sep = if (`$env:DATABASE_URL -match '\?') { '&' } else { '?' }
    `$env:DATABASE_URL = `$env:DATABASE_URL + `$sep + 'connection_limit=1'
  }
}
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

