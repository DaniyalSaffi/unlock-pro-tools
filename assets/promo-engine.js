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
    if (rw.kind === 'free_units') {
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
    if (out.status === 'applied' && out.totalPkr < (out.paidUnits + out.freeUnits) * cost) {
      return blocked(promo, qty, list, 'below_cost_floor');
    }
    return out;
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
  return { resolve: resolve, buildWaUrl: buildWaUrl, scheduleActive: scheduleActive,
    parseQty: parseQty };
});
