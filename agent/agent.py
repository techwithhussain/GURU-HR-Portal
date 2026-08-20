"""
GDA MIS Activity Agent v3.0
============================
Enterprise employee activity tracking for shared PCs with multiple shifts.

Architecture:
  - Local HTTP server (port 47800): serves PC hostname to HR Portal login page
  - Heartbeat thread: polls /api/agent/heartbeat every 30s
    -> Gets current employee from HR Portal session (login/logout driven)
    -> Detects shift changes automatically
  - Activity listeners: global mouse + keyboard via pynput (OS-wide)
  - Idle detection: reports to /api/agent/report when idle >= threshold
  - System tray: shows current employee + status

What changed from v2:
  - REMOVED: Windows username matching (unreliable)
  - REMOVED: PC assignment config (manual, breaks on shift change)
  - ADDED: Local HTTP server for pcName delivery to login page
  - ADDED: Heartbeat endpoint (vs old session poll)
  - ADDED: Automatic employee switch detection
  - ADDED: Better idle reset on employee change

Build:
  pip install pyinstaller pynput requests pystray Pillow
  pyinstaller --onefile --noconsole --name GDA-Agent-v3 agent.py

Deploy:
  Copy GDA-Agent-v3.exe to each PC -> double-click -> Done!
  Agent registers itself in Windows startup automatically.
"""
import sys, os, time, socket, logging, threading, winreg, datetime, json
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

import requests
from pynput import mouse, keyboard
import pystray
from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# CONFIG — update PORTAL_URL and AGENT_API_KEY before building .exe
# ---------------------------------------------------------------------------
PORTAL_URL      = "https://mis.gurudigitaladvertising.com"
AGENT_API_KEY   = "gda-agent-key-2026-secure"
HEARTBEAT_SECS  = 30    # how often to poll portal for session info
CHECK_SECS      = 10    # how often to check idle threshold
LOCAL_PORT      = 47800  # local HTTP server — serves pcName to login page
STARTUP_NAME    = "GDA-MIS-Agent"
LOG_FILE        = r"C:\GDA-Agent\agent.log"
AGENT_VERSION   = "3.0"
# ---------------------------------------------------------------------------

# Ensure log directory exists
Path(LOG_FILE).parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global state — protected by _lock
# ---------------------------------------------------------------------------
_last_activity  : float = time.time()
_lock           = threading.Lock()
_emp_id         : str | None = None
_on_break       : bool = False
_threshold_min  : int = 20
_emp_name       : str = "No session"  # for tray display
_tray_icon      : pystray.Icon | None = None

def _now_iso() -> str:
    return datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

def _pc() -> str:
    return socket.gethostname()

# ---------------------------------------------------------------------------
# Activity listeners — global OS-wide mouse + keyboard (pynput)
# These work regardless of which application is focused.
# We only update the timestamp, never capture what was typed/clicked.
# ---------------------------------------------------------------------------
def _on_activity(*_):
    global _last_activity
    with _lock:
        _last_activity = time.time()

def start_listeners():
    mouse.Listener(on_move=_on_activity, on_click=_on_activity, on_scroll=_on_activity).start()
    keyboard.Listener(on_press=_on_activity).start()
    log.info("Global activity listeners started.")

