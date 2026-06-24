# Phase 2: 生成（Course Generation）

> Based on instructional design principles, documentation frameworks, and tutorial conventions.

## Prerequisites

Before entering this phase:

- Phase 0 completed: user confirmed the learning route.
- Phase 1 completed: user confirmed the research scope.
- Read `profile.json.learner_profile` when available; use it to adapt examples, analogies, prerequisites, and explanations.
- Load `references/courseware-format.md` for shared courseware rules.
- Load one language guide for learner-facing prose:
  - Chinese output: `references/chinese-tutorial-guide.md`
  - English output: `references/english-tutorial-guide.md`

Default course language follows the user's request and profile. If unclear, use Chinese. If the user explicitly asks for English or bilingual output, route to the English guide or ask once for the learner-facing language.

Do not start writing `README.md`, `syllabus.md`, module `content.md`, or section `content.md` files until `courseware-format.md` and the selected language guide have been read in this turn.

## Responsibility Boundary

This file is the source of truth for course generation: file layout, Module 00, module generation order, quality gate, course-size diagnostics, verification rules, and generation sequence.

It does not define diagram syntax, source-artifact handling, pure-practice rules, or `study-*` block schemas. Those live in `courseware-format.md`. It does not define live teaching or mastery decisions. Those live in `phase-3-learning.md`.

Load `learning-viewer.md` only when exact player-supported syntax, viewer startup, or learning records are needed.

## Completion Rule

Do not claim a course, module, code example, or exercise is complete until the relevant quality gate has been checked. If runnable code was not executed, say so in your chat handoff or internal completion note, not inside learner-facing course files.

After the course generation phase is complete, treat the main course as frozen unless the user explicitly asks to revise the original files. Later clarifications, deeper explanations, extra exercises, practice papers, retellings, and errata discussions go through the `99-content-supplements` workflow defined in `courseware-format.md`.

## Natural Structure Rule

Do not force a repeated heading template. Keep the learning loop instead: goal -> prerequisite -> concrete entry point -> explanation -> example/case/code -> decision rule -> practice -> recap. Headings should fit the topic and language. Do not require slogans such as "先记住一句话" or "The idea in one minute".

Generation must apply the shared teaching completeness rules in `courseware-format.md`: self-contained lessons, material-driven course rules, pure-question practice section rules, source-to-courseware bridging, first-use concept introduction, section pass standard, complete demonstrations for procedural topics, image/source-question explanation, exercise progression, and narrow section merge rules. Phase 2 decides sequence and scope; do not redefine those shared rules here.

Before telling the user the course is ready, compare the generated files with this reference and fix missing learning-loop requirements directly in the files.

## Output Standard

Generate real, runnable courses. Do not dump links or generic outlines.

Every module should contain:

- learning objectives stated as learner-observable outcomes (e.g., "you can write...", "you can judge when...")
- a short preface in `{module}/content.md`: previous-module bridge when relevant, core problem, prerequisites, section map, why the section order matters, and end capability
- section pages under `{module}/{section}/content.md`; section split and merge rules come from `courseware-format.md`
- beginner-facing entry points before definitions in foundation sections
- plain-language intuition followed by precise terms
- first-use concept introductions according to `courseware-format.md`
- examples, code, cases, or worked reasoning
- active recall or transfer practice
- decision criteria
- real pitfalls or misconceptions when the topic has source-backed or practice-backed ones
- concise recap; a concrete continuation action only when the next module builds on this one
- source notes for non-trivial claims, code, images, diagrams, and data; link placement and export rules come from `courseware-format.md`

Course files are for learners. Do not include design notes, generation rationale, tool choices, internal field names, or agent self-evaluation unless they are part of the hidden machine-readable exercise block format defined in `courseware-format.md`.

Course files must follow the runtime-note isolation rule in `courseware-format.md`: generator environment limits and verification caveats belong in the chat handoff, not in learner-facing lessons.

## Learner Profile Adaptation

Use `profile.json.learner_profile` as a teaching aid, not as a place to invent facts. Apply only explicit profile data:

- `known_languages`: use brief transfer analogies when the learner_profile lists a known_language or analogy_preference that maps to the concept. Example: if the learner knows Java and is learning Python decorators, compare decorator syntax to wrapping a method with an annotation-like idea, then explain where the analogy breaks.
- `weak_prereqs`: insert compact prerequisite refreshers before the concept that depends on them; do not turn the module into a different course.
- `analogy_preferences`: choose examples from the learner's familiar domain, such as backend, systems, math, design, or writing.
- `teaching_constraints`: obey exclusions and preferences explicitly. If the user said "不要把 Python 放进主线", use only the minimum Python syntax needed.

