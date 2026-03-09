# 🔧 FFmpeg.wasm + GitHub Pages 部署问题方案报告 (Solution Report)

如果你在 GitHub Pages 上部署基于 FFmpeg.wasm 的项目时遇到 **“卡在 0%”**、**“加载失败”** 或 **“CI 部署不触发”** 的问题，请将本报告内容直接复制给 AI 助手。

---

## 📋 问题核心与原因分析 (Problem Analysis)

### 1. FFmpeg 加载卡死 (Stuck at 加载环节)
*   **核心原因**: 多线程 FFmpeg.wasm 依赖 `SharedArrayBuffer`，而浏览器出于安全考虑，要求环境必须是 **Cross-Origin Isolated (COI)**。GitHub Pages 默认不提供 `COOP` 和 `COEP` 响应头。
*   **路径错误**: 在 GitHub Pages 的子路径下（如 `/repo-name/`），程序如果使用 `/` 开头的绝对路径，会找不到资源文件。
*   **无感知下载**: FFmpeg 核心文件约 32MB，弱网环境下下载较慢。如果 UI 没有进度提示，用户会误以为是死机。

### 2. CI/CD (GitHub Actions) 部署失效
*   **目录结构错误**: GitHub 只识别根目录下的 `.github/workflows/`。如果把这个文件夹放到了子目录（如 `frontend/.github/...`），部署永远不会触发。
*   **构建错误**: 缺少 React 类型定义 (`@types/react`) 或 `tsconfig.json` 配置不当（缺少 `dom` 环境），会导致 CI 构建阶段报错崩溃。

---

## ✅ 终极解决方案 (可以直接复制给 AI 的指令)

> “我的 FFmpeg.wasm 项目在 GitHub Pages 上运行异常。请参考以下步骤进行修复：”

### 第一步：开启安全隔离环境 (COI)
1.  **引入补丁**: 在 `public/` 目录下放置 `coi-serviceworker.js` 脚本。
2.  **激活脚本**: 在 `index.html` 的 `<head>` 或 `<body>` 最前部加入：
    `<script src="/repo-name/coi-serviceworker.js"></script>`（注意替换仓库名，或使用相对路径）。

### 第二步：修正资产加载与进度显示
1.  **资源存放**: 将 `ffmpeg-core.js`, `.wasm`, `.worker.js` 统一放入 `public/ffmpeg/` 文件夹。
2.  **绝对路径映射**: 使用 `import.meta.env.BASE_URL` 动态拼接路径，确保子路径兼容：
    ```typescript
    const base = import.meta.env.BASE_URL;
    const fullBase = `${window.location.origin}${base}`.replace(/\/$/, "");
    // 加载时传入 coreURL 和 wasmURL
    await ffmpeg.load({
      coreURL: `${fullBase}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${fullBase}/ffmpeg/ffmpeg-core.wasm`,
    });
    ```
3.  **下载进度展示**: 封装一个通过 `onProgress` 回传百分比的 `fetch` 函数，在 UI 上显示 `Downloading: X%`，避免用户焦虑。

### 第三步：修正部署逻辑
1.  **位置纠正**: 确保 `deploy.yml` 位于项目物理根目录的 `.github/workflows/` 下。
2.  **配置环境**: 在 `deploy.yml` 中使用 `working-directory` 指向你的前端文件夹，并配置 `peaceiris/actions-gh-pages` 执行分发。
3.  **完善类型**: 安装 `@types/react` 和 `@types/react-dom`，并在 `tsconfig.json` 的 `lib` 数组中包含 `"dom"`。

---

## 🛠 本项目实际修复点清单 (Technical Summary)

*   **[Workflow]**: 已移动到根目录，修复了由于位置错误导致 Actions 不运行的问题。
*   **[COI]**: 已引入 Service Worker，修复了 `SharedArrayBuffer` 权限导致的加载卡死。
*   **[Paths]**: 改用 `window.location.origin + base` 路径策略，修复了 GitHub Pages 子路径 404 问题。
*   **[Progress]**: 实现了 `toBlobURLWithProgress` 自定义加载器，并在 `App.tsx` 同步了进度文字。
*   **[Types]**: 已安装 React 类型补丁并硬化了 `tsconfig.json`。

---
**当前状态**: 已修复 (STABLE) | **备份分支**: `stable-backup` (随时可还原)
