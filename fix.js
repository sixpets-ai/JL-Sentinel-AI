const fs = require('fs');
const f = 'C:/Users/Wyse/Desktop/J-L-Sentinel-AI/05_Respaldo_Codigo/Intelligent-Patrols/CommandView.tsx';
let c = fs.readFileSync(f, 'utf8');
const before = c.length;
// Reemplaza backtick escapado \` por backtick normal `
const bs = String.fromCharCode(92); // \
const bt = String.fromCharCode(96); // `
c = c.split(bs + bt).join(bt);
fs.writeFileSync(f, c, 'utf8');
console.log('FIXED:', before, '->', c.length);
