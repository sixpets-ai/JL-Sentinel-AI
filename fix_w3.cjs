const fs=require('fs');
let c=fs.readFileSync('TacticalMap3D.tsx','utf8');
c=c.replace('import maplibregl from "maplibre-gl";','import * as maplibregl from "maplibre-gl";');
fs.writeFileSync('TacticalMap3D.tsx',c,'utf8');
console.log('OK import revertido a namespace import');
