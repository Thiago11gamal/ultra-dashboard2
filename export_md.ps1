$sourcePath = "d:\Downloads\ultra-patched\src"
$outputPath = "d:\Downloads\ultra-patched\codigo_completo.md"
$extensions = @(".js", ".jsx", ".css", ".html", ".json", ".md")

Clear-Content -Path $outputPath -ErrorAction SilentlyContinue

Add-Content -Path $outputPath -Value "# Código-Fonte do Projeto Ultra"
Add-Content -Path $outputPath -Value "Gerado em: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Add-Content -Path $outputPath -Value "Este arquivo contém todo o código fonte da pasta src."
Add-Content -Path $outputPath -Value ""

Get-ChildItem -Path $sourcePath -Recurse -File | Where-Object { $extensions -contains $_.Extension } | ForEach-Object {
    $relativePath = $_.FullName.Replace("d:\Downloads\ultra-patched\", "")
    $lang = "javascript"
    if ($_.Extension -eq ".css") { $lang = "css" }
    elseif ($_.Extension -eq ".html") { $lang = "html" }
    elseif ($_.Extension -eq ".json") { $lang = "json" }
    elseif ($_.Extension -eq ".jsx") { $lang = "jsx" }

    Add-Content -Path $outputPath -Value "## Arquivo: $relativePath"
    Add-Content -Path $outputPath -Value ("``````" + $lang)
    Get-Content $_.FullName | Add-Content -Path $outputPath
    Add-Content -Path $outputPath -Value "``````"
    Add-Content -Path $outputPath -Value ""
    Add-Content -Path $outputPath -Value "---"
    Add-Content -Path $outputPath -Value ""
}

Write-Output "File exported successfully!"