Every analogy must state at least one way it breaks. Do not force cross-language comparisons into every section; use them only where the learner_profile has a matching known_language or analogy_preference.

## Source Link Routing

Use the sources discovered in Phase 1, but follow `courseware-format.md` for where links, citations, resources, terminology notes, and optional exports live. This phase only decides whether a source item belongs in the course scope and which module or section teaches it.

## Step 1: Generate Course Overview (Module 00)

Generate `{learning_root}/courses/{course-slug}/README.md`. This is the first learner-facing file.

Use the language selected for the course. For Chinese, use the wording pattern in `chinese-tutorial-guide.md`. For English, use the wording pattern in `english-tutorial-guide.md`.

Minimum content:

```markdown
# {Course title}

> {Short opening: why this course matters and what the learner will be able to do}

## Course Map

{Complete module index. Use plain text module and section names; avoid Markdown
links to section files because the local viewer navigates through its course
tree.}

## Who This Is For

- {Learner profile}
- Prerequisites: {prerequisites}

## Learning Path

{Module tree with sections and the rough role of each module}

{For tech topics:}
## Environment Setup

{Install instructions, versions, IDE/editor setup, expected first check}

{For general topics:}
## Core Materials

{Textbooks, courses, papers, reading path}

## Progress

{Progress tracking will be updated during Phase 3}

## Main Sources

- {Primary source and why it is useful}
- {Supplement source and why it is useful}
```

Wait for user review of Module 00 before generating remaining modules unless the user has already explicitly asked to skip further confirmations after route approval.

Chinese prompt: `课程大纲 OK 吗？我开始写具体内容？`

English prompt: `Does this outline look right? I can start writing the modules next.`

## Step 2: Generate Remaining Modules

After Module 00 is confirmed, generate `syllabus.md` and all remaining modules in one pass. The Module 00 outline is the contract. No per-module confirmation is needed unless the user pauses or asks to revise the outline.

