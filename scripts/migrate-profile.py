#!/usr/bin/env python3
"""Migrate old study.skill learning state to schema_version 1.

Usage:
  python scripts/migrate-profile.py [profile_dir]
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def read_json(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


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
            "depth_chars_per_module": 1200,
            "exercises_per_module": 2,
            "target_retention": 0.85,
            "auto_advance": True,
            "require_mastery_before_advance": False,
        },
        "interview": {
            "depth_chars_per_module": 1000,
            "exercises_per_module": 1,
            "target_retention": 0.90,
            "auto_advance": True,
            "require_mastery_before_advance": False,
        },
        "exam": {
            "depth_chars_per_module": 1500,
            "exercises_per_module": 4,
            "target_retention": 0.90,
            "auto_advance": False,
            "require_mastery_before_advance": True,
        },
        "system": {
            "depth_chars_per_module": 3500,
            "exercises_per_module": 4,
            "target_retention": 0.90,
            "auto_advance": False,
            "require_mastery_before_advance": True,
        },
    }[mode]


def migrate(profile_dir: Path) -> int:
    progress_path = profile_dir / "progress.json"
    review_path = profile_dir / "review-schedule.json"
    courses_dir = profile_dir / "courses"
    progress = read_json(progress_path)
    review = read_json(review_path)
    timestamp = now_iso()

    courses_dir.mkdir(parents=True, exist_ok=True)

    profile_file = profile_dir / "profile.json"
    if not profile_file.exists():
        write_json(profile_file, {
            "schema_version": 1,
            "learner_id": "default",
            "created_at": timestamp,
            "updated_at": timestamp,
            "preferences": {
                "native_language": "zh",
                "daily_time_budget_minutes": 30,
                "feedback_style": "normal",
                "correction_mode": "inline",
            },
        })

    active_courses = progress.get("active_courses", {})
    review_items = review.get("items", [])
    slugs = set(active_courses)
    slugs.update(item["course_slug"] for item in review_items)

    if not slugs:
        print("No old course data found. Nothing to migrate.")
        return 0

    for slug in sorted(slugs):
        old_course = active_courses.get(slug, {})
        scope = old_course.get("scope", "系统精讲")
        mode = mode_from_scope(scope)
        defaults = mode_defaults(mode)
        course_dir = courses_dir / slug

        write_json(course_dir / "meta.json", {
            "schema_version": 1,
            "slug": slug,
            "name": old_course.get("name", slug),
            "status": old_course.get("status", "active"),
            "mode": mode,
            "mode_label": scope,
            "current_module": old_course.get("current_module"),
            "completed_modules": old_course.get("completed_modules", []),
            "last_session": old_course.get("last_session"),
            "total_sessions": old_course.get("total_sessions", 0),
            "streak_days": old_course.get("streak_days", 0),
            "storage_path": old_course.get("storage_path", str(profile_dir.parent / "courses" / slug)),
            "created_at": old_course.get("created_at", timestamp),
        })

        write_json(course_dir / "params.json", {
            "schema_version": 1,
            "mode": mode,
            "mode_label": scope,
            "depth_chars_per_module": defaults["depth_chars_per_module"],
            "exercises_per_module": defaults["exercises_per_module"],
            "target_retention": review.get("target_retention", defaults["target_retention"]),
            "new_items_per_session": 5,
            "spacing_factor": 1.0,
            "speed_factor": 1.0,
            "auto_advance": defaults["auto_advance"],
            "require_mastery_before_advance": defaults["require_mastery_before_advance"],
            "last_speed_feedback": None,
            "last_speed_feedback_at": None,
            "adaptive_history": [],
        })

        concepts = []
        for item in review_items:
            if item["course_slug"] != slug:
                continue
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
            "schema_version": 1,
            "course_slug": slug,
            "last_review_session": None,
            "concepts": concepts,
        })
        print(f"Migrated {slug}")

    print("Migration complete. Old files preserved.")
    return 0


def main() -> int:
    profile_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "learning" / ".learning-profile"
    return migrate(profile_dir)


if __name__ == "__main__":
    raise SystemExit(main())
