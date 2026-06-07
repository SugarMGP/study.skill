#!/usr/bin/env pwsh
# Initialize .learning-profile directory for study.skill
# Usage: .\init-profile.ps1 [-Path <path>] (default: ~/learning)

param(
    [string]$Path = "$env:USERPROFILE\learning"
)

$profileDir = "$Path\.learning-profile"
$progressFile = "$profileDir\progress.json"
$reviewFile = "$profileDir\review-schedule.json"

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
New-Item -ItemType Directory -Force -Path "$Path\courses" | Out-Null
$created = @()

# Create each file only if it doesn't already exist
if (-not (Test-Path -LiteralPath $progressFile)) {
    @'
{
  "skill_tree": {},
  "active_courses": {},
  "settings": {
    "default_daily_time": "30min",
    "target_retention": 0.9
  }
}
'@ | Set-Content -LiteralPath $progressFile
    $created += "progress.json"
} else {
    Write-Host "  progress.json already exists — skipped"
}

if (-not (Test-Path -LiteralPath $reviewFile)) {
    @'
{
  "items": [],
  "target_retention": 0.9
}
'@ | Set-Content -LiteralPath $reviewFile
    $created += "review-schedule.json"
} else {
    Write-Host "  review-schedule.json already exists — skipped"
}

if ($created.Count -gt 0) {
    Write-Host "Learning profile initialized at $Path"
    foreach ($f in $created) { Write-Host "  created: $f" }
} else {
    Write-Host "Learning profile already exists at $Path (no files created)"
}
Write-Host "  courses/"
