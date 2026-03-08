import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

async function run() {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Expose a function to Node.js to log our debug info
    await page.exposeFunction('logDebug', (msg) => {
        console.log('[BROWSER]', msg);
    });

    // We need to inject some logging into App.tsx to see what's happening
    // before we run this. Wait, we can evaluate on the page.

    console.log('Navigating to http://localhost:3000');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    console.log('Selecting video file...');
    const fileInput = await page.$('input[type="file"]');
    const videoPath = path.resolve(__dirname, '微信视频2026-03-03_153657_550.mp4');
    await fileInput.uploadFile(videoPath);

    // Wait for the video to load and the start button to appear
    console.log('Waiting for start button...');
    await page.waitForSelector('button:has-text("开始自动拼接")', { timeout: 10000 });

    // Optional: override the components console.log directly in browser if we inject something

    console.log('Clicking start...');
    const buttons = await page.$$('button');
    for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        if (text?.includes('开始自动拼接')) {
            await btn.click();
            break;
        }
    }

    console.log('Waiting for stitching to complete...');
    await page.waitForSelector('p:has-text("拼接成功！已生成长截图。")', { timeout: 60000 });

    console.log('Stitching completed. Grabbing the final image...');
    const imgHandle = await page.$('img[alt="Stitched Result"]');
    const src = await page.evaluate(img => img.src, imgHandle);

    // Save the image
    const response = await page.goto(src);
    const buffer = await response.buffer();
    fs.writeFileSync('debug_output.png', buffer);
    console.log('Saved debug_output.png');

    await browser.close();
}

run().catch(console.error);
