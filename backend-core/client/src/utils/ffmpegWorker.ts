import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpeg: any = null;

export async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();

    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';

    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
}

export async function extractFramesClient(
    videoFile: File,
    fps: number = 10,
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

    // Run FFmpeg command
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
        const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'image/png' }));
        frameUrls.push(url);
        await ffmpeg.deleteFile(file.name);
    }

    await ffmpeg.deleteFile(inputName);

    return frameUrls;
}
