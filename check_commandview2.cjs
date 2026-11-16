const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\CommandView.tsx";
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

// Mostrar líneas 160-205 (el useEffect que termina en línea 200)
console.log('--- Líneas 155-205 (useEffect con [unitId, folio]) ---');
for (let i = 154; i < Math.min(206, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Buscar dónde se definen unitId y folio
console.log('\n--- Definición de unitId y folio ---');
lines.forEach((line, i) => {
  if ((line.includes('unitId') || line.includes('folio')) &&
      (line.includes('useState') || line.includes('const ') || line.includes('let '))) {
    console.log(`${i+1}: ${line.trim()}`);
  }
});

// Buscar el setInterval en línea 565
console.log('\n--- Líneas 555-580 (vibrateInterval) ---');
for (let i = 554; i < Math.min(581, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
