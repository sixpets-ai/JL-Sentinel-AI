const fs = require('fs');
const lines = fs.readFileSync('SabanaAnalyzer.tsx', 'utf8').split('\n');
for(let i=351; i<699; i++){
  const ln = lines[i];
  if(ln.includes('?') && !ln.trim().startsWith('//') && !ln.trim().startsWith('*')){
    const qCount = (ln.match(/\?/g)||[]).length;
    const cCount = (ln.match(/:/g)||[]).length;
    if(qCount > cCount) console.log('L'+(i+1)+' Q='+qCount+' C='+cCount+':', ln.trim().substring(0,100));
  }
}
