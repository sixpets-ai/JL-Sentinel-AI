const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\CommandView.tsx";
let content = fs.readFileSync(filePath, 'utf8');

// Buscar el patrón exacto con indentación de 4 espacios (lo que vimos en pantalla)
// La línea 177-178 exactas:
//   const generate = useCallback(async () => {
//     setGenerating(true);

// Encontrar el índice exacto
const searchStr = 'const generate = useCallback(async () => {';
const idx = content.indexOf(searchStr);

if (idx === -1) {
  console.log('❌ No encontró generate useCallback');
  process.exit(1);
}

// Mostrar contexto
console.log('Contexto encontrado:');
console.log(content.substring(idx, idx + 150));
console.log('---');

// Encontrar la siguiente línea después de la apertura del callback
// Buscar el primer \n después del {
const afterBrace = content.indexOf('\n', idx + searchStr.length);
const nextLineStart = afterBrace + 1;
const nextLine = content.substring(nextLineStart, content.indexOf('\n', nextLineStart));
console.log('Siguiente línea:', JSON.stringify(nextLine));

// Detectar la indentación de la siguiente línea
const indentMatch = nextLine.match(/^(\s+)/);
const indent = indentMatch ? indentMatch[1] : '    ';
console.log('Indentación detectada:', JSON.stringify(indent));

// Insertar el guard ANTES de la siguiente línea
const guardLine = `${indent}if (!unitId || !folio) return;  // Guard: evita generación sin datos\n`;

// Verificar que no ya existe
if (content.includes('if (!unitId || !folio) return;')) {
  console.log('✅ Guard ya existe - no se necesita fix');
} else {
  content = content.substring(0, nextLineStart) + guardLine + content.substring(nextLineStart);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Guard insertado exitosamente');
  console.log('Verificación:');
  const newIdx = content.indexOf(searchStr);
  console.log(content.substring(newIdx, newIdx + 200));
}
