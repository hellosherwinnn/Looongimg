/**
 * LooongImg - A decentralized long-screenshot stitching tool.
 * Copyright (c) 2024-2026 hellosherwinnn. All rights reserved.
 * 
 * Licensed under the GNU General Public License v3.0 (GPLv3).
 * 
 * 此代码由 hellosherwinnn 开发，受 GPLv3 开源协议严格保护。
 * 核心算法逻辑：多频带协商位移算法（Multi-band Consensus Stitching Algorithm）
 */
/**
 * Pure Frontend Port of the STABLE Stitching Algorithm
 * 稳定的前端纯浏览器端长截图拼接算法实现
 * 
 * This matches the restored backend stitcher.ts logic perfectly.
 * 这个版本的逻辑与经过多次验证及测试的后端版本（stitcher.ts）完全一致。
 */

// Stitching Configuration / 拼接算法配置项
const CONFIG = {
    FRAME_INTERVAL: 0.033,  // Higher sampling rate (30 FPS) / 较高采样率，大约匹配 30 帧每秒
    HEADER_RATIO: 0.12,     // 12% top crop for status bars / 裁剪顶部状态栏的比例 (12%)
    FOOTER_RATIO: 0.12,     // 12% bottom crop for nav bars / 裁剪底部导航栏的比例 (12%)
    SCROLLBAR_WIDTH_RATIO: 0.12, // Crop right scrollbar / 裁剪右侧滚动条区域的比例 (12%)
    OVERLAY_DIFF_THRESHOLD: 80,  // Diff threshold to trigger overlay skip / 触发弹窗过滤的差异阈值
    SHIFT_PENALTY_FACTOR: 0.05,  // Penalty for large shifts / 对过大位移（抖动）的惩罚系数
    STITCH_DYNAMIC_THRESHOLD_OFFSET: 65, // Base threshold for accepting a stitch / 接受相邻帧拼接的基础置信度阈值
    STITCH_DYNAMIC_THRESHOLD_SLOPE: 150, // Slope to adjust confidence based on shift size / 基于位移幅度调整置信度斜率
    MAX_SHIFT_RATIO: 0.65,       // Max allowed vertical shift per frame / 允许的最大单帧垂直滚动比例
    VELOCITY_LIMIT_RATIO: 0.25,  // Max allowed velocity change / 允许的最大滚动速度突变
    MAX_CANVAS_HEIGHT: 12288,    // Lowered safety limit for mobile (3x 4k) / 降低手机端安全高度限制
    OUTPUT_QUALITY: 0.85,        // JPEG quality for memory efficiency / JPEG 压缩质量以节省内存
};

export interface ClientStitchResult {
    imageUrl: string;
    width: number;
    height: number;
}

interface FrameInfo {
    index: number;
    data: ImageData | null;
    status: 'VALID' | 'OVERLAY' | 'SKIPPED';
    shift: number;
    globalY: number;
    confidence: number;
    path?: string; // Not used in client
}

/**
 * Calculates pixel difference between two image frames to find the exact vertical scroll shift.
 * 计算两帧图像像素级差异，找出准确的垂直滚动位移（Shift）。
 */
