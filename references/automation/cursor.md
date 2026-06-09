# Cursor 复习提醒自动化

> **来源**: https://cursor.com/blog/automations
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 定时任务 | ✅ Automations | 支持 Hourly、Daily、Weekly、自定义 cron |
| 事件触发 | ✅ | 文件保存、Git 提交、PR 创建、CI/CD Webhook、Slack、Linear、PagerDuty |
| 自定义 Webhook | ✅ | REST API 触发 |
| 云端沙箱 | ✅ | 计算机关闭也能运行 |
| 记忆工具 | ✅ | 跨运行保留信息 |
| 会话启动检查 | ❌ | 无 SessionStart hook |

## 配置：创建自动化

在 Cursor 应用中，进入 **Automations** → **Create automation**：

| 字段 | 值 |
|------|-----|
| Name | 学习复习提醒 |
| Repository | 选择你的学习目录 |
| Schedule | Daily, 选择你习惯的学习时间 |
| Prompt | 检查 .learning-profile/courses/*/concepts.json 中的到期复习项。运行 python3 .learning-profile/scripts/check-reviews.py。如果有 overdue 项，输出提醒。 |
| Run in cloud | 启用 |

## 配置：事件触发（可选）

如果你想在每次 Git 提交时也检查复习：

| 字段 | 值 |
|------|-----|
| Trigger | Git commit |
| Prompt | 快速检查是否有到期复习项，如果有简短提醒 |

## 验证

1. 确认 `.learning-profile/scripts/check-reviews.py` 存在
2. 在 Automations 中点击 **Run now** 测试
3. 确认 Triage 面板有输出

## 限制

- 无会话启动检查，只能靠定时任务或事件触发
- 需要 Cursor Pro 计划
- 云端运行需要仓库在 GitHub 上
