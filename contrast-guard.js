/* contrast-guard.js — readable text and eye-friendly backgrounds, Day and Night.
   1. Backgrounds: glaring white / near-white surfaces are toned down to a soft warm
      paper colour, and pitch-black surfaces are lifted to a soft charcoal. All
      surfaces are scaled the same way, so panels, cards and buttons keep their
      relative lightness (the layout hierarchy is preserved).
   2. Text: every visible text element is measured against the background really
      seen on screen (after the site's invert filter, if active). If contrast is
      below 4.5:1 (3:1 for large text) the text colour is nudged darker/lighter
      until it passes; hue is kept so colour coding stays recognisable.
   3. No blue/teal tints: light or mid-tone blue, teal, cyan and periwinkle
      backgrounds (solid, semi-transparent or gradient) are replaced by a warm
      neutral tone of the same lightness, so text on them stays easy to read.
   It re-runs when the Day/Night mode changes or the page content changes.
   Load it last on the page:  <script src="../../contrast-guard.js"></script>   */
(function(){
  if(window.__contrastGuard) return; window.__contrastGuard=true;
  var MIN=4.5, MIN_LARGE=3.0;
  var LIGHT_AT=0.80;              /* surfaces brighter than this luminance get softened */
  var PAPER=[0.930,0.915,0.880];  /* per-channel scale: white -> rgb(237,233,224) */
  var DARK_AT=0.008;              /* surfaces darker than this get lifted */
  function parse(c){var m=c&&c.match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s\/]+([\d.]+))?/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null;}
  function ch(x){x/=255;return x<=0.03928?x/12.92:Math.pow((x+0.055)/1.055,2.4);}
  function lum(c){return .2126*ch(c[0])+.7152*ch(c[1])+.0722*ch(c[2]);}
  function ratio(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
  function blend(t,b){var a=t[3];return [t[0]*a+b[0]*(1-a),t[1]*a+b[1]*(1-a),t[2]*a+b[2]*(1-a),1];}
  /* the site's Day/Night flip is CSS  invert(1) hue-rotate(180deg); model it exactly */
  var HR=[[-0.574,1.43,0.144],[0.426,0.43,0.144],[0.426,1.43,-0.856]];
  function cl(x){return x<0?0:x>255?255:x;}
  function hr(c){return [cl(HR[0][0]*c[0]+HR[0][1]*c[1]+HR[0][2]*c[2]),cl(HR[1][0]*c[0]+HR[1][1]*c[1]+HR[1][2]*c[2]),cl(HR[2][0]*c[0]+HR[2][1]*c[1]+HR[2][2]*c[2])];}
  /* colour as seen on screen when the flip is active */
  function rend(c){var h=hr([255-c[0],255-c[1],255-c[2]]);return [h[0],h[1],h[2],c[3]===undefined?1:c[3]];}
  /* colour to write so that it is seen as c through the flip (hue-rotate 180 is its own inverse) */
  function unrend(c){var h=hr(c);return [255-h[0],255-h[1],255-h[2],c[3]===undefined?1:c[3]];}
  function css(c,a){return 'rgba('+Math.round(c[0])+','+Math.round(c[1])+','+Math.round(c[2])+','+(a===undefined?1:a)+')';}
  var SKIP='svg,canvas,img,video,picture,iframe,script,style,.st-box';

  /* ---------- 1. backgrounds ---------- */
  /* hue (deg) and saturation of an rgb colour */
  function hs(c){var r=c[0]/255,g=c[1]/255,b=c[2]/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h=0,l=(mx+mn)/2;
    if(d===0) return [0,0]; var s=d/(1-Math.abs(2*l-1));
    if(mx===r) h=((g-b)/d)%6; else if(mx===g) h=(b-r)/d+2; else h=(r-g)/d+4; h*=60; if(h<0) h+=360; return [h,s];}
  /* light or mid-tone blue / teal / cyan / periwinkle backgrounds are hard to read on */
  function chroma(c){return (Math.max(c[0],c[1],c[2])-Math.min(c[0],c[1],c[2]))/255;}
  function bluish(c){var x=hs(c); return x[0]>=160&&x[0]<=265&&x[1]>0.12&&chroma(c)>0.03&&lum(c)>0.28;}
  /* warm neutral (paper-grey) with the requested luminance */
  var WARM=[244,240,231];
  function neutral(L){var lo=0,hi=1,t=1;for(var i=0;i<18;i++){t=(lo+hi)/2;var c=[WARM[0]*t,WARM[1]*t,WARM[2]*t];if(lum(c)<L)lo=t;else hi=t;}
    return [WARM[0]*t,WARM[1]*t,WARM[2]*t];}
  function parentBg(el){var b=el.parentElement?bgOf(el.parentElement):null; return b||[255,255,255,1];}
  function deblue(el,s,inv){
    /* gradient backgrounds made only of light blue/teal tints -> flat warm neutral */
    var img=s.backgroundImage;
    if(img&&img!=='none'&&img.indexOf('url(')<0&&img.indexOf('gradient')>=0){
      var own=parse(s.backgroundColor), pb=parentBg(el);
      if(own&&own[3]>0) pb=blend(own,pb);          /* gradient sits on the element's own colour */
      var stops=img.match(/rgba?\([^)]+\)/g)||[], any=false, ok=true, sum=0, n=0;
      for(var i=0;i<stops.length;i++){var sc=parse(stops[i]); if(!sc||sc[3]<0.03) continue;
        var comp=blend(sc,pb), sh=inv?rend(comp):comp; if(bluish(sh)) any=true; else if(chroma(sh)>0.10) ok=false; sum+=lum(sh); n++;}
      var pbs=inv?rend(pb):pb; if(lum(pbs)<0.28&&!bluish(pbs)) ok=ok&&n>0&&sum/n>0.28;
      if(any&&ok&&n){ var o=neutral(Math.min(sum/n,0.80)); if(inv) o=unrend(o);
        el.setAttribute('data-cgi',el.style.getPropertyValue('background-image')||'');
        el.style.setProperty('background-image','none','important');
        el.setAttribute('data-cgb',el.style.getPropertyValue('background-color')||'');
        el.style.setProperty('background-color',css(o),'important'); return true; }
    }
    /* solid or semi-transparent blue/teal tints */
    var c=parse(s.backgroundColor); if(!c||c[3]<0.03) return false;
    var comp2=blend(c,parentBg(el)), sh2=inv?rend(comp2):comp2;
    if(!bluish(sh2)) return false;
    var out=neutral(Math.min(lum(sh2),0.80)); if(inv) out=unrend(out);
    el.setAttribute('data-cgb',el.style.getPropertyValue('background-color')||'');
    el.style.setProperty('background-color',css(out),'important');
    return true;
  }
  function soften(el,inv){
    var s=getComputedStyle(el);
    if((s.webkitBackgroundClip||s.backgroundClip||'').indexOf('text')>=0) return;
    if(deblue(el,s,inv)) return;
    var c=parse(s.backgroundColor);
    if(!c||c[3]<0.5) return;
    var shown=inv?rend(c):c, L=lum(shown), out=null;
    if(L>LIGHT_AT) out=[shown[0]*PAPER[0],shown[1]*PAPER[1],shown[2]*PAPER[2]];
    else if(L<DARK_AT) out=[18+shown[0]*0.9,20+shown[1]*0.9,25+shown[2]*0.9];
    if(!out) return;
    if(inv) out=unrend(out);
    el.setAttribute('data-cgb',el.style.getPropertyValue('background-color')||'');
    el.style.setProperty('background-color',css(out,c[3]),'important');
  }

  /* ---------- 2. text ---------- */
  function bgOf(el){
    var layers=[],e=el;
    while(e&&e.nodeType===1){
      var s=getComputedStyle(e),img=s.backgroundImage;
      if(img&&img!=='none'){ if(img.indexOf('gradient')<0) return null;
        var g=img.match(/rgba?\([^)]+\)/); if(g){var gc=parse(g[0]); if(gc&&gc[3]>0) layers.push(gc);} }
      var c=parse(s.backgroundColor); if(c&&c[3]>0){layers.push(c); if(c[3]>=.99) break;}
      e=e.parentElement;
    }
    var base=[255,255,255,1]; for(var i=layers.length-1;i>=0;i--) base=blend(layers[i],base); return base;
  }
  function fix(el,inv){
    var s=getComputedStyle(el); if(s.visibility==='hidden'||s.display==='none') return;
    var clip=s.webkitBackgroundClip||s.backgroundClip||'';
    if(clip.indexOf('text')>=0||(s.webkitTextFillColor&&parse(s.webkitTextFillColor)&&parse(s.webkitTextFillColor)[3]<0.1)) return; /* gradient text */
    var fg=parse(s.color), bg=bgOf(el); if(!fg||!bg||fg[3]<0.1) return;
    var shown=blend(fg,bg), B=bg;
    if(inv){shown=rend(shown);B=rend(B);}
    var size=parseFloat(s.fontSize), bold=parseInt(s.fontWeight,10)>=700;
    var need=(size>=24||(size>=18.66&&bold))?MIN_LARGE:MIN;
    if(ratio(shown,B)>=need) return;
    var toward = lum(B)>0.18 ? [0,0,0] : [255,255,255], t=0, c=shown;
    while(t<1 && ratio(c,B)<need){ t+=0.05; c=[shown[0]+(toward[0]-shown[0])*t,shown[1]+(toward[1]-shown[1])*t,shown[2]+(toward[2]-shown[2])*t,1]; }
    if(inv) c=unrend(c);
    el.style.setProperty('color',css(c),'important');
    el.setAttribute('data-cg','1');
  }

  function reset(){
    var a=document.querySelectorAll('[data-cg]'),i;
    for(i=0;i<a.length;i++){a[i].style.removeProperty('color');a[i].removeAttribute('data-cg');}
    a=document.querySelectorAll('[data-cgi]');
    for(i=0;i<a.length;i++){var g=a[i].getAttribute('data-cgi'); a[i].style.removeProperty('background-image'); if(g) a[i].style.setProperty('background-image',g); a[i].removeAttribute('data-cgi');}
    a=document.querySelectorAll('[data-cgb]');
    for(i=0;i<a.length;i++){var v=a[i].getAttribute('data-cgb'); a[i].style.removeProperty('background-color'); if(v) a[i].style.setProperty('background-color',v); a[i].removeAttribute('data-cgb');}
  }
  function run(){
    var inv=document.documentElement.classList.contains('st-inv');
    reset();
    soften(document.documentElement,inv);
    var all=document.body.getElementsByTagName('*'), i;
    soften(document.body,inv);
    for(i=0;i<all.length;i++){ var el=all[i]; if(el.closest(SKIP)) continue; soften(el,inv); }
    var seen=new Set(), w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(w.nextNode()){
      var n=w.currentNode, p=n.parentElement;
      if(!p||seen.has(p)||n.textContent.trim().length<1) continue;
      if(p.closest(SKIP+',textarea')) continue;
      seen.add(p); fix(p,inv);
    }
  }
  var timer=null, mo=null, OPTS={subtree:true,childList:true,attributes:true,attributeFilter:['class','data-theme']};
  /* measure final colours, not values half-way through a CSS transition */
  var NOTR=document.createElement('style'); NOTR.textContent='*,*::before,*::after{transition:none!important}';
  function guarded(){
    if(mo) mo.disconnect();
    try{ (document.head||document.documentElement).appendChild(NOTR); void document.documentElement.offsetHeight; run(); }catch(e){}
    finally{ if(NOTR.parentNode) NOTR.parentNode.removeChild(NOTR); if(mo){ mo.takeRecords(); mo.observe(document.documentElement,OPTS); } }
  }
  /* throttle (not debounce): pages with live readouts change every frame, so a debounce would never fire */
  function later(){ if(timer) return; timer=setTimeout(function(){ timer=null; guarded(); },250); }
  function relevant(ms){
    for(var i=0;i<ms.length;i++){ var m=ms[i];
      if(m.type==='attributes') return true;
      for(var j=0;j<m.addedNodes.length;j++) if(m.addedNodes[j].nodeType===1) return true;  /* ignore text-only updates */
    }
    return false;
  }
  function start(){ mo=new MutationObserver(function(ms){ if(relevant(ms)) later(); }); guarded(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){setTimeout(start,50);}); else setTimeout(start,50);
})();
