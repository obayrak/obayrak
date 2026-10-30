(function(){
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
      var fit=function(){ try{ var h=Math.max(d.documentElement.scrollHeight,d.body?d.body.scrollHeight:0); if(h>f.clientHeight+4) f.style.height=h+'px'; }catch(e){} };
      fit(); setTimeout(fit,500); setTimeout(fit,2000);
      try{ new (window.ResizeObserver||function(){this.observe=function(){}})(fit).observe(d.body||d.documentElement); }catch(e){}
    }
  }
  document.querySelectorAll('.frame iframe').forEach(function(f){
    f.addEventListener('load',function(){wire(f);}); if(f.contentDocument&&f.contentDocument.readyState==='complete') wire(f);
  });
  document.querySelectorAll('[data-fs]').forEach(function(b){
    b.addEventListener('click',function(){var f=document.getElementById(b.getAttribute('data-fs')); if(f.requestFullscreen) f.requestFullscreen();});
  });
})();