/* Site visitor analytics (Google Analytics 4) with a consent banner.
   - Set GA_ID below to your Measurement ID (G-XXXXXXXXXX). While it is empty nothing is loaded.
   - Nothing is sent from file:// or localhost.
   - Consent Mode v2: analytics cookies are used only after the visitor clicks "Accept".
   - Your own visits: open any page with ?notrack=1 once to stop counting this browser
     (?notrack=0 counts it again).
   Loaded automatically by assets.js on every page. */
(function(){
  var GA_ID = 'G-3XFM8P9EZX';          /* Measurement ID of the web stream "orhanbayrak" (https://obayrak.github.io/obayrak) */
  var KEY = 'siteAnalyticsConsent';    /* 'granted' | 'denied' */
  var OPT = 'siteAnalyticsOptOut';     /* '1' = do not track this browser */
  if (window.__siteAnalytics) return; window.__siteAnalytics = true;

  function get(k){ try{ return localStorage.getItem(k)||''; }catch(e){ return ''; } }
  function put(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  var q = location.search;
  if (/[?&]notrack=1/.test(q)) put(OPT,'1');
  if (/[?&]notrack=0/.test(q)) { try{ localStorage.removeItem(OPT); }catch(e){} }

  if (!GA_ID) return;
  if (location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) return;
  if (get(OPT) === '1') return;

  window.dataLayer = window.dataLayer || [];
  function gtag(){ window.dataLayer.push(arguments); }
  window.gtag = gtag;
  var choice = get(KEY);
  gtag('consent','default',{
    analytics_storage: choice === 'granted' ? 'granted' : 'denied',
    ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied',
    wait_for_update: 500
  });
  gtag('js', new Date());
  gtag('config', GA_ID, { page_title: document.title.replace(/\s*-\s*Orhan Bayrak\s*$/,'') || document.title });
  var s = document.createElement('script'); s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
  document.head.appendChild(s);

  /* ── consent banner ─────────────────────────────────────── */
  var css = '#sa-banner{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483646;max-width:760px;margin:0 auto;'+
    'background:#fff;color:#1f2328;border:1px solid #e4e1da;border-radius:12px;box-shadow:0 8px 28px rgba(16,32,64,.18);'+
    'padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif}'+
    'html[data-theme="night"] #sa-banner{background:#1f2228;color:#e8e6e3;border-color:#2e323a}'+
    '#sa-banner p{margin:0;flex:1 1 320px}#sa-banner a{color:inherit;text-decoration:underline}'+
    '#sa-banner button{font:600 15px system-ui,sans-serif;border-radius:8px;padding:8px 16px;cursor:pointer;border:1px solid #1d4e89}'+
    '#sa-banner .ok{background:#1d4e89;color:#fff}#sa-banner .no{background:transparent;color:inherit;border-color:#9aa3ad}'+
    'html[data-theme="night"] #sa-banner .ok{background:#8ab4f8;border-color:#8ab4f8;color:#16181d}';
  function root(){
    var l = document.querySelector('link[rel=stylesheet][href*="assets.css"]');
    return l ? l.getAttribute('href').replace(/assets\.css.*$/,'') : '';
  }
  function banner(){
    if (document.getElementById('sa-banner')) return;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var b = document.createElement('div'); b.id = 'sa-banner'; b.setAttribute('role','dialog'); b.setAttribute('aria-label','Cookie consent');
    b.innerHTML = '<p>This site uses Google Analytics cookies to count visits and to see which pages are used. '+
      'No advertising. <a href="'+root()+'statistics/index.html#privacy">Details</a></p>'+
      '<button type="button" class="no">Decline</button><button type="button" class="ok">Accept</button>';
    b.querySelector('.ok').onclick = function(){ set('granted'); };
    b.querySelector('.no').onclick = function(){ set('denied'); };
    document.body.appendChild(b);
  }
  function set(v){
    put(KEY, v);
    gtag('consent','update',{ analytics_storage: v });
    var b = document.getElementById('sa-banner'); if (b) b.remove();
  }
  window.siteAnalyticsConsent = function(){ banner(); };   /* reopen the banner ("Cookie settings") */

  /* ── interaction events ─────────────────────────────────── */
  function ev(name, params){ try{ gtag('event', name, params||{}); }catch(e){} }
  var moduleName = (document.querySelector('h1.title')||{}).textContent || document.title;
  document.addEventListener('click', function(e){
    var t = e.target; if (!t || !t.closest) return;
    var a = t.closest('a,button'); if (!a) return;
    var label = (a.textContent||'').replace(/\s+/g,' ').trim().slice(0,80);
    if (a.closest('aside .nav'))            ev('menu_click',   { link_text: label });
    else if (a.closest('.card'))            ev('card_click',   { link_text: (a.querySelector('h3')||a).textContent.trim().slice(0,80) });
    else if (a.id === 'theme-btn' || a.classList.contains('th-n') || a.classList.contains('th-d'))
                                            ev('theme_change', { theme: a.classList.contains('th-n') ? 'night' : a.classList.contains('th-d') ? 'day' :
                                              (document.documentElement.getAttribute('data-theme')==='night' ? 'day' : 'night') });
    else if (a.hasAttribute('data-fs'))     ev('fullscreen_open', { module: moduleName });
    else if (a.target === '_blank' && a.closest('.headtools,.frame')) ev('open_new_tab', { module: moduleName });
    else if (a.id === 'menu-btn')           ev('menu_open');
  }, true);
  /* first use of the simulation inside the page frame (once per page view) */
  function watchFrame(f){
    var used = false;
    function hook(){
      var d; try{ d = f.contentDocument; }catch(e){ return; } if (!d) return;
      ['pointerdown','keydown','wheel'].forEach(function(type){
        d.addEventListener(type, function(){ if (used) return; used = true; ev('app_interaction', { module: moduleName, input: type }); }, { capture:true, passive:true });
      });
    }
    f.addEventListener('load', hook); hook();
  }

  function init(){
    if (!choice) banner();
    document.querySelectorAll('.frame iframe').forEach(watchFrame);
    var foot = document.querySelector('footer .in span:last-child');
    if (foot && !document.getElementById('sa-settings')){
      foot.insertAdjacentHTML('beforeend', ' &middot; <a href="#" id="sa-settings">Cookie settings</a>');
      document.getElementById('sa-settings').onclick = function(e){ e.preventDefault(); banner(); };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
