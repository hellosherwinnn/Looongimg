import React, { useEffect, useRef, useState } from 'react';
import { Upload, Scissors, Download, RefreshCw, Play, CheckCircle2, AlertCircle, Layout, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { extractFramesClient } from './utils/ffmpegWorker';
import { processFramesClient } from './utils/clientStitcher';
import { clampEdgeTrimSeconds, trimEdgeFrames } from './utils/frameTrim';

interface StitchResult {
  imageUrl: string;
  width: number;
  height: number;
}

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('准备就绪');
  const [isMobile, setIsMobile] = useState(false);
  const [lowMemory, setLowMemory] = useState(false);
  const [edgeTrimSeconds, setEdgeTrimSeconds] = useState(3);

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(navigator.userAgent));
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }

      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setProgress(0);
      setStatusText('准备就绪');
      return;
    }

    setError('请选择有效的视频文件 / Please select a valid video file');
  };

  const handleEdgeTrimSecondsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.valueAsNumber;
    if (Number.isNaN(value)) {
      return;
    }

    setEdgeTrimSeconds(clampEdgeTrimSeconds(value));
  };

  const normalizeEdgeTrimSeconds = () => {
    setEdgeTrimSeconds((current) => clampEdgeTrimSeconds(current));
  };

  const reset = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    if (result?.imageUrl) {
      URL.revokeObjectURL(result.imageUrl);
    }

    setVideoFile(null);
    setVideoUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setStatusText('准备就绪');
  };

  const startStitching = async () => {
    if (!videoFile) {
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setResult(null);
    setStatusText('准备提取视频帧...');

    let extractedFrameUrls: string[] = [];

    try {
      const { frameUrls, extractionFps } = await extractFramesClient(
        videoFile,
        30,
        (nextProgress) => {
          if (typeof nextProgress === 'number') {
            setStatusText('正在从视频中提取帧...');
            setProgress(Math.floor(nextProgress * 0.4));
            return;
          }

          setStatusText(nextProgress);
          if (nextProgress.includes('Downloading')) {
            const numeric = parseInt(nextProgress.split(':')[1], 10);
            if (!Number.isNaN(numeric)) {
              setProgress(Math.floor(numeric * 0.1));
            }
          }
        },
        { lowMemory }
      );

      extractedFrameUrls = frameUrls;

      if (frameUrls.length === 0) {
        throw new Error('No frames extracted / 无法从视频中提取有效帧');
      }

      setStatusText(`正在应用首尾过滤: ${edgeTrimSeconds} 秒`);
      setProgress(42);

      const { trimmedFrameUrls, trimFrameCount } = trimEdgeFrames(frameUrls, edgeTrimSeconds, extractionFps);

      if (trimmedFrameUrls.length < 2) {
        throw new Error('过滤秒数过大，剩余内容不足以生成长图');
      }

      const stitchResult = await processFramesClient(
        trimmedFrameUrls,
        (nextProgress) => {
          setStatusText(`正在拼接长图: ${nextProgress}%`);
          setProgress(40 + Math.floor(nextProgress * 0.6));
        },
        { lowMemory }
      );

      setResult(stitchResult);
      setProgress(100);
      setStatusText(`首尾各过滤了 ${trimFrameCount} 帧`);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      console.error('Stitching Error:', err);
      setError(err.message || 'An error occurred during local processing');
      setProgress(0);
    } finally {
      extractedFrameUrls.forEach((url) => URL.revokeObjectURL(url));
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] selection:bg-blue-100">
      <header className="sticky top-0 z-50 border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
              <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">LooongImg</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Auto Long Screenshot</p>
            </div>
          </div>

          {videoFile && (
            <button
              onClick={reset}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              重新开始
            </button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6 md:p-12">
        <AnimatePresence mode="wait">
          {!videoFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex min-h-[60vh] flex-col items-center justify-center"
            >
              <div className="mb-12 text-center">
                <h2 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">让长截图变得更简单</h2>
                <p className="mx-auto max-w-lg text-xl text-gray-500">
                  上传一段滚动录屏，自动提取有效区域并拼接成长图。
                </p>
              </div>

              <label className="group relative cursor-pointer">
                <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                <div className="flex h-72 w-72 flex-col items-center justify-center gap-6 rounded-[3rem] border border-black/5 bg-white shadow-2xl shadow-black/5 transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-500/10 group-active:scale-95">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 transition-colors group-hover:bg-blue-100">
                    <Upload className="h-10 w-10 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <span className="block text-lg font-semibold">选择录屏视频</span>
                    <span className="text-sm text-gray-400">支持 MP4 / MOV</span>
                  </div>
                </div>
              </label>

              <div className="mt-16 grid w-full grid-cols-1 gap-8 md:grid-cols-3">
                {[
                  { icon: Smartphone, title: '录制滚动内容', desc: '保持页面稳定滚动，给算法留出足够可比对的内容。' },
                  { icon: Scissors, title: '智能过滤首尾', desc: '开始和结束的手势、菜单动画会在进入拼接前先被裁掉。' },
                  { icon: Layout, title: '生成长图结果', desc: '输出连续的长截图，方便保存、分享和归档。' },
                ].map((item, index) => (
                  <div key={index} className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                    <item.icon className="mb-4 h-8 w-8 text-blue-600" />
                    <h3 className="mb-2 font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="process"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 items-start gap-12 lg:grid-cols-2"
            >
              <div className="space-y-6">
                <div className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white p-4 shadow-xl">
                  <div className="group relative aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-black">
                    <video
                      ref={videoRef}
                      src={videoUrl ?? undefined}
                      className="h-full w-full object-contain"
                      playsInline
                      muted
                      controls
                    />
                    {!isProcessing && !result && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 transition-opacity group-hover:opacity-100">
                        <Play className="h-16 w-16 fill-white text-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-medium uppercase tracking-wider text-gray-500">文件信息</span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600">READY</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Smartphone className="h-6 w-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="max-w-[220px] truncate font-semibold">{videoFile.name}</p>
                      <p className="text-xs text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="rounded-[2.5rem] border border-black/5 bg-white p-8 shadow-xl">
                  <h3 className="mb-6 text-2xl font-bold tracking-tight">
                    {result ? '拼接完成' : isProcessing ? '正在处理中...' : '准备就绪'}
                  </h3>

                  {!result && !isProcessing && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-4">
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-5 w-5 text-amber-600" />
                          <div>
                            <p className="text-sm font-bold text-amber-900">低内存兼容模式</p>
                            <p className="text-[11px] text-amber-700">
                              {isMobile ? '检测到移动设备，崩溃时建议开启。' : '处理超长视频或内存紧张时建议开启。'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setLowMemory((current) => !current)}
                          className={`relative h-6 w-12 rounded-full transition-colors ${lowMemory ? 'bg-blue-600' : 'bg-gray-300'}`}
                          aria-pressed={lowMemory}
                        >
                          <div
                            className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${lowMemory ? 'left-7' : 'left-1'}`}
                          />
                        </button>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-bold text-blue-900">首尾过滤秒数</p>
                            <p className="text-[11px] text-blue-700">
                              开始和结束各跳过 {edgeTrimSeconds} 秒，不参与拼接计算
                            </p>
                          </div>
                          <input
                            type="number"
                            min={0}
                            max={10}
                            step={1}
                            inputMode="numeric"
                            value={edgeTrimSeconds}
                            onChange={handleEdgeTrimSecondsChange}
                            onBlur={normalizeEdgeTrimSeconds}
                            className="w-20 rounded-xl border border-blue-200 bg-white px-3 py-2 text-center text-sm font-semibold text-blue-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            aria-label="首尾过滤秒数"
                          />
                        </div>
                      </div>

                      <button
                        onClick={startStitching}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1D1D1F] py-5 text-lg font-semibold text-white shadow-lg shadow-black/10 transition-all hover:bg-black active:scale-[0.98]"
                      >
                        <Scissors className="h-6 w-6" />
                        开始自动拼接
                      </button>
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-6">
                      <div className="h-4 overflow-hidden rounded-full bg-gray-100">
                        <motion.div className="h-full bg-blue-600" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-500">处理进度</span>
                        <span className="text-blue-600">{progress}%</span>
                      </div>
                      <p className="text-center text-sm text-gray-400 animate-pulse">{statusText}</p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-red-600">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-green-700">
                        <CheckCircle2 className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">拼接成功，长图已经生成。</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-black/5 bg-gray-50 p-4">
                          <p className="mb-1 text-xs font-bold uppercase text-gray-400">宽度</p>
                          <p className="text-xl font-bold">{result.width}px</p>
                        </div>
                        <div className="rounded-2xl border border-black/5 bg-gray-50 p-4">
                          <p className="mb-1 text-xs font-bold uppercase text-gray-400">高度</p>
                          <p className="text-xl font-bold">{result.height}px</p>
                        </div>
                      </div>

                      <a
                        href={result.imageUrl}
                        download={`stitch-tailor-${Date.now()}.png`}
                        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 py-5 text-lg font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-[0.98]"
                      >
                        <Download className="h-6 w-6" />
                        保存到相册
                      </a>
                    </div>
                  )}
                </div>

                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="overflow-hidden rounded-[2.5rem] border border-black/5 bg-white p-4 shadow-xl"
                  >
                    <p className="mb-4 px-4 text-sm font-medium uppercase tracking-wider text-gray-500">预览结果</p>
                    <div className="max-h-[500px] overflow-y-auto rounded-[1.5rem] border border-black/5 bg-gray-50">
                      <img src={result.imageUrl} alt="Stitched Result" className="h-auto w-full" referrerPolicy="no-referrer" />
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mx-auto max-w-5xl p-12 text-center text-sm text-gray-400">
        <p>© 2026 LooongImg. Crafted by hellosherwin.</p>
      </footer>
    </div>
  );
}
