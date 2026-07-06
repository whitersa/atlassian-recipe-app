# 个人菜谱库 (Personal Recipe App)

这是一个基于 React + Vite 构建的静态单页应用（SPA）个人菜谱管理系统。项目在视觉风格上参考了 Atlassian Design System 规范，采用纯前端无服务的架构设计，所有数据均保留在用户的本地浏览器中，非常适合长期、高频的个人使用，并可直接部署至 Vercel 或 GitHub Pages 等静态托管平台。

相关核心文件：
* 项目目标与规划：[GOALS.md](file:///c:/Users/lilong.bai/.gemini/antigravity-ide/scratch/document/develop/atlassian-recipe-app/GOALS.md)
* 主体逻辑与界面：[App.jsx](file:///c:/Users/lilong.bai/.gemini/antigravity-ide/scratch/document/develop/atlassian-recipe-app/src/App.jsx)
* 本地存储适配器：[storage.js](file:///c:/Users/lilong.bai/.gemini/antigravity-ide/scratch/document/develop/atlassian-recipe-app/src/storage.js)
* 样式系统定义：[index.css](file:///c:/Users/lilong.bai/.gemini/antigravity-ide/scratch/document/develop/atlassian-recipe-app/src/index.css)

---

## 核心功能点

### 1. 菜谱浏览与清单管理
* **多维搜索与过滤**：支持通过菜谱名称、食材关键字进行实时检索，并可根据分类标签快速筛选。
* **菜谱详情交互**：展示详细的食材用量、准备时间、烹饪步骤以及贴心的小贴士。
* **卡片式布局**：符合 Atlassian 风格的卡片式展示，清晰呈现难度等级、时间消耗和食材列表。

### 2. 烹饪辅助定时器
* **分步倒计时**：在菜谱详情页中支持针对特定步骤启动倒计时，并伴有动画指示。
* **声音与警报提示**：定时结束时，通过 Web Audio API 自动播放蜂鸣声报警（beep alarm）。
* **系统通知唤醒**：集成浏览器标准的 Notification API，在定时结束时推送桌面系统级通知，并配置 `requireInteraction: true` 属性，确保用户在处理完手头工作前通知不会自动消失。

### 3. 食材多维度分类录入
为了在视觉与逻辑上对食材进行合理隔离，系统将食材细分为三大模块：
* **基础食材**：肉类、蔬菜、蛋类等核心膳食来源。
* **调味品**：盐、酱油、醋、糖等基础调味剂。
* **香料**：八角、桂皮、花椒、香叶等特殊提味品。
* **模块化录入面板**：针对食材录入与菜谱新增进行了卡片隔离与视觉划分，简化录入心智。

### 4. 健壮的本地离线存储 (IndexedDB)
* **大容量保障**：弃用了容量受限（通常为 5MB）的 `localStorage`，全面迁移至异步的高容量 **IndexedDB** 存储方案（基于 `idb-keyval`）。
* **启动防抖保护**：具备数据异步加载状态屏障，在数据未完全载入前处于 Loading 状态，防止误操作或空值覆写用户原有本地数据。
* **旧数据自动迁移**：保留了向下兼容的迁移层，当首次加载应用时，会自动将之前存储在 `localStorage` 中的存量数据安全合并至 IndexedDB 中并自动清除旧空间。

### 5. 数据导入/导出与版本兼容迁移
* **数据备份导出**：支持一键将本地的所有食材、菜谱数据导出为 JSON 格式的文件，文件名自动携带精确时间戳，方便备份。
* **版本链条迁移 (Versioned Migration Chain)**：
  * 导出的 JSON 数据结构带有明确的 `version` 标识。
  * 导入时会自动进行结构检验。如果未来数据结构发生改变，导入模块会依次执行定义好的迁移函数（`DATA_MIGRATIONS`），保证旧版本导出的备份数据在新版本系统中也能被平滑恢复，避免因版本更迭造成个人数据丢失。
  * 具备备用恢复方案，确保在极端数据格式下最大化挽救可用字段。

---

## 设计系统规范

项目在视觉层面遵循 Atlassian 设计系统标准：
* 使用 CSS 自定义属性（Variables）管理设计 Token（如颜色、边距、字号等），原生支持暗黑模式切换。
* 摒弃了多余的无意义动效，优先保证操作的紧凑性与专业感。
* 使用统一的 Badges（徽标）、Buttons（按钮）、Modals（弹窗）组件样式，保障界面的一致性。

---

## 开发与部署

### 本地开发
```bash
# 安装依赖 (注意: 若有 peer 依赖冲突可使用 npm install 即可，项目已通过 .npmrc 开启兼容模式)
npm install

# 启动开发服务器
npm run dev

# 执行代码风格与 Lint 检查
npm run lint

# 构建生产环境代码
npm run build
```

### 云端部署
项目支持通过 GitHub 仓库一键关联并托管至 **Vercel**。
* **构建指令**：`npm run build`
* **发布目录**：`dist`
* **安全性要求**：由于通知和音频特性要求安全上下文，在 Vercel 提供的 HTTPS 环境下，所有功能均可完美运作。
