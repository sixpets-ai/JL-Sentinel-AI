const fs=require('fs');
let c=fs.readFileSync('TacticalMap3D.tsx','utf8');
c=c.replace(
`import * as maplibregl from "maplibre-gl";
// @ts-ignore
maplibregl.workerUrl = new URL("maplibre-gl/dist/maplibre-gl-csp-worker.js", import.meta.url).href;`,
`import maplibregl from "maplibre-gl";`
);
fs.writeFileSync('TacticalMap3D.tsx',c,'utf8');
console.log('OK - import cambiado a default import');
