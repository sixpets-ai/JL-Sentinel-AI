const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
c=c.replace(/url=["']https:\/\/\{s\}\.basemaps\.cartocdn\.com[^"']+["']/g,"url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'");
fs.writeFileSync('SabanaAnalyzer.tsx',c);
console.log('TileLayer OSM OK');
