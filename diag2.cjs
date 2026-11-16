const fs = require('fs');
const path = require('path');
const P = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";

// 1. LEER TacticalMap3D completo
const tac = fs.readFileSync(path.join(P,'TacticalMap3D.tsx'),'utf8');
console.log('=== TacticalMap3D COMPLETO ===');
console.log(tac);
