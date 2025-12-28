#!/usr/bin/env node
/**
 * Chrome DevTools Protocol Helper Script
 *
 * Connects to Chrome running with --remote-debugging-port=9222
 * Provides debugging capabilities without MCP overhead.
 *
 * Usage:
 *   node scripts/chrome-debug.js <command> [options]
 *
 * Commands:
 *   tabs                    - List all open tabs
 *   screenshot [filename]   - Take screenshot (default: screenshot.png)
 *   html                    - Get page HTML
 *   console                 - Get console logs (waits 5s for logs)
 *   eval <expression>       - Evaluate JavaScript in page context
 *   navigate <url>          - Navigate to URL
 *   info                    - Get page info (title, URL, metrics)
 *
 * Start Chrome with: chrome --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome-debug
 */

const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 9222;

// Helper to make HTTP requests to CDP
function cdpRequest(endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}${endpoint}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

// Helper to send CDP commands via WebSocket
async function cdpCommand(wsUrl, method, params = {}) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const id = 1;
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        ws.close();
        reject(new Error('Timeout'));
      }
    }, 30000);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id, method, params }));
    });

    ws.on('message', (data) => {
      const response = JSON.parse(data.toString());
      if (response.id === id && !settled) {
        settled = true;
        clearTimeout(timeoutId);
        ws.close();
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      }
    });

    ws.on('error', (err) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeoutId);
        reject(err);
      }
    });
  });
}

// Get the first localhost:3000 tab, or first available tab
async function getTargetTab() {
  const tabs = await cdpRequest('/json');
  const localTab = tabs.find(t => t.type === 'page' && t.url.includes('localhost:3000'));
  return localTab || tabs.find(t => t.type === 'page');
}

// Commands
const commands = {
  async tabs() {
    const tabs = await cdpRequest('/json');
    console.log('\n=== Open Tabs ===\n');
    tabs.filter(t => t.type === 'page').forEach((tab, i) => {
      console.log(`[${i + 1}] ${tab.title}`);
      console.log(`    URL: ${tab.url}`);
      console.log(`    ID: ${tab.id}\n`);
    });
  },

  async screenshot(filename = 'screenshot.png') {
    const tab = await getTargetTab();
    if (!tab) throw new Error('No tab found');

    console.log(`Taking screenshot of: ${tab.title}`);
    const result = await cdpCommand(tab.webSocketDebuggerUrl, 'Page.captureScreenshot', {
      format: 'png'
    });

    const filepath = path.resolve(filename);
    fs.writeFileSync(filepath, Buffer.from(result.data, 'base64'));
    console.log(`Screenshot saved: ${filepath}`);
  },

  async html() {
    const tab = await getTargetTab();
    if (!tab) throw new Error('No tab found');

    console.log(`Getting HTML from: ${tab.title}\n`);

    // Get document root
    const doc = await cdpCommand(tab.webSocketDebuggerUrl, 'DOM.getDocument', { depth: -1 });
    const html = await cdpCommand(tab.webSocketDebuggerUrl, 'DOM.getOuterHTML', {
      nodeId: doc.root.nodeId
    });

    console.log(html.outerHTML);
  },

  async console() {
    const tab = await getTargetTab();
    if (!tab) throw new Error('No tab found');

    console.log(`Capturing console logs from: ${tab.title}`);
    console.log('Listening for 5 seconds...\n');

    return new Promise((resolve) => {
      const ws = new WebSocket(tab.webSocketDebuggerUrl);
      const logs = [];

      ws.on('open', () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());

        if (msg.method === 'Runtime.consoleAPICalled') {
          const args = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
          const type = msg.params.type.toUpperCase();
          logs.push(`[${type}] ${args}`);
          console.log(`[${type}] ${args}`);
        }

        if (msg.method === 'Log.entryAdded') {
          const entry = msg.params.entry;
          logs.push(`[${entry.level.toUpperCase()}] ${entry.text}`);
          console.log(`[${entry.level.toUpperCase()}] ${entry.text}`);
        }
      });

      setTimeout(() => {
        ws.close();
        if (logs.length === 0) {
          console.log('(No console logs captured)');
        }
        resolve();
      }, 5000);
    });
  },

  async eval(expression) {
    const tab = await getTargetTab();
    if (!tab) throw new Error('No tab found');

    console.log(`Evaluating in: ${tab.title}\n`);

    const result = await cdpCommand(tab.webSocketDebuggerUrl, 'Runtime.evaluate', {
      expression,
      returnByValue: true
    });

    if (result.exceptionDetails) {
      console.error('Error:', result.exceptionDetails.text);
    } else {
      console.log('Result:', JSON.stringify(result.result.value, null, 2));
    }
  },

  async navigate(url) {
    if (!url) throw new Error('URL required');

    // Ensure URL has protocol
    if (!url.startsWith('http')) {
      url = 'http://' + url;
    }

    const tab = await getTargetTab();
    if (!tab) {
      // Open new tab - URL encode to handle special characters
      await cdpRequest(`/json/new?${encodeURIComponent(url)}`);
      console.log(`Opened new tab: ${url}`);
    } else {
      await cdpCommand(tab.webSocketDebuggerUrl, 'Page.navigate', { url });
      console.log(`Navigated to: ${url}`);
    }
  },

  async info() {
    const tab = await getTargetTab();
    if (!tab) throw new Error('No tab found');

    console.log('\n=== Page Info ===\n');
    console.log(`Title: ${tab.title}`);
    console.log(`URL: ${tab.url}`);
    console.log(`ID: ${tab.id}`);

    try {
      const metrics = await cdpCommand(tab.webSocketDebuggerUrl, 'Performance.getMetrics');
      console.log('\n=== Performance Metrics ===\n');
      metrics.metrics.forEach(m => {
        if (['JSHeapUsedSize', 'JSHeapTotalSize', 'Documents', 'Nodes', 'LayoutCount'].includes(m.name)) {
          const value = m.name.includes('Size') ? `${(m.value / 1024 / 1024).toFixed(2)} MB` : m.value;
          console.log(`${m.name}: ${value}`);
        }
      });
    } catch (e) {
      // Performance API might not be available
    }
  }
};

// Main
async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help' || command === '--help') {
    console.log(`
Chrome DevTools Protocol Helper

Usage: node scripts/chrome-debug.js <command> [options]

Commands:
  tabs                    List all open tabs
  screenshot [filename]   Take screenshot (default: screenshot.png)
  html                    Get page HTML
  console                 Get console logs (waits 5s)
  eval <expression>       Evaluate JavaScript in page
  navigate <url>          Navigate to URL
  info                    Get page info and metrics

Prerequisites:
  Start Chrome with debugging enabled:
  chrome --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome-debug http://localhost:3000
`);
    return;
  }

  // Check if Chrome is accessible
  try {
    await cdpRequest('/json/version');
  } catch (e) {
    console.error('Error: Cannot connect to Chrome on port 9222');
    console.error('Start Chrome with: chrome --remote-debugging-port=9222 --user-data-dir=C:/temp/chrome-debug');
    process.exit(1);
  }

  if (!commands[command]) {
    console.error(`Unknown command: ${command}`);
    console.error('Run with --help for usage');
    process.exit(1);
  }

  try {
    await commands[command](...args);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
