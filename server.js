const fs = require('fs');
const fsp = require('fs').promises; // Using the promises-based API
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const LOG_FILE_PATH = path.resolve(__dirname, './test.log');
const PORT = 8080;
const INITIAL_LINES = 15;
const LOG_GENERATION_INTERVAL = 1900; // Generate a new log every 3 seconds



//! http server
const server = http.createServer((req, res) => {
    const clientHtmlPath = path.resolve(__dirname, 'index.html');
    fs.readFile(clientHtmlPath, (err, data) => {
        if (err) {
            console.error('Error loading index.html:', err);
            res.writeHead(500);
            res.end('Error loading index.html');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
    });
});

//! client side server
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', async (ws) => {
    console.log('Client connected');
    clients.add(ws);

    try {
        const lines = await readLastNLines(LOG_FILE_PATH, INITIAL_LINES);
        ws.send(lines.join('\n') + '\n');
    } catch (err) {
        console.error(`Error reading initial lines from ${LOG_FILE_PATH}:`, err.message);
        ws.send(`--- Error: Could not read log file. Ensure '${LOG_FILE_PATH}' exists. ---`);
    }

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

function broadcast(message) {
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

//! readLines function
async function readLastNLines(filePath, n) {
    let filehandle;
    try {
        filehandle = await fsp.open(filePath, 'r');
        const { size } = await filehandle.stat();
        let position = size;
        let buffer = Buffer.alloc(1024 * 8);
        let lines = [];
        let lineCount = 0;
        while (position > 0 && lineCount <= n) {
            const readLength = Math.min(position, buffer.length);
            position -= readLength;
            const { bytesRead } = await filehandle.read(buffer, 0, readLength, position);
            const chunk = buffer.toString('utf8', 0, bytesRead);
            const chunkLines = chunk.split('\n');
            lines = chunkLines.concat(lines);
            lineCount += chunkLines.length - 1;
        }
        const finalLines = lines.filter(line => line.length > 0);
        return finalLines.slice(-n);
    } finally {
        if (filehandle) await filehandle.close();
    }
}


//! file tracker
if (!fs.existsSync(LOG_FILE_PATH)) {
    console.warn(`Warning: Log file not found at ${LOG_FILE_PATH}.`);
}

let lastKnownSize = fs.statSync(LOG_FILE_PATH).size;
const watcher = fs.watch(LOG_FILE_PATH, (eventType) => {
    if (eventType === 'change') {
        fs.stat(LOG_FILE_PATH, (err, stats) => {
            if (err) {
                lastKnownSize = 0;
                return;
            }
            const currentSize = stats.size;
            if (currentSize > lastKnownSize) {
                const stream = fs.createReadStream(LOG_FILE_PATH, { start: lastKnownSize, end: currentSize, encoding: 'utf8' });
                stream.on('data', (chunk) => {
                    broadcast(chunk);
                });
                stream.on('end', () => { lastKnownSize = currentSize; });
            } else if (currentSize < lastKnownSize) {
                lastKnownSize = currentSize;
                broadcast('\n--- Log file was truncated. ---\n');
            }
        });
    }
});
watcher.on('error', (err) => console.error('Watcher Error:', err));


//? log generator
const MOCK_LOG_MESSAGES = [
    'INFO: User authenticated successfully. UserID: usr_12345',
    'INFO: Processing transaction batch #5821.',
    'WARN: High memory usage detected: 92%.',
    'INFO: Database connection established.',
    'ERROR: Failed to connect to external API: service timeout.',
    'INFO: Cache cleared successfully.',
    'DEBUG: Request received on /api/v1/data.',
];

setInterval(() => {
    const message = MOCK_LOG_MESSAGES[Math.floor(Math.random() * MOCK_LOG_MESSAGES.length)];
    const timestamp = new Date();
    const logLine = `${timestamp} - ${message}\n`;

    fs.appendFile(LOG_FILE_PATH, logLine, (err) => {
        if (err) console.error('Error writing to log file:', err);
    });
}, LOG_GENERATION_INTERVAL);



//! server start
server.listen(PORT, () => {
    console.log(`Server is listening on http://localhost:${PORT}`);
    console.log(`Watching for changes in ${LOG_FILE_PATH}`);
    console.log(`Generating a new log entry every ${LOG_GENERATION_INTERVAL / 1000} seconds.`);
});