// api/proxy.js
export default async function handler(req, res) {
  const url = 'https://script.google.com/macros/s/AKfycbwdsTMmq9coKSp73Nllb3O49_X5l1F9PA8ADY5tQiIGYnRWJJ45hXCjmwU70ycuwi0/exec';
  const params = req.method === 'GET' ? req.query : req.body;
  const query = new URLSearchParams(params).toString();
  const target = `${url}?${query}`;
  const response = await fetch(target);
  const text = await response.text();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).send(text);
}