/* Paso 5: caché PWA completa y recuperación sin conexión. */
const CACHE='el-camino-dental-v114';
const CORE=["./","./index.html","./play.html","./privacy.html","./terms.html","./teacher.html","./teacher.css","./teacher.js","./exam.html","./exam.css","./exam.js","./manifest.webmanifest","./i18n.js","./accessibility.js","./android-navigation.js","./learning-tools.js","./area-classifier.js","./primer-parcial-questions.js","./nomenclatura-etimologia-questions.js","./questions.js","./anatomia-questions.js","./anestesia-dental-questions.js","./minimum-50-questions-2026.js","./fundamentos-oclusion.js","./fundamentos-casos.js","./steiner-questions.js","./steiner-cases.js","./fisiologia-funcion-questions.js","./fisiologia-funcion-cases.js","./crecimiento-desarrollo-questions.js","./crecimiento-desarrollo-cases.js","./habitos-parafunciones-questions-1.js","./habitos-parafunciones-questions-2.js","./habitos-parafunciones-questions-3.js","./habitos-parafunciones-questions-4.js","./habitos-parafunciones-questions-5.js","./habitos-parafunciones-cases-1.js","./habitos-parafunciones-cases-2.js","./habitos-parafunciones-cases-3.js","./questions-extra-deck1.js","./questions-extra-deck2.js","./questions-extra-deck3.js","./expansion-questions-2026.js","./expansion-cases-2026.js","./legacy-difficulty-audit.js","./legacy-case-grading-audit.js","./cases.js","./cases-deck1.js","./cases-deck2.js","./cases-deck3.js","./cases-deck4.js","./cases-deck5.js","./cases-extra-deck1.js","./cases-extra-deck2.js","./cases-extra-deck3.js","./cases-extra-deck4.js","./cases-extra-deck5.js","./endodoncia-questions-2026.js","./ortodoncia-questions-2026.js","./step16-question-integrity.js","./step23-recovery-runtime.js","./step17-study-runtime.js","./step20-clinical-cases.js","./step21-bluetooth-runtime.js","./home-launcher-v1.js","./app-v10.js","./step9-characters-runtime.js","./step10-profile-runtime.js","./step11-characters-runtime.js","./step12-question-audit.js","./step13-question-catalog.js","./step24-content-audit.js","./odontologia-preventiva-questions-2026.js","./step6-board-runtime.js","./step7-ai-runtime.js","./step8-progress-runtime.js","./step18-progress-unified.js","./step19-specialty-stats.js","./game-data-button-v100.js","./game-board-canvas-v98.js","./styles-v10.css","./styles.css","./site.css","./ui-polish.css","./character-art.css","./android-touch-v85.css","./game-premium-v93.css","./step11-characters.css","./step17-study.css","./game-landscape-v100.css","./home-launcher-v1.css","./brand/logo-el-camino-dental.svg","./brand/icon-el-camino-dental.svg","./brand/characters/01-doctora.svg","./brand/characters/02-doctor.svg","./brand/characters/03-estudiante.svg","./brand/characters/04-estudiante-hombre.svg","./brand/characters/05-cientifica.svg","./brand/characters/06-profesor.svg","./brand/characters/07-profesora.svg","./brand/characters/08-nina.svg"];
self.addEventListener('install',event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await Promise.all(CORE.map(async url=>{
   try{await cache.add(new Request(new URL(url,self.registration.scope).href,{cache:'reload'}))}
   catch(error){console.warn('[PWA] No se pudo precargar:',url,error)}
  }));
  await self.skipWaiting();
 })());
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('el-camino-dental-')&&key!==CACHE).map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE);
  const cached=await cache.match(request,{ignoreSearch:true});
  if(cached)return cached;
  try{
   const response=await fetch(request);
   if(response&&response.ok)cache.put(request,response.clone()).catch(()=>{});
   return response;
  }catch(error){
   if(request.mode==='navigate'){
    const path=new URL(request.url).pathname;
    const fallback=path.endsWith('/teacher.html')?'./teacher.html':path.endsWith('/exam.html')?'./exam.html':path.endsWith('/privacy.html')?'./privacy.html':path.endsWith('/terms.html')?'./terms.html':path.endsWith('/play.html')?'./play.html':'./index.html';
    return (await cache.match(fallback))||(await cache.match('./play.html'))||Response.error();
   }
   return Response.error();
  }
 })());
});
