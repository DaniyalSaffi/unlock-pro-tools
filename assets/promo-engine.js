(function(root, factory){
  if (typeof module !== 'undefined' && module.exports) { module.exports = factory(); }
  else { root.PromoEngine = factory(); }
})(typeof window !== 'undefined' ? window : this, function(){
  'use strict';
  function isInt(n){ return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function parseQty(q){
    if (typeof q === 'string') {
      var t = q.trim();
      if (!/^[0-9]+$/.test(t)) return null;
      q = parseInt(t, 10);
    }
    if (!isInt(q)) return null;
    return q;
  }
  function scheduleActive(sched, now){
    if (!sched) return true;
    var st = sched.start ? Date.parse(sched.start) : null;
    var en = sched.end ? Date.parse(sched.end) : null;
    if (st !== null && !(now >= st)) return false;
    if (en !== null && !(now < en)) return false;
    return true;
  }
  function baseResult(){
    return { status:'none', promo:null, paidUnits:0, freeUnits:0, totalUnits:0,
      listUnitPkr:0, unitPkrAfterDiscount:0, listTotalPkr:0, discountPkr:0, totalPkr:0,
      unitsToNextReward:0, activeFrom:null, activeUntil:null, blockedReason:null };
  }
  function blocked(promo, qty, list, reason){
    var r = baseResult();
    r.status = 'blocked'; r.promo = promo || null; r.blockedReason = reason;
    r.paidUnits = qty; r.totalUnits = qty;
    r.listUnitPkr = list; r.unitPkrAfterDiscount = list;
    r.listTotalPkr = list * qty; r.totalPkr = list * qty;
    return r;
  }
  function resolve(opts){
    opts = opts || {};
    var product = opts.product || {};
    var promos = opts.promos || [];
    var now = (typeof opts.now === 'number') ? opts.now : Date.now();
    var cost = product.costPkr;
    var list = product.listPkr;
    if (typeof cost !== 'number' || !(cost > 0) || typeof list !== 'number' || !(list > 0)) {
      return blocked(null, 0, 0, 'bad_product');
    }
    if (list !== Math.round(1.25 * cost)) {
      return blocked(null, 0, list, 'price_mismatch');
    }
    var qty = parseQty(opts.qty);
    if (qty === null) return blocked(null, 0, list, 'qty');
    var cands = [];
    for (var i = 0; i < promos.length; i++) {
      var pr = promos[i];
      if (!pr) continue;
      if (pr.enabled === false) continue;
      if (!Array.isArray(pr.pids) || pr.pids.indexOf(product.pid) === -1) continue;
      if (!scheduleActive(pr.schedule, now)) continue;
      cands.push(pr);
    }
    if (!cands.length) {
      var n = baseResult();
      n.status = 'none'; n.paidUnits = qty; n.totalUnits = qty;
      n.listUnitPkr = list; n.unitPkrAfterDiscount = list;
      n.listTotalPkr = list * qty; n.totalPkr = list * qty;
      return n;
    }
    cands.sort(function(a, b){ return (b.priority || 0) - (a.priority || 0); });
    var promo = cands[0];
    var cap = promo.limits && promo.limits.max_paid_units_per_order;
    if (!isInt(cap) || cap < 1) return blocked(promo, qty, list, 'qty');
    if (qty < 1 || qty > cap) return blocked(promo, qty, list, 'qty');
    var rw = promo.reward || {};
    var out = baseResult();
    out.status = 'applied'; out.promo = promo; out.paidUnits = qty; out.totalUnits = qty;
    out.listUnitPkr = list; out.unitPkrAfterDiscount = list;
    out.listTotalPkr = list * qty; out.totalPkr = list * qty;
    out.activeFrom = promo.schedule ? (promo.schedule.start || null) : null;
    out.activeUntil = promo.schedule ? (promo.schedule.end || null) : null;
    if (rw.kind === 'free_item') {
      var freeProd = opts.freeProduct || promo.freeItem || null;
      if (!freeProd || typeof freeProd.costPkr !== 'number' || !(freeProd.costPkr > 0) ||
          typeof freeProd.listPkr !== 'number' || !(freeProd.listPkr > 0)) {
        out.status = 'none'; out.promo = null;
      } else if (freeProd.listPkr !== Math.round(1.25 * freeProd.costPkr)) {
        return blocked(promo, qty, list, 'price_mismatch');
      } else if (!isInt(rw.buy_qty) || rw.buy_qty < 1 || !rw.free_item || !isInt(rw.free_item.qty) || rw.free_item.qty < 1 ||
          !isInt(rw.max_reward_sets_per_order) || rw.max_reward_sets_per_order < 1) {
        out.status = 'none'; out.promo = null;
      } else {
        var bsets = 0;
        if (qty >= rw.buy_qty) {
          bsets = Math.floor(qty / rw.buy_qty);
          if (!rw.repeatable) bsets = Math.min(1, bsets);
          bsets = Math.min(bsets, rw.max_reward_sets_per_order);
        }
        out.freeUnits = bsets * rw.free_item.qty;
        out.freeItemsTotal = out.freeUnits;
        out.freeItem = { pid: freeProd.pid || '', tool: freeProd.tool || '', package: freeProd.package || '', duration: freeProd.duration || '', qty: out.freeUnits };
        out.totalUnits = qty + out.freeUnits;
        if (qty < rw.buy_qty) { out.status = 'progress'; out.unitsToNextReward = rw.buy_qty - qty; }
      }
    } else if (rw.kind === 'free_units') {
      if (!isInt(rw.buy_qty) || rw.buy_qty < 1 || !isInt(rw.free_qty) || rw.free_qty < 1) {
        out.status = 'none'; out.promo = null;
      } else {
        var sets = 0;
        if (qty >= rw.buy_qty) {
          sets = Math.floor(qty / rw.buy_qty);
          if (!rw.repeatable) sets = Math.min(1, sets);
          if (rw.max_reward_sets_per_order) sets = Math.min(sets, rw.max_reward_sets_per_order);
        }
        out.freeUnits = sets * rw.free_qty;
        out.totalUnits = qty + out.freeUnits;
        if (qty < rw.buy_qty) { out.status = 'progress'; out.unitsToNextReward = rw.buy_qty - qty; }
      }
    } else if (rw.kind === 'percent_off') {
      if (typeof rw.percent !== 'number' || !(rw.percent > 0) || !(rw.percent < 100) ||
          !isInt(rw.max_units_per_order) || rw.max_units_per_order < 1) {
        out.status = 'none'; out.promo = null;
      } else {
        var unit = Math.ceil(list * (100 - rw.percent) / 100);
        var du = Math.min(qty, rw.max_units_per_order);
        out.unitPkrAfterDiscount = unit;
        out.discountPkr = (list - unit) * du;
        out.totalPkr = du * unit + (qty - du) * list;
      }
    } else {
      out.status = 'none'; out.promo = null;
    }
    if (out.status === 'applied') {
      if (rw.kind === 'free_item') {
        var freeCost = (opts.freeProduct || promo.freeItem || {}).costPkr;
        if (typeof freeCost === 'number' && out.totalPkr < out.paidUnits * cost + out.freeUnits * freeCost) {
          return blocked(promo, qty, list, 'below_cost_floor');
        }
      } else if (out.totalPkr < (out.paidUnits + out.freeUnits) * cost) {
        return blocked(promo, qty, list, 'below_cost_floor');
      }
    }
    return out;
  }
  function resolveCart(opts){
    opts = opts || {};
    var lines = opts.lines || [];
    var promos = opts.promos || [];
    var catalogue = opts.catalogue || {};
    var now = (typeof opts.now === 'number') ? opts.now : Date.now();
    var outLines = [], freeRows = [], totalPkr = 0, paidCost = 0, freeCost = 0;
    var valid = true, warnings = [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i] || {};
      var product = catalogue[ln.pid];
      var qty = parseQty(ln.qty);
      if (!product || qty === null) {
        valid = false;
        outLines.push({ pid: ln.pid || '', qty: qty, product: product || null, resolve: null, valid: false, reason: qty === null ? 'qty' : 'unknown', droppedOffer: false });
        continue;
      }
      if (product.availability !== 'In Stock' && product.availability !== 'Limited') {
        valid = false;
        outLines.push({ pid: ln.pid, qty: qty, product: product, resolve: null, valid: false, reason: 'unavailable', droppedOffer: false });
        continue;
      }
      var res = resolve({ product: product, qty: qty, now: now, promos: promos });
      if (res.status === 'blocked') {
        if (res.blockedReason === 'below_cost_floor') {
          warnings.push('offer dropped on ' + ln.pid);
          res = { status: 'none', promo: null, paidUnits: qty, freeUnits: 0, totalUnits: qty,
            listUnitPkr: product.listPkr, unitPkrAfterDiscount: product.listPkr,
            listTotalPkr: product.listPkr * qty, totalPkr: product.listPkr * qty,
            unitsToNextReward: 0, activeFrom: null, activeUntil: null, blockedReason: null };
          outLines.push({ pid: ln.pid, qty: qty, product: product, resolve: res, valid: true, reason: null, droppedOffer: true });
          totalPkr += res.totalPkr;
          paidCost += qty * product.costPkr;
        } else {
          valid = false;
          outLines.push({ pid: ln.pid, qty: qty, product: product, resolve: res, valid: false, reason: res.blockedReason, droppedOffer: false });
        }
        continue;
      }
      outLines.push({ pid: ln.pid, qty: qty, product: product, resolve: res, valid: true, reason: null, droppedOffer: false });
      totalPkr += res.totalPkr;
      paidCost += qty * product.costPkr;
      if (res.status === 'applied' && res.freeItem && res.freeUnits > 0) {
        freeRows.push({ parentPid: ln.pid, freeItem: res.freeItem });
        var fprod = catalogue[res.freeItem.pid];
        if (fprod && typeof fprod.costPkr === 'number') freeCost += res.freeUnits * fprod.costPkr;
      }
    }
    if (totalPkr < paidCost + freeCost) { valid = false; warnings.push('cart total below cost floor'); }
    var invalidLines = [];
    for (var k = 0; k < outLines.length; k++) if (!outLines[k].valid) invalidLines.push(outLines[k].pid);
    return { lines: outLines, freeRows: freeRows, totalPkr: totalPkr, valid: valid,
      invalidLines: invalidLines, warnings: warnings };
  }
  function buildWaUrl(o){
    var NL = String.fromCharCode(10);
    var lines = ['Hi, I came from the Unlock Pro Tools website. I want to buy this package:',
      'Product: ' + o.tool, 'Package: ' + o.pkg, 'Duration: ' + o.duration,
      'Price: ' + o.priceLabel];
    var extra = o.extraLines || [];
    for (var i = 0; i < extra.length; i++) lines.push(extra[i]);
    lines.push('Please send me the payment and delivery details.');
    return 'https://wa.me/' + o.waNumber + '?text=' + encodeURIComponent(lines.join(NL));
  }
  return { resolve: resolve, resolveCart: resolveCart, buildWaUrl: buildWaUrl,
    scheduleActive: scheduleActive, parseQty: parseQty };
});
