const fs=require('fs');
const f='server.js';
let c=fs.readFileSync(f,'utf8');
const OLD=`    const ttsText = encodeURIComponent(text.substring(0, 5000));
    const r = await fetch(
      \`\${url}/v1/synthesize?voice=\${voiceIBM}&text=\${ttsText}\`,
      { headers: { "Authorization": "Basic " + Buffer.from("apikey:" + key).toString("base64"), "Accept": "audio/mp3" } }
    );`;
const NEW=`    const ttsText = text.substring(0, 5000);
    const r = await fetch(
      \`\${url}/v1/synthesize?voice=\${voiceIBM}\`,
      { method: "POST", headers: { "Authorization": "Basic " + Buffer.from("apikey:" + key).toString("base64"), "Accept": "audio/mp3", "Content-Type": "application/json" }, body: JSON.stringify({ text: ttsText }) }
    );`;
if(c.includes('encodeURIComponent(text.substring(0, 5000))')){
  c=c.replace(OLD,NEW);
  fs.writeFileSync(f,c,'utf8');
  console.log('FIX TTS POST OK');
}else{
  console.log('PATRON NO ENCONTRADO');
  const idx=c.indexOf('encodeURIComponent');
  console.log(c.substring(idx-5,idx+100));
}
