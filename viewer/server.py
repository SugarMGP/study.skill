#!/usr/bin/env python3
"""study.skill viewer server.

Usage:
  python viewer/server.py --course <slug> --learning-root <path> [--mode interactive|read-only] [--module <module>] [--port <port>]

Modes:
  interactive - Allows review ratings and session file writing.
                Requires bundled check-reviews.py and record-review.py.
  read-only   - Only serves course content. Does not require record-review.py.
                Does not expose /api/review-rating or /api/session-result.
"""

import argparse
import json
import os
import re
import sys
import time
import uuid
import webbrowser
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs
from urllib.request import Request, urlopen


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SESSION_TOKEN = str(uuid.uuid4())
SESSION_ID = str(uuid.uuid4())
LEARNING_ROOT = None
COURSE_SLUG = None
COURSE_DIR = None
PROFILE_DIR = None
VIEWER_HTML_PATH = None
SKILL_SCRIPT_DIR = Path(__file__).resolve().parent.parent / "scripts"
INITIAL_STATE = None
SERVER_MODE = "interactive"
SESSIONS_DIR = None
KROKI_ENDPOINT = "https://kroki.io"
KROKI_TYPES = {
    "plantuml": "plantuml",
    "puml": "plantuml",
    "graphviz": "graphviz",
    "dot": "graphviz",
    "d2": "d2",
    "vega-lite": "vegalite",
    "vegalite": "vegalite",
    "vega": "vega",
    "svgbob": "svgbob",
    "pikchr": "pikchr",
    "structurizr": "structurizr",
}


def validate_slug(slug: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._-]+$', slug))


def safe_resolve(base: Path, relative_path: str) -> Path:
    clean = unquote(relative_path).replace('\\', '/')
    clean = os.path.normpath(clean)
    if clean.startswith('..'):
        raise ValueError("path traversal")
    target = (base / clean).resolve()
    try:
        target.relative_to(base.resolve())
    except ValueError:
        raise ValueError("path traversal")
    return target


def load_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def load_text(path: Path) -> str:
    with path.open("r", encoding="utf-8-sig") as f:
        return f.read()


def validate_scripts(profile_dir: Path, mode: str) -> list:
    """Check that required scripts exist. Returns list of missing scripts."""
    if mode != "interactive":
        return []
    required = [
        (SKILL_SCRIPT_DIR / "check-reviews.py", "check-reviews.py"),
        (SKILL_SCRIPT_DIR / "record-review.py", "record-review.py"),
    ]
    missing = []
    for path, name in required:
        if not path.is_file():
            missing.append(name)
    return missing


def cleanup_old_sessions(sessions_dir: Path, max_age_days: int = 7) -> int:
    """Remove session files older than max_age_days. Returns count removed."""
    if not sessions_dir.is_dir():
        return 0
    cutoff = time.time() - (max_age_days * 86400)
    removed = 0
    for f in sessions_dir.iterdir():
        if not f.is_file() or not f.suffix == ".json":
            continue
        try:
            if f.stat().st_mtime < cutoff:
                f.unlink()
                removed += 1
        except OSError:
            pass
    return removed


def current_course_reviews(payload: dict, course_slug: str) -> dict:
    for course in payload["courses"]:
        if course["slug"] == course_slug:
            items = course["items"]
            if not items:
                return {"total": 0, "courses": []}
            return {
                "total": len(items),
                "courses": [{
                    "slug": course_slug,
                    "count": len(items),
                    "items": items,
                }],
            }
    return {"total": 0, "courses": []}


