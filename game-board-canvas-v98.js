(() => {
  'use strict';

  function initDentalBoardCanvas(){
    const board=document.getElementById('board');
    if(!board || board.dataset.canvasV98==='1') return;
    board.dataset.canvasV98='1';

    const canvas=document.createElement('canvas');
    canvas.className='dental-board-canvas';
    canvas.setAttribute('aria-hidden','true');
    board.prepend(canvas);
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx) return;

    const COLORS={
      neutral:['#ffffff','#eef7fb'],
      question:['#48b8ee','#167bc9'],
      case:['#ad8bea','#7049c6'],
      advance1:['#72dfa0','#2cae70'],
      advance2:['#62d58f','#269d67'],
      back1:['#ff9fa9','#e96379'],
      back2:['#ff919f','#df566d'],
      back3:['#ff7f92','#d94762'],
      vacation:['#ffe080','#efb33e'],
      tax:['#ffe39a','#e4ad35'],
      equipment:['#c0b0f5','#7b61cf'],
      lawsuit:['#ffb3bb','#db5369'],
      jail:['#aeb9c7','#657488'],
      finish:['#fff1a9','#e7ad35'],
      start:['#ffffff','#dff3ea']
    };

    const GLYPHS={
      question:'?',
      case:'C',
      advance1:'↑',
      advance2:'↑↑',
      back1:'↓',
      back2:'↓↓',
      back3:'↘',
      vacation:'☀',
      tax:'$',
      equipment:'⚙',
      lawsuit:'⚖',
      jail:'▣',
      finish:'✓',
      neutral:'•'
    };

    const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
    const roundRect=(c,x,y,w,h,r)=>{
      const rr=Math.min(r,w/2,h/2);
      c.beginPath();
      c.moveTo(x+rr,y);
      c.arcTo(x+w,y,x+w,y+h,rr);
      c.arcTo(x+w,y+h,x,y+h,rr);
      c.arcTo(x,y+h,x,y,rr);
      c.arcTo(x,y,x+w,y,rr);
      c.closePath();
    };

    function centerFor(n,w,h){
      const i=n-1,row=Math.floor(i/10),step=i%10;
      const col=row%2===0?step:9-step;
      return {
        x:w*(0.05+col*0.1),
        y:h*(0.05+row*0.1)
      };
    }

    function typeOf(cell){
      for(const t of Object.keys(COLORS)){
        if(t!=='neutral'&&t!=='finish'&&cell.classList.contains(t)) return t;
      }
      if(cell.classList.contains('finish')) return 'finish';
      return 'neutral';
    }

    function resize(){
      const rect=board.getBoundingClientRect();
      const dpr=Math.min(window.devicePixelRatio||1,2);
      const w=Math.max(320,Math.round(rect.width));
      const h=Math.max(220,Math.round(rect.height));
      canvas.width=Math.round(w*dpr);
      canvas.height=Math.round(h*dpr);
      canvas.style.width=w+'px';
      canvas.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      draw(w,h);
    }

    function draw(w,h){
      ctx.clearRect(0,0,w,h);

      const bg=ctx.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,'#dff5d5');
      bg.addColorStop(.5,'#c9edca');
      bg.addColorStop(1,'#e8f6d4');
      ctx.fillStyle=bg;
      ctx.fillRect(0,0,w,h);

      // Fondo ilustrado, con espacio visual para las 100 casillas.
      const blobs=[
        [0.06,0.18,0.05,'#82d0bd'],[0.94,0.72,0.045,'#9ed9bd'],
        [0.10,0.88,0.055,'#b5d97b'],[0.91,0.12,0.05,'#b7df83'],
        [0.26,0.08,0.025,'#7dcc8a'],[0.78,0.92,0.032,'#83cf91']
      ];
      blobs.forEach(([px,py,pr,color])=>{
        ctx.beginPath();ctx.arc(w*px,h*py,Math.min(w,h)*pr,0,Math.PI*2);
        ctx.fillStyle=color;ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1;
      });

      const centers=Array.from({length:100},(_,i)=>centerFor(i+1,w,h));

      // Camino muy discreto: las casillas deben ser las protagonistas.
      ctx.save();
      ctx.lineCap='round';ctx.lineJoin='round';
      ctx.lineWidth=Math.max(7,Math.min(12,w*.006));
      ctx.strokeStyle='rgba(88,143,105,.18)';
      ctx.beginPath();
      centers.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.stroke();
      ctx.restore();

      const cells=[...board.querySelectorAll(':scope > .cell')];
      const tileW=w*.072;
      const tileH=h*.086;

      cells.forEach((cell,index)=>{
        const n=index+1,p=centers[index],type=typeOf(cell);
        const ww=n===100?tileW*1.03:tileW;
        const hh=n===100?tileH*1.03:tileH;
        const colors=COLORS[type]||COLORS.neutral;
        const g=ctx.createLinearGradient(p.x-ww/2,p.y-hh/2,p.x+ww/2,p.y+hh/2);
        g.addColorStop(0,colors[0]);g.addColorStop(1,colors[1]);

        // Sombra separada: evita que las casillas se fundan entre sí.
        ctx.save();
        roundRect(ctx,p.x-ww/2+2,p.y-hh/2+4,ww,hh,9);
        ctx.fillStyle='rgba(39,78,91,.15)';
        ctx.fill();
        ctx.restore();

        ctx.save();
        roundRect(ctx,p.x-ww/2,p.y-hh/2,ww,hh,9);
        ctx.fillStyle=g;ctx.fill();
        ctx.lineWidth=2;
        ctx.strokeStyle='rgba(255,255,255,.98)';
        ctx.stroke();
        ctx.restore();

        const active=cell.classList.contains('current-cell');
        const landed=cell.classList.contains('landed');
        if(active||landed){
          ctx.save();
          roundRect(ctx,p.x-ww/2-3,p.y-hh/2-3,ww+6,hh+6,11);
          ctx.lineWidth=3;
          ctx.strokeStyle=active?'#ffffff':'#ffc94d';
          ctx.shadowColor=active?'rgba(255,255,255,.9)':'rgba(255,190,50,.55)';
          ctx.shadowBlur=9;
          ctx.stroke();
          ctx.restore();
        }

        // Número grande y siempre visible.
        const dark=type==='neutral'||type==='vacation'||type==='tax'||type==='equipment'||type==='lawsuit'||type==='jail';
        ctx.fillStyle=dark?'#214c63':'#ffffff';
        ctx.font='900 '+clamp(w*.0135,12,19)+'px system-ui,sans-serif';
        ctx.textAlign='left';
        ctx.textBaseline='top';
        ctx.fillText(String(n),p.x-ww/2+7,p.y-hh/2+5);

        // Icono central, dibujado con glifo estable en Android.
        const glyph=GLYPHS[type]||GLYPHS.neutral;
        ctx.beginPath();
        ctx.arc(p.x,p.y+2,Math.min(ww,hh)*.25,0,Math.PI*2);
        ctx.fillStyle=type==='neutral'?'rgba(255,255,255,.72)':'rgba(255,255,255,.24)';
        ctx.fill();
        ctx.fillStyle=dark?'#31596a':'#ffffff';
        ctx.font='1000 '+clamp(Math.min(ww,hh)*.55,16,28)+'px system-ui,sans-serif';
        ctx.textAlign='center';
        ctx.textBaseline='middle';
        ctx.fillText(glyph,p.x,p.y+2);

        if(type!=='neutral'&&type!=='finish'){
          ctx.fillStyle=dark?'rgba(48,76,91,.75)':'rgba(255,255,255,.82)';
          ctx.font='800 '+clamp(w*.0075,8,11)+'px system-ui,sans-serif';
          ctx.textAlign='center';
          ctx.textBaseline='bottom';
          ctx.fillText(type==='question'?'PREG':type==='case'?'CASO':type==='jail'?'CÁRCEL':'EVENTO',p.x,p.y+hh/2-3);
        }
      });

      // INICIO: pequeño marcador fuera del flujo de las casillas.
      const s=centers[0];
      ctx.save();
      roundRect(ctx,Math.max(5,s.x-34),Math.min(h-28,s.y+hhSafe(h)*.48),68,23,8);
      ctx.fillStyle='rgba(255,255,255,.96)';ctx.fill();
      ctx.lineWidth=2;ctx.strokeStyle='rgba(48,119,92,.35)';ctx.stroke();
      ctx.fillStyle='#2c7359';ctx.font='900 10px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('INICIO',s.x,Math.min(h-28,s.y+hhSafe(h)*.48)+11.5);
      ctx.restore();

      // La META es la casilla 100: no colocamos un panel encima de otras casillas.
      const f=centers[99];
      ctx.save();
      roundRect(ctx,f.x-wwSafe(w)/2,f.y-hhSafe(h)/2,wwSafe(w),hhSafe(h),9);
      ctx.lineWidth=4;ctx.strokeStyle='#f0b92f';ctx.stroke();
      ctx.fillStyle='#725516';ctx.font='900 '+clamp(w*.0085,9,12)+'px system-ui,sans-serif';
      ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillText('META',f.x,f.y+hhSafe(h)/2-3);
      ctx.restore();

      // Acentos muy discretos en el fondo.
      const accents=[['🌿',.16,.035,16],['🪥',.34,.965,16],['🦷',.60,.035,17],['🌳',.84,.965,16]];
      accents.forEach(([t,x,y,size])=>{
        ctx.font=size+'px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.globalAlpha=.62;ctx.fillText(t,w*x,h*y);ctx.globalAlpha=1;
      });
    }

    function hhSafe(h){ return h*.086; }
    function wwSafe(w){ return w*.072; }

    const ro=new ResizeObserver(resize);
    ro.observe(board);
    const mo=new MutationObserver(()=>requestAnimationFrame(()=>{
      const r=board.getBoundingClientRect();
      draw(Math.max(320,Math.round(r.width)),Math.max(220,Math.round(r.height)));
    }));
    mo.observe(board,{subtree:true,attributes:true,attributeFilter:['class','style'],childList:true});

    window.addEventListener('resize',resize,{passive:true});
    window.addEventListener('orientationchange',()=>setTimeout(resize,80),{passive:true});
    resize();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDentalBoardCanvas,{once:true});
  else initDentalBoardCanvas();
})();
