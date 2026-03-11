# LooongImg 📸 (Monorepo)

[English] | [中文](./README_CN.md)

**[Live Demo / Online Demo 🚀](https://hellosherwinnn.github.io/Looongimg/)**  
> 💡 **Note**: The standalone web version (FFmpeg.wasm) is now fully compatible with **Mobile** browsers (iOS/Android). All video processing happens directly in your browser with high privacy.

## 💡 Why LooongImg?

This project started as an inspiration of mine. After switching to an iPhone, I realized its long-screenshot support is quite limited compared to the native experience on Android. Many existing apps in the App Store either fail to stitch correctly or are cumbersome to use. I wanted to build a tool that could provide a "more perfect" and reliable solution for creating long screenshots from screen recordings.

---

Welcome to **LooongImg**. This project provides a powerful solution for stitching long screenshots from screen recordings, offering both a high-privacy client-side version and a high-performance backend version.

---

## 📂 Project Structure & Features

### 1. [Standalone Web App (Live)](./standalone-web)
- **Status**: **Deployed to GitHub Pages**.
- **Platforms**: **Desktop & Mobile Friendly**.
- **Core**: React + FFmpeg.wasm (WebAssembly).
- **Privacy**: **100% Private**. All video processing (frame extraction, alignment, stitching) happens locally in your browser. No data ever leaves your device.
- **Security**: Implements Cross-Origin Isolation (COI) to enable shared memory processing in the browser.

### 2. [Backend Core Service](./backend-core)
- **Core**: Node.js + Express + Native FFmpeg + Canvas.
- **Performance**: Utilizes server-side hardware for high-speed parallel processing.
- **Usage**: Ideal for API integrations or processing very large/high-res videos on low-end devices.

---

## 🤖 CI/CD & Deployment

This project uses **GitHub Actions** for automated testing and deployment. You can monitor the workflow runs here: **[GitHub Actions Dashboard](https://github.com/hellosherwin.github.io/Looongimg/actions)**.

Every commit to the `main` branch triggers:
1. **Auto Build**: Compiles the React application.
2. **Auto Deploy**: Automatically deploys the results to the `gh-pages` branch.

---

## 🛠️ Technical Journey: Challenges & Solutions

> [!NOTE]
> **Project Status**: This is the current stable version. I've removed previous experimental code to keep the project clean. While it works well for most videos, there are still some edge cases I'm planning to optimize in future updates.

### 1. Standalone Web (Browser Implementation)
- **FFmpeg Initialization Hangs**:
    - **Issue**: FFmpeg would load but stay at 0% progress.
    - **What I tried**: I tried different versions and CDNs, but found it was a security headers issue.
    - **Solution**: I added `coi-serviceworker.js` to enable **Cross-Origin Isolation**, which is required for `SharedArrayBuffer` to work.
- **Worker Loading Errors in Production**:
    - **Issue**: Web Workers failed to load in the production build with "Failed to fetch" errors.
    - **What I tried**: I tried using `toBlobURL` (common in many tutorials), but it caused dynamic import issues inside the worker.
    - **Solution**: I switched to hosting **ESM** core files locally in the `/public/` directory and used absolute paths. This fixed the loading reliability.

### 2. Backend Core (Algorithm & Architecture)
- **Static UI Interference**:
    - **Issue**: Fixed elements like status bars or navigation bars would confuse the stitching algorithm.
    - **Solution**: I implemented a **Three-Band Partitioning** strategy. I divide the frames into **Header (12%)**, **Body (content)**, and **Footer (12%)**. The algorithm focuses on the central "Body" for movement detection, effectively ignoring the static UI at the top and bottom.
- **Concurrent Request Handling**:
    - **Issue**: Parallel requests would overwrite each other's temporary files.
    - **Solution**: I used **UUIDs** to create a unique temporary directory for every request. This ensures that FFmpeg and the stitching logic operate in complete isolation.
- **Sudden Motion Jitter**:
    - **Issue**: Blurry frames occasionally caused the algorithm to calculate incorrect, massive jumps in pixels.
    - **Solution**: I added a **Velocity Limit** check. If a calculated shift exceeds **25% of the frame height** compared to previous frames, it is flagged as an error and corrected using a median-based consensus, making the final image smooth.

### 3. GitHub Actions (Deployment)
- **Workflow Permissions (403 Errors)**:
    - **Issue**: Deployment failed with 403 errors even when the code was correct.
    - **Solution**: I found it was a default permission limit in GitHub Settings. I explicitly added `permissions: contents: write` to the `.yml` file and enabled read/write access in the repository settings.
- **Monorepo Pathing Issues**:
    - **Issue**: Since the web app is in a sub-folder (`standalone-web`), the default build commands failed.
    - **Solution**: I updated the Action to use `working-directory: ./standalone-web` for installation and build steps. I also synchronized the `base` path in `vite.config.ts` with the GitHub repository name to fix 404 errors on CSS/JS files.

---

## 🛠️ Technology Stack

### Frontend (Standalone & Client)
- **Framework**: React 19, Vite 6, TypeScript
- **Styling**: Tailwind CSS 4, Framer Motion (Animations)
- **Engine**: **FFmpeg.wasm** (WebAssembly)
- **Isolation**: `coi-serviceworker` (Cross-Origin Isolation)

### Backend & Infrastructure (Core Service)
- **Runtime**: **Node.js** (Server-side processing)
- **API**: **Express** (Restful API)
- **Native Engine**: **Native FFmpeg** (System-level performance)
- **Imaging**: **Node-Canvas** (Server-side image composition)
- **Deployment**: GitHub Actions (CI/CD), GitHub Pages (Hosting)

### Algorithms
- **Logic**: Custom Multi-band Consensus Pixel Matching

---

## 🚀 Getting Started

- [**Standalone Web App Guide**](./standalone-web/README.md)
- [**Backend Core Service Guide**](./backend-core/README.md)

---

## 📄 License

Licensed under **GPL-3.0**. See [LICENSE](./LICENSE) for details.

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.

