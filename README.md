# LooongImg 📸 (Monorepo)

**[Live Demo / 在线演示 🚀](https://hellosherwinnn.github.io/Looongimg/)**  
> ⚠️ **Note**: The standalone web version (FFmpeg.wasm) is currently optimized for **Desktop** only. Mobile browsers may experience loading issues or crashes due to hardware/memory limitations. For mobile use, please refer to the [Backend Core Service](#2-backend-core-service--后端核心服务版).  
> ⚠️ **注意**：纯前端版（FFmpeg.wasm）目前仅针对**桌面浏览器**优化。由于手机硬件和内存限制，移动端可能会出现白屏或崩溃。手机端建议使用[后端核心服务版](#2-backend-core-service--后端核心服务版)。

## 💡 Why LooongImg? / 为什么做这个项目？

This project started as an inspiration of mine. After switching to an iPhone, I realized its long-screenshot support is quite limited compared to the native experience on Android. Many existing apps in the App Store either fail to stitch correctly or are cumbersome to use. I wanted to build a tool that could provide a "more perfect" and reliable solution for creating long screenshots from screen recordings. / 这个项目源于我的一个灵感。最近换了苹果手机后，发现它不像安卓手机那样原生支持方便的长截图功能。虽然苹果商店里有不少长截图软件，但在实际使用中经常会出错，拼接效果有的时候不行。因此，我想做一个能够实现“更完美”长截图效果的工具。

---

Welcome to **LooongImg**. This project provides a powerful solution for stitching long screenshots from screen recordings, offering both a high-privacy client-side version and a high-performance backend version. / 欢迎来到 **LooongImg**。本项目提供了一个从屏幕录制中拼接长截图的高效方案，涵盖了注重隐私的纯前端版和追求性能的后端版。

---

## 📂 Project Structure & Features / 项目结构与特性

### 1. [Standalone Web App / 纯前端脱机版 (Live)](./standalone-web)
- **Status / 状态**: **Deployed to GitHub Pages** / **已部署至 GitHub Pages**。
- **Platforms / 平台**: **Desktop Only (Recommended)** / **仅限桌面端（推荐）**。Due to mobile browser memory limits, this version may crash on smartphones. / 手机端由于内存限制可能会崩溃。
- **Core / 核心**: React + FFmpeg.wasm (WebAssembly)。
- **Privacy / 隐私**: **100% Private**. All video processing (frame extraction, alignment, stitching) happens locally in your browser. No data ever leaves your device. / **绝对隐私**。所有视频处理（抽帧、对齐、拼接）均在浏览器本地完成，数据无需上传。
- **Security / 安全**: Implements Cross-Origin Isolation (COI) to enable shared memory processing in the browser. / 实现了跨域隔离 (COI) 以开启浏览器的共享内存处理能力。

### 2. [Backend Core Service / 后端核心服务版](./backend-core)
- **Core / 核心**: Node.js + Express + Native FFmpeg + Canvas。
- **Performance / 性能**: Utilizes server-side hardware for high-speed parallel processing. / 利用服务器硬件优势进行高速并行处理。
- **Usage / 用途**: Ideal for API integrations or processing very large/high-res videos on low-end devices. / 适合 API 集成或在低配设备上处理超大/高分辨率视频。

---

## 🤖 CI/CD & Deployment / 自动化部署

This project uses **GitHub Actions** for automated testing and deployment. You can monitor the workflow runs here: **[GitHub Actions Dashboard](https://github.com/hellosherwinnn/Looongimg/actions)**.

每次代码提交至 `main` 分支均会触发：
1. **自动构建**: 编译 React 应用。
2. **自动发布**: 将成果自动部署至 `gh-pages` 分支。

---

## � Detailed Challenges & Solutions / 深度挑战与解决方案

## 🛠️ Technical Journey: Challenges & Solutions / 技术实现复盘

> [!NOTE]
> **Project Status**: This is the current stable version. I've removed previous experimental code to keep the project clean. While it works well for most videos, there are still some edge cases I'm planning to optimize in future updates.  
> **项目状态**：当前为稳定版本。我已清理了之前的测试代码，以保持项目结构整洁。目前版本能处理绝大多数录屏，针对部分特殊场景，我后续会继续优化算法。

### 1. Standalone Web (Browser Implementation)
- **FFmpeg Initialization Hangs**:
    - **Issue**: FFmpeg would load but stay at 0% progress. / FFmpeg 加载后进度停在 0%。
    - **What I tried**: I tried different versions and CDNs, but found it was a security headers issue. / 尝试过切换版本和 CDN，最终发现是安全响应头的问题。
    - **Solution**: I added `coi-serviceworker.js` to enable **Cross-Origin Isolation**, which is required for `SharedArrayBuffer` to work. / 引入了 `coi-serviceworker.js` 来开启 **跨域隔离 (COI)**，从而正常使用 FFmpeg 所需的共享内存。
- **Worker Loading Errors in Production**:
    - **Issue**: Web Workers failed to load in the production build with "Failed to fetch" errors. / 生产环境下 Web Worker 加载失败，提示 "Failed to fetch"。
    - **What I tried**: I tried using `toBlobURL` (common in many tutorials), but it caused dynamic import issues inside the worker. / 尝试过教程常用的 `toBlobURL` 方案，但在 Worker 内部会导致动态导入报错。
    - **Solution**: I switched to hosting **ESM** core files locally in the `/public/` directory and used absolute paths. This fixed the loading reliability. / 改为在 `/public/` 目录本地托管 **ESM** 格式的核心文件，并使用绝对路径加载，彻底解决了加载问题。

### 2. Backend Core (Algorithm & Architecture)
- **Static UI Interference**:
    - **Issue**: Fixed elements like status bars or navigation bars would confuse the stitching algorithm. / 固定的状态栏或导航栏会干扰拼接算法的位移计算。
    - **Solution**: I implemented a **Three-Band Partitioning** strategy. I divide the frames into **Header (12%)**, **Body (content)**, and **Footer (12%)**. The algorithm focuses on the central "Body" for movement detection, effectively ignoring the static UI at the top and bottom. / 采用了 **三频带分区** 策略。将画面分为 **顶 (12%)**、**中 (主体)**、**底 (12%)** 三部分。算法只针对中间的主体部分进行位移检测，避开了顶部和底部固定 UI 的干扰。
- **Concurrent Request Handling**:
    - **Issue**: Parallel requests would overwrite each other's temporary files. / 并发请求会互相覆盖临时文件。
    - **Solution**: I used **UUIDs** to create a unique temporary directory for every request. This ensures that FFmpeg and the stitching logic operate in complete isolation. / 使用 **UUID** 为每个请求创建独立的临时目录，确保 FFmpeg 和拼接逻辑在处理时互不干扰。
- **Sudden Motion Jitter**:
    - **Issue**: Blurry frames occasionally caused the algorithm to calculate incorrect, massive jumps in pixels. / 画面模糊时，算法偶尔会误判出巨大的位移跳变。
    - **Solution**: I added a **Velocity Limit** check. If a calculated shift exceeds **25% of the frame height** compared to previous frames, it is flagged as an error and corrected using a median-based consensus, making the final image smooth. / 增加了 **速度限制 (Velocity Limit)** 检查。如果计算出的位移相比前几帧超过了 **25% 的高度比率**，系统会自动识别并进行校正，保证了拼接效果的平滑。

### 3. GitHub Actions (Deployment)
- **Workflow Permissions (403 Errors)**:
    - **Issue**: Deployment failed with 403 errors even when the code was correct. / 代码没问题，但部署时报 403 错误。
    - **Solution**: I found it was a default permission limit in GitHub Settings. I explicitly added `permissions: contents: write` to the `.yml` file and enabled read/write access in the repository settings. / 发现是 GitHub 默认权限限制。我在 `.yml` 中显式添加了 `permissions: contents: write`，并在仓库设置中开启了读写权限。
- **Monorepo Pathing Issues**:
    - **Issue**: Since the web app is in a sub-folder (`standalone-web`), the default build commands failed. / 由于网页版在子目录中，默认的构建指令失效。
    - **Solution**: I updated the Action to use `working-directory: ./standalone-web` for installation and build steps. I also synchronized the `base` path in `vite.config.ts` with the GitHub repository name to fix 404 errors on CSS/JS files. / 更新了 Action 配置，将构建路径指定为 `standalone-web` 目录。同时同步了 Vite 的 `base` 路径配置，解决了部署后资源 404 的问题。

---

## 🛠️ Technology Stack / 核心技术栈

### Frontend / 前端 (Standalone & Client)
- **Framework**: React 19, Vite 6, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion (Animations)
- **Engine**: **FFmpeg.wasm** (WebAssembly)
- **Isolation**: `coi-serviceworker` (Cross-Origin Isolation)

### Backend & Infrastructure / 后端与基础设施 (Core Service)
- **Runtime**: **Node.js** (Server-side processing)
- **API**: **Express** (Restful API)
- **Native Engine**: **Native FFmpeg** (System-level performance)
- **Imaging**: **Node-Canvas** (Server-side image composition)
- **Deployment**: GitHub Actions (CI/CD), GitHub Pages (Hosting)

### Algorithms / 核心算法
- **Logic**: Custom Multi-band Consensus Pixel Matching / 自研多频带共识像素匹配算法

---

## 🚀 Getting Started / 快速开始

- [**Standalone Web App Guide / 纯前端版指南**](./standalone-web/README.md)
- [**Backend Core Service Guide / 后端核心版指南**](./backend-core/README.md)

---

## 📄 License / 开源协议

Licensed under **GPL-3.0**. See [LICENSE](./LICENSE) for details. / 采用 **GPL-3.0** 开源协议，详见 [LICENSE](./LICENSE)。

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.
