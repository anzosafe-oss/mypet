/* Optional standalone-only pull to refresh. Remove this script to restore the previous behavior. */
(()=>{
'use strict';
const standalone=()=>navigator.standalone===true||window.matchMedia('(display-mode: standalone)').matches;
if(!standalone()||navigator.maxTouchPoints<1)return;
const dirtyForms=new WeakSet();
const markDirty=e=>{const form=e.target.closest?.('form');if(form)dirtyForms.add(form)};
document.addEventListener('input',markDirty,true);
document.addEventListener('reset',e=>dirtyForms.delete(e.target),true);
document.addEventListener('change',markDirty,true);
document.addEventListener('click',e=>{if(e.target.closest?.('[data-fuel]'))markDirty(e)},true);
const indicator=document.createElement('div');
indicator.id='pull-refresh-indicator';indicator.hidden=true;indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');
document.body.append(indicator);
const style=document.createElement('style');
style.textContent="#pull-refresh-indicator{position:fixed;top:calc(env(safe-area-inset-top,0px) + 16px + var(--mypet-refresh-top-gap,0px));left:50%;transform:translateX(-50%);z-index:1000;box-sizing:border-box;max-width:calc(100% - 28px);display:flex;align-items:center;justify-content:center;gap:12px;padding:16px 20px;border:2px solid var(--green);border-radius:30px;background:var(--panel,#fff);color:var(--green);font:16px/1.35 Arial,Helvetica,sans-serif;text-align:center;pointer-events:none;box-shadow:0 6px 28px #0006}#pull-refresh-indicator[hidden]{display:none}#pull-refresh-indicator::before{content:\"↓\";display:block;flex-shrink:0;font-size:26px;line-height:1;width:24px}#pull-refresh-indicator[data-ready=\"true\"]::before{content:\"↻\"}#pull-refresh-indicator[data-loading=\"true\"]::before{content:\"\";box-sizing:border-box;width:24px;height:24px;border:3px solid currentColor;border-right-color:transparent;border-radius:50%;animation:mypet-refresh-spin .8s linear infinite}@keyframes mypet-refresh-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#pull-refresh-indicator[data-loading=\"true\"]::before{animation:none}}";
document.head.append(style);
let start=null,distance=0,dragging=false,reloading=false;
const atTop=()=>Math.max(window.scrollY||0,document.scrollingElement?.scrollTop||0)<=1;
const blocked=()=>reloading||document.querySelector('dialog[open]')||document.visibilityState==='hidden'||(typeof busy!=='undefined'&&busy);
const reset=()=>{start=null;distance=0;dragging=false;if(!reloading){indicator.hidden=true;indicator.removeAttribute('data-loading');indicator.removeAttribute('data-ready')}};
const formHasChanges=()=>[...document.querySelectorAll('form')].some(f=>f.getClientRects().length>0&&dirtyForms.has(f));
document.addEventListener('touchstart',e=>{
reset();
if(!standalone()||blocked()||!atTop()||e.touches.length!==1||window.visualViewport?.scale>1)return;
if(e.target.closest?.('input,textarea,select,button,a,label,dialog,.app-header,.bottom-nav,[contenteditable="true"]'))return;
// Preserve scrolling in any independently scrollable region.
for(let node=e.target;node&&node!==document.body;node=node.parentElement){if(node.scrollHeight>node.clientHeight+2&&/auto|scroll/.test(getComputedStyle(node).overflowY))return}
start={x:e.touches[0].clientX,y:e.touches[0].clientY};
},{passive:true});
document.addEventListener('touchmove',e=>{
if(!start)return;
if(e.touches.length!==1||blocked()||!atTop()){reset();return}
const dx=e.touches[0].clientX-start.x,dy=e.touches[0].clientY-start.y;
if(!dragging&&(dy<0||Math.abs(dx)>Math.max(12,Math.abs(dy)))){reset();return}
if(dy<10&&!dragging)return;
if(!e.cancelable){reset();return}
e.preventDefault();dragging=true;distance=Math.max(0,dy);
indicator.hidden=false;indicator.setAttribute('data-ready',String(distance>=110));indicator.textContent=distance>=110?'Eliberează pentru reîncărcare':'Trage pentru reîncărcare';
},{passive:false});
document.addEventListener('touchend',e=>{
if(e.touches.length){reset();return}
const refresh=dragging&&distance>=110&&!blocked()&&atTop();
reset();if(!refresh)return;
if(formHasChanges()&&!window.confirm('Ai modificări nesalvate. Reîncarci pagina și renunți la ele?'))return;
reloading=true;indicator.hidden=false;indicator.setAttribute('data-loading','true');indicator.textContent='Se reîncarcă…';
setTimeout(()=>window.location.reload(),700);
},{passive:true});
document.addEventListener('touchcancel',reset,{passive:true});
document.addEventListener('visibilitychange',reset);
})();

