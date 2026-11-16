const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\CommandView.tsx";
let content = fs.readFileSync(filePath, 'utf8');

// Necesitamos ver exactamente el useEffect que termina en [unitId, folio]
// para agregar un guard que evite re-llamadas
const lines = content.split('\n');

// Encontrar la línea exacta del useEffect que contiene fetch a /api/chat y termina con [unitId, folio]
let useEffectStart = -1;
let useEffectEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('[unitId, folio]') && lines[i].includes('});')) {
    useEffectEnd = i;
    // Buscar hacia atrás el useEffect correspondiente
    for (let j = i - 1; j >= 0; j--) {
      if (lines[j].includes('useEffect(')) {
        useEffectStart = j;
        break;
      }
    }
    break;
  }
}

console.log(`useEffect encontrado: líneas ${useEffectStart+1} a ${useEffectEnd+1}`);
console.log('\nContenido actual:');
for (let i = useEffectStart; i <= useEffectEnd; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// El fix: agregar guard con useRef para evitar doble llamada
// Buscar si ya existe algún ref para este propósito
const hasNarrativeRef = content.includes('narrativeGeneratedRef') || content.includes('lastUnitRef');
console.log('\n¿Ya tiene ref de guard?', hasNarrativeRef);

// Fix: cambiar la dependencia de [unitId, folio] a [] con verificación interna
// O agregar un ref que evite re-llamadas cuando los valores no cambiaron realmente

// Estrategia: agregar ref lastNarrativeKey para trackear el último unitId+folio procesado
const oldUseEffect = lines.slice(useEffectStart, useEffectEnd + 1).join('\n');
console.log('\nTexto a reemplazar (primeras 200 chars):', oldUseEffect.substring(0, 200));

// Verificar si el useEffect tiene un guard de prompt vacío
if (oldUseEffect.includes('if (!unitId') || oldUseEffect.includes('if (!folio')) {
  console.log('\n✅ Ya tiene guard de unitId/folio vacío');
} else {
  console.log('\n⚠️  NO tiene guard - este es el problema');

  // Buscar la primera línea del body del useEffect para agregar el guard
  // La línea después de useEffect(() => {
  const firstBodyLine = lines[useEffectStart + 1] || '';
  console.log('Primera línea del body:', firstBodyLine);
}
