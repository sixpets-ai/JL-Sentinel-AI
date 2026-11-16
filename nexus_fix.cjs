const fs=require('fs');
const VITE=`import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({\n  plugins: [react()],\n  optimizeDeps: { exclude: ["maplibre-gl"] },\n  worker: { format: "es" },\n  server: {\n    port: 5174, host: "127.0.0.1",\n    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: true } }\n  }\n});\n`;
fs.writeFileSync('vite.config.ts',VITE,'utf8');
console.log('OK vite.config.ts — worker ES fix');
let s=fs.readFileSync('server.js','utf8');
if(!s.includes('uncaughtException')){
const g="\nprocess.on('uncaughtException',(e)=>{console.error('[NEXUS] Error capturado:',e.message);});\nprocess.on('unhandledRejection',(r)=>{console.error('[NEXUS] Promise:',r);});\n";
s=g+s;fs.writeFileSync('server.js',s,'utf8');
console.log('OK server.js — crash guard');
}else{console.log('OK server.js — guard ya existe');}
console.log('LISTO — reinicia: node server.js y npm run dev');
