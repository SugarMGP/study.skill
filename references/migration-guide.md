# 数据迁移指南：升级到 schema_version 4

> 适用于：已有旧版 `.learning-profile/progress.json` / `.learning-profile/review-schedule.json`
> 的用户，也适用于已经使用 schema_version 1、2 或 3 新目录结构的用户。

## 变更概览

旧版单一状态文件：

```text
.learning-profile/
├── progress.json
└── review-schedule.json
```

新版每门课程独立存储：

```text
.learning-profile/
├── profile.json
└── courses/
    └── {course-slug}/
        ├── meta.json
        ├── params.json
        ├── concepts.json
        ├── domain-tree.json
        └── learning-record.json
```

schema_version 4 的关键规则：

- 每个正式 JSON 文件都写 `schema_version: 4`
- `target_retention` 只保存在 `params.json`
- `concepts.json` 不保存 R（记忆可提取率）；R 每次按 FSRS（自由间隔重复调度算法）公式实时计算
- `profile.json.preferences` 不再包含平台自动化、定时任务、hook 或推送相关字段
- `profile.json.learner_profile` 保存学习者画像，例如已会语言、薄弱前置、类比偏好、教学约束和材料摘要
- 课程默认 `skill_tree_enabled=true`、`rpg_enabled=true`、`rpg_preference_asked=false`
- 每门课程新增 `learning-record.json`，播放器把浏览、作答、复习评分摘要和完成事件持续合并到这一个文件
- `.learning-profile/tmp/viewer-sessions/` 不再是正式运行契约；如果本地还有旧临时文件，只能作为人工排查材料
- 旧 `progress.json` 或 `review-schedule.json` 一旦出现，迁移就是阻塞项：不要继续读取旧文件教学，也不要手写兼容状态
- 迁移脚本写入新版结构并验证成功后，直接删除旧文件

## 自动迁移

使用仓库脚本：

```bash
python scripts/migrate-profile.py /path/to/learning/.learning-profile
```

Windows PowerShell：

```powershell
python .\scripts\migrate-profile.py "$env:USERPROFILE\learning\.learning-profile"
```

不传参数时，默认读取 `~/learning/.learning-profile`。

脚本完成后应看到类似输出：

```text
Migrated react-hooks
Deleted old file: progress.json
Deleted old file: review-schedule.json
Migration complete. Old files deleted.
```

## 迁移后验证

```bash
ls .learning-profile/profile.json
ls .learning-profile/courses/*/meta.json
ls .learning-profile/courses/*/params.json
ls .learning-profile/courses/*/concepts.json
ls .learning-profile/courses/*/learning-record.json
python .learning-profile/scripts/check-reviews.py .learning-profile
test ! -f .learning-profile/progress.json
test ! -f .learning-profile/review-schedule.json
```

如果 `check-reviews.py` 还没有复制到学习目录，先重新运行初始化脚本：

```bash
bash scripts/init-profile.sh /path/to/learning
```

Windows：

```powershell
.\scripts\init-profile.ps1 -Path "$env:USERPROFILE\learning"
```

迁移验证通过后，旧文件必须不存在。若还存在，先不要继续教学；重新运行迁移脚本或手动完成删除。

## 从 schema_version 1、2 或 3 升级到 4

如果已经没有旧 `progress.json` / `review-schedule.json`，但状态文件还是
`schema_version: 1`、`schema_version: 2` 或 `schema_version: 3`，仍然运行同一个脚本：

```bash
python scripts/migrate-profile.py /path/to/learning/.learning-profile
```

脚本会：

1. 把 `profile.json` 升级到 `schema_version: 4`
2. 保留已有普通偏好，例如每日学习时长、反馈风格、纠错方式
3. 删除 `profile.json.preferences` 里的平台自动化相关旧字段
4. 补上空的 `learner_profile`
5. 把已有课程状态文件的 `schema_version` 更新为 4
6. 为每门课补上 `learning-record.json`
7. 验证关键 JSON 文件能读取，且版本正确

不确定的信息保持空值或空数组，不要从聊天外脑补。

## 手动迁移

如果脚本不适用，手动步骤：

1. 创建 `.learning-profile/profile.json`，写入 `schema_version: 4`、全局偏好和 `learner_profile`。
2. 为每门课程创建 `.learning-profile/courses/{slug}/meta.json`，默认写入 `skill_tree_enabled=true`、`rpg_enabled=true`、`rpg_preference_asked=false`。
3. 为每门课程创建 `.learning-profile/courses/{slug}/params.json`，把 `target_retention` 放在这里。
4. 为每门课程创建 `.learning-profile/courses/{slug}/concepts.json`，不要写 `target_retention` 或 R。
5. 为每门课程创建 `.learning-profile/courses/{slug}/domain-tree.json`。
6. 为每门课程创建 `.learning-profile/courses/{slug}/learning-record.json`，初始写空 `pages`、`exercises`、`questions_for_llm`、`review_summary` 和 `completions`。
7. 验证新结构后，立即删除旧的 `progress.json` 和 `review-schedule.json`。
