const http = require('http');
const fs = require('fs');
const path = require('path');

const NPM_API = process.env.NPM_API_URL || 'http://npm:81';
const NPM_EMAIL = process.env.NPM_EMAIL;
const NPM_PASSWORD = process.env.NPM_PASSWORD;
const PORT = process.env.TOGGLE_PORT || 8090;

let npmToken = null;
let onlineMode = false;
let toggleLog = [];

async function npmFetch(endpoint, method = 'GET', body = null) {
  const url = `${NPM_API}/api/${endpoint}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (npmToken) opts.headers['Authorization'] = `Bearer ${npmToken}`;
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  return res.json();
}

async function npmLogin() {
  const data = await npmFetch('tokens', 'POST', {
    identity: NPM_EMAIL,
    secret: NPM_PASSWORD
  });
  npmToken = data.token;
  return !!npmToken;
}

async function getProxyHosts() {
  return await npmFetch('nginx/proxy-hosts');
}

async function setHostEnabled(id, enabled) {
  const endpoint = `nginx/proxy-hosts/${id}/${enabled ? 'enable' : 'disable'}`;
  return await npmFetch(endpoint, 'POST');
}

async function toggleOnlineMode(enable) {
  const loggedIn = await npmLogin();
  if (!loggedIn) return { success: false, error: 'NPM login failed' };

  const hosts = await getProxyHosts();
  const results = [];

  for (const host of hosts) {
    if (host.domain_names.some(d => d.includes('layonet.org'))) {
      await setHostEnabled(host.id, enable);
      results.push(host.domain_names[0]);
    }
  }

  onlineMode = enable;
  toggleLog.unshift({
    time: new Date().toISOString(),
    action: enable ? 'ONLINE' : 'OFFLINE',
    hosts: results
  });
  if (toggleLog.length > 50) toggleLog.pop();

  return { success: true, affected: results };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ onlineMode, log: toggleLog }));
    return;
  }

  if (req.method === 'POST' && req.url === '/toggle') {
    const result = await toggleOnlineMode(!onlineMode);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ...result, onlineMode }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Toggle dashboard running on port ${PORT}`);
});
