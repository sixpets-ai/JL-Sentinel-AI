# Fix directo Sabana - busca y reemplaza CUALQUIER patron de tile
$f = "SabanaAnalyzer.tsx"
if (-not (Test-Path $f)) { Write-Host "ERROR: No se encuentra $f"; exit 1 }

# Mostrar todas las lineas que contienen URL de mapa
Write-Host "`n=== URLs de tiles encontradas en SabanaAnalyzer.tsx ===" -ForegroundColor Cyan
$lines = Get-Content $f
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match 'carto|osm|tile|TileLayer|url.*http|basemap|openstreet') {
        Write-Host "  Linea $($i+1): $($lines[$i].Trim())" -ForegroundColor Yellow
    }
}

Write-Host "`n=== Aplicando reemplazo directo ===" -ForegroundColor Cyan
$ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"

# Backup
Copy-Item $f "$f.BAK_SABANA_DIRECT_$(Get-Date -Format 'HHmmss')" -Force
Write-Host "  Backup creado" -ForegroundColor Green

# Reemplazar TODAS las variantes posibles de URL CartoDB
$content = Get-Content $f -Raw -Encoding UTF8

# Variante 1: string literal con comillas simples o dobles
$content = $content -replace "https://[a-z]\.(basemaps\.cartocdn|tile\.openstreetmap)[^'`"}\s]+",$ESRI
$content = $content -replace "https://\{s\}\.(basemaps\.cartocdn|tile\.openstreetmap)[^'`"}\s]+",$ESRI

# Variante 2: variable que contiene la URL (buscar la asignacion)
$content = $content -replace "(const|let|var)\s+(\w*[Tt]ile\w*|TILE_URL|tileUrl|mapTile)\s*=\s*[`"']https://[^`"']+[`"']",
    "`$1 `$2 = '$ESRI'"

# Variante 3: template literal
$content = $content -replace "https://\`${[^}]+\}\.basemaps\.cartocdn[^``]+",$ESRI

[System.IO.File]::WriteAllText($f, $content, [System.Text.Encoding]::UTF8)
Write-Host "  Reemplazo aplicado" -ForegroundColor Green

# Verificar resultado
Write-Host "`n=== Verificacion final ===" -ForegroundColor Cyan
$verify = Get-Content $f
for ($i = 0; $i -lt $verify.Count; $i++) {
    if ($verify[$i] -match 'carto|osm|tile.*http|url.*http|arcgis') {
        Write-Host "  Linea $($i+1): $($verify[$i].Trim())" -ForegroundColor Green
    }
}
Write-Host "`nListo. Haz Ctrl+Shift+R en el browser." -ForegroundColor Cyan
