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
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Cache the FFmpeg instance
let ffmpeg: any = null;

/**
 * Custom toBlobURL with progress tracking
 */
async function toBlobURLWithProgress(url: string, mimeType: string, name: string, onProgress?: (p: number) => void) {
    console.log(`[Fetch] Starting: ${name} from ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${name}: ${response.statusText}`);

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    if (!response.body) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    }

    const reader = response.body.getReader();
    let loaded = 0;
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total > 0 && onProgress) {
            onProgress(Math.round((loaded / total) * 100));
        }
    }

    const blob = new Blob(chunks, { type: mimeType });
    console.log(`[Fetch] Complete: ${name} (${loaded} bytes)`);
    return URL.createObjectURL(blob);
}

/**
 * Initializes and loads FFmpeg.wasm
 * Uses ESM assets and toBlobURL for Cross-Origin Isolated environments.
 */
export async function loadFFmpeg(onProgress?: (msg: string) => void) {
    if (ffmpeg) return ffmpeg;

    const base = import.meta.env.BASE_URL; // e.g., '/Looongimg/'
    const fullBase = `${window.location.origin}${base}`.replace(/\/$/, "");

    console.log("--- [FFmpeg v446] Diagnostic Start ---");
    console.log("SharedArrayBuffer available:", typeof SharedArrayBuffer !== 'undefined');
    console.log("Cross-Origin Isolated:", window.crossOriginIsolated);

    ffmpeg = new FFmpeg();

    try {
        console.log("Starting FFmpeg asset fetch...");

        const coreURL = await toBlobURLWithProgress(
            `${fullBase}/ffmpeg/ffmpeg-core.js`,
            'text/javascript',
            'core.js',
            (p) => onProgress?.(`Downloading Core: ${p}%`)
        );

        const wasmURL = await toBlobURLWithProgress(
            `${fullBase}/ffmpeg/ffmpeg-core.wasm`,
            'application/wasm',
            'core.wasm',
            (p) => onProgress?.(`Downloading Wasm: ${p}%`)
        );

        // Use default worker handled by FFmpeg if possible, or provide it
        // For ESM 0.12, we usually don't need to specify workerURL if core is ESM
        console.log("Assets fetched. Calling ffmpeg.load()...");

        await ffmpeg.load({
            coreURL,
            wasmURL,
        });
        console.log("--- [FFmpeg v446] Load Success ---");
    } catch (err) {
        console.error("[FFmpeg v446] Load failed:", err);
        throw err;
    }

    return ffmpeg;
}

export async function extractFramesClient(
    videoFile: File,
    fps: number = 30,
    onProgress?: (progress: number | string) => void
): Promise<string[]> {
    console.log("extractFramesClient started for file:", videoFile.name);
    const ffmpeg = await loadFFmpeg((msg) => onProgress?.(msg));
    console.log("FFmpeg instance ready in extractFramesClient");

    if (onProgress) {
        ffmpeg.on('log', ({ message }: { message: string }) => {
            console.log("FFmpeg Log:", message);
            onProgress(message);
        });
        ffmpeg.on('progress', ({ progress }: { progress: number }) => {
            console.log("FFmpeg Progress:", progress);
            onProgress(Math.floor(progress * 100));
        });
    }

    const inputName = 'input.mp4';
    console.log("Fetching file data...");
    const data = await fetchFile(videoFile);
    console.log("File data fetched, length:", data.length);

    console.log("Writing file to FFmpeg FS...");
    await ffmpeg.writeFile(inputName, data);
    console.log("File written to FFmpeg FS");

    // Run FFmpeg command to extract frames / 运行 FFmpeg 命令提取关键帧
    // We scale down to 1080p max to prevent OOM on mobile / 限制最高1080p以防止手机内存溢出
    console.log("Executing FFmpeg command with downscaling...");
    await ffmpeg.exec([
        '-i', inputName,
        '-vf', `fps=${fps},scale=-1:'min(1080,ih)'`,
        'out%d.png'
    ]);
    console.log("FFmpeg command execution finished");

    console.log("Listing FFmpeg directory...");
    const files = await ffmpeg.listDir('.');
    console.log("Files in FFmpeg FS:", files.map((f: any) => f.name));

    const frameFiles = files
        .filter((f: any) => f.name.startsWith('out') && f.name.endsWith('.png'))
        .sort((a: any, b: any) => {
            const matchA = a.name.match(/\d+/);
            const matchB = b.name.match(/\d+/);
            const numA = matchA ? parseInt(matchA[0]) : 0;
            const numB = matchB ? parseInt(matchB[0]) : 0;
            return numA - numB;
        });

    console.log(`Found ${frameFiles.length} frame files`);

    const frameUrls: string[] = [];
    for (const file of frameFiles) {
        const data = await ffmpeg.readFile(file.name);
        // Convert to Blob URL for frontend rendering / 转换为前端渲染所需的 Blob URL
        const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'image/png' }));
        frameUrls.push(url);
        await ffmpeg.deleteFile(file.name);
    }

    await ffmpeg.deleteFile(inputName);
    console.log("Cleanup finished, returning URLs");

    return frameUrls;
}
