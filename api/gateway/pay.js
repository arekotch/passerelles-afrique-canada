// GET /api/gateway/pay — URL à déclarer comme "Gateway URL" dans le panneau ResellerClub.
// Équivalent moderne de paymentpage.php : vérifie le checksum entrant puis affiche
// les boutons PayPal (JS SDK + Orders v2) au lieu des boutons de test du kit.
const { verifyChecksum, parseQS } = require("../_lib/checksum");

module.exports = async (req, res) => {
  const key = process.env.RC_CHECKSUM_KEY;
  const currency = process.env.SELLING_CURRENCY || "USD";
  const clientId = process.env.PAYPAL_CLIENT_ID;

  const rawQS = (req.url.split("?")[1] || "");
  const q = parseQS(rawQS);

  if (!key || !clientId) {
    res.status(500).send("Configuration incomplète (variables d'environnement).");
    return;
  }
  if (!q.transid || !q.redirecturl || !verifyChecksum(q, key)) {
    // Cas du kit PHP : "Checksum mismatch !" — ne JAMAIS laisser payer.
    res.status(400).send("Erreur de vérification de la transaction. Veuillez réessayer depuis votre panier.");
    return;
  }

  const amount = Number(q.sellingcurrencyamount).toFixed(2);
  const desc = (q.description || `Commande ${q.transid}`).replace(/[<>&"]/g, "");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Paiement sécurisé — Passerelles Afrique-Canada</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f8fa;margin:0;
       display:flex;justify-content:center;align-items:flex-start;min-height:100vh;padding:40px 16px}
  .card{background:#fff;border-radius:12px;box-shadow:0 2px 12px rgba(0,0,0,.08);max-width:440px;width:100%;padding:32px}
  h1{font-size:1.15rem;margin:0 0 4px;color:#1a2b49}
  .amount{font-size:2rem;font-weight:700;color:#1a2b49;margin:12px 0 4px}
  .desc{color:#5b6b80;font-size:.92rem;margin-bottom:24px;word-break:break-word}
  .ref{color:#8a97a8;font-size:.78rem;margin-top:20px}
  .cancel{display:block;text-align:center;margin-top:14px;color:#8a97a8;font-size:.85rem;cursor:pointer;text-decoration:underline}
  #msg{color:#b00020;font-size:.85rem;margin-top:10px;text-align:center;min-height:1em}
</style>
</head>
<body>
<div class="card">
  <h1>Paiement sécurisé</h1>
  <div class="amount">${amount} ${currency}</div>
  <div class="desc">${desc}</div>
  <div id="paypal-buttons"></div>
  <div id="msg"></div>
  <span class="cancel" onclick="abort()">Annuler et revenir à la boutique</span>
  <div class="ref">Réf. transaction : ${String(q.transid)}</div>
</div>
<form id="returnForm" method="GET" style="display:none"></form>
<script>
  const QS = ${JSON.stringify(rawQS)};

  function submitReturn(data){
    const f = document.getElementById('returnForm');
    f.action = data.redirecturl;
    for (const [k,v] of Object.entries(data.fields)) {
      const i = document.createElement('input');
      i.type='hidden'; i.name=k; i.value=v; f.appendChild(i);
    }
    f.submit();
  }
  async function signedReturn(status){
    const r = await fetch('/api/gateway/sign-return', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ qs: QS, status })
    });
    if (r.ok) submitReturn(await r.json());
  }
  function abort(){ signedReturn('N'); }
</script>
<script src="https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=${encodeURIComponent(currency)}&intent=capture"></script>
<script>
  paypal.Buttons({
    createOrder: async () => {
      const r = await fetch('/api/gateway/create-order', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ qs: QS })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'create-order failed');
      return d.orderID;
    },
    onApprove: async (data) => {
      const r = await fetch('/api/gateway/capture-order', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ qs: QS, orderID: data.orderID })
      });
      const d = await r.json();
      if (r.ok && d.redirecturl) submitReturn(d);
      else document.getElementById('msg').textContent =
        "Le paiement n'a pas pu être confirmé. Aucun montant n'a été débité.";
    },
    onCancel: () => { /* le client garde la main ; il peut réessayer ou cliquer Annuler */ },
    onError: () => {
      document.getElementById('msg').textContent =
        "Une erreur est survenue avec PayPal. Veuillez réessayer.";
    }
  }).render('#paypal-buttons');
</script>
</body>
</html>`);
};
