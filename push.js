(()=>{
'use strict';
const ios=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const installed=()=>navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
const decode=key=>Uint8Array.from(atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4)),c=>c.charCodeAt(0));
const say=t=>document.querySelector('#pushStatus').textContent=t;
async function call(body){const r=await client.functions.invoke('mypet-push',{body});if(r.error){let detail;try{detail=await r.error.context?.json()}catch{}throw Error(detail?.error||r.error.message)}if(r.data?.error)throw Error(r.data.error);return r.data}
let reg=null,syncing=null,syncedUser=null;
window.syncMyPetPush=async function(){
 if(!user||!supported()||Notification.permission!=='granted'||(ios()&&!installed())||syncedUser===user.id)return;
 if(syncing)return syncing;
 const uid=user.id;
 syncing=(async()=>{try{const registration=await navigator.serviceWorker.ready,sub=await registration.pushManager.getSubscription();if(!sub||user?.id!==uid)return;await call({action:'subscribe',subscription:sub.toJSON()});if(user?.id===uid)syncedUser=uid}catch{}finally{syncing=null}})();return syncing;
};
async function init(){const enable=document.querySelector('#pushEnable'),disable=document.querySelector('#pushDisable');enable.disabled=true;disable.disabled=true;if(ios()&&!installed()){say('Pe iPhone, deschide MyPet din iconița de pe ecranul principal pentru activare.');return}if(!supported()){say('Acest browser nu permite notificări push.');return}try{reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();if(sub&&Notification.permission==='granted')await call({action:'subscribe',subscription:sub.toJSON()});const active=!!sub&&Notification.permission==='granted';enable.disabled=active;enable.textContent=active?'Dispozitiv activ':'Activează pe acest dispozitiv';disable.disabled=!sub;say(active?'Notificări active și cu aplicația închisă · cu 7 zile și cu 1 zi înainte.':Notification.permission==='denied'?'Notificările sunt blocate în setările dispozitivului.':'Activează dispozitivul și permite notificările.')}catch{say('Setările nu au putut fi încărcate. Încearcă din nou.')}}
document.querySelector('#openSettings').onclick=()=>{if(busy)return;document.querySelector('#appPanel').hidden=true;document.querySelector('#settingsPanel').hidden=false;window.scrollTo({top:0});init()};
document.querySelector('#backSettings').onclick=()=>{document.querySelector('#settingsPanel').hidden=true;document.querySelector('#appPanel').hidden=!user};
document.querySelector('#pushEnable').onclick=async()=>{const b=document.querySelector('#pushEnable');b.disabled=true;try{const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Permite notificările pentru a activa dispozitivul.');const config=await call({action:'config'});const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(config.publicKey)});await call({action:'subscribe',subscription:sub.toJSON()});await init();await window.updateMyPetBadge()}catch(e){b.disabled=false;say(e.message)}};
document.querySelector('#pushDisable').onclick=async()=>{const b=document.querySelector('#pushDisable');b.disabled=true;try{const sub=await reg.pushManager.getSubscription();if(sub){await call({action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe();syncedUser=null}await init()}catch(e){b.disabled=false;say(e.message)}};
window.updateMyPetBadge=async()=>{
 if(!('setAppBadge' in navigator)||!('serviceWorker' in navigator))return;
 const uid=user?.id;
 try{const registration=await navigator.serviceWorker.getRegistration('./'),sub=registration&&await registration.pushManager.getSubscription();if(uid!==user?.id)return;const count=uid&&sub&&Notification.permission==='granted'?records.filter(needsAttention).length:0;if(count)await navigator.setAppBadge(count);else await navigator.clearAppBadge()}catch{}
};
document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.updateMyPetBadge()});
window.updateMyPetBadge();
})();