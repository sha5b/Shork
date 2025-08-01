import http from 'http';
import { spawn } from 'child_process';
import chokidar from 'chokidar';
import WebSocket, { WebSocketServer } from 'ws';
import fs from 'fs-extra';
import path from 'path';
import config from '../../shork.config.js';
import chalk from 'chalk';
import Table from 'cli-table3';
import os from 'os';

// --- Create a WebSocket server for live reload ---
/**
 * Creates a new WebSocket server for live reload.
 * @type {WebSocket.Server}
 */
const wss = new WebSocketServer({ port: config.wsPort });

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
function logError(title, error) {
    console.log(chalk.red.bold(`\n🚨 ${title} 🚨`));
    if (error instanceof Error) {
        console.log(chalk.red(error.stack || error.message));
    } else {
        console.log(chalk.red(error));
    }
    console.log('');
}

function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            const { address, family, internal } = iface;
            if (family === 'IPv4' && !internal) {
                return address;
            }
        }
    }
    return '127.0.0.1'; // Fallback
}

// --- Function to run the build script ---
function runBuild() {
    return new Promise((resolve, reject) => {
        console.log('Running build script...');
        const buildProcess = spawn('node', ['scripts/core/build.js'], { stdio: 'inherit' });
        buildProcess.on('close', code => {
            if (code === 0) {
                console.log('Build completed successfully.');
                resolve();
            } else {
                logError('Build Script Error', new Error(`Build script exited with code ${code}`));
                reject(new Error(`Build failed with code ${code}`));
            }
        });
        buildProcess.on('error', err => {
            logError('Failed to start build script', err);
            reject(err);
        });
    });
}

// --- Create a simple HTTP server ---
const server = http.createServer(async (req, res) => {
    // API route handling
    if (req.url.startsWith('/api/')) {
        const apiRoute = req.url.substring(5).split('?')[0]; // Remove /api/ and query params
        const apiPath = path.join(config.apiDir, `${apiRoute}.js`);

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
            logError('API Error', error);
            res.writeHead(500).end(`Server error in API route: ${error.message}`);
        }
        return;
    }

    // Static file serving
    try {
        let filePath = path.join(config.distDir, req.url);

        // If the path is a directory, append index.html
        if (await fs.pathExists(filePath) && (await fs.stat(filePath)).isDirectory()) {
            filePath = path.join(filePath, 'index.html');
        }

        // Check if the file exists
        if (!(await fs.pathExists(filePath))) {
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
        logError('Server Error', err);
        res.writeHead(500).end(`Server error: ${err.message}`);
    }
});

function injectLiveReloadScript(html) {
    const script = `
        <script>
            const ws = new WebSocket('ws://localhost:${config.wsPort}');
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
    const watcher = chokidar.watch([config.srcDir, config.staticDir], {
        ignored: [/(^|[\\/])\../, config.apiClient],
        persistent: true,
        ignoreInitial: true
    }).on('all', (event, filePath) => {
        const relativePath = path.relative(process.cwd(), filePath);
        let eventMessage = '';

        switch (event) {
            case 'add':
                eventMessage = chalk.green(`File created: ${relativePath}`);
                break;
            case 'change':
                eventMessage = chalk.yellow(`File changed: ${relativePath}`);
                break;
            case 'unlink':
                eventMessage = chalk.red(`File deleted: ${relativePath}`);
                break;
            default:
                return; // Ignore addDir, unlinkDir, etc.
        }

        console.log(`\n${eventMessage}`);

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            console.log(chalk.blue('Rebuilding due to changes...'));
            try {
                await runBuild();
                sendReload();
            } catch (error) {
                logError('Rebuild Failed', error);
            }
        }, 100);
    });
}

// --- Start the server ---
async function startDevServer() {
    try {
        await runBuild();
        server.listen(config.devPort, () => {
            const localIp = getLocalIpAddress();
            const table = new Table({
                head: [chalk.cyan('Shork Development Server'), chalk.cyan('Details')],
                colWidths: [25, 50],
                style: { 'padding-left': 1, 'padding-right': 1, head: ['cyan'], border: ['grey'] }
            });

            table.push(
                ['Status', chalk.green('Running')],
                ['Local', `http://localhost:${config.devPort}`],
                ['Network', `http://${localIp}:${config.devPort}`],
                ['Live Reload', `ws://localhost:${config.wsPort}`],
                ['Watching Files', chalk.yellow('Enabled')]
            );

            console.log(table.toString());
            console.log(chalk.gray('\nWatching for file changes... Press Ctrl+C to stop.'));

            watchFiles();
        });
    } catch (error) {
        logError('Could not start development server', error);
    }
}

startDevServer();
