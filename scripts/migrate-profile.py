#!/usr/bin/env python3
"""Migrate old study.skill learning state to schema_version 4.

Usage:
  python scripts/migrate-profile.py [profile_dir]
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


SCHEMA_VERSION = 4

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8-sig") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def verify_migration(courses_dir: Path, slugs: set[str]) -> None:
    for slug in slugs:
        course_dir = courses_dir / slug
        for filename in ("meta.json", "params.json", "concepts.json", "domain-tree.json", "learning-record.json"):
            data = read_json(course_dir / filename)
            if data.get("schema_version") != SCHEMA_VERSION:
                raise ValueError(f"migration verification failed: {course_dir / filename}")


def default_preferences(existing=None) -> dict:
    existing = existing or {}
    preferences = {
        k: v for k, v in existing.items()
        if k not in {"automation_declined", "automation_declined_at"}
    }
    preferences.setdefault("native_language", "zh")
    preferences.setdefault("daily_time_budget_minutes", 30)
    preferences.setdefault("feedback_style", "normal")
    preferences.setdefault("correction_mode", "inline")
    return preferences


def default_learner_profile(existing=None) -> dict:
    existing = existing or {}
    learner_profile = dict(existing)
    learner_profile.setdefault("baseline", None)
    learner_profile.setdefault("goals", [])
    learner_profile.setdefault("known_languages", [])
    learner_profile.setdefault("weak_prereqs", [])
    learner_profile.setdefault("analogy_preferences", [])
    learner_profile.setdefault("teaching_constraints", [])
    learner_profile.setdefault("materials_summary", None)
    learner_profile.setdefault("updated_at", None)
    return learner_profile


def upgrade_profile_file(profile_file: Path, timestamp: str) -> None:
    profile = read_json(profile_file)
    if not profile:
        profile = {
            "learner_id": "default",
            "created_at": timestamp,
            "updated_at": timestamp,
            "preferences": {},
            "learner_profile": {},
        }

    profile["schema_version"] = SCHEMA_VERSION
    profile.setdefault("learner_id", "default")
    profile.setdefault("created_at", timestamp)
    profile["updated_at"] = timestamp
    profile["preferences"] = default_preferences(profile.get("preferences"))
    profile["learner_profile"] = default_learner_profile(profile.get("learner_profile"))
    write_json(profile_file, profile)


def upgrade_course_files(courses_dir: Path) -> None:
    if not courses_dir.exists():
        return
    for course_dir in courses_dir.iterdir():
        if not course_dir.is_dir():
            continue
        meta = read_json(course_dir / "meta.json")
        mode = mode_from_scope(meta.get("mode_label", "")) if meta else "system"
        if meta.get("mode") in {"speedrun", "system", "interview", "exam"}:
            mode = meta["mode"]
        for filename in ("meta.json", "concepts.json", "domain-tree.json"):
            path = course_dir / filename
            data = read_json(path)
            if not data:
                continue
            data["schema_version"] = SCHEMA_VERSION
            write_json(path, data)
        params_path = course_dir / "params.json"
        params = read_json(params_path)
        if params:
            write_json(params_path, compact_params(params, mode))
        ensure_learning_record(course_dir, course_dir.name)


def default_learning_record(slug: str, timestamp: str) -> dict:
    return {
        "schema_version": SCHEMA_VERSION,
        "source": "study.skill.viewer",
        "course_slug": slug,
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
        "review_summary": {
            "rated_count": 0,
            "items": [],
        },
        "legacy_checkpoints": [],
        "completions": [],
    }


def ensure_learning_record(course_dir: Path, slug: str) -> None:
    path = course_dir / "learning-record.json"
    timestamp = now_iso()
    data = read_json(path)
    if not data:
        write_json(path, default_learning_record(slug, timestamp))
        return
    data["schema_version"] = SCHEMA_VERSION
    data.setdefault("source", "study.skill.viewer")
    data.setdefault("course_slug", slug)
    data.setdefault("created_at", timestamp)
    data["updated_at"] = timestamp
    data.setdefault("current", {
        "module": None,
        "section": None,
        "content_file": None,
        "updated_at": None,
    })
    data.setdefault("pages", [])
    data.setdefault("questions_for_llm", [])
    data.setdefault("exercises", [])
    data.setdefault("review_summary", {"rated_count": 0, "items": []})
    data.setdefault("legacy_checkpoints", [])
    data.setdefault("completions", [])
    write_json(path, data)


def delete_old_files(*paths: Path) -> None:
    for path in paths:
        if path.exists():
            path.unlink()
            print(f"Deleted old file: {path.name}")


def validate_review_items(review_items: list[dict]) -> None:
    required = ("course_slug", "id", "concept")
    missing = []
    for item in review_items:
        item_name = item.get("id") or item.get("concept") or "<unknown>"
        for field in required:
            if field not in item:
                missing.append(f"{item_name}.{field}")
    if missing:
        names = ", ".join(missing[:8])
        raise ValueError(
            "old review items are missing required fields; cannot safely migrate: "
            f"{names}"
        )


def mode_from_scope(scope: str) -> str:
    if "速成" in scope:
        return "speedrun"
    if "面试" in scope:
        return "interview"
    if "考试" in scope or "备考" in scope:
        return "exam"
    return "system"


def mode_defaults(mode: str) -> dict:
    return {
        "speedrun": {
            "target_retention": 0.85,
            "require_mastery_before_advance": False,
        },
        "interview": {
            "target_retention": 0.90,
            "require_mastery_before_advance": False,
        },
        "exam": {
            "target_retention": 0.90,
            "require_mastery_before_advance": True,
        },
        "system": {
            "target_retention": 0.90,
            "require_mastery_before_advance": True,
        },
    }[mode]


def build_domain_tree(slug: str, name: str, old_course: dict, review_items: list[dict]) -> dict:
    completed = old_course.get("completed_modules", [])
    current = old_course.get("current_module")
    modules = []
    for module in completed:
        if module and module not in modules:
            modules.append(module)
    if current and current not in modules:
        modules.append(current)
    for item in review_items:
        if item["course_slug"] != slug:
            continue
        module = item.get("module")
        if module and module not in modules:
            modules.append(module)

    nodes = {}
    for module in modules:
        if module in completed:
            status = "mastered"
            progress = 100
        elif module == current:
            status = "in_progress"
            progress = 50
        else:
            status = "available"
            progress = 0
        nodes[module] = {
            "status": status,
            "progress": progress,
        }

    skill_tree_enabled = old_course.get("skill_tree_enabled", True)
    rpg_enabled = old_course.get("rpg_enabled", True)
    return {
        "schema_version": SCHEMA_VERSION,
        "course_slug": slug,
        "domain": name,
        "enabled": skill_tree_enabled,
        "rpg": {
            "enabled": rpg_enabled,
            "level": 1,
            "xp": 0,
            "title": "学徒",
            "achievements": [],
            "quests": [],
        },
        "nodes": nodes,
    }


def compact_params(existing: dict, mode: str) -> dict:
    defaults = mode_defaults(mode)
    return {
        "schema_version": SCHEMA_VERSION,
        "target_retention": existing.get("target_retention", defaults["target_retention"]),
        "spacing_factor": existing.get("spacing_factor", 1.0),
        "require_mastery_before_advance": existing.get(
            "require_mastery_before_advance",
            defaults["require_mastery_before_advance"],
        ),
        "last_pace_feedback": existing.get("last_pace_feedback", existing.get("last_speed_feedback")),
        "last_pace_feedback_at": existing.get("last_pace_feedback_at", existing.get("last_speed_feedback_at")),
        "adaptive_history": existing.get("adaptive_history", []),
    }


def migrate(profile_dir: Path) -> int:
    progress_path = profile_dir / "progress.json"
    review_path = profile_dir / "review-schedule.json"
    courses_dir = profile_dir / "courses"
    progress = read_json(progress_path)
    review = read_json(review_path)
    timestamp = now_iso()

    courses_dir.mkdir(parents=True, exist_ok=True)

    profile_file = profile_dir / "profile.json"
    upgrade_profile_file(profile_file, timestamp)

    active_courses = progress.get("active_courses", {})
    review_items = review.get("items", [])
    validate_review_items(review_items)
    slugs = set(active_courses)
    slugs.update(item["course_slug"] for item in review_items)

    if not slugs:
        if progress or review:
            raise ValueError("old state files exist but no migratable course data was found")
        upgrade_course_files(courses_dir)
        existing_slugs = {p.name for p in courses_dir.iterdir() if p.is_dir()} if courses_dir.exists() else set()
        verify_migration(courses_dir, existing_slugs)
        delete_old_files(progress_path, review_path)
        print("No old course data found. Existing profile upgraded.")
        return 0

    for slug in sorted(slugs):
        old_course = active_courses.get(slug, {})
        course_review_items = [item for item in review_items if item["course_slug"] == slug]
        scope = old_course.get("scope", "系统精讲")
        mode = mode_from_scope(scope)
        course_dir = courses_dir / slug
        course_name = old_course.get("name", slug)

        write_json(course_dir / "meta.json", {
            "schema_version": SCHEMA_VERSION,
            "slug": slug,
            "name": course_name,
            "status": old_course.get("status", "active"),
            "mode": mode,
            "mode_label": scope,
            "current_module": old_course.get("current_module"),
            "completed_modules": old_course.get("completed_modules", []),
            "last_session": old_course.get("last_session"),
            "total_sessions": old_course.get("total_sessions", 0),
            "streak_days": old_course.get("streak_days", 0),
            "skill_tree_enabled": old_course.get("skill_tree_enabled", True),
            "rpg_enabled": old_course.get("rpg_enabled", True),
            "rpg_preference_asked": old_course.get("rpg_preference_asked", False),
            "storage_path": old_course.get("storage_path", str(profile_dir.parent / "courses" / slug)),
            "created_at": old_course.get("created_at", timestamp),
        })

        write_json(course_dir / "params.json", compact_params({
            "target_retention": review.get("target_retention", mode_defaults(mode)["target_retention"]),
        }, mode))

        concepts = []
        for item in course_review_items:
            concepts.append({
                "id": item["id"],
                "name": item["concept"],
                "module": item.get("module", ""),
                "status": "needs_relearning" if item.get("status") == "needs_relearning" else "learning",
                "D": item.get("D", 4.0),
                "S": item.get("S", 1.0),
                "last_review": item.get("last_review"),
                "next_review": item.get("next_review"),
                "reviews": item.get("reviews", 0),
                "lapses": item.get("lapses", 0),
                "first_seen": item.get("first_seen", item.get("last_review", timestamp)),
                "question": item.get("question", ""),
                "answer": item.get("answer", ""),
            })
        write_json(course_dir / "concepts.json", {
            "schema_version": SCHEMA_VERSION,
            "course_slug": slug,
            "last_review_session": None,
            "concepts": concepts,
        })
        write_json(course_dir / "domain-tree.json", build_domain_tree(slug, course_name, old_course, course_review_items))
        ensure_learning_record(course_dir, slug)
        print(f"Migrated {slug}")

    upgrade_course_files(courses_dir)
    existing_slugs = {p.name for p in courses_dir.iterdir() if p.is_dir()} if courses_dir.exists() else set()
    verify_migration(courses_dir, existing_slugs)
    delete_old_files(progress_path, review_path)
    print("Migration complete. Old files deleted.")
    return 0


def main() -> int:
    profile_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "learning" / ".learning-profile"
    return migrate(profile_dir)


if __name__ == "__main__":
    raise SystemExit(main())
