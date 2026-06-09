# 数据迁移指南：从旧版升级到新版

> 适用于：已使用旧版 study.skill，并且已有 `.learning-profile/progress.json`
> 或 `.learning-profile/review-schedule.json` 的用户。

## 变更概览

旧版使用单一 `progress.json` + `review-schedule.json`。新版改为每门课程独立存储：

```text
.learning-profile/
├── profile.json
└── courses/
    └── {course-slug}/
        ├── meta.json
        ├── params.json
        ├── concepts.json
        └── domain-tree.json   # 技能树与轻量 RPG 进度
```

关键规则：

- 每个 JSON 文件都写 `schema_version: 1`
- `target_retention` 只保存在 `params.json`
- `concepts.json` 不保存 R；R 每次按 FSRS 公式实时计算
- 迁移后的课程默认 `skill_tree_enabled=true`、`rpg_enabled=true`、`rpg_preference_asked=false`
- 旧文件一旦出现，迁移就是阻塞项：不要继续读取旧文件教学，也不要手写兼容状态
- 迁移脚本写入新版结构并验证成功后，直接删除 `progress.json` 和 `review-schedule.json`

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

## 手动迁移

如果脚本不适用，手动步骤：

1. 创建 `.learning-profile/profile.json`，写入 `schema_version: 1` 和全局偏好。
2. 为每门课程创建 `.learning-profile/courses/{slug}/meta.json`，默认写入 `skill_tree_enabled=true`、`rpg_enabled=true`、`rpg_preference_asked=false`。
3. 为每门课程创建 `.learning-profile/courses/{slug}/params.json`，把 `target_retention` 放在这里。
4. 为每门课程创建 `.learning-profile/courses/{slug}/concepts.json`，不要写 `target_retention`。
5. 验证新结构后，立即删除旧的 `progress.json` 和 `review-schedule.json`。
