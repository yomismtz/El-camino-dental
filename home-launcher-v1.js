/* El Camino Dental — home launcher v1 */
(function(){
  function init(){
    document.querySelectorAll('[data-home-action]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var action=btn.getAttribute('data-home-action');
        if(action==='play'){
          var form=document.querySelector('#setup .setup-form');
          if(form)form.scrollIntoView({behavior:'smooth',block:'start'});
          var module=document.getElementById('gameModule');
          if(module)setTimeout(function(){module.focus({preventScroll:true});},220);
        }else if(action==='study'){
          var target=document.getElementById('studyBtn');
          if(target)target.click();
        }else if(action==='cases'){
          var target=document.getElementById('clinicalCasesBtn');
          if(target)target.click();
        }
      });
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
