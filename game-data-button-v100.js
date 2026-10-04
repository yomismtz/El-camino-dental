/* v100 — botón visible de datos del jugador */
(function(){
  'use strict';
  function install(){
    const panel=document.querySelector('#game .players-panel');
    const title=panel?.querySelector('.panel-title');
    if(!panel||!title||document.getElementById('gameDataBtn'))return;
    const b=document.createElement('button');
    b.id='gameDataBtn'; b.type='button'; b.className='game-data-btn';
    b.textContent='📊 Datos'; b.setAttribute('aria-label','Ver datos y progreso');
    b.addEventListener('click',()=>document.getElementById('profileBtn')?.click());
    title.appendChild(b);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();

/* Build trigger: verify Android landscape manifest. */
