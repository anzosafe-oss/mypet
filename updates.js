/* Safe application updates: preserve the current pet, category and view. */
(()=>{
'use strict';
const current=document.querySelector('meta[name="mypet-version"]').content;
const resumeKey='mypet-view-after-update';
let latest=null,inflight=null,lastCheck=0,updating=false;
const dirtyForms=new WeakSet();
const mark=e=>{const f=e.target.closest?.('form');if(f)dirtyForms.add(f)};
document.addEventListener('input',mark,true);
document.addEventListener('change',mark,true);
document.addEventListener('reset',e=>dirtyForms.delete(e.target),true);
const dirty=()=>[...document.querySelectorAll('form')].some(f=>f.getClientRects().length&&dirtyForms.has(f));
const blocked=()=>busy||invitationMode||!!location.hash||!!document.querySelector('dialog[open]')||updating;
const canReload=()=>!blocked()&&!dirty()&&document.querySelector('#recordEditor').hidden;
function newer(a,b){const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i]}return false}
function paint(text){
 const notice=document.querySelector('#updateNotice');notice.hidden=!latest;
 document.querySelector('#updateNoticeText').textContent=latest?'MyPet v'+latest+' este disponibil.':'';
 document.querySelector('#updateStatus').textContent=text||(latest?'O versiune nouă este pregătită.':'Aplicația este la zi · v'+current);
 document.querySelector('#applyUpdate').hidden=!latest;
}
function remember(){
 if(!user)return;
 try{sessionStorage.setItem(resumeKey,JSON.stringify({uid:user.id,pet:activePet,category:selected,settings:!document.querySelector('#settingsPanel').hidden,scroll:window.scrollY,at:Date.now()}))}catch{}
}
function restore(){
 if(!user)return;
 try{
  const raw=sessionStorage.getItem(resumeKey);if(!raw)return;sessionStorage.removeItem(resumeKey);
  const view=JSON.parse(raw);if(view.uid!==user.id||Date.now()-view.at>600000)return;
  if(pets.some(p=>p.id===view.pet))activePet=view.pet;
  if(categories.includes(view.category)){selected=view.category;rememberCategory();setCategory()}
  renderPets();render();
  if(view.settings){appPanel.hidden=true;document.querySelector('#settingsPanel').hidden=false}
  requestAnimationFrame(()=>window.scrollTo({top:Math.max(0,Number(view.scroll)||0),behavior:'instant'}));
 }catch{}
}
async function apply(manual=false){
 if(!latest||blocked())return false;
 if(!canReload()&&(!manual||!window.confirm('Ai o înregistrare deschisă sau modificări nesalvate. Actualizezi și renunți la ele?')))return false;
 updating=true;paint('Se pregătește actualizarea…');
 for(const b of document.querySelectorAll('[data-app-update]'))b.disabled=true;
 try{
  const url=new URL('index.html',location.href);url.searchParams.set('update',Date.now());
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error();
  const html=await response.text(),version=html.match(/<meta name="mypet-version" content="(\d+\.\d+\.\d+)">/)?.[1];
  if(!version||!newer(version,current))throw Error();
  await navigator.serviceWorker?.getRegistration('./').then(r=>r?.update()).catch(()=>{});
  remember();location.replace(url.href);return true;
 }catch{updating=false;paint('Actualizarea nu a reușit. Verifică conexiunea și reîncearcă.');for(const b of document.querySelectorAll('[data-app-update]'))b.disabled=false;return false}
}
async function check({automatic=false,force=false}={}){
 if(document.hidden)return false;
 if(inflight){await inflight;return automatic?apply():false}
 if(!force&&Date.now()-lastCheck<60000)return automatic?apply():false;
 lastCheck=Date.now();
 inflight=(async()=>{try{
  const url=new URL('version.json',location.href);url.searchParams.set('check',Date.now());
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(7000)});if(!response.ok)throw Error();
  const data=await response.json();if(!/^\d+\.\d+\.\d+$/.test(data.version))throw Error();
  latest=newer(data.version,current)?data.version:null;paint();
 }catch{paint('Versiunea nu a putut fi verificată. Încearcă din nou când ai conexiune.')}finally{inflight=null}})();
 await inflight;return automatic?apply():false;
}
async function refresh(){
 if(blocked()||dirty()||!document.querySelector('#recordEditor').hidden)return false;
 if(await check({automatic:true,force:true}))return 'updating';
 if(!user)return false;
 return await load({quiet:true});
}
document.querySelector('#checkUpdate').onclick=()=>check({force:true});
for(const button of document.querySelectorAll('[data-app-update]'))button.onclick=()=>apply(true);
window.MyPetUpdates={check,apply,refresh,dirty,restore,current};
window.addEventListener('pageshow',()=>check({automatic:true}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check({automatic:true})});
setInterval(()=>{if(!document.hidden)check()},300000);
paint();check({automatic:true});
})();
