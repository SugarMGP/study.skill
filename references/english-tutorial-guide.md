# English Tutorial Writing Guide

> Based on Diataxis tutorials, Google Developer Documentation Style Guide,
> Microsoft Learn, MDN Web Docs, freeCodeCamp, The Odin Project, and Open edX.

This file defines English prose, chapter structure, and learner-facing writing style. Shared courseware mechanics such as diagrams, images, code blocks, and `study-*` exercise blocks live in `courseware-format.md`.

## Core Shape

An English tutorial should feel like a guided lesson, not a reference page. It must help the learner do something meaningful, see progress early, and check understanding before moving on.

Use this order:

```text
Goal -> prerequisites -> mental model -> guided example -> practice -> check -> recap -> next step
```

Keep the main path linear. Put optional branches and extra reading after the learner has completed the main task.

## Course Progression

**Technical topics:**

```text
Layer 1: Foundations (30%) -> build the mental model and run the first working example
Layer 2: Core practice (40%) -> apply the idea in realistic tasks
Layer 3: Advanced use (30%) -> trade-offs, failure cases, project/interview/exam practice
```

**General or academic topics:**

```text
Layer 1: Orientation (30%) -> define the problem and core vocabulary
Layer 2: Deep understanding (40%) -> theories, cases, arguments, evidence
Layer 3: Critical extension (30%) -> competing views, applications, current debates
```

## Chapter Template

Each chapter must include outcomes, prerequisites, a guided explanation, practice, and recap. Include mistakes and next steps only when they are concrete and useful. Headings can be adjusted for the subject, but do not remove the learning loop.

```markdown
# Chapter X: {Title}

## What you'll learn

By the end of this chapter, you will be able to:

- {Apply/Analyze-level outcome}
- {Apply/Analyze-level outcome}
- {Analyze/Evaluate-level outcome}

## Before you start

- {Required background}
- {Required tool, version, file, dataset, or reading}

## The idea in one minute

{Short plain-language explanation. Avoid slogans.}

## X.1 {Section title}

### Build the mental model

{Plain explanation -> precise term -> small example/case -> why it matters.}

{When a primary source helps here, add one short inline link and say what it is good for.}

{When the learner profile contains relevant prior experience, use a brief transfer analogy and state its limit when needed.}

### Try it

{A small task the learner can complete now. For code: command + expected output.}

### Check your understanding

{One recall or transfer question. Use a `study-*` block when the learner should answer before seeing the reference response.}

## X.2 {Section title}

{Repeat the same pattern and increase difficulty gradually.}

## Where learners often get stuck

{Add this only when there are real mistakes or misconceptions to address. Prefer placing the warning beside the relevant concept instead of forcing a separate table.}

## Recap

- {Key idea}
- {Decision rule}
- {Pitfall to remember}

## Optional next step

{One concrete next action, such as running a variant, completing a checkpoint, analyzing a case, or opening the next module because it answers a named gap. Omit this if the only thing to say is “continue to the next chapter.”}
```

Recommended chapter size: 2-4 sections. If a section needs more than 4 subtopics, split it.

## English Style Rules

### 1. Write for the learner at study

Use a friendly instructor voice. The learner should know exactly what to do next.

Good:

> In this step, you will make the state visible so you can see when it changes.

Weak:

> We will delve into state visibility in modern application development.

### 2. Use plain language before terms

Introduce the idea first, then name the term.

Good:

> A closure is a function that keeps access to the variables around it. The formal term is lexical closure.

Weak:

> Lexical closures capture their lexical environment.

### 3. Keep steps small and visible

Each guided example should have:

- a short reason for the step
- the exact action or code
- the expected result
- one sentence explaining what changed

Do not ask the learner to copy a large final program without intermediate checks.

### 4. Prefer active voice and second person

Use “you” when giving instructions. Prefer direct verbs.

Good:

> Run the test again. You should see one failing assertion.

Weak:

> The test should be run again so that one failing assertion can be observed.

### 5. Make prerequisites explicit

State what the learner needs before the chapter starts: prior concepts, installed tools, files, data, accounts, or time. If something is optional, mark it optional.

### 6. Show runnable examples honestly

For technical courses:

- list language/tool versions when they affect behavior
- include dependencies and setup commands
- show expected output
- run code before claiming it works
- if code was not executed, say so plainly

### 7. Place source links where they help

Do not create a default `resources.md` just to hold links. Put short official or
authoritative links next to the concept they clarify. Put course-level sources
in the course overview or syllabus. Create a separate appendix only when the
learner asks for it or the course links to it as part of the learning path.

Good:

> Learn more: React's official [`useState`](https://react.dev/reference/react/useState)
> reference is useful for checking parameters, return values, and canonical usage.

Rules:

- Prefer official docs, standards, textbooks, papers, or source repositories.
- Say why the link is useful in one sentence.
- Do not dump broad link lists inside the lesson body.
- Keep broad reading paths short and place them in the overview or syllabus
  unless a linked appendix has a clear use.

### 8. Use the learner profile when it reduces effort

Use explicit facts from `learner_profile` to choose examples and analogies:

- known programming languages
- weak prerequisites
- domain experience
- analogy preferences
- teaching constraints

If a Java developer is learning Python generators, compare the idea to lazy
iteration only as far as the comparison helps. State where it stops matching.
Do not force an analogy into every section.

### 9. Use checks, not long quizzes

Use one small active-recall or transfer question after a concept. Use a checkpoint near the end of the chapter. Save only useful evidence with `study-*` blocks from `courseware-format.md`.

### 9.5 Avoid orphan side artifacts

Do not generate standalone `glossary.md`, `practice.md`, `interview-qa.md`,
`exam-practice.md`, `flashcards.csv`, or `resources.md` by default. They are only
useful when the learning flow actually surfaces them.

Use these replacements:

- Define terms when they first appear. If a chapter has many terms, add a short
  chapter-local “Term check”.
- Put interview, exam, and end-of-chapter practice inside the relevant chapter
  as `study-transfer` or `study-checkpoint`.
- Add spaced-review items to `concepts.json` during Phase 3 after the learner has
  encountered the concept; do not pre-generate cards for unseen content.
- Export Anki CSV files, printable glossaries, or resource appendices only when
  the learner explicitly asks or a known tool will consume them. Link any export
  from the overview or relevant chapter and state its use.

### 10. Keep optional depth out of the main path

Put background reading, alternative approaches, and deeper theory after the main exercise. Label them as optional.

### 11. Use concrete mistakes only when they are real

Write mistakes as symptoms the learner can recognize:

- “The command cannot find the file.”
- “The component renders twice.”
- “The answer explains the definition but not the trade-off.”

Avoid vague warnings such as “be careful with complexity.” Do not invent mistakes to fill a template. If the mistake matters, place it near the concept or example where the learner can act on it.

## Forbidden Patterns

- Do not write marketing copy: “unlock your potential”, “revolutionary”, “game-changing”.
- Do not use AI filler: “delve into”, “in today's fast-paced world”, “seamlessly”, “robust and scalable” unless the words are technically necessary.
- Do not front-load history, taxonomy, or theory before the learner has a task.
- Do not turn the chapter into API reference. Link to reference material instead.
- Do not hide prerequisites or expected outputs.
- Do not add decorative diagrams or exercises that do not help the chapter goal.
- Do not generate side files that the viewer or Phase 3 learning flow will not read.
