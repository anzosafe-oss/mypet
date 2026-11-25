/* Anonymous-style pull refresh: only the compact indicator moves. */
(()=>{
'use strict';
if(navigator.maxTouchPoints<1)return;
const indicator=document.createElement('div');
indicator.id='pull-refresh-indicator';indicator.hidden=true;
indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');
indicator.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6 7a7 7 0 0 1 11.5-1L20 9M4 15l2.5 3A7 7 0 0 0 18 17"/></svg><span></span>';
const label=indicator.querySelector('span');document.body.append(indicator);
const style=document.createElement('style');
style.textContent='#pull-refresh-indicator{position:fixed;top:calc(var(--app-header-height,68px) + env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);z-index:40;display:flex;align-items:center;gap:8px;width:max-content;max-width:calc(100% - 24px);padding:8px 12px;border:1px solid #cddcc5;border-radius:999px;background:#fff;color:var(--green);font:13px/1.3 system-ui,sans-serif;pointer-events:none;box-sizing:border-box;box-shadow:0 4px 18px #234e4612}#pull-refresh-indicator[hidden]{display:none}#pull-refresh-indicator svg{width:18px;height:18px;flex-shrink:0}#pull-refresh-indicator[data-state=ready]{border-color:var(--green)}#pull-refresh-indicator[data-state=loading] svg{animation:mypet-refresh-spin .8s linear infinite}@keyframes mypet-refresh-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){#pull-refresh-indicator svg{animation:none!important}}';
document.head.append(style);
const threshold=88;
let start=null,distance=0,refreshing=false,hideTimer;
const atTop=()=>Math.max(window.scrollY||0,document.scrollingElement?.scrollTop||0)<=1;
const blocked=()=>refreshing||document.hidden||busy||invitationMode||!!document.querySelector('dialog[open]')||window.MyPetUpdates?.dirty()||!document.querySelector('#recordEditor').hidden;
const reset=()=>{start=null;distance=0;if(!refreshing){clearTimeout(hideTimer);indicator.hidden=true}};
function show(state,text){indicator.dataset.state=state;label.textContent=text;indicator.hidden=false}
function nested(target){for(let el=target;el&&el!==document.body;el=el.parentElement){if(el.scrollHeight>el.clientHeight+2&&/auto|scroll/.test(getComputedStyle(el).overflowY))return true}return false}
document.addEventListener('touchstart',e=>{
 reset();if(blocked()||!atTop()||e.touches.length!==1||(window.visualViewport?.scale||1)>1)return;
 if(e.target.closest?.('header,nav,button,a,input,textarea,select,form,dialog,[contenteditable]')||nested(e.target))return;
 const t=e.touches[0];start={x:t.clientX,y:t.clientY};
},{passive:true});
document.addEventListener('touchmove',e=>{
 if(!start)return;if(blocked()||!atTop()||e.touches.length!==1||!e.cancelable){reset();return}
 const t=e.touches[0],dx=t.clientX-start.x,dy=t.clientY-start.y;
 if(dy<0||(!distance&&Math.abs(dx)>Math.max(8,dy))){reset();return}
 if(dy<4&&!distance)return;e.preventDefault();distance=dy;
 show(distance>=threshold?'ready':'pull',distance>=threshold?'Eliberează pentru actualizare':'Trage în jos pentru actualizare');
},{passive:false});
document.addEventListener('touchend',async e=>{
 const run=!e.touches.length&&distance>=threshold&&!blocked()&&atTop();reset();if(!run)return;
 refreshing=true;show('loading','Se actualizează…');
 try{const result=await window.MyPetUpdates.refresh();if(result==='updating')return;show('done',result?'Carnet actualizat':'Actualizarea nu a reușit. Reîncearcă.')}catch{show('done','Actualizarea nu a reușit. Reîncearcă.')}
 finally{refreshing=false;hideTimer=setTimeout(reset,1400)}
},{passive:true});
document.addEventListener('touchcancel',reset,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
})();
