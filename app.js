'use strict';
let invitationMode=new URLSearchParams(location.search).get('type')==='invite'||new URLSearchParams(location.hash.slice(1)).get('type')==='invite';
const client = supabase.createClient('https://radskybbymadavveatzn.supabase.co','sb_publishable_VJh0qSiBA0OIcG7YqnLyjA_-YwiTlMT',{auth:{storageKey:'mypet-auth-v2',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const categories=['Vaccinuri','Vaccin Antirabic','Deparazitari Interne','Deparazitari Externe','Greutate'];
const labels=['Vaccinuri','Vaccin antirabic','Deparazitări interne','Deparazitări externe','Greutate'];
const form=document.querySelector('#form'),save=document.querySelector('#save'),statusEl=document.querySelector('#status');
const loginPanel=document.querySelector('#loginPanel'),appPanel=document.querySelector('#appPanel'),loginForm=document.querySelector('#loginForm');
let pets=[],activePet=null,editingPet=null,pendingPetDelete=null,pendingPetId=null;
function rememberedCategory(){try{const c=localStorage.getItem('mypet-selected-category');return categories.includes(c)?c:categories[0]}catch{return categories[0]}}
function rememberCategory(){try{localStorage.setItem('mypet-selected-category',selected)}catch{}}
let selected=rememberedCategory(),records=[],editingId=null,pendingId=null,busy=false,user=null,loadSequence=0;
function message(s,error=false){statusEl.textContent=s;statusEl.classList.toggle('error',error)}
function today(){return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bucharest'}).format(new Date())}
function formatDate(s){return s?s.split('-').reverse().join('.'):''}
function calculateAge(birth,current){
 let years=current.year-birth.year;
 if(current.month<birth.month||(current.month===birth.month&&current.day<birth.day))years--;
 let months=(current.year-(birth.year+years))*12+current.month-birth.month;
 function anchor(m){const total=birth.month-1+m,year=birth.year+years+Math.floor(total/12),month=((total%12)+12)%12;return new Date(Date.UTC(year,month,Math.min(birth.day,new Date(Date.UTC(year,month+1,0)).getUTCDate())))}
 const end=new Date(Date.UTC(current.year,current.month-1,current.day));if(anchor(months)>end)months--;
 return {years,months,days:Math.round((end-anchor(months))/86400000)};
}
function updateAge(){renderProfile()}
setInterval(updateAge,60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateAge()});
form.elements.date.value=today();
const nav=document.querySelector('.tabs');
categories.forEach((c,i)=>{const b=document.createElement('button');b.type='button';b.textContent=labels[i];b.onclick=()=>{if(busy)return;cancelEdit();selected=c;rememberCategory();setCategory();render()};nav.append(b)});
function setCategory(){const weight=selected==='Greutate';nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-pressed',String(categories[i]===selected)));document.querySelectorAll('.treatment').forEach(el=>{el.hidden=weight;el.querySelector('input').disabled=weight});document.querySelectorAll('.weight-excluded').forEach(el=>{el.hidden=weight;el.querySelector('input,textarea').disabled=weight});document.querySelector('#weightField').hidden=!weight;form.elements.weight.disabled=!weight;form.elements.weight.required=weight;form.elements.product.required=!weight;document.querySelector('#categoryLabel').textContent=labels[categories.indexOf(selected)]}
function cancelEdit(){editingId=null;pendingId=null;form.reset();form.elements.date.value=today();document.querySelector('#formTitle').textContent='Adaugă o înregistrare';save.textContent='Salvează';document.querySelector('#recordEditor').hidden=true}
async function startEdit(r){if(busy||!await authorizeEdit())return;document.querySelector('#recordEditor').hidden=false;editingId=r.id;pendingId=null;['date','product','weight','vet','notes'].forEach(n=>form.elements[n].value=r[n]??'');form.elements.nextDate.value=r.next_date||'';document.querySelector('#formTitle').textContent='Modifică înregistrarea';message('');form.scrollIntoView({behavior:'smooth',block:'start'})}
function render(){document.querySelector('.history-head').classList.toggle('weight-heading',selected==='Greutate');refreshNotices();window.updateMyPetBadge?.();const list=document.querySelector('#history');list.replaceChildren();list.classList.toggle('weight-history',selected==='Greutate');const rows=records.filter(r=>r.category===selected&&r.pet_id===activePet);if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='Încă nu ai înregistrări în această categorie.';list.append(p)}if(selected==='Greutate'&&rows.length){renderWeight(rows,list);return}rows.forEach(r=>{const article=document.createElement('article');article.className='entry'+(needsAttention(r)?' due-entry':'');const date=document.createElement('time');date.textContent=formatDate(r.date);const title=document.createElement('strong');title.textContent=r.category==='Greutate'?String(r.weight).replace('.',',')+' kg':r.product;const content=document.createElement('div');content.className='entry-content';const administered=document.createElement('p');administered.className='admin-date';administered.textContent='Administrat la: '+formatDate(r.date);content.append(administered);if(needsAttention(r))content.append(attentionLabel(r));[r.next_date?'Următoarea administrare: '+formatDate(r.next_date):'',r.vet,r.notes].filter(Boolean).forEach(s=>{const p=document.createElement('p');p.textContent=s;content.append(p)});const b=weightIcon('Modifică înregistrarea din '+formatDate(r.date),'<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>');b.onclick=()=>startEdit(r);const actions=document.createElement('div');actions.className='entry-actions weight-actions';const remove=weightIcon('Șterge înregistrarea din '+formatDate(r.date),'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>');remove.classList.add('weight-delete');remove.onclick=()=>deleteRecord(r);actions.append(b,remove);const header=document.createElement('div');header.className='event-top';header.append(title,actions);article.append(header,content);list.append(article)})}
async function deleteRecord(record){
 if(busy||!user)return;
 const description=record.category==='Greutate'?String(record.weight).replace('.',',')+' kg':record.product;
 if(!window.confirm('Ștergi înregistrarea „'+description+'” din '+formatDate(record.date)+'? Această acțiune nu poate fi anulată.'))return;
 if(!await authorizeEdit())return;
 ++loadSequence;
 setBusy(true);message('Se șterge…');
 try{
  const {data,error}=await client.from('health_records').delete().eq('id',record.id).eq('user_id',user.id).select('id');
  if(error)throw error;
  if(!data||data.length!==1)throw new Error('Ștergerea nu a fost confirmată.');
  records=records.filter(r=>r.id!==record.id);
  if(editingId===record.id)cancelEdit();
  message('Înregistrarea a fost ștearsă.');
 }catch(error){message('Ștergerea nu a fost confirmată. Reîncarcă pagina pentru a verifica istoricul. Dacă înregistrarea rămâne, verifică și configurarea permisiunii de ștergere.',true)}
 finally{setBusy(false)}
}
function setBusy(value){busy=value;document.querySelectorAll('#dogs button,#addDog,#editDog,#addFirstDog,#dogForm button,#dogForm input,#dogForm select,#confirmDelete button').forEach(el=>el.disabled=value);save.disabled=value||!user;document.querySelector('#logout').disabled=value;document.querySelector('#addRecord').disabled=value;nav.querySelectorAll('button').forEach(b=>b.disabled=value);form.querySelectorAll('input,textarea').forEach(el=>el.readOnly=value);render()}
async function load(){if(!user||busy||invitationMode)return;const seq=++loadSequence,uid=user.id;setBusy(true);petMessage('Se încarcă datele…');try{
 const visit=await client.rpc('mypet_visit');if(visit.error)throw Object.assign(new Error('Accesul la MyPet nu este activ sau nu poate fi verificat. Contactează administratorul.'),{accessDenied:true});
 const [p,r]=await Promise.all([client.from('pets').select('*').eq('user_id',uid).order('created_at'),client.from('health_records').select('*').eq('user_id',uid).order('date',{ascending:false}).order('created_at',{ascending:false})]);
 if(p.error)throw p.error;if(r.error)throw r.error;if(seq!==loadSequence||user?.id!==uid)return;loginPanel.hidden=true;appPanel.hidden=!document.querySelector('#settingsPanel').hidden;pets=p.data;records=r.data;if(!pets.some(p=>p.id===activePet))activePet=pets[0]?.id||null;renderPets();render();petMessage('');
 }catch(e){if(seq===loadSequence){if(e.accessDenied){pets=[];records=[];activePet=null;renderPets();render();appPanel.hidden=true;document.querySelector('#settingsPanel').hidden=true;loginPanel.hidden=false;document.querySelector('#loginStatus').textContent=e.message;}else petMessage('Datele nu au putut fi încărcate. Reîncarcă pagina pentru a reîncerca.',true)}}finally{setBusy(false)}}

form.addEventListener('input',()=>pendingId=null);
form.addEventListener('submit',async e=>{e.preventDefault();if(!user||!activePet||busy||!form.reportValidity())return;const values=Object.fromEntries(new FormData(form)),weight=selected==='Greutate';if(!weight&&values.nextDate&&values.nextDate<values.date){message('Următoarea administrare nu poate fi înaintea datei înregistrării.',true);return}if(!weight&&!values.product.trim()){message('Completează produsul.',true);return}pendingId=pendingId||crypto.randomUUID();const id=editingId||pendingId,wasEdit=!!editingId;
 const payload={pet_id:activePet,category:selected,date:values.date,product:weight?'':values.product.trim(),next_date:weight?null:values.nextDate||null,weight:weight?Number(values.weight):null,vet:weight?(records.find(r=>r.id===editingId)?.vet||''):values.vet.trim(),notes:weight?(records.find(r=>r.id===editingId)?.notes||''):values.notes.trim()};
 if(!await authorizeEdit())return;setBusy(true);message('Se salvează…');try{
  let result;
  if(wasEdit)result=await client.from('health_records').update(payload).eq('id',id).eq('user_id',user.id).select().single();
  else {result=await client.from('health_records').insert({...payload,id,user_id:user.id}).select().single();
   if(result.error?.code==='23505')result=await client.from('health_records').select('*').eq('id',id).eq('user_id',user.id).single();}
  if(result.error)throw result.error;
  records=records.filter(r=>r.id!==id);records.push(result.data);records.sort((a,b)=>b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at));cancelEdit();message(wasEdit?'Modificările au fost salvate.':'Înregistrarea a fost salvată.');
 }catch(e){message(navigator.onLine?'Salvarea nu a fost confirmată. Câmpurile au fost păstrate; poți reîncerca.':'Nu ai conexiune la internet. Câmpurile au fost păstrate; reconectează-te și reîncearcă.',true)}finally{setBusy(false)}});
loginForm.addEventListener('submit',async e=>{e.preventDefault();const button=document.querySelector('#loginButton'),msg=document.querySelector('#loginStatus');button.disabled=true;msg.textContent='Se verifică datele…';try{const {error}=await client.auth.signInWithPassword({email:loginForm.elements.email.value.trim(),password:loginForm.elements.password.value});if(error)throw error;loginForm.elements.password.value='';msg.textContent='';await load()}catch(e){msg.textContent=navigator.onLine?'Autentificarea nu a reușit. Verifică e-mailul și parola și încearcă din nou.':'Nu ai conexiune la internet.'}finally{button.disabled=false}});
document.querySelector('#logout').onclick=async()=>{if(busy)return;document.querySelector('#logout').disabled=true;const {error}=await client.auth.signOut({scope:'local'});document.querySelector('#logout').disabled=false;if(error)message('Deconectarea nu a reușit. Încearcă din nou.',true)};
function sessionChanged(session){if(session?.user&&invitationMode){user=session.user;loginPanel.hidden=true;appPanel.hidden=true;document.querySelector('#invitePasswordDialog').showModal();return;}if(!session?.user){document.querySelector('#settingsPanel').hidden=true;}const previous=user?.id;user=session?.user||null;loginPanel.hidden=!!user;appPanel.hidden=!user||!document.querySelector('#settingsPanel').hidden;save.disabled=!user;if(previous!==user?.id)editUntil=0;if(!user){pets=[];activePet=null;closePetDialogs();renderPets();finishReauth(false);++loadSequence;records=[];cancelEdit();render()}else if(previous!==user.id){pets=[];activePet=null;renderPets();records=[];cancelEdit();render();setTimeout(load,0)}}

let editUntil=0,reauthPending=null,reauthBusy=false;
const reauthDialog=document.querySelector('#reauthDialog');
function finishReauth(ok){
 const resolve=reauthPending;reauthPending=null;
 document.querySelector('#reauthPassword').value='';
 if(reauthDialog.open)reauthDialog.close();
 if(resolve)resolve(ok);
}
function authorizeEdit(){
 if(!user)return Promise.resolve(false);
 if(Date.now()<editUntil)return Promise.resolve(true);
 if(reauthPending)return Promise.resolve(false);
 document.querySelector('#reauthStatus').textContent='';
 document.querySelector('#reauthPassword').value='';
 const promise=new Promise(resolve=>reauthPending=resolve);
 reauthDialog.showModal();document.querySelector('#reauthPassword').focus();
 return promise;
}
reauthDialog.addEventListener('cancel',e=>{e.preventDefault();if(!reauthBusy)finishReauth(false)});
document.querySelector('#reauthCancel').onclick=()=>{if(!reauthBusy)finishReauth(false)};
document.querySelector('#reauthForm').addEventListener('submit',async e=>{
 e.preventDefault();if(reauthBusy||!user)return;
 const uid=user.id,email=user.email;reauthBusy=true;
 document.querySelector('#reauthSubmit').disabled=true;document.querySelector('#reauthCancel').disabled=true;
 document.querySelector('#reauthStatus').textContent='Se verifică parola…';
 try{
  const {data,error}=await client.auth.signInWithPassword({email,password:document.querySelector('#reauthPassword').value});
  if(error||data.user?.id!==uid)throw error||new Error('Cont diferit');
  editUntil=Date.now()+60*60*1000-10000;
  finishReauth(true);
 }catch(error){document.querySelector('#reauthStatus').textContent='Parola nu a fost confirmată. Verifică parola și conexiunea.';document.querySelector('#reauthPassword').value='';document.querySelector('#reauthPassword').focus()}
 finally{reauthBusy=false;document.querySelector('#reauthSubmit').disabled=false;document.querySelector('#reauthCancel').disabled=false}
});
document.querySelector('#addRecord').onclick=async()=>{
 if(busy||!await authorizeEdit())return;
 cancelEdit();message('');document.querySelector('#recordEditor').hidden=false;
 
 form.scrollIntoView({behavior:'smooth',block:'start'});
};

function petMessage(text,error=false){const el=document.querySelector('#petStatus');el.textContent=text;el.style.color=error?'#a33131':''}
function currentPet(){return pets.find(p=>p.id===activePet)}
function renderProfile(){const p=currentPet();if(!p)return;document.querySelector('#dogName').textContent=p.name;const birth=p.birth.split('-').map(Number),now=today().split('-').map(Number),a=calculateAge({year:birth[0],month:birth[1],day:birth[2]},{year:now[0],month:now[1],day:now[2]});const age=p.birth>today()?'Încă nu s-a născut':`${a.years} ${a.years===1?'an':'ani'} ${a.months} ${a.months===1?'lună':'luni'} ${a.days} ${a.days===1?'zi':'zile'}`;const list=document.querySelector('#profile');list.replaceChildren();[['Rasă',p.breed||'—'],['Data nașterii',formatDate(p.birth)],['Vârsta',age],['Sex',p.sex],['Canisă',p.breeder||'—'],['Microcip (CIP)',p.chip||'—']].forEach(([key,value])=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=key;dd.textContent=value;row.append(dt,dd);list.append(row)})}
function renderPets(){const empty=!pets.length;document.querySelector('#noDogs').hidden=!empty;document.querySelector('.section-heading').hidden=empty;document.querySelector('.profile-panel').hidden=empty;document.querySelector('.tabs').hidden=empty;document.querySelector('#recordsArea').hidden=empty;const list=document.querySelector('#dogs');list.replaceChildren();pets.forEach(p=>{const button=document.createElement('button');button.type='button';button.className='dog-card';button.setAttribute('aria-pressed',String(p.id===activePet));button.disabled=busy;const name=document.createElement('strong'),breed=document.createElement('small');name.textContent=p.name;breed.textContent=p.breed||'Profil cățel';if(records.some(r=>r.pet_id===p.id&&needsAttention(r))){const dot=document.createElement('span');dot.className='category-alert';dot.setAttribute('aria-hidden','true');name.append(dot)}button.append(name,breed);button.onclick=()=>{if(busy)return;cancelEdit();activePet=p.id;renderPets();render()};list.append(button)});renderProfile()}
function closePetDialogs(){for(const id of ['dogDialog','confirmDelete']){const d=document.querySelector('#'+id);if(d.open)d.close()}editingPet=null;pendingPetDelete=null;pendingPetId=null}
async function openPet(edit){if(busy||!user||!await authorizeEdit())return;editingPet=edit?activePet:null;pendingPetId=null;const f=document.querySelector('#dogForm');f.reset();document.querySelector('#dogTitle').textContent=edit?'Modifică profilul':'Adaugă cățel';document.querySelector('#deleteDogArea').hidden=!edit;document.querySelector('#dogError').textContent='';if(edit){const p=currentPet();if(!p)return;for(const key of ['name','breed','birth','sex','breeder','chip'])f.elements[key].value=p[key]||''}document.querySelector('#dogDialog').showModal()}
document.querySelector('#addDog').onclick=()=>openPet(false);document.querySelector('#addFirstDog').onclick=()=>openPet(false);document.querySelector('#editDog').onclick=()=>openPet(true);
document.querySelectorAll('[data-close="dogDialog"]').forEach(b=>b.onclick=()=>{if(!busy)document.querySelector('#dogDialog').close()});
document.querySelector('#dogDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault()});
document.querySelector('#dogForm').oninput=()=>pendingPetId=null;
document.querySelector('#dogForm').onsubmit=async e=>{e.preventDefault();if(busy||!user)return;const f=e.target,v=Object.fromEntries(new FormData(f));for(const k of ['name','breed','breeder','chip'])v[k]=v[k].trim();if(!v.name){f.elements.name.focus();return}if(!await authorizeEdit())return;const uid=user.id,id=editingPet||(pendingPetId=pendingPetId||crypto.randomUUID());setBusy(true);document.querySelector('#dogError').textContent='Se salvează…';try{let result=editingPet?await client.from('pets').update(v).eq('id',id).eq('user_id',uid).select().single():await client.from('pets').insert({...v,id,user_id:uid}).select().single();if(result.error?.code==='23505'&&!editingPet)result=await client.from('pets').select('*').eq('id',id).eq('user_id',uid).single();if(result.error)throw result.error;if(user?.id!==uid)return;pets=pets.filter(p=>p.id!==id);pets.push(result.data);activePet=id;closePetDialogs();cancelEdit();renderPets();petMessage('')}catch(e){document.querySelector('#dogError').textContent='Salvarea nu a fost confirmată. Verifică conexiunea și încearcă din nou.'}finally{setBusy(false)}};
document.querySelector('#deleteDog').onclick=()=>{if(busy||!currentPet())return;pendingPetDelete=activePet;const p=currentPet();document.querySelector('#deleteDescription').textContent=p.name+' · '+records.filter(r=>r.pet_id===p.id).length+' înregistrări';document.querySelector('#deleteError').textContent='';document.querySelector('#dogDialog').close();document.querySelector('#confirmDelete').showModal()};
function cancelPetDelete(){if(busy)return;pendingPetDelete=null;document.querySelector('#confirmDelete').close();document.querySelector('#dogDialog').showModal()}
document.querySelector('#cancelDeleteDog').onclick=cancelPetDelete;document.querySelector('#confirmDelete').addEventListener('cancel',e=>{e.preventDefault();cancelPetDelete()});
document.querySelector('#confirmDeleteDog').onclick=async()=>{if(busy||!user||!pendingPetDelete||!await authorizeEdit())return;const id=pendingPetDelete,uid=user.id;setBusy(true);document.querySelector('#deleteError').textContent='Se șterge…';try{const {data,error}=await client.from('pets').delete().eq('id',id).eq('user_id',uid).select('id');if(error)throw error;if(data?.length!==1)throw new Error('Ștergere neconfirmată');if(user?.id!==uid)return;pets=pets.filter(p=>p.id!==id);records=records.filter(r=>r.pet_id!==id);activePet=pets[0]?.id||null;closePetDialogs();cancelEdit();renderPets();petMessage('Profilul și înregistrările au fost șterse.')}catch(e){document.querySelector('#deleteError').textContent='Ștergerea nu a fost confirmată. Verifică conexiunea și reîncarcă pagina înainte de a reîncerca.'}finally{setBusy(false)}};
client.auth.onAuthStateChange((_event,session)=>sessionChanged(session));
setCategory();render();
client.auth.getSession().then(({data,error})=>{if(error){document.querySelector('#loginStatus').textContent='Conexiunea nu a putut fi verificată. Încearcă să te autentifici.';return}sessionChanged(data.session)});
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});


