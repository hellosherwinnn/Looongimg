# LooongImg 后端核心 🚀

[English](./README.md) | [中文]

这是 LooongImg 原始的全栈版本，包含了一个高性能的 Node.js 后端算法服务以及一个 React 前端界面。

## 📂 目录结构
- `/server`: 提供带有物理机 FFmpeg 和 Canvas 计算逻辑的 Node.js 服务端。
- `/client`: 专门用于与该服务端 API 交互的 React 前端页面。

## 🚀 快速开始

### 环境需求
- Node.js (v18+)
- 在您的操作系统中必须已安装 FFmpeg 并配置好全局变量。

### 安装依赖

1. 安装服务器依赖:
```bash
cd server
npm install
```

2. 安装客户端依赖:
```bash
cd client
npm install
```

### 本地启动

在 `backend-core` 根目录下，您可以分别启动这些服务：

**1. 启动服务端:**
```bash
cd server
npm run dev:backend
```
*(服务端默认运行于 3001 端口)*

**2. 启动客户端:**
```bash
cd client
npm run dev
```
*(客户端将运行在 3000 端口)*

---

## 📄 开源协议

本项目采用 **GNU General Public License v3.0 (GPL-3.0)** 开源协议。

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.
