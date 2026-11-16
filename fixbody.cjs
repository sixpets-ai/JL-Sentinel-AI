const fs=require('fs');
const f='App.tsx';
let c=fs.readFileSync(f,'utf8');
c=c.replace('<div className="santi-body">','<div key={view} className="santi-body">');
fs.writeFileSync(f,c,'utf8');
console.log('FIX OK - lineas:',c.split('\n').length);
