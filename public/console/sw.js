const scopeUrl=new URL(self.registration.scope);
const surfaceBase=scopeUrl.pathname.replace(/\/$/,'');
const STATIC_CACHE='relnet-mobile-static-v81';
const DB_NAME='relnet-mobile-v68',STORE='shareDrafts',DROP_LIMIT=2*1024*1024*1024;
const STATIC_ASSETS=[`${surfaceBase}/static/styles.css`,`${surfaceBase}/static/app.js`,`${surfaceBase}/static/pwa.js`,`${surfaceBase}/static/relnet-brand.png`,`${surfaceBase}/static/relnet-icon-192.png`,`${surfaceBase}/static/relnet-icon-512.png`,`${surfaceBase}/static/relnet-icon-maskable-512.png`,`${surfaceBase}/static/apple-touch-icon.png`];
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function saveDraft(draft){const db=await openDb();await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(draft);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
function draftId(){return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;}
async function handleShareTarget(request){
  const form=await request.formData();
  const files=form.getAll('file').filter((item)=>item instanceof File).slice(0,20);
  if(!files.length)return new Response('No se recibió ningún archivo.',{status:400});
  if(files.some((file)=>file.size>DROP_LIMIT))return new Response('RelDrop admite hasta 2 GiB por archivo.',{status:413});
  const id=draftId();
  await saveDraft({id,createdAt:Date.now(),title:String(form.get('title')||''),text:String(form.get('text')||''),url:String(form.get('url')||''),files});
  return Response.redirect(`${surfaceBase}/?tool=reldrop&share_draft=${encodeURIComponent(id)}`,303);
}
self.addEventListener('install',(event)=>event.waitUntil(caches.open(STATIC_CACHE).then((cache)=>cache.addAll(STATIC_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',(event)=>event.waitUntil(Promise.all([caches.keys().then((keys)=>Promise.all(keys.filter((key)=>key.startsWith('relnet-mobile-static-')&&key!==STATIC_CACHE).map((key)=>caches.delete(key)))),openDb().then((db)=>{const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),req=store.openCursor(),cutoff=Date.now()-24*60*60*1000;req.onsuccess=()=>{const c=req.result;if(!c)return;if((c.value?.createdAt||0)<cutoff)c.delete();c.continue();};return new Promise((resolve)=>{tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();resolve();};});}),self.clients.claim()])));
async function networkFirstStatic(request){const cache=await caches.open(STATIC_CACHE);try{const response=await fetch(request,{cache:'no-store'});if(response.ok)await cache.put(request,response.clone());return response;}catch(error){const cached=await cache.match(request);if(cached)return cached;throw error;}}
function sensitive(url){return url.pathname.startsWith(`${surfaceBase}/api/`)||url.pathname.startsWith('/v1/')||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/')||url.pathname.startsWith('/oauth/')||url.pathname.startsWith('/mcp')||url.pathname.startsWith('/ws/')||url.pathname===`${surfaceBase}/share-target`;}
self.addEventListener('fetch',(event)=>{
  const url=new URL(event.request.url);
  if(event.request.method==='POST'&&url.origin===self.location.origin&&url.pathname===`${surfaceBase}/share-target`){event.respondWith(handleShareTarget(event.request));return;}
  if(event.request.method!=='GET'||url.origin!==self.location.origin||sensitive(url)||!url.pathname.startsWith(`${surfaceBase}/static/`))return;
  event.respondWith(networkFirstStatic(event.request));
});
self.addEventListener('push',(event)=>{let payload={};try{payload=event.data?event.data.json():{};}catch{payload={body:event.data?event.data.text():'Hay una nueva actualización en RelNet.'};}event.waitUntil(self.registration.showNotification(payload.title||'RelNet',{body:payload.body||'Hay una nueva actualización en tu red.',tag:payload.tag||'relnet-update',icon:`${surfaceBase}/static/relnet-icon-192.png`,badge:`${surfaceBase}/static/relnet-icon-192.png`,data:{url:payload.url||`${surfaceBase}/`}}));});
self.addEventListener('notificationclick',(event)=>{event.notification.close();const target=event.notification.data?.url||`${surfaceBase}/`;event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then((clients)=>{const existing=clients.find((client)=>'focus'in client);if(existing){existing.navigate(target);return existing.focus();}return self.clients.openWindow(target);}));});
