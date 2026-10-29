var UPT_PROMOS = [
 {
  "id": "flash-gemini-pro-10",
  "type": "flash_sale",
  "priority": 100,
  "label": "Flash Sale: 10% off Gemini Pro",
  "strip_text": "10% off Gemini Pro for a limited time.",
  "terms": "10% off Gemini Pro, maximum 5 units per order, during the sale period. Not combinable with other offers.",
  "scope": "same_package",
  "pids": [
   "gemini-google-ai-pro-pro-18-months-activation-link"
  ],
  "reward": {
   "kind": "percent_off",
   "percent": 10,
   "max_units_per_order": 5
  },
  "limits": {
   "max_paid_units_per_order": 5,
   "per_customer_note": "Confirmed by the seller on WhatsApp."
  },
  "schedule": {
   "start": "2026-10-24T23:00:00+05:00",
   "end": "2026-10-27T23:59:00+05:00",
   "show_countdown": true
  },
  "display": {
   "home_strip": true,
   "card_badge": true,
   "product_page": true
  }
 },
 {
  "id": "bundle-gemini-canva",
  "type": "bulk_reward",
  "priority": 20,
  "label": "Buy 10 Gemini, get Canva free",
  "strip_text": "Buy 10 of the selected Gemini package and get a Canva Edu Plan free.",
  "terms": "Applies to 10 or more units of the same Gemini package and duration. Free item: Canva Edu Plan x1. Delivered with the same order, subject to availability and seller confirmation. Not combinable with other offers.",
  "scope": "cross_product",
  "pids": [
   "gemini-google-ai-pro-pro-18-months-activation-link"
  ],
  "reward": {
   "kind": "free_item",
   "buy_qty": 10,
   "free_item": {
    "pid": "canva-edu-plan",
    "qty": 1
   },
   "repeatable": true,
   "max_reward_sets_per_order": 2
  },
  "limits": {
   "max_paid_units_per_order": 20,
   "per_customer_note": "One redemption per customer, confirmed by the seller."
  },
  "schedule": {
   "start": null,
   "end": null,
   "show_countdown": false
  },
  "display": {
   "home_strip": true,
   "card_badge": true,
   "product_page": true
  },
  "badge_text": "Free Canva Edu",
  "freeItem": {
   "pid": "canva-edu-plan",
   "tool": "Canva",
   "package": "Edu Plan",
   "duration": "Not Stated",
   "costPkr": 143.2,
   "listPkr": 179
  }
 }
];
if (typeof window !== 'undefined') window.UPT_PROMOS = UPT_PROMOS;
if (typeof module !== 'undefined' && module.exports) module.exports = UPT_PROMOS;
