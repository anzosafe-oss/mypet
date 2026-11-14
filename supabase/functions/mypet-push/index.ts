import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import webpush from 'npm:web-push@3.6.7';
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const headers={'Access-Control-Allow-Origin':'https://anzosafe-oss.github.io','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
function checked(r:any){if(r.error)throw r.error;return r.data}
export function reminderStage(nextDate:string,today:string){const days=Math.round((Date.parse(nextDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);return days===7||days===1?days:null}
async function config(){let row=checked(await db.from('mypet_push_config').select('keys').eq('id',true).single());if(!row.keys.publicKey){checked(await db.from('mypet_push_config').update({keys:{...row.keys,...webpush.generateVAPIDKeys()}}).eq('id',true).is('keys->publicKey',null));row=checked(await db.from('mypet_push_config').select('keys').eq('id',true).single())}return row.keys}
async function dispatch(keys:any,uid?:string){
let query=db.from('mypet_push_subscriptions').select('*');if(uid)query=query.eq('user_id',uid);
const subs=checked(await query);let sent=0,failures=0;
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bucharest',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
for(const sub of subs){
if(!checked(await db.rpc('mypet_access_allowed_for',{uid:sub.user_id})))continue;
const targets=[7,1].map(days=>new Date(Date.parse(today+'T00:00:00Z')+days*86400000).toISOString().slice(0,10));
const due=checked(await db.from('health_records').select('id,category,next_date,pet_id').eq('user_id',sub.user_id).in('next_date',targets).neq('category','Greutate'));
if(!due.length)continue;
checked(await db.from('mypet_push_deliveries').delete().eq('subscription_id',sub.id).is('sent_at',null).lt('created_at',new Date(Date.now()-300000).toISOString()));
const claims=checked(await db.from('mypet_push_deliveries').upsert(due.map((d:any)=>({subscription_id:sub.id,record_id:d.id,next_date:d.next_date,stage:reminderStage(d.next_date,today)})),{onConflict:'subscription_id,record_id,next_date,stage',ignoreDuplicates:true}).select('*'));
if(!claims.length)continue;
const windowEnd=new Date(Date.parse(today+'T00:00:00Z')+7*86400000).toISOString().slice(0,10);
const badge=checked(await db.from('health_records').select('id').eq('user_id',sub.user_id).neq('category','Greutate').gte('next_date',today).lte('next_date',windowEnd)).length;
const body='Ai o administrare programată în curând. Deschide MyPet pentru detalii.';
try{
const request=webpush.generateRequestDetails(sub.subscription,JSON.stringify({title:'MyPet · Memento',body,badge}),{TTL:3600,urgency:'normal',topic:'mypet-due',vapidDetails:{subject:'mailto:anzo.safe@gmail.com',publicKey:keys.publicKey,privateKey:keys.privateKey}});
const res=await fetch(request.endpoint,{method:request.method,headers:request.headers,body:request.body,redirect:'error',signal:AbortSignal.timeout(15000)});
if(!res.ok){if([404,410].includes(res.status))checked(await db.from('mypet_push_subscriptions').delete().eq('id',sub.id));throw Error('Push HTTP '+res.status)}
checked(await db.from('mypet_push_deliveries').update({sent_at:new Date().toISOString()}).in('id',claims.map((c:any)=>c.id)));sent++;
}catch(err){failures++;checked(await db.from('mypet_push_deliveries').delete().in('id',claims.map((c:any)=>c.id)).is('sent_at',null));console.error('Push delivery failed',String(err))}
}
return {sent,failures};
}
function valid(sub:any){try{const u=new URL(sub.endpoint),h=u.hostname;return u.protocol==='https:'&&!u.port&&!u.username&&!u.password&&(h==='web.push.apple.com'||h.endsWith('.push.apple.com')||h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com')&&/^[A-Za-z0-9_-]{80,100}$/.test(sub.keys?.p256dh)&&/^[A-Za-z0-9_-]{20,30}$/.test(sub.keys?.auth)}catch{return false}}
Deno.serve(async req=>{
if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
if(req.method!=='POST')return reply({error:'Method not allowed'},405);
try{
const cron=req.headers.get('x-mypet-cron');
if(cron){const raw=checked(await db.from('mypet_push_config').select('keys').eq('id',true).single());if(cron!==raw.keys.cronToken)return reply({error:'Unauthorized'},401);if((await req.json()).action==='health')return reply({ok:true,configured:!!(await config()).publicKey});return reply(await dispatch(await config()))}
const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Autentificare necesară.'},401);
const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return reply({error:'Autentificare necesară.'},401);
const uid=auth.data.user.id,body=await req.json();
if(body.action!=='unsubscribe'&&!checked(await db.rpc('mypet_access_allowed_for',{uid})))return reply({error:'Accesul la MyPet nu este activ.'},403);
if(body.action==='config')return reply({publicKey:(await config()).publicKey});
if(body.action==='subscribe'){if(!valid(body.subscription))return reply({error:'Abonament push invalid.'},400);
const existing=checked(await db.from('mypet_push_subscriptions').select('user_id').eq('endpoint',body.subscription.endpoint).maybeSingle());
if(existing&&existing.user_id!==uid)return reply({error:'Dezactivează notificările din contul anterior pe acest dispozitiv.'},409);
checked(await db.from('mypet_push_subscriptions').upsert({user_id:uid,endpoint:body.subscription.endpoint,subscription:body.subscription},{onConflict:'endpoint'}));
return reply({ok:true,...await dispatch(await config(),uid)})}
if(body.action==='unsubscribe'){checked(await db.from('mypet_push_subscriptions').delete().eq('user_id',uid).eq('endpoint',String(body.endpoint)));return reply({ok:true})}
if(body.action==='check')return reply(await dispatch(await config(),uid));
return reply({error:'Acțiune invalidă.'},400);
}catch(err){console.error('MyPet push failed',String(err));return reply({error:'Notificările nu au putut fi procesate.'},500)}
});
