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
 }
];
if (typeof window !== 'undefined') window.UPT_PROMOS = UPT_PROMOS;
if (typeof module !== 'undefined' && module.exports) module.exports = UPT_PROMOS;
