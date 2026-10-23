
let CURR='PKR';
// Live rates model (Daniyal, 23 Oct 2026): backend base = original COST in PKR (data-cost).
// Final PKR = cost x 1.25 (his 25% profit, applied in the browser). USD = final PKR / usd rate,
// USDT = final PKR / usdt rate. Rates come from the Google Sheet feed (Worker 1 + 2);
// FALLBACK rates apply instantly so prices never wait or break.
const FALLBACK={usd:280,usdt:280};
let RATES={usd:FALLBACK.usd,usdt:FALLBACK.usdt};
const RATES_URL="https://script.google.com/macros/s/AKfycbz1LhPTZXt1kqcSiN-wK_CczzJlojhyqTdSahvdmvkwLc6w_Bfq1mLJZ0ZLR8tPNQVL/exec";
function money(n){return n.toLocaleString('en-US');}
function compute(card){
  const cost=parseFloat(card.dataset.cost); if(isNaN(cost)) return null;
  const pkr=Math.round(cost*1.25);
  return {PKR:'Rs '+money(pkr),USD:'$'+(pkr/RATES.usd).toFixed(2),USDT:(pkr/RATES.usdt).toFixed(2)+' USDT'};
}
function waLink(card,label){
  const msg='Hi, I came from the Unlock Pro Tools website. I want to buy this package:
Product: '+card.dataset.tool+'
Package: '+card.dataset.package+'
Duration: '+card.dataset.duration+'
Price: '+label+'
Please send me the payment and delivery details.';
  return 'https://wa.me/923214378770?text='+encodeURIComponent(msg);
}
function renderPrices(){
  document.querySelectorAll('[data-cost]').forEach(card=>{
    const v=compute(card); if(!v) return;
    const priceEl=card.querySelector('.price,.pprice');
    if(priceEl) priceEl.textContent=v[CURR];
    const wa=card.querySelector('a.wa');
    if(wa) wa.href=waLink(card,v[CURR]);
    const cu=card.querySelector('.cell-usd'); if(cu) cu.textContent=v.USD;
    const ct=card.querySelector('.cell-usdt'); if(ct) ct.textContent=v.USDT;
  });
}
function setCurr(c){
  CURR=c;
  document.querySelectorAll('.curr button').forEach(b=>b.classList.toggle('active',b.dataset.c===c));
  renderPrices();
  try{localStorage.setItem('upt-curr',c)}catch(e){}
}
document.querySelectorAll('.curr button').forEach(b=>b.addEventListener('click',()=>setCurr(b.dataset.c)));
function applyRates(r){
  if(r&&+r.usd>0) RATES.usd=+r.usd;
  if(r&&+r.usdt>0) RATES.usdt=+r.usdt;
  renderPrices();
  const rl=document.getElementById('rateline');
  if(rl){ rl.textContent="Today's rates: 1 USD = Rs "+RATES.usd.toFixed(2)+" · 1 USDT = Rs "+RATES.usdt.toFixed(2); rl.style.display=''; }
}
const savedC=(()=>{try{return localStorage.getItem('upt-curr')}catch(e){return null}})();
if(savedC&&(savedC==='USD'||savedC==='USDT')){ CURR=savedC; document.querySelectorAll('.curr button').forEach(b=>b.classList.toggle('active',b.dataset.c===CURR)); }
renderPrices();
if(RATES_URL){
  let done=false;
  const ctl=('AbortController' in window)?new AbortController():null;
  const to=setTimeout(()=>{ if(ctl) ctl.abort(); },7000);
  fetch(RATES_URL,{signal:ctl?ctl.signal:undefined}).then(r=>r.json()).then(j=>{ done=true; clearTimeout(to); applyRates(j); }).catch(()=>{});
  setTimeout(()=>{
    if(done) return;
    window.__uptRates=function(j){ applyRates(j); };
    const sc=document.createElement('script');
    sc.src=RATES_URL+(RATES_URL.includes('?')?'&':'?')+'callback=__uptRates';
    document.head.appendChild(sc);
  },3500);
}
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
