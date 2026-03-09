import ffmpeg from 'fluent-ffmpeg';
/**
 * LooongImg - A decentralized long-screenshot stitching tool.
 * Copyright (c) 2024-2026 hellosherwinnn. All rights reserved.
 * 
 * Licensed under the GNU General Public License v3.0 (GPLv3).
 * 
 * 此代码由 hellosherwinnn 开发，受 GPLv3 开源协议严格保护。
 * 核心算法逻辑：多频带协商位移算法（Multi-band Consensus Stitching Algorithm）
 */
import { createCanvas, loadImage, ImageData, Image } from 'canvas';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CONFIG = {
    FRAME_INTERVAL: 0.03, // Increased FPS to capture faster scroll motion
    HEADER_RATIO: 0.12,   // Increased to 12% to filter status bars
    FOOTER_RATIO: 0.12,   // Increased to 12% to filter nav bars
    SCROLLBAR_WIDTH_RATIO: 0.12,
    OVERLAY_DIFF_THRESHOLD: 80, // Safer threshold (was 40, then 100)
    OVERLAY_MIN_OVERLAP_RATIO: 0.02,
    SHIFT_PENALTY_FACTOR: 0.05,
    STITCH_DYNAMIC_THRESHOLD_OFFSET: 65,
    STITCH_DYNAMIC_THRESHOLD_SLOPE: 150,
    MAX_SHIFT_RATIO: 0.65, // Max 65% height per frame
    VELOCITY_LIMIT_RATIO: 0.25, // Max 25% change in shift per frame
};

export interface StitchResult {
    imageUrl: string;
    width: number;
    height: number;
}

interface FrameInfo {
    index: number;
    path: string;
    data: ImageData | null;
    status: 'VALID' | 'OVERLAY' | 'SKIPPED';
    shift: number;
    globalY: number;
    confidence: number;
}

/**
 * Extracts frames from a video using FFmpeg.
 */
async function extractFrames(videoPath: string, outputDir: string): Promise<{ frames: string[], width: number, height: number }> {
    return new Promise((resolve, reject) => {
        let width = 0;
        let height = 0;

        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);
            const videoStream = metadata.streams.find(s => s.codec_type === 'video');
            if (!videoStream) return reject(new Error("No video stream found"));

            const rotation = videoStream.tags?.['rotate'];
            let isRotated = false;
            if (rotation === '90' || rotation === '270') {
                isRotated = true;
            }

            width = isRotated ? (videoStream.height || 0) : (videoStream.width || 0);
            height = isRotated ? (videoStream.width || 0) : (videoStream.height || 0);

            if (!width || !height) return reject(new Error("Could not determine video dimensions"));

            const fps = Math.round(1 / CONFIG.FRAME_INTERVAL);

            ffmpeg(videoPath)
                .outputOptions([
                    `-r ${fps}`,
                    `-f image2`
                ])
                .output(path.join(outputDir, 'frame-%05d.png'))
                .on('end', () => {
                    const files = fs.readdirSync(outputDir)
                        .filter(f => f.startsWith('frame-') && f.endsWith('.png'))
                        .sort()
                        .map(f => path.join(outputDir, f));
                    resolve({ frames: files, width, height });
                })
                .on('error', (err) => {
                    reject(err);
                })
                .run();
        });
    });
}

/**
 * The core similarity algorithm for a specific vertical slice.
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
        const avg = diff / count;
        const penalizedAvg = avg + (Math.abs(shift) * CONFIG.SHIFT_PENALTY_FACTOR);

        if (penalizedAvg < minDiff) {
            minDiff = penalizedAvg;
            bestShift = shift;
        }
    }

    let refineMinDiff = Infinity;
    let refinedShift = bestShift;
    const searchStart = Math.max(minShift, bestShift - 4);
    const searchEnd = Math.min(maxShift, bestShift + 4);

    for (let shift = searchStart; shift <= searchEnd; shift += 1) {
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
        const avg = diff / count;
        const penalizedAvg = avg + (Math.abs(shift) * CONFIG.SHIFT_PENALTY_FACTOR);

        if (penalizedAvg < refineMinDiff) {
            refineMinDiff = penalizedAvg;
            refinedShift = shift;
        }
    }

    const dynamicThreshold = CONFIG.STITCH_DYNAMIC_THRESHOLD_OFFSET + (Math.abs(refinedShift) / h) * CONFIG.STITCH_DYNAMIC_THRESHOLD_SLOPE;

    let confidence = 0;
    if (refineMinDiff < dynamicThreshold) {
        confidence = 1 - (refineMinDiff / dynamicThreshold);
    }

    return { shift: refinedShift, diff: refineMinDiff, confidence };
}

/**
 * Multi-band consensus matching.
 */
