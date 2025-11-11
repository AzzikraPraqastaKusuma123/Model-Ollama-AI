// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const ollamaImport = require('ollama');

const app = express();
const port = process.env.PORT || 3333;

const MAX_LOG_ENTRIES = 100;
const logBuffer = [];

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Custom logger to capture logs
function customLogger(level, ...args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                return JSON.stringify(arg);
            } catch (e) {
                return String(arg); // Fallback for circular structures
            }
        }
        return String(arg);
    }).join(' ');

    const logEntry = { timestamp, level, message };
    logBuffer.push(logEntry);

    if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer.shift(); // Remove oldest entry
    }

    // Call original console method
    if (level === 'error') {
        originalConsoleError.apply(console, args);
    } else if (level === 'warn') {
        originalConsoleWarn.apply(console, args);
    } else {
        originalConsoleLog.apply(console, args);
    }
}

// Override console methods
console.log = (...args) => customLogger('info', ...args);
console.error = (...args) => customLogger('error', ...args);
console.warn = (...args) => customLogger('warn', ...args);


// Middleware untuk logging semua permintaan masuk
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Menerima permintaan: ${req.method} ${req.url} dari Origin: ${req.headers.origin}`);
  next();
});

// --- KONFIGURASI CORS YANG DISEMPURNAKAN DAN DISEMPERNAKAN ---
const corsOptions = {
  origin: 'http://localhost:8080', // Mengizinkan asal frontend secara eksplisit
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204
};

// Terapkan middleware CORS untuk SEMUA rute dan SEMUA metode (termasuk OPTIONS).
// Pustaka `cors` akan secara otomatis menangani respons untuk permintaan OPTIONS.
app.use(cors(corsOptions));
// --- AKHIR KONFIGURASI CORS ---

app.use(express.json()); // Middleware untuk mem-parsing body JSON

const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // Ambil API Key Gemini dari .env
const ollama = ollamaImport.default;

if (!ollama || typeof ollama.chat !== 'function') {
    console.error("KESALAHAN KRITIS SAAT STARTUP: Pustaka Ollama tidak termuat dengan benar.");
} else {
    console.log("Pustaka Ollama terdeteksi dan siap digunakan saat startup.");
}

// Fungsi untuk memanggil Gemini API
async function callGeminiAPI(messages, apiKey) {
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY tidak ditemukan di environment variables.");
    }

    // Format pesan untuk Gemini API
    // Gemini API mengharapkan peran user/model bergantian.
    // Pesan pertama harus selalu dari 'user'.
    let formattedMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    // Tambahkan instruksi sistem sebagai pesan pertama dari 'user'
    const systemInstruction = "Anda adalah asisten AI yang membantu dan ramah. Jawablah dengan jelas, ringkas, dan dalam Bahasa Indonesia yang alami. Hindari menyebutkan tanda baca secara eksplisit. Gunakan tanda baca untuk jeda dan intonasi yang tepat.";
    formattedMessages.unshift({
        role: 'user',
        parts: [{ text: systemInstruction }]
    });
    // Tambahkan respons model dummy untuk menjaga peran bergantian setelah instruksi sistem
    formattedMessages.unshift({
        role: 'model',
        parts: [{ text: "Baik, saya akan menjawab pertanyaan Anda sebagai asisten AI yang membantu dan ramah dalam Bahasa Indonesia." }]
    });


    // Pastikan pesan terakhir dari 'user' untuk memicu generasi
    // Jika pesan terakhir dari 'model', tambahkan pesan user dummy
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'model') {
        formattedMessages.push({
            role: 'user',
            parts: [{ text: "Lanjutkan percakapan." }] // Pesan dummy untuk memicu generasi
        });
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: formattedMessages, // Kirim semua pesan yang sudah diformat
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 1024,
                },
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Gemini API error: ${response.status} - ${errorBody.error?.message || JSON.stringify(errorBody)}`);
        }

        const data = await response.json();
        const geminiContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!geminiContent) {
            throw new Error("Struktur respons Gemini tidak valid atau tidak ada konten.");
        }

        return { message: { content: geminiContent }, model: "Gemini-2.0-Flash" };

    } catch (error) {
        console.error("Error saat memanggil Gemini API:", error.message);
        throw error;
    }
}