def build_initial_state(learning_root: Path, course_slug: str, module: str = None) -> dict:
    profile_dir = learning_root / ".learning-profile"
    course_dir = learning_root / "courses" / course_slug
    course_state_dir = profile_dir / "courses" / course_slug

    state = {
        "session_id": SESSION_ID,
        "course_slug": course_slug,
        "learning_root": str(learning_root),
    }

    meta_path = course_state_dir / "meta.json"
    if meta_path.exists():
        state["meta"] = load_json(meta_path)
    else:
        state["meta"] = {"name": course_slug, "status": "active", "skill_tree_enabled": False, "rpg_enabled": False}

    params_path = course_state_dir / "params.json"
    if params_path.exists():
        state["params"] = load_json(params_path)
    else:
        state["params"] = {}

    concepts_path = course_state_dir / "concepts.json"
    if concepts_path.exists():
        state["concepts"] = load_json(concepts_path)
    else:
        state["concepts"] = {"concepts": []}

    tree_path = course_state_dir / "domain-tree.json"
    if tree_path.exists():
        state["domain_tree"] = load_json(tree_path)
    else:
        state["domain_tree"] = {"nodes": {}, "enabled": False}

    profile_path = profile_dir / "profile.json"
    if profile_path.exists():
        state["profile"] = load_json(profile_path)
    else:
        state["profile"] = {}

    readme_path = course_dir / "README.md"
    if readme_path.exists():
        state["readme"] = load_text(readme_path)
    else:
        state["readme"] = ""

    syllabus_path = course_dir / "syllabus.md"
    if syllabus_path.exists():
        state["syllabus"] = load_text(syllabus_path)
    else:
        state["syllabus"] = ""

    modules = []
    current_module = module or state["meta"].get("current_module")
    for entry in sorted(course_dir.iterdir()):
        if entry.is_dir() and re.match(r'^\d{2}-', entry.name):
            content_path = entry / "content.md"
            mod = {
                "id": entry.name,
                "name": entry.name,
                "has_content": content_path.exists(),
            }
            if content_path.exists():
                mod["content_path"] = f"{course_slug}/{entry.name}/content.md"
            if current_module is None and mod["has_content"]:
                current_module = entry.name
            modules.append(mod)
    state["modules"] = modules
    state["current_module"] = current_module

    if current_module:
        content_path = course_dir / current_module / "content.md"
        if content_path.exists():
            state["current_content"] = load_text(content_path)
            state["current_content_file"] = f"{course_slug}/{current_module}/content.md"
        else:
            state["current_content"] = ""
            state["current_content_file"] = ""
    else:
        state["current_content"] = ""
        state["current_content_file"] = ""

    check_reviews_path = SKILL_SCRIPT_DIR / "check-reviews.py"
    state["check_reviews_available"] = check_reviews_path.exists()

    if state["check_reviews_available"]:
        import subprocess
        try:
            cmd = [sys.executable, str(check_reviews_path), str(profile_dir), "--json"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15,
                                    encoding="utf-8", errors="replace")
            if result.returncode == 0 and result.stdout.strip():
                state["due_reviews"] = current_course_reviews(
                    json.loads(result.stdout.strip()),
                    course_slug,
                )
            else:
                state["due_reviews"] = {"total": 0, "courses": []}
                if result.returncode != 0:
                    state["review_check_error"] = result.stderr.strip() or "check-reviews.py failed"
        except Exception as e:
            state["due_reviews"] = {"total": 0, "courses": []}
            state["review_check_error"] = str(e)
    else:
        state["due_reviews"] = {"total": 0, "courses": []}

    return state


class ViewerHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _check_token(self, query=None, headers=True):
        """Validate session token from query param or header."""
        if query:
            token = query.get("token", [None])[0]
            if token == SESSION_TOKEN:
                return True
        if headers:
            token = self.headers.get("X-Session-Token")
            if token == SESSION_TOKEN:
                return True
        return False

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        if path == '/':
            self._serve_viewer()
        elif path == '/api/initial-state':
            if not self._check_token(query):
                self.send_error(401, "invalid token")
                return
            self._serve_initial_state(query)
        elif path.startswith('/file/'):
            self._serve_file(path)
        else:
            self.send_error(404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if not self._check_token():
            self.send_error(401, "invalid token")
            return

        if path == '/api/review-rating':
            self._handle_review_rating()
        elif path == '/api/session-result':
            self._handle_session_result()
        elif path == '/api/render-diagram':
            self._handle_render_diagram()
        else:
            self.send_error(404)

    def _handle_review_rating(self):
        if SERVER_MODE != "interactive":
            self.send_error(403, "not available in read-only mode")
            return
        try:
            body = self._read_body()
            concept_id = body.get("concept_id")
            rating = body.get("rating")
            if not concept_id or rating not in (1, 2, 3, 4):
                self._send_json({"error": "invalid params: need concept_id and rating 1-4"}, 400)
                return
            import subprocess
            course_state_dir = str(PROFILE_DIR / "courses" / COURSE_SLUG)
            cmd = [sys.executable, str(SKILL_SCRIPT_DIR / "record-review.py"),
                   course_state_dir, concept_id, str(rating)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30,
                                    encoding="utf-8", errors="replace")
            if result.returncode == 0:
                concept = json.loads(result.stdout.strip())
                self._send_json({"ok": True, "concept": concept})
            else:
                self._send_json({"error": result.stderr.strip() or "record-review.py failed"}, 500)
        except FileNotFoundError:
            self._send_json({"error": "bundled record-review.py not found"}, 500)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_session_result(self):
        if SERVER_MODE != "interactive":
            self.send_error(403, "not available in read-only mode")
            return
        if not SESSIONS_DIR:
            self._send_json({"error": "sessions dir not configured"}, 500)
            return
        try:
            body = self._read_body()
            session_id = body.get("session_id") or SESSION_ID
            try:
                session_id = str(uuid.UUID(str(session_id)))
            except ValueError:
                self._send_json({"error": "invalid session_id"}, 400)
                return
            session_file = SESSIONS_DIR / f"{session_id}.json"
            data = json.dumps(body, ensure_ascii=False, indent=2)
            tmp_file = session_file.with_suffix(".tmp")
            tmp_file.write_text(data, encoding="utf-8")
            json.loads(tmp_file.read_text(encoding="utf-8"))
            tmp_file.replace(session_file)
            self._send_json({"ok": True, "path": str(session_file)})
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_render_diagram(self):
        try:
            body = self._read_body()
            diagram_type = str(body.get("type", "")).strip().lower()
            source = body.get("source")
            kroki_type = KROKI_TYPES.get(diagram_type)
            if not kroki_type or not isinstance(source, str) or not source.strip():
                self._send_json({"error": "invalid params: need supported type and source"}, 400)
                return

            url = f"{KROKI_ENDPOINT}/{kroki_type}/svg"
            request = Request(
                url,
                data=source.encode("utf-8"),
                headers={
                    "Content-Type": "text/plain; charset=utf-8",
                    "Accept": "image/svg+xml",
                    "User-Agent": "study.skill-viewer/1.0",
                },
                method="POST",
            )
            with urlopen(request, timeout=20) as response:
                svg = response.read().decode("utf-8", errors="replace")
            self._send_json({"ok": True, "svg": svg})
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _serve_viewer(self):
        try:
            content = VIEWER_HTML_PATH.read_text(encoding="utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(content.encode("utf-8"))
        except Exception as e:
            self.send_error(500, str(e))

    def _serve_initial_state(self, query):
        try:
            module = query.get("module", [None])[0]
            if module and module != INITIAL_STATE.get("current_module"):
                state = build_initial_state(LEARNING_ROOT, COURSE_SLUG, module)
            else:
                state = INITIAL_STATE
            state["server_mode"] = SERVER_MODE
            self._send_json(state)
        except Exception as e:
            self.send_error(500, str(e))

    def _serve_file(self, path):
        parts = path.split('/', 3)
        if len(parts) < 4:
            self.send_error(400, "invalid path")
            return
        slug = parts[2]
        rel_path = parts[3]

        if not validate_slug(slug):
            self.send_error(400, "invalid slug")
            return

        try:
            base = LEARNING_ROOT / "courses" / slug
            target = safe_resolve(base, rel_path)
        except ValueError:
            self.send_error(403, "path traversal")
            return

        if not target.exists() or not target.is_file():
            self.send_error(404, "file not found")
            return

        ext_map = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp',
            '.avif': 'image/avif',
            '.css': 'text/css', '.js': 'application/javascript',
            '.md': 'text/plain; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
        }
        content_type = ext_map.get(target.suffix.lower(), 'application/octet-stream')

        try:
            data = target.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))


