/* 앱 스토어 공용 스크립트: 로그인된 계정 연결, 별점·리뷰 영역, 간단한 도우미.
   - 모든 글자는 textContent 로만 넣어요(남이 쓴 글이 코드로 실행될 수 없게).
   - 서버(Supabase)의 권한 검사가 진짜 방어선이고, 여기서는 안내만 해요.
   쓰는 법: <script src="https://frenchfries777.com/store/ffstore.js"></script> 다음에
     FFStore.reviews(요소, 앱id)  /  FFStore.lazyReviews(요소, 앱id)  /  FFStore.stats([앱id,...]) */
(function(){
'use strict';
if(window.FFStore) return;
var SB_URL='https://kebsbuvuutilitwlvxzv.supabase.co', SB_KEY='sb_publishable_4Egu0zm3p6cxWGvP_-GlIw_mlCpO1Nf';
var SB_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
var AUTH_JS='https://frenchfries777.com/games/ff-auth.js';
var REASONS=['욕설/비방','광고/스팸','관련 없는 내용','기타'];

function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function loadScript(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}

var clientP=null;
function client(){
  if(clientP) return clientP;
  clientP=(async function(){
    if(window.FFAuth&&window.FFAuth.ready){await window.FFAuth.ready;var c=window.FFAuth.client();if(c)return c}
    if(window.FFAuthClient) return window.FFAuthClient;
    if(!window.supabase) await loadScript(SB_LIB);
    var c2=window.supabase.createClient(SB_URL,SB_KEY); window.FFAuthClient=c2; return c2;
  })();
  clientP.catch(function(){clientP=null});
  return clientP;
}
async function user(){var sb=await client();var r=await sb.auth.getSession();return r&&r.data&&r.data.session?r.data.session.user:null}
async function rpc(name,args){var sb=await client();var r=await sb.rpc(name,args||{});if(r.error)throw r.error;return r.data}
/* 로그인 안 해도 되는 읽기(가볍게, 라이브러리 없이) */
async function restRpc(name,args){
  var r=await fetch(SB_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  if(!r.ok) throw new Error('http '+r.status); return r.json();
}
function stats(ids){return restRpc('app_rating_stats',{p_ids:ids||null}).then(function(rows){var m={};(rows||[]).forEach(function(x){m[x.app_id]={avg:Number(x.avg),n:x.n}});return m})}
function msgOf(e){
  if(e&&e.code==='P0001'&&e.message) return e.message;
  if(e&&(e.code==='42501'||e.code==='PGRST301')) return '권한이 없어요.';
  if(e&&e.code==='23505') return '이미 있어요.';
  return '문제가 생겼어요. 잠시 뒤에 다시 해 주세요.';
}
async function login(){
  await client();
  if(!window.FFAuth){try{await loadScript(AUTH_JS)}catch(e){return}}
  try{await window.FFAuth.ready}catch(e){}
  if(window.FFAuth&&window.FFAuth.openLogin) window.FFAuth.openLogin();
}
async function isAdmin(){try{return (await rpc('ff_is_admin'))===true}catch(e){return false}}
function fmtDate(x){try{return new Date(x).toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})}catch(e){return ''}}
function stars(n){var r=Math.round(n||0);return '★★★★★'.slice(0,r)+'☆☆☆☆☆'.slice(0,5-r)}

/* ---------- 리뷰 영역 ---------- */
var css='.ffr{--fg:var(--ffr-fg,#1d1d1f);--dim:var(--ffr-dim,#6e6e73);--line:var(--ffr-line,#e5e5ea);--bg2:var(--ffr-bg2,#f5f5f7);--acc:var(--ffr-acc,#0071e3);--accfg:var(--ffr-accfg,#fff);--star:var(--ffr-star,#f5a623);--bad:var(--ffr-bad,#d93025);color:var(--fg);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Noto Sans KR","Segoe UI",system-ui,sans-serif;text-align:left}'
+'.ffr *{box-sizing:border-box}.ffr h3{margin:0 0 14px;font-size:22px;line-height:1.2}'
+'.ffr .sum{display:flex;align-items:center;gap:14px;margin-bottom:16px}.ffr .sum b{font-size:44px;line-height:1;font-weight:800}.ffr .sum .st{color:var(--star);font-size:20px;letter-spacing:2px}.ffr .sum small{display:block;color:var(--dim);font-size:13px}'
+'.ffr .box{background:var(--bg2);border:1px solid var(--line);border-radius:16px;padding:14px;margin-bottom:18px}'
+'.ffr .pick{display:flex;gap:2px;margin:0 0 8px}.ffr .pick button{border:0;background:none;padding:2px 4px;font-size:30px;line-height:1;color:var(--line);cursor:pointer}.ffr .pick button.on{color:var(--star)}'
+'.ffr textarea{display:block;width:100%;min-height:86px;resize:vertical;border:1px solid var(--line);border-radius:10px;background:transparent;color:inherit;font:inherit;padding:10px}'
+'.ffr textarea:focus,.ffr select:focus{outline:2px solid var(--acc);outline-offset:1px}'
+'.ffr .row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px}.ffr .row .cnt{margin-left:auto;font-size:12px;color:var(--dim)}'
+'.ffr .btn{border:0;border-radius:999px;padding:8px 18px;font:700 14px/1.2 inherit;font-family:inherit;background:var(--acc);color:var(--accfg);cursor:pointer}.ffr .btn:disabled{opacity:.5;cursor:default}'
+'.ffr .btn.g{background:transparent;color:var(--dim);border:1px solid var(--line)}.ffr .btn.d{background:transparent;color:var(--bad);border:1px solid var(--bad)}'
+'.ffr .msg{min-height:1.4em;font-size:13px;color:var(--dim)}.ffr .msg.err{color:var(--bad)}'
+'.ffr ul{list-style:none;margin:0;padding:0}.ffr li{padding:14px 0;border-top:1px solid var(--line)}.ffr li:first-child{border-top:0}'
+'.ffr .hd{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.ffr .hd b{font-size:14px}.ffr .hd .st{color:var(--star);letter-spacing:1px}.ffr .hd time{color:var(--dim);font-size:12px;margin-left:auto}'
+'.ffr .bd{margin:6px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.ffr .mine{display:inline-block;font-size:11px;font-weight:700;color:var(--acc);border:1px solid var(--acc);border-radius:4px;padding:0 5px;margin-left:6px}'
+'.ffr .tag{display:inline-block;font-size:11px;font-weight:700;color:var(--bad);border:1px solid var(--bad);border-radius:4px;padding:0 5px;margin-left:6px}'
+'.ffr .act{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center}.ffr .act button,.ffr .act select{font:12px/1.2 inherit;font-family:inherit;color:var(--dim);background:none;border:1px solid var(--line);border-radius:999px;padding:4px 10px;cursor:pointer}'
+'.ffr .act select{border-radius:8px;color:inherit;background:var(--bg2)}.ffr .act .bad{color:var(--bad);border-color:var(--bad)}'
+'.ffr .empty{color:var(--dim);padding:6px 0}.ffr .more{display:block;margin:10px auto 0}';
function addCss(){if(document.getElementById('ffr-css'))return;var s=document.createElement('style');s.id='ffr-css';s.textContent=css;document.head.appendChild(s)}

function reviews(box,appId,opts){
  opts=opts||{}; addCss(); box.textContent='';
  var root=el('div','ffr'); box.appendChild(root);
  var st={me:null,admin:false,rows:[],done:false,rating:0,busy:false};
  var PAGE=20;

  var h=el('h3',null,'평점 및 리뷰'); root.appendChild(h);
  var sum=el('div','sum'); root.appendChild(sum);
  var formBox=el('div','box'); root.appendChild(formBox);
  var list=el('ul'); root.appendChild(list);
  var empty=el('p','empty','아직 리뷰가 없어요. 첫 리뷰를 남겨 보세요.'); root.appendChild(empty);
  var more=el('button','btn g more','더 보기'); more.type='button'; more.hidden=true; root.appendChild(more);

  function paintSum(avg,n){
    sum.textContent='';
    if(!n){sum.appendChild(el('span','dim','아직 별점이 없어요'));if(opts.onStats)opts.onStats(0,0);return}
    sum.appendChild(el('b',null,avg.toFixed(1)));
    var d=el('div');d.appendChild(el('div','st',stars(avg)));d.appendChild(el('small',null,'리뷰 '+n+'개'));sum.appendChild(d);
    if(opts.onStats)opts.onStats(avg,n);
  }
  function loadSum(){return stats([appId]).then(function(m){var s=m[appId];paintSum(s?s.avg:0,s?s.n:0)}).catch(function(){})}

  function mineRow(){for(var i=0;i<st.rows.length;i++)if(st.rows[i].mine)return st.rows[i];return null}

  function paintForm(){
    formBox.textContent='';
    if(!st.me){
      formBox.appendChild(el('p',null,'리뷰와 별점은 Frenchfries777 계정으로 로그인해야 남길 수 있어요.'));
      var b=el('button','btn','로그인하고 리뷰 남기기');b.type='button';b.addEventListener('click',function(){login()});formBox.appendChild(b);return;
    }
    var mine=mineRow();
    if(mine&&!st.rating&&!st.touched)st.rating=mine.rating;
    formBox.appendChild(el('div',null,mine?'내 리뷰 고치기':'별점을 눌러 주세요'));
    var pick=el('div','pick');pick.setAttribute('role','radiogroup');pick.setAttribute('aria-label','별점');
    for(var i=1;i<=5;i++)(function(n){
      var b=el('button',n<=st.rating?'on':'','★');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked',n===st.rating?'true':'false');b.setAttribute('aria-label',n+'점');
      b.addEventListener('click',function(){st.rating=n;st.touched=true;[].forEach.call(pick.children,function(x,k){x.className=k<n?'on':'';x.setAttribute('aria-checked',k+1===n?'true':'false')})});
      pick.appendChild(b)})(i);
    formBox.appendChild(pick);
    var ta=el('textarea');ta.maxLength=500;ta.placeholder='짧은 리뷰 (선택, 500자까지). 링크는 넣을 수 없어요.';ta.setAttribute('aria-label','리뷰');if(mine&&!st.touched)ta.value=mine.body||'';
    formBox.appendChild(ta);
    var row=el('div','row');var cnt=el('span','cnt',ta.value.length+'/500');
    ta.addEventListener('input',function(){cnt.textContent=ta.value.length+'/500'});
    var save=el('button','btn',mine?'수정':'등록');save.type='button';row.appendChild(save);
    var del=null;
    if(mine){del=el('button','btn d','내 리뷰 삭제');del.type='button';row.appendChild(del)}
    row.appendChild(cnt);formBox.appendChild(row);
    var msg=el('div','msg');msg.setAttribute('role','status');formBox.appendChild(msg);
    function say(t,err){msg.textContent=t||'';msg.className='msg'+(err?' err':'')}
    save.addEventListener('click',async function(){
      if(st.busy)return;
      if(!st.rating){say('별점을 먼저 골라 주세요.',true);return}
      st.busy=true;save.disabled=true;say('저장하는 중…');
      try{
        var sb=await client();var r;
        if(mine) r=await sb.from('app_reviews').update({rating:st.rating,body:ta.value}).eq('id',mine.id);
        else r=await sb.from('app_reviews').insert({app_id:appId,rating:st.rating,body:ta.value});
        if(r.error)throw r.error;
        st.touched=false;await reload();
      }catch(e){say(msgOf(e),true)}
      st.busy=false;save.disabled=false;
    });
    if(del){var armed=false;del.addEventListener('click',async function(){
      if(!armed){armed=true;del.textContent='정말 삭제할까요? 한 번 더 누르세요';setTimeout(function(){armed=false;del.textContent='내 리뷰 삭제'},4000);return}
      st.busy=true;try{var sb=await client();var r=await sb.from('app_reviews').delete().eq('id',mine.id);if(r.error)throw r.error;st.rating=0;st.touched=false;await reload()}catch(e){say(msgOf(e),true)}st.busy=false;
    })}
  }

  function item(r){
    var li=el('li');var hd=el('div','hd');
    var nm=el('b',null,r.dev);hd.appendChild(nm);
    if(r.mine)hd.appendChild(el('span','mine','내 리뷰'));
    if(r.hidden)hd.appendChild(el('span','tag','신고로 숨겨짐'));
    hd.appendChild(el('span','st',stars(r.rating)));
    var t=el('time',null,fmtDate(r.created_at));hd.appendChild(t);li.appendChild(hd);
    if(r.body)li.appendChild(el('p','bd',r.body));
    var act=el('div','act');
    if(st.admin&&r.reports)act.appendChild(el('span',null,'신고 '+r.reports+'건'));
    if(st.me&&!r.mine){
      var rep=el('button',null,'신고');rep.type='button';
      rep.addEventListener('click',function(){
        rep.hidden=true;var sel=el('select');sel.setAttribute('aria-label','신고 이유');
        REASONS.forEach(function(x){var o=el('option',null,x);o.value=x;sel.appendChild(o)});
        var ok=el('button','bad','신고하기');ok.type='button';var no=el('button',null,'취소');no.type='button';var m=el('span',null,'');
        act.appendChild(sel);act.appendChild(ok);act.appendChild(no);act.appendChild(m);
        no.addEventListener('click',function(){sel.remove();ok.remove();no.remove();m.remove();rep.hidden=false});
        ok.addEventListener('click',async function(){ok.disabled=true;try{await rpc('app_review_report',{p_review:r.id,p_reason:sel.value});sel.remove();ok.remove();no.remove();m.textContent='신고했어요. 확인할게요.';reload(true)}catch(e){m.textContent=msgOf(e);ok.disabled=false}});
      });
      act.appendChild(rep);
    }
    if(st.admin&&!r.mine){
      var d=el('button','bad','오너 삭제');d.type='button';var armed=false;
      d.addEventListener('click',async function(){
        if(!armed){armed=true;d.textContent='정말 삭제? 한 번 더';setTimeout(function(){armed=false;d.textContent='오너 삭제'},4000);return}
        try{var sb=await client();var x=await sb.from('app_reviews').delete().eq('id',r.id);if(x.error)throw x.error;await reload()}catch(e){d.textContent=msgOf(e)}
      });
      act.appendChild(d);
    }
    if(act.childNodes.length)li.appendChild(act);
    return li;
  }
  function paintList(){
    list.textContent='';st.rows.forEach(function(r){list.appendChild(item(r))});
    empty.hidden=st.rows.length>0;more.hidden=st.done;
  }
  async function fetchPage(reset){
    var off=reset?0:st.rows.length;
    var rows=await rpc('app_reviews_list',{p_app:appId,p_limit:PAGE,p_offset:off});
    st.rows=reset?rows:st.rows.concat(rows);st.done=rows.length<PAGE;
  }
  async function reload(keepForm){
    try{await fetchPage(true)}catch(e){}
    if(!keepForm)paintForm();paintList();loadSum();
  }
  more.addEventListener('click',async function(){more.disabled=true;try{await fetchPage(false);paintList()}catch(e){}more.disabled=false});

  (async function init(){
    loadSum();
    try{
      st.me=await user();
      if(st.me)st.admin=await isAdmin();
      var sb=await client();
      sb.auth.onAuthStateChange(function(ev){if(ev==='SIGNED_IN'||ev==='SIGNED_OUT'){user().then(function(u){st.me=u;st.touched=false;st.rating=0;(u?isAdmin():Promise.resolve(false)).then(function(a){st.admin=a;reload()})})}});
    }catch(e){}
    /* 서버 기능이 아직 준비되지 않았으면(처음 불러오기 실패) 이 영역을 그냥 숨겨요 */
    try{await fetchPage(true)}catch(e){box.textContent='';return}
    paintForm();paintList();loadSum();
  })();
  return {reload:reload};
}
function lazyReviews(box,appId,opts){
  if(!('IntersectionObserver' in window)){return reviews(box,appId,opts)}
  var io=new IntersectionObserver(function(es){if(es.some(function(x){return x.isIntersecting})){io.disconnect();reviews(box,appId,opts)}},{rootMargin:'300px'});
  io.observe(box);
}

window.FFStore={client:client,user:user,rpc:rpc,restRpc:restRpc,stats:stats,msgOf:msgOf,login:login,isAdmin:isAdmin,reviews:reviews,lazyReviews:lazyReviews,el:el,fmtDate:fmtDate,stars:stars};
})();
