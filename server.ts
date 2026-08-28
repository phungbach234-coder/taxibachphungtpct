import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import webpush from "web-push";
import fs from "fs";
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();
const PORT = 3000;
app.use(express.json());

let vapidKeys: { publicKey: string, privateKey: string };
const vapidPath = path.join(process.cwd(), 'vapid.json');
try {
  if (fs.existsSync(vapidPath)) {
    vapidKeys = JSON.parse(fs.readFileSync(vapidPath, 'utf8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidPath, JSON.stringify(vapidKeys));
  }
} catch (e) {
  vapidKeys = webpush.generateVAPIDKeys();
}

webpush.setVapidDetails(
  'mailto:contact@taxibachphungct.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const subscriptions: any[] = [];

app.get('/api/vapid-public-key', (req, res) => res.send(vapidKeys.publicKey));

app.get('/api/app-frame', async (req, res) => {
  try {
    const response = await fetch('https://taxibachphungct.netlify.app');
    let html = await response.text();
    // Đánh lừa React Router của trang Taxi gốc để nó không bị lỗi Not Found
    const fixScript = `<script>window.history.replaceState(null, '', '/');</script>`;
    html = html.replace('<head>', '<head>' + fixScript);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    res.status(500).send('Error');
  }
});

// Chuyển hướng dữ liệu ngầm cho trang Taxi
app.use(['/assets', '/favicon.ico'], createProxyMiddleware({
  target: 'https://taxibachphungct.netlify.app',
  changeOrigin: true,
  on: {
    proxyRes: (proxyRes) => {
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    }
  }
}));

app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscriptions.find(sub => sub.endpoint === subscription.endpoint)) {
    subscriptions.push(subscription);
  }
  res.status(201).json({});
});

app.post('/api/send-notification', (req, res) => {
  const payload = {
    notification: {
      title: 'Taxi Bách Phụng',
      body: req.body.message || 'Có thông báo mới!',
      icon: 'https://taxibachphungct.netlify.app/favicon.ico',
      vibrate: [100, 50, 100],
      data: { url: 'https://taxibachphungct.netlify.app' }
    }
  };
  Promise.all(subscriptions.map(sub => webpush.sendNotification(sub, JSON.stringify(payload)).catch(()=>{})))
    .then(() => res.status(200).json({ message: 'OK' }));
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.accepts('html')) res.sendFile(path.join(distPath, 'index.html'));
      else next();
    });
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Running on ${PORT}`));
}
startServer();