**Interleaved quality checkpoint:** Every 3 modules generated, pause internally to check the last 3 for generation fatigue (do not ask the user for confirmation; this is an agent-internal gate):
- Exercise count per module is not dropping (>=80% of the first 3 modules' average).
- No `study-*` answer field has regressed to template placeholders ("参考答案应包含…" etc.).
- Module preface section descriptions are section-specific (not identical boilerplate repeated across all sections).
- No new extraction traces or raw artifacts have appeared.
If the checkpoint fails, fix the degraded modules before continuing to the next 3.

`syllabus.md` minimum content:

- module order, section titles, and learning objectives
- prerequisites and unlock order when relevant
- mode-specific emphasis, such as interview follow-ups or exam question forms
- the fixed `99-content-supplements` module, titled "内容补充", marked as always available and outside the main learning path
- short course-level source list, limited to sources that actually shaped the syllabus
- links to optional appendices only when those appendices were explicitly requested or have a runtime consumer

**Course structure guard:** one course should stay within <=12 modules and <=60 section pages. If the outline exceeds either limit, split it into a series of separate courses before writing modules. Do not use "batch generation" to hide an oversized single course. Batches are only for context management inside a course that already passes the structure guard.

The fixed `99-content-supplements` module is outside this structure guard. Do not count it as one of the <=12 main modules or its future supplement sections as part of the <=60 main section pages.

For each module:

- Write a module preface in `{module}/content.md`; limit it to the core problem, section order rationale, and end capability (3 paragraphs max). Each section's description must state what that specific section teaches — do not repeat the same phrase across 3 or more sections (e.g. "按 PPT 对应页学习定义、公式、例题和解题方法" applied to every section). Follow `courseware-format.md` for section list and link rules.
- Write each teachable unit as `{module}/{section}/content.md`.
- Before writing section bodies, map every Phase 1 extracted source item (concept, example, procedure, API, theorem, diagram, question form) to at least one section. If a source item is omitted, the reason must be grounded in the confirmed scope — do not let source content silently disappear through summarization.
- For material-driven courses, extend the map with source role and source order: each PPT/lecture/textbook unit must be marked as concept explanation, formula, code, figure/table, worked example, exercise, summary, or transition. Preserve the original teaching order unless a scoped reason requires splitting or merging.
- Apply `courseware-format.md` for concept introductions, source fragments, complete demonstrations, section split/merge, diagrams, media, code examples, and saveable practice.
- Follow the selected language guide's learner-facing prose rules.
- Check mode-specific depth rules from `phase-0-anchoring.md`.
- Generate the lesson at the depth the source and learner need. Do not limit the first draft by the selected mode's prose band. The mode band in `phase-0-anchoring.md` is a post-generation diagnostic: if the finished module is far below it, expand missing explanation/examples/practice; if far above it, consider trimming redundant wording or splitting the module, but do not remove required examples, diagrams, worked solutions, source fragments, or interactive questions only to satisfy a number.
- Apply `learner_profile` adaptations from this file before writing examples and explanations.
- For novice learners, weak prerequisites, or Tier 1 modules, start from a small concrete example in the relevant section before introducing abstract terms, formulas, real-scale systems, or official API detail.
- If a planned section is a pure-question practice section, do not apply the normal teaching-loop template to that section. Follow `courseware-format.md` pure-question rules exactly: `answer` and `explanation` may stay inside `study-*` blocks for post-submit reveal, but visible prose outside the blocks must remain question-only.


### Exam Crash Course Depth Rule

When mode is `exam`, do not treat "快速备考" or "crash course" as a request for short summaries. It means shorten the route by cutting non-priority material, while expanding the named exam points enough that the learner knows how to answer questions.

Use this source hierarchy:

1. Final-review deck, exam syllabus, past papers, or teacher-marked "重点/掌握/必考" items decide scope and priority.
2. Chapter decks, textbook chapters, and lecture notes provide teaching order, original terms, examples, diagrams, and exercises.
3. Non-exam chapters or concepts are omitted, or reduced to one-sentence recognition notes when they help choices or true/false questions.

For every item explicitly named by the final-review or exam-scope material, the generated section must include:

- what it means in learner-facing language following the style rules in chinese-tutorial-guide.md or english-tutorial-guide.md
- why it matters for this exam
- how it appears as a question form
- one worked example, SQL/formula/procedure, diagram reading, or judgment rule when the item requires solving, designing, querying, calculating, or comparing
- common confusion, scoring point, or answer keyword if explicitly stated in the source material
- one exam-tagged `study-*` exercise when the item is likely to be tested

A section is too shallow if it only lists named concepts without showing how to answer exam questions about them. If one material chapter contains many named exam points, split by exam point cluster; do not pack the chapter into one summary section.

### Depth And Coverage Rule

Depth is measured by both prose size and learning activity coverage:

- prose size: learner-facing explanation is checked after generation against the selected mode's diagnostic bands in Phase 0. The bands are not hard caps and must not suppress useful teaching.
- concept coverage: section split and merge rules come from `courseware-format.md`.
- source coverage: important source or research items must be taught, bridged, practiced, or explicitly omitted for a scoped reason; they must not disappear through silent summarization.
- activity coverage: every module must include answerable practice through `study-*` blocks when answers should be saved or revealed after submission.
- evidence coverage: interview and exam modes must include scoring criteria, answer rubrics, or worked solution steps; system mode must include why/how, boundaries, and transfer checks.
- exam priority coverage: exam mode must separate "重点掌握" from "了解"; high priority points get explanation plus exam handling, while low priority points stay short.
- answerability coverage: for every teaching section, ask whether a learner who did not attend the original class can complete at least one same-type task after reading this section. If not, the section needs more concept explanation, symbol/code walkthrough, worked example, decision boundary, or targeted practice.
- material fidelity coverage: material-driven courses must preserve source order, source examples, formulas, figures, code, exercises, and teacher-marked emphasis unless the confirmed scope explicitly omits them.

## Step 3: Quality Gate

Before outputting any module, check against this tiered checklist.

**Foundation 模块 / Tier 1**: intro/basics. **Core 模块 / Tier 2**: main content. **Enrichment 模块 / Tier 3**: advanced/optional.

| Requirement | Foundation | Core | Enrichment |
|-------------|-----------|------|------------|
| Learning objectives | 2-3 at Understand/Apply | 3-5 at Apply/Analyze | 2-3 at Analyze/Evaluate |
| Beginner entry before definitions | [MUST] concrete scene/problem + why it matters | [SHOULD] unless prior module already prepared it | [OPTIONAL] |
| Language-specific natural writing rules | [MUST] | [MUST] | [MUST] |
| Problem entry -> concept explanation -> minimum complete example/source item -> step-by-step breakdown -> decision boundary -> practice -> recap | [MUST] keep the learning loop; simplify step-by-step breakdown when the concept has only one or two trivial steps | [MUST] | [MUST] |
| Diagram or equivalent visual structure | [SHOULD] if structure is complex; else table/examples OK | [MUST] when content involves flow/architecture/hierarchy/contrast/dependency; else table/examples OK | [SHOULD] |
| Interactive practice | [MUST] 1-2 learner-answerable questions across the module; use `courseware-format.md` exercise blocks when answers should be saved or unlocked after submit | [MUST] 3-6 learner-answerable questions across section pages, covering recall + apply/analyze/explain evidence through `mastery_tags` | [SHOULD] 1-2 learner-answerable questions |
| Source citations | [MUST] primary source | [MUST] primary + 1 supplement | [SHOULD] |
| Inline authoritative links | [SHOULD] for APIs/core concepts | [MUST] for official API/library concepts and important primary sources | [SHOULD] |
| Real pitfalls or misconceptions | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [SHOULD] when source-backed or practice-backed; integrate near the relevant concept | [OPTIONAL] |
| Interview/exam practice | [SHOULD] in interview/exam mode | [MUST] in interview mode | [SHOULD] |
| Analogy or concrete mental model + decision criteria | [MUST] | [MUST] | [SHOULD] |
| Source-to-section coverage | [MUST] important material points are taught or scoped out with reason | [MUST] every important researched/source point has a section home and enough explanation | [MUST] optional points are clearly marked as optional, not silently lost |
| Image/source-question explanation | [MUST] explain how to read reused figures, tables, source questions, or code | [MUST] explain how each reused source artifact becomes understanding, answer, code, or judgment | [SHOULD] when source artifacts are included |
| Exercise progression | [SHOULD] include recognition plus one apply/explain check for core items | [MUST] avoid single-point memory-only checks for core items; include apply/analyze/explain evidence | [SHOULD] |
| Learner-profile adaptation | [SHOULD] when profile has relevant facts | [MUST] when profile has relevant known languages, weak prereqs, or constraints | [SHOULD] |
| Answerability gate | [MUST] learner can explain, do, judge, or answer one same-type task without opening the source material | [MUST] learner can complete the section's target task or answer form with worked support | [MUST] optional content still states what capability it gives |

Cross-tier rules (apply across all tiers where the context matches):

- **Source fragment use**: [MUST] follow `courseware-format.md` source-fragment rule for Foundation/Core; [SHOULD] for Enrichment.
- **Complete demonstration for procedural topics**: [MUST] follow `courseware-format.md` complete-demonstration rule for Foundation/Core; [SHOULD] for Enrichment.
- **First-use concept introduction**: [MUST] follow `courseware-format.md` first-use concept rule for all tiers.
- **Mode-specific depth coverage**: [MUST] structural coverage from Phase 0 for all tiers; length checked only after generation.
- **No extraction, template, or AI writing traces**: [MUST] for all tiers. No source extraction labels, no repeated generic scaffold, no batch-reused filler, no AI-slop phrasing. See `chinese-tutorial-guide.md` and `english-tutorial-guide.md` Forbidden Patterns for the forbidden-phrase criteria.

**Material-driven quality gate:** When the course is based on PPT, lecture notes, textbook chapters, exam outlines, past papers, or teacher materials, apply the material-driven rules in `courseware-format.md` and also check the generation result as a whole:

- Does the module order preserve the source order and teaching emphasis, instead of turning the course into a generic topic outline?
- Does every source formula explain each symbol and when the formula is used?
- Does every source code sample explain the input, execution path, output or failure mode, and what the learner should notice?
- Does every source example, figure, table, or exercise become a taught example, a readable artifact, or a scoped omission with a reason?
- Are image-only formulas, code, diagrams, tables, and questions embedded as local screenshots when they could not be extracted reliably, with source position and reading focus noted? Only mark source-image review when the screenshot itself could not be obtained.
- Are extraction traces absent from learner-facing files, unless the user explicitly requested page-by-page source notes?
- If a section is marked as pure practice, does it contain only title, question text, needed data tables, code snippets, and `study-*` blocks whose answers or explanations stay inside the post-submit reference panel?

**Exam exercise density:** In exam mode, every named exam point listed in the syllabus must have at least one exam-tagged `study-*` exercise in its section. A section with zero exercises is incomplete regardless of prose quality.

**Exam module quality gate:** In exam mode, also check:

- Does the module clearly separate high-priority "must master" content from low-priority recognition content?
- Are all final-review or syllabus named points assigned to a module and covered in the section body?
- Does each high-priority point include at minimum: one worked example, one judgment rule, and one exam-tagged study-* exercise?
- Are non-priority concepts compressed or removed instead of stealing space from tested points?
- Does the learner know what to write, calculate, query, design, or judge in an answer?
- Do calculation, design, SQL/query, proof, diagram-reading, or procedure topics include worked steps?
- Could the learner answer the tested item after reading only this section, even if they never opened the original review deck?

**Blocking learner-perspective review:** After the whole course is generated and before saying it is ready, run a full-course review from the learner's point of view. This review is blocking: course completion must not be claimed until every item below passes.

**Review method:** Prefer a subagent when the platform supports subagents. Ask it to act as a learner matching the user's stated baseline, or as a zero-baseline learner if no profile is known. Give it the generated course files and, for material-driven courses, the source outline or extracted material notes.

**Subagent-unavailable protocol (self-review):** If subagents are unavailable, the current agent must perform a structured self-review. Self-review bias is real; use these steps to mitigate it:
1. List every module and section file path.
2. For each section, write one sentence: "After this section, the learner can _____" without opening the section file — test whether the section title and your memory of its content are enough to fill that blank concretely.
3. Compare the generated course's concept list against the Phase 1 research key concepts. Flag every researched concept that has no section home.
4. For material-driven courses, check each source unit (PPT page, textbook section, exam point) against the module outline. Mark whether it was taught, practiced, or omitted with scoped reason.
5. Compile findings into a brief internal review note listing: total sections checked, sections with missing learning-loop pieces, source-content gaps, and extraction/template traces found.

**Review checklist** — every generated course must pass all items. Mark each as PASS or FAIL with a brief note:

1. **Order coherence**: Can a learner with the stated baseline follow the module and section order without confusion? Check that prerequisites are taught before they are needed.
2. **Self-contained sections**: For every section, pick one concept/example/exercise. Can a learner understand it without opening external source material? If the answer depends on a figure or code only in the source, it must be embedded in the course file.
3. **Concept introduction**: Does every section introduce new terms, symbols, or API names on first use? No unexplained jargon that appeared earlier without definition.
4. **Complete demonstrations**: For every code, SQL, formula, or procedure section, is there a full worked example with input/output/explanation? No keyword-only or snippet-only teaching.
5. **Exercise quality**: Do core-module exercises include at least one apply/analyze/explain question (not all recall-only)? Are answer/explanation fields inside `study-*` blocks (not visible before submit)?
6. **Source coverage**: Are all Phase 1 researched important points taught in a section, or deliberately omitted with a scoped reason? Nothing should silently disappear.
7. **Material fidelity** (material-driven courses only): Does the module order preserve the source materials' teaching order? Are source formulas, code, figures, tables, and teacher-marked emphasis points taught (not just mentioned)?
8. **No extraction or template traces**: No "原课件页 N", "PPT 第X页", "原始内容整理", "本章对应 PPT", batch-reused paragraph scaffolds, raw script/code artifacts (e.g. `$(@{…})` PowerShell dumps), or AI-slop phrasing in learner-facing prose.
9. **Pure-practice sections** (if any): Do they contain only question text + `study-*` blocks? No visible answers, hints, explanations, or learning advice outside the blocks.
10. **Answerability**: For a randomly chosen section from each module, could a learner complete at least one same-type task without the source material?
11. **No template/placeholder answers**: Every `study-*` answer field contains a concrete, learner-checkable answer. No meta-instructions like "参考答案应包含…", "参考思路", or agent-facing placeholder text. If an answer describes what a good answer *should* contain rather than providing it, the exercise is incomplete.
12. **No slide-by-slide structure**: Section body is organized by concept, not by source page number. No headings like "原课件页 N", "Page X of PPT", or any per-page structural pattern with 5+ consecutive page-numbered headings. Content must be rearranged into concept-driven sections regardless of which source page the material came from.

This review is blocking. If any item fails, revise the course files and re-run the review. Max 2 full retries. On the 3rd failure or time constraint, present the course with a flagged warning listing the remaining failures — never claim completion when items fail. Do not replace this step with a script report.

**Diagnostic protocol:** After generation, run `scripts/check-course-depth.py` on the generated course or module. It reports non-symbol character counts and advisory scan findings for extraction traces, pure-practice contamination, and repeated template-like lines. Treat any section below the selected mode diagnostic band as requiring inspection for missing items from `courseware-format.md`: complete example, step breakdown, figure/source-question explanation, common error, decision boundary, or exercise progression. Treat every flagged phrase as requiring rewrite unless it is a verbatim quote from source material (with citation). Treat long modules as review prompts to trim redundant wording or split mixed goals. The report is advisory: a module may remain above the band when the extra material is useful, source-backed, and not redundant, and a clean report does not replace the quality gate or the blocking learner-perspective review.

**Quality gate protocol:** If any [MUST] item fails, fix and re-check. Max 2 retries. On the 3rd failure, present with a flagged warning instead of pretending the module is complete.



## Verification Rules

- Runnable code must actually run before claiming it works.
- Non-runnable technical content must be checked against official docs/source.
- Do not write execution/verification caveats into `README.md`, `syllabus.md`, module `content.md`, or section `content.md`; report them to the user outside the course files.
- General or academic claims need source cross-checks.
- Exam-prep content must align with the syllabus or provided materials.
- Material-driven and research-driven courses must preserve important source points through the source-to-section map. If content was compressed or omitted, the reason must come from confirmed scope, not from convenience.
- Courseware structure must be checked against this file, `courseware-format.md`, and the selected language guide. Do not rely on a separate validation script as the primary quality mechanism.

## Step 4: File Output

Module 00 creates the root structure and course contract. After the user confirms Module 00, write all remaining module files in the same generation pass.

See `references/courseware-format.md` for the definitive course file structure. Key constraint: every course must include `README.md`, `syllabus.md`, `{module}/content.md` prefaces, `{module}/{section}/content.md` sections, and `99-content-supplements/content.md`.

Default course content must stay on the path that Phase 3 and the local viewer actually read. Side artifacts and exports follow `courseware-format.md`.

## Generation Rules

1. **Module 00 first, confirmation second, remaining modules third.** If the user has explicitly waived later confirmations, use the confirmed route as the contract and continue.
2. Put learner-facing questions in the relevant module or section `content.md`; use `study-*` blocks for questions that should be saved or should reveal reference content only after the learner submits.
3. Create `99-content-supplements/content.md` for every new course. Future supplemental lessons, practice papers, retellings, or expansions append under this module as section pages. Follow `courseware-format.md`; do not create ad hoc side folders for supplements.
4. Do not create side files by default; terminology, links, interview/exam practice, review items, and exports follow `courseware-format.md`.
5. Generate or update `domain-tree.json` when `meta.json.skill_tree_enabled=true`. Nodes must mirror the confirmed syllabus, and the `99-content-supplements` node must remain always available/unlocked. RPG fields are included by default when `meta.json.rpg_enabled=true`.
6. Depth per mode comes from `phase-0-anchoring.md` Q1. Generate first for structural coverage and teaching completeness; use module/section prose bands only as post-generation diagnostics. Code examples, source fragments, images, tables, formulas, and diagrams are not constrained by prose length; include them whenever they help understanding.
7. Before offering to start Module 01, self-check every generated file against the natural learning-loop requirements, quality gate, and `courseware-format.md`.
8. Once this generation pass is handed off as complete, do not later edit mainline course files as a casual improvement. Use `99-content-supplements` for additions unless the user explicitly asks to revise original course content.

## Ownership Map

| Concern | Source of truth |
| --- | --- |
| Module 00, syllabus, course files, quality gate, course structure guard, length diagnostics | this file |
| Shared courseware structure, Markdown/media/code syntax, source-artifact handling, pure-practice rules, and `study-*` block schemas | `courseware-format.md` |
| Chinese explanation style and natural chapter/section rules | `chinese-tutorial-guide.md` |
| English explanation style and natural chapter/section rules | `english-tutorial-guide.md` |
| Exact viewer startup, supported runtime syntax, learning record behavior | `learning-viewer.md` |
| Live teaching and mastery decision | `phase-3-learning.md` |
| Review scheduling and due-item checks | `phase-4-consolidation.md` + `fsrs-scheduler.md` |
