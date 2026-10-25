
(function(root, factory){
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.UPTCart = factory(); }
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  var KEY = 'upt_cart_v1';
  function getEngine(){ try { return (typeof PromoEngine !== 'undefined') ? PromoEngine : null; } catch (e) { return null; } }
  function getCurr(){
    // Prefer the stored value live: cross-tab currency switches and
    // bfcache restores must not show stale prices from a script-level copy.
    try {
      if (typeof localStorage !== 'undefined') {
        var s = localStorage.getItem('upt-curr');
        if (s === 'PKR' || s === 'USD' || s === 'USDT') return s;
      }
    } catch (e) {}
    try { return (typeof CURR !== 'undefined' && CURR) ? CURR : 'PKR'; } catch (e) { return 'PKR'; }
  }
  function getRates(){ try { return (typeof RATES !== 'undefined' && RATES) ? RATES : { usd: 280, usdt: 280 }; } catch (e) { return { usd: 280, usdt: 280 }; } }
  function money(n){ return n.toLocaleString('en-US'); }
  function fmtTotal(pkr){
    if (typeof fmtCurrTotal === 'function') { try { return fmtCurrTotal(pkr); } catch (e) {} }
    var c = getCurr(), r = getRates();
    if (c === 'USD') return '$' + (Math.ceil(pkr / r.usd * 100 - 1e-9) / 100).toFixed(2);
    if (c === 'USDT') return (Math.ceil(pkr / r.usdt * 100 - 1e-9) / 100).toFixed(2) + ' USDT';
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
    var dropped = [], droppedCap = [], clamped = [], lines = [];
    if (!raw || typeof raw !== 'object' || raw.v !== 1 || !Array.isArray(raw.lines)) {
      return { lines: lines, dropped: dropped, droppedCap: droppedCap, clamped: clamped };
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
      for (var j = 0; j < extra.length; j++) droppedCap.push(extra[j].pid);
    }
    return { lines: lines, dropped: dropped, droppedCap: droppedCap, clamped: clamped };
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
      try { storage.setItem(KEY, JSON.stringify(obj)); ok = true; }
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
  // Lines blocked only because their quantity is over a promo cap: clamp them
  // to the cap instead of leaving a dead-end invalid line. Other block
  // reasons (price mismatch, below cost floor) are never auto-clamped.
  function qtyClamps(result, limits){
    var out = [];
    if (!result || !result.lines) return out;
    for (var i = 0; i < result.lines.length; i++) {
      var lr = result.lines[i];
      if (!lr.valid && lr.reason === 'qty' && lr.resolve && lr.resolve.promo) {
        var cap = capForLine(lr, lr.resolve, limits);
        if (lr.qty > cap) out.push({ pid: lr.pid, cap: cap });
      }
    }
    return out;
  }
  // Fail-closed runtime guard: the build derives maxLines from the encoded
  // message cap, but if a message ever exceeds it, refuse instead of sending
  // a truncated order.
  function messageTooLong(text, maxChars){
    if (typeof maxChars !== 'number' || !(maxChars > 0)) maxChars = 1800;
    try { return encodeURIComponent(text).length > maxChars; } catch (e) { return true; }
  }
  function progressHint(res){
    if (!res || res.status !== 'progress') return '';
    var rw = res.promo && res.promo.reward;
    if (rw && rw.kind === 'free_item' && res.freeItem) return 'Add ' + res.unitsToNextReward + ' more to get ' + res.freeItem.tool + ' ' + res.freeItem.package + ' free';
    if (rw && rw.kind === 'free_units') return 'Add ' + res.unitsToNextReward + ' more to get ' + rw.free_qty + ' free';
    return '';
  }
  function localBuildCartMessage(o){
    var NL = String.fromCharCode(10);
    function moneyL(n){ return n.toLocaleString('en-US'); }
    function toCentsL(pkr, rate){ if (typeof rate !== 'number' || !(rate > 0)) rate = 280; return Math.ceil(pkr / rate * 100 - 1e-9); }
    function dualL(pkr, currency, rate){
      var pl = 'PKR ' + moneyL(pkr);
      if (currency === 'USD' || currency === 'USDT') return currency + ' ' + (toCentsL(pkr, rate) / 100).toFixed(2) + ' (' + pl + ')';
      return pl;
    }
    var lines = ["Hello, I'd like to order from " + (o.brand || 'Unlock Pro Tools') + '.', ''];
    var totalCents = 0;
    var cartLines = o.lines || [];
    for (var i = 0; i < cartLines.length; i++) {
      var ln = cartLines[i];
      lines.push((i + 1) + '. Product: ' + ln.tool);
      lines.push('Package: ' + ln.pkg);
      lines.push('Duration: ' + ln.duration);
      var q = String(ln.qty);
      if (ln.freeUnits > 0) q = ln.qty + ' paid + ' + ln.freeUnits + ' free';
      lines.push('Quantity: ' + q);
      lines.push('Line total: ' + dualL(ln.linePkr, o.currency, o.rate));
      if (ln.offer) lines.push('Offer: ' + ln.offer.label + ' (' + ln.offer.id + ')');
      if (ln.freeItem && ln.freeUnits > 0) {
        var dur = (ln.freeItem.duration && ln.freeItem.duration !== 'Not Stated') ? ' | ' + ln.freeItem.duration : '';
        lines.push('Free item: ' + ln.freeItem.tool + ' | ' + ln.freeItem.package + dur + ' x ' + ln.freeUnits);
      }
      lines.push('');
      if (o.currency !== 'PKR') totalCents += toCentsL(ln.linePkr, o.rate);
    }
    var totalLabel;
    if (o.currency === 'PKR') totalLabel = 'PKR ' + moneyL(o.totalPkr);
    else totalLabel = o.currency + ' ' + (totalCents / 100).toFixed(2) + ' (PKR ' + moneyL(o.totalPkr) + ')';
    lines.push('Total: ' + totalLabel);
    if (o.currency !== 'PKR') {
      var rr = (typeof o.rate === 'number' && o.rate > 0) ? o.rate : 280;
      lines.push('Rate used: 1 ' + o.currency + ' = PKR ' + ((rr % 1 === 0) ? String(rr) : rr.toFixed(2)));
    }
    var notes = o.notes || [];
    for (var n = 0; n < notes.length; n++) lines.push('Note: ' + notes[n]);
    lines.push('');
    lines.push('Please confirm availability and how to pay.');
    return lines.join(NL);
  }
  function buildCartText(o){
    var e = getEngine();
    if (e && e.buildCartMessage) return e.buildCartMessage(o);
    return localBuildCartMessage(o);
  }
  function buildCartMessage(o){
    return 'https://wa.me/' + o.waNumber + '?text=' + encodeURIComponent(buildCartText(o));
  }
  function buildCheckoutText(fresh){
    var msgLines = [];
    var notes = [];
    for (var mi = 0; mi < fresh.lines.length; mi++) {
      var fl = fresh.lines[mi];
      if (!fl.valid) continue;
      var ln = { tool: fl.product.tool, pkg: fl.product.package, duration: fl.product.duration,
        qty: fl.qty, linePkr: fl.resolve.totalPkr, freeUnits: 0, offer: null, freeItem: null };
      if (fl.resolve.status === 'applied' && fl.resolve.promo) {
        ln.offer = { label: fl.resolve.promo.label, id: fl.resolve.promo.id };
        if (fl.resolve.freeItem && fl.resolve.freeUnits > 0) { ln.freeItem = fl.resolve.freeItem; ln.freeUnits = fl.resolve.freeUnits; }
        var nt = fl.resolve.promo.limits && fl.resolve.promo.limits.per_customer_note;
        if (nt && notes.indexOf(nt) === -1) notes.push(nt);
      }
      msgLines.push(ln);
    }
    var curr = getCurr(), rates = getRates();
    return buildCartText({ brand: 'Unlock Pro Tools', lines: msgLines, totalPkr: fresh.totalPkr,
      currency: curr, rate: curr === 'USD' ? rates.usd : rates.usdt, notes: notes });
  }
  function fallbackCopy(text){
    try {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    } catch (e) {}
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
    // A double-clicked Add must not create an invalid over-cap line: after
    // adding, resolve the line and clamp it to its promo cap when blocked
    // only on quantity.
    function clampAdded(pid){
      var eng = getEngine(); if (!eng || !eng.resolve) return;
      var norm = store.load(); var qty = 0;
      for (var i = 0; i < norm.lines.length; i++) if (norm.lines[i].pid === pid) qty = norm.lines[i].qty;
      if (!qty) return;
      var prod = catalogue[pid]; if (!prod) return;
      var r = eng.resolve({ product: prod, qty: qty, now: Date.now(), promos: getPromos() });
      if (r.status === 'blocked' && r.blockedReason === 'qty') {
        var cap = capForLine(null, r, limits);
        if (qty > cap) store.setQty(pid, cap);
      }
    }
    function renderCart(){
      var root = document.getElementById('cart-root');
      if (!root) return;
      if (!store.storageOK) showNote('Your cart will not be saved on this device.');
      var norm = store.load();
      if (norm.dropped.length) showNote('Some items are no longer available and were removed from your cart.');
      if (norm.droppedCap.length) showNote('The cart holds at most ' + limits.maxLines + ' items, so extra items were removed.');
      if (norm.clamped.length) showNote('The quantity on this item was updated to the current limit.');
      // Persist the cleanup so the note does not reappear on every reload.
      if (norm.dropped.length || norm.droppedCap.length || norm.clamped.length) store.save(norm.lines);
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
        var clamps = qtyClamps(result, limits);
        for (var ci = 0; ci < clamps.length; ci++) {
          store.setQty(clamps[ci].pid, clamps[ci].cap); changed = true;
          showNote('The quantity on this item was updated to the current limit.');
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
          img.src = lr.product.logo; img.alt = lr.product.tool + ' logo'; img.width = 64; img.height = 64; img.loading = 'lazy';
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
          var input = document.createElement('input'); input.type = 'text'; input.setAttribute('inputmode', 'numeric'); input.setAttribute('autocomplete', 'off'); input.setAttribute('aria-label', 'Quantity'); input.value = String(lr.qty);
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
          // Never silently reinterpret input: non-digit keystrokes and pastes
          // are rejected, and the quantity commits on change (blur/Enter) so
          // typing a multi-digit number does not rebuild the field mid-type.
          input.addEventListener('paste', function(ev){
            var t = (ev.clipboardData && ev.clipboardData.getData('text')) || '';
            if (!/^[0-9]+$/.test(t.trim())) { ev.preventDefault(); showNote('Quantities must be whole numbers.'); }
          });
          input.addEventListener('input', function(){
            if (!/^[0-9]*$/.test(input.value)) { input.value = String(lr.qty); return; }
          });
          input.addEventListener('change', function(){
            var v = input.value;
            if (v === '') { input.value = String(lr.qty); return; }
            var n = parseInt(v, 10);
            if (n !== lr.qty) { store.setQty(lr.pid, n); renderCart(); }
          });
          input.addEventListener('keydown', function(ev){
            if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
          });
          input.addEventListener('blur', function(){ if (input.value === '') { input.value = String(lr.qty); } });
          if (lr.valid && lr.resolve && lr.resolve.status === 'applied' && lr.resolve.freeItem && lr.resolve.freeUnits > 0) {
            var fcard = document.createElement('div'); fcard.className = 'card cartfree';
            fcard.setAttribute('data-parent-pid', lr.pid);
            var frow = document.createElement('div'); frow.className = 'cartrow';
            var fprod = catalogue[lr.resolve.freeItem.pid];
            if (fprod) {
              var fimg = document.createElement('img');
              fimg.src = fprod.logo; fimg.alt = fprod.tool + ' logo'; fimg.width = 64; fimg.height = 64; fimg.loading = 'lazy';
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
      // Displayed total = sum of the displayed line totals (USD/USDT ceil per
      // line), so the page total always equals the WhatsApp message total.
      var totalLabel;
      if (getCurr() === 'PKR') totalLabel = fmtTotal(result.totalPkr);
      else {
        var _r = getRates(), _rate = getCurr() === 'USD' ? _r.usd : _r.usdt, _sumCents = 0;
        result.lines.forEach(function(fl){ if (fl.valid) _sumCents += Math.ceil(fl.resolve.totalPkr / _rate * 100 - 1e-9); });
        totalLabel = getCurr() === 'USD' ? '$' + (_sumCents / 100).toFixed(2) : (_sumCents / 100).toFixed(2) + ' USDT';
      }
      total.textContent = 'Total: ' + totalLabel;
      root.appendChild(total);
      var actions = document.createElement('div'); actions.className = 'cartactions';
      var checkout = document.createElement('a'); checkout.className = 'wa'; checkout.href = 'https://wa.me/923214378770'; checkout.textContent = 'Order on WhatsApp';
      checkout.addEventListener('click', function(ev){
        ev.preventDefault();
        if (checkout.dataset.sent) return;
        var fresh = evaluate();
        if (!fresh || !fresh.lines.length || !fresh.valid) {
          showNote('Your cart cannot be ordered right now. Remove the items that cannot be priced and try again.');
          renderCart();
          return;
        }
        var checkoutText = buildCheckoutText(fresh);
        if (messageTooLong(checkoutText, limits.messageMaxChars)) {
          showNote('Your order message is too long. Remove an item and try again.');
          renderCart();
          return;
        }
        checkout.dataset.sent = '1';
        setTimeout(function(){ delete checkout.dataset.sent; }, 1500);
        var url = 'https://wa.me/923214378770?text=' + encodeURIComponent(checkoutText);
        window.open(url, '_blank');
      });
      if (!result.valid) { checkout.style.pointerEvents = 'none'; checkout.style.opacity = '0.6'; checkout.setAttribute('aria-disabled', 'true'); }
      actions.appendChild(checkout);
      var copyBtn = document.createElement('button'); copyBtn.className = 'cartcopy'; copyBtn.type = 'button'; copyBtn.textContent = 'Copy order message';
      copyBtn.addEventListener('click', function(){
        var fresh = evaluate();
        if (!fresh || !fresh.lines.length || !fresh.valid) {
          showNote('Your cart cannot be ordered right now. Remove the items that cannot be priced and try again.');
          renderCart();
          return;
        }
        var text = buildCheckoutText(fresh);
        if (messageTooLong(text, limits.messageMaxChars)) {
          showNote('Your order message is too long. Remove an item and try again.');
          renderCart();
          return;
        }
        function done(){ showToast('Order message copied'); }
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function(){ fallbackCopy(text); done(); });
          else { fallbackCopy(text); done(); }
        } catch (e) { fallbackCopy(text); done(); }
      });
      if (!result.valid) { copyBtn.style.pointerEvents = 'none'; copyBtn.style.opacity = '0.6'; copyBtn.setAttribute('aria-disabled', 'true'); }
      actions.appendChild(copyBtn);
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
        clampAdded(pid);
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
        clampAdded(pid);
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
    window.addEventListener('pageshow', function(ev){ if (ev.persisted) renderCart(); });
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
    progressHint: progressHint, buildCartMessage: buildCartMessage, buildCartText: buildCartText, fmtTotal: fmtTotal,
    qtyClamps: qtyClamps, messageTooLong: messageTooLong };
});
