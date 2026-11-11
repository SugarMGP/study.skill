(function() {
  "use strict";

  let STATE = null;
  let QUESTIONS = [];
  let REVIEW_RATED = [];
  let EXERCISES = [];
  let CHECKPOINTS = [];
  let TOKEN = "";
  let SESSION_STARTED_AT = new Date().toISOString();
  let SESSION_QUESTION_COUNT = 0;
  let SESSION_REVIEW_RATED_COUNT = 0;
  let SESSION_PENDING_REVIEW_COUNT = 0;
  let PENDING_QUESTION_SAVE = Promise.resolve();
  let PENDING_QUESTION_SAVE_SESSION = "";
  let LAST_PAGE_SESSION_KEY = "";
  let PAGE_VIEW_PENDING_SESSION = "";
  let DRAWER_TRIGGER = null;
  let MODAL_ZOOM = 1;
  const COMPLETED_PAGE_KEYS = new Set();
  const SESSION_COMPLETED_PAGE_KEYS = new Set();
  const SESSION_SUBMITTED_EXERCISE_IDS = new Set();
  const EXPANDED_MODULES = new Set();
  const SUPPLEMENT_MODULE_ID = "99-content-supplements";
  let isDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

  const COURSE_MATH_DELIMITERS = [
    { left: "$$", right: "$$", display: true },
    { left: "\\[", right: "\\]", display: true },
    { left: "\\(", right: "\\)", display: false }
  ];
  const SKILL_TREE_STATUS = {
    mastered: { label: "已掌握", badge: "viewer-soft-badge is-success" },
    in_progress: { label: "进行中", badge: "viewer-soft-badge" },
    recommended: { label: "推荐", badge: "viewer-soft-badge" },
    unlockable: { label: "可挑战", badge: "viewer-soft-badge" },
    available: { label: "可学习", badge: "viewer-soft-badge is-muted" },
    locked: { label: "未解锁", badge: "viewer-soft-badge is-muted" }
  };
  const EVIDENCE_LABELS = {
    recall: "独立回忆",
    apply: "独立应用",
    explain: "自主解释",
    debug: "纠错",
    review: "延迟复习",
    analyze: "分析与推理",
    interview: "面试表达",
    exam: "应试作答",
    practice: "练习",
    misconception: "易错点纠正"
  };
  const ACHIEVEMENT_LABELS = {
    first_module: "首章通关",
    foundation_complete: "基础层完成"
  };
  const CALLOUT_META = {
    NOTE: { cls: "is-note", label: "提示 · Note" },
    TIP: { cls: "is-tip", label: "技巧 · Tip" },
    IMPORTANT: { cls: "is-important", label: "重点 · Important" },
    WARNING: { cls: "is-warning", label: "注意 · Warning" },
    CAUTION: { cls: "is-caution", label: "警告 · Caution" }
  };

  function tokenFromHash() {
    const hash = window.location.hash || "";
    const tokenMatch = hash.match(/token=([^&]+)/);
    return tokenMatch ? decodeURIComponent(tokenMatch[1]) : "";
  }

  function init() {
    const token = tokenFromHash();
    if (!token) {
      showError("打开方式不正确，请从课程入口重新打开。");
      return;
    }
    TOKEN = token;

    applyThemeClass();
    updateThemeBtn();
    updateThemeAssets();

    if (typeof marked !== "undefined" && marked.setOptions) {
      marked.setOptions({
        gfm: true,
        breaks: false,
        pedantic: false,
        highlight: function(code, lang) {
          if (typeof hljs !== "undefined") {
            if (lang && hljs.getLanguage(lang)) {
              try { return hljs.highlight(code, { language: lang }).value; } catch(e) {}
            }
            try { return hljs.highlightAuto(code).value; } catch(e) {}
          }
          return code;
        }
      });
    }

    fetchInitialState(token);
    window.addEventListener("hashchange", reloadFromHash);
  }

  function applyThemeClass() {
    if (!document.documentElement) return;
    document.documentElement.classList.toggle("dark", Boolean(isDark));
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }

  function reloadFromHash() {
    const token = tokenFromHash();
    if (!token) {
      showError("打开方式不正确，请从课程入口重新打开。");
      return;
    }
    if (token === TOKEN) return;
    TOKEN = token;
    LAST_PAGE_SESSION_KEY = "";
    fetchInitialState(token);
  }

  async function fetchInitialState(token) {
    try {
      const resp = await fetch("/api/initial-state?token=" + encodeURIComponent(token));
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "HTTP " + resp.status + ": " + resp.statusText);
      STATE = data;
      renderAll();
    } catch(e) {
      showError("加载初始状态失败: " + e.message);
    }
  }

  function hydrateLearningRecord() {
    const record = STATE.learning_record || {};
    QUESTIONS = Array.isArray(record.questions_for_llm) ? record.questions_for_llm.slice() : [];
    REVIEW_RATED = ((record.review_summary || {}).items || []).slice();
    EXERCISES = Array.isArray(record.exercises) ? record.exercises.slice() : [];
    CHECKPOINTS = Array.isArray(record.legacy_checkpoints) ? record.legacy_checkpoints.slice() : [];
    seedCompletedPageKeys(record);
  }

  function seedCompletedPageKeys(record) {
    COMPLETED_PAGE_KEYS.clear();
    for (const page of record.pages || []) {
      if (!page || !page.completed_at) continue;
      COMPLETED_PAGE_KEYS.add(pageKeyFromParts(page.module, page.section, page.content_file));
    }
  }

  function showError(msg) {
    const el = document.getElementById("content");
    if (el) {
      el.innerHTML = '<div class="viewer-card"><div class="viewer-card-body"><div class="error-box">' + escapeHtml(msg) + "</div></div></div>";
    }
    notify(msg, "error");
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }

  function escapeJsArgAttr(s) {
    return escapeAttr(JSON.stringify(String(s)));
  }

  function notify(msg, type) {
    if (typeof document === "undefined" || typeof document.getElementById !== "function") return;
    const host = document.getElementById("viewer-toast-host");
    if (!host) return;
    const item = document.createElement("div");
    item.className = "viewer-toast" + (type === "error" ? " is-error" : type === "success" ? " is-success" : "");
    item.textContent = msg;
    host.appendChild(item);
    setTimeout(() => {
      item.remove();
    }, type === "error" ? 3000 : 1800);
  }

  function refreshIcons() {
    if (typeof window.lucide !== "undefined" && typeof window.lucide.createIcons === "function") {
      try { window.lucide.createIcons(); } catch(e) {}
    }
  }

  function ratingLabel(rating) {
    const labels = { 1: "忘了", 2: "记得一点", 3: "记得大部分", 4: "轻松想起" };
    return labels[rating] || String(rating);
  }

  function setupNavToggle() {
    const nav = document.getElementById("nav-list");
    if (!nav) return;
    nav.addEventListener("click", function(e) {
      const disabledLink = e.target.closest(".module-link.is-disabled, dd.is-locked > a");
      if (disabledLink && nav.contains(disabledLink)) {
        e.preventDefault();
        e.stopPropagation();
        showLockedModule();
        return;
      }
      const toggle = e.target.closest(".module-toggle");
      if (!toggle || !nav.contains(toggle)) return;
      const item = toggle.closest(".nav-item");
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      item.classList.toggle("nav-item-expanded");
      const moduleId = item.getAttribute("data-module-id");
      if (!moduleId) return;
      if (item.classList.contains("nav-item-expanded")) {
        EXPANDED_MODULES.add(moduleId);
      } else {
        EXPANDED_MODULES.delete(moduleId);
      }
    }, true);
  }

  function renderAll() {
    hydrateLearningRecord();
    SESSION_STARTED_AT = new Date().toISOString();
    SESSION_QUESTION_COUNT = 0;
    SESSION_REVIEW_RATED_COUNT = 0;
    SESSION_PENDING_REVIEW_COUNT = 0;
    PENDING_QUESTION_SAVE_SESSION = "";
    SESSION_SUBMITTED_EXERCISE_IDS.clear();
    renderQuestions();
    renderBreadcrumb();
    renderRPG();
    renderReviewBadge();
    renderNav();
    renderSkillTree();
    renderContent(STATE.current_content || STATE.readme || "");
    renderLearningOverview();
    renderReviewPanel();
    recordPageView();
    refreshIcons();
  }

  function renderBreadcrumb() {
    const meta = STATE.meta || {};
    const name = meta.name || STATE.course_slug;
    const mod = STATE.current_module || "";
    const sectionTitle = STATE.current_section_title || "";
    const el = document.getElementById("breadcrumb");
    if (!el) return;
    let html = '<a href="javascript:;">' + escapeHtml(name) + "</a>";
    if (mod) {
      html += '<span class="breadcrumb-sep">/</span><a href="javascript:;" onclick="switchModule(' + escapeJsArgAttr(mod) + ')">' + escapeHtml(currentModuleLabel()) + "</a>";
    }
    if (sectionTitle) {
      html += '<span class="breadcrumb-sep">/</span><cite>' + escapeHtml(sectionTitle) + "</cite>";
    }
    el.innerHTML = html;
    document.title = name + (mod ? " / " + currentModuleLabel() : "") + (sectionTitle ? " / " + sectionTitle : "") + " - 课程播放器";
  }

  function renderRPG() {
    const tree = STATE.domain_tree || {};
    const rpg = tree.rpg;
    const meta = STATE.meta || {};
    const el = document.getElementById("rpg-status");
    if (!el) return;
    if (!meta.rpg_enabled || !rpg) {
      el.classList.add("viewer-hidden");
      el.textContent = "";
      return;
    }
    el.classList.remove("viewer-hidden");
    let text = "Lv." + (rpg.level || 1) + " · " + (rpg.xp || 0) + " XP";
    if (rpg.title) text += " · 「" + rpg.title + "」";
    el.textContent = text;
  }

  function renderReviewBadge() {
    const badge = document.getElementById("review-badge");
    if (!badge) return;
    const due = (STATE || {}).due_reviews || { total: 0 };
    if ((STATE || {}).review_check_error) {
      badge.classList.remove("viewer-hidden");
      badge.textContent = "复习检查失败";
      return;
    }
    if (!due.total) {
      badge.classList.add("viewer-hidden");
      badge.textContent = "";
      return;
    }
    badge.classList.remove("viewer-hidden");
    badge.textContent = due.total + " 个待复习";
  }

  function renderNav() {
    const modules = STATE.modules || [];
    const current = STATE.current_module;
    const currentSection = STATE.current_section || "";
    const completed = (STATE.meta || {}).completed_modules || [];
    const treeNodes = ((STATE.domain_tree || {}).nodes) || {};
    const moduleProgress = getModuleProgress();
    const completedPages = completedLearningPageKeys();
    const el = document.getElementById("nav-list");
    if (!el) return;
    if (modules.length === 0) {
      el.innerHTML = '<li class="viewer-muted p-3">未找到模块</li>';
      return;
    }
    let html = "";
    for (const mod of modules) {
      const isActive = mod.id === current;
      if (isActive && (mod.sections || []).length > 0 && !EXPANDED_MODULES.has(mod.id)) {
        EXPANDED_MODULES.add(mod.id);
      }
      const isDone = completed.includes(mod.id);
      const isLocked = treeNodes[mod.id] && treeNodes[mod.id].status === "locked";
      const statusClass = isDone ? "done" : (isActive ? "active" : "");
      const cls = "nav-item" + (EXPANDED_MODULES.has(mod.id) ? " nav-item-expanded" : "");
      const label = mod.name || labelFromId(mod.id);
      const currentRowClass = isActive ? " is-current" : "";
      const lockRowClass = isLocked ? " is-locked" : "";
      const lockLinkClass = isLocked ? " is-disabled" : "";
      const moduleAction = isLocked ? "showLockedModule()" : ("switchModule(" + escapeJsArgAttr(mod.id) + ")");
      const progress = moduleProgress[mod.id] || { completed: 0, total: 1, percent: 0 };
      html += '<li class="' + cls + '" data-module-id="' + escapeAttr(mod.id) + '"><div class="module-row' + currentRowClass + lockRowClass + '"><a class="module-link' + lockLinkClass +
        '" href="javascript:;" onclick="' + moduleAction +
        '"><div class="module-main"><div class="module-head"><span class="status-dot ' + statusClass + '"></span><span class="module-title">' +
        escapeHtml(label) + '</span></div><div class="module-progress" title="已完成 ' + progress.completed + '/' + progress.total +
        '"><span class="module-progress-track"><span class="module-progress-fill" style="width:' + progress.percent +
        '%"></span></span><span class="module-progress-text">' + progress.completed + '/' + progress.total + "</span></div></div></a>";
      if ((mod.sections || []).length > 0) {
        html += '<button type="button" class="module-toggle" aria-label="展开或收起小节"><span class="module-chevron">▾</span></button>';
      }
      html += "</div>";
      if ((mod.sections || []).length > 0) {
        html += '<dl class="nav-child">';
        for (const section of mod.sections) {
          const sectionActive = isActive && section.id === currentSection;
          const sectionCls = (sectionActive ? "is-active" : "") + (isLocked ? " is-locked" : "");
          const sectionAction = isLocked ? "showLockedModule()" : ("switchSection(" + escapeJsArgAttr(mod.id) + "," + escapeJsArgAttr(section.id) + ")");
          const secDone = completedPages.has(pageKeyFromParts(mod.id, section.id, section.content_path || ""));
          html += '<dd class="' + sectionCls + '"><a href="javascript:;" onclick="' + sectionAction + '">' +
            (secDone ? '<span class="section-check" title="已完成">✓</span>' : "") +
            '<span class="section-title">' + escapeHtml(section.title || labelFromId(section.id)) + "</span></a></dd>";
        }
        html += "</dl>";
      }
      html += "</li>";
    }
    el.innerHTML = html;
  }

  function pageKeyFromParts(moduleId, sectionId, contentFile) {
    return [moduleId || "", sectionId || "", contentFile || ""].join("|");
  }

  function expectedLearningPages() {
    const pages = [];
    for (const mod of STATE.modules || []) {
      const sections = mod.sections || [];
      if (sections.length > 0) {
        for (const section of sections) {
          pages.push({
            module: mod.id,
            section: section.id,
            content_file: section.content_path || ""
          });
        }
      } else if (mod.has_content) {
        pages.push({
          module: mod.id,
          section: "",
          content_file: mod.content_path || ""
        });
      }
    }
    return pages;
  }

  function mainCourseLearningPages() {
    return expectedLearningPages().filter(page => page.module !== SUPPLEMENT_MODULE_ID);
  }

  function isCurrentLearningPage() {
    const currentKey = pageKeyFromParts(STATE.current_module, STATE.current_section, STATE.current_content_file);
    return expectedLearningPages().some(page =>
      pageKeyFromParts(page.module, page.section, page.content_file) === currentKey
    );
  }

  function completedLearningPageKeys() {
    const pages = ((STATE.learning_record || {}).pages || []);
    const completedPages = new Set();
    for (const page of pages) {
      if (!page || !page.module) continue;
      if (page.completed_at) {
        completedPages.add(pageKeyFromParts(page.module, page.section, page.content_file));
      }
    }
    return completedPages;
  }

  function getModuleProgress() {
    const completedPages = completedLearningPageKeys();
    const progress = {};
    for (const mod of STATE.modules || []) {
      const expected = expectedPagesForModule(mod);
      const total = Math.max(1, expected.length);
      const completed = expected.filter(page => completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file))).length;
      progress[mod.id] = {
        completed: completed,
        total: total,
        percent: Math.round((completed / total) * 100)
      };
    }
    return progress;
  }

  function expectedPagesForModule(mod) {
    const sections = mod.sections || [];
    if (sections.length > 0) {
      return sections.map(section => ({
        module: mod.id,
        section: section.id,
        content_file: section.content_path || ""
      }));
    }
    if (mod.has_content) {
      return [{
        module: mod.id,
        section: "",
        content_file: mod.content_path || ""
      }];
    }
    return [];
  }

  function labelFromId(id) {
    return String(id || "").replace(/^\d{2}-/, "").replace(/-/g, " ");
  }

  function skillTreeStatus(status) {
    return SKILL_TREE_STATUS[status] || SKILL_TREE_STATUS.available;
  }

  function evidenceLabel(tag) {
    return EVIDENCE_LABELS[tag] || labelFromId(tag) || "其他证据";
  }

  function learningPageTitle(mod, page) {
    if (page.section) {
      const section = (mod.sections || []).find(item => item.id === page.section);
      if (section) return section.title || labelFromId(section.id);
    }
    return mod.name || labelFromId(mod.id);
  }

  function masteryChallengeLabel(tag, node) {
    const gate = node.mastery_gate || {};
    const parts = String(tag).split(":", 2);
    const evidence = parts[0];
    const legacyCount = Number(parts[1] || 0);
    const count = Math.max(1, Number(gate[evidence] || legacyCount || 1));
    const labels = {
      recall: "不看资料完成 " + count + " 次回忆",
      apply: "独立完成 " + count + " 道应用题",
      explain: "用自己的话讲清 " + count + " 个核心概念",
      debug: "纠正 " + count + " 个典型错误",
      review: "完成 " + count + " 次延迟复习",
      analyze: "完成 " + count + " 次分析推理",
      interview: "完成 " + count + " 次面试表达",
      exam: "完成 " + count + " 道应试题"
    };
    return labels[evidence] || "完成 " + count + " 次" + evidenceLabel(evidence);
  }

  function skillNodeNextStep(id, node, status) {
    const treeNodes = ((STATE.domain_tree || {}).nodes) || {};
    if (status === "mastered") return { kind: "complete", label: "掌握证据已通过" };
    if (status === "locked") {
      const prerequisites = (node.prerequisites || []).filter(item => (treeNodes[item] || {}).status !== "mastered");
      const required = prerequisites.length > 0 ? prerequisites : (node.prerequisites || []);
      const names = required.map(item => (treeNodes[item] || {}).name || labelFromId(item));
      return {
        kind: "note",
        label: names.length > 0 ? "先完成「" + names.join("、") + "」后解锁" : "先完成前置模块后解锁"
      };
    }

    const moduleId = node.module || id;
    const mod = (STATE.modules || []).find(item => item.id === moduleId);
    if (!mod) return { kind: "note", label: "课程模块尚未生成" };
    const pages = expectedPagesForModule(mod);
    if (pages.length === 0) return { kind: "note", label: "暂无可学习内容" };
    if (id === SUPPLEMENT_MODULE_ID) {
      return { kind: "navigate", label: "打开内容补充", page: pages[0] };
    }

    const completedPages = completedLearningPageKeys();
    const unfinished = pages.find(page => !completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file)));
    if (unfinished) {
      const verb = status === "in_progress" ? "继续" : (status === "unlockable" ? "挑战" : "开始");
      return { kind: "navigate", label: verb + "「" + learningPageTitle(mod, unfinished) + "」", page: unfinished };
    }

    const missing = Array.isArray(node.missing_evidence) ? node.missing_evidence : [];
    if (missing.length > 0) {
      return {
        kind: "challenge",
        label: "申请掌握挑战",
        detail: "掌握挑战：" + missing.map(tag => masteryChallengeLabel(tag, node)).join("、"),
        node_name: node.name || mod.name || labelFromId(id)
      };
    }
    return { kind: "note", label: "学习记录已齐，等待掌握度更新" };
  }

  function renderSkillNodeStep(step) {
    if (step.kind === "complete") {
      return '<div class="skill-map-note is-complete">' + escapeHtml(step.label) + "</div>";
    }
    if (step.kind === "note") {
      return '<div class="skill-map-note">' + escapeHtml(step.label) + "</div>";
    }
    if (step.kind === "challenge") {
      const detail = '<div class="skill-map-note">' + escapeHtml(step.detail) + "</div>";
      if (STATE.server_mode !== "interactive") {
        return detail + '<div class="skill-map-note">回到聊天后发起这项挑战</div>';
      }
      const action = "requestMasteryChallenge(" + escapeJsArgAttr(step.node_name) + "," + escapeJsArgAttr(step.detail) + ")";
      return detail + '<button type="button" class="skill-map-next" onclick="' + action + '" aria-label="' + escapeAttr(step.label) + '">' +
        '<span>' + escapeHtml(step.label) + '</span><span>→</span></button>';
    }
    const page = step.page;
    const action = page.section
      ? "switchSection(" + escapeJsArgAttr(page.module) + "," + escapeJsArgAttr(page.section) + ")"
      : "switchModule(" + escapeJsArgAttr(page.module) + ")";
    return '<button type="button" class="skill-map-next" onclick="' + action + '" aria-label="' + escapeAttr(step.label) + '">' +
      '<span>' + escapeHtml(step.label) + '</span><span>→</span></button>';
  }

  function masteryChallengeQuestion(nodeName, detail) {
    const requirement = String(detail || "").replace(/^掌握挑战：/, "");
    return "请在内容补充中为「" + nodeName + "」添加掌握挑战：" + requirement + "，并带我开始。";
  }

  function currentModuleLabel() {
    const modules = STATE.modules || [];
    const current = STATE.current_module || "";
    const mod = modules.find(item => item.id === current);
    return mod ? (mod.name || labelFromId(mod.id)) : labelFromId(current);
  }

  function renderSkillTree() {
    const tree = STATE.domain_tree || {};
    const meta = STATE.meta || {};
    const section = document.getElementById("skill-tree-section");
    if (!section) return;
    if (!meta.skill_tree_enabled || !tree.nodes || Object.keys(tree.nodes).length === 0) {
      section.classList.add("viewer-hidden");
      return;
    }
    section.classList.remove("viewer-hidden");
    const el = document.getElementById("skill-tree");
    if (!el) return;
    el.className = "skill-tree-host";
    const items = Object.entries(tree.nodes).map(([id, node]) => {
      const status = node.status || "available";
      const statusMeta = skillTreeStatus(status);
      const progress = Math.max(0, Math.min(100, Number(node.progress || 0)));
      const matchedMod = (STATE.modules || []).find(item => item.id === (node.module || id));
      const name = (node.name || (matchedMod && matchedMod.name) || id).replace(/^\d{2}-/, "").replace(/-/g, " ");
      const nextStep = renderSkillNodeStep(skillNodeNextStep(id, node, status));
      return '<div class="skill-map-item is-' + escapeAttr(status) + '">' +
        '<span class="skill-map-dot"></span>' +
        '<div class="skill-map-body">' +
        '<div class="skill-map-head"><span class="skill-map-name">' + escapeHtml(name) + '</span>' +
        '<span class="skill-map-status">' + statusMeta.label + (progress ? " " + progress + "%" : "") + '</span></div>' +
        '<div class="skill-map-bar"><span class="skill-map-fill" style="width:' + progress + '%"></span></div>' +
        nextStep + '</div></div>';
    });
    el.innerHTML = items.join("");
  }

  async function renderContent(md) {
    const el = document.getElementById("content");
    if (!el) return;
    if (!md) {
      el.innerHTML = '<div class="markdown-body"><p class="viewer-muted">暂无内容</p></div>';
      return;
    }
    const parts = splitStudyBlocks(md);
    let html = "";
    for (const part of parts) {
      if (part.type === "markdown") {
        html += renderMarkdown(part.content);
      } else if (part.type === "archify") {
        html += renderArchifyBlock(part.content);
      } else if (part.type === "steps") {
        html += renderStudyStepsBlock(part.content);
      } else if (part.type === "study") {
        html += renderStudyBlock(part.lang, part.content);
      }
    }
    const completionAction = STATE.server_mode === "interactive" && isCurrentLearningPage()
      ? '<section class="session-finish" id="session-finish"><div><div class="session-finish-title">本页学完了吗？</div><div class="session-finish-note" id="session-finish-note" aria-live="polite">正在准备学习记录...</div></div><button type="button" class="viewer-btn viewer-btn-primary session-finish-btn" id="finish-session-btn" onclick="finishCurrentPage()" disabled>完成本次学习</button></section>'
      : "";
    const pagerHtml = renderAdjacentPager();
    el.innerHTML = '<article class="markdown-body" id="markdown-article">' + html + "</article>" + completionAction + pagerHtml;
    await postProcessContent(el);
    restoreSubmittedExercises(el);
    updateCompletionAction();
    updateReadingProgress();
    refreshIcons();
  }

  function restoreSubmittedExercises(root) {
    if (!Array.isArray(EXERCISES) || !EXERCISES.length) return;
    root.querySelectorAll(".study-block").forEach(block => {
      const id = block.getAttribute("data-study-id");
      const saved = EXERCISES.find(item =>
        item.id === id &&
        item.module === STATE.current_module &&
        (item.section || null) === (STATE.current_section || null)
      );
      if (!saved) return;
      applySavedAnswer(block, saved.user_answer || "");
      markStudyBlockSubmitted(block);
    });
  }

  function applySavedAnswer(block, userAnswer) {
    const type = block.getAttribute("data-study-type");
    if (type === "choice") {
      const values = String(userAnswer).split(",").map(item => item.trim()).filter(Boolean);
      block.querySelectorAll("input[type='checkbox'], input[type='radio']").forEach(input => {
        input.checked = values.includes(input.value);
      });
      return;
    }
    if (type === "truefalse") {
      const normalized = userAnswer === "正确" ? "true" : userAnswer === "错误" ? "false" : String(userAnswer);
      block.querySelectorAll("input[type='radio']").forEach(input => {
        input.checked = input.value === normalized;
      });
      return;
    }
    const field = block.querySelector(".exercise-answer");
    if (field) field.value = userAnswer;
  }

  function splitStudyBlocks(md) {
    const parts = [];
    const regex = /```([A-Za-z0-9_-]+)\s*\n([\s\S]*?)```/g;
    let last = 0;
    let match;
    while ((match = regex.exec(md)) !== null) {
      const lang = match[1].toLowerCase();
      const content = match[2];
      if (lang === "archify" || lang === "study-steps" || lang.startsWith("study-")) {
        if (match.index > last) {
          const between = md.slice(last, match.index);
          if (between.trim()) {
            parts.push({ type: "markdown", content: between });
          }
        }
        if (lang === "archify") {
          parts.push({ type: "archify", content: content.trim() });
        } else if (lang === "study-steps") {
          parts.push({ type: "steps", content: content.trim() });
        } else {
          parts.push({ type: "study", lang: lang, content: content.trim() });
        }
        last = match.index + match[0].length;
      }
    }
    if (last < md.length) {
      parts.push({ type: "markdown", content: md.slice(last) });
    }
    return parts;
  }

  function normalizeCjkBold(text) {
    return String(text || "").split(/(```[\s\S]*?```|`[^`\n]*`)/g).map((segment, idx) => {
      if (idx % 2 === 1) return segment;
      return segment.replace(/\*\*\s*([^\n*]+?)\s*\*\*/g, "<strong>$1</strong>");
    }).join("");
  }

  function renderMarkdown(md) {
    const delimiters = [
      ["\\[", "STUDY_MATH_DISPLAY_OPEN"],
      ["\\]", "STUDY_MATH_DISPLAY_CLOSE"],
      ["\\(", "STUDY_MATH_INLINE_OPEN"],
      ["\\)", "STUDY_MATH_INLINE_CLOSE"]
    ];
    let protectedMarkdown = normalizeCjkBold(md);
    for (const [delimiter, placeholder] of delimiters) {
      protectedMarkdown = protectedMarkdown.split(delimiter).join(placeholder);
    }
    let html = marked.parse(protectedMarkdown);
    for (const [delimiter, placeholder] of delimiters) {
      html = html.split(placeholder).join(delimiter);
    }
    if (typeof DOMPurify !== "undefined" && typeof DOMPurify.sanitize === "function") {
      html = DOMPurify.sanitize(html);
    }
    return html;
  }

  function renderArchifyBlock(rawCode) {
    if (!window.StudyDiagrams || typeof window.StudyDiagrams.renderArchifySvg !== "function") {
      return '<div class="error-box">图表引擎未加载</div>';
    }
    try {
      const rendered = window.StudyDiagrams.renderArchifySvg(rawCode);
      return (
        '<section class="archify-card" data-archify-card-id="' + escapeAttr(rendered.id) + '">' +
        '<div class="archify-card-header">' +
        '<div class="archify-card-title-wrap">' +
        '<span class="archify-type-badge">' + escapeHtml(rendered.type) + "</span>" +
        '<span class="archify-card-title">' + escapeHtml(rendered.title) + "</span>" +
        "</div>" +
        '<div class="archify-card-tools">' +
        '<button type="button" class="viewer-btn viewer-btn-xs" onclick="resetDiagramSteps(' + escapeJsArgAttr(rendered.id) + ')" title="重置步骤高亮">全部展示</button>' +
        '<button type="button" class="viewer-btn viewer-btn-xs" onclick="openDiagramModal(' + escapeJsArgAttr(rendered.id) + "," + escapeJsArgAttr(rendered.title) + ')" title="全屏放大检视">全屏检视</button>' +
        "</div>" +
        "</div>" +
        '<div class="archify-canvas" id="archify-canvas-' + escapeAttr(rendered.id) + '">' +
        rendered.svg +
        "</div>" +
        "</section>"
      );
    } catch(e) {
      return '<div class="error-box">Archify 图表解析失败: ' + escapeHtml(e.message) + "<pre>" + escapeHtml(rawCode) + "</pre></div>";
    }
  }

  function renderStudyStepsBlock(rawCode) {
    if (!window.StudyDiagrams || typeof window.StudyDiagrams.parseStudyStepsBlock !== "function") {
      return "";
    }
    const parsed = window.StudyDiagrams.parseStudyStepsBlock(rawCode);
    if (!parsed.steps || parsed.steps.length === 0) return "";
    const diagId = parsed.diagram || "";
    let listHtml = "";
    parsed.steps.forEach((step, idx) => {
      const targetsAttr = (step.targets || []).join(",");
      listHtml +=
        '<li class="study-step-item" data-step-diagram="' + escapeAttr(diagId) + '" data-step-targets="' + escapeAttr(targetsAttr) + '" ' +
        'onclick="activateDiagramStep(this)" onmouseenter="activateDiagramStep(this)">' +
        '<span class="study-step-num">' + (idx + 1) + "</span>" +
        '<div class="study-step-body">' +
        '<div class="study-step-title">' + escapeHtml(step.title) + "</div>" +
        (step.detail ? '<div class="study-step-detail">' + escapeHtml(step.detail) + "</div>" : "") +
        "</div>" +
        "</li>";
    });
    return (
      '<section class="study-steps-card" data-steps-for="' + escapeAttr(diagId) + '">' +
      '<div class="study-steps-head">' +
      '<span>步骤走查（点击或悬停步骤在图中聚光定位）</span>' +
      (diagId ? '<button type="button" class="viewer-btn viewer-btn-xs" onclick="resetDiagramSteps(' + escapeJsArgAttr(diagId) + ')">清除高亮</button>' : "") +
      "</div>" +
      '<ol class="study-steps-list">' + listHtml + "</ol>" +
      "</section>"
    );
  }

  window.activateDiagramStep = function(stepEl) {
    if (!stepEl) return;
    const diagId = stepEl.getAttribute("data-step-diagram");
    const targetsRaw = stepEl.getAttribute("data-step-targets") || "";
    const targets = new Set(targetsRaw.split(",").map(s => s.trim()).filter(Boolean));
    const list = stepEl.closest(".study-steps-list");
    if (list) {
      list.querySelectorAll(".study-step-item").forEach(li => li.classList.toggle("is-active", li === stepEl));
    }
    if (!diagId) return;
    const svg = document.querySelector('svg[data-archify-id="' + CSS.escape(diagId) + '"]');
    if (!svg) return;
    if (targets.size === 0) {
      svg.removeAttribute("data-step-active");
      svg.querySelectorAll("[data-step-match]").forEach(n => n.removeAttribute("data-step-match"));
      return;
    }
    svg.setAttribute("data-step-active", "true");
    svg.querySelectorAll("[data-node-id]").forEach(node => {
      const nid = node.getAttribute("data-node-id");
      if (targets.has(nid)) {
        node.setAttribute("data-step-match", "true");
      } else {
        node.removeAttribute("data-step-match");
      }
    });
    svg.querySelectorAll("[data-edge-id]").forEach(edge => {
      const eid = edge.getAttribute("data-edge-id");
      const from = edge.getAttribute("data-edge-from");
      const to = edge.getAttribute("data-edge-to");
      if (targets.has(eid) || (targets.has(from) && targets.has(to))) {
        edge.setAttribute("data-step-match", "true");
      } else {
        edge.removeAttribute("data-step-match");
      }
    });
  };

  window.resetDiagramSteps = function(diagId) {
    if (diagId) {
      const svg = document.querySelector('svg[data-archify-id="' + CSS.escape(diagId) + '"]');
      if (svg) {
        svg.removeAttribute("data-step-active");
        svg.querySelectorAll("[data-step-match]").forEach(n => n.removeAttribute("data-step-match"));
      }
      document.querySelectorAll('.study-steps-card[data-steps-for="' + CSS.escape(diagId) + '"] .study-step-item').forEach(li => {
        li.classList.remove("is-active");
      });
    }
  };

  window.openDiagramModal = function(diagId, title) {
    const modal = document.getElementById("diagram-modal");
    const stage = document.getElementById("diagram-modal-stage");
    const titleEl = document.getElementById("diagram-modal-title");
    const canvas = document.getElementById("archify-canvas-" + diagId);
    if (!modal || !stage || !canvas) return;
    MODAL_ZOOM = 1;
    if (titleEl) titleEl.textContent = title || "图表全屏检视";
    stage.innerHTML = canvas.innerHTML;
    modal.classList.remove("viewer-hidden");
  };

  window.closeDiagramModal = function() {
    const modal = document.getElementById("diagram-modal");
    if (modal) modal.classList.add("viewer-hidden");
  };

  window.zoomDiagramModal = function(delta) {
    const stage = document.getElementById("diagram-modal-stage");
    if (!stage) return;
    const svg = stage.querySelector("svg");
    if (!svg) return;
    if (delta === 0) {
      MODAL_ZOOM = 1;
    } else {
      MODAL_ZOOM = Math.max(0.5, Math.min(2.5, Number((MODAL_ZOOM + delta).toFixed(2))));
    }
    svg.style.transform = "scale(" + MODAL_ZOOM + ")";
  };

  function renderStudyBlock(lang, yamlContent) {
    let data;
    try {
      data = jsyaml.load(yamlContent);
    } catch(e) {
      return '<div class="error-box">这道练习暂时无法显示: ' + escapeHtml(e.message) + "<pre>" + escapeHtml(yamlContent) + "</pre></div>";
    }
    const type = lang.replace("study-", "");
    if (type === "walkthrough" || type === "tutor") return renderWalkthroughBlock(data);
    if (type === "choice") return renderChoiceQuestion(data, type);
    if (type === "truefalse") return renderTrueFalseQuestion(data, type);
    if (type === "input" || type === "short" || type === "explain") return renderInputQuestion(data, type);
    if (type === "recall" || type === "transfer") return renderInputQuestion(data, type);
    if (type === "feynman") return renderInputQuestion(normalizeFeynmanData(data), type);
    if (type === "checkpoint") return renderLegacyCheckpoint(data);
    return '<div class="error-box">这类练习暂时不支持显示: ' + escapeHtml(type) + "</div>";
  }

  function renderWalkthroughBlock(data) {
    const steps = Array.isArray(data && data.steps) ? data.steps : [];
    if (!steps.length) return "";
    const id = questionId("walkthrough", data);
    const title = data.title || "分步推导讲台";
    const intro = data.intro ? '<div class="walkthrough-intro">' + renderMarkdown(String(data.intro)) + "</div>" : "";

    let stepsHtml = "";
    steps.forEach((step, idx) => {
      const isFirst = idx === 0;
      const stepTitle = step.title || ("第 " + (idx + 1) + " 步");
      const bodyHtml = renderMarkdown(String(step.body || step.content || ""));
      const stateHtml = step.state
        ? '<div class="walkthrough-state"><span class="walkthrough-state-label">当前状态快照</span><code>' + escapeHtml(String(step.state)) + "</code></div>"
        : "";
      const promptHtml = step.question && idx < steps.length - 1
        ? '<div class="walkthrough-prompt">💭 <strong>先想一步：</strong>' + escapeHtml(String(step.question)) + "</div>"
        : "";
      stepsHtml +=
        '<div class="walkthrough-step' + (isFirst ? " is-revealed is-current" : " viewer-hidden") + '" data-walk-step="' + idx + '">' +
        '<div class="walkthrough-step-head">' +
        '<span class="walkthrough-step-badge">STEP ' + (idx + 1) + " / " + steps.length + "</span>" +
        '<span class="walkthrough-step-title">' + escapeHtml(stepTitle) + "</span>" +
        "</div>" +
        '<div class="walkthrough-step-body">' + bodyHtml + "</div>" +
        stateHtml +
        promptHtml +
        "</div>";
    });

    const nextStepTitle = steps.length > 1 ? (steps[1].title || "第 2 步") : "";
    const footerHtml = steps.length > 1
      ? '<div class="walkthrough-footer" data-walk-footer>' +
        '<button type="button" class="viewer-btn viewer-btn-primary walkthrough-next-btn" onclick="advanceWalkthrough(this)">' +
        '揭晓下一步 (2/' + steps.length + ')：' + escapeHtml(nextStepTitle) + ' →</button>' +
        '<span class="walkthrough-progress-text" data-walk-progress>已展开 1 / ' + steps.length + ' 步</span>' +
        "</div>"
      : "";

    return (
      '<section class="walkthrough-card" data-walkthrough-id="' + escapeAttr(id) + '" data-walk-revealed="1" data-walk-total="' + steps.length + '">' +
      '<div class="walkthrough-header">' +
      '<div class="walkthrough-header-left">' +
      '<span class="walkthrough-badge">老师带推</span>' +
      '<span class="walkthrough-title">' + escapeHtml(title) + "</span>" +
      "</div>" +
      (steps.length > 1
        ? '<button type="button" class="viewer-btn viewer-btn-xs walkthrough-toggle-all" onclick="toggleAllWalkthroughSteps(this)">展开全部 (' + steps.length + " 步)</button>"
        : "") +
      "</div>" +
      intro +
      '<div class="walkthrough-steps">' + stepsHtml + "</div>" +
      footerHtml +
      "</section>"
    );
  }

  window.advanceWalkthrough = function(btn) {
    const card = btn.closest(".walkthrough-card");
    if (!card) return;
    const total = parseInt(card.getAttribute("data-walk-total") || "1", 10);
    let revealed = parseInt(card.getAttribute("data-walk-revealed") || "1", 10);
    if (revealed >= total) return;
    const nextIdx = revealed;
    revealed += 1;
    card.setAttribute("data-walk-revealed", String(revealed));

    card.querySelectorAll(".walkthrough-step").forEach((el, idx) => {
      el.classList.toggle("is-current", idx === nextIdx);
      if (idx <= nextIdx) {
        el.classList.remove("viewer-hidden");
        el.classList.add("is-revealed");
      }
    });

    syncWalkthroughControls(card, revealed, total);
    const targetStep = card.querySelector('[data-walk-step="' + nextIdx + '"]');
    if (targetStep && typeof targetStep.scrollIntoView === "function") {
      targetStep.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  };

  window.toggleAllWalkthroughSteps = function(btn) {
    const card = btn.closest(".walkthrough-card");
    if (!card) return;
    const total = parseInt(card.getAttribute("data-walk-total") || "1", 10);
    const current = parseInt(card.getAttribute("data-walk-revealed") || "1", 10);
    const expandAll = current < total;
    const nextRevealed = expandAll ? total : 1;
    card.setAttribute("data-walk-revealed", String(nextRevealed));

    card.querySelectorAll(".walkthrough-step").forEach((el, idx) => {
      if (idx < nextRevealed) {
        el.classList.remove("viewer-hidden");
        el.classList.add("is-revealed");
      } else {
        el.classList.add("viewer-hidden");
        el.classList.remove("is-revealed");
      }
      el.classList.toggle("is-current", idx === nextRevealed - 1);
    });

    syncWalkthroughControls(card, nextRevealed, total);
  };

  function syncWalkthroughControls(card, revealed, total) {
    const toggleBtn = card.querySelector(".walkthrough-toggle-all");
    if (toggleBtn) {
      toggleBtn.textContent = revealed >= total ? "重置为逐步跟学" : ("展开全部 (" + total + " 步)");
    }
    const footer = card.querySelector("[data-walk-footer]");
    if (!footer) return;
    const nextBtn = footer.querySelector(".walkthrough-next-btn");
    const prog = footer.querySelector("[data-walk-progress]");
    if (prog) {
      prog.textContent = revealed >= total
        ? ("全部 " + total + " 步推导已展开 ✓")
        : ("已展开 " + revealed + " / " + total + " 步");
    }
    if (nextBtn) {
      if (revealed >= total) {
        nextBtn.classList.add("viewer-hidden");
      } else {
        nextBtn.classList.remove("viewer-hidden");
        const nextStepEl = card.querySelector('[data-walk-step="' + revealed + '"] .walkthrough-step-title');
        const nextTitle = nextStepEl ? nextStepEl.textContent : ("第 " + (revealed + 1) + " 步");
        nextBtn.textContent = "揭晓下一步 (" + (revealed + 1) + "/" + total + ")：" + nextTitle + " →";
      }
    }
  }

  function questionId(prefix, data) {
    return data.id || (prefix + "-" + Math.random().toString(36).slice(2, 8));
  }

  function normalizeFeynmanData(data) {
    return {
      id: data.id,
      title: data.title || "解释题",
      question: data.prompt || ("用自己的话解释: " + (data.concept || "")),
      answer: data.key_points ? ("参考要点: " + data.key_points) : (data.answer || ""),
      mode: "long",
      min_words: data.min_words || 30,
      mastery_tags: data.mastery_tags || ["explain"],
      concept: data.concept || ""
    };
  }

  function questionHeader(label, question, title, rawTags) {
    const customTitle = title && String(title).trim() !== String(question || "").trim() ? String(title).trim() : "";
    const tags = normalizeTags(rawTags).split(",").map(s => s.trim()).filter(Boolean);
    const tagHtml = tags.length > 0
      ? '<span class="study-tag-pills">' + tags.map(t => '<span class="study-tag-pill">' + escapeHtml(evidenceLabel(t)) + "</span>").join("") + "</span>"
      : "";
    return '<div class="study-block-header"><div class="study-header-left"><span class="study-type-badge">' + escapeHtml(label) +
      "</span>" + (customTitle ? '<span class="study-title">' + escapeHtml(customTitle) + "</span>" : "") + "</div>" + tagHtml + "</div>";
  }

  function renderChoiceQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道选择题缺少题干</div>';
    if (!Array.isArray(data.options) || data.options.length < 2) return '<div class="error-box">这道选择题至少需要两个选项</div>';
    const id = questionId("choice", data);
    const multiple = data.multiple === true || Array.isArray(data.answer);
    const inputType = multiple ? "checkbox" : "radio";
    const name = "study-" + id;
    const options = data.options.map((option, index) => normalizeChoiceOption(option, index));
    const saved = savedExerciseFor(id);
    let optionsHtml = '<div class="study-options">';
    for (const option of options) {
      const checked = saved && savedAnswerValues(saved.user_answer).includes(option.value) ? " checked" : "";
      optionsHtml += '<label class="study-option">' +
        '<input type="' + inputType + '" name="' + escapeAttr(name) + '" value="' + escapeAttr(option.value) + '"' + checked + ">" +
        '<div><span class="study-option-text">' + escapeHtml(option.label) + "</span>" +
        (option.note ? '<span class="study-option-note">' + escapeHtml(option.note) + "</span>" : "") +
        "</div></label>";
    }
    optionsHtml += "</div>";
    return '<div class="study-block study-choice" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(normalizeAnswer(data.answer)) + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" data-study-multiple="' + escapeAttr(multiple ? "true" : "false") + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '">' +
      questionHeader(multiple ? "多选题" : "单选题", data.question, data.title || "", data.mastery_tags || data.skill_tags) +
      '<div class="study-block-body">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      renderHintTools(data.hints) +
      optionsHtml +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      "</div></div>";
  }

  function renderTrueFalseQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道判断题缺少题干</div>';
    const id = questionId("truefalse", data);
    const answerValue = normalizeBooleanAnswer(data.answer);
    const saved = savedExerciseFor(id);
    const savedValue = saved ? normalizeSavedTrueFalse(saved.user_answer) : "";
    return '<div class="study-block study-truefalse" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(answerValue) + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '">' +
      questionHeader("判断题", data.question, data.title || "", data.mastery_tags || data.skill_tags) +
      '<div class="study-block-body">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      renderHintTools(data.hints) +
      '<div class="study-options">' +
      '<label class="study-option"><input type="radio" name="' + escapeAttr("study-" + id) + '" value="true"' + (savedValue === "true" ? " checked" : "") + '><span class="study-option-text">正确 (True)</span></label>' +
      '<label class="study-option"><input type="radio" name="' + escapeAttr("study-" + id) + '" value="false"' + (savedValue === "false" ? " checked" : "") + '><span class="study-option-text">错误 (False)</span></label>' +
      "</div>" +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(answerValue === "true" ? "正确" : answerValue === "false" ? "错误" : data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      "</div></div>";
  }

  function renderInputQuestion(data, rawType) {
    if (!data.question) return '<div class="error-box">这道开放题缺少题目</div>';
    const id = questionId("input", data);
    const mode = data.mode === "single" ? "single" : "multi";
    const minWords = data.min_words || data.min_chars || "";
    const placeholder = data.placeholder || (mode === "single" ? "写下你的答案..." : "写下你的推导过程、关键机制或实现思路...");
    const saved = savedExerciseFor(id);
    const savedAnswer = saved ? saved.user_answer || "" : "";
    const inputHtml = mode === "single"
      ? '<input type="text" class="viewer-input exercise-answer" placeholder="' + escapeAttr(placeholder) + '" value="' + escapeAttr(savedAnswer) + '">'
      : '<textarea rows="4" class="exercise-answer" placeholder="' + escapeAttr(placeholder) + '">' + escapeHtml(savedAnswer) + "</textarea>";
    const label = rawType === "recall" ? "开放题" : rawType === "transfer" ? "应用题" : rawType === "feynman" ? "费曼解释题" : "主观问答题";
    return '<div class="study-block study-input" data-study-id="' + escapeAttr(id) + '" data-study-type="' + escapeAttr(rawType) + '" ' +
      'data-study-question="' + escapeAttr(data.question) + '" data-study-answer="' + escapeAttr(data.answer || "") + '" ' +
      'data-study-explanation="' + escapeAttr(data.explanation || data.reason || "") + '" data-study-min-words="' + escapeAttr(minWords) + '" ' +
      'data-study-mastery-tags="' + escapeAttr(normalizeTags(data.mastery_tags || data.skill_tags)) + '" data-study-concept="' + escapeAttr(data.concept || "") + '">' +
      questionHeader(label, data.question, data.title || "", data.mastery_tags || data.skill_tags) +
      '<div class="study-block-body">' +
      '<div class="study-question">' + escapeHtml(data.question) + "</div>" +
      (data.prompt ? '<div class="viewer-muted study-prompt">' + escapeHtml(data.prompt) + "</div>" : "") +
      renderHintTools(data.hints) +
      inputHtml +
      (minWords ? '<div class="study-meta-note">建议不少于 ' + escapeHtml(minWords) + " 字</div>" : "") +
      renderSubmitRow("提交作答") +
      renderAnswerPanel(data.answer, data.explanation || data.reason || "") +
      '<div class="assess-result"></div>' +
      "</div></div>";
  }

  function renderLegacyCheckpoint(data) {
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) return '<div class="error-box">这组检查题还没有配置检查项</div>';
    const id = data.module || questionId("checkpoint", data);
    let itemsHtml = "";
    for (const item of items) {
      itemsHtml += "<li>" + escapeHtml(item.type || "practice") + (item.ref ? " (" + escapeHtml(item.ref) + ")" : "") + "</li>";
    }
    return '<div class="study-block study-legacy" data-study-id="' + escapeAttr(id) + '" data-study-type="checkpoint" ' +
      'data-study-total="' + escapeAttr(items.length) + '">' +
      questionHeader("旧版检查组", "本课程使用了旧版 checkpoint 块", "建议改成模块末尾的一组题型练习") +
      '<div class="study-block-body">' +
      '<div class="study-question">本课程使用了旧版 checkpoint 块。播放器会保存检查记录，但新课程应改用选择题、判断题或开放题。</div>' +
      "<ul>" + itemsHtml + "</ul>" +
      '<div class="checkpoint-assess study-action-row">' +
      '<button type="button" class="viewer-btn viewer-btn-sm" onclick="submitCheckpoint(this.closest(\'.study-block\'))">保存检查记录</button>' +
      "</div>" +
      '<div class="assess-result"></div>' +
      "</div></div>";
  }

  function normalizeChoiceOption(option, index) {
    if (typeof option === "string" || typeof option === "number") {
      const value = String.fromCharCode(65 + index);
      return { value: value, label: value + ". " + String(option), note: "" };
    }
    if (option && typeof option === "object") {
      const value = String(option.value || option.key || option.id || String.fromCharCode(65 + index));
      const text = String(option.text || option.label || option.title || value);
      const label = text.startsWith(value + ".") || text.startsWith(value + " ") ? text : (value + ". " + text);
      return { value: value, label: label, note: option.note ? String(option.note) : "" };
    }
    const fallback = String.fromCharCode(65 + index);
    return { value: fallback, label: fallback, note: "" };
  }

  function savedExerciseFor(id) {
    if (!Array.isArray(EXERCISES)) return null;
    return EXERCISES.find(item =>
      String(item.id) === String(id) &&
      String(item.module || "") === String(STATE.current_module || "") &&
      String(item.section || "") === String(STATE.current_section || "")
    ) || null;
  }

  function savedAnswerValues(answer) {
    return String(answer || "").split(",").map(item => item.trim()).filter(Boolean);
  }

  function normalizeSavedTrueFalse(answer) {
    if (answer === "正确" || String(answer).toLowerCase() === "true") return "true";
    if (answer === "错误" || String(answer).toLowerCase() === "false") return "false";
    return "";
  }

  function normalizeAnswer(answer) {
    if (Array.isArray(answer)) return answer.map(item => String(item)).join(", ");
    if (answer === true) return "true";
    if (answer === false) return "false";
    return answer == null ? "" : String(answer);
  }

  function normalizeBooleanAnswer(answer) {
    if (answer === true || String(answer).toLowerCase() === "true" || String(answer) === "正确" || String(answer) === "对") return "true";
    if (answer === false || String(answer).toLowerCase() === "false" || String(answer) === "错误" || String(answer) === "错") return "false";
    return normalizeAnswer(answer);
  }

  function normalizeTags(tags) {
    if (!tags) return "";
    if (Array.isArray(tags)) return tags.map(item => String(item)).join(",");
    return String(tags);
  }

  function renderHintTools(hints) {
    if (!Array.isArray(hints) || !hints.length) return "";
    let html = '<div class="hints-section">';
    for (let i = 0; i < hints.length; i++) {
      html += '<button type="button" class="viewer-btn viewer-btn-xs" onclick="toggleHint(this, ' + i + ')">提示 ' + (i + 1) + "</button> ";
    }
    html += '<div class="hints-container">';
    for (let i = 0; i < hints.length; i++) {
      html += '<div class="hint" data-hint="' + i + '">' + escapeHtml(hints[i]) + "</div>";
    }
    html += "</div></div>";
    return html;
  }

  function renderSubmitRow(text) {
    return '<div class="study-actions study-action-row">' +
      '<button type="button" class="viewer-btn viewer-btn-primary viewer-btn-sm save-answer-btn" onclick="saveExerciseAnswer(this.closest(\'.study-block\'))">' + escapeHtml(text) + "</button>" +
      "</div>";
  }

  function renderAnswerPanel(answer, explanation) {
    const hasAnswer = answer !== undefined && answer !== null && String(answer).trim() !== "";
    const hasExplanation = explanation !== undefined && explanation !== null && String(explanation).trim() !== "";
    let body = "";
    if (hasAnswer) {
      body += '<div class="answer-section"><div class="answer-section-title">参考答案</div><div class="answer-section-content">' + renderMarkdown(String(answer)) + "</div></div>";
    }
    if (hasExplanation) {
      body += '<div class="answer-section"><div class="answer-section-title">深度解析</div><div class="answer-section-content">' + renderMarkdown(String(explanation)) + "</div></div>";
    }
    if (!body) body = '<div class="viewer-muted">这道题没有配置参考内容。</div>';
    return '<div class="answer-panel" data-answer-panel><div class="answer-header"><span>参考答案与解析</span>' +
      '<button type="button" class="answer-toggle" title="展开或收起解析" onclick="toggleAnswerPanel(this)" aria-label="展开或收起解析">▾</button></div><div class="answer-body">' + body + "</div></div>";
  }

  function enhanceCallouts(articleEl) {
    articleEl.querySelectorAll("blockquote").forEach(bq => {
      const firstP = bq.querySelector("p");
      if (!firstP) return;
      const match = firstP.innerHTML.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br\s*\/?>|\n)?([\s\S]*)$/i);
      if (!match) return;
      const kind = match[1].toUpperCase();
      const meta = CALLOUT_META[kind] || CALLOUT_META.NOTE;
      firstP.innerHTML = match[2];
      const wrapper = document.createElement("div");
      wrapper.className = "viewer-callout " + meta.cls;
      wrapper.innerHTML = '<div class="viewer-callout-title">' + escapeHtml(meta.label) + "</div>" + bq.innerHTML;
      bq.replaceWith(wrapper);
    });
  }

  function enhanceComparisonBadges(articleEl) {
    const badgeRegex = /\{(good|caution|bad):([^}]+)\}/g;
    articleEl.querySelectorAll("td, th").forEach(cell => {
      if (!badgeRegex.test(cell.innerHTML)) return;
      cell.innerHTML = cell.innerHTML.replace(badgeRegex, (_, kind, label) => {
        const prefix = kind === "good" ? "✓ " : kind === "caution" ? "! " : "✕ ";
        return '<span class="cmp-badge is-' + escapeAttr(kind) + '">' + prefix + escapeHtml(label.trim()) + "</span>";
      });
    });
  }

  function enhanceCodeBlocks(articleEl) {
    articleEl.querySelectorAll("pre > code").forEach(code => {
      const pre = code.parentElement;
      if (!pre || pre.parentElement.classList.contains("code-card")) return;
      const langClass = Array.from(code.classList).find(name => name.startsWith("language-")) || "";
      const lang = langClass.replace(/^language-/, "") || "code";
      if (typeof hljs !== "undefined" && !code.classList.contains("hljs")) {
        try { hljs.highlightElement(code); } catch(e) {}
      }
      const card = document.createElement("div");
      card.className = "code-card";
      const header = document.createElement("div");
      header.className = "code-card-header";
      header.innerHTML = '<span>' + escapeHtml(lang) + '</span><button type="button" class="code-copy-btn">复制代码</button>';
      const btn = header.querySelector(".code-copy-btn");
      btn.addEventListener("click", function() {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code.textContent || "").then(() => {
            btn.textContent = "已复制 ✓";
            setTimeout(() => { btn.textContent = "复制代码"; }, 1500);
          });
        }
      });
      pre.replaceWith(card);
      card.appendChild(header);
      card.appendChild(pre);
    });
  }

  function injectPageToc(articleEl) {
    const headings = Array.from(articleEl.querySelectorAll("h2, h3"));
    if (headings.length < 2) return;
    const items = [];
    headings.forEach((h, idx) => {
      if (!h.id) {
        h.id = "sec-heading-" + (idx + 1);
      }
      items.push('<li><a href="#' + escapeAttr(h.id) + '" onclick="scrollToHeading(event, ' + escapeJsArgAttr(h.id) + ')">' + escapeHtml(h.textContent || "") + "</a></li>");
    });
    const toc = document.createElement("nav");
    toc.className = "page-toc-card";
    toc.setAttribute("aria-label", "本页大纲");
    toc.innerHTML = '<div class="page-toc-title">本节大纲 (On This Page)</div><ul class="page-toc-list">' + items.join("") + "</ul>";
    const h1 = articleEl.querySelector("h1");
    if (h1 && h1.nextSibling) {
      articleEl.insertBefore(toc, h1.nextSibling);
    } else {
      articleEl.prepend(toc);
    }
  }

  window.scrollToHeading = function(event, id) {
    if (event) event.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  function renderAdjacentPager() {
    if (!STATE) return "";
    const pages = expectedLearningPages();
    const currentKey = currentPageKey();
    const idx = pages.findIndex(p => pageKeyFromParts(p.module, p.section, p.content_file) === currentKey);
    if (idx < 0) return "";
    const prev = idx > 0 ? pages[idx - 1] : null;
    const next = idx < pages.length - 1 ? pages[idx + 1] : null;
    if (!prev && !next) return "";

    function pageCard(page, isNext) {
      if (!page) return "<div></div>";
      const mod = (STATE.modules || []).find(m => m.id === page.module);
      const treeNodes = ((STATE.domain_tree || {}).nodes) || {};
      const isLocked = treeNodes[page.module] && treeNodes[page.module].status === "locked";
      const title = mod ? learningPageTitle(mod, page) : (page.section || page.module);
      const action = isLocked
        ? "showLockedModule()"
        : (page.section
          ? "switchSection(" + escapeJsArgAttr(page.module) + "," + escapeJsArgAttr(page.section) + ")"
          : "switchModule(" + escapeJsArgAttr(page.module) + ")");
      return '<button type="button" class="pager-card' + (isNext ? " is-next" : "") + '" onclick="' + action + '">' +
        '<span class="pager-label">' + (isNext ? "下一节 →" : "← 上一节") + "</span>" +
        '<span class="pager-title">' + escapeHtml(title) + "</span>" +
        "</button>";
    }

    return '<nav class="section-pager" aria-label="上下节导航">' + pageCard(prev, false) + pageCard(next, true) + "</nav>";
  }

  async function postProcessContent(el) {
    const article = el.querySelector("#markdown-article") || el;
    enhanceCallouts(article);
    enhanceComparisonBadges(article);
    enhanceCodeBlocks(article);
    injectPageToc(article);
    try {
      renderCourseMath(el);
    } catch(e) {}
    el.querySelectorAll("img").forEach(img => {
      const src = img.getAttribute("src") || "";
      if (src.startsWith("http://") || src.startsWith("https://")) {
        img.onerror = function() {
          const link = document.createElement("a");
          link.href = src;
          link.textContent = "[图片加载失败: " + src + "]";
          link.target = "_blank";
          link.style.color = "var(--viewer-muted)";
          img.replaceWith(link);
        };
      } else if (src && !src.startsWith("/") && !src.startsWith("data:")) {
        img.setAttribute("src", resolveCourseAsset(src));
      }
    });
  }

  function resolveCourseAsset(src) {
    const file = STATE.current_content_file || "";
    const baseParts = file ? file.split("/") : [STATE.course_slug || ""];
    if (file) baseParts.pop();
    const parts = [];
    for (const part of baseParts.concat(src.split("/"))) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (parts.length > 1) parts.pop();
      } else {
        parts.push(part);
      }
    }
    return "/file/" + parts.map(encodeURIComponent).join("/");
  }

  function renderCourseMath(el) {
    if (typeof window.renderMathInElement === "function") {
      window.renderMathInElement(el, {
        delimiters: COURSE_MATH_DELIMITERS,
        ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
        throwOnError: false
      });
      return;
    }
    el.querySelectorAll("code").forEach(code => {
      const text = code.textContent;
      if (text.startsWith("$$") && text.endsWith("$$") && typeof katex !== "undefined") {
        try {
          const html = katex.renderToString(text.slice(2, -2), { displayMode: true, throwOnError: false });
          const div = document.createElement("div");
          div.innerHTML = html;
          div.className = "math-display";
          code.parentElement.replaceWith(div);
        } catch(e) {}
      }
    });
  }

  function renderLearningOverview() {
    const current = STATE.current_module;
    const completedPages = completedLearningPageKeys();
    const expectedPages = mainCourseLearningPages();
    const completedPageCount = expectedPages.filter(page => completedPages.has(pageKeyFromParts(page.module, page.section, page.content_file))).length;
    const tree = STATE.domain_tree || {};
    const nodes = Object.entries(tree.nodes || {})
      .filter(([id]) => id !== SUPPLEMENT_MODULE_ID)
      .map(([, node]) => node);
    const masteredNodeCount = nodes.filter(node => node.status === "mastered").length;
    const el = document.getElementById("learning-overview");
    if (!el) return;
    if (!current) {
      el.innerHTML = '<div class="viewer-muted">暂无学习进度</div>';
      return;
    }
    const percent = expectedPages.length > 0 ? Math.round((completedPageCount / expectedPages.length) * 100) : 0;
    let html = '<div class="overview-stat-row"><span>主线学习进度</span><strong>' + percent + "%</strong></div>" +
      '<div class="overview-progress-bar"><span style="width:' + percent + '%"></span></div>' +
      '<div class="overview-grid">';
    html += '<div class="overview-metric"><span>已完成学习页</span><strong>' + completedPageCount + "/" + expectedPages.length + "</strong></div>";
    html += (STATE.meta || {}).skill_tree_enabled && nodes.length > 0
      ? '<div class="overview-metric"><span>已掌握节点</span><strong>' + masteredNodeCount + "/" + nodes.length + "</strong></div>"
      : '<div class="overview-metric"><span>技能树状态</span><strong>未启用</strong></div>';
    html += "</div>";
    const rpg = tree.rpg;
    if ((STATE.meta || {}).rpg_enabled && rpg) {
      const xp = Math.max(0, Number(rpg.xp || 0));
      const levelProgress = Math.round(((xp % 500) / 500) * 100);
      const quests = Array.isArray(rpg.quests) ? rpg.quests.map(rpgItemLabel).filter(Boolean).slice(0, 2) : [];
      const achievements = Array.isArray(rpg.achievements) ? rpg.achievements.map(achievementLabel).filter(Boolean).slice(-3) : [];
      html += '<div class="rpg-overview"><div class="rpg-overview-head"><span><strong>Lv.' + (rpg.level || 1) + "</strong> " + escapeHtml(rpg.title || "学徒") + "</span><span>" + xp + " XP</span></div>" +
        '<div class="rpg-xp-track" role="progressbar" aria-label="本级经验进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + levelProgress + '"><span style="width:' + levelProgress + '%"></span></div>';
      if (quests.length > 0) {
        html += '<div class="rpg-next"><span class="rpg-label">当前任务</span>' + quests.map(item => '<div class="rpg-list-item">' + escapeHtml(item) + "</div>").join("") + "</div>";
      }
      if (achievements.length > 0) {
        html += '<div class="rpg-achievements"><span class="rpg-label">最近成就</span><div>' + achievements.map(item => '<span class="achievement-chip">' + escapeHtml(item) + "</span>").join("") + "</div></div>";
      }
      html += "</div>";
    }
    el.innerHTML = html;
  }

  function rpgItemLabel(item) {
    if (typeof item === "string") return item;
    if (!item || typeof item !== "object") return "";
    return item.title || item.name || item.label || item.description || item.id || "";
  }

  function achievementLabel(item) {
    const label = rpgItemLabel(item);
    return ACHIEVEMENT_LABELS[label] || label.replace(/_/g, " ");
  }

  function renderReviewPanel() {
    const due = (STATE || {}).due_reviews || { total: 0, courses: [] };
    const el = document.getElementById("review-panel");
    if (!el) return;
    if ((STATE || {}).review_check_error) {
      el.innerHTML = '<div class="error-box">复习检查失败: ' + escapeHtml(STATE.review_check_error) + "</div>";
      return;
    }
    if (due.total === 0) {
      el.innerHTML = '<div class="viewer-muted">当前课程暂无待复习项</div>';
      return;
    }
    let html = '<div><strong>' + due.total + '</strong> 个知识点需要复习</div>' +
      '<div class="viewer-muted review-intro">先闭眼回想核心机制，再按真实感觉打分。</div>';
    for (const course of due.courses) {
      for (const item of course.items || []) {
        const rated = REVIEW_RATED.find(r => r.concept_id === item.id);
        if (rated) {
          html += '<div class="review-item">' +
            '<div class="review-name is-recorded">' + escapeHtml(item.name) + "</div>" +
            '<div class="viewer-muted">✓ 已记录：' + escapeHtml(ratingLabel(rated.rating)) +
            (rated.next_review ? " · 下次 " + escapeHtml(rated.next_review) : "") + "</div></div>";
        } else {
          html += '<div class="review-item" id="review-' + escapeAttr(item.id) + '">' +
            '<div class="review-name">' + escapeHtml(item.name) + "</div>" +
            (item.retrievability != null ? '<div class="viewer-muted review-strength">当前记忆强度约 ' + Math.round(item.retrievability * 100) + "%</div>" : "") +
            '<div class="review-rating-row">' +
            '<button type="button" class="viewer-btn viewer-btn-xs" data-rating="1" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',1)">忘了</button>' +
            '<button type="button" class="viewer-btn viewer-btn-xs" data-rating="2" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',2)">一点</button>' +
            '<button type="button" class="viewer-btn viewer-btn-xs" data-rating="3" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',3)">大部分</button>' +
            '<button type="button" class="viewer-btn viewer-btn-xs" data-rating="4" onclick="rateReview(this, ' + escapeJsArgAttr(item.id) + ',4)">轻松</button>' +
            "</div>" +
            '<div class="review-feedback"></div></div>';
        }
      }
    }
    el.innerHTML = html;
  }

  window.rateReview = async function(button, conceptId, rating) {
    const sessionKey = currentSessionPageKey();
    const container = document.getElementById("review-" + conceptId);
    if (!container) return;
    beginReviewForSession(sessionKey);
    updateCompletionAction();
    const feedback = container.querySelector(".review-feedback");
    const buttons = container.querySelectorAll("button[data-rating]");
    const oldText = button ? button.textContent : "";
    buttons.forEach(b => {
      b.disabled = true;
      b.classList.add("is-control-disabled");
    });
    if (button) {
      button.textContent = "保存中";
    }
    feedback.style.display = "block";
    feedback.className = "review-feedback viewer-muted";
    feedback.textContent = "正在记录：" + ratingLabel(rating);
    try {
      const resp = await fetch("/api/review-rating", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": TOKEN },
        body: JSON.stringify({ concept_id: conceptId, rating: rating })
      });
      const data = await resp.json();
      if (resp.ok && data.ok) {
        const concept = data.concept || {};
        REVIEW_RATED.push({
          concept_id: conceptId,
          rating: rating,
          next_review: concept.next_review || ""
        });
        countReviewForSession(sessionKey);
        feedback.className = "review-feedback";
        feedback.textContent = "已记录：" + ratingLabel(rating) + (concept.next_review ? "，下次 " + concept.next_review : "");
        notify("复习记录已保存", "success");
        setTimeout(() => renderReviewPanel(), 900);
      } else {
        feedback.className = "review-feedback error-box";
        feedback.textContent = data.error || "记录失败";
        buttons.forEach(b => {
          b.disabled = false;
          b.classList.remove("is-control-disabled");
        });
        if (button) button.textContent = oldText;
      }
    } catch(e) {
      feedback.className = "review-feedback error-box";
      feedback.textContent = "网络错误: " + e.message;
      buttons.forEach(b => {
        b.disabled = false;
        b.classList.remove("is-control-disabled");
      });
      if (button) button.textContent = oldText;
    } finally {
      if (finishReviewForSession(sessionKey)) updateCompletionAction();
    }
  };

  async function saveLearningRecord(event, payload) {
    const resp = await fetch("/api/learning-record", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-Token": TOKEN },
      body: JSON.stringify({
        source: "study.skill.viewer",
        course_slug: STATE.course_slug,
        event: event,
        payload: payload
      })
    });
    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "学习记录保存失败");
    }
    if (data.record) STATE.learning_record = data.record;
    return data;
  }

  function currentPagePayload() {
    return {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      title: STATE.current_section_title || currentModuleLabel()
    };
  }

  function currentPageKey() {
    const page = currentPagePayload();
    return pageKeyFromParts(page.module, page.section, page.content_file);
  }

  function currentSessionPageKey() {
    return currentPageKey() + "|" + SESSION_STARTED_AT;
  }

  function hasCurrentPageView() {
    return LAST_PAGE_SESSION_KEY === currentSessionPageKey();
  }

  function countReviewForSession(sessionKey) {
    if (sessionKey !== currentSessionPageKey()) return false;
    SESSION_REVIEW_RATED_COUNT += 1;
    return true;
  }

  function beginReviewForSession(sessionKey) {
    if (sessionKey !== currentSessionPageKey()) return false;
    SESSION_PENDING_REVIEW_COUNT += 1;
    return true;
  }

  function finishReviewForSession(sessionKey) {
    if (sessionKey !== currentSessionPageKey()) return false;
    SESSION_PENDING_REVIEW_COUNT = Math.max(0, SESSION_PENDING_REVIEW_COUNT - 1);
    return true;
  }

  function recordPageView() {
    if (!STATE || STATE.server_mode !== "interactive") return;
    const key = currentPageKey();
    const sessionKey = currentSessionPageKey();
    if (!key || hasCurrentPageView() || PAGE_VIEW_PENDING_SESSION === sessionKey) return;
    PAGE_VIEW_PENDING_SESSION = sessionKey;
    updateCompletionAction();
    const payload = currentPagePayload();
    payload.started_at = SESSION_STARTED_AT;
    saveLearningRecord("page_view", payload)
      .then(() => {
        if (sessionKey !== currentSessionPageKey()) return;
        LAST_PAGE_SESSION_KEY = sessionKey;
        if (PAGE_VIEW_PENDING_SESSION === sessionKey) PAGE_VIEW_PENDING_SESSION = "";
        renderNav();
        renderLearningOverview();
        updateCompletionAction();
      })
      .catch(e => {
        if (sessionKey !== currentSessionPageKey()) return;
        if (PAGE_VIEW_PENDING_SESSION === sessionKey) PAGE_VIEW_PENDING_SESSION = "";
        updateCompletionAction();
        notify(e.message, "error");
      });
  }

  function currentPageExerciseIds() {
    return Array.from(document.querySelectorAll("#content .study-block:not(.study-walkthrough)"))
      .map(block => block.getAttribute("data-study-id"))
      .filter(Boolean);
  }

  function submittedCurrentExerciseIds() {
    return EXERCISES
      .filter(item => item.module === STATE.current_module && (item.section || null) === (STATE.current_section || null))
      .map(item => String(item.id));
  }

  function submittedCurrentEvidenceIds() {
    return new Set(submittedCurrentExerciseIds().concat(
      CHECKPOINTS
        .filter(item => item.module === STATE.current_module && (item.section || null) === (STATE.current_section || null))
        .map(item => String(item.id))
    ));
  }

  function allCurrentExercisesSubmitted() {
    const pageExerciseIds = currentPageExerciseIds();
    if (pageExerciseIds.length === 0) return true;
    const submitted = submittedCurrentEvidenceIds();
    return pageExerciseIds.every(id => submitted.has(String(id)));
  }

  function updateCompletionAction() {
    const button = document.getElementById("finish-session-btn");
    const note = document.getElementById("session-finish-note");
    const finish = document.getElementById("session-finish");
    if (!button || !note || !STATE) return;
    const key = currentPageKey();
    if (SESSION_COMPLETED_PAGE_KEYS.has(currentSessionPageKey())) {
      button.disabled = true;
      button.textContent = "本次已保存";
      note.textContent = "学习证据已保存，掌握度和 XP 仍由作答、解释与复习结果决定。";
      if (finish) finish.classList.add("is-completed");
      return;
    }
    if (!hasCurrentPageView()) {
      const pageViewPending = PAGE_VIEW_PENDING_SESSION === currentSessionPageKey();
      button.disabled = pageViewPending;
      button.textContent = pageViewPending ? "准备中" : "重试准备";
      note.textContent = pageViewPending ? "正在保存本页打开记录..." : "本页打开记录保存失败，点击重试。";
      return;
    }
    if (SESSION_PENDING_REVIEW_COUNT > 0) {
      button.disabled = true;
      button.textContent = "保存中";
      note.textContent = "正在保存本页复习评分...";
      return;
    }
    const submitted = submittedCurrentEvidenceIds();
    const pendingCount = currentPageExerciseIds().filter(id => !submitted.has(String(id))).length;
    button.disabled = pendingCount > 0;
    button.textContent = COMPLETED_PAGE_KEYS.has(key) ? "完成本次复习" : "完成本次学习";
    note.textContent = pendingCount > 0
      ? "还需提交本页 " + pendingCount + " 道练习。"
      : (COMPLETED_PAGE_KEYS.has(key) ? "这页已有历史记录；确认本次复习完成后再保存。" : "确认读完本页后保存学习证据。");
  }

  window.finishCurrentPage = async function() {
    if (!STATE || STATE.server_mode !== "interactive") return;
    const button = document.getElementById("finish-session-btn");
    const note = document.getElementById("session-finish-note");
    const finish = document.getElementById("session-finish");
    const key = currentPageKey();
    const sessionKey = currentSessionPageKey();
    const completionPayload = {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      started_at: SESSION_STARTED_AT,
      question_count: 0,
      exercise_ids: [],
      review_rated_count: 0
    };
    if (!button || !note || !key || SESSION_COMPLETED_PAGE_KEYS.has(sessionKey)) return;
    if (!hasCurrentPageView()) {
      recordPageView();
      return;
    }
    if (SESSION_PENDING_REVIEW_COUNT > 0) {
      updateCompletionAction();
      return;
    }
    if (!allCurrentExercisesSubmitted()) {
      updateCompletionAction();
      return;
    }
    button.disabled = true;
    button.textContent = "保存中";
    note.textContent = "正在写入本次学习证据...";
    try {
      if (PENDING_QUESTION_SAVE_SESSION === SESSION_STARTED_AT) await PENDING_QUESTION_SAVE;
      if (sessionKey !== currentSessionPageKey()) return;
      completionPayload.question_count = SESSION_QUESTION_COUNT;
      completionPayload.exercise_ids = Array.from(SESSION_SUBMITTED_EXERCISE_IDS);
      completionPayload.review_rated_count = SESSION_REVIEW_RATED_COUNT;
      await saveLearningRecord("completion", completionPayload);
      COMPLETED_PAGE_KEYS.add(key);
      SESSION_COMPLETED_PAGE_KEYS.add(sessionKey);
      if (sessionKey !== currentSessionPageKey()) return;
      renderNav();
      renderLearningOverview();
      updateCompletionAction();
      if (finish) finish.classList.add("is-completed");
      notify("本次学习已保存", "success");
    } catch(e) {
      if (sessionKey === currentSessionPageKey()) {
        updateCompletionAction();
        note.textContent = "学习证据保存失败，点击完成按钮重试。";
      }
      notify(e.message, "error");
    }
  };

  function upsertById(list, id, record) {
    const index = list.findIndex(item => item.id === id);
    if (index >= 0) {
      list[index] = record;
    } else {
      list.push(record);
    }
  }

  window.toggleAnswerPanel = function(btn) {
    const panel = btn.closest("[data-answer-panel]");
    if (!panel || !panel.classList.contains("is-unlocked")) return;
    const isOpen = panel.classList.toggle("is-open");
    btn.classList.toggle("is-open", isOpen);
  };

  window.saveExerciseAnswer = async function(block) {
    const sessionKey = currentSessionPageKey();
    const id = block.getAttribute("data-study-id");
    const type = block.getAttribute("data-study-type");
    const question = block.getAttribute("data-study-question");
    const answer = block.getAttribute("data-study-answer");
    const explanation = block.getAttribute("data-study-explanation") || "";
    const masteryTags = block.getAttribute("data-study-mastery-tags") || "";
    const result = block.querySelector(".assess-result");
    const userAnswer = readStudyAnswer(block);
    if (!userAnswer) {
      result.style.display = "block";
      result.className = "assess-result error-box";
      result.textContent = "先写下或选择答案，再提交";
      return;
    }
    const submittedExercise = {
      id: id,
      type: type,
      module: STATE.current_module,
      section: STATE.current_section || null,
      question: question,
      user_answer: userAnswer,
      reference_answer: answer,
      explanation: explanation,
      mastery_tags: masteryTags ? masteryTags.split(",").filter(Boolean) : [],
      time_spent_seconds: 0
    };
    const saveBtn = block.querySelector(".save-answer-btn");
    const saveButtonText = saveBtn ? saveBtn.textContent : "";
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "保存中";
    }
    if (STATE.server_mode === "interactive") {
      try {
        await saveLearningRecord("exercise_submitted", {
          module: STATE.current_module,
          section: STATE.current_section || null,
          content_file: STATE.current_content_file || "",
          exercise: submittedExercise
        });
      } catch(e) {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = saveButtonText;
        }
        notify(e.message, "error");
        return;
      }
    }
    upsertById(EXERCISES, id, submittedExercise);
    if (sessionKey === currentSessionPageKey()) {
      SESSION_SUBMITTED_EXERCISE_IDS.add(String(id));
      markStudyBlockSubmitted(block);
      updateCompletionAction();
    }
  };

  function markStudyBlockSubmitted(block) {
    block.setAttribute("data-answer-unlocked", "true");
    block.classList.add("is-submitted");
    block.querySelectorAll("input, textarea").forEach(input => {
      input.disabled = true;
    });
    const saveBtn = block.querySelector(".save-answer-btn");
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = "已提交 ✓";
    }
    const answerPanel = block.querySelector("[data-answer-panel]");
    if (answerPanel) {
      answerPanel.style.display = "block";
      answerPanel.classList.add("is-unlocked", "is-open");
      const toggle = answerPanel.querySelector(".answer-toggle");
      if (toggle) toggle.classList.add("is-open");
    }
    const result = block.querySelector(".assess-result");
    if (result) {
      result.style.display = "none";
      result.className = "assess-result";
      result.textContent = "";
    }
  }

  function readStudyAnswer(block) {
    const type = block.getAttribute("data-study-type");
    if (type === "choice") {
      const selected = Array.from(block.querySelectorAll("input[type='checkbox']:checked, input[type='radio']:checked"));
      return selected.map(input => input.value).join(", ");
    }
    if (type === "truefalse") {
      const selected = block.querySelector("input[type='radio']:checked");
      return selected ? (selected.value === "true" ? "正确" : "错误") : "";
    }
    const field = block.querySelector(".exercise-answer");
    return field ? field.value.trim() : "";
  }

  window.submitCheckpoint = async function(block) {
    const id = block.getAttribute("data-study-id");
    const total = parseInt(block.getAttribute("data-study-total") || "0", 10);
    const minPass = parseInt(block.getAttribute("data-study-min-pass") || "0", 10);
    const result = block.querySelector(".assess-result");
    const checkpoint = {
      id: id,
      module: STATE.current_module,
      section: STATE.current_section || null,
      items_total: total,
      min_pass: minPass
    };
    const buttons = block.querySelectorAll(".checkpoint-assess button");
    buttons.forEach(button => { button.disabled = true; });
    if (STATE.server_mode === "interactive") {
      try {
        await saveLearningRecord("legacy_checkpoint_submitted", {
          module: STATE.current_module,
          section: STATE.current_section || null,
          content_file: STATE.current_content_file || "",
          checkpoint: checkpoint
        });
      } catch(e) {
        buttons.forEach(button => { button.disabled = false; });
        notify(e.message, "error");
        return;
      }
    }
    upsertById(CHECKPOINTS, id, checkpoint);
    result.style.display = "none";
    result.className = "assess-result";
    result.textContent = "";
    updateCompletionAction();
  };

  window.toggleHint = function(btn, index) {
    const container = btn.parentElement.querySelector(".hints-container");
    container.style.display = "block";
    const hint = container.querySelector('[data-hint="' + index + '"]');
    hint.style.display = hint.style.display === "none" ? "block" : "none";
  };

  window.toggleDrawer = function(target) {
    const className = target === "nav" ? "show-nav" : "show-aside";
    const shouldOpen = !document.body.classList.contains(className);
    closeDrawers(false);
    if (shouldOpen) {
      DRAWER_TRIGGER = document.activeElement;
      document.body.classList.add(className);
    }
    syncDrawerInert();
    syncDrawerButtons();
    if (shouldOpen) {
      const drawer = document.getElementById(target === "nav" ? "course-sidebar" : "learning-sidebar");
      if (drawer) window.requestAnimationFrame(() => drawer.focus());
    }
  };

  function closeDrawers(restoreFocus = true) {
    const hadOpenDrawer = document.body.classList.contains("show-nav") || document.body.classList.contains("show-aside");
    document.body.classList.remove("show-nav", "show-aside");
    syncDrawerInert();
    syncDrawerButtons();
    if (restoreFocus && hadOpenDrawer && DRAWER_TRIGGER && typeof DRAWER_TRIGGER.focus === "function") {
      DRAWER_TRIGGER.focus();
    }
    DRAWER_TRIGGER = null;
  }
  window.closeDrawers = closeDrawers;

  function closeDrawersOutsideBreakpoints() {
    if (
      (document.body.classList.contains("show-nav") && window.innerWidth > 780) ||
      (document.body.classList.contains("show-aside") && window.innerWidth > 1120)
    ) {
      closeDrawers(false);
    }
  }

  function syncDrawerInert() {
    const navOpen = document.body.classList.contains("show-nav");
    const panelOpen = document.body.classList.contains("show-aside");
    const content = document.querySelector(".viewer-body");
    const nav = document.getElementById("course-sidebar");
    const panel = document.getElementById("learning-sidebar");
    if (content) content.toggleAttribute("inert", navOpen || panelOpen);
    if (nav) nav.toggleAttribute("inert", panelOpen);
    if (panel) panel.toggleAttribute("inert", navOpen);
  }

  function trapDrawerFocus(event) {
    if (event.key !== "Tab") return;
    const drawer = document.body.classList.contains("show-nav")
      ? document.getElementById("course-sidebar")
      : (document.body.classList.contains("show-aside") ? document.getElementById("learning-sidebar") : null);
    if (!drawer) return;
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(element => element.offsetParent !== null);
    if (focusable.length === 0) {
      event.preventDefault();
      drawer.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (document.activeElement === drawer || !drawer.contains(document.activeElement) || (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  function syncDrawerButtons() {
    const navButton = document.getElementById("nav-toggle-btn");
    const panelButton = document.getElementById("panel-toggle-btn");
    const navOpen = document.body.classList.contains("show-nav");
    const panelOpen = document.body.classList.contains("show-aside");
    if (navButton) {
      navButton.setAttribute("aria-expanded", String(navOpen));
      navButton.setAttribute("aria-label", navOpen ? "关闭课程目录" : "打开课程目录");
    }
    if (panelButton) {
      panelButton.setAttribute("aria-expanded", String(panelOpen));
      panelButton.setAttribute("aria-label", panelOpen ? "关闭学习面板" : "打开学习面板");
    }
  }

  window.switchModule = function(moduleId) {
    EXPANDED_MODULES.add(moduleId);
    fetch("/api/initial-state?token=" + encodeURIComponent(TOKEN) + "&module=" + encodeURIComponent(moduleId) + "&section=")
      .then(async r => {
        const state = await r.json();
        if (!r.ok) throw new Error(state.error || "切换模块失败");
        return state;
      })
      .then(state => {
        STATE = state;
        closeDrawers();
        const contentEl = document.getElementById("content");
        if (contentEl) contentEl.scrollTop = 0;
        renderAll();
      })
      .catch(e => showError("切换模块失败: " + e.message));
  };

  window.switchSection = function(moduleId, sectionId) {
    EXPANDED_MODULES.add(moduleId);
    fetch("/api/initial-state?token=" + encodeURIComponent(TOKEN) +
      "&module=" + encodeURIComponent(moduleId) +
      "&section=" + encodeURIComponent(sectionId))
      .then(async r => {
        const state = await r.json();
        if (!r.ok) throw new Error(state.error || "切换小节失败");
        return state;
      })
      .then(state => {
        STATE = state;
        closeDrawers();
        const contentEl = document.getElementById("content");
        if (contentEl) contentEl.scrollTop = 0;
        renderAll();
      })
      .catch(e => showError("切换小节失败: " + e.message));
  };

  window.showLockedModule = function() {
    notify("这个章节还未解锁，先完成前置章节。", "error");
  };

  window.toggleTheme = function() {
    isDark = !isDark;
    applyThemeClass();
    updateThemeBtn();
    updateThemeAssets();
    if (STATE) renderContent(STATE.current_content || STATE.readme || "");
  };

  function updateThemeAssets() {
    const link = document.getElementById("hljs-theme");
    if (!link) return;
    link.href = isDark
      ? "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css"
      : "https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css";
  }

  function updateThemeBtn() {
    const btnLabel = document.getElementById("theme-btn-label");
    const btn = document.getElementById("theme-btn");
    const text = isDark ? "浅色" : "深色";
    if (btnLabel) btnLabel.textContent = text;
    else if (btn) btn.textContent = text;
  }

  window.addQuestion = function() {
    const input = document.getElementById("question-input");
    if (!input) return;
    const q = input.value.trim();
    if (!q) return;
    const wasPresent = QUESTIONS.includes(q);
    if (!wasPresent) QUESTIONS.push(q);
    input.value = "";
    renderQuestions();
    persistQuestionChange("question_added", q, !wasPresent).catch(() => {
      if (!wasPresent) QUESTIONS = QUESTIONS.filter(item => item !== q);
      if (!input.value) input.value = q;
      renderQuestions();
    });
  };

  window.requestMasteryChallenge = function(nodeName, detail) {
    const question = masteryChallengeQuestion(nodeName, detail);
    const wasPresent = QUESTIONS.includes(question);
    if (!wasPresent) QUESTIONS.push(question);
    renderQuestions();
    closeDrawers();
    persistQuestionChange("question_added", question, !wasPresent)
      .then(() => notify("掌握挑战已在待问清单中，回到聊天即可开始", "success"))
      .catch(() => {
        if (!wasPresent) QUESTIONS = QUESTIONS.filter(item => item !== question);
        renderQuestions();
      });
  };

  function setupTextSelection() {
    const content = document.getElementById("content");
    if (!content) return;
    let floatBtn = null;
    content.addEventListener("mouseup", function(e) {
      if (floatBtn) { floatBtn.remove(); floatBtn = null; }
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      if (text.length < 2) return;
      floatBtn = document.createElement("button");
      floatBtn.type = "button";
      floatBtn.className = "text-select-btn";
      floatBtn.textContent = "问这个";
      floatBtn.style.left = Math.max(12, e.clientX - 36) + "px";
      floatBtn.style.top = Math.max(12, e.clientY - 40) + "px";
      floatBtn.onclick = function() {
        const snippet = text.length > 100 ? text.slice(0, 100) + "..." : text;
        const input = document.getElementById("question-input");
        if (input) {
          input.value = "关于「" + snippet + "」：";
          input.focus();
        }
        floatBtn.remove();
        floatBtn = null;
        window.getSelection().removeAllRanges();
      };
      document.body.appendChild(floatBtn);
      setTimeout(() => { if (floatBtn) { floatBtn.remove(); floatBtn = null; } }, 5000);
    });
    document.addEventListener("mousedown", function(e) {
      if (floatBtn && !floatBtn.contains(e.target)) {
        floatBtn.remove();
        floatBtn = null;
      }
    });
  }

  function renderQuestions() {
    const el = document.getElementById("question-list");
    if (!el) return;
    if (QUESTIONS.length === 0) {
      el.innerHTML = '<div class="viewer-muted">暂无问题（选中正文文字可一键提问）</div>';
      return;
    }
    let html = "";
    QUESTIONS.forEach((q, i) => {
      html += '<div class="question-row"><span>' +
        escapeHtml(q) + '</span><button type="button" class="viewer-btn viewer-btn-xs" onclick="removeQuestion(' + i + ')">删除</button></div>';
    });
    el.innerHTML = html;
  }

  window.removeQuestion = function(index) {
    const question = QUESTIONS[index];
    if (typeof question !== "string") return;
    QUESTIONS.splice(index, 1);
    renderQuestions();
    persistQuestionChange("question_removed", question).catch(() => {
      if (!QUESTIONS.includes(question)) QUESTIONS.splice(Math.min(index, QUESTIONS.length), 0, question);
      renderQuestions();
    });
  };

  function persistQuestionChange(event, question, countAsNew = false) {
    if (!STATE || STATE.server_mode !== "interactive") {
      const error = new Error("只读模式不能保存待问问题");
      notify(error.message, "error");
      return Promise.reject(error);
    }
    const sessionStartedAt = SESSION_STARTED_AT;
    PENDING_QUESTION_SAVE_SESSION = sessionStartedAt;
    const payload = {
      module: STATE.current_module,
      section: STATE.current_section || null,
      content_file: STATE.current_content_file || "",
      question: question
    };
    const operation = PENDING_QUESTION_SAVE
      .catch(() => undefined)
      .then(() => saveLearningRecord(event, payload))
      .then(data => {
        const serverQuestions = data && data.record && data.record.questions_for_llm;
        if (Array.isArray(serverQuestions)) QUESTIONS = serverQuestions.slice();
        renderQuestions();
        if (SESSION_STARTED_AT !== sessionStartedAt) return;
        if (countAsNew) SESSION_QUESTION_COUNT += 1;
      });
    PENDING_QUESTION_SAVE = operation;
    operation.catch(e => {
      notify(e.message, "error");
      if (PENDING_QUESTION_SAVE === operation) {
        PENDING_QUESTION_SAVE = Promise.resolve();
        PENDING_QUESTION_SAVE_SESSION = "";
      }
    });
    return operation;
  }

  function updateReadingProgress() {
    const content = document.getElementById("content");
    const bar = document.getElementById("reading-progress-bar");
    if (!content || !bar) return;
    const maxScroll = content.scrollHeight - content.clientHeight;
    const pct = maxScroll > 10 ? Math.min(100, Math.round((content.scrollTop / maxScroll) * 100)) : 100;
    bar.style.width = pct + "%";
  }

  document.addEventListener("DOMContentLoaded", function() {
    init();
    renderQuestions();
    setupNavToggle();
    setupTextSelection();
    const contentEl = document.getElementById("content");
    if (contentEl) {
      contentEl.addEventListener("scroll", updateReadingProgress, { passive: true });
    }
    window.addEventListener("resize", closeDrawersOutsideBreakpoints);
    document.addEventListener("keydown", function(event) {
      const activeTag = document.activeElement ? document.activeElement.tagName : "";
      const isEditing = activeTag === "INPUT" || activeTag === "TEXTAREA";
      if (event.key === "Escape") {
        closeDiagramModal();
        closeDrawers();
      } else if (!isEditing && event.key === "[") {
        toggleDrawer("nav");
      } else if (!isEditing && event.key === "]") {
        toggleDrawer("panel");
      } else {
        trapDrawerFocus(event);
      }
    });
  });

})();
