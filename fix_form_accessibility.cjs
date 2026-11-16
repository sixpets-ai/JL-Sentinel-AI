const fs = require('fs');
const path = require('path');

const PROJECT = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols";

// Buscar todos los archivos .tsx en el root del proyecto
const files = fs.readdirSync(PROJECT).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
console.log('Archivos a revisar:', files);

let totalFixes = 0;

files.forEach(fileName => {
  const filePath = path.join(PROJECT, fileName);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Fix 1: <input sin id/name que tiene placeholder="Pregunta a..."
  // Patrón: <input ... placeholder="Pregunta a ..." sin id ni name
  const inputPatterns = [
    // input con placeholder de chat sin id
    {
      pattern: /(<input\b(?![^>]*\bid\s*=)[^>]*placeholder\s*=\s*["'][^"']*[Pp]regunta[^"']*["'][^>]*)(\/?>)/g,
      fix: (match, attrs, close) => {
        console.log(`  ${fileName}: Agregando id/name a input de chat`);
        changed = true;
        totalFixes++;
        return `${attrs} id="chat-input-agente" name="chat-input-agente"${close}`;
      }
    },
    // textarea con placeholder de chat sin id
    {
      pattern: /(<textarea\b(?![^>]*\bid\s*=)[^>]*placeholder\s*=\s*["'][^"']*[Pp]regunta[^"']*["'][^>]*)(>)/g,
      fix: (match, attrs, close) => {
        console.log(`  ${fileName}: Agregando id/name a textarea de chat`);
        changed = true;
        totalFixes++;
        return `${attrs} id="chat-textarea-agente" name="chat-textarea-agente"${close}`;
      }
    }
  ];

  inputPatterns.forEach(({ pattern, fix }) => {
    content = content.replace(pattern, fix);
  });

  // Fix 2: Buscar inputs sin id/name en general (forms)
  // Buscar <input type="text" o type="search" sin id
  const genericInputPattern = /(<input\b(?![^>]*\bid\s*=)(?![^>]*\bname\s*=)[^>]*type\s*=\s*["'](text|search|email|password)["'][^>]*)(\/?>)/g;
  let inputCounter = 0;
  content = content.replace(genericInputPattern, (match, attrs, type, close) => {
    inputCounter++;
    const inputId = `input-${fileName.replace('.tsx','').toLowerCase()}-${inputCounter}`;
    console.log(`  ${fileName}: Agregando id="${inputId}" a input type="${type}"`);
    changed = true;
    totalFixes++;
    return `${attrs} id="${inputId}" name="${inputId}"${close}`;
  });

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fileName} actualizado`);
  } else {
    console.log(`  ${fileName}: Sin cambios necesarios`);
  }
});

console.log(`\n✅ Total de fixes de accesibilidad: ${totalFixes}`);
console.log('Reinicia Vite para aplicar (presiona r en la terminal de Vite)');
