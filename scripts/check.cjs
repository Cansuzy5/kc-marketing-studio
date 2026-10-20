const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public');
for(const name of ['app.js','ads.js'])new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const name of ['style.css','ads.js','app.js'])if(!html.includes(name)||!fs.existsSync(path.join(root,name)))throw Error('Missing asset '+name);
JSON.parse(fs.readFileSync(path.resolve(__dirname,'../vercel.json'),'utf8'));
console.log('Static assets and JavaScript checks passed. Deploy public/.');
