# Phase 4: 巩固（Consolidation & Review）

> Based on: Spaced Repetition (Ebbinghaus, 1885; FSRS, Ye et al., 2022-2023) +
> Hooked Model (Eyal, 2014) + Fogg Behavior Model (Fogg, 2009) +
> Duolingo per-course isolation + Anki due-count-as-reminder pattern

## Prerequisites

Load `references/fsrs-scheduler.md` for algorithm and storage format.

## Session-Start: Review Check (Multi-Course)

Every session start, check due reviews before teaching new content, but keep the
prompt short:

1. Run `{learning_root}/.learning-profile/scripts/check-reviews.py {learning_root}/.learning-profile`.
2. If automation needs structured data, run the same script with `--json`.
3. If the script is missing, fall back to the manual algorithm in `fsrs-scheduler.md`.
4. If overdue items exist, present one compact line first:

```text
⏰ 待复习：{total} 个知识点，可先用 2-5 分钟过一遍。
```

Ask whether to review now or continue the main lesson. If the user chooses a
full review, then present grouped by course:

```
⏰ 待复习：
- React Hooks: 3 个（useState用法、useEffect依赖、useRef区别）
- Go并发: 2 个（goroutine调度、channel语义）

先复习哪个？还是都过一遍？
```

5. If no overdue items: proceed normally, do NOT mention reviews.

## Review Session

After user selects a course (or "都过一遍"):

1. Present items in batches of 5-7
2. For each item:

```
📝 {n}/{total} — {course_name}

{question}

（试着回忆...）

{answer}

你的回忆程度？
1⃣ 完全忘了  2⃣ 记得一点  3⃣ 记得大部分  4⃣ 轻松想起
```

3. After each rating: run `record-review.py` when available to update D, S, next_review, reviews, lapses, and status. R is computed, not stored.
   If the script is missing, use `fsrs-scheduler.md` and write through `write-state.py`.
4. After batch complete: present summary

```
✅ 复习完成（{course_name}）
📊 {reviewed} 题 | 💚 {easy} 轻松 | 💡 {ok} 需加强 | ❌ {hard} 已遗忘
⏰ 下次复习：{next_date}
```

## Re-Learning Policy

Items with `lapses >= 3` AND `R < 0.7`: set `status: "needs_relearning"`.
These will be re-introduced in a future Phase 3 learning session, not through review.
Present the list to user at session end.

## 学习快报

### Default: Brief Status (Session Start)

Show this compact line. Do NOT expand unless user asks.

```
📍 {current_module}（{completed}/{total}）| ⏰ {overdue} 待复习 | 🔥 {streak}天
{If rpg_enabled: 🎮 Lv.{level} · {xp} XP · 称号「{title}」}
```

### Full Bulletin (On Demand)

When user says "进度"/"快报"/"技能树"/"review"/"复习": expand to full bulletin
with progress bars per module, streak count, overdue details, encouraging note.
If `meta.json.rpg_enabled=false`, omit XP, levels, titles, achievements, and quests.

### Encouraging Notes

Use context-specific messages. Reference concrete progress:
- Streak milestones: "连续 7 天！{completed} 个模块，{review_count} 次复习"
- Module completion: "模块完成！{capability} 已解锁"
- Return after gap: "上次 {days} 天前。我们从 {concept} 继续，帮你接上。"
- All caught up: "复习全清！轻装上阵。"
- Struggling: "这个确实难。记住 {key_insight} 就行，其他慢慢来。"

## Streak Logic

- Learning day = completed ≥1 module OR ≥1 review session
- Streak = consecutive calendar days with ≥1 learning day
- Gap → reset to 1. No guilt: "休息是为了走更长远的路。"
