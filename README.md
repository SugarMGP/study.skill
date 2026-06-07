# study.skill

> 请个师傅，学门手艺。

一个通用学习 skill，让 AI agent 变成你的私人师傅——会调研、会备课、会答疑、会盯着你复习。不只是生成教程，而是带你走完整个学习闭环。

## 能做什么

- 📋 **问清再教**：不是扔给你一份通用教程，而是先了解你的基础、目标、时间，定制学习路线
- 🔍 **调研后写**：生成课程前，agent 会调研官方文档、源码、中文社区高星教程，确保内容准确
- 📚 **中文原生教程**：生成的课程遵循极客时间、rust-course 等顶尖中文教程的写作规范——大白话先行、类比必含、判读标准明确、踩坑指南齐全
- 🎓 **手把手教学**：每个模块按 Gagné 九段教学法进行——引入→讲解→练习→纠错→自测→联系实际
- 🧠 **科学复习**：基于间隔重复算法，自动安排复习，对抗遗忘曲线
- 📊 **学习快报**：每次打开都能看到进度、连续学习天数、待复习提醒

## 使用

直接对 agent 说：

```
"我想学 React"
"帮我学 Rust"
"学习路线：大模型应用开发"
"教我 PostgreSQL 底层原理"
```

然后跟着师傅走。

### 学习模式

| 模式 | 适合 | 周期 |
|------|------|------|
| 🏃 速成导览 | 紧急换技术栈，快速上手能干活 | 3-7 天 |
| 📚 系统精讲 | 想从原理到实战全面掌握 | 2-4 周 |
| 🎯 面试冲刺 | 准备面试，高频考点+手写题 | 1-2 周 |

### 最小闭环

着急的话，agent 也可以快速出课程大纲和第一讲，你先学着，完整功能下次再说。

## 理论基础

基于 13 个教学框架 + 28 篇学术论文 + 7 个中文高星教程仓库 + 7 个 agent skill 项目的深度分析。详见 [设计文档](./docs/superpowers/specs/2026-06-08-study-skill-design.md)。

## 生成的文件

```
你的目录/
├── .learning-profile/
│   ├── progress.json         # 学习进度
│   └── review-schedule.json  # 复习排期
└── courses/
    └── {课程名}/
        ├── README.md          # 课程概览
        ├── syllabus.md        # 完整大纲
        ├── 01-xxx/content.md  # 模块内容
        ├── flashcards.csv     # 闪卡（可导入 Anki）
        ├── interview-qa.md    # 面试题库
        ├── glossary.md        # 术语表
        └── resources.md       # 资源索引
```

## 文件结构

```
study.skill/
├── SKILL.md                          # 路由层
├── README.md                         # 本文件
├── references/
│   ├── phase-0-anchoring.md          # 锚定对话协议
│   ├── phase-1-research.md           # 调研方法论（技术/通用双路径）
│   ├── phase-2-generation.md         # 课程生成引擎
│   ├── phase-3-learning.md           # 互动教学模式
│   ├── phase-4-consolidation.md      # 复习与快报
│   ├── chinese-tutorial-guide.md     # 中文教程写作规范（技术/通用）
│   ├── fsrs-scheduler.md            # 简化间隔复习算法
│   └── skill-tree.md                # 技能树（RPG展示层，按需加载）
└── scripts/
    ├── init-profile.sh              # Unix 初始化脚本
    └── init-profile.ps1             # Windows 初始化脚本
```

## License

MIT
