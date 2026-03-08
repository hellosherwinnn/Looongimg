# LooongImg Backend Core 🚀

This is the original full-stack version of LooongImg, featuring a high-performance Node.js backend and a React frontend.

这是 LooongImg 原始的全栈版本，包含了一个高性能的 Node.js 后端算法服务以及一个 React 前端界面。

## 📂 Structure / 目录结构
- `/server`: Node.js Express server with FFmpeg and Canvas logic. / 提供带有物理机 FFmpeg 和 Canvas 计算逻辑的 Node.js 服务端。
- `/client`: React frontend designed to communicate with the server API. / 专门用于与该服务端 API 交互的 React 前端页面。

## 🚀 Getting Started / 快速开始

### Prerequisites / 环境需求
- Node.js (v18+)
- FFmpeg installed and available in your system PATH. / 在您的操作系统中必须已安装 FFmpeg 并配置好全局变量。

### Installation / 安装依赖

1. Install server dependencies: / 安装服务器依赖:
```bash
cd server
npm install
```

2. Install client dependencies: / 安装客户端依赖:
```bash
cd client
npm install
```

### Running Locally / 本地启动

From the `backend-core` root, you can start both services separately: / 在 `backend-core` 根目录下，您可以分别启动这些服务：

**1. Start Server / 启动服务端:**
```bash
cd server
npm run dev:backend
```
*(The server usually starts on http://localhost:3001) / 服务端默认运行于 3001 端口*

**2. Start Client / 启动客户端:**
```bash
cd client
npm run dev
```
*(Access the app at http://localhost:3000) / 客户端将运行在 3000 端口*

---

## 📄 License / 开源协议

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. / 本项目采用 **GPL-3.0** 开源协议。

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.
