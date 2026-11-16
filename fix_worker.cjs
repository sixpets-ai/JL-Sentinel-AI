const fs=require('fs');
let c=fs.readFileSync('TacticalMap3D.tsx','utf8');
if(c.includes('workerUrl')){console.log('OK ya tiene workerUrl');}
else{
c=c.replace(
'import * as maplibregl from "maplibre-gl";',
'import * as maplibregl from "maplibre-gl";\n// @ts-ignore\nmaplibregl.workerUrl = new URL("maplibre-gl/dist/maplibre-gl-csp-worker.js", import.meta.url).href;'
);
fs.writeFileSync('TacticalMap3D.tsx',c,'utf8');
console.log('OK workerUrl agregado — MapLibre worker fix aplicado');
}
