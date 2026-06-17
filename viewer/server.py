#!/usr/bin/env python3
"""study.skill viewer server.

Usage:
  python viewer/server.py --course <slug> --learning-root <path> [--mode interactive|read-only] [--module <module>] [--section <section>] [--port <port>]

Modes:
  interactive - Allows review ratings and learning record writing.
                Requires bundled check-reviews.py and record-review.py.
  read-only   - Only serves course content. Does not require record-review.py.
                Does not expose /api/review-rating or /api/learning-record.
"""

import argparse
import json
import os
import re
import sys
import uuid
import webbrowser
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs
from urllib.request import Request, urlopen


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SCHEMA_VERSION = 4
SESSION_TOKEN = str(uuid.uuid4())
LEARNING_ROOT = None
COURSE_SLUG = None
PROFILE_DIR = None
VIEWER_HTML_PATH = None
SKILL_SCRIPT_DIR = Path(__file__).resolve().parent.parent / "scripts"
SERVER_MODE = "interactive"
LEARNING_RECORD_PATH = None
DEFAULT_MODULE = None
DEFAULT_SECTION = None
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


def validate_scripts(mode: str) -> list:
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


def title_from_markdown(path: Path, fallback: str) -> str:
    if not path.exists():
        return fallback
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        text = line.strip()
        if text.startswith("# "):
            return text[2:].strip() or fallback
    return fallback


def label_from_id(identifier: str) -> str:
    return re.sub(r'^\d{2}-', '', identifier).replace('-', ' ')


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def default_learning_record(course_slug: str, timestamp: str) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "source": "study.skill.viewer",
        "course_slug": course_slug,
        "created_at": timestamp,
        "updated_at": timestamp,
        "current": {
            "module": None,
            "section": None,
            "content_file": None,
            "updated_at": None,
        },
        "pages": [],
        "questions_for_llm": [],
        "exercises": [],
        "legacy_checkpoints": [],
        "review_summary": {
            "rated_count": 0,
            "items": [],
        },
        "completions": [],
    }


def load_learning_record(path: Path, course_slug: str) -> dict:
    if not path.exists():
        return default_learning_record(course_slug, now_iso())
    record = load_json(path)
    if record.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"learning-record.json schema_version must be {SCHEMA_VERSION}")
    if record.get("source") != "study.skill.viewer":
        raise ValueError("learning-record.json source mismatch")
    if record.get("course_slug") != course_slug:
        raise ValueError("learning-record.json course_slug mismatch")
    return record


