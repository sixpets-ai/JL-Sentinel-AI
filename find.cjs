const fs=require('fs');
const {execSync}=require('child_process');
const result=execSync('findstr /s /n "nulo" *.tsx *.ts').toString();
console.log(result);
