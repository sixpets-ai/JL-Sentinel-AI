const fs = require('fs');
let c = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8');
const lines = c.split('\n');

// Inspeccionar L629-633 (index 628-632)
for (let i = 628; i <= 633; i++) {
  const hex = Buffer.from(lines[i] || '', 'utf8').toString('hex');
  console.log('L' + (i+1) + '[' + (lines[i]||'').length + ']: ' + hex.substring(0, 60));
}

// Limpiar caracteres invisibles en L630 (index 629) y L631 (index 630)
// Reemplazar cualquier caracter no-printable excepto espacios normales
for (let i = 628; i <= 633; i++) {
  if (lines[i]) {
    // Remover caracteres control excepto tab normal
    lines[i] = lines[i].replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F﻿​‌‍ ]/g, '');
  }
}

const result = lines.join('\n');
fs.writeFileSync('SabanaAnalyzer.tsx', result, 'utf8');
console.log('CLEANED len:' + result.length);
