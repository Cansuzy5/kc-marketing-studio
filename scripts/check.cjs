const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../public');
for(const name of ['app.js','ads.js','cloud.js','leads.js','accounts.js'])new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const name of ['style.css','ads.js','app.js'])if(!html.includes(name)||!fs.existsSync(path.join(root,name)))throw Error('Missing asset '+name);
JSON.parse(fs.readFileSync(path.resolve(__dirname,'../vercel.json'),'utf8'));
console.log('Static assets and JavaScript checks passed. Deploy public/.');

fs.mkdirSync(path.join(root,'vendor'),{recursive:true});fs.copyFileSync(path.resolve(__dirname,'../node_modules/@supabase/supabase-js/dist/umd/supabase.js'),path.join(root,'vendor/supabase.js'));