function getConsensusShift(img1: ImageData, img2: ImageData, maskW: number): { shift: number, diff: number, confidence: number } {
    const h = img1.height;
    const bandSize = Math.floor(h / 3);
    const bands = [
        { start: 0, end: bandSize },
        { start: bandSize, end: bandSize * 2 },
        { start: bandSize * 2, end: h }
    ];

    const results = bands.map(b => calculateShift(img1, img2, maskW, b.start, b.end));
    const sortedShiftResults = [...results].sort((a, b) => a.shift - b.shift);
    const medianResult = sortedShiftResults[1];

    const avgDiff = results.reduce((sum, r) => sum + r.diff, 0) / 3;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / 3;

    return {
        shift: medianResult.shift,
        diff: avgDiff,
        confidence: avgConfidence
    };
}

/**
 * Main process function.
 */
export async function processVideo(videoPath: string, callback?: (progress: number) => void): Promise<StitchResult> {
    const runId = crypto.randomUUID();
    const tempDir = path.join(__dirname, 'uploads', runId);
    fs.mkdirSync(tempDir, { recursive: true });

    try {
        if (callback) callback(5);

        const { frames, width, height } = await extractFrames(videoPath, tempDir);
        if (frames.length === 0) throw new Error("No frames extracted from video");
        if (callback) callback(30);

        const headerH = Math.floor(height * CONFIG.HEADER_RATIO);
        const footerH = Math.floor(height * CONFIG.FOOTER_RATIO);
        const contentH = height - headerH - footerH;
        const maskW = Math.floor(width * (1 - CONFIG.SCROLLBAR_WIDTH_RATIO));

        const loadedFrames: FrameInfo[] = [];
        const extractCanvas = createCanvas(width, contentH);
        const exCtx = extractCanvas.getContext('2d');

        const debugPath = path.join(tempDir, 'shift_debug.txt');
        fs.writeFileSync(debugPath, `Stitching Mode: Total Frames=${frames.length}\n`);

        // --- Pass 0: Loading & Data Extraction ---
        let lastVelocity = 0;
        for (let i = 0; i < frames.length; i++) {
            const img = await loadImage(frames[i]);
            if (!exCtx) throw new Error("Could not create canvas context");

            exCtx.drawImage(img, 0, headerH, width, contentH, 0, 0, width, contentH);
            const currentData = exCtx.getImageData(0, 0, width, contentH);

            let status: 'VALID' | 'OVERLAY' | 'SKIPPED' = 'VALID';
            let confidence = 0;
            let shift = 0;

            const lastValid = loadedFrames.slice().reverse().find(f => f.status === 'VALID');

            if (lastValid && lastValid.data) {
                const match = getConsensusShift(lastValid.data, currentData, maskW);
                confidence = match.confidence;

                // Relaxed detection: only skip if diff is truly significant
                if (Math.abs(match.shift) < 1 && match.diff > CONFIG.OVERLAY_DIFF_THRESHOLD * 1.5) {
                    status = 'OVERLAY';
                    fs.appendFileSync(debugPath, `[PHASE 0] Frame ${i}: OVERLAY (diff: ${match.diff.toFixed(2)}, shift: ${match.shift}). Skipping.\n`);
                } else if (match.confidence < 0.005) {
                    status = 'SKIPPED';
                } else {
                    // Velocity smoothing / 滚动惯性平滑
                    const velocityDiff = Math.abs(match.shift - lastVelocity);
                    const velocityLimit = height * CONFIG.VELOCITY_LIMIT_RATIO;

                    if (velocityDiff > velocityLimit && Math.abs(match.shift) > 10) {
                        shift = lastVelocity;
                    } else {
                        shift = match.shift;
                        lastVelocity = match.shift;
                    }
                }

                // --- CRITICAL MEMORY OPTIMIZATION ---
                // Discard pixel data of the PREVIOUS frame once we have the shift.
                // This keeps memory constant (2 frames max) instead of linear.
                lastValid.data = null;
            }

            loadedFrames.push({
                index: i, path: frames[i], data: currentData,
                status, shift, globalY: 0, confidence
            });

            if (callback) callback(30 + Math.floor((i / frames.length) * 30));
        }

        // The very last frame will still have data, clear it now to free up space for drawing
        for (const f of loadedFrames) f.data = null;

        // --- Pass 2: Global Coordinate Projection & Normalization ---
        let currentGlobalY = 0;
        let minY = 0, maxY = 0;
        let validFramesCount = 0;

        for (const frame of loadedFrames) {
            if (frame.status !== 'VALID') {
                frame.globalY = currentGlobalY;
                continue;
            }
            currentGlobalY += frame.shift;
            frame.globalY = currentGlobalY;
            if (currentGlobalY < minY) minY = currentGlobalY;
            if (currentGlobalY > maxY) maxY = currentGlobalY;
            validFramesCount++;
        }

        for (const frame of loadedFrames) {
            frame.globalY -= minY;
            fs.appendFileSync(debugPath, `Frame ${frame.index}: shift=${frame.shift.toFixed(2)}, globalY=${frame.globalY.toFixed(2)}, status=${frame.status}, conf=${frame.confidence.toFixed(2)}\n`);
        }
        maxY -= minY; minY = 0;

        if (validFramesCount <= 1) throw new Error("Could not find enough valid frames to stitch.");

        // --- Pass 3: Drawing ---
        const stitchedHeight = maxY - minY + contentH;
        const finalStitchedHeight = stitchedHeight + headerH + footerH;

        console.log(`[STITCH] Final dimensions: ${width}x${finalStitchedHeight}`);
        const finalCanvas = createCanvas(width, finalStitchedHeight);
        const fCtx = finalCanvas.getContext('2d');
        if (!fCtx) throw new Error("Could not create final canvas context");

        const drawingFrames = loadedFrames.filter(f => f.status === 'VALID');

        // Draw Header
        const firstImg = await loadImage(frames[0]);
        fCtx.drawImage(firstImg, 0, 0, width, headerH, 0, 0, width, headerH);

        // Draw Content
        for (let i = 0; i < drawingFrames.length; i++) {
            const frame = drawingFrames[i];
            // Reload image from disk to save RAM (keeps memory constant during drawing)
            const frameImg = await loadImage(frame.path);
            fCtx.drawImage(frameImg, 0, headerH, width, contentH, 0, headerH + frame.globalY, width, contentH);

            if (callback) callback(70 + Math.floor((i / drawingFrames.length) * 20));
        }

        // Draw Footer
        const lowestValidFrame = loadedFrames.slice().reverse().find(f => f.status === 'VALID' && Math.abs(f.globalY - maxY) < 0.1);
        const lowestImg = lowestValidFrame ? await loadImage(lowestValidFrame.path) : firstImg;
        fCtx.drawImage(lowestImg, 0, height - footerH, width, footerH, 0, finalStitchedHeight - footerH, width, footerH);

        console.log(`[STITCH] Drawing finished. Exporting...`);

        const outFileName = `stitch_${runId}.png`;
        const outPath = path.join(__dirname, 'outputs', outFileName);

        if (!fs.existsSync(path.join(__dirname, 'outputs'))) {
            fs.mkdirSync(path.join(__dirname, 'outputs'), { recursive: true });
        }

        return new Promise((resolve, reject) => {
            const out = fs.createWriteStream(outPath);
            const stream = finalCanvas.createPNGStream();
            stream.pipe(out);
            out.on('finish', () => {
                console.log(`[STITCH] Result saved: ${outPath}`);
                if (callback) callback(100);
                resolve({ imageUrl: `/outputs/${outFileName}`, width, height: finalStitchedHeight });
            });
            out.on('error', (err) => {
                console.error(`[STITCH] Stream Error:`, err);
                reject(err);
            });
        });

    } catch (err: any) {
        console.error("Critical Stitching Error:", err);
        throw err;
    }
}
