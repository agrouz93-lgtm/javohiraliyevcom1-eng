param(
    [Parameter(Mandatory=$true)][string]$Jdk,
    [Parameter(Mandatory=$true)][string]$BuildTools,
    [Parameter(Mandatory=$true)][string]$AndroidJar,
    [switch]$SkipWebBuild
)
$ErrorActionPreference = 'Stop'
$Jdk = (Resolve-Path -LiteralPath $Jdk).Path
$BuildTools = (Resolve-Path -LiteralPath $BuildTools).Path
$AndroidJar = (Resolve-Path -LiteralPath $AndroidJar).Path
$project = Split-Path -Parent $PSScriptRoot
$web = Join-Path $project '.apk-web'
$build = Join-Path $PSScriptRoot ('.build/' + [guid]::NewGuid().ToString('N'))
$apk = Join-Path $PSScriptRoot 'USTA-PRO.apk'
$java = Join-Path $Jdk 'bin/java.exe'
$aapt = Join-Path $BuildTools 'aapt2.exe'

function Invoke-BuildTool([string]$Executable, [string[]]$Arguments) {
    & $Executable @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Build step failed: $Executable ($LASTEXITCODE)" }
}

if (!$SkipWebBuild) {
    Push-Location $project
    $prior = $env:USTA_ANDROID_BUILD
    try {
        $env:USTA_ANDROID_BUILD = '1'
        Invoke-BuildTool 'node' @('node_modules/next/dist/bin/next', 'build')
    } finally {
        $env:USTA_ANDROID_BUILD = $prior
        Pop-Location
    }
}
if (!(Test-Path -LiteralPath (Join-Path $web 'index.html'))) { throw 'Missing static Android web build.' }

New-Item -ItemType Directory -Path "$build/classes","$build/dex" -Force | Out-Null
Invoke-BuildTool $aapt @('compile','--dir',"$PSScriptRoot/res",'-o',"$build/resources.zip")
Invoke-BuildTool $aapt @('link','-o',"$build/raw.apk",'-I',$AndroidJar,
    '--manifest',"$PSScriptRoot/AndroidManifest.xml",
    '--version-code','6','--version-name','1.4.0',"$build/resources.zip")
Invoke-BuildTool "$Jdk/bin/javac.exe" @('--release','8','-encoding','UTF-8','-classpath',$AndroidJar,
    '-d',"$build/classes","$PSScriptRoot/src/uz/ustapro/MainActivity.java","$PSScriptRoot/src/uz/ustapro/CameraProvider.java")
$classFiles = @(Get-ChildItem -LiteralPath "$build/classes" -Recurse -Filter '*.class' | ForEach-Object FullName)
Invoke-BuildTool $java (@('-cp',"$BuildTools/lib/d8.jar",'com.android.tools.r8.D8',
    '--lib',$AndroidJar,'--min-api','26','--output',"$build/dex") + $classFiles)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::Open("$build/raw.apk",[IO.Compression.ZipArchiveMode]::Update)
try {
    foreach ($asset in Get-ChildItem -LiteralPath $web -Recurse -File) {
        $relative = $asset.FullName.Substring($web.Length + 1).Replace('\','/')
        [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$asset.FullName,"assets/web/$relative") | Out-Null
    }
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,"$build/dex/classes.dex",'classes.dex') | Out-Null
} finally { $zip.Dispose() }
Invoke-BuildTool "$BuildTools/zipalign.exe" @('-f','4',"$build/raw.apk","$build/aligned.apk")

# Development signing key for local installation and subsequent APK updates.
$key = Join-Path $PSScriptRoot '.build/usta-debug.p12'
if (!(Test-Path -LiteralPath $key)) {
    Invoke-BuildTool "$Jdk/bin/keytool.exe" @('-genkeypair','-keystore',$key,'-storetype','PKCS12',
        '-alias','usta-debug','-storepass','android','-keypass','android','-keyalg','RSA','-keysize','2048',
        '-validity','10000','-dname','CN=USTA PRO Local Build')
}
Invoke-BuildTool $java @('-jar',"$BuildTools/lib/apksigner.jar",'sign','--ks',$key,
    '--ks-pass','pass:android','--ks-key-alias','usta-debug','--out',"$build/signed.apk","$build/aligned.apk")
Invoke-BuildTool $java @('-jar',"$BuildTools/lib/apksigner.jar",'verify','--verbose',"$build/signed.apk")
Invoke-BuildTool "$BuildTools/zipalign.exe" @('-c','4',"$build/signed.apk")
Copy-Item -LiteralPath "$build/signed.apk" -Destination $apk -Force
Get-Item -LiteralPath $apk


