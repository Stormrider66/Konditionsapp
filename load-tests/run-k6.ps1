param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('smoke', 'baseline', 'stress')]
  [string]$Scenario,

  [string]$EnvFile = '',

  # Optional override, otherwise helpers.js defaults to http://localhost:3000
  [string]$BaseUrl = ''
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $EnvFile) {
  $EnvFile = Join-Path $scriptDir '.env.k6'
}

function Set-EnvFromFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Env file not found: $Path"
  }

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if (-not $line) { continue }
    if ($line.StartsWith('#')) { continue }

    $eq = $line.IndexOf('=')
    if ($eq -lt 1) { continue }

    $name = $line.Substring(0, $eq).Trim()
    $value = $line.Substring($eq + 1).Trim()

    # Strip surrounding quotes (simple .env.k6 format)
    if (
      ($value.Length -ge 2) -and
      (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ($name) {
      Set-Item -Path ("env:{0}" -f $name) -Value $value
    }
  }
}

Set-EnvFromFile -Path $EnvFile
if ($BaseUrl) {
  Set-Item -Path env:BASE_URL -Value $BaseUrl
}

$resolvedBaseUrl = if ($env:BASE_URL) { $env:BASE_URL } else { 'http://localhost:3000' }

# On Windows, Next.js often binds only to IPv6 (::). In that case, localhost may resolve
# to 127.0.0.1 and intermittently fail. Prefer IPv6 loopback when BASE_URL targets localhost:3000.
if ($resolvedBaseUrl -match '^https?://localhost:3000/?$') {
  $resolvedBaseUrl = 'http://[::1]:3000'
  Set-Item -Path env:BASE_URL -Value $resolvedBaseUrl
}

$scriptPath = Join-Path $scriptDir ("k6/{0}.js" -f $Scenario)
if (-not (Test-Path -LiteralPath $scriptPath)) {
  throw "k6 script not found: $scriptPath"
}

Write-Host ("Running k6 scenario '{0}' against BASE_URL={1}" -f $Scenario, $resolvedBaseUrl)
& k6 run $scriptPath
exit $LASTEXITCODE

