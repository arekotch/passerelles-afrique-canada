// Portage Node.js de functions.php (PHP Integration Kit v4.0 — ResellerClub/Orderbox)
const crypto = require("crypto");

const md5 = (s) => crypto.createHash("md5").update(s, "utf8").digest("hex");

/**
 * Vérifie le checksum entrant envoyé par Orderbox (paymentpage).
 * Équivalent PHP : verifyChecksum(...)
 * @param {Object} q - paramètres de la query string, décodés (URLSearchParams)
 * @param {string} key - clé 32 caractères du Reseller Control Panel
 */
function verifyChecksum(q, key) {
  const str = [
    q.paymenttypeid ?? "",
    q.transid ?? "",
    q.userid ?? "",
    q.usertype ?? "",
    q.transactiontype ?? "",
    q.invoiceids ?? "",
    q.debitnoteids ?? "",
    q.description ?? "",
    q.sellingcurrencyamount ?? "",
    q.accountingcurrencyamount ?? "",
    key,
  ].join("|");
  const expected = md5(str);
  const received = String(q.checksum ?? "").toLowerCase();
  // comparaison en temps constant
  const a = Buffer.from(expected);
  const b = Buffer.from(received.padEnd(expected.length).slice(0, expected.length));
  return crypto.timingSafeEqual(a, b);
}

/**
 * Génère le checksum de retour vers Orderbox (postpayment).
 * Équivalent PHP : generateChecksum(...)
 * @param {string} status - "Y" (succès), "N" (échec) ou "P" (en attente)
 */
function generateReturnChecksum(transId, sellingAmount, accountingAmount, status, rkey, key) {
  return md5(`${transId}|${sellingAmount}|${accountingAmount}|${status}|${rkey}|${key}`);
}

/** Parse une query string brute en objet (décodage identique à PHP $_GET). */
function parseQS(qs) {
  return Object.fromEntries(new URLSearchParams(qs || ""));
}

/** Construit les champs de retour signés vers redirecturl. */
function buildReturnFields(q, status, key) {
  const rkey = crypto.randomInt(1, 2147483647).toString();
  const selling = q.sellingcurrencyamount ?? "";
  const accounting = q.accountingcurrencyamount ?? "";
  return {
    redirecturl: q.redirecturl,
    fields: {
      transid: q.transid,
      status,
      rkey,
      checksum: generateReturnChecksum(q.transid, selling, accounting, status, rkey, key),
      sellingamount: selling,
      accountingamount: accounting,
    },
  };
}

module.exports = { verifyChecksum, generateReturnChecksum, parseQS, buildReturnFields };
