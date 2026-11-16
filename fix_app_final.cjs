const fs = require('fs');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = require('path').join(PROJECT, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

// Problema confirmado: línea 23 (índice 22) tiene el tab object DENTRO del type View
// Línea 22 (idx 21): | "guardian" | "education" | "links" | "cases"
// Línea 23 (idx 22): { id: "governance", label: "Gov. IA", icon: "🛡️", color: "#00ffcc", group: "ops" },  <-- MAL
// Línea 24 (idx 23): | "map3d" // 🗺️ NUEVO TIPO
// Línea 25 (idx 24): | "governance"; // 🛡️ IBM Responsible AI

// Fix: solo remover la línea 23 (índice 22) que tiene id: "governance" dentro del type View
// El tab governance CORRECTO está en el TABS array (líneas 36-48)

// Encontrar la línea exacta a remover: está en el type View y tiene id: y label: y color:
let removedIdx = -1;
for (let i = 18; i <= 27; i++) { // Solo buscar en el rango del type View (líneas 19-28)
  if (lines[i] && lines[i].includes('id: "governance"') && lines[i].includes('label:') && lines[i].includes('color:')) {
    removedIdx = i;
    console.log(`Línea a remover (${i+1}): ${lines[i]}`);
    break;
  }
}

if (removedIdx === -1) {
  console.log('No encontró línea mal ubicada en type View');
  // Mostrar líneas 19-27 para debug
  for (let i = 18; i <= 27; i++) console.log(`${i+1}: ${lines[i]}`);
  process.exit(1);
}

// Remover solo esa línea
const newLines = [...lines.slice(0, removedIdx), ...lines.slice(removedIdx + 1)];
const newContent = newLines.join('\n');

// Verificar que governance sigue en TABS array y en el render
const hasTabsGovernance = newContent.includes('id: "governance"');
const hasRenderGovernance = newContent.includes('view === "governance"');
const hasTypeGovernance = newContent.includes('| "governance"');

console.log('✅ governance en TABS:', hasTabsGovernance);
console.log('✅ governance en render:', hasRenderGovernance);
console.log('✅ governance en type View:', hasTypeGovernance);

if (hasTabsGovernance && hasRenderGovernance && hasTypeGovernance) {
  fs.writeFileSync(appPath, newContent, 'utf8');
  console.log('\n✅ App.tsx corregido exitosamente');

  // Mostrar el type View resultado
  const verLines = newContent.split('\n');
  const tvs = verLines.findIndex(l => l.includes('type View ='));
  console.log('\n=== type View resultado:');
  for (let i = tvs; i <= tvs + 8 && i < verLines.length; i++) {
    console.log(`${i+1}: ${verLines[i]}`);
  }
} else {
  console.log('\n❌ Verificación falló - no se guardó');
  console.log('Buscar governance:', newContent.indexOf('governance'));
}
