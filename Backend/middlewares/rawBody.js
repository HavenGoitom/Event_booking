// middleware/rawBody.mjs
export function rawBodyMiddleware(req, res, next) {
  // only for requests that might need raw body (webhooks) - but safe for all
  let data = [];
  req.on('data', chunk => {
    data.push(chunk);
  });
  req.on('end', () => {
    if (data.length) {
      req.rawBody = Buffer.concat(data);
      try {
        // keep req.body parsed by later express.json()
        // do not parse here, express.json will run after this middleware
      } catch (e) {
        // ignore
      }
    } else {
      req.rawBody = Buffer.from('');
    }
    next();
  });
  req.on('error', (err) => {
    next(err);
  });
}
