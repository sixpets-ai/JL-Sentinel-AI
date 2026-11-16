const fs = require('fs');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = require('path').join(PROJECT, 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// La línea detectada fue:
// {!isAuth && view === "map3d"     && <TacticalMap3D />}
// Buscar esa línea y agregar GovernanceView después

const searchStr = 'view === "map3d"';
const idx = content.indexOf(searchStr);

if (idx === -1) {
  console.log('❌ No encontró view === "map3d"');
  process.exit(1);
}

const lineStart = content.lastIndexOf('\n', idx) + 1;
const lineEnd = content.indexOf('\n', idx);
const renderLine = content.substring(lineStart, lineEnd);
console.log('Línea encontrada:', renderLine);

// Verificar que no ya existe el render de governance
if (content.includes('GovernanceView />') || content.includes('governance" && <GovernanceView')) {
  console.log('✅ Render de GovernanceView ya existe');
  process.exit(0);
}

// Crear la línea de render para GovernanceView
// Reemplazar map3d → governance y TacticalMap3D → GovernanceView
const govLine = renderLine
  .replace(/map3d/g, 'governance')
  .replace(/TacticalMap3D/g, 'GovernanceView');

console.log('Nueva línea:', govLine);

// Insertar después de la línea map3d
content = content.substring(0, lineEnd) + '\n' + govLine + content.substring(lineEnd);

fs.writeFileSync(appPath, content, 'utf8');
console.log('✅ Render GovernanceView agregado exitosamente');

// Verificar
const newIdx = content.indexOf('governance" && <GovernanceView');
if (newIdx > -1) {
  console.log('✅ Verificado:', content.substring(content.lastIndexOf('\n', newIdx)+1, content.indexOf('\n', newIdx)));
}
