#!/usr/bin/env python3
"""Compute overdue reviews using the simplified FSRS formula.

Usage:
  python3 check-reviews.py [profile_dir]

Reads all active/completed courses' concepts.json, computes R for each reviewable concept,
and outputs overdue items grouped by course. If no overdue items, outputs nothing.

Exit codes:
  0 - success (with or without overdue items)
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


# FSRS v4 default parameters
DECAY = -0.1542
FACTOR = 0.9 ** (1 / DECAY) - 1  # ≈ 0.98
VALID_MODES = {"speedrun", "system", "interview", "exam"}


def compute_r(days_since_review: float, stability: float) -> float:
    """Compute retrievability using FSRS formula: R = (1 + FACTOR * t/S)^DECAY"""
    return (1 + FACTOR * days_since_review / stability) ** DECAY


def parse_date(date_str: str) -> datetime:
    """Parse ISO 8601 date string as timezone-aware UTC."""
    if len(date_str) == 10:
        return datetime.fromisoformat(date_str + "T00:00:00+00:00")
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


def load_json(path: str) -> dict:
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def review_params(params: dict) -> tuple[float, float]:
    """Return review parameters, defaulting only absent legacy fields."""
    mode = params.get("mode", "system")
    if not isinstance(mode, str) or mode not in VALID_MODES:
        allowed = ", ".join(sorted(VALID_MODES))
        raise ValueError(f"params.json field mode must be one of: {allowed}")
    default_retention = 0.85 if mode == "speedrun" else 0.90

    target_retention = params.get("target_retention", default_retention)
    spacing_factor = params.get("spacing_factor", 1.0)

    if isinstance(target_retention, bool) or not isinstance(target_retention, (int, float)):
        raise ValueError("params.json field target_retention must be a number")
    if isinstance(spacing_factor, bool) or not isinstance(spacing_factor, (int, float)):
        raise ValueError("params.json field spacing_factor must be a number")
    if not 0.70 <= target_retention <= 0.98:
        raise ValueError("params.json field target_retention must be between 0.70 and 0.98")
    if not 0.3 <= spacing_factor <= 3.0:
        raise ValueError("params.json field spacing_factor must be between 0.3 and 3.0")

    return float(target_retention), float(spacing_factor)


def main():
    parser = argparse.ArgumentParser(description="Check study.skill overdue reviews.")
    parser.add_argument("profile_dir", nargs="?", default=os.path.join(os.getcwd(), ".learning-profile"))
    parser.add_argument("--json", action="store_true", dest="json_output", help="Output machine-readable JSON.")
    args = parser.parse_args()

    profile_dir = args.profile_dir
    courses_dir = os.path.join(profile_dir, "courses")

    if not os.path.isdir(courses_dir):
        if args.json_output:
            print(json.dumps({"total": 0, "courses": []}, ensure_ascii=False))
        sys.exit(0)

    now = datetime.now(timezone.utc)
    overdue_by_course: dict[str, list[dict]] = {}

    for slug in sorted(os.listdir(courses_dir)):
        course_dir = os.path.join(courses_dir, slug)
        if not os.path.isdir(course_dir):
            continue

        # Load meta.json to check status
        meta_path = os.path.join(course_dir, "meta.json")
        meta = load_json(meta_path)
        status = meta["status"]
        if status in ("paused", "archived"):
            continue  # Skip paused/archived courses
        # active and completed courses participate in review scheduling

        # Load params.json for target_retention and spacing_factor
        params_path = os.path.join(course_dir, "params.json")
        params = load_json(params_path)
        target_retention, spacing_factor = review_params(params)

        # Load concepts.json
        concepts_path = os.path.join(course_dir, "concepts.json")
        concepts_data = load_json(concepts_path)

        due_items = []
        for c in concepts_data["concepts"]:
            c_status = c["status"]
            if c_status not in ("learning", "mastered"):
                continue  # Skip needs_relearning and retired

            # Use last_review if available, otherwise first_seen
            last = c.get("last_review") or c.get("first_seen")
            last_dt = parse_date(last)

            days = (now - last_dt).days
            s = c["S"]

            # Apply spacing_factor to stability for mastered items (less frequent checks)
            if c_status == "mastered":
                s *= spacing_factor

            r = compute_r(days, s)

            if r < target_retention:
                due_items.append({
                    "id": c["id"],
                    "name": c["name"],
                    "status": c_status,
                    "retrievability": r,
                })

        if due_items:
            overdue_by_course[slug] = due_items

    # Output
    if not overdue_by_course:
        if args.json_output:
            print(json.dumps({"total": 0, "courses": []}, ensure_ascii=False))
        sys.exit(0)

    total = sum(len(items) for items in overdue_by_course.values())
    if args.json_output:
        payload = {
            "total": total,
            "courses": [
                {"slug": slug, "count": len(items), "items": items}
                for slug, items in overdue_by_course.items()
            ],
        }
        print(json.dumps(payload, ensure_ascii=False))
        sys.exit(0)

    lines = [f"你有 {total} 个知识点需要复习："]

    for slug, items in overdue_by_course.items():
        lines.append(f"\n**{slug}**：{len(items)} 个")
        for item in items:
            label = f"({item['status']}, R={item['retrievability']:.0%})"
            lines.append(f"  - {item['name']} {label}")

    lines.append("\n先花几分钟回顾一下？")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