# ---------------------------------------------------------------------------
# Local HTTP server — serves PC hostname to HR Portal login page
# Only accepts connections from localhost (127.0.0.1).
# ---------------------------------------------------------------------------
class PcNameHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/pcname":
            payload = json.dumps({"pcName": _pc()}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")  # login page needs CORS
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        # CORS preflight
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def log_message(self, *_):
        pass  # suppress noisy HTTP access logs

def start_local_server():
    def run():
        server = HTTPServer(("127.0.0.1", LOCAL_PORT), PcNameHandler)
        log.info(f"Local server started on 127.0.0.1:{LOCAL_PORT}")
        server.serve_forever()
    t = threading.Thread(target=run, daemon=True)
    t.start()

# ---------------------------------------------------------------------------
# Portal API calls
# ---------------------------------------------------------------------------
HEADERS = {"x-agent-api-key": AGENT_API_KEY, "Content-Type": "application/json"}

def fetch_heartbeat() -> dict:
    """Poll /api/agent/heartbeat — get current employee + update lastHeartbeatAt."""
    try:
        r = requests.get(
            f"{PORTAL_URL}/api/agent/heartbeat",
            params={"pc": _pc(), "v": AGENT_VERSION},
            headers=HEADERS,
            timeout=10,
        )
        if r.status_code == 200:
            return r.json()
        log.warning(f"heartbeat: HTTP {r.status_code}")
    except Exception as e:
        log.warning(f"heartbeat error: {e}")
    return {"employeeId": None, "onBreak": False, "thresholdMinutes": 20}


def report_inactive(emp_id: str, from_iso: str, to_iso: str, mins: int):
    """Send inactivity report to portal."""
    try:
        r = requests.post(
            f"{PORTAL_URL}/api/agent/report",
            json={"employeeId": emp_id, "pcName": _pc(),
                  "inactiveFrom": from_iso, "inactiveTo": to_iso, "durationMin": mins},
            headers=HEADERS,
            timeout=10,
        )
        log.info(f"Reported inactive: emp={emp_id} {mins}min -> HTTP {r.status_code}")
    except Exception as e:
        log.warning(f"report_inactive error: {e}")

# ---------------------------------------------------------------------------
# Heartbeat thread — polls portal, detects employee changes (shift switch)
# ---------------------------------------------------------------------------
def heartbeat_thread():
    global _emp_id, _on_break, _threshold_min, _emp_name, _last_activity, _tray_icon

    while True:
        data = fetch_heartbeat()
        new_emp_id      = data.get("employeeId")
        new_on_break    = data.get("onBreak", False)
        new_threshold   = data.get("thresholdMinutes", 20)

        with _lock:
            prev_emp = _emp_id
            _emp_id        = new_emp_id
            _on_break      = new_on_break
            _threshold_min = new_threshold

            if new_emp_id != prev_emp:
                # Employee changed (shift switch or login/logout)
                # Reset idle timer so new employee gets a clean slate
                _last_activity = time.time()
                if new_emp_id:
                    log.info(f"Employee session started: {new_emp_id} on {_pc()}")
                    _emp_name = new_emp_id  # Will be updated with name if portal returns it
                else:
                    log.info(f"No active session on {_pc()} — waiting for login.")
                    _emp_name = "No session"
                _update_tray()

        time.sleep(HEARTBEAT_SECS)


def _update_tray():
    """Update system tray icon and tooltip."""
    if _tray_icon is None:
        return
    with _lock:
        emp = _emp_id
        name = _emp_name

    if emp:
        _tray_icon.icon = _make_icon(green=True)
        _tray_icon.title = f"GDA MIS — {name} (Active)"
    else:
        _tray_icon.icon = _make_icon(green=False)
        _tray_icon.title = "GDA MIS — No session"


# ---------------------------------------------------------------------------
# Idle detection thread — checks if employee has been idle past threshold
# ---------------------------------------------------------------------------
def idle_thread():
    global _last_activity

    reported_from: str | None = None
    last_emp: str | None = None

    while True:
        time.sleep(CHECK_SECS)

        with _lock:
            emp  = _emp_id
            brk  = _on_break
            thr  = _threshold_min
            idle = time.time() - _last_activity

        # Reset if no employee or employee changed
        if not emp or emp != last_emp:
            reported_from = None
            last_emp = emp
            continue

        # No reporting during breaks
        if brk:
            reported_from = None
            continue

        idle_min = idle / 60.0

        if idle_min >= thr:
            # Employee is idle
            if reported_from is None:
                # First time hitting threshold — record start of idle period
                t = datetime.datetime.utcnow() - datetime.timedelta(minutes=thr)
                reported_from = t.strftime("%Y-%m-%dT%H:%M:%SZ")

            report_inactive(emp, reported_from, _now_iso(), max(1, int(idle_min)))

            # Update tray to show idle
            if _tray_icon:
                _tray_icon.title = f"GDA MIS — Idle ({int(idle_min)}m)"

            # Wait for threshold period before reporting again
            time.sleep(thr * 60)
            reported_from = None

        else:
            # Employee is active
            if reported_from is not None:
                # Was idle, now active again
                log.info(f"Employee active again: {emp}")
                _update_tray()
            reported_from = None

# ---------------------------------------------------------------------------
# Windows startup registration
# ---------------------------------------------------------------------------
def install_startup():
    try:
        k = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(k, STARTUP_NAME, 0, winreg.REG_SZ, f'"{sys.executable}"')
        winreg.CloseKey(k)
        log.info("Startup entry registered.")
    except Exception as e:
        log.warning(f"Startup registration failed: {e}")

def is_in_startup() -> bool:
    try:
        k = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0, winreg.KEY_READ,
        )
        winreg.QueryValueEx(k, STARTUP_NAME)
        winreg.CloseKey(k)
        return True
    except:
        return False

# ---------------------------------------------------------------------------
# System tray icon
# ---------------------------------------------------------------------------
def _make_icon(green: bool = True) -> Image.Image:
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    color = (52, 199, 89) if green else (142, 142, 147)
    ImageDraw.Draw(img).ellipse([8, 8, 56, 56], fill=color)
    return img

def _exit(icon, _):
    log.info("Agent exiting by user request.")
    icon.stop()
    os._exit(0)

# ---------------------------------------------------------------------------
# Single-instance lock — prevents multiple copies
# ---------------------------------------------------------------------------
def acquire_instance_lock():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 0)
        s.bind(("127.0.0.1", 47799))  # reserved port for instance lock
        return s
    except OSError:
        return None

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    lock = acquire_instance_lock()
    if lock is None:
        log.info("Another instance is already running. Exiting.")
        sys.exit(0)

    log.info(f"=== GDA Agent v{AGENT_VERSION} starting | PC={_pc()} ===")

    if not is_in_startup():
        install_startup()

    start_listeners()
    start_local_server()

    threading.Thread(target=heartbeat_thread, daemon=True).start()
    threading.Thread(target=idle_thread, daemon=True).start()

    # System tray
    icon = pystray.Icon(
        "GDA Agent",
        _make_icon(green=False),
        "GDA MIS Agent v3 — Starting...",
        pystray.Menu(
            pystray.MenuItem(f"GDA MIS Agent v{AGENT_VERSION}", None, enabled=False),
            pystray.MenuItem(f"PC: {_pc()}", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Exit", _exit),
        ),
    )
    _tray_icon = icon
    log.info("Agent started successfully. Waiting for HR Portal login...")
    icon.run()
