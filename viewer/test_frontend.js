const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync(__dirname + "/assets/viewer.js", "utf8").replace(
  /\}\)\(\);\s*$/,
  "window.__test = { renderMarkdown, COURSE_MATH_DELIMITERS, isCurrentLearningPage, mainCourseLearningPages, evidenceLabel, skillTreeStatus, skillNodeNextStep, masteryChallengeQuestion, currentSessionPageKey, hasCurrentPageView, countReviewForSession, beginReviewForSession, finishReviewForSession, persistQuestionChange, setState: value => { STATE = value; }, setSessionStartedAt: value => { SESSION_STARTED_AT = value; }, setLastPageSessionKey: value => { LAST_PAGE_SESSION_KEY = value; }, reviewCount: () => SESSION_REVIEW_RATED_COUNT, pendingReviewCount: () => SESSION_PENDING_REVIEW_COUNT, hasPendingQuestionSave: () => PENDING_QUESTION_SAVE_SESSION === SESSION_STARTED_AT }; })();"
);
const sandbox = {
  window: { matchMedia: () => ({ matches: false }) },
  document: { addEventListener: () => {} },
  marked: { parse: text => text.replace(/\\([\[\]()])/g, "$1") }
};
vm.runInNewContext(source, sandbox);

const api = sandbox.window.__test;
assert.equal(api.renderMarkdown("\\[x + y\\] and \\(z\\)"), "\\[x + y\\] and \\(z\\)");
assert.equal(api.renderMarkdown("套餐 $5/月，另一个 $10/月"), "套餐 $5/月，另一个 $10/月");
assert.equal(api.COURSE_MATH_DELIMITERS.some(item => item.left === "$"), false);
assert.equal(api.COURSE_MATH_DELIMITERS.some(item => item.left === "$$"), true);

api.setState({
  current_module: "01-basics",
  current_section: "",
  current_content_file: "demo/01-basics/content.md",
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", content_path: "demo/01-basics/01-lesson/content.md" }]
  }]
});
assert.equal(api.isCurrentLearningPage(), false);

api.setState({
  current_module: "01-basics",
  current_section: "01-lesson",
  current_content_file: "demo/01-basics/01-lesson/content.md",
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", content_path: "demo/01-basics/01-lesson/content.md" }]
  }]
});
assert.equal(api.isCurrentLearningPage(), true);

api.setState({
  current_module: "99-content-supplements",
  current_section: "01-extra",
  current_content_file: "demo/99-content-supplements/01-extra/content.md",
  modules: [
    {
      id: "01-basics",
      has_content: true,
      content_path: "demo/01-basics/content.md",
      sections: [{ id: "01-lesson", title: "先看一个失败请求", content_path: "demo/01-basics/01-lesson/content.md" }]
    },
    {
      id: "99-content-supplements",
      has_content: true,
      content_path: "demo/99-content-supplements/content.md",
      sections: [{ id: "01-extra", content_path: "demo/99-content-supplements/01-extra/content.md" }]
    }
  ],
  domain_tree: {
    nodes: {
      "01-basics": { name: "请求基础", status: "available" },
      "02-core": { name: "核心机制", status: "locked", prerequisites: ["01-basics"] },
      "99-content-supplements": { name: "内容补充", status: "available" }
    }
  },
  learning_record: { pages: [] }
});
assert.deepEqual(Array.from(api.mainCourseLearningPages(), page => page.module), ["01-basics"]);
assert.equal(api.isCurrentLearningPage(), true);
assert.equal(api.skillTreeStatus("unlockable").label, "可挑战");
assert.equal(api.evidenceLabel("exam"), "应试作答");
assert.equal(api.evidenceLabel("field-investigation"), "field investigation");

const startStep = api.skillNodeNextStep("01-basics", {
  name: "请求基础",
  status: "available",
  missing_evidence: ["recall", "apply", "explain"]
}, "available");
assert.equal(startStep.kind, "navigate");
assert.equal(startStep.label, "开始「先看一个失败请求」");

const lockedStep = api.skillNodeNextStep("02-core", {
  name: "核心机制",
  status: "locked",
  prerequisites: ["01-basics"]
}, "locked");
assert.equal(lockedStep.kind, "note");
assert.equal(lockedStep.label, "先完成「请求基础」后解锁");

api.setState({
  modules: [{
    id: "01-basics",
    has_content: true,
    content_path: "demo/01-basics/content.md",
    sections: [{ id: "01-lesson", title: "先看一个失败请求", content_path: "demo/01-basics/01-lesson/content.md" }]
  }],
  domain_tree: { nodes: { "01-basics": { name: "请求基础", status: "in_progress" } } },
  learning_record: {
    pages: [{
      module: "01-basics",
      section: "01-lesson",
      content_file: "demo/01-basics/01-lesson/content.md",
      completed_at: "2026-07-26T00:00:00Z"
    }]
  }
});
const challengeStep = api.skillNodeNextStep("01-basics", {
  name: "请求基础",
  status: "in_progress",
  mastery_gate: { apply: 1, explain: 1 },
  missing_evidence: ["apply", "explain"]
}, "in_progress");
assert.equal(challengeStep.kind, "challenge");
assert.equal(challengeStep.label, "申请掌握挑战");
assert.equal(challengeStep.detail, "掌握挑战：独立完成 1 道应用题、用自己的话讲清 1 个核心概念");
assert.equal(
  api.masteryChallengeQuestion("请求基础", challengeStep.detail),
  "请在内容补充中为「请求基础」添加掌握挑战：独立完成 1 道应用题、用自己的话讲清 1 个核心概念，并带我开始。"
);

api.setSessionStartedAt("2026-07-26T01:00:00Z");
const firstSession = api.currentSessionPageKey();
api.setLastPageSessionKey(firstSession);
assert.equal(api.hasCurrentPageView(), true);
assert.equal(api.countReviewForSession(firstSession), true);
assert.equal(api.reviewCount(), 1);
assert.equal(api.beginReviewForSession(firstSession), true);
assert.equal(api.pendingReviewCount(), 1);
assert.equal(api.finishReviewForSession(firstSession), true);
assert.equal(api.pendingReviewCount(), 0);

api.setSessionStartedAt("2026-07-26T02:00:00Z");
assert.equal(api.hasCurrentPageView(), false);
assert.equal(api.countReviewForSession(firstSession), false);
assert.equal(api.beginReviewForSession(firstSession), false);
assert.equal(api.finishReviewForSession(firstSession), false);
assert.equal(api.reviewCount(), 1);
assert.equal(api.pendingReviewCount(), 0);

(async () => {
  api.setState({
    server_mode: "interactive",
    course_slug: "demo",
    current_module: "01-basics",
    current_section: "01-lesson",
    current_content_file: "demo/01-basics/01-lesson/content.md"
  });
  sandbox.fetch = () => Promise.reject(new Error("temporary failure"));
  await assert.rejects(api.persistQuestionChange("question_added", "retry me", true), /temporary failure/);
  assert.equal(api.hasPendingQuestionSave(), false);
  console.log("viewer frontend behavior checks passed");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
