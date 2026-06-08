# Phase 1: 调研（Research）

> Based on: course-builder quorum system (klausners) +
> Knowledge Space Theory (Doignon & Falmagne, 1985) +
> CSEAL MDP navigation (Liu et al., KDD 2019)

## Research Strategy

### Step 0: Material-Driven Mode Check

If the user provided materials in Phase 0 (syllabus, textbook, exam outline, past
papers), enter **material-driven research mode**:

**Primary source** = the user's materials. The material defines the scope.

**Research scope is constrained to the material topics.** Do NOT add topics outside
the syllabus. The goal is "只学要考的" — only what's tested.

**Research tasks (material-driven):**
1. Analyze the material for topic list, ordering, depth, and exam format
2. For each topic in the material, find 1-2 supplementary sources:
   - Chinese-language explanations/analogies for difficult concepts
   - Similar practice problems with solutions
   - Past exam papers from the same course/school if available
   - Official exercise answers if the material has exercises
3. Extract key concepts and their relationships from the material → Knowledge DAG
4. Map material chapters to learning modules

**Source count**: 1 primary (user's material) + 1-2 supplementary. Flag what's missing.

**If no materials provided**: proceed with standard research below.

### Source Priority (Standard Research)

Adapt sources to topic type. Default target: 3 quality sources (see Quality Rules below
for screening criteria). Material-driven, niche topics, or exam-prep scenarios may use
fewer — flag what's missing.

**For tech/programming topics**（默认）:
1. **官方文档** — Always first. Use ctx7 or WebFetch. Note version, changelog, API.
2. **优质源码** — Read core modules on GitHub. Extract architecture patterns, key designs.
3. **中文社区高星教程** — GitHub repos 1k+ stars, 掘金/CSDN/知乎 high bookmarks.
4. **补充**: 极客时间目录, arXiv, 面试题库

**For general/academic topics**（如学历史、学经济学、学心理学）:
1. **权威教材/课程大纲** — Top university syllabus, standard textbooks, MOOC structure
2. **中文高星学习资料** — GitHub repos, 知乎专栏, B站高播放课程, 豆瓣高分书单
3. **学术综述/入门论文** — arXiv or CNKI survey papers for the field
4. **补充**: 得到/极客时间相关专栏目录, 维基百科知识结构

**Source count:** Default target: 3 quality sources. Accept fewer when justified:
material-driven, niche topics, or exam prep where the syllabus IS the scope — but explicitly
note what's missing. Chinese source: include when quality permits; if none exists, declare
it and use English sources translated to Chinese explanations. Never pad with low-quality
sources to hit a quota.

### Parallel Research Dispatch

If your platform supports subagents: dispatch in parallel. If not: research sequentially
and clearly label the order. Never claim you dispatched subagents when you didn't.

Adapt dispatches to topic type: select sources by **quality**, not by tool name.

| Topic type | Primary source (must have) | Supplements |
|-----------|---------------------------|-------------|
| Tech API / library | Official docs (latest version) | Source code (architecture only), community tutorials |
| Tech architecture / principle | Source code of reference implementation | Official docs, architecture blog posts |
| Academic subject | Standard textbook / top university syllabus | Survey papers (arXiv/CNKI), Chinese learning resources |
| Exam prep | User's syllabus/past papers | Textbook, exam prep guides |

**Source count:** Target 3 quality sources. If user provides materials, they count as
the primary source — then 1-2 supplements suffice.

**Chinese source requirement:** Include at least 1 quality Chinese source when available.
If no quality Chinese source exists for this topic, say so explicitly and use English
sources translated to Chinese in your explanations. Never force low-quality Chinese
sources just to meet a quota.

### What to Extract

For each source, extract:

| Extraction | Purpose |
|-------------|---------|
| Core concepts and their relationships | → Knowledge Graph DAG nodes |
| Prerequisites (what must be learned first) | → DAG edges (requires relation) |
| Difficulty estimate (1-10 scale per concept) | → initial D value for spaced repetition |
| Common pitfalls and misconceptions | → 踩坑指南 content |
| "Golden example" per concept | → Best teaching example |
| Version-specific notes | → Version comparison tables |
| Interview / exam question patterns | → Q&A bank |
| Learning time estimates | → Module scheduling |

**Added for material-driven mode:**

| Extraction | Purpose |
|-------------|---------|
| Material chapter/section mapping | → module outline aligned with textbook |
| Exam format and question types | → practice problem generation |
| Grading criteria / 评分标准 | → what to emphasize in answers |
| Topic weight in exam | → module priority (high-weight topics first) |
| **Diagrams & visuals** | **→ collect quality existing images for reuse. Note URL + description. Prioritize: architecture diagrams, flowcharts, comparison tables, data visualizations.** |

### Output: Research Summary

Present findings. Adapt the format to topic type.

**For tech/programming topics:**

```
🔍 调研结果：{topic}

📊 信息来源：
- 官方文档：{url} (v{version})
- 源码分析：{repo} (key files: {file_list})
- 中文教程参考：{repo_list}

🧩 核心概念关系图：
{concept_A} ──requires──→ {concept_B}

⚠️ 常见误区与陷阱：
- ...

🎯 建议课程结构：
模块一：... ({n} 讲，难度 ★★☆☆☆)
模块二：... ({n} 讲，难度 ★★★☆☆)
模块三：... ({n} 讲，难度 ★★★★☆)
[模块四：面试高频考点 ({n} 讲)]

💡 调研笔记：
- {key insight 1}
```

**For general/academic topics:**

```
🔍 调研结果：{topic}

📊 信息来源：
- 权威教材/课程：{textbook_or_course_list}
- 中文学习资料：{zhihu_columns, bilibili_courses, douban_books}
- 学术综述：{arxiv_or_cnki_papers}

🧩 核心知识结构：
{concept_A} → {concept_B} → {concept_C}

⚠️ 常见误区与易混淆点：
- ...

🎯 建议课程结构：
模块一：... ({n} 讲，难度 ★★☆☆☆)
模块二：... ({n} 讲，难度 ★★★☆☆)
模块三：... ({n} 讲，难度 ★★★★☆)

💡 调研笔记：
- {key insight 1}
```

**For material-driven mode:**

```
🔍 调研结果：{topic} — 材料驱动

📎 参考材料：
- {material_type}: {summary}（{chapters_or_sections_covered}）

📊 补充来源：
- {supplementary_source_1}
- {supplementary_source_2}

📋 考试信息：
- 题型：{question_types}
- 重点章节：{weighted_topics}
- 备考建议：{exam_strategy_tip}

🧩 核心概念与章节映射：
第X章 {chapter_name} → {key_concepts}
第Y章 {chapter_name} → {key_concepts}

⚠️ 常见误区与失分点：
- ...

🎯 建议课程结构（对齐教材/考纲）：
模块一：{chapter_range} ({n} 讲，难度 ★★☆☆☆)
模块二：{chapter_range} ({n} 讲，难度 ★★★☆☆)
模块三：{chapter_range} ({n} 讲，难度 ★★★★☆☆)

💡 备考笔记：
- 这些章节占分值最高，优先学
- 这部分容易出大题，需要练习
```

### Gate

Ask: "这个范围和结构符合你的预期吗？需要增加/删除什么？"

### Quality Rules

- MUST cite specific URLs or identifiers, not generic references
- MUST note version/year of sources used
- **Source quality screening:** Prioritize official docs, textbooks, course syllabi, active
  repos with ≥1k stars (for popular topics; stars are a signal, not a threshold), peer-reviewed papers.
  unsourced articles, outdated versions without warnings, AI-generated slop.
- For conflicting sources, flag both with attribution and let user decide if scope is affected
