(function(){
  /*headtools: Full screen + Open in new tab on the title line*/
  (function(){
    var head=document.querySelector('.pagehead'), fr=document.querySelectorAll('.frame');
    if(!head || fr.length!==1) return;
    var bar=fr[0].querySelector('.bar'); if(!bar) return;
    var box=document.createElement('div'); box.className='headtools';
    Array.prototype.slice.call(bar.querySelectorAll('[data-fs], a[target=_blank]')).forEach(function(el){ box.appendChild(el); });
    head.appendChild(box);
    if(!bar.children.length) bar.classList.add('empty');
  })();
  var btn=document.getElementById('menu-btn');
  if(btn){btn.addEventListener('click',function(e){e.stopPropagation();document.body.classList.toggle('menu');});}
  var mn=document.querySelector('main'); if(mn){mn.addEventListener('click',function(){document.body.classList.remove('menu');});}
  document.addEventListener('keydown',function(e){if(e.key==='Escape')document.body.classList.remove('menu');});
  var siteRoot=new URL(document.querySelector('link[rel=stylesheet]').getAttribute('href'),location.href).href.replace(/assets\.css.*$/,'');
  function wire(f){
    var d; try{d=f.contentDocument;}catch(e){return;} if(!d||!d.documentElement) return;
    d.addEventListener('click',function(ev){
      var a=ev.target&&ev.target.closest?ev.target.closest('a[href]'):null; if(!a) return;
      var raw=a.getAttribute('href')||''; if(raw.charAt(0)==='#'||/^(javascript|mailto|tel|blob|data):/i.test(raw)) return;
      if(a.hasAttribute('download')) return;
      var u; try{u=new URL(a.href);}catch(e){return;}
      if(u.href.indexOf(siteRoot)===0 && /\/(index\.html)?$/.test(u.pathname) ){ ev.preventDefault(); window.top.location.href=u.href; return; }
      if(u.origin!==location.origin){ ev.preventDefault(); window.open(u.href,'_blank','noopener'); }
    },true);
    if(f.classList.contains('auto')){
      /* Grow the frame to fit its content. If the content uses 100vh / innerHeight,
         every resize makes the content taller by the same amount (feedback loop).
         Detect that and fall back to a fixed-height frame that scrolls internally. */
      var ro=null, added=0, strikes=0, stopped=false;
      var stop=function(){ stopped=true; f.classList.remove('auto'); f.style.height=''; try{ if(ro&&ro.disconnect) ro.disconnect(); }catch(e){} };
      var fit=function(){
        if(stopped) return;
        try{
          var h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0), cur=f.clientHeight;
          if(h>cur+4){
            var inc=h-cur;
            if(added>0 && inc>=added*0.5){ if(++strikes>=3) return stop(); } else strikes=0;
            added=inc; f.style.height=h+'px';
            if(h>50000) stop();
          }
        }catch(e){}
      };
      fit(); setTimeout(fit,500); setTimeout(fit,2000);
      try{ if(window.ResizeObserver){ ro=new ResizeObserver(fit); ro.observe(d.body||d.documentElement); } }catch(e){}
    }
  }
  function themeBar(f){
    var w; try{ w=f.contentWindow; }catch(e){ return; }
    if(!w || !w.__siteTheme) return;
    var bar=f.parentNode.querySelector('.bar'); if(!bar || bar.querySelector('.th-n')) return;
    var n=document.createElement('button'), d=document.createElement('button');
    n.type=d.type='button'; n.className='th-n'; d.className='th-d';
    n.innerHTML='&#9790; Night'; d.innerHTML='&#9728; Day'; n.title='Night mode'; d.title='Day mode';
    n.onclick=function(){ w.__siteTheme.set('night'); }; d.onclick=function(){ w.__siteTheme.set('day'); };
    bar.insertBefore(d,bar.firstChild); bar.insertBefore(n,d); bar.classList.remove('empty');
    window.__siteThemeSync(w.__siteTheme.mode());
  }
  window.__siteThemeSync=function(m){
    document.querySelectorAll('.frame .bar .th-n').forEach(function(b){ b.classList.toggle('on',m==='night'); });
    document.querySelectorAll('.frame .bar .th-d').forEach(function(b){ b.classList.toggle('on',m==='day'); });
  };
  document.querySelectorAll('.frame iframe').forEach(function(f){
    f.addEventListener('load',function(){wire(f); themeBar(f);}); if(f.contentDocument&&f.contentDocument.readyState==='complete'){ wire(f); themeBar(f); }
  });
  document.querySelectorAll('[data-fs]').forEach(function(b){
    b.addEventListener('click',function(){var f=document.getElementById(b.getAttribute('data-fs')); if(f.requestFullscreen) f.requestFullscreen();});
  });
})();
