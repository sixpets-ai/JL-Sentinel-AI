$f = "C:\Users\Wyse\Desktop\J-L-Sentinel-AI\05_Respaldo_Codigo\Intelligent-Patrols\SabanaAnalyzer.tsx"
if (-not (Test-Path $f)) { Write-Host "ERROR: No se encuentra SabanaAnalyzer.tsx" -ForegroundColor Red; exit 1 }

$content = Get-Content $f -Raw -Encoding UTF8

# Verificar URL actual del TileLayer
Write-Host "=== URL actual del TileLayer ===" -ForegroundColor Cyan
$lines = Get-Content $f
for ($i=0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'TileLayer|url=') {
        Write-Host "L$($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

# ESRI URL
$ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"

# Fix 1: Reemplazar URL si aun tiene carto
if ($content -match 'cartocdn') {
    Write-Host "`nAun tiene CartoDB - aplicando fix..." -ForegroundColor Red
    $content = $content -replace "https://[a-z]\.basemaps\.cartocdn\.com/dark_all/\{z\}/\{x\}/\{y\}\.png", $ESRI
    $content = $content -replace "https://[a-z]\.basemaps\.cartocdn\.com/[^'`"}\s]+", $ESRI
    $content = $content -replace "subdomains=\{?['\`"]abcd['\`"]\}?", ""
    $content = $content -replace "subdomains='abcd'", ""
}

# Fix 2: Agregar key dinamico al MapContainer para forzar remount
# Buscar MapContainer sin key o con key estatico
if ($content -notmatch 'MapContainer[^>]*key=\{Date') {
    Write-Host "`nAgregando key dinamico al MapContainer..." -ForegroundColor Cyan
    # Agregar key={Date.now()} o key="esri-map" al MapContainer
    $content = $content -replace '(<MapContainer)(\s)', '$1 key="esri-sabana-v2"$2'
    # Si ya tiene key, reemplazarlo
    $content = $content -replace 'key="[^"]*sabana[^"]*"', 'key="esri-sabana-v2"'
}

# Fix 3: Asegurar que la URL en TileLayer usa ESRI
# Cubrir el caso donde url esta en variable
if ($content -notmatch 'arcgisonline') {
    Write-Host "ADVERTENCIA: No se encontro ESRI en el archivo - verificar manualmente" -ForegroundColor Red
} else {
    Write-Host "ESRI URL confirmada en el archivo" -ForegroundColor Green
}

# Guardar
[System.IO.File]::WriteAllText($f, $content, [System.Text.Encoding]::UTF8)
Write-Host "Archivo guardado" -ForegroundColor Green

# Mostrar resultado
Write-Host "`n=== RESULTADO - lineas con URL de mapa ===" -ForegroundColor Cyan
$lines2 = Get-Content $f
for ($i=0; $i -lt $lines2.Count; $i++) {
    if ($lines2[$i] -match 'TileLayer|url=|arcgis|MapContainer.*key') {
        Write-Host "L$($i+1): $($lines2[$i].Trim())" -ForegroundColor Green
    }
}

Write-Host "`nHaz Ctrl+Shift+R en el browser - Sabana MAPA" -ForegroundColor Cyan
