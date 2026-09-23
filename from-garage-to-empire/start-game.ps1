param([switch]$Preview)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $gameNode = $nodeCommand.Source
} else {
    # The Codex desktop runtime is a fallback for this workstation; no downloads or global installation.
    $runtimeRoot = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\runtimes\cua_node'
    $gameNode = Get-ChildItem -LiteralPath $runtimeRoot -Filter node.exe -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Directory.Name -eq 'bin' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $gameNode) { throw 'Instale Node.js 24 LTS e tente novamente.' }
$vitePath = Join-Path $gameRoot 'node_modules\vite\bin\vite.js'
if (-not (Test-Path -LiteralPath $vitePath)) { throw 'Dependencias ausentes. Execute npm ci na pasta do jogo.' }
$env:PATH = (Split-Path -Parent $gameNode) + ';' + $env:PATH
Push-Location -LiteralPath $gameRoot
try {
    if ($Preview) { & $gameNode $vitePath preview --host 127.0.0.1 }
    else { & $gameNode $vitePath --host 127.0.0.1 }
} finally { Pop-Location }
