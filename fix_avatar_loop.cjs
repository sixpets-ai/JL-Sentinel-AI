const fs = require('fs');
const path = require('path');

const filePath = "C:\\Users\\Wyse\\Desktop\\J-L-Sentinel-AI\\05_Respaldo_Codigo\\Intelligent-Patrols\\AgenteAvatar.tsx";

let content = fs.readFileSync(filePath, 'utf8');

// Fix 1: Agregar estado userSent después de los otros useState
const oldState = 'const [activeAgent, setActiveAgent] = useState<Agent>(AGENT_SANTI);';
const newState = 'const [activeAgent, setActiveAgent] = useState<Agent>(AGENT_SANTI);\n  const [userSent, setUserSent] = useState(false);';

if (content.includes(oldState)) {
  content = content.replace(oldState, newState);
  console.log('✅ Estado userSent agregado');
} else {
  console.log('⚠️  No encontró oldState para userSent');
}

// Fix 2: El useEffect que hace fetch a /api/chat - agregar guard
const oldEffect = 'useEffect(() => { const res = await fetch("/api/chat"';
const newEffect = 'useEffect(() => { if (!userSent) return; setUserSent(false); const res = await fetch("/api/chat"';

if (content.includes(oldEffect)) {
  content = content.replace(oldEffect, newEffect);
  console.log('✅ Guard userSent agregado en useEffect de chat');
} else {
  // Buscar variante con espacios diferentes
  const idx = content.indexOf('await fetch("/api/chat"');
  if (idx > -1) {
    // Encontrar el useEffect que lo contiene
    const before = content.lastIndexOf('useEffect(', idx);
    const useEffectSnippet = content.substring(before, before + 50);
    console.log('⚠️  Encontrado en posición diferente:', useEffectSnippet);
  } else {
    console.log('⚠️  No encontró fetch a /api/chat');
  }
}

// Fix 3: El sendMessage debe setUserSent(true) antes de enviar
const oldSend = 'const sendMessage = async () => {';
const newSend = 'const sendMessage = async () => {\n    setUserSent(true);';

if (content.includes(oldSend)) {
  content = content.replace(oldSend, newSend);
  console.log('✅ setUserSent(true) agregado en sendMessage');
} else {
  // Buscar variante
  if (content.includes('sendMessage')) {
    console.log('⚠️  sendMessage existe pero no encontró patron exacto');
    const idx = content.indexOf('sendMessage');
    console.log('Contexto:', content.substring(idx, idx + 100));
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Archivo guardado');
console.log('Reinicia Vite para aplicar cambios');
