import http from 'http';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {string} */
const distDir = path.resolve(__dirname, '../dist');
const srcDir = path.resolve(__dirname, '../src');
const staticDir = path.resolve(__dirname, '../static');

const PORT = 8080;
const WS_PORT = 8081;

// --- Create a WebSocket server for live reload ---
/**
 * Creates a new WebSocket server for live reload.
 * @type {WebSocket.Server}
 */
const wss = new WebSocketServer({ port: WS_PORT });

/**
 * Handles new WebSocket connections.
 * @param {WebSocket} ws - The new WebSocket connection.
 */
wss.on('connection', ws => console.log('Client connected for live reload'));

/**
 * Sends a reload message to all connected clients.
 */
function sendReload() {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) client.send('reload');
    });
}

// --- Function to run the build script ---
function runBuild() {
    return new Promise((resolve, reject) => {
        console.log('Running build script...');
        const buildProcess = spawn('node', ['scripts/build.js'], { stdio: 'inherit' });
        buildProcess.on('close', code => {
            if (code === 0) {
                console.log('Build completed successfully.');
                resolve();
            } else {
                console.error(`Build script exited with code ${code}`);
                reject(new Error(`Build failed with code ${code}`));
            }
        });
        buildProcess.on('error', err => {
            console.error('Failed to start build script:', err);
            reject(err);
        });
    });
}

// --- Create a simple HTTP server ---
const server = http.createServer(async (req, res) => {
    // API route handling
    if (req.url.startsWith('/api/')) {
        const apiRoute = req.url.substring(5).split('?')[0]; // Remove /api/ and query params
        const apiPath = path.join(__dirname, '../src/api', `${apiRoute}.js`);

        try {
            if (await fs.pathExists(apiPath)) {
                // Use dynamic import() for ES modules. Add a cache-busting query param.
                const module = await import(`${apiPath}?v=${Date.now()}`);
                const handler = module.default;

                if (typeof handler === 'function') {
                    handler(req, res);
                } else {
                    res.writeHead(500).end(`Error: No default export function found in ${apiPath}`);
                }
            } else {
                res.writeHead(404).end('API route not found');
            }
        } catch (error) {
            console.error(`API Error: ${error}`);
            res.writeHead(500).end(`Server error in API route: ${error.message}`);
        }
        return;
    }

    // Static file serving
    try {
        let filePath = path.join(distDir, req.url);

        // If the URL ends with a slash, it's a directory; append index.html
        if (req.url.endsWith('/')) {
            filePath = path.join(filePath, 'index.html');
        }

        // Check if the file exists
        if (!(await fs.pathExists(filePath))) {
            // If it doesn't exist, and the original URL didn't have a slash,
            // it might be a directory access without the slash. Redirect.
            const dirPath = path.join(distDir, req.url);
            if (await fs.pathExists(dirPath) && (await fs.stat(dirPath)).isDirectory()) {
                res.writeHead(301, { 'Location': req.url + '/' });
                return res.end();
            }

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end(`Not Found: ${req.url}`);
        }

        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath);
        const mimeTypes = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.css': 'text/css',
        };
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });

        if (ext === '.html') {
            res.end(injectLiveReloadScript(content.toString()));
        } else {
            res.end(content);
        }
    } catch (err) {
        console.error(`Server Error: ${err}`);
        res.writeHead(500).end(`Server error: ${err.message}`);
    }
});

function injectLiveReloadScript(html) {
    const script = `
        <script>
            const ws = new WebSocket('ws://localhost:${WS_PORT}');
            ws.onmessage = (event) => {
                if (event.data === 'reload') window.location.reload();
            };
        </script>
    `;
    return html.replace('</body>', script + '</body>');
}

// --- Watch for file changes ---
let debounceTimer;
function watchFiles() {
    chokidar.watch([srcDir, staticDir], { ignored: /(^|[\\/])\../, persistent: true }).on('all', (event, filePath) => {
        console.log(`\n${event} detected in ${path.relative(process.cwd(), filePath)}.`);
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.log('Change detected. Rebuilding...');
            try {
                await runBuild();
                sendReload();
            } catch (error) {
                console.error('Rebuild failed:', error);
            }
        }, 100);
    });
}

// --- Start the server ---
async function startDevServer() {
    try {
        await runBuild();
        server.listen(PORT, () => {
            console.log(`\nServer running at http://localhost:${PORT}`);
            console.log('Watching for file changes...');
            watchFiles();
        });
    } catch (error) {
        console.error('Could not start development server:', error);
    }
}

startDevServer();
