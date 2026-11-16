const fs = require('fs');
const path = require('path');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = path.join(PROJECT, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Fix 1: Agregar import de GovernanceView
const oldImport = `import { TacticalMap3D }     from "./TacticalMap3D"; // 🗺️ IMPORT 3D`;
const newImport = `import { TacticalMap3D }     from "./TacticalMap3D"; // 🗺️ IMPORT 3D
import GovernanceView        from "./GovernanceView";  // 🛡️ IBM Responsible AI`;

if (content.includes(oldImport)) {
  content = content.replace(oldImport, newImport);
  console.log('✅ Import GovernanceView agregado');
} else {
  // Buscar cualquier import de TacticalMap3D
  const idx = content.indexOf('TacticalMap3D');
  const lineEnd = content.indexOf('\n', idx);
  const line = content.substring(content.lastIndexOf('\n', idx) + 1, lineEnd);
  console.log('Línea TacticalMap3D:', line);
  content = content.replace(line, line + '\nimport GovernanceView from "./GovernanceView";  // 🛡️ IBM Responsible AI');
  console.log('✅ Import agregado (variante)');
}

// Fix 2: Agregar "governance" al type View
const oldType = `  | "map3d"; // 🗺️ NUEVO TIPO`;
const newType = `  | "map3d"  // 🗺️ NUEVO TIPO
  | "governance"; // 🛡️ IBM Responsible AI`;

if (content.includes(oldType)) {
  content = content.replace(oldType, newType);
  console.log('✅ Tipo "governance" agregado al union type');
} else {
  // Buscar map3d en el type
  const idx = content.indexOf('"map3d"');
  if (idx > -1) {
    const lineEnd = content.indexOf('\n', idx);
    const line = content.substring(content.lastIndexOf('\n', idx) + 1, lineEnd);
    content = content.replace(line, line.replace(';', '') + '\n  | "governance"; // 🛡️ IBM Responsible AI');
    console.log('✅ Tipo governance agregado (variante)');
  }
}

// Fix 3: Agregar tab en TABS array - después del último tab (education)
const oldLastTab = `  { id: "education", label: "Academia",      icon: "🎓",  color: "#00e676", group: "field" },`;
const newLastTab = `  { id: "education",  label: "Academia",      icon: "🎓",  color: "#00e676", group: "field" },
  { id: "governance", label: "Gov. IA",        icon: "🛡️",  color: "#00ffcc", group: "ops"   },`;

if (content.includes(oldLastTab)) {
  content = content.replace(oldLastTab, newLastTab);
  console.log('✅ Tab governance agregado en TABS array');
} else {
  // Buscar education tab con variante
  const eduIdx = content.indexOf('"education"');
  if (eduIdx > -1) {
    const lineEnd = content.indexOf('\n', eduIdx);
    const line = content.substring(content.lastIndexOf('\n', eduIdx) + 1, lineEnd);
    content = content.replace(line, line + '\n  { id: "governance", label: "Gov. IA", icon: "🛡️", color: "#00ffcc", group: "ops" },');
    console.log('✅ Tab governance agregado (variante)');
  }
}

// Fix 4: Agregar el render de GovernanceView en el switch/if de vistas
// Buscar donde se renderizan las vistas - buscar el patrón del último view renderizado
const viewPatterns = [
  // Patrón: activeView === "education" && <EducationView
  { old: `activeView === "education"`, suffix: ' && <EducationView' },
  // Patrón: case "education":
  { old: `case "education":`, suffix: '' }
];

let viewFixed = false;

// Buscar el bloque de renderizado de vistas
if (content.includes('activeView === "map3d"')) {
  // Patrón de ternario/&&
  const map3dIdx = content.indexOf('activeView === "map3d"');
  const surroundingBlock = content.substring(map3dIdx - 200, map3dIdx + 500);
  console.log('\nContexto del render de vistas:');
  console.log(surroundingBlock.substring(0, 400));
}

// Buscar TacticalMap3D en el JSX render
const renderIdx = content.lastIndexOf('TacticalMap3D');
if (renderIdx > -1) {
  const renderLine = content.substring(content.lastIndexOf('\n', renderIdx) + 1, content.indexOf('\n', renderIdx));
  console.log('\nLínea de render TacticalMap3D:', renderLine);

  // Agregar GovernanceView después del TacticalMap3D en el render
  if (renderLine.includes('activeView') || renderLine.includes('view')) {
    const govRender = renderLine
      .replace(/TacticalMap3D/g, 'GovernanceView')
      .replace(/map3d/g, 'governance')
      .replace(/<TacticalMap3D[^/]*/g, '<GovernanceView');

    if (!content.includes('"governance"') || !content.includes('GovernanceView')) {
      content = content.replace(renderLine, renderLine + '\n' + govRender);
      console.log('✅ Render GovernanceView agregado');
      viewFixed = true;
    }
  }
}

if (!viewFixed) {
  console.log('\n⚠️  No pudo auto-agregar el render. Busca manualmente donde se renderiza TacticalMap3D en el JSX y agrega:');
  console.log('{activeView === "governance" && <GovernanceView />}');
}

fs.writeFileSync(appPath, content, 'utf8');
console.log('\n✅ App.tsx actualizado');
console.log('Reinicia Vite para ver el nuevo tab Gov. IA con el escudo 🛡️');
