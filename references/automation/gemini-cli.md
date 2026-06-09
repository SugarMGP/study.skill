# Gemini CLI 复习提醒自动化

> **来源**: https://geminicli.com/docs/hooks/reference/ + https://geminicli.com/docs/cli/gemini-md
> **验证日期**: 2026-06-09

## 该平台支持什么

| 能力 | 支持 | 说明 |
|------|:----:|------|
| 会话启动检查 | ✅ SessionStart hook | 每次会话开始自动运行脚本 |
| GEMINI.md 自动加载 | ✅ | 支持 3 级上下文层次 |
| 可读 AGENTS.md | ✅ | 通过 settings.json 的 context.fileName 配置 |
| 定时任务 | ❌ | 无原生定时功能 |
| 推送通知 | ❌ | 无通知系统 |

## 配置方案一：GEMINI.md（推荐）

在项目根目录创建 GEMINI.md：

```markdown
## 学习助手
如果你的工作目录下存在 `.learning-profile/` 目录，在每次会话开始时，
运行 `python3 .learning-profile/scripts/check-reviews.py` 检查到期复习。
如果有 overdue 项，第一句话提醒用户。
```

或者让 Gemini CLI 读取已有的 AGENTS.md，在 `.gemini/settings.json` 中：

```json
{
  "context": {
    "fileName": ["AGENTS.md", "GEMINI.md"]
  }
}
```

## 配置方案二：SessionStart hook

在 `.gemini/settings.json` 中添加：

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup|resume",
        "hooks": [
          {
            "name": "review-check",
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

## 验证

1. 确认 GEMINI.md 或 AGENTS.md 中有学习助手指令
2. 开启新会话，确认 agent 自动检查复习
3. 如果使用 hook，确认 `.gemini/settings.json` 格式正确

## 限制

- 无定时任务能力，只能靠会话启动检查
- 需要用户主动开启会话才能触发
- 无推送通知
- 建议配合外部定时器（如系统 cron）调用 Gemini CLI
