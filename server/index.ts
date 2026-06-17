import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { GameRoom } from './room';

// Authoritative game server. Serves the built client and runs the game over
// Socket.IO. Host/port/CORS are all env-configurable so the same server works
// unchanged on the LAN today and behind a tunnel (Cloudflare/ngrok/Tailscale)
// later — Phase 3 is then just "point a tunnel at it", no code change.

const HOST = process.env.HOST ?? '0.0.0.0';
const PORT = Number(process.env.PORT) || 5174;
// Comma-separated allowlist, or "*" (default) to accept any origin — handy for
// LAN/tunnel testing. Tighten this when exposing the server publicly.
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const corsOrigin = CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

if (!existsSync(path.join(distDir, 'index.html'))) {
    console.error(`No client build found at ${distDir}. Run "npm run build" first.`);
    process.exit(1);
}

// Serve index.html with a flag so the client picks RemoteTransport. The
// packaged Electron app loads the same build from disk (without this flag) and
// stays single-player.
const indexHtml = readFileSync(path.join(distDir, 'index.html'), 'utf8')
    .replace('<head>', '<head>\n    <script>window.__MAHJONG_REMOTE__ = true;</script>');

const app = express();
const sendApp = (_req: express.Request, res: express.Response) =>
    res.type('html').send(indexHtml);

app.get('/', sendApp);
app.use(express.static(distDir));
app.use(sendApp); // SPA fallback: any unmatched route returns the app

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin } });

const room = new GameRoom(io);
io.on('connection', (socket) => room.handleConnection(socket));

httpServer.listen(PORT, HOST, () => {
    console.log(`American Mah Jong server listening on ${HOST}:${PORT}`);
    for (const url of lanUrls(PORT)) console.log(`  Players on your wifi: ${url}`);
});

// Best-effort list of LAN URLs to share with players on the same network.
function lanUrls(port: number): string[] {
    const urls: string[] = [];
    for (const addrs of Object.values(networkInterfaces())) {
        for (const addr of addrs ?? []) {
            if (addr.family === 'IPv4' && !addr.internal) urls.push(`http://${addr.address}:${port}`);
        }
    }
    return urls;
}
