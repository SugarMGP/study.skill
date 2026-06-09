# Codex 复习提醒自动化

> **来源**: https://developers.openai.com/codex/app/automations
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 定时任务 | ✅ Automations | 支持 cron 表达式、固定间隔、自定义计划 |
| 会话启动检查 | ✅ AGENTS.md | AGENTS.md 每次会话自动加载 |
| 事件触发 | ✅ | 支持 Slack、Linear、GitHub 事件、Webhook |
| Triage 收件箱 | ✅ | 自动化结果推送到 Codex 应用 Triage 面板 |
| Skill 创建自动化 | ✅ | 通过自然语言让 Codex 自动创建定时任务 |
| 工作树隔离 | ✅ | Git 仓库中自动化可在独立 worktree 运行 |

**注意：** 本地项目自动化需要本机开着、Codex 运行、项目在磁盘上可用。
云端运行（Run in cloud）仅在仓库托管在 GitHub 上且选中该选项时生效。
详见官方文档的沙箱模式说明。

## 配置方案一：自然语言创建自动化

在 Codex 对话中说：

```
设置一个每天早上 9 点运行的定时任务：
检查 .learning-profile/courses/*/concepts.json 中的到期复习项，
如果有 overdue，提醒我复习。
```

Codex 会自动创建一个定时自动化，配置好 schedule 和 prompt。

## 配置方案二：AGENTS.md（会话启动检查）

在项目根目录的 AGENTS.md 中添加：

```markdown
## 学习助手
如果你的工作目录下存在 `.learning-profile/` 目录，在每次会话开始时，
运行 `python3 .learning-profile/scripts/check-reviews.py` 检查到期复习。
如果有 overdue 项，第一句话提醒用户。
```

## 配置方案三：手动创建自动化

在 Codex 应用侧边栏 → **Automations** → **Create new**：

| 字段 | 值 |
|------|-----|
| Name | 学习复习提醒 |
| Repository | 选择你的学习目录所在仓库 |
| Schedule | Daily, 09:00 |
| Prompt | 检查 .learning-profile/courses/*/concepts.json 中的到期复习项。运行 python3 .learning-profile/scripts/check-reviews.py。如果有 overdue 项，输出提醒。 |
| Run in cloud | 仅 GitHub 仓库云端自动化启用；本地项目不要填成云端 |

## 验证

1. 确认 AGENTS.md 中有学习助手指令
2. 创建一个测试 concepts.json，将 `last_review` 设为很久以前
3. 在 Codex 中开启新会话，确认 agent 自动检查并提醒
4. 对于定时任务，在 Automations 面板确认任务状态为 Active

## 限制

- AGENTS.md 方案仅在会话启动时检查，不是定时推送
- Automations 需要 Codex Pro/Enterprise 计划
- 云端运行需要仓库在 GitHub 上可用
