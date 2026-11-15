/* 앱 zip 검사·점검·미리보기 (올리기 화면과 검토 화면이 같이 써요)
   규칙은 서버에서 승인된 앱을 올리는 스크립트(scripts/publish_zips.py)와 같아요. 여기서 통과해도 서버가 한 번 더 검사해요. */
(function(){
'use strict';
var LIB='https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js';
var OK=('html htm css js mjs json txt md xml map csv png jpg jpeg gif webp avif svg ico mp3 ogg wav m4a flac mp4 webm woff woff2 ttf otf wasm glb gltf bin dat tsv webmanifest atlas fnt').split(' ');
var MAX_ZIP=8*1024*1024, MAX_TOTAL=40*1024*1024, MAX_FILES=400;
var MIME={html:'text/html',htm:'text/html',css:'text/css',js:'text/javascript',mjs:'text/javascript',json:'application/json',txt:'text/plain',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',svg:'image/svg+xml',ico:'image/x-icon',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4',mp4:'video/mp4',webm:'video/webm',woff:'font/woff',woff2:'font/woff2',ttf:'font/ttf',otf:'font/otf',wasm:'application/wasm'};
var libP=null;
function lib(){
  if(window.fflate)return Promise.resolve(window.fflate);
  if(!libP)libP=new Promise(function(res,rej){var s=document.createElement('script');s.src=LIB;s.onload=function(){window.fflate?res(window.fflate):rej(new Error('zip 도구를 불러오지 못했어요.'))};s.onerror=function(){rej(new Error('zip 도구를 불러오지 못했어요. 인터넷을 확인해 주세요.'))};document.head.appendChild(s)});
  return libP;
}
function ext(n){var i=n.lastIndexOf('.');return i<0?'':n.slice(i+1).toLowerCase()}
function cleanParts(n){
  n=n.replace(/\\/g,'/');
  if(n.charAt(0)==='/'||/^[A-Za-z]:/.test(n)||n.indexOf('\0')>=0)throw new Error('경로가 올바르지 않아요: '+n);
  var p=n.split('/').filter(function(x){return x!==''&&x!=='.'});
  if(p.indexOf('..')>=0)throw new Error('경로가 올바르지 않아요: '+n);
  return p;
}
/* buf: ArrayBuffer → {files:{경로:Uint8Array}, count, total} 또는 에러를 던져요 */
async function inspect(buf){
  if(buf.byteLength>MAX_ZIP)throw new Error('zip 이 너무 커요(8MB까지).');
  var f=await lib(), u8=new Uint8Array(buf), total=0, n=0, bad=null;
  var raw;
  try{
    raw=f.unzipSync(u8,{filter:function(info){
      if(/\/$/.test(info.name))return false;
      var p;try{p=cleanParts(info.name)}catch(e){bad=bad||e;return false}
      if(!p.length||p[0]==='__MACOSX'||/^(\.DS_Store|Thumbs\.db)$/.test(p[p.length-1]))return false;
      if(OK.indexOf(ext(p[p.length-1]))<0){bad=bad||new Error('쓸 수 없는 파일 종류예요: '+info.name+' (html·css·js·이미지·소리·글꼴 등만 가능해요)');return false}
      total+=info.originalSize;n++;
      if(total>MAX_TOTAL||n>MAX_FILES){bad=bad||new Error('파일이 너무 크거나 많아요(풀면 40MB, 400개까지).');return false}
      return true;
    }});
  }catch(e){throw new Error('zip 파일을 읽지 못했어요. 올바른 zip 인지 확인해 주세요.')}
  if(bad)throw bad;
  var files={};Object.keys(raw).forEach(function(k){var p=cleanParts(k);files[p.join('/')]=raw[k]});
  if(!Object.keys(files).length)throw new Error('zip 안에 파일이 없어요.');
  if(!files['index.html']){
    var tops={};Object.keys(files).forEach(function(k){tops[k.split('/')[0]]=1});
    var t=Object.keys(tops);
    if(t.length===1){var pre=t[0]+'/',m={};Object.keys(files).forEach(function(k){if(k.indexOf(pre)===0)m[k.slice(pre.length)]=files[k]});files=m}
  }
  if(!files['index.html'])throw new Error('zip 맨 위에 index.html 이 있어야 해요. (폴더 하나로 감싼 것은 괜찮아요)');
  return {files:files,count:Object.keys(files).length,total:Object.keys(files).reduce(function(a,k){return a+files[k].length},0)};
}
function text(u8){try{return new TextDecoder('utf-8').decode(u8)}catch(e){return ''}}
/* 오너가 눈으로 볼 점검표: 바깥 주소, 의심 패턴 */
function report(files){
  var hosts={},flags={},names=Object.keys(files);
  var PAT=[['eval(','eval( 사용'],['new Function','new Function 사용'],['document.cookie','쿠키 접근'],['atob(','atob( 사용(숨겨진 글자?)'],['WebSocket','WebSocket 사용'],['navigator.sendBeacon','sendBeacon 사용'],['window.top','window.top 접근'],['location.href','주소 이동 코드'],['XMLHttpRequest','XMLHttpRequest 사용'],['fetch(','fetch( 사용']];
  names.forEach(function(n){
    var e=ext(n);if(['html','htm','js','mjs','css','json','svg'].indexOf(e)<0)return;
    var s=text(files[n]);
    (s.match(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)||[]).forEach(function(x){var h=x.replace(/^https?:\/\//i,'').toLowerCase();hosts[h]=(hosts[h]||0)+1});
    if(e!=='css'&&e!=='json')PAT.forEach(function(p){if(s.indexOf(p[0])>=0)flags[p[1]]=(flags[p[1]]||0)+1});
  });
  return {hosts:Object.keys(hosts).sort(),flags:Object.keys(flags)};
}
/* 미리보기: 파일마다 blob 주소를 만들어 html·css 안의 상대 경로를 바꿔요. 자바스크립트 안에서 따로 불러오는 파일은 안 될 수 있어요. */
function resolve(base,ref){
  if(!ref||/^([a-z][a-z0-9+.-]*:|\/\/|#|data:)/i.test(ref))return null;
  ref=ref.split('#')[0].split('?')[0];if(!ref)return null;
  try{ref=decodeURIComponent(ref)}catch(e){}
  var parts=(ref.charAt(0)==='/'?[]:base.split('/').slice(0,-1)).concat(ref.split('/')),out=[];
  parts.forEach(function(p){if(p===''||p==='.')return;if(p==='..')out.pop();else out.push(p)});
  return out.join('/');
}
function b64(u8){var s='',i,n=u8.length;for(i=0;i<n;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s)}
function previewHtml(files){
  /* 보호된 틀(allow-same-origin 없음) 안에서는 blob 주소를 못 불러와서, 이미지는 data 주소로, css·js 는 html 안에 직접 넣어요 */
  var urls={};
  function data(n,bytes){return 'data:'+(MIME[ext(n)]||'application/octet-stream')+';base64,'+b64(bytes)}
  function cssFix(s,base){
    return s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,function(m,q,r){var k=resolve(base,r);return k&&urls[k]?'url("'+urls[k]+'")':m});
  }
  var names=Object.keys(files);
  names.forEach(function(n){var e=ext(n);if(['html','htm','css','js','mjs','json','txt','md','xml','map','csv','tsv'].indexOf(e)<0&&files[n].length<6*1024*1024)urls[n]=data(n,files[n])});
  var doc=new DOMParser().parseFromString(text(files['index.html']),'text/html');
  [['src','img[src],source[src],audio[src],video[src],input[src]'],['poster','[poster]']].forEach(function(q){
    [].forEach.call(doc.querySelectorAll(q[1]),function(e){var k=resolve('index.html',e.getAttribute(q[0]));if(k&&urls[k])e.setAttribute(q[0],urls[k])});
  });
  [].forEach.call(doc.querySelectorAll('link[rel~=stylesheet][href]'),function(l){
    var k=resolve('index.html',l.getAttribute('href'));if(!k||files[k]==null)return;
    var st=doc.createElement('style');st.textContent=cssFix(text(files[k]),k);l.replaceWith(st);
  });
  [].forEach.call(doc.querySelectorAll('script[src]'),function(sc){
    var k=resolve('index.html',sc.getAttribute('src'));if(!k||files[k]==null)return;
    var n=doc.createElement('script');if(sc.type)n.type=sc.type;n.textContent=text(files[k]).replace(/<\/script/gi,'<\\/script');sc.replaceWith(n);
  });
  [].forEach.call(doc.querySelectorAll('style'),function(s){s.textContent=cssFix(s.textContent,'index.html')});
  var shim=doc.createElement('script');shim.textContent='(function(){function mk(){var d={};return{getItem:function(k){return d.hasOwnProperty(k)?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}["localStorage","sessionStorage"].forEach(function(n){try{window[n].getItem("x")}catch(e){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(e2){}}})})();';
  (doc.head||doc.documentElement).insertBefore(shim,(doc.head||doc.documentElement).firstChild);
  return {html:'<!doctype html>'+doc.documentElement.outerHTML,done:function(){}};
}
function fmt(b){return b>=1048576?(b/1048576).toFixed(1)+'MB':Math.max(1,Math.round(b/1024))+'KB'}
window.FFZip={inspect:inspect,report:report,previewHtml:previewHtml,fmt:fmt,MAX_ZIP:MAX_ZIP};
})();
