import React, { useState, useRef, useEffect } from 'react';
import { Upload, Scissors, Download, RefreshCw, Play, CheckCircle2, AlertCircle, ChevronRight, Layout, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { processVideoClient } from './utils/clientStitcher';

// --- Types / 类型定义 ---
interface StitchResult {
  imageUrl: string;
  width: number;
  height: number;
}

// --- Constants / 常量定义 ---
// --- Constants / 常量定义 ---

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<StitchResult | null>(null);
  const [clientResult, setClientResult] = useState<StitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);



  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
      setProgress(0);
    } else {
      setError('请选择有效的视频文件');
    }
  };

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (result?.imageUrl) URL.revokeObjectURL(result.imageUrl);
    setVideoFile(null);
    setVideoUrl(null);
    setResult(null);
    setClientResult(null);
    setError(null);
    setProgress(0);
  };

  const startStitching = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress since backend API is synchronous
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.floor(Math.random() * 5) + 1;
        });
      }, 1000);

      const formData = new FormData();
      formData.append('video', videoFile);

      const response = await fetch('/api/stitch', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        let errorMsg = 'Stitching failed';
        try {
          const errData = await response.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) { }
        throw new Error(errorMsg);
      }

      const resultData: StitchResult = await response.json();
      setResult(resultData);
      setProgress(100);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });

    } catch (err: any) {
      setError(err.message || 'An error occurred during processing');
      setProgress(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const startClientStitching = async () => {
    if (!videoUrl) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    try {
      const res = await processVideoClient(videoUrl, (p) => setProgress(p));
      setClientResult(res);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (err: any) {
      setError(err.message || 'Client-side processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans selection:bg-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Scissors className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">LooongImg</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Auto Long Screenshot</p>
            </div>
          </div>

          {videoFile && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  const modal = document.getElementById('dev-note-modal');
                  if (modal) modal.classList.remove('hidden');
                }}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <AlertCircle className="w-4 h-4" />
                技术实现
              </button>
              <button
                onClick={reset}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                重新开始
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Dev Note Modal */}
      <div id="dev-note-modal" className="hidden fixed inset-0 z-[100] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => document.getElementById('dev-note-modal')?.classList.add('hidden')} />
        <div className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl p-8 overflow-y-auto max-h-[80vh]">
          <h3 className="text-2xl font-bold mb-6">技术实现指南 / Technical Implementation Details</h3>
          <div className="space-y-6 text-gray-600 leading-relaxed">
            <section>
              <h4 className="font-bold text-black mb-1">1. 浏览器端视频解码 / Client-side Video Decoding</h4>
              <p className="text-xs mb-2"><strong>Core: FFmpeg.wasm</strong></p>
              <p className="text-sm">使用 WebAssembly 版本的 FFmpeg 在浏览器里直接解码视频，提取关键帧，无需上传文件到服务器，保护隐私且零服务器成本。</p>
              <p className="text-sm italic">Utilizes WebAssembly-powered FFmpeg to decode videos and extract frames directly in the browser. No uploads required—ensuring privacy and zero server costs.</p>
            </section>
            <section>
              <h4 className="font-bold text-black mb-1">2. 智能重叠识别 / Intelligent Overlap Detection</h4>
              <p className="text-xs mb-2"><strong>Algorithm: Multi-band Consensus Matching</strong></p>
              <p className="text-sm">通过分析相邻帧的多个垂直频带计算位移，确保滚动截图的无缝衔接。</p>
              <p className="text-sm italic">Calculates displacement by analyzing multiple vertical bands across adjacent frames to ensure seamless stitching.</p>
            </section>
          </div>
          <button
            onClick={() => document.getElementById('dev-note-modal')?.classList.add('hidden')}
            className="mt-8 w-full bg-blue-600 text-white py-4 rounded-2xl font-semibold"
          >
            关闭 / Close
          </button>
        </div>
      </div>

      <main className="max-w-5xl mx-auto p-6 md:p-12">
        <AnimatePresence mode="wait">
          {!videoFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">让长截图变得简单</h2>
                <p className="text-xl text-gray-500 max-w-lg mx-auto">
                  只需上传你的屏幕录制视频，我们将自动为你拼接成一张完美的长截图。
                </p>
              </div>

              <label className="group relative cursor-pointer">
                <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
                <div className="w-72 h-72 bg-white rounded-[3rem] shadow-2xl shadow-black/5 border border-black/5 flex flex-col items-center justify-center gap-6 transition-all duration-500 group-hover:scale-105 group-hover:shadow-blue-500/10 group-active:scale-95">
                  <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Upload className="w-10 h-10 text-blue-600" />
                  </div>
                  <div className="text-center">
                    <span className="block text-lg font-semibold">选择录屏视频</span>
                    <span className="text-sm text-gray-400">支持 MP4, MOV 格式</span>
                  </div>
                </div>
              </label>

              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {[
                  { icon: Smartphone, title: "录制屏幕", desc: "在手机上开启录屏并缓慢滚动" },
                  { icon: Scissors, title: "自动拼接", desc: "智能识别重叠部分并无缝缝合" },
                  { icon: Layout, title: "高清导出", desc: "生成无损画质的长图文件" }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                    <item.icon className="w-8 h-8 text-blue-600 mb-4" />
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="process"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start"
            >
              {/* Left: Video Preview */}
              <div className="space-y-6">
                <div className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-black/5 overflow-hidden">
                  <div className="aspect-[9/16] bg-black rounded-[1.5rem] relative overflow-hidden group">
                    <video
                      ref={videoRef}
                      src={videoUrl!}
                      className="w-full h-full object-contain"
                      playsInline
                      muted
                    />
                    {!isProcessing && !result && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-16 h-16 text-white fill-white" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">文件信息</span>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-bold">READY</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-semibold truncate max-w-[200px]">{videoFile.name}</p>
                      <p className="text-xs text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Controls & Result */}
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-black/5">
                  <h3 className="text-2xl font-bold mb-6 tracking-tight">
                    {result && clientResult ? '全部完成' : (result || clientResult) ? '部分完成' : isProcessing ? '正在拼命中...' : '准备就绪'}
                  </h3>

                  {!isProcessing && (!result || !clientResult) && (
                    <div className="space-y-4">
                      {!result && (
                        <button
                          onClick={startStitching}
                          className="w-full bg-[#1D1D1F] text-white py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-black/10"
                        >
                          <Layout className="w-6 h-6" />
                          使用后端拼接 (推荐)
                        </button>
                      )}

                      {!clientResult && (
                        <button
                          onClick={startClientStitching}
                          className="w-full bg-white text-[#1D1D1F] border-2 border-black/10 py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98]"
                        >
                          <Smartphone className="w-5 h-5 text-gray-400" />
                          前端本地拼接 (对比用)
                        </button>
                      )}

                      {(result || clientResult) && (
                        <p className="text-center text-xs text-gray-400 mt-2">
                          您可以继续运行另一种模式进行对比
                        </p>
                      )}
                    </div>
                  )}

                  {isProcessing && (
                    <div className="space-y-6">
                      <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-blue-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-gray-500">处理进度</span>
                        <span className="text-blue-600">{progress}%</span>
                      </div>
                      <p className="text-center text-gray-400 text-sm animate-pulse">
                        正在分析视频帧并计算重叠区域...
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 border border-red-100">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {result && (
                    <div className="space-y-6">
                      <div className="p-4 bg-green-50 text-green-700 rounded-2xl flex items-center gap-3 border border-green-100">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <p className="text-sm font-medium">拼接成功！已生成长截图。</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-2xl border border-black/5">
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">宽度</p>
                          <p className="text-xl font-bold">{result.width}px</p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-2xl border border-black/5">
                          <p className="text-xs text-gray-400 uppercase font-bold mb-1">高度</p>
                          <p className="text-xl font-bold">{result.height}px</p>
                        </div>
                      </div>

                      <a
                        href={result.imageUrl}
                        download={`stitch-tailor-${Date.now()}.png`}
                        className="w-full bg-blue-600 text-white py-5 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/20"
                      >
                        <Download className="w-6 h-6" />
                        保存到相册
                      </a>
                    </div>
                  )}
                </div>

                <AnimatePresence>
                  {(result || clientResult) && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-black/5 overflow-hidden"
                    >
                      <p className="text-sm font-medium text-gray-500 mb-6 px-4 uppercase tracking-wider">结果对比</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result && (
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">SERVER OUTPUT</p>
                            <div className="max-h-[600px] overflow-y-auto rounded-[1.5rem] border border-black/10 bg-gray-50 scrollbar-hide">
                              <img src={result.imageUrl} alt="Server Result" className="w-full h-auto" />
                            </div>
                          </div>
                        )}
                        {clientResult && (
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full w-fit">CLIENT OUTPUT (BETA)</p>
                            <div className="max-h-[600px] overflow-y-auto rounded-[1.5rem] border border-black/10 bg-gray-50 scrollbar-hide">
                              <img src={clientResult.imageUrl} alt="Client Result" className="w-full h-auto" />
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto p-12 text-center text-gray-400 text-sm">
        <p>© 2026 LooongImg. 由 hellosherwin 精心打造。</p>
        <div className="mt-4 flex items-center justify-center gap-6">
          <a href="#" className="hover:text-blue-600 transition-colors">隐私政策</a>
          <a href="#" className="hover:text-blue-600 transition-colors">使用条款</a>
          <a href="#" className="hover:text-blue-600 transition-colors">反馈建议</a>
        </div>
      </footer>
    </div>
  );
}
