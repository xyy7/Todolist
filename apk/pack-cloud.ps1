param(
    [Parameter(Mandatory = $true)][string]$ProjectPath,
    [string]$HBuilderXPath = "D:\13-HBuilderX.4.76.2025082103\HBuilderX",
    [string]$OutFile = ""
)

# Cloud-pack the HBuilder project with the DCloud cloud certificate.
# This keeps package name plus.H5A9FAE40 and the original signature, so the
# resulting APK can upgrade the app already installed on the phone.
# Requires: HBuilderX is installed, the project is imported, and the DCloud
# account is logged in (HBuilderX -> 登录).

$ErrorActionPreference = "Stop"
if (-not $OutFile) { $OutFile = Join-Path (Split-Path -Parent $PSScriptRoot) "todolist-upgrade.apk" }

$Cli = Join-Path $HBuilderXPath "cli.exe"
if (-not (Test-Path $Cli)) { throw "cli.exe not found: $Cli" }
if (-not (Test-Path (Join-Path $ProjectPath "manifest.json"))) { throw "manifest.json not found in: $ProjectPath" }

Write-Host "Packing with cloud certificate (appid H5A9FAE40)..."
$output = & $Cli pack --project $ProjectPath --platform android `
    --android.packagename plus.H5A9FAE40 --android.androidpacktype 3 2>&1
$output | Write-Host
if ($output -match "user not login") {
    throw "HBuilderX is not logged in. Log in first, then run this script again."
}

# The CLI does not save the new APK locally; it only prints a temporary
# download URL (valid for 5 downloads). Download it directly.
$url = $null
# ASCII-only pattern: Windows PowerShell 5.1 reads this file as ANSI,
# so a Chinese literal here would never match the CLI output.
$text = ($output | Out-String)
if ($text -match "https://app\.liuyingyong\.cn/build/download/\S+") { $url = $Matches[0] }

if ($url) {
    Write-Host "Downloading: $url"
    & curl.exe -L --fail --retry 2 -o $OutFile $url
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $OutFile)) {
        throw "Download failed. Open HBuilderX -> 发行 -> 查看云打包状态 and download manually."
    }
} else {
    $releaseDir = Join-Path $ProjectPath "unpackage\release\apk"
    $apk = Get-ChildItem $releaseDir -Filter *.apk -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if (-not $apk) { throw "No download URL and no APK found under $releaseDir" }
    Copy-Item $apk.FullName $OutFile -Force
}
Write-Host "Output: $OutFile"
Write-Host "Install over the old app: adb install -r `"$OutFile`""
Write-Host "Or copy it to the phone and open it; Android will upgrade in place and keep the data."
