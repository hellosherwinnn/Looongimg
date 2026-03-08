import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { processVideo } from './stitcher';

dotenv.config({ path: ['.env.local', '.env'] });

// --- Global Error Handlers for Stability ---
process.on('uncaughtException', (err) => {
    console.error(' [CRITICAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(' [CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
app.use(cors());
app.use(express.json());

// Serve generated images statically
app.use('/outputs', express.static(path.join(__dirname, 'outputs')));

// Simple heartbeat route for the root
app.get('/', (req, res) => {
    res.send('LooongImg Backend API is running!');
});

// Configure multer for video upload
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
});

app.post('/api/stitch', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided' });
        }

        console.log(`[BACKEND] Received video: ${req.file.originalname} (${req.file.size} bytes)`);

        // We would typically use Server-Sent Events (SSE) or WebSockets for real progress,
        // but for simplicity, we will just await the processing and return the result.
        const result = await processVideo(req.file.path, (progress) => {
            console.log(`[BACKEND] Stitching Progress: ${progress}%`);
        });

        res.json(result);
    } catch (error: any) {
        console.error('[BACKEND] Stitching Error:', error);
        res.status(500).json({ error: 'Stitching failed', details: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});
