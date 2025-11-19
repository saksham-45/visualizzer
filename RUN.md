# How to Run the Audio Visualizer

## ⚠️ Important: You Need a Local Server

Due to browser security (CORS), ES6 modules require a local server. You **cannot** just open `index.html` directly in your browser.

## Quick Start Options

### Option 1: Python Server (Easiest - Works on macOS, Linux, Windows)

1. Open Terminal/Command Prompt
2. Navigate to the project folder:
   ```bash
   cd /Users/divyarajsinhkarmariya/visualizerr
   ```
3. Run the Python server:
   ```bash
   python3 server.py
   ```
   Or if you have Python 2:
   ```bash
   python server.py
   ```

4. Your browser should open automatically, or go to: `http://localhost:8000/index.html`

5. Press `Ctrl+C` to stop the server when done

### Option 2: Node.js Server

1. Open Terminal/Command Prompt
2. Navigate to the project folder:
   ```bash
   cd /Users/divyarajsinhkarmariya/visualizerr
   ```
3. Run:
   ```bash
   node server.js
   ```

4. Your browser should open automatically, or go to: `http://localhost:8000/index.html`

### Option 3: Using npx (No Installation Needed)

If you have Node.js installed, you can use `npx`:

```bash
cd /Users/divyarajsinhkarmariya/visualizerr
npx http-server -p 8000 -o
```

### Option 4: VS Code Live Server

If you use VS Code:
1. Install the "Live Server" extension
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 5: Any Other HTTP Server

You can use any HTTP server that serves static files:
- `php -S localhost:8000` (if you have PHP)
- `ruby -run -e httpd . -p 8000` (if you have Ruby)
- Any other static file server

## Testing the Visualizer

1. **Start the server** using one of the options above
2. **Open the URL** in your browser (usually opens automatically)
3. **Click "Start"** button
4. **Grant microphone permissions** when prompted
5. **Make some noise** or play music near your microphone
6. **Watch the magic!** The visualizer should start responding to audio

## Troubleshooting

### "Module not found" or CORS errors
- Make sure you're using a server, not opening the file directly
- Check the browser console (F12) for specific errors

### "Microphone access denied"
- Make sure you clicked "Allow" when the browser asked for permission
- Check your browser settings for microphone permissions
- Try a different browser (Chrome usually works best)

### No audio visualization
- Make sure your microphone is working (test in another app)
- Check that the "Start" button is clicked and shows "Stop"
- Try speaking or making noise near the microphone
- Check browser console (F12) for errors

### Server won't start
- Make sure port 8000 is not in use by another application
- Try a different port by editing `server.py` or `server.js` (change `PORT = 8000` to another number like `8001`)

### System Audio not working
- System audio capture requires Chrome or Edge browser
- You need to select a tab/window when prompted
- Not all browsers support system audio capture

## Browser Compatibility

- ✅ **Chrome/Edge**: Full support (best for system audio)
- ✅ **Firefox**: Full support (microphone only)
- ✅ **Safari**: Full support (microphone only)

## Need Help?

Check the browser console (F12 → Console tab) for any error messages and share them if you need help debugging.

