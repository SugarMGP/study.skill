# Phase 4: 巩固（Consolidation & Review）

> Based on: Spaced Repetition (Ebbinghaus, 1885; FSRS, Ye et al., 2022-2023) +
> Ebbinghaus Forgetting Curve (1885) +
> Hooked Model (Eyal, 2014) +
> Fogg Behavior Model (Fogg, 2009) +
> Progress Tracking Protocol (human-skill-tree, 24kchengYe)

## Prerequisites

Load `references/fsrs-scheduler.md` for algorithm implementation details.

## Five-Point Progress Tracking Protocol

From human-skill-tree. Execute ALL five at every session.

### 1. Track Mastery Signals

Note what the learner grasps vs. struggles with. Flag specific errors for revisiting.

- ✅ Mastery signals: correct without hesitation, can explain to agent, spots own errors
- ⚠️ Struggle signals: repeated mistakes, asks for hints on previously-covered material, inconsistent performance
- Flag format: `{concept}: {specific_error} — revisit in {X} sessions`

### 2. Open with Active Recall

Quiz on 1-2 key points from previous material at session start. NOT "do you remember..." but specific questions that require retrieval:

```
🗣️ 快速回顾：
1. 上次学的 {concept}，用自己的话说一下核心思路？
2. 为什么 XXX 比 YYY 更适合 {scenario}？
```

### 3. Cross-Reference Weak Spots

If concept B builds on concept A and A was flagged as weak, revisit A before teaching B.
Track the dependency chain: "B depends on A → A was weak → review A first."

### 4. Spaced Callbacks

Reintroduce old material at increasing intervals:
- Within the same session: after teaching new concept, ask "这和上周的 XXX 有什么联系？"
- Next session: open with recall (Point 2)
- 3 sessions later: interleave into an exercise: "用 XXX 和 YYY 一起解决这个问题"
- 7 sessions later: capstone exercise that requires the concept

### 5. Celebrate Concretely

From human-skill-tree + Bandura (1977) self-efficacy theory.
Reference **specific improvement** — never empty praise.

| Instead of... | Say... |
|---------------|--------|
| "很好！" | "上次这个概念花了 15 分钟，这次 5 分钟就通了" |
| "你学得真快" | "你已经能独立写出 XXX 了，上周还需要参考示例" |
| "加油！" | "这个模块里你解决了 3 个之前卡住的问题" |

Always reference a **before/after contrast** or a **specific action**.

## Session-Start Review Check

Every time the skill is invoked:

1. Read `.learning-profile/review-schedule.json`
2. For each item, compute `R = e^(ln(0.9) * days_since_review / S)`
3. Items with `R < target_retention` (default 0.9) are overdue
4. If overdue items exist:

```
⏰ 复习提醒：{overdue_count} 个知识点到复习时间了。

最近到期的：
- {concept_1}（{days_overdue} 天前到期）
- {concept_2}（{days_overdue} 天前到期）
- {concept_3}（今天到期）

先花 {estimated_minutes} 分钟复习一下？
[ 先复习 / 跳过 / 只看今天到期的 ]
```

## Review Session Format

Present items in **batches of 5-7** (cognitive load limit from english-immersion research).

For each item:

```
📝 第 {n}/{total} 题

{question}

（试着回忆，不要偷看答案...）

{user signals ready → show answer}

{answer}

你的回忆程度？
1️⃣ 完全忘了
2️⃣ 记得一点（很费劲才想起来）
3️⃣ 记得大部分（有点犹豫）
4️⃣ 轻松想起

Reply with 1/2/3/4:
```

After each rating:
- Update D, S, R via the simplified scheduling formulas (see `references/fsrs-scheduler.md`)
- Set `last_review = today`, `next_review = today + interval`
- Increment `reviews` (and `lapses` if rated 1 or 2)

### Post-Review Summary

```
✅ 复习完成！

📊 本次复习：{reviewed} 题
💚 掌握稳定：{count_rated_4} 题
💛 需要加强：{count_rated_3} 题
❤️ 已遗忘：{count_rated_12} 题  ← 已加入重新学习列表

⏰ 下次复习日：{next_review_date}
```

### Re-Learning Policy

Items with `lapses >= 3` AND `R < 0.7`: set `status: "needs_relearning"` in the review
schedule record (do NOT delete). These concepts should be re-introduced in a future
learning session. Present the list to user in session end summary.

