// POST /api/gateway/create-order — crée la commande PayPal Orders v2.
// Re-vérifie le checksum Orderbox : le montant facturé ne peut pas être altéré côté client.
const { verifyChecksum, parseQS } = require("../_lib/checksum");
const { createOrder } = require("../_lib/paypal");

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
    const { qs } = req.body || {};
    const q = parseQS(qs);
    if (!verifyChecksum(q, process.env.RC_CHECKSUM_KEY)) {
      res.status(400).json({ error: "checksum invalide" });
      return;
    }
    const order = await createOrder({
      amount: q.sellingcurrencyamount,
      currency: process.env.SELLING_CURRENCY || "USD",
      transId: q.transid,
      description: q.description || `Commande ${q.transid}`,
    });
    res.status(200).json({ orderID: order.id });
  } catch (e) {
    console.error("create-order:", e.message);
    res.status(502).json({ error: "création de la commande PayPal impossible" });
  }
};
