# Phase 0: 锚定（Analysis）

> Based on: ADDIE Analysis phase (Florida State Univ, 1975) +
> Backward Design Stage 1: Identify Desired Results (Wiggins & McTighe, 2005) +
> Knowledge Space Theory (Doignon & Falmagne, 1985) +
> Game skill tree UX (PoE/Diablo talent tree design)

## Step 0: Topic Triage

Before asking any questions, determine if the user's topic is vague or specific.

### VAGUE TOPIC → Generate Skill Tree First

**Triggers**: "我想学编程", "学AI", "学大模型", "学前端", "学后端", "想转行IT", any topic that is a FIELD not a specific subject.

**Action**: Load `references/skill-tree.md` for the tree layout format only.
Generate a domain map using the 3-tier ASCII tree structure and node status icons
(✅🔄⬜🔒⭐). Present with guide text: "这就是 {领域} 的技能树。你现在站在哪？想往哪个方向走？"
**Omit all RPG elements**: no XP, no levels, no achievements, no daily quests, no boss nodes.

If user picks a node that is still too broad (e.g., "AI" → picks "机器学习" → still broad), zoom in one more level.

### SPECIFIC TOPIC → Go Directly to Q1

**Triggers**: "学 React Hooks", "学 PostgreSQL 索引", "学 Docker", topic is a concrete technology/skill.

### EDGE: User says "随便看看" / "有什么推荐"

Generate skill tree for a popular domain (programming/AI), show hot paths (⭐ recommended nodes), let user explore.

## Protocol

**Full mode（默认）:** Ask questions **one at a time**. Never batch multiple questions
in one message. Use user's answers to skip questions that are already answered.

**Lite mode（用户选 Quick Start / 速成 / 时间紧张时）:** Batch Q1+Q2+Q3 in one message.
Q4 follows separately. Don't repeat information the user already provided.