async function processTextInChunks(text, sourceLang, targetLang, maxChunkLength) {
    const translatedParts = [];
    let remainingText = text;
    if (text.length > maxChunkLength) {
        console.log(`Menerjemahkan teks panjang (${text.length} chars) dalam beberapa bagian...`);
    }

    while (remainingText.length > 0) {
        let chunkToSend;
        if (remainingText.length <= maxChunkLength) {
            chunkToSend = remainingText;
            remainingText = "";
        } else {
            let splitPoint = remainingText.lastIndexOf(' ', maxChunkLength);
            if (splitPoint === -1 || splitPoint === 0) { 
                splitPoint = maxChunkLength;
            }
            chunkToSend = remainingText.substring(0, splitPoint);
            remainingText = remainingText.substring(splitPoint).trimStart(); 
        }

        if (chunkToSend.trim() === '') continue;

        try {
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunkToSend)}&langpair=${sourceLang}|${targetLang}`;
            const response = await fetch(myMemoryUrl);

            if (!response.ok) {
                const errorText = await response.text();
                console.warn(`MyMemory API error untuk bagian: ${response.status} ${response.statusText} - ${errorText}. Bagian asli dipertahankan.`);
                translatedParts.push(chunkToSend); 
                continue;
            }
            const data = await response.json();
            const translatedChunk = data.responseData?.translatedText;
            const detailError = data.responseData?.responseDetails || data.responseDetails;

            if (translatedChunk && typeof translatedChunk === 'string' && !translatedChunk.toUpperCase().includes("QUERY LENGTH LIMIT EXCEEDED") && !translatedChunk.toUpperCase().includes("INVALID")) {
                translatedParts.push(translatedChunk);
            } else if (data.matches?.[0]?.translation) { 
                 translatedParts.push(data.matches[0].translation);
            } else {
                console.warn(`MyMemory tidak mengembalikan terjemahan valid untuk bagian: ${detailError || JSON.stringify(data)}. Menggunakan teks asli.`);
                translatedParts.push(chunkToSend); 
            }
        } catch (chunkError) {
            console.error(`Error saat menerjemahkan bagian: ${chunkError.message}. Bagian asli dipertahankan.`);
            translatedParts.push(chunkToSend); 
        }
    }
    if (text.length > maxChunkLength) {
        console.log("Semua bagian selesai diproses.");
    }
    return translatedParts.join(" ").trim(); 
}

async function translateTextWithMyMemory(textToTranslate, sourceLang = 'en', targetLang = 'id') {
    if (!textToTranslate || typeof textToTranslate !== 'string' || textToTranslate.trim() === '') return textToTranslate;

    const MAX_CHARS_MYMEMORY_FREE = 480; 

    if (textToTranslate.length <= MAX_CHARS_MYMEMORY_FREE) {
        try {
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(textToTranslate)}&langpair=${sourceLang}|${targetLang}`;
            const response = await fetch(myMemoryUrl);
            if (!response.ok) {
                 const errorText = await response.text(); 
                 throw new Error(`MyMemory API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const data = await response.json();
            const translatedText = data.responseData?.translatedText;
            const detailError = data.responseData?.responseDetails || data.responseDetails;

            if (translatedText && typeof translatedText === 'string' && !translatedText.toUpperCase().includes("QUERY LENGTH LIMIT EXCEEDED") && !translatedText.toUpperCase().includes("INVALID")) {
                return translatedText;
            } else if (data.matches?.[0]?.translation) { 
                return data.matches[0].translation;
            } else {
                console.warn(`MyMemory tidak mengembalikan terjemahan valid (permintaan tunggal): ${detailError || JSON.stringify(data)}. Menggunakan teks asli.`);
                return textToTranslate; 
            }
        } catch (error) {
            if (error.message.includes("429 Too Many Requests")) {
                console.warn("MyMemory API: Kuota terjemahan gratis harian telah habis. Silakan coba lagi besok atau kunjungi MyMemory untuk opsi berbayar.");
            } else {
                console.error("Error saat menerjemahkan dengan MyMemory (permintaan tunggal):", error.message);
            }
            return textToTranslate; 
        }
    } else {
        return await processTextInChunks(textToTranslate, sourceLang, targetLang, MAX_CHARS_MYMEMORY_FREE);
    }
}


app.post('/api/keyword-detect', (req, res) => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required in the request body." });
    }

    const lowerCaseText = text.toLowerCase();
    let novaResponding = false;

    if (lowerCaseText.includes('nova off')) {
        novaResponding = false;
        console.log('Keyword detected: "nova off". Nova responding set to FALSE.');
    } else if (lowerCaseText.includes('nova')) {
        novaResponding = true;
        console.log('Keyword detected: "nova". Nova responding set to TRUE.');
    }

    res.json({ novaResponding });
});

app.post('/api/chat', async (req, res) => {
    console.log(`[${new Date().toISOString()}] /api/chat POST handler (STREAMING)`);
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Flush the headers to establish the connection

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY tidak ditemukan di environment variables.");
        }

        // --- Format messages for Gemini ---
        let formattedMessages = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        const systemInstruction = "Anda adalah asisten AI yang membantu dan ramah. Jawablah dengan jelas, ringkas, dan dalam Bahasa Indonesia yang alami. Hindari menyebutkan tanda baca secara eksplisit. Gunakan tanda baca untuk jeda dan intonasi yang tepat.";
        formattedMessages.unshift({
            role: 'user',
            parts: [{ text: systemInstruction }]
        });
        formattedMessages.unshift({
            role: 'model',
            parts: [{ text: "Baik, saya akan menjawab pertanyaan Anda sebagai asisten AI yang membantu dan ramah dalam Bahasa Indonesia." }]
        });
        if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === 'model') {
            formattedMessages.push({
                role: 'user',
                parts: [{ text: "Lanjutkan percakapan." }]
            });
        }
        // --- End of formatting ---

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:streamGenerateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: formattedMessages,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.9,
                    topK: 40,
                    maxOutputTokens: 2048,
                },
            }),
        });

        if (!response.ok || !response.body) {
            const errorBody = await response.json().catch(() => ({ error: { message: "Failed to parse error response" } }));
            throw new Error(`Gemini API error: ${response.status} - ${errorBody.error?.message || JSON.stringify(errorBody)}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('   Stream selesai dari Gemini.');
                break;
            }

            buffer += decoder.decode(value, { stream: true });
            
            // The response is a stream of JSON objects, sometimes multiple in one chunk
            // We need to handle this by finding the boundaries of each JSON object
            let boundary;
            while ((boundary = buffer.indexOf('\n')) !== -1) {
                const chunk = buffer.substring(0, boundary).trim();
                buffer = buffer.substring(boundary + 1);

                if (chunk.startsWith('data:')) {
                    const jsonStr = chunk.substring(5).trim();
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (textChunk) {
                            const eventData = {
                                type: 'chunk',
                                content: textChunk,
                                provider: 'Gemini-1.5-Flash'
                            };
                            res.write(`data: ${JSON.stringify(eventData)}\n\n`);
                        }
                    } catch (e) {
                        console.warn('   Gagal mem-parsing JSON dari stream chunk:', jsonStr);
                    }
                }
            }
        }

    } catch (error) {
        console.error(`   Error selama streaming dari Gemini: ${error.message}`);
        const errorData = {
            type: 'error',
            content: `Maaf, terjadi masalah dengan AI: ${error.message}`
        };
        res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    } finally {
        // Send a final event to signal the end of the stream
        const endData = { type: 'end', provider: 'Gemini-1.5-Flash' };
        res.write(`data: ${JSON.stringify(endData)}\n\n`);
        res.end();
        console.log('   Koneksi stream ditutup.');
    }
});

app.get('/api/logs', (req, res) => {
    res.json(logBuffer);
});

app.get('/', (req, res) => { res.send('Chat backend siap!'); });

app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Terjadi error tidak tertangani: ${err.message}`);
  console.error(err.stack);
  if (!res.headersSent) { 
    res.status(500).send('Terjadi kesalahan pada server!');
  }
});

app.listen(port, '0.0.0.0', () => { console.log(`Backend listening di port ${port}`); });
