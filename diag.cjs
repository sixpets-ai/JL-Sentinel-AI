const fs = require('fs');
const path = require('path');
const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const tacticalPath = path.join(PROJECT, 'TacticalMap3D.tsx');
console.log('=== TacticalMap3D.tsx ===');
if (!fs.existsSync(tacticalPath)) { console.log('NO EXISTE'); } 
else { const t=fs.readFileSync(tacticalPath,'utf8'); t.split('\n').slice(0,80).forEach((l,i)=>console.log((i+1)+': '+l)); console.log('TOTAL:',t.split('\n').length); }
const appPath = path.join(PROJECT, 'App.tsx');
const app = fs.readFileSync(appPath,'utf8');
console.log('\n=== App.tsx ultimas 35 lineas:');
const al=app.split('\n'); al.slice(-35).forEach((l,i)=>console.log((al.length-35+i+1)+': '+l));
const sv = fs.readFileSync(path.join(PROJECT,'server.js'),'utf8');
console.log('\n=== server.js audit-log:', sv.includes('audit-log'));
