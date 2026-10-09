param(
  [string]$Destination = (Join-Path $env:LOCALAPPDATA 'Programs\Inflow'),
  [string]$ShortcutDirectory = (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
)

$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot 'Inflow-win32-x64'
if (-not (Test-Path -LiteralPath (Join-Path $source 'Inflow.exe'))) {
  throw 'Keep install-desktop.ps1 beside the packaged Inflow-win32-x64 folder.'
}
$target = [IO.Path]::GetFullPath($Destination)
if (Test-Path -LiteralPath $target) {
  throw 'Choose an empty installation directory. Close Inflow and remove the old application folder before reinstalling; learning data remains in AppData\Roaming\Inflow.'
}
New-Item -ItemType Directory -Path $target | Out-Null
Get-ChildItem -LiteralPath $source | Copy-Item -Destination $target -Recurse
New-Item -ItemType Directory -Path $ShortcutDirectory -Force | Out-Null
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $ShortcutDirectory 'Inflow.lnk'))
$shortcut.TargetPath = Join-Path $target 'Inflow.exe'
$shortcut.WorkingDirectory = $target
$shortcut.Save()
Write-Output "Installed Inflow at $target. Open Inflow from the Start menu; prepare models in Settings."
