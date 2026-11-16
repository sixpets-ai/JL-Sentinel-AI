const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\AgenteAvatar.tsx";

let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log('=== Diagnóstico completo ===');
console.log('Total líneas:', lines.length);

// Mostrar líneas 85-115 para ver el contexto completo
console.log('\n--- Líneas 85-115 ---');
for (let i = 84; i < Math.min(115, lines.length); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

// Buscar todos los useEffect
console.log('\n--- Todos los useEffect ---');
lines.forEach((line, i) => {
  if (line.includes('useEffect')) {
    console.log(`${i+1}: ${line}`);
    // Mostrar las siguientes 5 líneas de contexto
    for (let j = i+1; j < Math.min(i+6, lines.length); j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
    console.log('---');
  }
});

// Buscar dónde se llama sendMessage (aparte de definición y botón)
console.log('\n--- Todas las llamadas a sendMessage ---');
lines.forEach((line, i) => {
  if (line.includes('sendMessage') && !line.includes('const sendMessage') && !line.includes('onClick')) {
    console.log(`${i+1}: ${line}`);
  }
});

// Buscar onKeyDown o Enter que llamen sendMessage
console.log('\n--- onKeyDown / Enter ---');
lines.forEach((line, i) => {
  if (line.includes('onKeyDown') || line.includes('Enter') || line.includes('keyDown')) {
    console.log(`${i+1}: ${line}`);
  }
});
