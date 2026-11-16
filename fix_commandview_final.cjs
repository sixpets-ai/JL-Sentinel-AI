const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\CommandView.tsx";
let content = fs.readFileSync(filePath, 'utf8');

// Buscar si hay un useEffect que llama generate() automáticamente
const lines = content.split('\n');
console.log('--- Buscando useEffect que llama generate ---');
lines.forEach((line, i) => {
  if (line.includes('generate') && (line.includes('useEffect') || line.includes('generate()'))) {
    console.log(`${i+1}: ${line}`);
  }
});

// El fix principal: agregar guard al inicio de generate
// Línea 178: setGenerating(true); → agregar ANTES: if (!unitId || !folio) return;
const oldGenerate = `const generate = useCallback(async () => {
    setGenerating(true);`;

const newGenerate = `const generate = useCallback(async () => {
    if (!unitId || !folio) return;  // Guard: no generar sin datos reales
    setGenerating(true);`;

if (content.includes(oldGenerate)) {
  content = content.replace(oldGenerate, newGenerate);
  console.log('\n✅ Guard agregado en generate()');
} else {
  // Intentar variante con espacios diferentes
  const alt1 = `const generate = useCallback(async () => {\n    setGenerating(true);`;
  const alt2 = `const generate = useCallback(async () => {\n  setGenerating(true);`;

  if (content.includes(alt1)) {
    content = content.replace(alt1, `const generate = useCallback(async () => {\n    if (!unitId || !folio) return;\n    setGenerating(true);`);
    console.log('\n✅ Guard agregado (variante 1)');
  } else if (content.includes(alt2)) {
    content = content.replace(alt2, `const generate = useCallback(async () => {\n  if (!unitId || !folio) return;\n  setGenerating(true);`);
    console.log('\n✅ Guard agregado (variante 2)');
  } else {
    console.log('\n⚠️  No encontró patrón exacto. Mostrando contexto:');
    const idx = content.indexOf('const generate = useCallback');
    if (idx > -1) {
      console.log(content.substring(idx, idx + 300));
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo guardado');
console.log('Reinicia Vite: presiona r en la terminal de Vite');
