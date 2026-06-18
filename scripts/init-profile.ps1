#!/usr/bin/env pwsh
# Initialize .learning-profile directory for study.skill
# Usage: .\init-profile.ps1 [-Path <path>] (default: ~/learning)

param(
    [string]$Path = "$env:USERPROFILE\learning"
)

$profileDir = "$Path\.learning-profile"
$profileFile = "$profileDir\profile.json"
$coursesDir = "$profileDir\courses"

New-Item -ItemType Directory -Force -Path $profileDir | Out-Null
New-Item -ItemType Directory -Force -Path $coursesDir | Out-Null
New-Item -ItemType Directory -Force -Path "$Path\courses" | Out-Null
$created = @()

# profile.json
if (-not (Test-Path -LiteralPath $profileFile)) {
    $now = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    $profileJson = [ordered]@{
        schema_version = 4
        learner_id = "default"
        created_at = $now
        updated_at = $now
        preferences = [ordered]@{
            native_language = "zh"
            daily_time_budget_minutes = 30
            feedback_style = "normal"
            correction_mode = "inline"
        }
        learner_profile = [ordered]@{
            baseline = $null
            goals = @()
            known_languages = @()
            weak_prereqs = @()
            analogy_preferences = @()
            teaching_constraints = @()
            materials_summary = $null
            updated_at = $null
        }
    } | ConvertTo-Json -Depth 4
    [System.IO.File]::WriteAllText($profileFile, $profileJson + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
    $created += "profile.json"
} else {
    Write-Host "  profile.json already exists - skipped"
}

if ($created.Count -gt 0) {
    Write-Host "Learning profile initialized at $Path"
    foreach ($f in $created) { Write-Host "  created: $f" }
} else {
    Write-Host "Learning profile already exists at $Path (no files created)"
}
Write-Host "  courses\"
