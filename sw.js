const CACHE='enzo-shell-v1.3.5';
const FILES=['./','./index.html','./app.js','./push.js?v=1.2.0','./pull-refresh.js?v=1.0.3','./manifest.webmanifest','./vendor/supabase.min.js','./icons/favicon-32.png','./icons/apple-touch-icon.png','./icons/icon-192.png','./icons/icon-512.png','./icons/logo-original.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('enzo-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==self.location.origin||!FILES.some(p=>new URL(p,self.registration.scope).href===u.href))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy))}return r}).catch(()=>caches.match(e.request)))});
self.addEventListener('push',e=>e.waitUntil((async()=>{let d={};try{d=e.data?.json()||{}}catch{}
await self.registration.showNotification(d.title||'MyPet · Memento',{body:d.body||'Deschide MyPet pentru detalii.',icon:new URL('icons/icon-192.png',self.registration.scope).href,tag:'mypet-due',data:{url:self.registration.scope}});
if(self.navigator.setAppBadge&&d.badge>0)try{await self.navigator.setAppBadge(d.badge)}catch{}
})()));
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil((async()=>{const url=self.registration.scope;for(const c of await self.clients.matchAll({type:'window',includeUncontrolled:true})){if(c.url.startsWith(url)&&'focus' in c){await c.focus();return}}await self.clients.openWindow(url)})())});
