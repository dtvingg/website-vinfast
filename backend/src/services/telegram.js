const net = require('net');
const tls = require('tls');

function sendTelegramMessage(botToken, chatId, text) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' });
    const httpRequest =
      `POST /bot${botToken}/sendMessage HTTP/1.1\r\n` +
      `Host: api.telegram.org\r\n` +
      `Content-Type: application/json\r\n` +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      `Connection: close\r\n\r\n` +
      body;

    const tcp = net.createConnection({ host: 'api.telegram.org', port: 443, family: 4 });
    tcp.setTimeout(12000);

    tcp.on('timeout', () => {
      tcp.destroy();
      reject(new Error('TCP timeout'));
    });

    tcp.on('error', reject);

    tcp.on('connect', () => {
      const tlsSock = tls.connect({ socket: tcp, servername: 'api.telegram.org', rejectUnauthorized: true });

      tlsSock.on('error', reject);

      tlsSock.on('secureConnect', () => {
        tlsSock.write(httpRequest);

        let raw = '';
        tlsSock.on('data', chunk => { raw += chunk.toString(); });
        tlsSock.on('end', () => {
          const bodyStart = raw.indexOf('\r\n\r\n');
          const jsonStr = bodyStart !== -1 ? raw.slice(bodyStart + 4) : raw;
          try { resolve(JSON.parse(jsonStr)); }
          catch { resolve({ ok: false, raw: jsonStr }); }
        });
      });
    });
  });
}

module.exports = { sendTelegramMessage };
