// POST /api/gateway/capture-order — capture le paiement puis génère le retour signé "Y".
// Le statut "Y" n'est délivré QUE si la capture PayPal est COMPLETED et que le
// montant capturé correspond exactement au montant demandé par Orderbox.
const { verifyChecksum, parseQS, buildReturnFields } = require("../_lib/checksum");
const { captureOrder } = require("../_lib/paypal");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const { qs, orderID } = req.body || {};
    const key = process.env.RC_CHECKSUM_KEY;
    const q = parseQS(qs);
    if (!orderID || !verifyChecksum(q, key)) {
      res.status(400).json({ error: "requête invalide" });
      return;
    }

    const cap = await captureOrder(orderID);
    const expected = Number(q.sellingcurrencyamount).toFixed(2);
    const currency = process.env.SELLING_CURRENCY || "USD";

    if (cap.completed && cap.capturedValue === expected && cap.currency === currency) {
      res.status(200).json(buildReturnFields(q, "Y", key)); // succès signé
    } else {
      console.error("capture-order: incohérence", {
        transid: q.transid, expected, got: cap.capturedValue, status: cap.raw?.status,
      });
      res.status(200).json(buildReturnFields(q, "P", key)); // doute => Pending (validation manuelle dans le panneau)
    }
  } catch (e) {
    console.error("capture-order:", e.message);
    res.status(502).json({ error: "capture impossible" });
  }
};
