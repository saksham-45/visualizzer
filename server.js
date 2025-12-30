#!/usr/bin/env node
/**
 * Simple HTTP server for running the visualizer
 * Run with: node server.js
 * Or: npx http-server (if you have http-server installed)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    // Parse URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, HOST, () => {
    console.log('='.repeat(60));
    console.log('Audio Visualizer Server');
    console.log('='.repeat(60));
    console.log(`\nLocal Access: http://localhost:${PORT}`);
    console.log(`Network Access: http://${HOST}:${PORT}`);
    console.log('\nNOTE: For Microphone access to work, please use "localhost"');
    console.log('      or serve via HTTPS.');
    console.log('\nPress Ctrl+C to stop the server');
    console.log('='.repeat(60));
});

