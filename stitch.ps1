$part3 = Get-Content 'd:\Downloads\ultra-patched\part3_full.txt' -Raw
$part4 = Get-Content 'd:\Downloads\ultra-patched\part4.txt' -Raw

$start3 = $part3.IndexOf('`components/coach/CoachControlCenter.jsx`')
$startCode3 = $part3.IndexOf('```jsx', $start3) + 6

$splitStr = '          <div className="max-h-64 overflow-y-auto space-y-1">'
$endCode3 = $part3.IndexOf($splitStr, $startCode3)
if ($endCode3 -lt 0) {
    Write-Output 'splitStr not found in part3'
} else {
    $code1 = $part3.Substring($startCode3, $endCode3 - $startCode3)

    $start4 = $part4.IndexOf('<USER_REQUEST>') + 14
    $end4 = $part4.IndexOf('✅ **Check pós-aplicação')
    if ($end4 -lt 0) { $end4 = $part4.IndexOf('<ADDITIONAL_METADATA>') }
    
    $code2Full = $part4.Substring($start4, $end4 - $start4)
    $startCode4 = $code2Full.IndexOf($splitStr)
    $code2 = $code2Full.Substring($startCode4)
    
    $code2 = $code2 -replace '```jsx', ''
    $code2 = $code2 -replace '```', ''
    
    $finalCode = $code1 + $code2
    $finalCode | Out-File 'd:\Downloads\ultra-patched\src\components\coach\CoachControlCenter.jsx' -Encoding UTF8
    Write-Output 'Stitched successfully'
}
