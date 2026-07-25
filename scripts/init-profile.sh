#!/usr/bin/env bash
# Initialize .learning-profile directory for study.skill
# Usage: ./init-profile.sh [path] (default: ~/learning)

LEARNING_DIR="${1:-$HOME/learning}"
PROFILE_DIR="$LEARNING_DIR/.learning-profile"
PROFILE_FILE="$PROFILE_DIR/profile.json"
COURSES_DIR="$PROFILE_DIR/courses"

mkdir -p "$PROFILE_DIR"
mkdir -p "$COURSES_DIR"
mkdir -p "$LEARNING_DIR/courses"
CREATED=()

# profile.json — global learner preferences
if [ ! -f "$PROFILE_FILE" ]; then
    cat > "$PROFILE_FILE" << EOF
{
  "schema_version": 5,
  "learner_id": "default",
  "created_at": "$(date -Iseconds)",
  "updated_at": "$(date -Iseconds)",
  "preferences": {
    "native_language": "zh",
    "daily_time_budget_minutes": 30,
    "feedback_style": "normal",
    "correction_mode": "inline"
  },
  "learner_profile": {
    "baseline": null,
    "goals": [],
    "known_languages": [],
    "weak_prereqs": [],
    "analogy_preferences": [],
    "teaching_constraints": [],
    "materials_summary": null,
    "updated_at": null
  }
}
EOF
    CREATED+=("profile.json")
else
    echo "  profile.json already exists — skipped"
fi

if [ ${#CREATED[@]} -gt 0 ]; then
    echo "Learning profile initialized at $LEARNING_DIR"
    for f in "${CREATED[@]}"; do echo "  created: $f"; done
else
    echo "Learning profile already exists at $LEARNING_DIR (no files created)"
fi
echo "  courses/"
