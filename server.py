#!/usr/bin/env python3
"""
Simple HTTP server for running the visualizer
Run with: python3 server.py
"""
import http.server
import socketserver
import webbrowser
import os
import socket

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for ES modules
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Suppress default logging
        pass

def find_free_port(start_port=8000, max_attempts=10):
    """Find a free port starting from start_port"""
    for i in range(max_attempts):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Try to use the default port, or find a free one
    port = find_free_port(PORT)
    if port is None:
        print("Error: Could not find an available port")
        return
    
    if port != PORT:
        print(f"⚠️  Port {PORT} is in use, using port {port} instead")
    
    try:
        with socketserver.TCPServer(("", port), MyHTTPRequestHandler) as httpd:
            url = f"http://localhost:{port}/index.html"
            print("=" * 60)
            print("🎵 Audio Visualizer Server")
            print("=" * 60)
            print(f"\nServer running at: {url}")
            print("\nPress Ctrl+C to stop the server")
            print("=" * 60)
            
            # Try to open browser automatically
            try:
                webbrowser.open(url)
            except:
                pass
            
            try:
                httpd.serve_forever()
            except KeyboardInterrupt:
                print("\n\nServer stopped.")
    except OSError as e:
        print(f"\n❌ Error starting server: {e}")
        print(f"\n💡 Try killing the process using port {port}:")
        print(f"   lsof -ti:{port} | xargs kill -9")

if __name__ == "__main__":
    main()

