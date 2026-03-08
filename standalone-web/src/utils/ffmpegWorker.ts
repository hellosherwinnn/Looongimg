/**
 * FFmpeg Web Worker Utils / FFmpeg Web Worker 工具类
 * Handles loading FFmpeg.wasm and extracting video frames in the browser.
 * 处理在浏览器中加载 FFmpeg.wasm 和提取视频帧的操作。
 */
/**
 * LooongImg - A decentralized long-screenshot stitching tool.
 * Copyright (c) 2024-2026 hellosherwinnn. All rights reserved.
 * 
 * Licensed under the GNU General Public License v3.0 (GPLv3).
 * 
 * 此代码由 hellosherwinnn 开发，受 GPLv3 开源协议严格保护。
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';

// Initialize worker correctly without ?url if it causes Vite build issues, or provide fallback
// If Vite fails to build `@ffmpeg/ffmpeg/worker?url`, we use Blob URL fallback.

// Cache the FFmpeg instance / 缓存 FFmpeg 实例
let ffmpeg: any = null;

/**
 * Initializes and loads FFmpeg.wasm / 初始化并加载 FFmpeg.wasm
 * Uses Vite's `?url` imports to ensure correct path resolution for worker threads.
 * 使用 Vite 的 `?url` 导入方式，确保 Worker 线程的路径解析正确。
 */
export async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();

    await ffmpeg.load({
        coreURL,
        wasmURL,
        classWorkerURL: workerURL
    });

    return ffmpeg;
}

export async function extractFramesClient(
    videoFile: File,
    fps: number = 30,
    onProgress?: (progress: number | string) => void
): Promise<string[]> {
    const ffmpeg = await loadFFmpeg();

    if (onProgress) {
        ffmpeg.on('log', ({ message }: { message: string }) => {
            onProgress(message);
        });
        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
            onProgress(Math.floor(progress * 100));
        });
    }

    const inputName = 'input.mp4';
    const data = await fetchFile(videoFile);
    await ffmpeg.writeFile(inputName, data);

    // Run FFmpeg command to extract frames / 运行 FFmpeg 命令提取关键帧
    await ffmpeg.exec(['-i', inputName, '-vf', `fps=${fps}`, 'out%d.png']);

    const files = await ffmpeg.listDir('.');
    const frameFiles = files
        .filter((f: any) => f.name.startsWith('out') && f.name.endsWith('.png'))
        .sort((a: any, b: any) => {
            const numA = parseInt(a.name.match(/\d+/)![0]);
            const numB = parseInt(b.name.match(/\d+/)![0]);
            return numA - numB;
        });

    const frameUrls: string[] = [];
    for (const file of frameFiles) {
        const data = await ffmpeg.readFile(file.name);
        // Convert to Blob URL for frontend rendering / 转换为前端渲染所需的 Blob URL
        const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'image/png' }));
        frameUrls.push(url);
        await ffmpeg.deleteFile(file.name);
    }

    await ffmpeg.deleteFile(inputName);

    return frameUrls;
}
