const fs = require('fs');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = require('path').join(PROJECT, 'App.tsx');
let lines = fs.readFileSync(appPath, 'utf8').split('\n');

// PASO 1: Remover línea 23 (índice 22) - tab object mal ubicado en type View
// PASO 2: Agregar el tab en el TABS array después del education tab
// PASO 3: Verificar que governance está en type View (línea 25 ya lo tiene)

// --- PASO 1: Remover la línea mal ubicada ---
const badIdx = lines.findIndex((l, i) => i >= 18 && i <= 26 && l.includes('id: "governance"') && l.includes('label:'));
if (badIdx === -1) {
  console.log('❌ No encontró línea mal ubicada');
  for (let i = 18; i <= 26; i++) console.log(`${i+1}: ${lines[i]}`);
  process.exit(1);
}
console.log(`Removiendo línea ${badIdx+1}: ${lines[badIdx]}`);
lines.splice(badIdx, 1);
console.log('✅ Línea mal ubicada removida del type View');

// --- PASO 2: Agregar tab en TABS array después del education tab ---
const eduIdx = lines.findIndex(l => l.includes('"education"') && l.includes('label:') && l.includes('Academia'));
if (eduIdx === -1) {
  console.log('❌ No encontró tab education');
  process.exit(1);
}
console.log(`Tab education en línea ${eduIdx+1}: ${lines[eduIdx]}`);

// Verificar si governance ya está en TABS
const govInTabs = lines.findIndex(l => l.includes('"governance"') && l.includes('label:') && l.includes('Gov'));
if (govInTabs > -1) {
  console.log(`✅ governance ya está en TABS en línea ${govInTabs+1}`);
} else {
  // Agregar después del education tab
  const govTab = `  { id: "governance", label: "Gov. IA", icon: "\\u{1F6E1}\\uFE0F", color: "#00ffcc", group: "ops" },`;
  lines.splice(eduIdx + 1, 0, govTab);
  console.log('✅ Tab governance agregado al TABS array');
}

// --- VERIFICACIÓN ---
const content = lines.join('\n');
const hasTabsGov = content.includes('id: "governance"') && content.includes('"Gov. IA"');
const hasRenderGov = content.includes('view === "governance"');
const hasTypeGov = content.includes('| "governance"');

console.log('\n=== Verificación final:');
console.log('governance en TABS:', hasTabsGov);
console.log('governance en render:', hasRenderGov);
console.log('governance en type View:', hasTypeGov);

// Mostrar type View
const tvs = lines.findIndex(l => l.includes('type View ='));
console.log('\n=== type View:');
for (let i = tvs; i <= tvs + 8 && i < lines.length; i++) console.log(`${i+1}: ${lines[i]}`);

if (hasTabsGov && hasRenderGov && hasTypeGov) {
  fs.writeFileSync(appPath, content, 'utf8');
  console.log('\n✅ App.tsx CORREGIDO - Vite debería compilar ahora');
} else {
  console.log('\n❌ Verificación falló - no guardado');
}
