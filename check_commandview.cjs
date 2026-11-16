const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\CommandView.tsx";
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('--- useEffect en CommandView ---');
lines.forEach((line, i) => {
  if (line.includes('useEffect')) {
    const start = Math.max(0, i);
    const end = Math.min(lines.length, i + 12);
    console.log(`\n=== useEffect línea ${i+1} ===`);
    for (let j = start; j < end; j++) {
      console.log(`${j+1}: ${lines[j]}`);
    }
  }
});

console.log('\n--- Líneas 180-200 (primer fetch /api/chat) ---');
for (let i = 179; i < Math.min(205, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

console.log('\n--- Líneas 310-330 (segundo fetch /api/chat) ---');
for (let i = 309; i < Math.min(335, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

console.log('\n--- setInterval/setTimeout en CommandView ---');
lines.forEach((line, i) => {
  if (line.includes('setInterval') || line.includes('setTimeout')) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});
