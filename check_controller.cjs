const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\AgentLogicController.ts";
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Mostrar líneas 220-260 (zona del setInterval)
console.log('--- Líneas 220-260 (setInterval) ---');
for (let i = 219; i < Math.min(260, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Buscar función refresh
console.log('\n--- Función refresh ---');
let inRefresh = false;
let braceCount = 0;
lines.forEach((line, i) => {
  if (line.includes('function refresh') || line.includes('const refresh') || line.includes('refresh =')) {
    inRefresh = true;
    braceCount = 0;
    console.log(`\n${i+1}: ${line}`);
  }
  if (inRefresh) {
    braceCount += (line.match(/{/g) || []).length;
    braceCount -= (line.match(/}/g) || []).length;
    if (i > 0) console.log(`${i+1}: ${line}`);
    if (braceCount <= 0 && i > 0) inRefresh = false;
  }
});

// Buscar intervalMs
console.log('\n--- intervalMs ---');
lines.forEach((line, i) => {
  if (line.includes('intervalMs') || line.includes('interval')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
