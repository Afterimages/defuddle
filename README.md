# Defuddle CNNetizen 🇨🇳

> 更适合中国网友体质的 defuddle

2026.06.18 更新公告： B站字幕提取器已被上游合并。

基于 [defuddle](https://github.com/kepano/defuddle) 上游的分支版本，在保留原有全部功能的基础上，新增了对小红书 和 B 站（Bilibili）的专属内容提取支持，未来还会持续添加更多国内平台的适配。

- 问题背景：上游的defuddle仓库目前对小红书和B站的内容提取支持不太良好（缺乏专项支持）。具体而言：
  - 在B站的提取效果：缺少字幕（如果有）和发布时间，内容混乱；
  - 在小红书的提取效果：缺少作者、视频iframe和评论树，图片组重复，内容混乱。

---

## ✨ 本分支新增功能

### 📕 小红书（Xiaohongshu）提取器

| 提取内容 | 说明 |
|---------|------|
| 笔记正文 | 自动解析 `__INITIAL_STATE__` 中的笔记描述文本 |
| 图片列表 | 提取所有图片，优先选择最高分辨率 |
| 视频笔记 | 识别视频类型笔记，嵌入视频播放器 |
| 标签 / 话题 | 从 `tagList` / `topicList` 提取，自动去除正文中重复的 `#话题#` 标记 |
| 评论（含子评论） | 多级评论提取，支持嵌套回复树 |
| 元数据 | 作者昵称、笔记 ID、发布时间、笔记类型等 |

**评论提取的三级降级策略**：

1. **`__INITIAL_STATE__` 解析** — 从页面内联 JSON 中提取评论数据
2. **API 回退** — 当内联数据为空时，尝试请求小红书评论 API（`/api/sns/web/v2/comment/page`）
3. **DOM 回退** — 最终降级为从 Vue 渲染后的 DOM 中提取评论（适用于浏览器扩展场景）

**浏览器扩展特殊处理**：小红书页面的 `__INITIAL_STATE__` 由 Vue 运行时异步更新，Content Script 运行在 Chrome 的 isolated world 无法直接访问主世界变量。配合 obsidian-clipper  `chrome.scripting.executeScript({ world: "MAIN" })` 桥接机制，可在浏览器扩展中正确获取运行时状态。（不在defuddle中实现，因此使用插件时，需要先刷新小红书页面再点击插件图标）

**URL 匹配**：
- `xiaohongshu.com/explore/{noteId}`
- `xiaohongshu.com/discovery/item/{noteId}`

---

### 📺 B 站（Bilibili）提取器

| 提取内容 | 说明 |
|---------|------|
| 视频信息 | 通过 B 站 API 获取标题、作者、简介、封面、发布时间 |
| 视频嵌入 | 自动生成 B 站播放器 iframe 嵌入代码 |
| 字幕 / 逐字稿 | 从 B 站字幕 API 提取字幕，转换为带时间戳的逐字稿 |
| 多 P 支持 | 支持 B 站分 P 视频，自动识别当前分 P |
| 多语言字幕 | 支持选择字幕语言（优先中文字幕），区分 AI 生成字幕 |

**字幕提取流程**：

1. 从 URL 中提取 BV 号
2. 请求 `api.bilibili.com/x/web-interface/view` 获取视频信息（aid、cid 等）
3. 依次尝试 `wbi/v2`、`v2`（bvid+cid）、`v2`（aid+cid）三个字幕接口
4. 智能选择最佳字幕轨道（优先匹配用户指定语言 → 优先中文 → 优先人工字幕）
5. 请求字幕 JSON，按时间戳分组生成格式化逐字稿

**URL 匹配**：
- `bilibili.com/video/BVxxxxxx`
- 支持 `?p=N` 分 P 参数

---

## �️ 提取效果展示

### 小红书

**图文笔记提取**

<!-- 截图：小红书图文笔记原始页面 -->
<!-- 截图：Obsidian 中剪藏后的效果 -->

<img width="1900" height="879" alt="image" src="https://github.com/user-attachments/assets/cb0c29c7-3c7e-4e8b-825e-7721e9d8379e" />
左边为原始网页页面，右边为obsidian剪藏后的效果

**视频笔记提取**

<!-- 截图：小红书视频笔记原始页面 -->
<!-- 截图：Obsidian 中剪藏后的效果 -->
<img width="1920" height="862" alt="image" src="https://github.com/user-attachments/assets/2434a06e-b5c7-4daf-bc90-66cd34420213" />


### B 站

**视频信息 + 字幕提取**

<!-- 截图：B 站视频原始页面 -->
<!-- 截图：Obsidian 中剪藏后的效果（含字幕逐字稿） -->
<img width="1897" height="929" alt="image" src="https://github.com/user-attachments/assets/763ab7ae-3d1e-4cc4-ae78-c1b355df2321" />


---

## �🔧 提取器输出变量

两个提取器都在 `result.variables` 中提供结构化变量，可直接用于 Obsidian Web Clipper 模板：

### 小红书变量

| 变量名 | 说明 |
|--------|------|
| `title` | 笔记标题 |
| `author` | 作者昵称 |
| `site` | 固定为 `小红书` |
| `description` | 笔记摘要（前 200 字） |
| `published` | 发布时间（ISO 格式） |
| `noteId` | 笔记 ID |
| `noteType` | 笔记类型（`normal` / `video`） |
| `tags` | 逗号分隔的标签列表 |
| `comments` | 评论内容（Markdown 格式） |

### B 站变量

| 变量名 | 说明 |
|--------|------|
| `title` | 视频标题 |
| `author` | UP 主名称 |
| `site` | 固定为 `Bilibili` |
| `description` | 视频简介摘要 |
| `published` | 发布时间（ISO 格式） |
| `image` | 封面图 URL |
| `part` | 当前分 P 标题（多 P 视频时） |
| `transcript` | 字幕逐字稿（Markdown 格式） |
| `language` | 字幕语言代码（如 `zh-cn`） |

---

## 🚀 使用方式

与上游 defuddle 完全兼容，无需额外配置。当检测到小红书或 B 站页面时，对应的提取器会自动生效。

### 浏览器扩展（Obsidian Web Clipper）

推荐配合 [obsidian-clipper 分支](https://github.com/obsidianmd/obsidian-clipper) 使用。

#### 配合 obsidian-clipper 操作步骤

以下步骤说明如何将本分支的 defuddle 构建产物接入 obsidian-clipper 扩展进行测试和使用。

**第一步：构建 defuddle**

```powershell
# 在 defuddle 目录下
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
```

```bash
npm run build:types
npm run build:node
npm run build:js
```

**第二步：准备 obsidian-clipper 项目**

从 [GitHub](https://github.com/obsidianmd/obsidian-clipper) 下载 obsidian-clipper 项目到本地，然后在项目根目录安装依赖：

```bash
npm ci
# 如果 ci 失败（lock 不匹配），改用 npm install
```

**第三步：将本地 defuddle 接入并构建**

使用 `npm link` 将本分支的 defuddle 替换掉上游 npm 依赖，然后构建：

```bash
# 1) 在本地 defuddle 目录注册全局 link
cd ..\defuddle
npm link

# 2) 进入 obsidian-clipper 项目目录，link 过来
cd ..\obsidian-clipper
npm link defuddle

# 3) 构建 Chrome 版本
npm run build:chrome

# 4) 然后在浏览器扩展中心中导入obsidian-clipper\dist文件夹
```

> 构建完成后，B 站和小红书的专属提取器即可生效。

### 选项说明

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `includeReplies` | boolean \| `'extractors'` | `'extractors'` | 是否提取评论/回复。`'extractors'` 仅由站点提取器提取，`true` 包含所有来源，`false` 关闭 |
| `language` | string | | 首选语言（BCP 47 标签，如 `zh-cn`、`en`）。影响 B 站字幕语言选择 |

---

## 📋 与上游的差异

| 项目 | 上游 defuddle | 本分支 |
|------|--------------|--------|
| 小红书提取器 | ❌(https://github.com/kepano/defuddle/pull/292) | ✅ `XiaohongshuExtractor` |
| B 站提取器 | ✅ (https://github.com/kepano/defuddle/pull/271) | ✅ `BilibiliExtractor` |
| 逐字稿构建工具 | ✅（YouTube） | ✅ 共用 `src/utils/transcript.ts` |
| 其他平台提取器 | ✅ | ✅ 完全保留 |

本分支的所有新增代码均以独立提取器模块实现，**不修改上游核心逻辑**，可随时与上游同步合并。

---

## 🛠️ 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 运行测试
npm test
```
---

## 🔗 相关项目

- [defuddle](https://github.com/kepano/defuddle) — 上游项目
- [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper) — 配套浏览器扩展

---

## 🧹 清理

测试完成后，如需取消 npm link：

```bash
cd ..\obsidian-clipper
npm unlink defuddle
```
