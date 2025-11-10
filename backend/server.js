// backend/server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const ollamaImport = require('ollama');

const app = express();
const port = process.env.PORT || 3333;

// Middleware untuk logging semua permintaan masuk
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Menerima permintaan: ${req.method} ${req.url} dari Origin: ${req.headers.origin}`);
  next();
});

// --- KONFIGURASI CORS YANG DISEMPURNAKAN DAN DISEMPURNAKAN ---
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 204 // Standar untuk preflight adalah 204 No Content.
                           // Middleware `cors` akan menangani respons untuk permintaan OPTIONS.
};

// Terapkan middleware CORS untuk SEMUA rute dan SEMUA metode (termasuk OPTIONS).
// Pustaka `cors` akan secara otomatis menangani permintaan preflight OPTIONS.
app.use(cors(corsOptions));
// --- AKHIR KONFIGURASI CORS ---

app.use(express.json()); // Middleware untuk mem-parsing body JSON


const ollama = ollamaImport.default;

if (!ollama || typeof ollama.chat !== 'function') {
    console.error("KESALAHAN KRITIS SAAT STARTUP: Pustaka Ollama tidak termuat dengan benar.");
} else {
    console.log("Pustaka Ollama terdeteksi dan siap digunakan saat startup.");
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
                console.warn(`MyMemory tidak mengembalikan terjemahan valid untuk bagian: ${detailError || JSON.stringify(data)}. Bagian asli dipertahankan.`);
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
                console.warn(`MyMemory tidak mengembalikan terjemahan valid (permintaan tunggal): ${detailError || JSON.stringify(data)}`);
                return textToTranslate; 
            }
        } catch (error) {
            console.error("Error saat menerjemahkan dengan MyMemory (permintaan tunggal):", error.message);
            return textToTranslate; 
        }
    } else {
        return await processTextInChunks(textToTranslate, sourceLang, targetLang, MAX_CHARS_MYMEMORY_FREE);
    }
}


app.post('/api/chat', async (req, res) => {
    console.log(`   [${new Date().toISOString()}] /api/chat POST handler. Body:`, req.body ? JSON.stringify(req.body).substring(0, 100) + '...' : 'No body');
    const { messages } = req.body;
    const qualityModel = "llama3"; // Model yang lebih pintar
    const speedModel = "gemma:2b";   // Model yang lebih cepat

    let rawReplyContent = "";
    let respondedBy = "";
    let primaryAIError = null;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: "Messages array is required." });
    }

    try {
        if (!ollama || typeof ollama.chat !== 'function') { throw new Error("Ollama service not ready."); }
        
        console.log(`   Memulai balapan model: ${qualityModel} vs ${speedModel}...`);
        const ollamaChatMessages = messages.map(m => ({ role: m.role, content: m.content }));

        // Mulai kedua operasi secara bersamaan
        const qualityOperation = ollama.chat({ model: qualityModel, messages: ollamaChatMessages, stream: false });
        const speedOperation = ollama.chat({ model: speedModel, messages: ollamaChatMessages, stream: false });

        // "Lombakan" keduanya!
        const winner = await Promise.race([qualityOperation, speedOperation]);

        if (winner?.message?.content) {
            rawReplyContent = winner.message.content;
            // The response object from ollama.chat includes the model name
            respondedBy = `Ollama (${winner.model})`; 
            console.log(`   Pemenang balapan adalah ${winner.model}:`, rawReplyContent.substring(0, 70) + "...");
        } else {
            throw new Error(`Struktur respons tidak valid dari pemenang balapan.`);
        }

    } catch (error) {
        // Blok ini sekarang akan menangkap jika KEDUA model gagal
        console.error(`   Terjadi error pada kedua model: ${error.message}`);
        primaryAIError = error;
    }

    let textForProcessing = "";
    if (rawReplyContent) { 
        textForProcessing = rawReplyContent; 
    } else if (primaryAIError) { 
        textForProcessing = `Maaf, terjadi masalah dengan AI: ${primaryAIError.message}`; 
        if (respondedBy === "") respondedBy = `Sistem Error (Ollama)`;
    } else { 
        textForProcessing = "Maaf, terjadi kesalahan internal."; 
        if (respondedBy === "") respondedBy = "Sistem Error"; 
    }

    const finalReplyContent = await translateTextWithMyMemory(textForProcessing, 'en', 'id');

    let providerInfo = respondedBy;
    console.log(`   [${new Date().toISOString()}] Mengirim respons untuk /api/chat:`, { role: "assistant", content: finalReplyContent.substring(0,50)+'...', provider: providerInfo });
    res.json({ reply: { role: "assistant", content: finalReplyContent, provider: providerInfo } });
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
