const fs = require('fs');
const path = 'C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\App.tsx';
let src = fs.readFileSync(path,'utf8');

const old3d = `{!isAuth && view === "map3d"     && <TacticalMap3D />}`;
const new3d = `{!isAuth && view === "map3d"     && <div key="map3d-container" style={{width:'100%',height:'100%'}}><TacticalMap3D /></div>}`;

if (!src.includes(old3d)) { console.log("NO ENCONTRADO - busca el texto exacto"); process.exit(1); }
const out = src.replace(old3d, new3d);
fs.writeFileSync(path, out, 'utf8');
console.log("FIX MAP3D WRAPPER OK");
