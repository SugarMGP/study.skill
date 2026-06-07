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

**Source count**: 1 primary (user's material) + 2 supplementary = 3 minimum.

**If no materials provided**: proceed with standard research below.

### Source Priority (Standard Research)

Adapt sources to the topic type. Must research at least 3 of the applicable sources:

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

**Minimum common requirement**: 3 sources, at least 1 from Chinese community.

### Parallel Research Dispatch

Use subagents for parallel research. Adapt based on topic type:

**For tech/programming topics:**
- Subagent A: Official docs + API reference via ctx7
- Subagent B: Source code structure analysis on GitHub (core modules, architecture)
- Subagent C: Chinese tutorial landscape and high-star repos (GitHub, 掘金, CSDN)

**For general/academic topics:**
- Subagent A: Top course syllabi, standard textbooks, MOOC structures (via web search)
- Subagent B: Chinese community learning resources (知乎专栏, B站课程, 豆瓣书单, GitHub repos)
- Subagent C: Academic overview / survey papers (arXiv for sciences, CNKI for Chinese humanities)

**For material-driven mode:**
- Agent: Read and analyze user's material — extract topic list, key concepts, exam format
- Subagent A: Supplementary explanations for difficult concepts in the material (Chinese sources)
- Subagent B: Similar practice problems + past exam papers matching the material scope

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

- MUST cite specific URLs, not generic references
- MUST note the version number of documentation used
- MUST cross-reference at least 2 sources for: (a) safety-critical facts, (b) version-breaking changes, (c) performance claims, (d) interview/ exam answers
- For standard API definitions and basic usage, official docs alone are sufficient
- If sources conflict, flag the conflict explicitly and present both views