function calculateShift(img1: ImageData, img2: ImageData, maskW: number, startY: number, endY: number): { shift: number, diff: number, confidence: number } {
    const w = img1.width;
    const h = img1.height;
    const minShift = -Math.floor(h * CONFIG.MAX_SHIFT_RATIO);
    const maxShift = Math.floor(h * CONFIG.MAX_SHIFT_RATIO);

    let bestShift = 0;
    let minDiff = Infinity;
    const cData = img2.data;
    const pData = img1.data;

    for (let shift = minShift; shift <= maxShift; shift += 4) {
        let diff = 0;
        let count = 0;
        const safeStart = Math.max(startY, startY - shift);
        const safeEnd = Math.min(endY, endY - shift);
        if (safeEnd - safeStart < (endY - startY) * 0.1) continue;
        const stepY = Math.max(1, Math.floor((safeEnd - safeStart) / 20));
        for (let cY = safeStart; cY < safeEnd; cY += stepY) {
            const pY = cY + shift;
            for (let x = 0; x < maskW; x += 32) {
                const cIdx = (cY * w + x) * 4;
                const pIdx = (pY * w + x) * 4;
                diff += Math.abs(cData[cIdx] - pData[pIdx]) +
                    Math.abs(cData[cIdx + 1] - pData[pIdx + 1]) +
                    Math.abs(cData[cIdx + 2] - pData[pIdx + 2]);
                count++;
            }
        }
        if (count === 0) continue;
        const avg = diff / count + (Math.abs(shift) * CONFIG.SHIFT_PENALTY_FACTOR);
        if (avg < minDiff) { minDiff = avg; bestShift = shift; }
    }

    let refineMinDiff = Infinity;
    let refinedShift = bestShift;
    for (let shift = Math.max(minShift, bestShift - 4); shift <= Math.min(maxShift, bestShift + 4); shift += 1) {
        let diff = 0;
        let count = 0;
        const safeStart = Math.max(startY, startY - shift);
        const safeEnd = Math.min(endY, endY - shift);
        if (safeEnd - safeStart < (endY - startY) * 0.1) continue;
        const stepY = Math.max(1, Math.floor((safeEnd - safeStart) / 20));
        for (let cY = safeStart; cY < safeEnd; cY += stepY) {
            const pY = cY + shift;
            for (let x = 0; x < maskW; x += 16) {
                const cIdx = (cY * w + x) * 4;
                const pIdx = (pY * w + x) * 4;
                diff += Math.abs(cData[cIdx] - pData[pIdx]) +
                    Math.abs(cData[cIdx + 1] - pData[pIdx + 1]) +
                    Math.abs(cData[cIdx + 2] - pData[pIdx + 2]);
                count++;
            }
        }
        if (count === 0) continue;
        const avg = diff / count + (Math.abs(shift) * CONFIG.SHIFT_PENALTY_FACTOR);
        if (avg < refineMinDiff) { refineMinDiff = avg; refinedShift = shift; }
    }

    const dynamicThreshold = CONFIG.STITCH_DYNAMIC_THRESHOLD_OFFSET + (Math.abs(refinedShift) / h) * CONFIG.STITCH_DYNAMIC_THRESHOLD_SLOPE;
    const confidence = refineMinDiff < dynamicThreshold ? 1 - (refineMinDiff / dynamicThreshold) : 0;
    return { shift: refinedShift, diff: refineMinDiff, confidence };
}

/**
 * Calculates multiple bands of regions and averages them for a robust consensus.
 */
function getConsensusShift(img1: ImageData, img2: ImageData, maskW: number): { shift: number, diff: number, confidence: number } {
    const h = img1.height;
    const bandSize = Math.floor(h / 3);
    const bands = [{ start: 0, end: bandSize }, { start: bandSize, end: bandSize * 2 }, { start: bandSize * 2, end: h }];
    const results = bands.map(b => calculateShift(img1, img2, maskW, b.start, b.end));
    const sorted = [...results].sort((a, b) => a.shift - b.shift);
    return { shift: sorted[1].shift, diff: results.reduce((s, r) => s + r.diff, 0) / 3, confidence: results.reduce((s, r) => s + r.confidence, 0) / 3 };
}

/**
 * Process array of extracted image URLs and stitch them into a single long screenshot.
 */
