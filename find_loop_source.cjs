const fs = require('fs');
const path = require('path');

const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";
const files = fs.readdirSync(PROJECT).filter(f => f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.js'));

console.log('=== Buscando llamadas a /api/chat en TODOS los archivos ===\n');

files.forEach(fileName => {
  const filePath = path.join(PROJECT, fileName);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('/api/chat') || content.includes('api/chat')) {
      const lines = content.split('\n');
      console.log(`\n📄 ${fileName}:`);
      lines.forEach((line, i) => {
        if (line.includes('/api/chat') || line.includes('api/chat')) {
          console.log(`  ${i+1}: ${line.trim()}`);
        }
      });
    }
  } catch(e) {}
});

console.log('\n=== Buscando setInterval / setTimeout con fetch ===\n');
files.forEach(fileName => {
  const filePath = path.join(PROJECT, fileName);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('setInterval') || content.includes('setTimeout')) {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('setInterval') || line.includes('setTimeout')) {
          console.log(`${fileName} ${i+1}: ${line.trim()}`);
        }
      });
    }
  } catch(e) {}
});

console.log('\n=== Buscando useEffect con [messages] o [] que hagan fetch ===\n');
files.forEach(fileName => {
  const filePath = path.join(PROJECT, fileName);
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (line.includes('useEffect') && (line.includes('[messages]') || line.includes('fetch'))) {
        console.log(`${fileName} ${i+1}: ${line.trim()}`);
      }
    });
  } catch(e) {}
});
