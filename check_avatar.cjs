const fs = require('fs');
const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\AgenteAvatar.tsx";
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('=== Buscando useEffect, userSent, sendMessage, api/chat ===\n');
lines.forEach((line, i) => {
  const n = i + 1;
  const trimmed = line.trim();
  if (
    trimmed.includes('useEffect') ||
    trimmed.includes('userSent') ||
    trimmed.includes('sendMessage') ||
    trimmed.includes('api/chat')
  ) {
    console.log(`${n}: ${line}`);
  }
});