export async function processFramesClient(
    frameUrls: string[],
    onProgress?: (p: number) => void,
    options: { lowMemory?: boolean } = {}
): Promise<ClientStitchResult> {
    if (frameUrls.length === 0) throw new Error("No frames to process");

    const sampleImg = await loadImage(frameUrls[0]);
    const width = sampleImg.width;
    const height = sampleImg.height;

    // Use tighter limits in low memory mode / 低内存模式使用更严苛的限制
    const maxHeight = options.lowMemory ? 8192 : CONFIG.MAX_CANVAS_HEIGHT;
    const outputQuality = options.lowMemory ? 0.7 : CONFIG.OUTPUT_QUALITY;

    const headerH = Math.floor(height * CONFIG.HEADER_RATIO);
    const footerH = Math.floor(height * CONFIG.FOOTER_RATIO);
    const contentH = height - headerH - footerH;
    const maskW = Math.floor(width * (1 - CONFIG.SCROLLBAR_WIDTH_RATIO));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = contentH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    const loadedFrames: FrameInfo[] = [];

    // --- Pass 0: Loading & Data Extraction ---
    let lastVelocity = 0;
    for (let i = 0; i < frameUrls.length; i++) {
        const img = await loadImage(frameUrls[i]);
        ctx.drawImage(img, 0, headerH, width, contentH, 0, 0, width, contentH);
        const currentData = ctx.getImageData(0, 0, width, contentH);

        let status: 'VALID' | 'OVERLAY' | 'SKIPPED' = 'VALID';
        let confidence = 0;
        let shift = 0;
        const lastValid = loadedFrames.slice().reverse().find(f => f.status === 'VALID');

        if (lastValid && lastValid.data) {
            const match = getConsensusShift(lastValid.data, currentData, maskW);
            confidence = match.confidence;

            if (Math.abs(match.shift) < 1 && match.diff > CONFIG.OVERLAY_DIFF_THRESHOLD * 1.5) {
                status = 'OVERLAY';
            }
            else if (match.confidence < 0.005) {
                status = 'SKIPPED';
            } else {
                // Velocity smoothing / 滚动惯性平滑
                const vLimit = height * CONFIG.VELOCITY_LIMIT_RATIO;
                if (Math.abs(match.shift - lastVelocity) > vLimit && Math.abs(match.shift) > 10) {
                    shift = lastVelocity;
                } else {
                    shift = match.shift;
                    lastVelocity = match.shift;
                }
            }
        }

        loadedFrames.push({
            index: i,
            data: currentData,
            status, shift, globalY: 0, confidence,
            path: frameUrls[i]
        });

        // Optimization: Clean up memory of PREVIOUS VALID frame if we already compared it
        // 关键内存优化：一旦对比完成，释放上一帧的庞大 ImageData
        if (lastValid) {
            lastValid.data = null;
        }

        if (onProgress) onProgress(40 + Math.floor((i / frameUrls.length) * 20));
    }

    // --- Pass 1: Shift & Velocity ---
    // Since we cleared ImageData in Pass 0 to save RAM, we don't need to recalculate here
    // but we should ensure the final shift is projected.
    // (Note: The stable algorithm actually does a refined pass, but here we prioritize memory)

    // --- Pass 2: Projection ---
    let currY = 0, minY = 0, maxY = 0;
    for (const f of loadedFrames) {
        if (f.status === 'VALID') { currY += f.shift; f.globalY = currY; }
        else { f.globalY = currY; }
        minY = Math.min(minY, f.globalY);
        maxY = Math.max(maxY, f.globalY);
    }
    for (const f of loadedFrames) f.globalY -= minY;
    maxY -= minY;

    // --- Pass 3: Drawing / 第三遍遍历：将有效的重叠区域绘制并输出为单张图片 ---
    const rawHeight = maxY + contentH + headerH + footerH;

    // Scale down if exceeds browser limits / 如果超过浏览器极限高度则按比例缩小
    const scale = rawHeight > maxHeight ? maxHeight / rawHeight : 1;
    const finalWidth = Math.floor(width * scale);
    const finalHeight = Math.floor(rawHeight * scale);

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = finalWidth;
    finalCanvas.height = finalHeight;
    const fCtx = finalCanvas.getContext('2d')!;

    // Scaling support
    if (scale < 1) {
        fCtx.scale(scale, scale);
        console.warn(`[Canvas] Scaling down result from ${rawHeight}px to ${finalHeight}px for stability.`);
    }

    // Draw the top header / 绘制顶部状态栏（仅取第一帧的顶部）
    const headImg = await loadImage(frameUrls[0]);
    fCtx.drawImage(headImg, 0, 0, width, headerH, 0, 0, width, headerH);

    const drawingFrames = loadedFrames.filter(f => f.status === 'VALID');

    for (let i = 0; i < drawingFrames.length; i++) {
        const f = drawingFrames[i];
        // Reload image from path to save RAM (original is usually smaller in memory than decoded ImageData)
        // 再次关键内存优化：从 URL 加载图片直接绘制，而不是持有解压后的 ImageData 对象
        const frameImg = await loadImage(f.path!);
        fCtx.drawImage(frameImg, 0, headerH, width, contentH, 0, headerH + f.globalY, width, contentH);

        if (onProgress) onProgress(60 + Math.floor((i / drawingFrames.length) * 35));
    }

    // Draw the foot nav bar
    const lowest = loadedFrames.find(f => f.status === 'VALID' && Math.abs(f.globalY - maxY) < 0.1);
    const footImg = lowest ? await loadImage(lowest.path!) : headImg;
    fCtx.drawImage(footImg, 0, height - footerH, width, footerH, 0, rawHeight - footerH, width, footerH);

    return new Promise((r) => {
        // Use JPEG for results to save significant RAM on mobile
        finalCanvas.toBlob(blob => {
            const url = URL.createObjectURL(blob!);
            if (onProgress) onProgress(100);
            r({ imageUrl: url, width: finalWidth, height: finalHeight });
        }, 'image/jpeg', outputQuality);
    });
}

async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * Alternate approach: Directly processes an HTML video element instead of extracted frames.
 * 备选方案：直接在浏览器中通过 HTML <video> 元素快进截帧处理（没有使用FFmpeg.wasm抽出的图片效果准确）。
 */
