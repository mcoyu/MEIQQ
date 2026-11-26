const fs=require('node:fs');const path=require('node:path');
let html=fs.readFileSync(path.join(__dirname,'index.template.html'),'utf8');
for(const [tag,file]of [['STYLE','style.css'],['CHINESE','zh-CN.js'],['I18N','i18n.js'],['VALIDATION','validation.js'],['ENGINE','engine.js'],['SERVICE_CATALOG','service-catalog.js'],['PRESET_EVIDENCE','preset-evidence.js'],['PRESETS','presets.js'],['COMPARISON_REPORT','comparison-report.js'],['WORKSPACE','workspace.js'],['STORAGE','storage.js'],['STUDIO','studio.js'],['STUDIO_SEEDS','studio-seeds.js'],['STUDIO_SESSION','studio-session.js'],['STUDIO_VIEW','studio-view.js'],['STUDIO_STYLE','studio.css'],['JOBS','jobs.js'],['JOBS_VIEW','jobs-view.js'],['JOBS_CONTROLLER','jobs-controller.js'],['JOBS_STYLE','jobs.css'],['PLANNER','planner.js'],['PLANNER_EXPLORER','planner-explorer.js'],['PLANNER_STUDIO','planner-studio.js'],['PLANNER_BRIDGE','planner-bridge.js'],['PLANNER_VIEW','planner-view.js'],['PLANNER_CONTROLLER','planner-controller.js'],['PLANNER_STYLE','planner.css'],['STUDIO_FLIGHT','studio-flight.js'],['APP','app.js'],['SUNSET_SCENE','sunset-scene.js'],['SHARD_FLIGHT','shard-flight.js'],['SKY_CAMERA','sky-camera.js'],['GALAXY','galaxy.js'],['WATERFRONT_MODEL','waterfront-model.js'],['WATERFRONT','waterfront.js'],['SKY_EDITOR','sky-editor.js']])html=html.replace('/* '+tag+' */',()=>fs.readFileSync(path.join(__dirname,file),'utf8'));
const theme=fs.readFileSync(path.join(__dirname,'themes.css'),'utf8');
const offlineTheme=theme.replace(/url\("(assets\/client-menus\/[a-z-]+\.jpg)"\)/g,(_,file)=>{
  const jpeg=fs.readFileSync(path.join(__dirname,file));
  return 'url("data:image/jpeg;base64,'+jpeg.toString('base64')+'")';
});
html=html.replace('</style>',()=>offlineTheme+'\n</style>');
fs.writeFileSync(path.join(__dirname,'MEIQQ.html'),html);
console.log('Built MEIQQ.html ('+Buffer.byteLength(html)+' bytes)');
