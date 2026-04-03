#Requires -Version 5.1
#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Launches Visual Studio Installer to add C++ workload + LLVM Clang + MSBuild ClangCL toolset
  (required for packages like tree-sitter-php / Pampa on Windows).

  MUST run in an elevated PowerShell ("Run as administrator"). --passive/--quiet exit 5007 if not elevated from the start.

.EXAMPLE
  # Right-click Windows Terminal / PowerShell -> Run as administrator, then:
  powershell -ExecutionPolicy Bypass -File cursor-governance/bin/install-vs2022-cpp-build-tools.ps1
#>
$ErrorActionPreference = 'Stop'
$setup = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\setup.exe'
if (-not (Test-Path $setup)) {
  Write-Error "Visual Studio Installer not found at $setup."
}

$community = 'C:\Program Files\Microsoft Visual Studio\2022\Community'
$buildTools = 'C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools'
if (Test-Path $community) {
  $installPath = $community
} elseif (Test-Path $buildTools) {
  $installPath = $buildTools
} else {
  Write-Error "Neither VS 2022 Community nor Build Tools found. Install one, then re-run."
}

# Start-Process -ArgumentList with an ARRAY joins elements with spaces WITHOUT quoting (see MS docs).
# That turns "--installPath=C:\Program Files\..." into a broken command line; the CRT splits at the
# first space and VS sees installPath C:\Program only. Fix: one ArgumentList STRING with the path quoted,
# OR invoke with & (call operator). We use a single quoted command line for -PassThru.ExitCode on PS 5.1.
# --wait is invalid on `modify` (VS 4.4+). --passive requires elevation from process start (else exit 5007).
# Quote path for a single ArgumentList string (CRT rules). Avoid embedded " in path.
$installPathQuoted = '"' + ($installPath.Trim('"') -replace '"', '') + '"'
$argumentLine = 'modify --installPath {0} --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.ComponentGroup.NativeDesktop.Llvm.Clang --add Microsoft.VisualStudio.Component.VC.Llvm.ClangToolset --includeRecommended --passive --norestart' -f $installPathQuoted

Write-Host "Launching VS Installer (modify, passive) for: $installPath"
$p = Start-Process -FilePath $setup -ArgumentList $argumentLine -PassThru -Wait
if ($p.ExitCode -ne 0) {
  $msg = 'VS Installer exited with code {0}. Code 5007: run elevated from the start. If installPath shows C:\Program only: use one ArgumentList string with a quoted path, not an array.' -f $p.ExitCode
  Write-Error $msg
}
Write-Host ('Done. Exit code: {0}' -f $p.ExitCode)