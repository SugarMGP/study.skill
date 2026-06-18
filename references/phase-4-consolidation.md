# Phase 4: 巩固（Consolidation & Review）

> Based on: Spaced Repetition (间隔重复) +
> FSRS (Free Spaced Repetition Scheduler / 自由间隔重复调度算法) +
> Anki due-count-as-reminder pattern (到期数即提醒)

## Scope

This file is the source of truth for review sessions and progress bulletins.

The skill does not create platform automations, scheduled tasks, hooks, push notifications, or thread wakeups. A "复习提醒" means: when the learner starts studying that day, the agent checks due items and shows a short prompt.

Load `references/fsrs-scheduler.md` for algorithm and storage format.

## Daily Session-Start Review Check

At the beginning of the first formal learning session of a day:

1. Run `{skill_dir}/scripts/check-reviews.py {learning_root}/.learning-profile`.
2. If script output is needed by the viewer or another deterministic consumer, use `--json`.
3. If the skill script is missing, stop and repair the skill installation before continuing.
4. If no overdue items exist, proceed normally and do not mention reviews.
5. If overdue items exist, present one compact line:

```text
⏰ 待复习：{total} 个知识点，可先用 2-5 分钟过一遍。
```

Ask whether to review now or continue the main lesson. Do not let review consume the session by default.

If the user chooses a full review, group by course:

```text
⏰ 待复习：
- React Hooks: 3 个（useState 用法、useEffect 依赖、useRef 区别）
- Go 并发: 2 个（goroutine 调度、channel 语义）

先复习哪个？还是都过一遍？
```

## Quick Review

Use this when the user wants to continue learning but accepts a short warm-up.

- Review 1-3 items, or 2-5 minutes.
- Prioritize lowest R (记忆可提取率) first, then highest D (难度), then fewest reviews.
- After quick review, return to the current module.

## Full Review Session

After user selects a course or says "都过一遍":

1. Present items in batches of 5-7.
2. For each item, ask for recall before showing the answer.

```text
📝 {n}/{total} — {course_name}

{question}

先回想一下，再看答案。

{answer}

你的回忆程度？
1 忘了  2 记得一点  3 记得大部分  4 轻松想起
```

3. After each rating, run `{skill_dir}/scripts/record-review.py`.
4. If the skill script is missing, stop and repair the skill installation. Do not hand-write review results.
5. R is computed, not stored.

After each batch:

```text
✅ 复习完成（{course_name}）
📊 {reviewed} 题 | 💚 {easy} 轻松 | 💡 {ok} 需加强 | ❌ {hard} 已遗忘
⏰ 下次复习：{next_date}
```

## Re-Learning Policy

Items with `lapses >= 3` and `R < 0.7` become `status: "needs_relearning"`.

These items should be reintroduced in a Phase 3 learning session, not drilled forever through review. Present them at session end:

```text
下面这些知识点不适合继续硬背，需要重新讲一遍：
- {concept_name}: {reason}
```

## Learning Bulletin

### Brief Status

Show this compact line at session start or when the user asks "现在学到哪了":

```text
📍 {current_module}（{completed}/{total}）| ⏰ {overdue} 待复习 | 🔥 {streak} 天
🎮 Lv.{level} · {xp} XP · 称号「{title}」
```

Omit the review segment when no due items exist. Omit RPG fields when `meta.json.rpg_enabled=false`.

### Full Bulletin

When user says "进度", "快报", "技能树", "review", or "复习", expand to:

- current course and exact module
- completed modules vs total modules
- current skill-tree node and missing evidence
- overdue review count grouped by course
- streak and recent sessions
- XP/level/title/achievement only when RPG is enabled
- next concrete learning task

## Streak Logic

- Learning day = completed >=1 meaningful learning section, completed >=1 module, or completed >=1 review session.
- Streak = consecutive calendar days with >=1 learning day.
- Gap resets to 1 after the next learning day. Do not guilt the learner.

## Encouraging Notes

Use concrete progress:

- Streak milestone: "连续 7 天，已经完成 {completed} 个模块，复习 {review_count} 次。"
- Module completion: "模块完成，你现在能 {capability}。"
- Return after gap: "上次是 {days} 天前，我们从 {concept} 接上。"
- All caught up: "今天没有到期复习，直接轻装上阵。"
- Struggling: "这个确实难。先抓住 {key_insight}，其他慢慢补。"
