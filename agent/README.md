# GDA MIS Activity Agent — Setup Guide

## Step 1: Configure (once)
Open `agent.py` and update line:
  AGENT_API_KEY = "REPLACE_WITH_YOUR_AGENT_API_KEY"

Use the same value you set in Hostinger env vars as `AGENT_API_KEY`.

## Step 2: Build .exe (once, on any PC with Python)
```
pip install pyinstaller pynput requests pystray Pillow
pyinstaller --onefile --noconsole --name agent agent.py
```
The .exe will be in the `dist/` folder.

## Step 3: Add AGENT_API_KEY to Hostinger
Go to: Hostinger → Environment Variables → Add:
  Key:   AGENT_API_KEY
  Value: (any strong random string, min 16 chars)

## Step 4: Deploy to each PC (30 seconds per PC)
1. Copy `agent.exe` to the PC (USB / WhatsApp / shared folder)
2. Double-click agent.exe
3. Done! It auto-adds to Windows Startup.

## How it works
- Runs silently in system tray (green dot icon)
- Every 60s checks portal for who is logged in
- Tracks mouse + keyboard system-wide
- If inactive > threshold → sends report to admin portal
- Break time = never counted as inactive
- PC restart = auto-starts again
