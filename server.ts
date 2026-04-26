import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://localhost:4173',
]);

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  next();
});

// GET /api/scrape  — SSE stream of npm run scrape:2026
app.get('/api/scrape', (_req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  const proc = spawn('npm', ['run', 'scrape:2026'], {
    cwd: __dirname,
    shell: true,
  });

  proc.stdout.on('data', (d: Buffer) => {
    const text = d.toString().trimEnd();
    if (text) send({ type: 'log', text });
  });
  proc.stderr.on('data', (d: Buffer) => {
    const text = d.toString().trimEnd();
    if (text) send({ type: 'log', text });
  });
  proc.on('close', code => {
    send({ type: 'done', ok: code === 0, code });
    res.end();
  });

  res.on('close', () => proc.kill());
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Scrape server → http://localhost:${PORT}`));