def write_learning_record(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    data = json.dumps(record, ensure_ascii=False, indent=2)
    tmp_file = path.with_suffix(".tmp")
    tmp_file.write_text(data, encoding="utf-8")
    json.loads(tmp_file.read_text(encoding="utf-8"))
    tmp_file.replace(path)


def upsert_record_item(items: list, key_fields: tuple[str, ...], item: dict) -> None:
    for index, existing in enumerate(items):
        if all(existing.get(field) == item.get(field) for field in key_fields):
            merged = dict(existing)
            merged.update(item)
            items[index] = merged
            return
    items.append(item)


def merge_learning_record_event(record: dict, event: str, payload: dict, timestamp: str) -> dict:
    record["updated_at"] = timestamp
    module = payload.get("module")
    section = payload.get("section")
    content_file = payload.get("content_file")

    if module or section or content_file:
        record["current"] = {
            "module": module,
            "section": section,
            "content_file": content_file,
            "updated_at": timestamp,
        }

    if event == "page_view":
        page = {
            "module": module,
            "section": section,
            "content_file": content_file,
            "title": payload.get("title"),
            "last_opened_at": timestamp,
            "opens": 1,
        }
        existing_pages = record.setdefault("pages", [])
        for existing in existing_pages:
            if (
                existing.get("module") == module
                and existing.get("section") == section
                and existing.get("content_file") == content_file
            ):
                existing["title"] = page["title"]
                existing["last_opened_at"] = timestamp
                existing["opens"] = int(existing.get("opens", 0)) + 1
                break
        else:
            page["first_opened_at"] = timestamp
            existing_pages.append(page)
    elif event == "questions_snapshot":
        questions = payload.get("questions")
        if not isinstance(questions, list):
            raise ValueError("questions_snapshot requires questions list")
        record["questions_for_llm"] = [str(item) for item in questions if str(item).strip()]
    elif event == "exercise_submitted":
        exercise = dict(payload.get("exercise") or {})
        if not exercise.get("id"):
            raise ValueError("exercise_submitted requires exercise.id")
        exercise["submitted_at"] = timestamp
        upsert_record_item(record.setdefault("exercises", []), ("module", "section", "id"), exercise)
    elif event == "review_rated":
        item = dict(payload.get("item") or {})
        if not item.get("concept_id"):
            raise ValueError("review_rated requires item.concept_id")
        item["rated_at"] = timestamp
        summary = record.setdefault("review_summary", {"rated_count": 0, "items": []})
        upsert_record_item(summary.setdefault("items", []), ("concept_id",), item)
        summary["rated_count"] = len(summary["items"])
    elif event == "legacy_checkpoint_submitted":
        checkpoint = dict(payload.get("checkpoint") or {})
        if not checkpoint.get("id"):
            raise ValueError("legacy_checkpoint_submitted requires checkpoint.id")
        checkpoint["submitted_at"] = timestamp
        upsert_record_item(
            record.setdefault("legacy_checkpoints", []),
            ("module", "section", "id"),
            checkpoint,
        )
    elif event == "completion":
        completion = {
            "module": module,
            "section": section,
            "content_file": content_file,
            "started_at": payload.get("started_at"),
            "completed_at": timestamp,
            "question_count": payload.get("question_count", 0),
            "exercise_ids": payload.get("exercise_ids", []),
            "review_rated_count": payload.get("review_rated_count", 0),
        }
        record.setdefault("completions", []).append(completion)
        for page in record.setdefault("pages", []):
            if (
                page.get("module") == module
                and page.get("section") == section
                and page.get("content_file") == content_file
            ):
                page["completed_at"] = timestamp
                break
    else:
        raise ValueError(f"unsupported learning record event: {event}")

    return record


def discover_modules(course_dir: Path, course_slug: str) -> list:
    modules = []
    for entry in sorted(course_dir.iterdir()):
        if not entry.is_dir() or not re.match(r'^\d{2}-', entry.name):
            continue

        content_path = entry / "content.md"
        sections = []

        for section_dir in sorted(entry.iterdir()):
            if not section_dir.is_dir() or not re.match(r'^\d{2}-', section_dir.name):
                continue
            section_content = section_dir / "content.md"
            if not section_content.exists():
                continue
            sections.append({
                "id": section_dir.name,
                "module_id": entry.name,
                "title": title_from_markdown(section_content, label_from_id(section_dir.name)),
                "content_path": f"{course_slug}/{entry.name}/{section_dir.name}/content.md",
            })

        mod = {
            "id": entry.name,
            "name": title_from_markdown(content_path, label_from_id(entry.name)),
            "has_content": content_path.exists(),
            "sections": sections,
        }
        if content_path.exists():
            mod["content_path"] = f"{course_slug}/{entry.name}/content.md"
        modules.append(mod)
    return modules


def is_module_locked(domain_tree: dict, module_id: str | None) -> bool:
    if not module_id:
        return False
    nodes = domain_tree.get("nodes") or {}
    node = nodes.get(module_id) or {}
    return node.get("status") == "locked"


def first_unlocked_module(modules: list, domain_tree: dict) -> str | None:
    for mod in modules:
        if (mod["has_content"] or mod["sections"]) and not is_module_locked(domain_tree, mod["id"]):
            return mod["id"]
    return None


def build_initial_state(learning_root: Path, course_slug: str, module: str = None, section: str = None) -> dict:
    profile_dir = learning_root / ".learning-profile"
    course_dir = learning_root / "courses" / course_slug
    course_state_dir = profile_dir / "courses" / course_slug

    state = {
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

    record_path = course_state_dir / "learning-record.json"
    state["learning_record"] = load_learning_record(record_path, course_slug)
    record_current = state["learning_record"].get("current") or {}

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

    modules = discover_modules(course_dir, course_slug)
    requested_module = module
    current_module = requested_module or record_current.get("module") or state["meta"].get("current_module")
    module_ids = {item["id"] for item in modules}
    if current_module not in module_ids:
        current_module = None
    if current_module and is_module_locked(state["domain_tree"], current_module):
        if requested_module:
            raise PermissionError("module is locked")
        current_module = first_unlocked_module(modules, state["domain_tree"])
    for mod in modules:
        if current_module is None and (mod["has_content"] or mod["sections"]):
            if is_module_locked(state["domain_tree"], mod["id"]):
                continue
            current_module = mod["id"]
            break
    state["modules"] = modules
    state["current_module"] = current_module
    state["current_section"] = None

    if current_module:
        current_mod = next((item for item in modules if item["id"] == current_module), None)
        current_section = None
        requested_section = record_current.get("section") if section is None else section
        if current_mod and requested_section:
            current_section = next((item for item in current_mod["sections"] if item["id"] == requested_section), None)

        if current_section:
            content_path = course_dir / current_module / current_section["id"] / "content.md"
            state["current_content"] = load_text(content_path)
            state["current_content_file"] = current_section["content_path"]
            state["current_section"] = current_section["id"]
            state["current_section_title"] = current_section["title"]
        elif current_mod and current_mod.get("content_path"):
            rel_path = current_mod["content_path"].split("/", 1)[1]
            content_path = course_dir / rel_path
            state["current_content"] = load_text(content_path)
            state["current_content_file"] = current_mod["content_path"]
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
        query = parse_qs(parsed.query, keep_blank_values=True)

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
        elif path == '/api/learning-record':
            self._handle_learning_record()
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
                if LEARNING_RECORD_PATH:
                    timestamp = now_iso()
                    record = load_learning_record(LEARNING_RECORD_PATH, COURSE_SLUG)
                    payload = {
                        "item": {
                            "concept_id": concept_id,
                            "rating": rating,
                            "next_review": concept.get("next_review", ""),
                        },
                    }
                    record = merge_learning_record_event(record, "review_rated", payload, timestamp)
                    write_learning_record(LEARNING_RECORD_PATH, record)
                self._send_json({"ok": True, "concept": concept})
            else:
                self._send_json({"error": result.stderr.strip() or "record-review.py failed"}, 500)
        except FileNotFoundError:
            self._send_json({"error": "bundled record-review.py not found"}, 500)
        except Exception as e:
            self._send_json({"error": str(e)}, 500)

    def _handle_learning_record(self):
        if SERVER_MODE != "interactive":
            self.send_error(403, "not available in read-only mode")
            return
        if not LEARNING_RECORD_PATH:
            self._send_json({"error": "learning record path not configured"}, 500)
            return
        try:
            body = self._read_body()
            if body.get("source") != "study.skill.viewer":
                self._send_json({"error": "invalid source"}, 400)
                return
            if body.get("course_slug") != COURSE_SLUG:
                self._send_json({"error": "course_slug mismatch"}, 400)
                return
            event = str(body.get("event") or "")
            payload = body.get("payload")
            if not isinstance(payload, dict):
                self._send_json({"error": "payload must be object"}, 400)
                return
            timestamp = now_iso()
            record = load_learning_record(LEARNING_RECORD_PATH, COURSE_SLUG)
            record = merge_learning_record_event(record, event, payload, timestamp)
            write_learning_record(LEARNING_RECORD_PATH, record)
            self._send_json({"ok": True, "path": str(LEARNING_RECORD_PATH), "record": record})
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
            section = query.get("section", [None])[0]
            state = build_initial_state(
                LEARNING_ROOT,
                COURSE_SLUG,
                module or DEFAULT_MODULE,
                DEFAULT_SECTION if section is None else section,
            )
            state["server_mode"] = SERVER_MODE
            self._send_json(state)
        except PermissionError as e:
            self._send_json({"error": str(e)}, 403)
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
    global LEARNING_ROOT, COURSE_SLUG, PROFILE_DIR
    global VIEWER_HTML_PATH, SERVER_MODE, LEARNING_RECORD_PATH
    global DEFAULT_MODULE, DEFAULT_SECTION

    parser = argparse.ArgumentParser(description="study.skill viewer server")
    parser.add_argument("--course", required=True, help="Course slug")
    parser.add_argument("--learning-root", required=True, help="Learning data root directory")
    parser.add_argument("--mode", default="interactive", choices=["read-only", "interactive"], help="Server mode")
    parser.add_argument("--module", default=None, help="Module to display initially")
    parser.add_argument("--section", default=None, help="Section to display initially")
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

    missing = validate_scripts(args.mode)
    if missing:
        print(f"Error: missing required scripts for {args.mode} mode: {', '.join(missing)}", file=sys.stderr)
        print(f"  Expected in: {SKILL_SCRIPT_DIR}", file=sys.stderr)
        if args.mode == "interactive":
            print("  Reinstall or repair the study skill files before using interactive mode.", file=sys.stderr)
        sys.exit(1)

    learning_record_path = profile_dir / "courses" / course_slug / "learning-record.json"
    if args.mode == "interactive":
        timestamp = now_iso()
        record = load_learning_record(learning_record_path, course_slug)
        record["schema_version"] = SCHEMA_VERSION
        record["updated_at"] = timestamp
        write_learning_record(learning_record_path, record)

    LEARNING_ROOT = learning_root
    COURSE_SLUG = course_slug
    PROFILE_DIR = profile_dir
    VIEWER_HTML_PATH = viewer_html
    SERVER_MODE = args.mode
    LEARNING_RECORD_PATH = learning_record_path
    DEFAULT_MODULE = args.module
    DEFAULT_SECTION = args.section

    server = HTTPServer(("127.0.0.1", args.port), ViewerHandler)
    port = server.server_address[1]
    url = f"http://127.0.0.1:{port}/#token={SESSION_TOKEN}"

    print("study.skill viewer started", flush=True)
    print(f"  mode: {args.mode}", flush=True)
    print(f"  course: {course_slug}", flush=True)
    print(f"  learning-root: {learning_root}", flush=True)
    print(f"  url: {url}", flush=True)
    if args.mode == "interactive":
        print(f"  learning-record: {learning_record_path}", flush=True)

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
