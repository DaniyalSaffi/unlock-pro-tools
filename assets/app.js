
let CURR='PKR';
function fmt(p){
  const el=p.closest('.card,.pcard'); if(!el) return;
}
function setCurr(c,btn){
  CURR=c;
  document.querySelectorAll('.curr button').forEach(b=>b.classList.toggle('active',b.dataset.c===c));
  const pk='price'+c.charAt(0)+c.slice(1).toLowerCase();
  const wk='wa'+c.charAt(0)+c.slice(1).toLowerCase();
  document.querySelectorAll('[data-wa-pkr]').forEach(card=>{
    const priceEl=card.querySelector('.price,.pprice');
    if(priceEl) priceEl.textContent=card.dataset[pk];
    const wa=card.querySelector('.wa');
    if(wa) wa.href=card.dataset[wk];
  });
  try{localStorage.setItem('upt-curr',c)}catch(e){}
}
document.querySelectorAll('.curr button').forEach(b=>b.addEventListener('click',()=>setCurr(b.dataset.c,b)));
const saved=(()=>{try{return localStorage.getItem('upt-curr')}catch(e){return null}})();
if(saved&&saved!=='PKR') setCurr(saved);
const s=document.getElementById('search');
const onHome=document.querySelectorAll('.card').length>0;
function scrollToResults(){
  const tb=document.querySelector('.toolbar');
  const main=document.querySelector('main');
  if(!main) return;
  const y=main.getBoundingClientRect().top+window.scrollY-(tb?tb.offsetHeight:0)-4;
  window.scrollTo({top:y,behavior:'smooth'});
}
function applySearch(fromInit){
  if(!s) return;
  const q=s.value.toLowerCase().trim(); let any=false,count=0;
  const wasSearching=document.body.classList.contains('searching');
  document.querySelectorAll('.card').forEach(card=>{
    const hit=!q||card.dataset.name.includes(q);
    card.style.display=hit?'':'none'; if(hit){any=true;count++;}
  });
  document.querySelectorAll('section.cat').forEach(sec=>{
    const vis=[...sec.querySelectorAll('.card')].some(c=>c.style.display!=='none');
    sec.style.display=vis?'':'none';
  });
  const nr=document.getElementById('noresult'); if(nr) nr.style.display=(q&&!any)?'block':'none';
  const info=document.getElementById('searchinfo');
  if(q){
    document.body.classList.add('searching');
    if(info){
      document.getElementById('sq').textContent=s.value.trim();
      document.getElementById('scount').textContent=count;
      info.style.display='flex';
    }
    if(!wasSearching||fromInit) scrollToResults();
  }else{
    document.body.classList.remove('searching');
    if(info) info.style.display='none';
    if(wasSearching&&!fromInit) window.scrollTo({top:0,behavior:'smooth'});
  }
}
if(s){
  if(onHome){
    s.addEventListener('input',()=>applySearch(false));
    const params=new URLSearchParams(location.search);
    const q0=params.get('q');
    if(q0){ s.value=q0; applySearch(true); }
    const clr=document.getElementById('clearsearch');
    if(clr) clr.addEventListener('click',()=>{ s.value=''; applySearch(false); s.focus(); });
  }else{
    // Product pages have no cards: searching goes to the home page results.
    const go=()=>{ const v=s.value.trim(); if(v) location.href='../index.html?q='+encodeURIComponent(v); };
    s.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); }});
    s.addEventListener('search',go);
  }
}