function weightText(tag,value){const el=document.createElement(tag);el.textContent=value;return el}
function weightIcon(label,path){const b=document.createElement('button');b.type='button';b.className='icon-button';b.disabled=busy;b.setAttribute('aria-label',label);b.title=label;b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';return b}
function renderWeight(rows,list){rows.forEach(r=>{const row=document.createElement('article');row.className='weight-row';const main=document.createElement('div');main.className='weight-main';const value=weightText('strong',String(r.weight).replace('.',','));value.append(weightText('span',' kg'));main.append(value,weightText('time',formatDate(r.date)));const actions=document.createElement('div');actions.className='weight-actions';const edit=weightIcon('Modifică înregistrarea din '+formatDate(r.date),'<path d="m16 3 5 5-12 12-6 1 1-6Z"/><path d="m14 5 5 5"/>');edit.onclick=()=>startEdit(r);const del=weightIcon('Șterge înregistrarea din '+formatDate(r.date),'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>');del.classList.add('weight-delete');del.onclick=()=>deleteRecord(r);actions.append(edit,del);row.append(main,actions);list.append(row)})}

function daysUntil(record){if(!record.next_date||record.category==='Greutate')return null;return Math.round((Date.parse(record.next_date+'T00:00:00Z')-Date.parse(today()+'T00:00:00Z'))/86400000)}
function needsAttention(record){const days=daysUntil(record);return days!==null&&days>=0&&days<=7}
function attentionLabel(record){const days=daysUntil(record),el=document.createElement('span');el.className='due-label';el.textContent=days<0?'Termen depășit':days===0?'Astăzi':days===1?'Mâine':'În '+days+' zile';return el}
function refreshNotices(){nav.querySelectorAll('button').forEach((button,i)=>{button.querySelector('.category-alert')?.remove();const count=records.filter(r=>r.pet_id===activePet&&r.category===categories[i]&&needsAttention(r)).length;button.setAttribute('aria-label',labels[i]+(count?' · '+count+' administrări care necesită atenție':''));if(count){const dot=document.createElement('span');dot.className='category-alert';dot.setAttribute('aria-hidden','true');button.append(dot)}})}
setInterval(()=>{if(user&&!document.hidden&&!busy)render()},60000);
document.addEventListener('visibilitychange',()=>{if(user&&!document.hidden&&!busy)load()});

// Invitation activation never replaces an existing password without an explicit submit.
document.querySelector('#invitePasswordForm').onsubmit=async event=>{
 event.preventDefault();const form=event.target,button=form.querySelector('button'),status=document.querySelector('#invitePasswordStatus');
 if(form.elements.password.value!==form.elements.confirm.value){status.textContent='Parolele nu coincid.';return;}
 button.disabled=true;status.textContent='Se salvează parola…';
 try{const result=await client.auth.updateUser({password:form.elements.password.value});if(result.error)throw result.error;
 invitationMode=false;history.replaceState(null,'',location.pathname);form.reset();document.querySelector('#invitePasswordDialog').close();appPanel.hidden=false;await load();
 }catch{status.textContent='Parola nu a putut fi salvată. Încearcă din nou sau cere retrimiterea invitației.';}finally{button.disabled=false;}
};
document.querySelector('#invitePasswordDialog').addEventListener('cancel',event=>event.preventDefault());
setInterval(()=>{if(user&&!document.hidden&&!busy&&!invitationMode)load();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&user&&!busy&&!invitationMode)load();});
