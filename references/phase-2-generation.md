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

### Step 3: Quality Gate (Single Source of Truth)

Before outputting any module, check against this tiered checklist.
**Foundation 模块** (intro/basics, Tier 1): use Foundation column.
**Core 模块** (main content, Tier 2): use Core column.
**Enrichment 模块** (advanced/optional, Tier 3): use Enrichment column.

| Requirement | Foundation | Core | Enrichment |
|-------------|-----------|------|------------|
| **Learning objectives** | 2-3 at Understand/Apply | 3-5 at Apply/Analyze | 2-3 at Analyze/Evaluate |
| **Diagram** | [SHOULD] if structure complex; else table/examples OK | [MUST] if content involves流程/架构/层级/对比/依赖; else table/examples OK | [SHOULD] |
| **大白话→术语→例子/代码→小结** | [MUST] | [MUST] | [MUST] |
| **思考题 + 参考思路** | [MUST] 1-2 questions | [MUST] 2-3 (1 apply + 1 analyze) | [SHOULD] 1-2 |
| **建议下一步** | [MUST] | [MUST] | [MUST] |
| **Source citations** | [MUST] primary source | [MUST] primary + 1 supplement | [SHOULD] |
| **踩坑指南** | [MUST] ≥2 pitfalls | [MUST] ≥2 pitfalls | [SHOULD] |
| **面试题/考试题** | [SHOULD] in 面试/考试 mode | [MUST] in 面试 mode | [SHOULD] |
| **Analogy + decision criteria** | [MUST] | [MUST] | [SHOULD] |
| **No AI writing traces** | [MUST] | [MUST] | [MUST] |

**Diagram rules** (3-tier priority):
1. Reuse existing quality images from research sources → `![](path)` + cite source
2. Platform image gen for complex diagrams (>15 nodes, UI mockups, visual explanations) → `![](path)` + Mermaid source in `<details>`
3. Mermaid code block (universal fallback)

**Quality gate protocol:** If any [MUST] item fails → fix and re-check. Max 2 retries. On 3rd failure, present with flagged warning.

**Bloom keywords:** Understand = 描述 解释 总结. Apply = 实现 解决 修改 操作. Analyze = 对比 分析 区分 归类. Evaluate = 评估 判断 论证.

**Max course size:** 30 讲 total. Split into series if larger.

### Step 4: File Output (Incremental)

Course directory grows module by module. After each confirmed module, append
its content to the course directory. Module 00 creates the root structure;
subsequent modules add their files incrementally.

```
{learning_root}/courses/{course-slug}/
├── README.md              # Course overview (Module 00)
├── syllabus.md             # Full syllabus with learning objectives per module
├── 01-{module-name}/
│   ├── content.md          # Module body
│   └── exercises/          # Placeholder — exercises created interactively in Phase 3
├── 02-{module-name}/
│   └── content.md
├── ...
├── flashcards.csv          # Knowledge items for spaced repetition (appended incrementally)
├── interview-qa.md         # Interview Q&A (面试冲刺 mode, appended incrementally)
├── exam-practice.md        # Exam practice problems (考试备考 mode, appended incrementally)
├── glossary.md             # 术语表 (appended incrementally)
└── resources.md            # Further reading / reference links (appended incrementally)
```

### Generation Rules

1. **Module 00 first, get confirmation, then generate all remaining modules in one pass.**
   The outline IS the contract. No per-module confirmation.
2. **Generate flashcards.csv** — 3-8 items per module as the course is generated
3. **Generate interview-qa.md** only if 面试冲刺 mode
4. **Generate exam-practice.md** only if 考试备考 mode — practice problems aligned with exam format
5. **Generate glossary.md** as terminology is introduced
6. **Do NOT pre-generate exercises/solution.md** — exercises presented interactively in Phase 3
7. **Depth per mode:** See `phase-0-anchoring.md` Q1 for per-mode word count, code block,
   exercise, diagram, and pitfall requirements. These are NOT suggestions — check each
   module against its mode's spec before finalizing.
