#!/usr/bin/env python3
"""Record one review rating for a study.skill concept.

Usage:
  python record-review.py <course_dir> <concept_id> <rating>

rating: 1=forgot, 2=hard, 3=ok, 4=easy
"""

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

DECAY = -0.1542
FACTOR = 0.9 ** (1 / DECAY) - 1


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def parse_date(date_str: str) -> datetime:
    if len(date_str) == 10:
        return datetime.fromisoformat(date_str + "T00:00:00+00:00")
    dt = datetime.fromisoformat(date_str)
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


def compute_r(days_since_review: int, stability: float) -> float:
    return (1 + FACTOR * days_since_review / stability) ** DECAY


def write_json(path: Path, data: dict) -> None:
    backup = path.with_suffix(path.suffix + ".bak")
    tmp = path.with_suffix(path.suffix + ".tmp")
    if path.exists():
        os.replace(path, backup)
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, path)


def update_concept(concept: dict, rating: int, now: datetime) -> dict:
    last = concept.get("last_review") or concept["first_seen"]
    days = max(0, (now - parse_date(last)).days)
    old_d = concept["D"]
    old_s = concept["S"]
    r = compute_r(days, old_s)

    new_d = clamp(old_d - 0.5 * (rating - 3), 1, 10)
    if rating >= 3:
        multiplier = 1.3 if rating == 4 else 1.1
        new_s = old_s * multiplier * (1 + 0.5 * max(0, 1 - r))
        if new_d >= 8:
            new_s = min(new_s, old_s * 2)
        new_s = min(new_s, old_s + 30)
    else:
        new_s = max(1, old_s * 0.2 * rating)

    lapses = concept["lapses"] + (1 if rating < 3 else 0)
    status = concept["status"]
    reviews = concept["reviews"] + 1
    if lapses >= 3 and r < 0.7:
        status = "needs_relearning"
    elif rating == 4 and reviews >= 3 and lapses == 0:
        status = "mastered"

    next_review = now + timedelta(days=max(1, round(new_s)))
    concept.update({
        "status": status,
        "D": round(new_d, 2),
        "S": round(new_s, 2),
        "last_review": now.isoformat(),
        "next_review": next_review.date().isoformat(),
        "reviews": reviews,
        "lapses": lapses,
    })
    return concept


def main() -> int:
    if len(sys.argv) != 4:
        print("Usage: python record-review.py <course_dir> <concept_id> <rating>", file=sys.stderr)
        return 2

    course_dir = Path(sys.argv[1])
    concept_id = sys.argv[2]
    rating = int(sys.argv[3])
    if rating not in (1, 2, 3, 4):
        raise ValueError("rating must be 1, 2, 3, or 4")

    concepts_path = course_dir / "concepts.json"
    with concepts_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    now = datetime.now(timezone.utc)
    for concept in data["concepts"]:
        if concept["id"] == concept_id:
            update_concept(concept, rating, now)
            data["last_review_session"] = now.isoformat()
            write_json(concepts_path, data)
            print(json.dumps(concept, ensure_ascii=False))
            return 0

    raise KeyError(f"concept not found: {concept_id}")


if __name__ == "__main__":
    raise SystemExit(main())