## 学习快报（Learning Bulletin）

### Default: Brief Status (Session Start)

Show this compact status. Don't render the full bulletin unless user asks.

```
📍 {current_module_name}（{completed}/{total} 模块） | ⏰ {overdue} 待复习 | 🔥 {streak}天
🎯 今日建议：{next_action_or_review_prompt}
```

### Full Bulletin (On Demand)

When user says "进度"/"快报"/"技能树" or any status query, render the complete
bulletin with progress bars per module, streak count, overdue count, and
encouraging note. The full format is a multi-line box with sections for each
active course showing progress bars and next recommended action.

### Encouraging Notes Pool

Rotate contextual messages. Follow the "concrete celebration" principle — reference specific actions/improvements, never empty praise.

**Streak milestones (concrete + warm):**
- Day 1: "第一步迈出去了。今天你学了 {topic}，这是一个起点。"
- Day 3: "连续 3 天了。上次你卡在 {concept}，现在已经能自己写出来了。"
- Day 7: "7 天！你完成了 {completed_count} 个模块，复习了 {review_count} 个知识点。这不是三分钟热度。"
- Day 30: "一个月。{completed_count} 个模块，{total_hours} 小时。这是你亲手垒起来的。"
- Day 100: "100 天。你已经不是'在学习'了——你已经是会 {skill} 的人了。"

**Module completion (reference what was gained):**
- "模块完成！现在你已经能 {specific_capability} 了。三天前你还不会这个。"
- "又拿下一个。这个模块里你解决了 {stuck_points} 个卡点。"

**Return after gap (warm, no guilt):**
- "欢迎回来！上次你学到了 {concept}。我们先花 2 分钟回顾一下，帮你接上。"
- "好久不见。不用担心，不会丢的。我们从上次的 {concept} 继续。"

**All reviews caught up (acknowledge the effort):**
- "复习全清！{review_count} 个知识点，一个都没落下。"
- "温故知新——你上次复习 {concept} 是 {days_ago} 天前，今天全对。"

**Struggling (validate + concrete path):**
- "这个确实难。{concept} 是很多人都卡住的地方。记住 {key_insight} 这一点就行，其他的慢慢来。"
- "觉得难说明你在学有价值的东西。我们换个角度：试试 {alternative_approach}？"

## Progress File Format

`.learning-profile/progress.json`:

```json
{
  "skill_tree": {
    "domain": "大模型应用开发",
    "nodes": {
      "llm-basics": {"status": "mastered", "progress": 100, "started": "2026-06-01", "completed": "2026-06-03"},
      "prompt-eng": {"status": "mastered", "progress": 100, "started": "2026-06-04", "completed": "2026-06-07"},
      "lowcode": {"status": "available", "progress": 0},
      "framework": {"status": "in_progress", "progress": 40, "started": "2026-06-08"},
      "agent-proj": {"status": "locked", "progress": 0}
    },
    "stats": {
      "total_sessions": 12,
      "total_hours": 18.5,
      "best_streak": 7
    }
  },
  "active_courses": {
    "llm-app-dev": {
      "slug": "llm-app-dev",
      "name": "大模型应用开发 从零到一学习指南",
      "scope": "系统精讲",
      "baseline": "有Python基础",
      "total_modules": 12,
      "completed_modules": ["01-llm-basics", "02-prompt-eng"],
      "current_module": "03-langchain",
      "start_date": "2026-06-01",
      "last_session": "2026-06-08",
      "total_sessions": 12,
      "streak_days": 8,
      "total_reviews": 56,
      "storage_path": "/home/user/learning/courses/llm-app-dev"
    }
  },
  "settings": {
    "default_daily_time": "30min",
    "target_retention": 0.9
  }
}
```

RPG display elements (levels, XP, titles, quests, achievements, boss nodes)
are defined in `references/skill-tree.md` and rendered only when the user
asks for "技能树" / "进度" / "成就". They are NOT part of the default
Phase 4 session flow.

## Streak Logic

- A "learning day" = any day where user completed at least 1 module OR 1 review session
- Streak = consecutive calendar days with at least 1 learning day
- If no activity for 1 calendar day → streak resets to 1 on next activity
- Do NOT shame user for broken streaks. "休息是为了走更长远的路。从今天重新开始？"
