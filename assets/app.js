
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
function waLink(card,label,extraLines){
  if (typeof PromoEngine !== 'undefined' && PromoEngine.buildWaUrl) {
    return PromoEngine.buildWaUrl({ waNumber:'923214378770', tool:card.dataset.tool,
      pkg:card.dataset.package, duration:card.dataset.duration,
      priceLabel:label, extraLines:extraLines || [] });
  }
  const NL=String.fromCharCode(10);
  const msg=['Hi, I came from the Unlock Pro Tools website. I want to buy this package:','Product: '+card.dataset.tool,'Package: '+card.dataset.package,'Duration: '+card.dataset.duration,'Price: '+label,'Please send me the payment and delivery details.'].join(NL);
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
  renderPromos();
}
function setCurr(c){
  CURR=c;
  document.querySelectorAll('.curr button').forEach(b=>b.classList.toggle('active',b.dataset.c===c));
  renderPrices();
  try{localStorage.setItem('upt-curr',c)}catch(e){}
  try{document.dispatchEvent(new CustomEvent('upt:currency',{detail:{currency:c}}));}catch(e){}
}
document.querySelectorAll('.curr button').forEach(b=>b.addEventListener('click',()=>setCurr(b.dataset.c)));
function applyRates(r){
  if(r&&+r.usd>0) RATES.usd=+r.usd;
  if(r&&+r.usdt>0) RATES.usdt=+r.usdt;
  renderPrices();
  try{document.dispatchEvent(new CustomEvent('upt:rates'));}catch(e){}
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
const onHome=document.querySelectorAll('.card[data-pid]').length>0;
function scrollToResults(){
  const tb=document.querySelector('.toolbar');
  const main=document.querySelector('main');
  if(!main) return;
  const hd=document.querySelector('header');
  const y=main.getBoundingClientRect().top+window.scrollY-((hd?hd.offsetHeight:0)+(tb?tb.offsetHeight:0))-4;
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
    // Pages without product cards: searching goes to the home page results.
    const go=()=>{ const v=s.value.trim(); if(v) location.href=(s.getAttribute('data-root')||'')+'index.html?q='+encodeURIComponent(v); };
    s.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); }});
    s.addEventListener('search',go);
  }
}
// ---- Promotions: rendered at runtime from window.UPT_PROMOS (never from the URL) ----
function getPromos(){
  try{
    var p = window.UPT_PROMOS;
    return Array.isArray(p) ? p : [];
  }catch(e){ return []; }
}
function promoNow(){ return Date.now(); }
function promoActiveSet(){
  var now = promoNow(), set = {};
  getPromos().forEach(function(pr){
    if (pr && typeof PromoEngine !== 'undefined' && PromoEngine.scheduleActive(pr.schedule, now)) set[pr.id] = true;
  });
  return set;
}
function pickPromo(pid, now){
  var cands = [];
  getPromos().forEach(function(pr){
    if (!pr || pr.enabled === false) return;
    if (!Array.isArray(pr.pids) || pr.pids.indexOf(pid) === -1) return;
    if (typeof PromoEngine === 'undefined' || !PromoEngine.scheduleActive(pr.schedule, now)) return;
    cands.push(pr);
  });
  if (!cands.length) return null;
  cands.sort(function(a,b){ return (b.priority || 0) - (a.priority || 0); });
  return cands[0];
}
function fmtCurrTotal(pkr){
  if (CURR === 'USD') return '$' + (pkr / RATES.usd).toFixed(2);
  if (CURR === 'USDT') return (pkr / RATES.usdt).toFixed(2) + ' USDT';
  return 'Rs ' + money(pkr);
}
function fmtEndShort(iso){
  try{
    return new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Karachi', day:'numeric', month:'short' }).format(new Date(iso));
  }catch(e){ return ''; }
}
function fmtEndFull(iso){
  try{
    var s = new Intl.DateTimeFormat('en-GB', { timeZone:'Asia/Karachi', weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }).format(new Date(iso));
    return s.replace(/am/i, 'AM').replace(/pm/i, 'PM') + ' PKT';
  }catch(e){ return ''; }
}
function pad2(n){ return (n < 10 ? '0' : '') + n; }
function fmtCountdown(ms){
  if (ms <= 0) return 'Ended';
  var s = Math.floor(ms / 1000);
  var d = Math.floor(s / 86400); s -= d * 86400;
  var h = Math.floor(s / 3600); s -= h * 3600;
  var m = Math.floor(s / 60); s -= m * 60;
  if (d > 0) return 'Ends in ' + d + 'd ' + pad2(h) + 'h ' + pad2(m) + 'm';
  if (h > 0) return 'Ends in ' + pad2(h) + 'h ' + pad2(m) + 'm';
  return 'Ends in ' + pad2(m) + 'm ' + pad2(s) + 's';
}
function promoProduct(card){
  var cost = parseFloat(card.dataset.cost);
  var list = parseFloat(card.dataset.listPkr);
  return { pid: card.dataset.pid || '', costPkr: cost, listPkr: list };
}
function orderLines(res, totalLabel){
  if (!res || !res.promo) return [];
  var pr = res.promo, lines = [];
  if (res.status === 'applied') {
    lines.push('Offer: ' + pr.label + ' (' + pr.id + ')');
    lines.push('Quantity to pay for: ' + res.paidUnits);
    if (pr.reward && pr.reward.kind === 'free_item' && res.freeItem) {
      var dur = res.freeItem.duration && res.freeItem.duration !== 'Not Stated' ? ' | ' + res.freeItem.duration : '';
      lines.push('Free item: ' + res.freeItem.tool + ' | ' + res.freeItem.package + dur + ' x ' + res.freeUnits);
    } else {
      if (pr.reward && pr.reward.kind === 'free_units') lines.push('Free units: ' + res.freeUnits);
      lines.push('Total units: ' + res.totalUnits);
    }
    lines.push('Total price: ' + totalLabel);
    if (pr.limits && pr.limits.per_customer_note) lines.push('Note: ' + pr.limits.per_customer_note);
  } else if (res.paidUnits > 1 && res.blockedReason !== 'qty') {
    lines.push('Quantity: ' + res.paidUnits);
    lines.push('Total price: ' + totalLabel);
  }
  return lines;
}
function renderStrip(){
  var box = document.getElementById('promo-strip');
  if (!box) return;
  var now = promoNow();
  var items = [];
  getPromos().forEach(function(pr){
    if (!pr || !pr.display || !pr.display.home_strip) return;
    if (typeof PromoEngine === 'undefined' || !PromoEngine.scheduleActive(pr.schedule, now)) return;
    items.push(pr);
  });
  items.sort(function(a,b){
    var af = a.type === 'flash_sale' ? 0 : 1, bf = b.type === 'flash_sale' ? 0 : 1;
    if (af !== bf) return af - bf;
    if ((b.priority || 0) !== (a.priority || 0)) return (b.priority || 0) - (a.priority || 0);
    return (a.id < b.id ? -1 : (a.id > b.id ? 1 : 0));
  });
  items = items.slice(0, 2);
  while (box.firstChild) box.removeChild(box.firstChild);
  items.forEach(function(pr){
    var item = document.createElement('div');
    item.className = 'promo-strip-item ' + (pr.type === 'flash_sale' ? 'promo-strip-flash' : 'promo-strip-bulk');
    var lab = document.createElement('b'); lab.textContent = pr.label; item.appendChild(lab);
    var txt = document.createElement('p'); txt.textContent = pr.strip_text; item.appendChild(txt);
    if (pr.type === 'flash_sale' && pr.schedule && pr.schedule.end) {
      var end = document.createElement('p');
      end.textContent = 'Ends ' + fmtEndFull(pr.schedule.end);
      item.appendChild(end);
      if (pr.schedule.show_countdown) {
        var cd = document.createElement('p');
        cd.className = 'promo-countdown';
        cd.setAttribute('data-end', pr.schedule.end);
        cd.textContent = fmtCountdown(Date.parse(pr.schedule.end) - now);
        item.appendChild(cd);
      }
    }
    box.appendChild(item);
  });
}
function renderCardPromos(){
  if (typeof PromoEngine === 'undefined') return;
  var now = promoNow();
  document.querySelectorAll('.card').forEach(function(card){
    var pe = card.querySelector('.price');
    var wa = card.querySelector('a.wa');
    var base = compute(card);
    if (pe && base) pe.textContent = base[CURR];
    var oldB = card.querySelector('.promo-badge'); if (oldB) oldB.remove();
    var oldL = card.querySelector('.promo-line'); if (oldL) oldL.remove();
    if (pe) pe.classList.remove('promo-price');
    if (!wa || !base) return;
    var pr = pickPromo(card.dataset.pid || '', now);
    if (!pr) {
      wa.href = waLink(card, base[CURR]);
      return;
    }
    var res = PromoEngine.resolve({ product: promoProduct(card), qty: 1, now: now, promos: getPromos() });
    if (res.status === 'blocked' && res.blockedReason === 'qty') return;
    if (res.status !== 'applied' && res.status !== 'progress') {
      wa.href = waLink(card, base[CURR]);
      return;
    }
    var totalLabel = fmtCurrTotal(res.totalPkr);
    var showBadge = !!(pr.display && pr.display.card_badge);
    var isSale = !!(pr.reward && pr.reward.kind === 'percent_off' && res.status === 'applied');
    var isBundle = !!(pr.reward && pr.reward.kind === 'free_item');
    if (showBadge) {
      var badge = document.createElement('span');
      badge.className = 'promo-badge ' + (pr.type === 'flash_sale' ? 'promo-badge-flash' : 'promo-badge-bulk') + (card.querySelector('.badge') ? ' stacked' : '');
      badge.textContent = (isBundle && pr.badge_text) ? pr.badge_text : pr.label;
      card.appendChild(badge);
      if (isSale) {
        if (pe) {
          pe.classList.add('promo-price');
          var s = document.createElement('s'); s.textContent = base[CURR];
          pe.textContent = '';
          pe.appendChild(s);
          pe.appendChild(document.createTextNode(' ' + fmtCurrTotal(res.unitPkrAfterDiscount)));
        }
        var line = document.createElement('div');
        line.className = 'promo-line';
        line.textContent = 'Ends ' + fmtEndShort(pr.schedule.end);
        if (pe) pe.parentNode.insertBefore(line, pe.nextSibling);
      } else if (isBundle && res.freeItem) {
        var line3 = document.createElement('div');
        line3.className = 'promo-line';
        line3.textContent = 'Buy ' + (pr.reward.buy_qty || 1) + ', get ' + res.freeItem.tool + ' ' + res.freeItem.package + ' free';
        if (pe) pe.parentNode.insertBefore(line3, pe.nextSibling);
      } else {
        var line2 = document.createElement('div');
        line2.className = 'promo-line';
        line2.textContent = pr.label;
        if (pe) pe.parentNode.insertBefore(line2, pe.nextSibling);
      }
    }
    wa.href = waLink(card, isSale ? fmtCurrTotal(res.unitPkrAfterDiscount) : base[CURR], orderLines(res, totalLabel));
  });
}
var PROMO_QTY = 1;
function renderProductPromo(){
  if (typeof PromoEngine === 'undefined') return;
  var pcard = document.querySelector('.pcard');
  if (!pcard) return;
  if (!PROMO_QTY) PROMO_QTY = 1;
  var now = promoNow();
  var pr = pickPromo(pcard.dataset.pid || '', now);
  var old = pcard.querySelector('.promo-box');
  var wa = pcard.querySelector('a.wa');
  var base = compute(pcard);
  if (base) {
    var pp = pcard.querySelector('.pprice');
    if (pp) { pp.classList.remove('promo-price'); pp.textContent = base[CURR]; }
  }
  if (!pr) {
    if (old) old.remove();
    PROMO_QTY = 1;
    if (wa && base) wa.href = waLink(pcard, base[CURR]);
    return;
  }
  var showBox = !!(pr.display && pr.display.product_page);
  var qty = showBox ? PROMO_QTY : 1;
  if (!showBox) PROMO_QTY = 1;
  var res = PromoEngine.resolve({ product: promoProduct(pcard), qty: qty, now: now, promos: getPromos() });
  if (res.status === 'blocked' && res.blockedReason === 'qty') {
    var cap = (pr.limits && pr.limits.max_paid_units_per_order) || 1;
    PROMO_QTY = Math.max(1, Math.min(PROMO_QTY, cap));
    qty = PROMO_QTY;
    res = PromoEngine.resolve({ product: promoProduct(pcard), qty: qty, now: now, promos: getPromos() });
  }
  if (!showBox) {
    if (old) old.remove();
    if (wa && base) {
      var ul = base[CURR];
      if (res.status === 'applied' && pr.reward && pr.reward.kind === 'percent_off') ul = fmtCurrTotal(res.unitPkrAfterDiscount);
      wa.href = waLink(pcard, ul, orderLines(res, fmtCurrTotal(res.totalPkr)));
    }
    return;
  }
  var box = old;
  if (!box || box.getAttribute('data-promo') !== pr.id) {
    if (box) box.remove();
    box = buildPromoBox(pcard, pr);
  }
  updatePromoBox(box, pcard, pr, res);
}
function buildPromoBox(pcard, pr){
  var box = document.createElement('div');
  box.className = 'promo-box ' + (pr.type === 'flash_sale' ? 'promo-box-flash' : 'promo-box-bulk');
  box.setAttribute('data-promo', pr.id);
  var lab = document.createElement('div'); lab.className = 'promo-box-label'; lab.textContent = pr.label; box.appendChild(lab);
  var terms = document.createElement('p'); terms.className = 'promo-box-terms'; terms.textContent = pr.terms; box.appendChild(terms);
  var stepper = document.createElement('div'); stepper.className = 'promo-stepper';
  var minus = document.createElement('button'); minus.type = 'button'; minus.className = 'promo-minus'; minus.textContent = '−'; minus.setAttribute('aria-label', 'Decrease quantity');
  var input = document.createElement('input'); input.className = 'promo-qty'; input.type = 'text'; input.setAttribute('inputmode', 'numeric'); input.setAttribute('autocomplete', 'off'); input.value = String(PROMO_QTY);
  var plus = document.createElement('button'); plus.type = 'button'; plus.className = 'promo-plus'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Increase quantity');
  stepper.appendChild(minus); stepper.appendChild(input); stepper.appendChild(plus); box.appendChild(stepper);
  var summary = document.createElement('div'); summary.className = 'promo-summary'; box.appendChild(summary);
  var progress = document.createElement('div'); progress.className = 'promo-progress'; box.appendChild(progress);
  if (pr.type === 'flash_sale' && pr.schedule && pr.schedule.end) {
    var cd = document.createElement('div'); cd.className = 'promo-countdown';
    cd.setAttribute('data-end', pr.schedule.end);
    cd.setAttribute('data-full', fmtEndFull(pr.schedule.end));
    box.appendChild(cd);
  }
  var det = document.createElement('details'); det.className = 'promo-terms';
  var sum = document.createElement('summary'); sum.textContent = 'Offer terms'; det.appendChild(sum);
  var dt = document.createElement('p'); dt.textContent = pr.terms; det.appendChild(dt);
  if (pr.limits && pr.limits.per_customer_note) { var nt = document.createElement('p'); nt.textContent = pr.limits.per_customer_note; det.appendChild(nt); }
  box.appendChild(det);
  var wa = pcard.querySelector('a.wa');
  if (wa && wa.parentNode) pcard.insertBefore(box, wa.parentNode);
  else pcard.appendChild(box);
  minus.addEventListener('click', function(){ setPromoQty(PROMO_QTY - 1); });
  plus.addEventListener('click', function(){ setPromoQty(PROMO_QTY + 1); });
  input.addEventListener('input', function(){
    var v = input.value.replace(/[^0-9]/g, '');
    if (v !== input.value) input.value = v;
    if (v === '') { setPromoQtyInvalid(); return; }
    setPromoQty(parseInt(v, 10), true);
  });
  input.addEventListener('blur', function(){
    if (input.value === '') { input.value = String(PROMO_QTY); renderProductPromo(); }
  });
  return box;
}
function setPromoQty(n, fromInput){
  var pcard = document.querySelector('.pcard');
  if (!pcard) return;
  var pr = pickPromo(pcard.dataset.pid || '', promoNow());
  var cap = (pr && pr.limits && pr.limits.max_paid_units_per_order) || 1;
  if (n < 1) n = 1;
  if (n > cap) n = cap;
  PROMO_QTY = n;
  renderProductPromo();
}
function setPromoQtyInvalid(){
  var pcard = document.querySelector('.pcard');
  if (!pcard) return;
  var wa = pcard.querySelector('a.wa');
  if (wa) { wa.style.pointerEvents = 'none'; wa.style.opacity = '0.6'; wa.setAttribute('aria-disabled', 'true'); }
  var box = pcard.querySelector('.promo-box');
  if (box) {
    var s = box.querySelector('.promo-summary');
    if (s) s.textContent = 'Enter a valid quantity.';
  }
}
function updatePromoBox(box, pcard, pr, res){
  var base = compute(pcard);
  var wa = pcard.querySelector('a.wa');
  var totalLabel = fmtCurrTotal(res.totalPkr);
  var unitLabel = base ? base[CURR] : '';
  if (res.status === 'applied' && pr.reward && pr.reward.kind === 'percent_off') {
    unitLabel = fmtCurrTotal(res.unitPkrAfterDiscount);
    var pp = pcard.querySelector('.pprice');
    if (pp && base) {
      pp.classList.add('promo-price');
      var s = document.createElement('s'); s.textContent = base[CURR];
      pp.textContent = '';
      pp.appendChild(s);
      pp.appendChild(document.createTextNode(' ' + unitLabel));
    }
  }
  var input = box.querySelector('.promo-qty');
  if (input) input.value = String(PROMO_QTY);
  var sum = box.querySelector('.promo-summary');
  if (sum) {
    if (res.status === 'applied') {
      var parts = ['Pay for ' + res.paidUnits];
      if (pr.reward && pr.reward.kind === 'free_item' && res.freeItem) {
        var fdur = res.freeItem.duration && res.freeItem.duration !== 'Not Stated' ? ' (' + res.freeItem.duration + ')' : '';
        parts.push('Free item: ' + res.freeItem.tool + ' ' + res.freeItem.package + fdur + ' x ' + res.freeUnits);
      } else {
        if (pr.reward && pr.reward.kind === 'free_units') parts.push('Free ' + res.freeUnits);
        parts.push('Total units ' + res.totalUnits);
      }
      parts.push('Total price: ' + totalLabel);
      sum.textContent = parts.join(' · ');
    } else if (res.status === 'progress') {
      sum.textContent = 'Pay for ' + res.paidUnits + ' · Total price: ' + totalLabel;
    } else {
      sum.textContent = 'Total price: ' + totalLabel;
    }
  }
  var prog = box.querySelector('.promo-progress');
  if (prog) {
    if (res.status === 'progress') {
      if (pr.reward && pr.reward.kind === 'free_item' && res.freeItem) {
        prog.textContent = 'Add ' + res.unitsToNextReward + ' more to get ' + res.freeItem.tool + ' ' + res.freeItem.package + ' free';
      } else {
        prog.textContent = 'Add ' + res.unitsToNextReward + ' more to get ' +
          (pr.reward ? pr.reward.free_qty : 1) + ' free';
      }
    } else { prog.textContent = ''; }
  }
  var cd = box.querySelector('.promo-countdown');
  if (cd && pr.schedule && pr.schedule.end) {
    cd.textContent = fmtCountdown(Date.parse(pr.schedule.end) - promoNow()) +
      ' · Ends ' + fmtEndFull(pr.schedule.end);
  }
  if (wa) {
    if (res.status === 'blocked' && res.blockedReason === 'qty') {
      wa.style.pointerEvents = 'none'; wa.style.opacity = '0.6'; wa.setAttribute('aria-disabled', 'true');
    } else {
      wa.style.pointerEvents = ''; wa.style.opacity = ''; wa.removeAttribute('aria-disabled');
      wa.href = waLink(pcard, unitLabel, orderLines(res, totalLabel));
    }
  }
}
function renderPromos(){
  renderStrip();
  renderCardPromos();
  renderProductPromo();
}
var PROMO_LAST_ACTIVE = promoActiveSet();
function promoTick(){
  if (document.hidden) return;
  var now = promoNow();
  document.querySelectorAll('.promo-countdown').forEach(function(el){
    var end = el.getAttribute('data-end');
    if (!end) return;
    var txt = fmtCountdown(Date.parse(end) - now);
    var full = el.getAttribute('data-full');
    if (full) txt += ' · Ends ' + full;
    el.textContent = txt;
  });
  var active = promoActiveSet();
  var changed = false;
  var keys = {};
  Object.keys(active).forEach(function(k){ keys[k] = true; });
  Object.keys(PROMO_LAST_ACTIVE).forEach(function(k){ keys[k] = true; });
  Object.keys(keys).forEach(function(k){ if (!!active[k] !== !!PROMO_LAST_ACTIVE[k]) changed = true; });
  if (changed) { PROMO_LAST_ACTIVE = active; renderPromos(); }
}
function promoNeedsTick(){
  var list = getPromos();
  for (var i = 0; i < list.length; i++) {
    var s = list[i].schedule || {};
    if (s.start && Date.parse(s.start) > promoNow()) return true;
    if (s.end) return true;
  }
  return false;
}
renderPromos();
if (promoNeedsTick()) setInterval(promoTick, 1000);
document.addEventListener('visibilitychange', function(){ if (!document.hidden) { PROMO_LAST_ACTIVE = promoActiveSet(); renderPromos(); } });
