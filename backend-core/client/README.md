# LooongImg

![LooongImg](https://img.shields.io/badge/Status-Active-success)

LooongImg is an intelligent, smooth, and automatic long screenshot stitching tool independently developed by hellosherwin. It analyzes screen recording videos to automatically trace scrolling paths (like chat histories or product lists), uses a high-precision pixel matching algorithm to remove duplicate areas and redundant information, and seamlessly stitches them into a flawless, ultra-clear long image.

LooongImg 是一款由 hellosherwin 独立开发的智能且流畅的自动长截图工具。它通过解析您的屏幕录像视频，自动识别聊天记录、商品列表的滚动路径，利用高精度像素匹配算法完美去除重复区域和首尾冗余信息，无缝拼接生成一张完美无瑕的超清长图。

## ✨ Features / 特性

- **Top-to-Bottom Scroll Stitching / 支持下拉滚动拼接**: Currently optimized for videos where the user scrolls from top to bottom (swiping up). (初级版本算法：专门针对**从上往下滚动（即手指向上滑）**的视频录屏进行解析和长图拼接。)
- **Bounce-Back Removal / 自动消除回弹**: Automatically detects and rewinds the generated image when "rubber-band" overscrolling occurs at the end of a list. (智能检测列表到底部时的“橡皮筋回弹”现象，自动回退擦除重复错乱的画面。)
- **Safe Zone Preservation / 保护顶部底部 UI**: Automatically ignores fixed UI elements (like time, notch, or navigation tabs) during overlap calculations while preserving them in the final image. (算法自动忽略顶部和底部的干扰像素进行运算，并在最终长图的两端完美还原它们。)
- **Canvas Processing / 纯前端本地处理**: All video frame extraction and image stitching is powered entirely by the browser's Canvas API. No uploaded videos are sent to any server. (所有视频切帧与图像拼接全部在您的浏览器内通过 Canvas 高速合成，视频文件不会上传至任何后台服务器，保障绝对隐私。)

## 🚀 How to Run / 运行方法

> [!NOTE]
> **Limitations / 当前限制 (Initial Version)**
> This is an initial release. Currently, the algorithm is heavily optimized for and only supports **top-to-bottom scrolling** videos (swiping up) to generate perfect long screenshots.
> 当前为初级版本，算法核心针对于**从上往下滚动（即手指上滑）**的视频进行了深度优化的完美拼接，暂不支持反向或其他方向滚动的视频解析。

**Prerequisites / 环境需求:** Node.js

1. Install dependencies / 下载依赖:
   ```bash
   npm install
   ```
2. Start the local server / 启动本地开发服务器:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser. / 在浏览器打开 `http://localhost:3000` 即可开始使用。

## 🛠 Tech Stack / 开发环境

# LooongImg Frontend 🚀

This is the core of LooongImg, built with React, Vite, and **FFmpeg.wasm**.

## ✨ Key Features

- **On-Device Decoding**: FFmpeg runs in your browser via WebAssembly.
- **Privacy by Design**: No video bytes ever touch a cloud server.
- **Bilingual UI**: Clean, Apple-inspired interface for both English and Chinese users.
- **Smart Stitching**: Advanced multi-band consensus algorithm for pixel-perfect results.

## 📦 Development

### Installation
```bash
npm install
```

### Local Dev (Requires SharedArrayBuffer support)
```bash
npm run dev
```

### Build & Deploy
```bash
npm run build
npm run deploy
```

## 🛠 Tech Stack
- React 18
- TailwindCSS
- Vite
- @ffmpeg/ffmpeg
- Canvas API

---
© 2026 LooongImg. Crafted with ❤️ by hellosherwin.