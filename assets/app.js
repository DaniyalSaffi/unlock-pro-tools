
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
if(s){s.addEventListener('input',()=>{
  const q=s.value.toLowerCase().trim(); let any=false;
  document.querySelectorAll('.card').forEach(card=>{
    const hit=!q||card.dataset.name.includes(q);
    card.style.display=hit?'':'none'; if(hit)any=true;
  });
  document.querySelectorAll('section.cat').forEach(sec=>{
    const vis=[...sec.querySelectorAll('.card')].some(c=>c.style.display!=='none');
    sec.style.display=vis?'':'none';
  });
  const nr=document.getElementById('noresult'); if(nr) nr.style.display=any?'none':'block';
});}
