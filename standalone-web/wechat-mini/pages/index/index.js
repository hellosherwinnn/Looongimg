// index.js
Page({
    data: {
        videoPath: null,
        isProcessing: false,
        progress: 0,
        resultImage: null
    },

    chooseVideo() {
        wx.chooseMedia({
            count: 1,
            mediaType: ['video'],
            sourceType: ['album'],
            success: (res) => {
                const tempFilePath = res.tempFiles[0].tempFilePath;
                this.setData({
                    videoPath: tempFilePath,
                    resultImage: null,
                    progress: 0
                });
            }
        });
    },

    startStitching() {
        if (!this.data.videoPath) return;

        this.setData({ isProcessing: true, progress: 0 });

        wx.showToast({
            title: '由于微信限制，小程序端长截图算法需适配 VideoDecode',
            icon: 'none',
            duration: 3000
        });

        // 微信小程序特有 API 调用逻辑概述:
        // 1. wx.createVideoDecoder 提取视频帧数据
        // 2. 利用 wx.createOffscreenCanvas 构建后台画布
        // 3. 执行类似 React 端的特征匹配 (Feature Matching)
        // 4. wx.canvasToTempFilePath 导出最终长图

        setTimeout(() => {
            this.setData({
                isProcessing: false,
                progress: 100,
                resultImage: '/images/placeholder.png' // Needs replacing with actual generated temp path
            });
        }, 2000);
    },

    saveImage() {
        if (!this.data.resultImage) return;
        wx.saveImageToPhotosAlbum({
            filePath: this.data.resultImage,
            success: () => {
                wx.showToast({ title: '保存成功' });
            },
            fail: (err) => {
                console.error(err);
                wx.showToast({ title: '保存失败', icon: 'error' });
            }
        });
    }
})
