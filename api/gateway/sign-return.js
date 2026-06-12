// POST /api/gateway/sign-return — signe un retour "N" (échec/abandon) ou "P" (pending).
// Sécurité : refuse "Y" — un succès ne peut être signé que par capture-order après
// vérification effective du paiement PayPal.
const { verifyChecksum, parseQS, buildReturnFields } = require("../_lib/checksum");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  const { qs, status } = req.body || {};
  const key = process.env.RC_CHECKSUM_KEY;
  const q = parseQS(qs);

  if (!["N", "P"].includes(status)) {
    res.status(400).json({ error: "statut non autorisé" });
    return;
  }
  if (!verifyChecksum(q, key)) {
    res.status(400).json({ error: "checksum invalide" });
    return;
  }
  res.status(200).json(buildReturnFields(q, status, key));
};
