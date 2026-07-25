"""Course discovery and initial viewer state assembly."""

import json
import re
import subprocess
import sys
from pathlib import Path

from records import load_learning_record
from utils import label_from_id, load_json, load_text, title_from_markdown


SUPPLEMENT_MODULE_ID = "99-content-supplements"


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


def discover_modules(course_dir: Path, course_slug: str) -> list:
    modules = []
    for entry in sorted(course_dir.iterdir()):
        if not entry.is_dir() or not re.match(r"^\d{2}-", entry.name):
            continue

        content_path = entry / "content.md"
        sections = []

        for section_dir in sorted(entry.iterdir()):
            if not section_dir.is_dir() or not re.match(r"^\d{2}-", section_dir.name):
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

        module = {
            "id": entry.name,
            "name": title_from_markdown(content_path, label_from_id(entry.name)),
            "has_content": content_path.exists(),
            "sections": sections,
        }
        if content_path.exists():
            module["content_path"] = f"{course_slug}/{entry.name}/content.md"
        modules.append(module)
    return modules


def is_module_locked(domain_tree: dict, module_id: str | None) -> bool:
    if not module_id:
        return False
    if module_id == SUPPLEMENT_MODULE_ID:
        return False
    nodes = domain_tree.get("nodes") or {}
    node = nodes.get(module_id) or {}
    return node.get("status") == "locked"


def first_unlocked_module(modules: list, domain_tree: dict) -> str | None:
    for module in modules:
        if (module["has_content"] or module["sections"]) and not is_module_locked(domain_tree, module["id"]):
            return module["id"]
    return None


def build_initial_state(
    learning_root: Path,
    course_slug: str,
    script_dir: Path,
    module: str | None = None,
    section: str | None = None,
) -> dict:
    profile_dir = learning_root / ".learning-profile"
    course_dir = learning_root / "courses" / course_slug
    course_state_dir = profile_dir / "courses" / course_slug

    state = {
        "course_slug": course_slug,
        "learning_root": str(learning_root),
    }
    state["meta"] = load_json_if_exists(course_state_dir / "meta.json", {
        "name": course_slug,
        "status": "active",
        "skill_tree_enabled": False,
        "rpg_enabled": False,
    })
    if state["meta"].get("generation_status") != "complete":
        raise PermissionError("course generation is not complete")
    state["params"] = load_json_if_exists(course_state_dir / "params.json", {})
    state["concepts"] = load_json_if_exists(course_state_dir / "concepts.json", {"concepts": []})
    state["domain_tree"] = load_json_if_exists(course_state_dir / "domain-tree.json", {"nodes": {}, "enabled": False})
    state["profile"] = load_json_if_exists(profile_dir / "profile.json", {})
    state["learning_record"] = load_learning_record(course_state_dir / "learning-record.json", course_slug)
    state["readme"] = load_text_if_exists(course_dir / "README.md")
    state["syllabus"] = load_text_if_exists(course_dir / "syllabus.md")

    modules = discover_modules(course_dir, course_slug)
    apply_current_content(state, modules, course_dir, module, section)
    apply_review_state(state, profile_dir, course_slug, script_dir)
    return state


def load_json_if_exists(path: Path, default: dict) -> dict:
    if path.exists():
        return load_json(path)
    return default


def load_text_if_exists(path: Path) -> str:
    if path.exists():
        return load_text(path)
    return ""


def apply_current_content(
    state: dict,
    modules: list,
    course_dir: Path,
    module: str | None,
    section: str | None,
) -> None:
    record_current = state["learning_record"].get("current") or {}
    requested_module = module
    current_module = requested_module or record_current.get("module") or state["meta"].get("current_module")
    module_ids = {item["id"] for item in modules}
    if current_module not in module_ids:
        current_module = None
    if current_module and is_module_locked(state["domain_tree"], current_module):
        if requested_module:
            raise PermissionError("module is locked")
        current_module = first_unlocked_module(modules, state["domain_tree"])
    for item in modules:
        if current_module is None and (item["has_content"] or item["sections"]):
            if is_module_locked(state["domain_tree"], item["id"]):
                continue
            current_module = item["id"]
            break

    state["modules"] = modules
    state["current_module"] = current_module
    state["current_section"] = None

    if not current_module:
        state["current_content"] = ""
        state["current_content_file"] = ""
        return

    current_mod = next((item for item in modules if item["id"] == current_module), None)
    requested_section = record_current.get("section") if section is None else section
    current_section = None
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
        state["current_content"] = load_text(course_dir / rel_path)
        state["current_content_file"] = current_mod["content_path"]
    else:
        state["current_content"] = ""
        state["current_content_file"] = ""


def apply_review_state(state: dict, profile_dir: Path, course_slug: str, script_dir: Path) -> None:
    check_reviews_path = script_dir / "check-reviews.py"
    state["check_reviews_available"] = check_reviews_path.exists()

    if not state["check_reviews_available"]:
        state["due_reviews"] = {"total": 0, "courses": []}
        return

    try:
        command = [sys.executable, str(check_reviews_path), str(profile_dir), "--json"]
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=15,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode == 0 and result.stdout.strip():
            state["due_reviews"] = current_course_reviews(json.loads(result.stdout.strip()), course_slug)
            return
        state["due_reviews"] = {"total": 0, "courses": []}
        if result.returncode != 0:
            state["review_check_error"] = result.stderr.strip() or "check-reviews.py failed"
    except Exception as exc:
        state["due_reviews"] = {"total": 0, "courses": []}
        state["review_check_error"] = str(exc)
