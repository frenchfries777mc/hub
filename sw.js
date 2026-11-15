/* 서비스 워커: 기본은 캐시 없이 항상 사이트에서 바로 받아서, 사이트가 업데이트되면 앱도 그대로 따라와요.
   예외: 사람이 자주 하는 게임(최대 3개)만 오프라인용으로 따로 저장해요. 온라인이면 항상 최신을 받고, 연결이 없을 때만 저장본을 보여 줘요. */
var CFG='ffoff-cfg', PRE='ffoff-', GRE=/^\/games\/(?:prototypes\/)?(stickseum|crownenvoy|beaconfall|isleport|vowkeep|tumblecrown|dummyparty|gatecrash)\//;
var SAVED=null;
function gameOf(u){ try{ var m=GRE.exec(new URL(u).pathname); return m?m[1]:null; }catch(e){ return null; } }
function loadSaved(){ if(SAVED) return Promise.resolve(SAVED);
  return caches.open(CFG).then(function(c){ return c.match('/__saved'); }).then(function(r){ return r?r.json():[]; }).catch(function(){ return []; }).then(function(l){ SAVED=l; return l; }); }
function setSaved(list){ SAVED=list.slice(0,3);
  return caches.open(CFG).then(function(c){ return c.put('/__saved',new Response(JSON.stringify(SAVED))); })
    .then(function(){ return caches.keys(); }).then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf(PRE)===0&&k!==CFG&&SAVED.indexOf(k.slice(PRE.length))<0; }).map(function(k){ return caches.delete(k); })); }); }

self.addEventListener('install',function(){ self.skipWaiting(); });
self.addEventListener('activate',function(e){ e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET'){ e.respondWith(fetch(r)); return; }
  var u; try{ u=new URL(r.url); }catch(x){ e.respondWith(fetch(r)); return; }
  if(u.origin!==self.location.origin||u.pathname.indexOf('/games/')!==0){ e.respondWith(fetch(r)); return; }
  e.respondWith(loadSaved().then(function(list){
    if(!list.length) return fetch(r);
    var own=r.mode==='navigate'?Promise.resolve(gameOf(r.url)):(e.clientId?self.clients.get(e.clientId).then(function(c){ return c?gameOf(c.url):null; }):Promise.resolve(null));
    return own.then(function(g){
      if(!g||list.indexOf(g)<0||r.headers.has('range')) return fetch(r);
      return fetch(r).then(function(res){
        if(res&&res.ok&&res.status===200){ var cp=res.clone(); caches.open(PRE+g).then(function(c){ return c.put(r,cp); }).catch(function(){}); }
        return res;
      },function(){
        return caches.open(PRE+g).then(function(c){ return c.match(r,{ignoreSearch:r.mode==='navigate'}); }).then(function(hit){ return hit||Response.error(); });
      });
    });
  }));
});

/* 미리 저장: 게임 첫 화면과 거기서 불러오는 파일(js, css, 그림, 소리, 게임 본체 html)을 두 단계까지 따라가며 받아 둬요 */
function refs(txt,base){ var out={}, re=/(?:src|href)\s*=\s*["']([^"'#]+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|(?:fetch|import|Audio|Image|load\w*)\s*\(\s*["']([^"']+\.(?:js|css|png|jpg|jpeg|webp|svg|mp3|ogg|wav|woff2?|json|html))["']/g, m;
  while((m=re.exec(txt))){ var v=m[1]||m[2]||m[3]; if(!v||/^(data:|blob:|javascript:|mailto:|tel:)/i.test(v)) continue; try{ var x=new URL(v,base); if(x.origin===self.location.origin&&x.pathname.indexOf('/games/')===0){ x.hash=''; out[x.href]=1; } }catch(e){} }
  return Object.keys(out); }
async function prefetch(g,start){
  var cache=await caches.open(PRE+g), seen={}, bytes=0, LIM=90*1024*1024, MAXF=80, n=0, level=[start];
  for(var d=0;d<3&&level.length;d++){ var next=[];
    for(var i=0;i<level.length;i++){ var url=level[i]; if(seen[url]||n>=MAXF||bytes>LIM) continue; seen[url]=1;
      try{ var res=await fetch(url,{cache:'no-cache'}); if(!res.ok||res.status!==200) continue; var cp=res.clone(); await cache.put(url,cp); n++;
        var len=+res.headers.get('content-length')||0; bytes+=len;
        var ct=res.headers.get('content-type')||''; if(d<2&&/text\/(html|css)|javascript/.test(ct)&&len<6*1024*1024){ var txt=await res.text(); next=next.concat(refs(txt,url)); } }catch(e){} }
    level=next; }
  return {files:n,bytes:bytes}; }

self.addEventListener('message',function(e){
  var d=e.data||{}; if(!d.ffoff) return;
  if(d.ffoff==='games'){ e.waitUntil(setSaved(Array.isArray(d.list)?d.list.filter(function(x){ return /^[a-z]+$/.test(x); }):[])); }
  else if(d.ffoff==='prefetch'&&d.game&&d.url){ e.waitUntil(loadSaved().then(function(l){ if(l.indexOf(d.game)<0) return; return prefetch(d.game,new URL(d.url,self.location.origin).href).then(function(r){ if(e.source) e.source.postMessage({ffoff:'done',game:d.game,files:r.files,bytes:r.bytes}); }); })); }
  else if(d.ffoff==='clear'){ e.waitUntil(setSaved([])); }
  else if(d.ffoff==='status'){ e.waitUntil(loadSaved().then(function(l){ return Promise.all(l.map(function(g){ return caches.open(PRE+g).then(function(c){ return c.keys(); }).then(function(k){ return {game:g,files:k.length}; }); })); }).then(function(s){ if(e.source) e.source.postMessage({ffoff:'status',list:s}); })); }
});
