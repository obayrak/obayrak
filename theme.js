/* Site-wide Night/Day switch for apps that have no theme buttons of their own.
   Night = dark background, Day = light background. The choice is remembered
   (localStorage "siteTheme") and shared by all pages of the site.
   The app's own colours are kept for its native mode; the other mode is made
   with an invert + hue-rotate filter (photos and videos are flipped back). */
(function(){
  if(window.__siteTheme) return;
  var KEY='siteTheme', nativeDark=null, nativeBg='', box=null;
  function get(){ try{ return localStorage.getItem(KEY)||''; }catch(e){ return ''; } }
  function put(m){ try{ localStorage.setItem(KEY,m); }catch(e){} }
  function rgb(el){
    if(!el) return null;
    var c=getComputedStyle(el).backgroundColor||'';
    var m=c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s\/]+([\d.]+))?/);
    if(!m) return null; if(m[4]!==undefined && parseFloat(m[4])<0.5) return null;
    return [+m[1],+m[2],+m[3]];
  }
  function lum(c){ return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255; }
  function detect(){
    var de=document.documentElement, was=de.classList.contains('st-inv');
    if(was) de.classList.remove('st-inv');
    var c=rgb(document.body)||rgb(de);
    if(!c){
      var e=document.elementFromPoint(Math.max(1,innerWidth/2),Math.min(80,innerHeight/2));
      while(e && !c){ c=rgb(e); e=e.parentElement; }
    }
    if(was) de.classList.add('st-inv');
    nativeBg = c ? 'rgb('+c.join(',')+')' : '#ffffff';
    return c ? lum(c)<0.45 : false;
  }
  var css='html.st-inv{filter:invert(1) hue-rotate(180deg)}'+
    'html.st-inv img,html.st-inv video,html.st-inv picture,html.st-inv iframe,html.st-inv .st-box{filter:invert(1) hue-rotate(180deg)}'+
    '.st-box{position:fixed;top:10px;right:10px;z-index:2147483647;display:flex;gap:4px;padding:3px;border-radius:10px;background:rgba(20,26,38,.82);box-shadow:0 2px 8px rgba(0,0,0,.3);font-family:system-ui,Segoe UI,Arial,sans-serif}'+
    '.st-box button{font-size:16px;line-height:1;min-width:34px;height:30px;border:0;border-radius:7px;background:transparent;color:#e8edf6;cursor:pointer;padding:0 8px}'+
    '.st-box button:hover{background:rgba(255,255,255,.16)}'+
    '.st-box button.on{background:#f5c542;color:#111}';
  function mode(){ var m=get(); if(m!=='day'&&m!=='night') m=nativeDark?'night':'day'; return m; }
  function apply(){
    if(nativeDark===null) return;
    var m=mode(), de=document.documentElement;
    var inv=(m==='day'&&nativeDark)||(m==='night'&&!nativeDark);
    de.classList.toggle('st-inv',inv);
    de.style.backgroundColor = inv ? nativeBg : '';
    if(box){ box.children[0].classList.toggle('on',m==='night'); box.children[1].classList.toggle('on',m==='day'); }
    try{ if(window.parent!==window && window.parent.__siteThemeSync) window.parent.__siteThemeSync(m); }catch(e){}
  }
  function set(m){ put(m); apply(); }
  function floating(){
    var show = window.top===window;
    try{ if(!show && window.parent.document.fullscreenElement===window.frameElement) show=true; }catch(e){ show=true; }
    if(box) box.style.display = show ? 'flex' : 'none';
  }
  function init(){
    if(nativeDark!==null) return;
    var st=document.createElement('style'); st.textContent=css; (document.head||document.documentElement).appendChild(st);
    nativeDark=detect();
    box=document.createElement('div'); box.className='st-box';
    box.innerHTML='<button type="button" title="Night mode" aria-label="Night mode">&#9790;</button><button type="button" title="Day mode" aria-label="Day mode">&#9728;</button>';
    box.children[0].onclick=function(){ set('night'); };
    box.children[1].onclick=function(){ set('day'); };
    document.body.appendChild(box);
    floating(); apply();
    window.addEventListener('resize',floating);
  }
  window.addEventListener('storage',function(e){ if(e.key===KEY) apply(); });
  window.__siteTheme={ set:set, mode:function(){ return mode(); } };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
