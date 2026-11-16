const fs = require('fs');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = require('path').join(PROJECT, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// El problema: el tab object { id: "governance"... } fue insertado DENTRO del type View
// Línea 23 aparece: { id: "governance", label: "Gov. IA", icon: "🛡️", color: "#00ffcc", group: "ops" },
// Línea 24: | "map3d" // 🗺️ NUEVO TIPO
// Línea 25: | "governance"; // 🛡️ IBM Responsible AI

// Fix: remover la línea del tab object que está mal ubicada (dentro del type View)
// y asegurarnos que esté solo en el TABS array

const lines = content.split('\n');
console.log('Total líneas:', lines.length);

// Encontrar el bloque type View = y el bloque TABS
let typeViewStart = -1, typeViewEnd = -1;
let tabsStart = -1, tabsEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('type View =')) typeViewStart = i;
  if (typeViewStart > -1 && typeViewEnd === -1 && lines[i].includes(';') && i > typeViewStart && !lines[i].includes('|')) {
    typeViewEnd = i;
  }
  if (lines[i].includes('const TABS:') || lines[i].includes('const TABS =')) tabsStart = i;
  if (tabsStart > -1 && tabsEnd === -1 && lines[i].trim() === ']') tabsEnd = i;
}

console.log('type View:', typeViewStart+1, '-', typeViewEnd+1);
console.log('TABS:', tabsStart+1, '-', tabsEnd+1);

// Mostrar el type View actual
console.log('\n=== type View actual:');
for (let i = typeViewStart; i <= typeViewEnd+2 && i < lines.length; i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Buscar líneas mal ubicadas dentro del type View (que tengan 'id:' y 'label:')
const badLines = [];
for (let i = typeViewStart; i <= typeViewEnd+2 && i < lines.length; i++) {
  if (lines[i].includes('id:') && lines[i].includes('label:') && lines[i].includes('color:')) {
    badLines.push(i);
    console.log(`\n❌ Línea MAL UBICADA en type View: ${i+1}: ${lines[i]}`);
  }
}

if (badLines.length === 0) {
  console.log('\n✅ No hay líneas mal ubicadas en type View');
  // Ver si el problema es otro
  console.log('\n=== Líneas 18-30:');
  for (let i = 17; i <= 30 && i < lines.length; i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  // Remover las líneas mal ubicadas
  console.log('\nRemoviendo líneas mal ubicadas...');
  // Crear nuevo contenido sin esas líneas en type View
  const newLines = lines.filter((_, i) => !badLines.includes(i));
  const newContent = newLines.join('\n');

  // Verificar que governance todavía está en TABS
  if (newContent.includes('"governance"') && newContent.includes('id: "governance"')) {
    fs.writeFileSync(appPath, newContent, 'utf8');
    console.log('✅ Líneas mal ubicadas removidas');
    console.log('✅ governance sigue en TABS array');

    // Mostrar resultado
    const verLines = newContent.split('\n');
    console.log('\n=== type View después del fix:');
    const tvs = verLines.findIndex(l => l.includes('type View ='));
    for (let i = tvs; i <= tvs+8; i++) console.log(`${i+1}: ${verLines[i]}`);
  } else {
    console.log('⚠️  Verificación falló - no se guardó');
  }
}
