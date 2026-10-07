// Reuse the existing group interaction suite; adapt only static assets/output.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../sd-requirement-group');
const out=path.resolve(process.argv[2]||path.join(__dirname,'../group-regression'));
fs.mkdirSync(out,{recursive:true});
let source=fs.readFileSync(path.join(root,'reviews/verify.cjs'),'utf8');
source=source.replace("const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname,'..');",`const root=${JSON.stringify(root)};const out=${JSON.stringify(out)};`);
source=source.replace(/path\.join\(root,'/g,"path.join(out,'");
source=source.replace(/path\.join\(root,`/g,'path.join(out,`');
source=source.replace("path.join(out,'Prototype.html')","path.join(root,'Prototype.html')");
source=source.replace("res.writeHead(404);res.end()","const file=path.resolve(root,'..','.'+req.url);if(!file.startsWith(path.resolve(root,'..')+path.sep)){res.writeHead(403);res.end();return;}try{res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}");
source=source.replace("date:'2026-10-06',baseline:'d1124d11bb636f466abffa65c9f29cad00ecebe3'","date:'2026-10-07',baseline:'a2c60889036a0275dfdef3a62b7a6df6393c1c64'");
new Function('require','__dirname','process',source)(require,__dirname,process);
