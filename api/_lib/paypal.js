// Client minimal pour l'API PayPal Orders v2 (REST) — sans dépendance externe (Node >= 18)
const BASE = {
  live: "https://api-m.paypal.com",
  sandbox: "https://api-m.sandbox.paypal.com",
};

function apiBase() {
  return BASE[process.env.PAYPAL_ENV === "live" ? "live" : "sandbox"];
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString("base64");
  const r = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) throw new Error(`PayPal OAuth ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}

/** Crée une commande PayPal du montant demandé (devise de vente). */
async function createOrder({ amount, currency, transId, description }) {
  const token = await getAccessToken();
  const r = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: currency, value: Number(amount).toFixed(2) },
          custom_id: String(transId),
          description: String(description || "").slice(0, 127),
        },
      ],
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`PayPal create ${r.status}: ${JSON.stringify(data)}`);
  return data; // { id, status, ... }
}

/** Capture une commande approuvée. Retourne { completed, capturedValue, currency, raw }. */
async function captureOrder(orderID) {
  const token = await getAccessToken();
  const r = await fetch(`${apiBase()}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`PayPal capture ${r.status}: ${JSON.stringify(data)}`);
  const cap = data?.purchase_units?.[0]?.payments?.captures?.[0];
  return {
    completed: data.status === "COMPLETED" && cap?.status === "COMPLETED",
    capturedValue: cap?.amount?.value,
    currency: cap?.amount?.currency_code,
    raw: data,
  };
}

module.exports = { createOrder, captureOrder };
