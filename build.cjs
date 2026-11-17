const fs=require('node:fs');const path=require('node:path');
let html=fs.readFileSync(path.join(__dirname,'index.template.html'),'utf8');
for(const [tag,file]of [['STYLE','style.css'],['VALIDATION','validation.js'],['ENGINE','engine.js'],['WORKSPACE','workspace.js'],['STORAGE','storage.js'],['APP','app.js']])html=html.replace('/* '+tag+' */',()=>fs.readFileSync(path.join(__dirname,file),'utf8'));
html=html.replace('</style>',()=>fs.readFileSync(path.join(__dirname,'themes.css'),'utf8')+'\n</style>');
fs.writeFileSync(path.join(__dirname,'MEIQQ.html'),html);
console.log('Built MEIQQ.html ('+Buffer.byteLength(html)+' bytes)');
