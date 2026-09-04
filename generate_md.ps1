$outputFile = "d:\Downloads\ultra-patched\codigo_completo.md"
Clear-Content $outputFile -ErrorAction SilentlyContinue

$extensions = @("*.js", "*.jsx", "*.css", "*.html", "*.json")
$files = Get-ChildItem -Path "d:\Downloads\ultra-patched\src" -Include $extensions -Recurse

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace("d:\Downloads\ultra-patched\", "")
    Add-Content $outputFile "`n## $relativePath`n"
    
    $ext = $file.Extension.TrimStart('.')
    if ($ext -eq "jsx") { $ext = "javascript" }
    elseif ($ext -eq "js") { $ext = "javascript" }
    
    Add-Content $outputFile "````$ext"
    Get-Content $file.FullName -Raw | Add-Content $outputFile
    Add-Content $outputFile "`````n"
}
