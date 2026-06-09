# GitHub Copilot 复习提醒自动化

> **来源**: https://docs.github.com/en/copilot/how-tos/github-copilot-app/using-automations
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 定时任务 | ✅ Automations | Daily、Weekly、自定义计划 |
| 仓库事件 | ✅ | 新 Issue、PR、CI 事件触发 |
| 云端运行 | ✅ | Run in cloud 选项 |
| 本地运行 | ✅ | 在 GitHub Copilot 应用中运行 |
| 会话启动检查 | ❌ | 无 SessionStart hook |

## 配置

在 GitHub Copilot 应用中，点击侧边栏 **Automations** → **New automation**：

| 字段 | 值 |
|------|-----|
| Name | 学习复习提醒 |
| Repository | 选择你的学习目录所在仓库 |
| Schedule | Daily |
| Prompt | 检查 .learning-profile/courses/*/concepts.json 中的到期复习项。运行 python3 .learning-profile/scripts/check-reviews.py。如果有 overdue 项，输出提醒。 |
| Run as cloud automation | 启用 |

也可以在 github.com 上创建：仓库 → Agents tab → Automations → Create new。

## 验证

1. 确认 `check-reviews.py` 已提交到仓库
2. 在 Automations 页面点击 play 按钮手动触发
3. 确认运行结果显示在 Automations 历史中

## 限制

- 需要 Copilot Pro/Pro+/Max/Business/Enterprise
- Business/Enterprise 需要管理员启用 Copilot cloud agent 策略
- 仅支持 GitHub 仓库内的项目
- 目前仅支持私有和内部仓库（公开仓库即将支持）
