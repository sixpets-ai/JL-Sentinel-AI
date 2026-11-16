const fs = require('fs');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const appPath = require('path').join(PROJECT, 'App.tsx');
const content = fs.readFileSync(appPath, 'utf8');
const lines = content.split('\n');

console.log('=== TOTAL LÍNEAS:', lines.length);
console.log('\n=== LÍNEAS 1-25:');
lines.slice(0,25).forEach((l,i) => console.log(`${i+1}: ${l}`));
console.log('\n=== LÍNEAS 44-60:');
lines.slice(43,60).forEach((l,i) => console.log(`${i+44}: ${l}`));

// Buscar governance
const govLines = lines.map((l,i) => ({i,l})).filter(x => x.l.includes('governance') || x.l.includes('GovernanceView'));
console.log('\n=== LÍNEAS CON governance/GovernanceView:');
govLines.forEach(x => console.log(`${x.i+1}: ${x.l}`));

// Buscar el render zone
const renderLines = lines.map((l,i) => ({i,l})).filter(x => x.l.includes('isAuth') && x.l.includes('view'));
console.log('\n=== LÍNEAS CON isAuth && view:');
renderLines.forEach(x => console.log(`${x.i+1}: ${x.l}`));

// Verificar si hay caracteres raros que rompan el TS
const hasNull = content.includes('\0');
const hasCtrl = /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content);
console.log('\n=== Caracteres problemáticos:');
console.log('Null bytes:', hasNull);
console.log('Control chars:', hasCtrl);
