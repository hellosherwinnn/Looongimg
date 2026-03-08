# LooongImg Monorepo 📸

Welcome to the **LooongImg** repository. This project provides two distinct ways to stitch long screenshots from screen recordings, depending on your needs for privacy, cost, and performance. / 欢迎来到 **LooongImg** 代码仓库。根据您对隐私保护、运行成本和性能的不同需求，本项目提供了两种截然不同的长截图拼接实现方案。

---

## 📂 Project Structure / 项目结构

This repository is organized into two main versions: / 本仓库被组织为两个主要版本：

### 1. [Standalone Web App / 纯前端脱机版 (Client-side Only)](./standalone-web)
- **Tech / 技术栈:** React + FFmpeg.wasm (WebAssembly)
- **Privacy / 隐私保障:** 100% Private. All processing happens locally on your device. / 绝对隐私。所有视频解析均在本地浏览器完成，无任何上传。
- **Cost / 运行成本:** Zero server costs. Can be hosted as a static site (e.g., GitHub Pages). / 零服务器成本。完全可以作为静态网页部署（如 GitHub Pages）。
- **Best for / 适用场景:** Personal use, quick stitching, and privacy-conscious users. / 个人使用、快速拼接以及注重隐私的用户。

### 2. [Backend Core Service / 后端核心服务版 (Server-side API)](./backend-core)
- **Tech / 技术栈:** Node.js + Express + FFmpeg (system) + Canvas
- **Performance / 性能表现:** High-speed parallel processing using server-grade hardware. / 利用服务器硬件优势的高速并行处理。
- **Reliability / 可靠性:** Stable environment for large-scale or high-resolution processing. / 适合处理超大体积或极高分辨率的稳定环境。
- **Best for / 适用场景:** API integrations, high-performance needs, or processing videos on less powerful devices. / API 接口集成、极高发烧级性能需求，或目标用户设备性能较差的场景。

---

## 🚀 Getting Started / 快速开始

Check the README in each subdirectory for specific installation and usage instructions: / 请查看各个子目录下的 README 文件以获取详细的安装和使用指南：

- [**Standalone Web App Guide / 纯前端版指南**](./standalone-web/README.md)
- [**Backend Core Service Guide / 后端核心版指南**](./backend-core/README.md)

### Global Commands / 全局快捷命令

From the root directory, you can use these shortcuts: / 您可以在根目录使用以下快捷命令：

- `npm install` (in sub-directories) - Please run `npm run install:all` to install dependencies for all projects. / 请运行此命令一键安装所有子项目的依赖。
- `npm run dev` - **(Default)** Starts the Standalone Web App. / **(默认)** 启动纯前端脱机版网页。
- `npm run dev:backend-all` - Starts both the backend Server and the backend Client concurrently. / 一键同时启动后端服务及与之配套的前端展示页。

---

## 🛠️ Technology Stack / 核心技术栈
- **Frontend / 前端界面:** React, Vite, Tailwind CSS, Framer Motion
- **Heavy Engines / 视频底层引擎:** FFmpeg (WebAssembly & Native Native)
- **Algorithms / 图像算法:** Custom Multi-band Consensus Pixel Matching / 自研多频带共识像素匹配算法

---

## 📄 License / 开源协议

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](./LICENSE) file for details. / 本项目采用 **GPL-3.0** 开源协议。详情请参阅 [LICENSE](./LICENSE) 文件。

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.
