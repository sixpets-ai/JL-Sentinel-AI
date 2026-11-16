const fs=require('fs');
let c=fs.readFileSync('SabanaAnalyzer.tsx','utf8');
const idx=c.indexOf('{/* TARJETAS INFORMATIVAS */}');
const idx2=c.indexOf('</div>\n        </div>\n        ) : (', idx);
console.log('inicio:',idx,'fin:',idx2);
