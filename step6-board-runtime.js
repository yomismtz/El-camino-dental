/* Paso 6 · tablero, turno y continuidad visual */
(function(){
'use strict';
function el(id){return document.getElementById(id)}
function player(){try{return window.step6GetState?window.step6GetState().players[window.step6GetState().current]:null}catch{return null}}
function cellInfo(pos){
  const r=typeof window.step6GetRuleForCell==='function'?window.step6GetRuleForCell(pos):{type:'neutral'};
  const labels={question:'Pregunta',case:'Caso clínico',advance1:'Avanza +1',advance2:'Tratamiento +2',back1:'Retrocede −1',back2:'Retrocede −2',back3:'Retrocede −3',vacation:'Vacaciones',tax:'Impuestos',equipment:'Equipo',lawsuit:'Demanda → cárcel',jail:'Cárcel',finish:'META',neutral:'Descanso',start:'Salida'};
  return labels[r.type]||'Casilla';
}
function ensureFocus(){
  if(el('step6Focus'))return;
  const host=document.querySelector('.dice-panel'); if(!host)return;
  const box=document.createElement('section');
  box.id='step6Focus'; box.className='step6-focus'; box.setAttribute('aria-live','polite');
  box.innerHTML='<div><b>POSICIÓN</b><strong id="step6Position">0 / 100</strong></div><div><b>DESTINO</b><strong id="step6Destination">—</strong></div><div><b>CASILLA</b><strong id="step6Cell">—</strong></div>';
  const phase=el('phaseIndicator'); if(phase)phase.after(box);
}
function updateFocus(){
  const p=player(); if(!p)return; ensureFocus();
  const pos=Math.max(0,Math.min(100,Number(p.position)||0));
  const d=Math.max(0,Number(el('diceTotal')&&el('diceTotal').textContent)||0);
  const raw=pos+d, dest=raw>100?100-(raw-100):raw;
  const destination=d?dest:'—';
  const posEl=el('step6Position'),dstEl=el('step6Destination'),cellEl=el('step6Cell');
  if(posEl)posEl.textContent=pos+' / 100';
  if(dstEl)dstEl.textContent=String(destination);
  if(cellEl)cellEl.textContent=cellInfo(destination==='—'?pos:Number(destination));
  const call=el('turnPlayerName'),prompt=el('turnPrompt');
  if(call)call.textContent=p.name;
  if(prompt){
    const phase=el('phaseIndicator')&&el('phaseIndicator').dataset.phase;
    prompt.textContent=phase==='timer'?p.name+' está respondiendo':phase==='result'?'Resultado de la respuesta':p.isComputer?'La computadora está jugando':'Lanza los dados';
  }
  const board=document.querySelector('.spiral-board');
  if(board)board.querySelectorAll('.step6-current-cell').forEach(x=>x.classList.remove('step6-current-cell'));
  const current=board&&board.querySelector('[data-cell="'+pos+'"]');
  if(current)current.classList.add('step6-current-cell');
}
function pulseTurn(){
  const call=document.querySelector('.turn-callout'); if(!call)return;
  call.classList.remove('step6-turn-pulse'); void call.offsetWidth; call.classList.add('step6-turn-pulse');
}
function install(){
  ensureFocus(); updateFocus();
  const game=el('game');
  if(game)new MutationObserver(updateFocus).observe(game,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-phase']});
  let lastPosition=-1,lastPlayer=-1;
  setInterval(function(){
    if(!el('game')||!el('game').classList.contains('active'))return;
    updateFocus();
    const p=player(),pos=p?p.position:-1,idx=window.step6GetState?window.step6GetState().current:-1;
    if(pos!==lastPosition||idx!==lastPlayer){lastPosition=pos;lastPlayer=idx;pulseTurn()}
  },350);
  window.addEventListener('pagehide',function(){try{if(window.state&&typeof window.saveGame==='function')window.saveGame()}catch{}},{passive:true});
  window.addEventListener('elcamino:native-pause',function(){try{if(window.state&&typeof window.saveGame==='function')window.saveGame()}catch{}});
  window.addEventListener('elcamino:native-resume',function(){setTimeout(updateFocus,80)});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(install,0)});else setTimeout(install,0);
window.step6UpdateBoardFocus=updateFocus;
})();