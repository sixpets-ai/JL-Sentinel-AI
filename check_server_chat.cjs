const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\server.js";
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Buscar el handler de /api/chat y mostrar contexto
console.log('--- Handler /api/chat ---');
lines.forEach((line, i) => {
  if (line.includes('/api/chat') || line.includes('CHAT]') || line.includes('Respuesta local')) {
    // Mostrar 3 líneas antes y 10 después
    const start = Math.max(0, i - 2);
    const end = Math.min(lines.length, i + 15);
    console.log(`\n=== Línea ${i+1} ===`);
    for (let j = start; j < end; j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
});

// Buscar si hay algún auto-call, loop, o cron en server.js
console.log('\n--- Loops/Crons en server.js ---');
lines.forEach((line, i) => {
  if (line.includes('setInterval') || line.includes('setTimeout') || line.includes('cron') || line.includes('schedule')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
