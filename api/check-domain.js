export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { domain } = req.query;
  if (!domain) return res.status(400).json({ error: 'domain requis' });

  const API_KEY = 'at_YoDhAD0yJYecVonxb6BfkKxwXqQS1';
  const TLDS = ['com', 'africa', 'ca', 'org', 'net', 'io', 'bj', 'ci', 'sn'];

  try {
    const results = await Promise.all(
      TLDS.map(async tld => {
        const fullDomain = `${domain}.${tld}`;
        const resp = await fetch(
          `https://domain-availability.whoisxmlapi.com/api/v1?apiKey=${API_KEY}&domainName=${fullDomain}&credits=DA`
        );
        const data = await resp.json();
        return {
          domain: fullDomain,
          available: data.DomainInfo?.domainAvailability === 'AVAILABLE'
        };
      })
    );
    res.status(200).json({ domains: results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
