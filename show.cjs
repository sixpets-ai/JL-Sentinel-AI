const fs=require('fs');
const c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
fs.writeFileSync('C:\\Users\\Wyse\\Desktop\\sabana_full.txt',c,'utf8');
console.log('GUARDADO EN DESKTOP');
