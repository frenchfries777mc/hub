/* Frenchfries777 shared shell: left menu + pixel-art background. Include with <script src="/ff-shell.js" defer></script> */
(function(){
  if(window.__ffShell)return; window.__ffShell=1;
  var d=document, root=d.documentElement;
  var path=location.pathname.replace(/index\.html$/,'');
  var items=[
    ['Hub','/',[]],
    ['Games','/games/',['/games/']],
    ['Educations','/educations/',['/educations/']],
    ['Tools','/tools/',['/tools/']],
    ['위키','/wiki/',['/wiki/']],
    ['커뮤니티','/community/',['/community/']],
    ['라운지','/lounge/',['/lounge/','/patchnotes/','/music/','/games/gallery/','/games/prototypes/','/tools/ai-chat/']],
    ['설정','/settings/',['/settings/']]
  ];
  var lounge=items[6][2], inLounge=false;
  for(var k=0;k<lounge.length;k++){ if(path.indexOf(lounge[k])===0)inLounge=true; }
  function isOn(it){
    if(it[1]==='/')return path==='/'||path==='';
    if(inLounge)return it[0]==='라운지';
    for(var i=0;i<it[2].length;i++){ if(path.indexOf(it[2][i])===0)return true; }
    return false;
  }
  function build(){
    if(!d.body||d.querySelector('.ffs-side'))return;
    if(!d.querySelector('link[href*="ff-shell.css"]')){var css=d.createElement('link'); css.rel='stylesheet'; css.href='/ff-shell.css?v=6'; d.head.appendChild(css);}
    root.classList.add('ffsh'); d.body.classList.add('ffsh');
    if(path==='/'||path==='')d.body.classList.add('ffs-hub');
    if(/^\/(games|educations|tools)\/$/.test(path))d.body.classList.add('ffs-front');
    var bg=d.createElement('div'); bg.className='ffs-bg'; bg.setAttribute('aria-hidden','true');
    d.body.insertBefore(bg,d.body.firstChild);
    var nav=d.createElement('nav'); nav.className='ffs-side'; nav.setAttribute('aria-label','Frenchfries777');
    var h='<a class="ffs-logo" href="/" aria-label="Frenchfries777"><span>FRENCH</span><span>FRIES</span><span>777</span></a>';
    for(var i=0;i<items.length;i++){
      var it=items[i], on=isOn(it);
      h+='<a class="ffs-m'+(on?' on':'')+'" href="'+it[1]+'"'+(on?' aria-current="page"':'')+'><i></i>'+it[0]+'</a>';
    }
    h+='<div class="ffs-foot"><span>Made by Frenchfries777 with Claude AI</span><span>© 2026 Frenchfries777 · CC BY-NC-ND 4.0</span></div>';
    nav.innerHTML=h;
    d.body.insertBefore(nav,bg.nextSibling);
  }
  if(d.readyState==='loading')d.addEventListener('DOMContentLoaded',build); else build();
})();
