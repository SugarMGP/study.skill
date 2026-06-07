# Phase 2: 生成（Course Generation）

> Based on: Backward Design Stage 3 (Wiggins & McTighe, 2005) +
> Gagné's Nine Events (Gagné, 1965) +
> Bloom's Taxonomy Revised (Anderson & Krathwohl, 2001) +
> Chinese tutorial conventions (ai-agents-from-zero, rust-course, 极客时间)

## Prerequisites

Before entering this phase:
- Phase 0 completed: user confirmed 学习路线图
- Phase 1 completed: user confirmed research scope
- Load `references/chinese-tutorial-guide.md` for writing standards

## Generation Pipeline

### Step 1: Generate Course Overview (Module 00)

Generate the course README.md. This is the first thing the user sees.
Write to `{learning_root}/courses/{course-slug}/README.md`.

```markdown
# {课程名} 从零到一学习指南

> **开篇词：** {why learn this? what will you be able to do after? —— 极客时间模式}

## 📖 课程地图

{complete module index with links — CS-Notes/JavaGuide 模式}

## 🔰 适合人群

- ✅ {who should take this}
- ⚠️ 前置知识：{prerequisites}

## 🗺️ 学习路线图

```
模块一：{name}（基础入门，30%）
  ├── 第1讲：{title}
  ├── 第2讲：{title}
  └── ...

模块二：{name}（核心能力，40%）
  └── ...

模块三：{name}（进阶深入，30%）
  └── ...
```

{For tech topics:}
## 🛠️ 环境准备

{install instructions, versions, IDE setup}

{For general topics:}
## 📖 推荐阅读/资源

{textbooks, courses, papers, reading paths}

## 📊 学习进度

{progress tracking will be auto-generated during Phase 3}

## 📚 资源索引

{For tech topics:}
- [官方文档]({url})

{For any topic:}
- [术语表](./glossary.md)

{For interview-oriented tech topics:}
- [面试题库](./interview-qa.md)

- [扩展资源](./resources.md)
```

Wait for user to review Module 00 before generating remaining modules.
Ask: "课程大纲 OK 吗？我开始写具体内容？"

### Step 2: Generate Module by Module — Sequentially

**DO NOT generate all modules at once.** Context overflow and unverified content risk.

1. Generate Module 00 (course overview / README.md)
2. Present to user → **wait for confirmation**
3. Generate Module 01 → present → confirm
4. Repeat for each module

For each module, follow the chapter template in `references/chinese-tutorial-guide.md`.

### Step 3: Quality Gate

Before outputting any module, check against the tiered checklist below.
Items are tagged: **[MUST]** = always required, **[SHOULD]** = required when applicable.

```
Output Quality Checklist:
[MUST] ✓ 3-5 measurable learning objectives (Bloom's Apply/Analyze minimum)
[MUST] ✓ Uses "大白话→术语→例子/代码→小结" pattern per section (code for tech, examples for general)
[SHOULD] ✓ Code examples are runnable with Chinese annotations (for tech topics)
[SHOULD] ✓ Comparison tables, flowcharts, or diagrams (when structure is complex)
[MUST] ✓ 思考题 with 参考思路 (thought process, not just answers)
[MUST] ✓ Ends with explicit 建议下一步
[MUST] ✓ Cites sources: official docs / source code / authoritative tutorial
[MUST] ✓ 踩坑指南 (at least 2 common pitfalls)
[SHOULD] ✓ 面试题链接 (required for 面试冲刺 mode, optional otherwise)
[MUST] ✓ Uses analogies and decision criteria ("when to use / when not")
[SHOULD] ✓ Version notes (when API changed across versions)
[MUST] ✓ No AI writing traces (no 夸大象征意义, 三段式, 空洞连接词)
```

Key changes from the chinese-tutorial-guide template:
- Code examples → only for tech/programming topics
- Diagrams → only when structure is complex enough to warrant them
- Interview questions → only in 面试冲刺 mode
- At least 2 pitfalls, not 3 (avoid filler)

### Step 4: File Output

Write the complete course to `{learning_root}/courses/{course-slug}/`:

```
{course-slug}/
├── README.md              # Course overview (Module 00)
├── syllabus.md             # Full syllabus with learning objectives per module
├── 01-{module-name}/
│   ├── content.md          # Module body
│   └── exercises/
│       ├── ex01.md         # Exercise description
│       └── solution.md     # Reference solution (hidden by default)
├── 02-{module-name}/
│   └── content.md
├── ...
├── flashcards.csv          # All knowledge items for spaced repetition import
├── interview-qa.md         # Interview Q&A (面试冲刺 mode)
├── exam-practice.md        # Exam practice problems (考试备考 mode)
├── glossary.md             # 术语表 (terminology index)
└── resources.md            # Further reading / reference links
```

### Generation Rules

1. **Generate modules sequentially** — Module 00 first, confirm, then Module 01, confirm, repeat. Do NOT batch-generate.
2. **Generate flashcards.csv incrementally** — append 3-8 items per module as each is confirmed
3. **Generate interview-qa.md** only if 面试冲刺 mode, and incrementally
4. **Generate exam-practice.md** only if 考试备考 mode — extract practice problems aligned with exam format
5. **Generate glossary.md** incrementally as terminology is introduced
6. **Do NOT pre-generate exercises/solution.md** — exercises are presented interactively in Phase 3
