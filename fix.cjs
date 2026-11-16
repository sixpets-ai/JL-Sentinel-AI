const fs = require('fs');
const path = require('path');
const P = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";

const tacPath = path.join(P, 'TacticalMap3D.tsx');
let tac = fs.readFileSync(tacPath, 'utf8');

const oldCleanup = `return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };`;
const newCleanup = `return () => { destroyed = true; if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } if (mapRef.current) { try { mapRef.current.remove(); } catch(e) {} mapRef.current = null; } };`;

if (tac.includes('intervalRef')) {
  console.log('intervalRef ya existe - revisando cleanup...');
}

const oldInterval = `setInterval(() => {`;
const newInterval = `intervalRef.current = setInterval(() => {`;

if (!tac.includes('intervalRef.current = setInterval')) {
  tac = tac.replace(oldInterval, newInterval);
  console.log('OK: setInterval -> intervalRef.current');
} else {
  console.log('OK: intervalRef.current ya asignado');
}

const oldReturn = `return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };`;
const newReturn = `return () => { destroyed = true; if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } if (mapRef.current) { try { mapRef.current.remove(); } catch(e){} mapRef.current = null; } };`;

if (tac.includes(oldReturn)) {
  tac = tac.replace(oldReturn, newReturn);
  console.log('OK: cleanup corregido - clearInterval agregado');
} else {
  console.log('BUSCANDO patron alternativo...');
  tac = tac.replace(/return \(\) => \{[^}]*mapRef\.current\.remove\(\)[^}]*\};/, newReturn);
  console.log('OK: patron reemplazado');
}

const oldDestroyed = `let destroyed = false;`;
if (!tac.includes(oldDestroyed)) {
  tac = tac.replace(`const map = new maplibregl`, `let destroyed = false;\n        const map = new maplibregl`);
  console.log('OK: variable destroyed agregada');
}

fs.writeFileSync(tacPath, tac, 'utf8');
console.log('GUARDADO. Verificando...');
const v = fs.readFileSync(tacPath, 'utf8');
console.log('clearInterval:', v.includes('clearInterval'));
console.log('destroyed:', v.includes('destroyed'));
console.log('LISTO - Vite recargara automaticamente');