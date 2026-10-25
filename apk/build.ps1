<#
.SYNOPSIS
    一键把仓库里的待办事项网页打包成 Android APK（WebView 壳）。

.DESCRIPTION
    需要 JDK 17 和 Android SDK（platforms;android-34、build-tools;34.0.0）。
    默认读取环境变量 JAVA_HOME / ANDROID_SDK_ROOT，也可以用参数指定。

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File apk\build.ps1
    powershell -ExecutionPolicy Bypass -File apk\build.ps1 -JdkPath "C:\jdk17" -SdkPath "C:\android-sdk"
#>
param(
    [string]$JdkPath = $env:JAVA_HOME,
    [string]$SdkPath = $env:ANDROID_SDK_ROOT,
    [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Split-Path -Parent $ScriptDir
if (-not $OutFile) { $OutFile = Join-Path $RepoRoot "todolist.apk" }

function Invoke-Native {
    param([string]$Exe, [string[]]$Arguments)
    & $Exe @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令执行失败（退出码 $LASTEXITCODE）：$Exe $($Arguments -join ' ')"
    }
}

# ---------- 1. 检查工具链 ----------
if (-not $JdkPath) { throw "未找到 JDK：请设置 JAVA_HOME 或用 -JdkPath 指定" }
if (-not $SdkPath) { throw "未找到 Android SDK：请设置 ANDROID_SDK_ROOT 或用 -SdkPath 指定" }

$JavaExe   = Join-Path $JdkPath "bin\java.exe"
$JavacExe  = Join-Path $JdkPath "bin\javac.exe"
$JarExe    = Join-Path $JdkPath "bin\jar.exe"
$KeytoolExe = Join-Path $JdkPath "bin\keytool.exe"
$BuildTools = Join-Path $SdkPath "build-tools\34.0.0"
$AndroidJar = Join-Path $SdkPath "platforms\android-34\android.jar"
$Aapt2     = Join-Path $BuildTools "aapt2.exe"
$ZipAlign  = Join-Path $BuildTools "zipalign.exe"
$ApkSigner = Join-Path $BuildTools "apksigner.bat"

foreach ($tool in @($JavaExe, $JavacExe, $JarExe, $KeytoolExe, $Aapt2, $ZipAlign, $ApkSigner, $AndroidJar)) {
    if (-not (Test-Path $tool)) { throw "缺少工具：$tool" }
}
$env:JAVA_HOME = $JdkPath   # apksigner.bat 需要

# ---------- 2. 准备构建目录 ----------
$WorkDir = Join-Path $env:TEMP "todo-apk-build"
if (Test-Path $WorkDir) { Remove-Item $WorkDir -Recurse -Force }
$AppDir = Join-Path $WorkDir "app"
$AssetsDir = Join-Path $AppDir "assets"
New-Item -ItemType Directory -Force -Path $AppDir, $AssetsDir | Out-Null

Copy-Item (Join-Path $ScriptDir "AndroidManifest.xml") $AppDir
Copy-Item (Join-Path $ScriptDir "src") (Join-Path $AppDir "src") -Recurse
Copy-Item (Join-Path $ScriptDir "res") (Join-Path $AppDir "res") -Recurse

# 网页资源：复制到 assets，并把 CDN 上的 confetti 换成本地文件
foreach ($file in @("index.html", "style.css", "app.js")) {
    Copy-Item (Join-Path $RepoRoot $file) $AssetsDir
}
Copy-Item (Join-Path $ScriptDir "vendor\confetti.browser.min.js") $AssetsDir

$htmlPath = Join-Path $AssetsDir "index.html"
$html = [System.IO.File]::ReadAllText($htmlPath, [System.Text.Encoding]::UTF8)
$html = $html -replace 'https://cdn\.jsdelivr\.net/npm/canvas-confetti@1\.6\.0/dist/confetti\.browser\.min\.js', 'confetti.browser.min.js'
[System.IO.File]::WriteAllText($htmlPath, $html, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "[1/6] 资源已准备：$AssetsDir"

# ---------- 3. 编译 Java ----------
$ClassesDir = Join-Path $WorkDir "classes"
$DexDir = Join-Path $WorkDir "dex"
New-Item -ItemType Directory -Force -Path $ClassesDir, $DexDir | Out-Null

$sourceFiles = Get-ChildItem (Join-Path $AppDir "src") -Recurse -Filter *.java | ForEach-Object { $_.FullName }
$javacArgs = @("--release", "8", "-encoding", "UTF-8", "-cp", $AndroidJar, "-d", $ClassesDir)
$javacArgs += $sourceFiles

Invoke-Native $JavacExe $javacArgs
Write-Host "[2/6] Java 编译完成"

# ---------- 4. 生成 classes.dex ----------
$classFiles = Get-ChildItem $ClassesDir -Recurse -Filter *.class | ForEach-Object { $_.FullName }
$d8Args = @("-cp", (Join-Path $BuildTools "lib\d8.jar"), "com.android.tools.r8.D8",
            "--lib", $AndroidJar, "--min-api", "21", "--output", $DexDir)
$d8Args += $classFiles
Invoke-Native $JavaExe $d8Args
Write-Host "[3/6] classes.dex 生成完成"

# ---------- 5. 打包资源并合并 ----------
$ResZip = Join-Path $WorkDir "resources.zip"
$BaseApk = Join-Path $WorkDir "base.apk"
$AlignedApk = Join-Path $WorkDir "aligned.apk"

Invoke-Native $Aapt2 @("compile", "--dir", (Join-Path $AppDir "res"), "-o", $ResZip)
Invoke-Native $Aapt2 @("link", "-o", $BaseApk,
                       "--manifest", (Join-Path $AppDir "AndroidManifest.xml"),
                       "-I", $AndroidJar,
                       "-A", $AssetsDir,
                       "--auto-add-overlay", $ResZip)
Invoke-Native $JarExe @("uf", $BaseApk, "-C", $DexDir, "classes.dex")
Invoke-Native $ZipAlign @("-f", "4", $BaseApk, $AlignedApk)
Write-Host "[4/6] APK 打包完成"

# ---------- 6. 签名 ----------
$Keystore = Join-Path $ScriptDir "keystore.jks"
if (-not (Test-Path $Keystore)) {
    Write-Host "      首次构建，正在生成签名证书（保存在 apk\keystore.jks，请勿删除）"
    Invoke-Native $KeytoolExe @("-genkeypair", "-keystore", $Keystore, "-alias", "todolist",
                               "-storepass", "todolist", "-keypass", "todolist",
                               "-keyalg", "RSA", "-keysize", "2048", "-validity", "10000",
                               "-dname", "CN=TodoList, O=WorkNLP, C=CN")
}

if (Test-Path $OutFile) { Remove-Item $OutFile -Force }
Invoke-Native $ApkSigner @("sign", "--ks", $Keystore, "--ks-pass", "pass:todolist",
                           "--key-pass", "pass:todolist", "--out", $OutFile, $AlignedApk)
Invoke-Native $ApkSigner @("verify", $OutFile)
Write-Host "[5/6] 签名完成"
Write-Host "[6/6] 输出：$OutFile"
Write-Host "安装：adb install `"$OutFile`""
