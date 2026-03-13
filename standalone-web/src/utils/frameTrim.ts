export interface TrimmedFramesResult {
    trimmedFrameUrls: string[];
    startTrimFrameCount: number;
    endTrimFrameCount: number;
}

export function clampTrimSeconds(value: number): number {
    if (!Number.isFinite(value)) {
        return 3;
    }

    const stepped = Math.round(value * 2) / 2;
    return Math.min(10, Math.max(0, stepped));
}

export function trimEdgeFrames(
    frameUrls: string[],
    startTrimSeconds: number,
    endTrimSeconds: number,
    extractionFps: number
): TrimmedFramesResult {
    const safeStartSeconds = clampTrimSeconds(startTrimSeconds);
    const safeEndSeconds = clampTrimSeconds(endTrimSeconds);
    const safeFps = Math.max(1, Math.round(extractionFps));
    
    const startTrimFrameCount = Math.round(safeStartSeconds * safeFps);
    const endTrimFrameCount = Math.round(safeEndSeconds * safeFps);

    if (startTrimFrameCount === 0 && endTrimFrameCount === 0) {
        return {
            trimmedFrameUrls: frameUrls,
            startTrimFrameCount,
            endTrimFrameCount,
        };
    }

    const startIndex = startTrimFrameCount;
    const endIndex = frameUrls.length - endTrimFrameCount;

    if (startIndex >= endIndex) {
        return {
            trimmedFrameUrls: [],
            startTrimFrameCount,
            endTrimFrameCount,
        };
    }

    return {
        trimmedFrameUrls: frameUrls.slice(startIndex, endIndex),
        startTrimFrameCount,
        endTrimFrameCount,
    };
}