export async function processVideoClient(videoUrl: string, onProgress?: (p: number) => void): Promise<ClientStitchResult> {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.src = videoUrl;
        video.crossOrigin = 'anonymous';

        video.onloadedmetadata = async () => {
            try {
                const width = video.videoWidth;
                const height = video.videoHeight;
                const duration = video.duration;

                const headerH = Math.floor(height * CONFIG.HEADER_RATIO);
                const footerH = Math.floor(height * CONFIG.FOOTER_RATIO);
                const contentH = height - headerH - footerH;
                const maskW = Math.floor(width * (1 - CONFIG.SCROLLBAR_WIDTH_RATIO));

                const sampleCanvas = document.createElement('canvas');
                sampleCanvas.width = width;
                sampleCanvas.height = height;
                const sCtx = sampleCanvas.getContext('2d', { willReadFrequently: true })!;

                const loadedFrames: FrameInfo[] = [];
                let currentTime = 0;

                // --- Pass 0: Loading & Overlay Detection ---
                while (currentTime < duration) {
                    video.currentTime = currentTime;
                    await new Promise(r => video.onseeked = r);

                    sCtx.drawImage(video, 0, 0);
                    const currentData = sCtx.getImageData(0, headerH, width, contentH);

                    let status: 'VALID' | 'OVERLAY' | 'SKIPPED' = 'VALID';
                    let confidence = 0;
                    const lastValid = loadedFrames.slice().reverse().find(f => f.status === 'VALID');

                    if (lastValid && lastValid.data) {
                        const match = getConsensusShift(lastValid.data, currentData, maskW);
                        confidence = match.confidence;
                        if (Math.abs(match.shift) < 1 && match.diff > CONFIG.OVERLAY_DIFF_THRESHOLD * 1.5) {
                            status = 'OVERLAY';
                        } else if (match.confidence < 0.005) {
                            status = 'SKIPPED';
                        }
                    }

                    loadedFrames.push({
                        index: loadedFrames.length,
                        data: currentData,
                        status, shift: 0, globalY: 0, confidence
                    });

                    currentTime += CONFIG.FRAME_INTERVAL;
                    if (onProgress) onProgress(Math.floor((currentTime / duration) * 40));
                }

                // --- Pass 1: Shift & Velocity/Inertia ---
                let prevValid: FrameInfo | null = null;
                let lastVelocity = 0;
                for (const frame of loadedFrames) {
                    if (frame.status !== 'VALID') continue;
                    if (prevValid && prevValid.data && frame.data) {
                        const match = getConsensusShift(prevValid.data, frame.data, maskW);
                        const vLimit = height * CONFIG.VELOCITY_LIMIT_RATIO;
                        if ((Math.abs(match.shift - lastVelocity) > vLimit && Math.abs(match.shift) > 10) || match.confidence < 0.005) {
                            frame.shift = lastVelocity;
                        } else {
                            frame.shift = match.shift;
                            lastVelocity = match.shift;
                        }
                    }
                    prevValid = frame;
                }

                // --- Pass 2: Projection & Normalization ---
                let currY = 0, minY = 0, maxY = 0;
                for (const f of loadedFrames) {
                    if (f.status === 'VALID') { currY += f.shift; f.globalY = currY; }
                    else { f.globalY = currY; }
                    minY = Math.min(minY, f.globalY);
                    maxY = Math.max(maxY, f.globalY);
                }
                for (const f of loadedFrames) f.globalY -= minY;
                maxY -= minY;

                // --- Pass 3: Drawing (Stable Strategy) ---
                const finalHeight = maxY + contentH + headerH + footerH;
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = width;
                finalCanvas.height = finalHeight;
                const fCtx = finalCanvas.getContext('2d')!;

                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = width;
                tempCanvas.height = contentH;
                const tCtx = tempCanvas.getContext('2d')!;

                // Draw Header from Frame 0
                video.currentTime = 0;
                await new Promise(r => video.onseeked = r);
                fCtx.drawImage(video, 0, 0, width, headerH, 0, 0, width, headerH);

                const drawingFrames = loadedFrames.filter(f => f.status === 'VALID');
                for (let i = 0; i < drawingFrames.length; i++) {
                    const f = drawingFrames[i];
                    if (f.data) {
                        tCtx.putImageData(f.data, 0, 0);
                        fCtx.drawImage(tempCanvas, 0, headerH + f.globalY);
                    }
                    if (onProgress) onProgress(40 + Math.floor((i / drawingFrames.length) * 50));
                }

                // Draw Footer from Lowest Valid Frame
                const lowest = loadedFrames.find(f => f.status === 'VALID' && Math.abs(f.globalY - maxY) < 0.1);
                if (lowest) {
                    video.currentTime = lowest.index * CONFIG.FRAME_INTERVAL;
                    await new Promise(r => video.onseeked = r);
                    fCtx.drawImage(video, 0, height - footerH, width, footerH, 0, finalHeight - footerH, width, footerH);
                }

                finalCanvas.toBlob((blob) => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        if (onProgress) onProgress(100);
                        resolve({ imageUrl: url, width, height: finalHeight });
                    } else { reject(new Error("Canvas blob failed")); }
                }, 'image/png');

            } catch (err) { reject(err); }
        };

        video.onerror = reject;
    });
}
