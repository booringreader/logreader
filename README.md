# Real-Time Log Viewer

A simple, dependency-light solution for monitoring server logs in real-time directly through a web browser. It uses **Node.js** and **WebSockets** to mimic the functionality of `tail -f` without requiring external client tools.

## Project Structure

```
root/
├── index.html 
├── server.js
├── test.log
└── README.md
```

## Requirements

  * **Node.js** (v14 or later recommended)
  * The `ws` package (WebSocket library).

### Installation
Install the required WebSocket package:

```bash
npm install ws
```
-----

## Usage

### 1\. Start the Server
Run the main backend file:
```bash
node server.js
```
### 2\. View Real-Time Logs

Open the web browser and navigate to:
```
http://localhost:8080
```
-----

## How It Works
1.  **Client Connects:** The browser loads `index.html` and initiates a WebSocket connection to the server.
2.  **Initial Data:** `server.js` reads the last 15 lines of `test.log` and sends them to the client.
3.  **File Watcher:** The `fs.watch` module monitors `test.log` for changes.
4.  **Live Stream:** When data is appended, the server reads only the new content and **broadcasts** it to all clients via the WebSocket connection.

-----

## Configuration
All configuration constants are located at the top of `server.js`:

| Constant | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8080` | The port for the HTTP and WebSocket server. |
| `LOG_FILE_PATH` | `./test.log` | The path to the log file to monitor. |
| `INITIAL_LINES` | `15` | The number of log lines to show on initial client connect. |

### Disabling the Mock Log Generator

To monitor a **real** log file instead of the mock one, comment out the `setInterval` call near the end of `server.js`:

```javascript
// Comment out this line to disable the mock generator:
// setInterval(() => { ... }, LOG_GENERATION_INTERVAL);
```

-----

## Notes

  * Attempting to open `index.html` directly (using `file://`) will **not work**, as WebSockets require a running HTTP server context.
  * The target log file (`test.log` by default) is created automatically if it doesn't exist.
