export interface TrimmedFramesResult {
    trimmedFrameUrls: string[];
    trimFrameCount: number;
}

export function clampEdgeTrimSeconds(value: number): number {
    if (!Number.isFinite(value)) {
        return 3;
    }

    return Math.min(10, Math.max(0, Math.round(value)));
}

export function trimEdgeFrames(
    frameUrls: string[],
    edgeTrimSeconds: number,
    extractionFps: number
): TrimmedFramesResult {
    const safeSeconds = clampEdgeTrimSeconds(edgeTrimSeconds);
    const safeFps = Math.max(1, Math.round(extractionFps));
    const trimFrameCount = Math.round(safeSeconds * safeFps);

    if (trimFrameCount === 0) {
        return {
            trimmedFrameUrls: frameUrls,
            trimFrameCount,
        };
    }

    return {
        trimmedFrameUrls: frameUrls.slice(trimFrameCount, frameUrls.length - trimFrameCount),
        trimFrameCount,
    };
}