If arriving from skill tree navigation, Q1 is pre-answered (user's chosen node = their scope anchor).

### Q1: Scope — "想学到什么程度？"

Present these to the user — keep it short, no internal details. Remove day estimates
（每个人速度不同，无法预测）:

- 🏃 **速成导览** — 快速上手，能干活。适合紧急换技术栈。
- 📚 **系统精讲** — 从原理到实战全覆盖。适合深入掌握。
- 🎯 **面试冲刺** — 高频考点 + 手写题 + 项目追问。适合求职准备。
- 📝 **考试备考** — 对齐考纲，只学要考的。适合学校考试、考研考证。

If user's intent is unclear: "是工作需要快速上手，还是系统学？还是为了面试/考试？"

#### Agent Depth Rules (NOT shown to user)

These are internal quality constraints. Do NOT mention word counts or exercise counts
to the user — apply them silently when generating content.

| Mode | 字数/模块 | 思考题/模块 | 解释深度 |
|------|----------|------------|---------|
| 速成导览 | 800-2000 | 1-2 | 精简解释，跳过原理深挖和版本对比 |
| 系统精讲 | 2000-5000 | 3-5 | 3-5 个"为什么这样设计"，3-8 个对比表，常见误区+本章小结(5-7条) |
| 面试冲刺 | 500-1500 | 1 组追问 | 聚焦 1 个高频考点，含代码骨架+参考解法+追问+评分标准+面试陷阱 |
| 考试备考 | 800-2000 | 3-5 | 1-2 核心概念+推导，含练习题答案，标注考频和分值权重 |

Code examples and diagrams are NOT constrained — include whenever they aid understanding.

### Q1.5: Materials — "手头有现成材料吗？"

Especially important for 考试备考 mode, but useful for any mode.

```
📎 有教学大纲、教材、考纲、课件、历年题吗？
   有的话给我看看（贴文本/给文件路径/给链接都行），
   我按材料来规划，只学要考的，不学多余的。
```

**What to accept:**
- 📄 教学大纲 / 考试大纲 — defines exact scope and topic list
- 📖 教材 / 电子书 — primary learning source
- 📝 课件 / 讲义 — topic ordering and emphasis
- 🎯 历年真题 — exam patterns, difficulty, question types
- 📋 课程要求 / 作业 — what's actually assessed

**If user provides materials:**
1. Read the material (file, pasted text, or URL)
2. Extract: topic list, ordering, depth, exam format, key concepts
3. The material becomes the **primary scope constraint** — don't add topics not in the syllabus
4. Skip Q1 if the material defines the scope (e.g., "covering Chapters 1-5 for midterm")
5. Continue to Q2 with the material as context

**If user doesn't have materials:** proceed to Q2 normally.

### Q2: Baseline — "当前基础怎么样？"

Options:
- 🟢 零基础：完全不熟悉这个领域
- 🟡 有相关经验：了解类似技术，或有编程基础
- 🔴 熟练但想深入：已经在用，想理解底层原理和最佳实践

If user selects 🟡 or 🔴, offer a pretest:
"要不要做个快速摸底？（3-5 题，2 分钟）这样我可以跳过你已经会的，不浪费时间。"
- If user accepts: generate 3-5 questions covering the topic's core concepts.
  Questions should test application, not trivia. Skip modules where user scores ≥85%.
- If user declines: proceed with self-reported level.

Implications:
- 零基础 → 更密集的类比，"先记住一句话"口诀，慢节奏
- 有基础 → 快速过基础，聚焦进阶和原理
- 熟练 → 跳过基础模块，直接进入原理、最佳实践、面试题

### Q3: Time — "每天能投入多少时间？总共预计学多久？"

Daily: 15 分钟 / 30 分钟 / 1 小时 / 2 小时+
Total: 3 天 / 1 周 / 2 周 / 1 个月 / 不限

Implications:
- 15min/day → micro-learning chunks (2-10 min per module), compact explanations
- 2h/day → full Gagné Nine Events cycle per session, deeper dives
- Short total → fewer modules, focus on essentials (80/20 principle)

### Q4: Location — "学习目录放哪里？"

This is the `{learning_root}` — a base directory that will contain ALL your
learning data. Structure: `{learning_root}/.learning-profile/` (state) +
`{learning_root}/courses/{course-slug}/` (course files).

Default: `{user_home}/learning` if not specified.
Never overwrite existing content.

### Gate: 学习路线图预览

After all questions answered, synthesize. Adapt format to mode:

```
📋 学习路线图：{topic}

👤 学习者画像：{baseline} → {scope}
⏱️ 预计：{total_time}，每天 {daily_time}
📁 存放位置：{learning_root}

{If material-driven:}
📎 参考材料：{material_summary}
   → 课程范围：{extracted_scope}

🗺️ 路线概览：
模块一：{name} — {n} 讲，预计 {days} 天
模块二：{name} — {n} 讲，预计 {days} 天
模块三：{name} — {n} 讲，预计 {days} 天
{For 考试备考:}
🎯 考试对标：覆盖 {exam_name} {topics_covered}
```

Ask: "这个路线 OK 吗？需要调整哪里？" — **Wait for user confirmation before Phase 1.**

## Edge Cases

| Scenario | Handling |
|----------|----------|
| User provides syllabus but no time estimate | "考试/提交什么时候？" — use that as deadline |
| User provides materials in a format agent can't read | "这个格式我读不了。把关键内容贴给我就行：考哪些章节、什么题型、什么时候考？" |
| Materials are very long (>50 pages syllabus) | "材料挺多，我先扫一下结构。你告诉我重点看哪几部分？" |
| User has both a textbook AND wants to supplement | Phase 1: textbook = primary source, web research = supplementary exercises and explanations |
| User says "随便" / idk | Show a popular domain skill tree: "看看编程/AI的技能树？挑个感兴趣的方向？" |
| User has no time estimate | "先按一周每天30分钟规划，后面可以调整？" |
| Topic too broad (e.g., "学AI") | **Generate skill tree first**. "AI 太大了，先看看技能树，你想走哪个分支？" |
| User picks a node but it's still broad | Zoom in one more level. "机器学习也很大——监督学习/深度学习/NLP/CV，你对哪个更感兴趣？" |
| Topic too narrow (e.g., "学 React useState") | Offer: "这是个具体 API，我帮你做个快速教学（10分钟），还是扩展为 React Hooks 系统学习？" |
| User is a returning learner | Read `.learning-profile/progress.json` first. Show skill tree with progress. "上次你学到 {node}，继续还是换方向？" |
| User wants to switch path/mode | Show skill tree. "从这里切过去？" Allow change. Update profile. |
| User says "看看进度" / "技能树" | Load `references/skill-tree.md`. Render current skill tree with all progress. |
| User completes a module | Update node progress. |
