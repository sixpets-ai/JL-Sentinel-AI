const fs=require('fs');
const file='AgenteAvatar.tsx';
let c=fs.readFileSync(file,'utf8');
fs.writeFileSync(file+'.BAK2',c);
let i=c.indexOf('const speakTextWatson');
let j=i, depth=0, started=false;
for(let k=i;k<c.length;k++){
  if(c[k]==='{'){depth++;started=true;}
  if(c[k]==='}'){depth--;if(started&&depth===0){j=k;break;}}
}
const fn=const speakTextWatson = async (text, agentKey) => {
  try {
    const r = await fetch('/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,agent:agentKey})});
    const d = await r.json();
    if(d.fallback){ const u=new SpeechSynthesisUtterance(d.text||text); u.lang='es-MX'; u.rate=0.9; window.speechSynthesis.speak(u); return; }
  } catch(e){ console.warn('[TTS]',e); }
  const u2=new SpeechSynthesisUtterance(text); u2.lang='es-MX'; u2.rate=0.9; window.speechSynthesis.speak(u2);
};
c=c.substring(0,i)+fn+c.substring(j+1);
fs.writeFileSync(file,c);
console.log('OK - speakTextWatson reemplazado');
