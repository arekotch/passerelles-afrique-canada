export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'domain requis' });

  const GD_KEY    = 'hkTkicP99YYM_AThy42nB26gt3Py4bcZuKb';
  const GD_SECRET = '2quy9w1pujj9KBJv2jhQEk';

  const tlds = ['com', 'africa', 'ca', 'org', 'net', 'io', 'bj', 'ci', 'sn'];
  const domains = tlds.map(t => `${domain}.${t}`).join(',');

  try {
    const resp = await fetch(
      `https://api.godaddy.com/v1/domains/available?domain=${domains}&checkType=FAST`,
      { headers: { 'Authorization': `sso-key ${GD_KEY}:${GD_SECRET}` } }
    );
    const data = await resp.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
