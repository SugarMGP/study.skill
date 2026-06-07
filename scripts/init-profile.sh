#!/usr/bin/env bash
# Initialize .learning-profile directory for study.skill
# Usage: ./init-profile.sh [path] (default: ~/learning)

LEARNING_DIR="${1:-$HOME/learning}"
PROFILE_DIR="$LEARNING_DIR/.learning-profile"
PROGRESS_FILE="$PROFILE_DIR/progress.json"
REVIEW_FILE="$PROFILE_DIR/review-schedule.json"

mkdir -p "$PROFILE_DIR"
mkdir -p "$LEARNING_DIR/courses"
CREATED=()

# Create each file only if it doesn't already exist
if [ ! -f "$PROGRESS_FILE" ]; then
    cat > "$PROGRESS_FILE" << 'EOF'
{
  "skill_tree": {},
  "active_courses": {},
  "settings": {
    "default_daily_time": "30min",
    "target_retention": 0.9
  }
}
EOF
    CREATED+=("progress.json")
else
    echo "  progress.json already exists — skipped"
fi

if [ ! -f "$REVIEW_FILE" ]; then
    cat > "$REVIEW_FILE" << 'EOF'
{
  "items": [],
  "target_retention": 0.9
}
EOF
    CREATED+=("review-schedule.json")
else
    echo "  review-schedule.json already exists — skipped"
fi

if [ ${#CREATED[@]} -gt 0 ]; then
    echo "Learning profile initialized at $LEARNING_DIR"
    for f in "${CREATED[@]}"; do echo "  created: $f"; done
else
    echo "Learning profile already exists at $LEARNING_DIR (no files created)"
fi
echo "  courses/"
