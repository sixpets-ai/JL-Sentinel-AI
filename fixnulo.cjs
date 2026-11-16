const fs=require('fs');
const files=['AuthBiometrico.tsx','CitizenGuardian.tsx','CommandView.tsx','osintDetector.ts','SabanaAnalyzer.tsx'];
files.forEach(f=>{
  const c=fs.readFileSync(f,'utf8');
  const fixed=c.replace(/\bnulo\b/g,'null');
  const count=(c.match(/\bnulo\b/g)||[]).length;
  if(count>0){fs.writeFileSync(f,fixed,'utf8');console.log(f,count,'fixed');}
});
