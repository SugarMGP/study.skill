# Claude Code 复习提醒自动化

> **来源**: https://code.claude.com/docs/zh-CN/desktop-scheduled-tasks + https://docs.anthropic.com/en/docs/claude-code/hooks
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 本地定时任务 | ✅ Routines | Desktop 应用内创建，机器唤醒时运行 |
| 远程云端任务 | ✅ Remote Routines | Anthropic 云运行，机器关闭也能触发 |
| 会话启动检查 | ✅ SessionStart hook | 每次会话开始自动运行脚本 |
| Desktop 通知 | ✅ | 任务触发时系统通知 |
| 追赶运行 | ✅ | 机器睡眠期间错过的任务，唤醒后自动补一次（7天内） |

## 配置方案一：Desktop Routines（推荐）

在 Claude Code Desktop 中，点击侧边栏 **Routines** → **New routine** → **Local**：

| 字段 | 值 |
|------|-----|
| Name | `学习复习提醒` |
| Description | 每天早上检查是否有到期复习 |
| Schedule | Daily → 选择你习惯的学习时间 |
| Instructions | `检查 .learning-profile/courses/*/concepts.json 中的到期复习项，如果有 overdue，向用户发送提醒。运行 python3 .learning-profile/scripts/check-reviews.py 获取详情。` |
| Permission | Always allow（避免每次卡在权限提示） |

创建后点击 **Run now** 验证一次。

## 配置方案二：SessionStart hook

在 `.claude/settings.json` 中添加：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "type": "command",
            "command": "python3 .learning-profile/scripts/check-reviews.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

SessionStart hook 输出的文本会自动注入 Claude 的上下文。

## 配置方案三：Remote Routine（机器关闭也能运行）

适用于需要即使电脑关机也能定时触发的场景。在 Routines 页面创建时选择 **Remote**。

## 验证

1. 确认 `.learning-profile/scripts/check-reviews.py` 存在且可执行
2. 创建一个测试 concepts.json，将某个知识点的 `last_review` 设为很久以前
3. 运行 `python3 .learning-profile/scripts/check-reviews.py`，确认输出 overdue 项
4. 在 Routines 中点击 **Run now**，确认任务执行

## 限制

- 本地任务仅在 Desktop 应用运行且机器唤醒时触发
- Remote Routine 需要 Claude Pro/Team/Enterprise 计划
- SessionStart hook 不支持定时，只在会话开始时触发
