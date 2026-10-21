// Official SheetJS 0.20.3 standalone build; verify bytes before serving locally.
const fs=require('node:fs'),crypto=require('node:crypto'),path=require('node:path');
const file=path.resolve(__dirname,'../public/vendor/xlsx.full.min.js');
const hash='cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41';
const valid=b=>crypto.createHash('sha256').update(b).digest('hex')===hash;
(async()=>{if(fs.existsSync(file)&&valid(fs.readFileSync(file)))return;const response=await fetch('https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js',{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Cannot download pinned Excel reader');const bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw Error('Excel reader checksum mismatch');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);})().catch(e=>{console.error(e.message);process.exitCode=1;});
