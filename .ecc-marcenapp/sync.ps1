$ErrorActionPreference = 'Stop'

$UpstreamRepo = 'affaan-m/ECC'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$PinFile = Join-Path $Root 'UPSTREAM_COMMIT'
$VendorDir = Join-Path $Root 'vendor/ECC'

if (-not (Test-Path $PinFile)) { throw "Missing $PinFile" }
$Pin = (Get-Content $PinFile -Raw).Trim()
if ($Pin -notmatch '^[0-9a-f]{40}$') { throw "Invalid ECC commit pin: $Pin" }

$Commit = Invoke-RestMethod -Uri "https://api.github.com/repos/$UpstreamRepo/commits/$Pin" -Headers @{ 'User-Agent' = 'ECC-MARCENAPP' }
if ($Commit.sha -ne $Pin) { throw "ECC upstream pin verification failed" }

$Temp = Join-Path $env:TEMP ("ecc-marcenapp-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $Temp | Out-Null
try {
  $Archive = Join-Path $Temp 'ecc.zip'
  Invoke-WebRequest -Uri "https://github.com/$UpstreamRepo/archive/$Pin.zip" -OutFile $Archive
  if (Test-Path $VendorDir) { Remove-Item -Recurse -Force $VendorDir }
  New-Item -ItemType Directory -Path $VendorDir | Out-Null
  Expand-Archive -Path $Archive -DestinationPath $Temp -Force
  $Extracted = Get-ChildItem -Path $Temp -Directory | Where-Object { $_.Name -like 'ECC-*' } | Select-Object -First 1
  if (-not $Extracted) { throw 'ECC archive extraction failed' }
  Copy-Item -Recurse -Force (Join-Path $Extracted.FullName '*') $VendorDir
  Set-Content -Path (Join-Path $VendorDir '.upstream-commit') -Value $Pin
  Set-Content -Path (Join-Path $VendorDir '.snapshot-verified') -Value "ECC snapshot verified and vendored at $Pin"
  Write-Host "ECC-MARCENAPP: vendored ECC snapshot $Pin"
  Write-Host 'No upstream branch is tracked; this is a fixed snapshot.'
}
finally {
  Remove-Item -Recurse -Force $Temp -ErrorAction SilentlyContinue
}