def main():
    global LEARNING_ROOT, COURSE_SLUG, COURSE_DIR, PROFILE_DIR
    global VIEWER_HTML_PATH, INITIAL_STATE, SERVER_MODE, SESSIONS_DIR

    parser = argparse.ArgumentParser(description="study.skill viewer server")
    parser.add_argument("--course", required=True, help="Course slug")
    parser.add_argument("--learning-root", required=True, help="Learning data root directory")
    parser.add_argument("--mode", default="interactive", choices=["read-only", "interactive"], help="Server mode")
    parser.add_argument("--module", default=None, help="Module to display initially")
    parser.add_argument("--port", type=int, default=0, help="Port (0 = random)")
    args = parser.parse_args()

    learning_root = Path(args.learning_root).expanduser().resolve()
    if not learning_root.exists():
        print(f"Error: learning-root does not exist: {learning_root}", file=sys.stderr)
        sys.exit(1)
    if not (learning_root / ".learning-profile").is_dir():
        print(f"Error: .learning-profile/ not found in {learning_root}", file=sys.stderr)
        sys.exit(1)

    course_slug = args.course
    if not validate_slug(course_slug):
        print(f"Error: invalid course slug: {course_slug}", file=sys.stderr)
        sys.exit(1)

    course_dir = learning_root / "courses" / course_slug
    if not course_dir.is_dir():
        print(f"Error: course directory not found: {course_dir}", file=sys.stderr)
        sys.exit(1)

    viewer_html = Path(__file__).parent / "viewer.html"
    if not viewer_html.exists():
        print(f"Error: viewer.html not found: {viewer_html}", file=sys.stderr)
        sys.exit(1)

    profile_dir = learning_root / ".learning-profile"

    missing = validate_scripts(profile_dir, args.mode)
    if missing:
        print(f"Error: missing required scripts for {args.mode} mode: {', '.join(missing)}", file=sys.stderr)
        print(f"  Expected in: {SKILL_SCRIPT_DIR}", file=sys.stderr)
        if args.mode == "interactive":
            print("  Reinstall or repair the study skill files before using interactive mode.", file=sys.stderr)
        sys.exit(1)

    sessions_dir = profile_dir / "tmp" / "viewer-sessions"
    if args.mode == "interactive":
        sessions_dir.mkdir(parents=True, exist_ok=True)
        removed = cleanup_old_sessions(sessions_dir)
        if removed > 0:
            print(f"  cleaned {removed} old session file(s)")

    LEARNING_ROOT = learning_root
    COURSE_SLUG = course_slug
    COURSE_DIR = course_dir
    PROFILE_DIR = profile_dir
    VIEWER_HTML_PATH = viewer_html
    SERVER_MODE = args.mode
    SESSIONS_DIR = sessions_dir

    INITIAL_STATE = build_initial_state(learning_root, course_slug, args.module)
    INITIAL_STATE["server_mode"] = args.mode

    server = HTTPServer(("127.0.0.1", args.port), ViewerHandler)
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/#token={SESSION_TOKEN}"

    print("study.skill viewer started", flush=True)
    print(f"  mode: {args.mode}", flush=True)
    print(f"  course: {course_slug}", flush=True)
    print(f"  learning-root: {learning_root}", flush=True)
    print(f"  url: {url}", flush=True)
    print(f"  session: {SESSION_ID}", flush=True)

    webbrowser.open(url)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
        print("viewer stopped")


if __name__ == "__main__":
    main()
