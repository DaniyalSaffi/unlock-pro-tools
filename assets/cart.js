
(function(root, factory){
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.UPTCart = factory(); }
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  var KEY = 'upt_cart_v1';
  function getEngine(){ try { return (typeof PromoEngine !== 'undefined') ? PromoEngine : null; } catch (e) { return null; } }
  function getCurr(){ try { return (typeof CURR !== 'undefined' && CURR) ? CURR : 'PKR'; } catch (e) { return 'PKR'; } }
  function getRates(){ try { return (typeof RATES !== 'undefined' && RATES) ? RATES : { usd: 280, usdt: 280 }; } catch (e) { return { usd: 280, usdt: 280 }; } }
  function money(n){ return n.toLocaleString('en-US'); }
  function fmtTotal(pkr){
    if (typeof fmtCurrTotal === 'function') { try { return fmtCurrTotal(pkr); } catch (e) {} }
    var c = getCurr(), r = getRates();
    if (c === 'USD') return '$' + (pkr / r.usd).toFixed(2);
    if (c === 'USDT') return (pkr / r.usdt).toFixed(2) + ' USDT';
    return 'Rs ' + money(pkr);
  }
  function parseQtyLocal(q){
    if (typeof q === 'string') { var t = q.trim(); if (!/^[0-9]+$/.test(t)) return null; q = parseInt(t, 10); }
    if (typeof q !== 'number' || !isFinite(q) || Math.floor(q) !== q) return null;
    return q;
  }
  function parseQty(q){
    var e = getEngine();
    if (e && e.parseQty) return e.parseQty(q);
    return parseQtyLocal(q);
  }
  function normalizeCart(raw, catalogue, limits){
    var dropped = [], clamped = [], lines = [];
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !Array.isArray(raw.lines)) {
      return { lines: lines, dropped: dropped, clamped: clamped };
    }
    var byPid = {};
    var maxLines = (limits && limits.maxLines) || 12;
    for (var i = 0; i < raw.lines.length; i++) {
      var ln = raw.lines[i] || {};
      var pid = ln.pid, qty = parseQty(ln.qty);
      if (typeof pid !== 'string' || !pid || qty === null || qty < 1) {
        if (typeof pid === 'string' && pid) dropped.push(pid);
        continue;
      }
      var prod = catalogue[pid];
      if (!prod) { dropped.push(pid); continue; }
      if (prod.availability !== 'In Stock' && prod.availability !== 'Limited') { dropped.push(pid); continue; }
      if (qty > 1000) { qty = 1000; clamped.push(pid); }
      if (byPid[pid] !== undefined) {
        lines[byPid[pid]].qty = Math.min(1000, lines[byPid[pid]].qty + qty);
      } else {
        byPid[pid] = lines.length;
        lines.push({ pid: pid, qty: qty });
      }
    }
    if (lines.length > maxLines) {
      var extra = lines.splice(maxLines);
      for (var j = 0; j < extra.length; j++) dropped.push(extra[j].pid);
    }
    return { lines: lines, dropped: dropped, clamped: clamped };
  }
  function createStore(storage, catalogue, limits){
    var memory = null, ok = true;
    function load(){
      var raw = null;
      // After a failed save (ok === false) the memory copy is the latest cart,
      // so reads fall back to it instead of the stale storage value.
      if (storage && ok) { try { var s = storage.getItem(KEY); raw = s ? JSON.parse(s) : null; } catch (e) { raw = null; } }
      else raw = memory;
      return normalizeCart(raw, catalogue, limits);
    }
    function save(lines){
      var obj = { v: 1, lines: lines };
      if (!storage) { memory = obj; return; }
      try { storage.setItem(KEY, JSON.stringify(obj)); }
      catch (e) { ok = false; memory = obj; }
    }
    return {
      get storageOK(){ return ok && !!storage; },
      load: load,
      save: save,
      add: function(pid, qty){
        var norm = load();
        var lines = norm.lines, found = false;
        for (var i = 0; i < lines.length; i++) if (lines[i].pid === pid) { lines[i].qty += qty; found = true; break; }
        if (!found) lines.push({ pid: pid, qty: qty });
        var norm2 = normalizeCart({ v: 1, lines: lines }, catalogue, limits);
        save(norm2.lines);
        return norm2;
      },
      setQty: function(pid, qty){
        var norm = load();
        var lines = [];
        for (var i = 0; i < norm.lines.length; i++) {
          if (norm.lines[i].pid === pid) { if (qty >= 1) lines.push({ pid: pid, qty: qty }); }
          else lines.push(norm.lines[i]);
        }
        var norm2 = normalizeCart({ v: 1, lines: lines }, catalogue, limits);
        save(norm2.lines);
        return norm2;
      },
      remove: function(pid){
        var norm = load();
        var lines = [];
        for (var i = 0; i < norm.lines.length; i++) if (norm.lines[i].pid !== pid) lines.push(norm.lines[i]);
        save(lines);
        return lines;
      },
      clear: function(){ save([]); return []; }
    };
  }
  function capForLine(line, res, limits){
    if (res && res.promo && res.promo.limits && res.promo.limits.max_paid_units_per_order) return res.promo.limits.max_paid_units_per_order;
    return (limits && limits.maxUnitsPerLine) || 10;
  }
  function progressHint(res){
    if (!res || res.status !== 'progress') return '';
    var rw = res.promo && res.promo.reward;
    if (rw && rw.kind === 'free_item' && res.freeItem) return 'Add ' + res.unitsToNextReward + ' more to get ' + res.freeItem.tool + ' ' + res.freeItem.package + ' free';
    if (rw && rw.kind === 'free_units') return 'Add ' + res.unitsToNextReward + ' more to get ' + rw.free_qty + ' free';
    return '';
  }
  function buildCartMessage(o){
    var NL = String.fromCharCode(10);
    var lines = ['Hi, I came from the Unlock Pro Tools website. I want to buy these packages:'];
    var notes = [];
    for (var i = 0; i < o.lines.length; i++) {
      var ln = o.lines[i];
      var res = ln.resolve;
      lines.push((i + 1) + '. ' + ln.product.tool + ' | ' + ln.product.package + ' | ' + ln.product.duration + ' x ' + ln.qty + ' = ' + ln.lineLabel);
      if (res && res.promo && res.status === 'applied') {
        lines.push('Offer: ' + res.promo.label + ' (' + res.promo.id + ')');
        if (res.promo.reward && res.promo.reward.kind === 'free_item' && res.freeItem) {
          var dur = res.freeItem.duration && res.freeItem.duration !== 'Not Stated' ? ' | ' + res.freeItem.duration : '';
          lines.push('Free item: ' + res.freeItem.tool + ' | ' + res.freeItem.package + dur + ' x ' + res.freeUnits);
        }
        if (res.promo.limits && res.promo.limits.per_customer_note && notes.indexOf(res.promo.limits.per_customer_note) === -1) notes.push(res.promo.limits.per_customer_note);
      }
    }
    lines.push('Total: ' + o.totalLabel);
    for (var n = 0; n < notes.length; n++) lines.push('Note: ' + notes[n]);
    lines.push('Please send me the payment and delivery details.');
    return 'https://wa.me/' + o.waNumber + '?text=' + encodeURIComponent(lines.join(NL));
  }
  function initBrowser(){
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    var catData = window.UPT_CATALOGUE || null;
    if (!catData) return;
    var catalogue = {};
    for (var i = 0; i < catData.products.length; i++) catalogue[catData.products[i].pid] = catData.products[i];
    var limits = catData.limits || { maxLines: 12, maxUnitsPerLine: 10 };
    var storage = null;
    try {
      storage = window.localStorage;
      storage.setItem('__upt_probe', '1');
      storage.removeItem('__upt_probe');
    } catch (e) { storage = null; }
    var store = createStore(storage, catalogue, limits);
    var prevOffer = {};
    var shownNotes = {};
    var toastTimer = null;
    function getPromos(){ try { return Array.isArray(window.UPT_PROMOS) ? window.UPT_PROMOS : []; } catch (e) { return []; } }
    function showNote(text){
      var box = document.getElementById('cart-notes');
      if (!box || shownNotes[text]) return;
      shownNotes[text] = true;
      var p = document.createElement('p');
      p.className = 'cartnote';
      p.textContent = text;
      box.appendChild(p);
    }
    function updateBadge(){
      var norm = store.load();
      var total = 0;
      for (var i = 0; i < norm.lines.length; i++) total += norm.lines[i].qty;
      var link = document.querySelector('.cartlink');
      var badge = document.querySelector('.cartbadge');
      if (link) link.setAttribute('aria-label', 'Cart, ' + total + ' items');
      if (badge) {
        badge.textContent = String(total);
        if (total > 0) badge.removeAttribute('hidden');
        else badge.setAttribute('hidden', '');
      }
    }
    function showToast(msg){
      var toast = document.getElementById('cart-toast');
      if (!toast) return;
      var cartHref = 'cart.html';
      var link = document.querySelector('.cartlink');
      if (link && link.getAttribute('href')) cartHref = link.getAttribute('href');
      while (toast.firstChild) toast.removeChild(toast.firstChild);
      var t = document.createElement('span'); t.textContent = msg; toast.appendChild(t);
      var a = document.createElement('a'); a.href = cartHref; a.textContent = 'View cart'; toast.appendChild(a);
      toast.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function(){ toast.classList.remove('show'); }, 4000);
    }
    function evaluate(){
      var engine = getEngine();
      if (!engine || !engine.resolveCart) return null;
      var norm = store.load();
      return engine.resolveCart({ lines: norm.lines, now: Date.now(), promos: getPromos(), catalogue: catalogue });
    }
    function renderCart(){
      var root = document.getElementById('cart-root');
      if (!root) return;
      if (!store.storageOK) showNote('Your cart will not be saved on this device.');
      var norm = store.load();
      if (norm.dropped.length) showNote('Some items are no longer available and were removed from your cart.');
      if (norm.clamped.length) showNote('The quantity on this item was updated to the current limit.');
      var result = evaluate();
      if (result) {
        var changed = false;
        for (var i = 0; i < result.lines.length; i++) {
          var lr = result.lines[i];
          if (lr.valid) {
            var cap = capForLine(lr, lr.resolve, limits);
            if (lr.qty > cap) { store.setQty(lr.pid, cap); changed = true; showNote('The quantity on this item was updated to the current limit.'); }
          }
        }
        if (changed) result = evaluate();
      }
      while (root.firstChild) root.removeChild(root.firstChild);
      if (!result || !result.lines.length) {
        var empty = document.createElement('p');
        empty.textContent = 'Your cart is empty.';
        root.appendChild(empty);
        var browse = document.createElement('p');
        var bl = document.createElement('a');
        bl.href = 'index.html#shop'; bl.textContent = 'Browse packages';
        bl.style.color = 'var(--teal)'; bl.style.fontWeight = 'bold';
        browse.appendChild(bl); root.appendChild(browse);
        updateBadge();
        return;
      }
      for (var li = 0; li < result.lines.length; li++) {
        var lr2 = result.lines[li];
        var cur = (lr2.valid && lr2.resolve && lr2.resolve.promo) ? lr2.resolve.promo.id : null;
        if (prevOffer[lr2.pid] !== undefined && prevOffer[lr2.pid] !== cur) {
          if (prevOffer[lr2.pid] && !cur) showNote('The offer on this item has ended, so the price was updated.');
          else if (!prevOffer[lr2.pid] && cur) showNote('A new offer is now active on this item, so the price was updated.');
        }
        prevOffer[lr2.pid] = cur;
      }
      for (var ri = 0; ri < result.lines.length; ri++) {
        (function(lr){
          var card = document.createElement('div'); card.className = 'card';
          var row = document.createElement('div'); row.className = 'cartrow';
          var img = document.createElement('img');
          img.src = lr.product.logo; img.alt = lr.product.tool + ' logo'; img.loading = 'lazy';
          var info = document.createElement('div'); info.className = 'cinfo';
          var h = document.createElement('h3'); h.textContent = lr.product.tool; info.appendChild(h);
          var pp = document.createElement('p'); pp.textContent = lr.product.package + ' \u00B7 ' + lr.product.duration; info.appendChild(pp);
          if (lr.valid && lr.resolve && lr.resolve.promo && lr.resolve.status === 'applied') {
            var on = document.createElement('p'); on.textContent = 'Offer: ' + lr.resolve.promo.label; info.appendChild(on);
          }
          var hint = lr.valid ? progressHint(lr.resolve) : '';
          if (hint) { var hp = document.createElement('p'); hp.textContent = hint; info.appendChild(hp); }
          if (lr.valid && lr.resolve && lr.resolve.promo && lr.resolve.promo.limits && lr.resolve.promo.limits.per_customer_note) {
            var np = document.createElement('p'); np.textContent = lr.resolve.promo.limits.per_customer_note; info.appendChild(np);
          }
          row.appendChild(img); row.appendChild(info);
          var step = document.createElement('div'); step.className = 'cartstepper';
          var minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '\u2212'; minus.setAttribute('aria-label', 'Decrease quantity');
          var input = document.createElement('input'); input.type = 'text'; input.setAttribute('inputmode', 'numeric'); input.setAttribute('autocomplete', 'off'); input.value = String(lr.qty);
          var plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'Increase quantity');
          step.appendChild(minus); step.appendChild(input); step.appendChild(plus); row.appendChild(step);
          var lineTotal = document.createElement('div'); lineTotal.className = 'cline';
          lineTotal.textContent = lr.valid ? fmtTotal(lr.resolve.totalPkr) : 'N/A';
          row.appendChild(lineTotal);
          var rem = document.createElement('button'); rem.className = 'cartremove'; rem.type = 'button'; rem.textContent = 'Remove';
          rem.setAttribute('aria-label', 'Remove ' + lr.product.tool + ' from cart');
          rem.addEventListener('click', function(){ store.remove(lr.pid); delete prevOffer[lr.pid]; renderCart(); });
          row.appendChild(rem);
          card.appendChild(row);
          root.appendChild(card);
          minus.addEventListener('click', function(){ store.setQty(lr.pid, lr.qty - 1); renderCart(); });
          plus.addEventListener('click', function(){
            var cap2 = lr.valid ? capForLine(lr, lr.resolve, limits) : (limits.maxUnitsPerLine || 10);
            store.setQty(lr.pid, Math.min(lr.qty + 1, cap2)); renderCart();
          });
          input.addEventListener('input', function(){
            var v = input.value.replace(/[^0-9]/g, '');
            if (v !== input.value) input.value = v;
            if (v === '') return;
            store.setQty(lr.pid, parseInt(v, 10)); renderCart();
          });
          input.addEventListener('blur', function(){ if (input.value === '') { input.value = String(lr.qty); renderCart(); } });
          if (lr.valid && lr.resolve && lr.resolve.status === 'applied' && lr.resolve.freeItem && lr.resolve.freeUnits > 0) {
            var fcard = document.createElement('div'); fcard.className = 'card cartfree';
            fcard.setAttribute('data-parent-pid', lr.pid);
            var frow = document.createElement('div'); frow.className = 'cartrow';
            var fprod = catalogue[lr.resolve.freeItem.pid];
            if (fprod) {
              var fimg = document.createElement('img');
              fimg.src = fprod.logo; fimg.alt = fprod.tool + ' logo'; fimg.loading = 'lazy';
              frow.appendChild(fimg);
            }
            var finfo = document.createElement('div'); finfo.className = 'cinfo';
            var fh = document.createElement('h3'); fh.textContent = lr.resolve.freeItem.tool; finfo.appendChild(fh);
            var fp = document.createElement('p');
            var fdur = lr.resolve.freeItem.duration && lr.resolve.freeItem.duration !== 'Not Stated' ? ' \u00B7 ' + lr.resolve.freeItem.duration : '';
            fp.textContent = lr.resolve.freeItem.package + fdur + ' x ' + lr.resolve.freeUnits; finfo.appendChild(fp);
            frow.appendChild(finfo);
            var fline = document.createElement('div'); fline.className = 'cline'; fline.textContent = 'Free'; frow.appendChild(fline);
            fcard.appendChild(frow);
            root.appendChild(fcard);
          }
          if (!lr.valid) {
            var ip = document.createElement('p'); ip.className = 'cartnote';
            ip.textContent = lr.reason === 'unavailable' ? 'This item is no longer available.' : 'This item cannot be priced right now.';
            root.appendChild(ip);
          }
        })(result.lines[ri]);
      }
      var total = document.createElement('div'); total.className = 'carttotal';
      total.textContent = 'Total: ' + fmtTotal(result.totalPkr);
      root.appendChild(total);
      var actions = document.createElement('div'); actions.className = 'cartactions';
      var checkout = document.createElement('a'); checkout.className = 'wa'; checkout.href = 'https://wa.me/923214378770'; checkout.textContent = 'Order on WhatsApp';
      checkout.addEventListener('click', function(ev){
        ev.preventDefault();
        var fresh = evaluate();
        if (!fresh || !fresh.lines.length || !fresh.valid) {
          showNote('Your cart cannot be ordered right now. Remove the items that cannot be priced and try again.');
          renderCart();
          return;
        }
        var msgLines = [];
        for (var mi = 0; mi < fresh.lines.length; mi++) {
          var fl = fresh.lines[mi];
          if (!fl.valid) continue;
          msgLines.push({ product: fl.product, qty: fl.qty, resolve: fl.resolve, lineLabel: fmtTotal(fl.resolve.totalPkr) });
        }
        var url = buildCartMessage({ lines: msgLines, totalLabel: fmtTotal(fresh.totalPkr), waNumber: '923214378770' });
        window.open(url, '_blank');
      });
      if (!result.valid) { checkout.style.pointerEvents = 'none'; checkout.style.opacity = '0.6'; checkout.setAttribute('aria-disabled', 'true'); }
      actions.appendChild(checkout);
      var clear = document.createElement('button'); clear.className = 'cartclear'; clear.type = 'button'; clear.textContent = 'Clear cart';
      clear.addEventListener('click', function(){ store.clear(); prevOffer = {}; renderCart(); });
      actions.appendChild(clear);
      var cont = document.createElement('a'); cont.href = 'index.html#shop'; cont.textContent = 'Continue shopping';
      cont.style.fontWeight = 'bold'; cont.style.color = 'var(--teal)';
      actions.appendChild(cont);
      root.appendChild(actions);
      updateBadge();
    }
    document.querySelectorAll('[data-addcart]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pid = btn.getAttribute('data-addcart');
        var prod = catalogue[pid];
        if (!prod || (prod.availability !== 'In Stock' && prod.availability !== 'Limited')) { showToast('This package is not available.'); return; }
        var res = store.add(pid, 1);
        var present = false;
        for (var i = 0; i < res.lines.length; i++) if (res.lines[i].pid === pid) present = true;
        showToast(present ? 'Added to cart' : 'Cart is full.');
        updateBadge();
      });
    });
    document.querySelectorAll('[data-addcart-page]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var pid = btn.getAttribute('data-addcart-page');
        var prod = catalogue[pid];
        if (!prod || (prod.availability !== 'In Stock' && prod.availability !== 'Limited')) { showToast('This package is not available.'); return; }
        var box = document.querySelector('.promo-box');
        var waBtn = document.querySelector('.pcard a.wa');
        if (box && waBtn && waBtn.getAttribute('aria-disabled') === 'true') return;
        var qty = 1;
        if (box) {
          try { if (typeof PROMO_QTY !== 'undefined' && PROMO_QTY) qty = PROMO_QTY; } catch (e) {}
        }
        var res = store.add(pid, qty);
        var present = false;
        for (var i = 0; i < res.lines.length; i++) if (res.lines[i].pid === pid) present = true;
        showToast(present ? 'Added to cart' : 'Cart is full.');
        updateBadge();
      });
    });
    updateBadge();
    renderCart();
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) renderCart(); });
    window.addEventListener('focus', function(){ renderCart(); });
    document.addEventListener('upt:currency', function(){ renderCart(); });
    document.addEventListener('upt:rates', function(){ renderCart(); });
    window.addEventListener('storage', function(ev){ if (ev.key === KEY) renderCart(); });
    setInterval(function(){ if (!document.hidden) renderCart(); }, 30000);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrowser);
    else initBrowser();
  }
  return { normalizeCart: normalizeCart, createStore: createStore, capForLine: capForLine,
    progressHint: progressHint, buildCartMessage: buildCartMessage, fmtTotal: fmtTotal };
});
