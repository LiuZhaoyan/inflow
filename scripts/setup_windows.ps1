[CmdletBinding()]
param(
  [string]$ModelsDir
)

$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if ($projectRoot.StartsWith('\\')) {
  throw 'Windows media setup requires a Windows-local checkout. Conda cannot lock its package cache on the WSL UNC path; copy or clone the repository to a local Windows path and rerun this script.'
}

$environment = Join-Path $projectRoot '.venv-win'
$python = Join-Path $environment 'python.exe'
$venvPython = Join-Path $environment 'Scripts\python.exe'
$cache = Join-Path $projectRoot '.conda-win-cache'

if (Test-Path $python) {
  $runtimePython = $python
} elseif (Test-Path $venvPython) {
  $runtimePython = $venvPython
} else {
  if (Test-Path $environment) {
    throw "$environment exists without a recognized Python executable; inspect it before retrying."
  }
  $conda = Get-Command conda -ErrorAction SilentlyContinue
  if (-not $conda) {
    throw 'Conda was not found. Install/use Miniconda, make conda available in PowerShell, and rerun this script.'
  }
  $condaCommand = if ($conda.Source) { $conda.Source } else { $conda.Name }
  $env:CONDA_PKGS_DIRS = $cache
  & $condaCommand create --yes --prefix $environment --override-channels -c conda-forge python=3.12 pip
  if ($LASTEXITCODE -ne 0) { throw 'Conda could not create the isolated Python 3.12 environment.' }
  $runtimePython = $python
}

$version = & $runtimePython -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($LASTEXITCODE -ne 0 -or $version.Trim() -ne '3.12') {
  throw "The isolated worker environment must use Python 3.12; found $($version.Trim())."
}

if ([string]::IsNullOrWhiteSpace($ModelsDir)) {
  $ModelsDir = Join-Path $projectRoot '.models'
} elseif (-not [IO.Path]::IsPathRooted($ModelsDir)) {
  $ModelsDir = Join-Path $projectRoot $ModelsDir
}
$ModelsDir = [IO.Path]::GetFullPath($ModelsDir)
$env:INFLOW_PYTHON = $runtimePython
$env:INFLOW_MODELS_DIR = $ModelsDir

& $runtimePython -m pip install -r (Join-Path $projectRoot 'scripts\requirements-media.txt')
if ($LASTEXITCODE -ne 0) { throw 'Media dependencies could not be installed in .venv-win.' }

& $runtimePython (Join-Path $projectRoot 'scripts\setup_models.py') --models-dir $ModelsDir
if ($LASTEXITCODE -ne 0) { throw 'Local model setup failed.' }

Write-Output "Worker Python: $runtimePython"
Write-Output "Model directory: $ModelsDir"
Write-Output 'Run npm ci and npm run dev in this PowerShell session.'
