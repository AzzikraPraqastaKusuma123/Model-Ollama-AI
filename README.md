# Nova AI Assistant 

Sebuah asisten obrolan AI yang mengutamakan suara, menampilkan arsitektur AI "dual-brain" yang unik yang memanfaatkan kekuatan model lokal **Ollama** dan **Google Gemini** berbasis cloud.
---

## ✨ Fitur Utama

- **Interaksi Berbasis Suara**: Aktifkan asisten dengan kata bangun "Nova" dan berbicaralah secara alami.
- **Pengenalan & Sintesis Ucapan Real-time**: Transkripsi ucapan-ke-teks (STT) dan teks-ke-ucapan (TTS) yang lancar dalam Bahasa Indonesia.
- **Visualisator Gelombang Suara Dinamis**: Antarmuka yang menarik secara visual merespons baik saat mendengarkan (input mikrofon) maupun saat berbicara (output AI).
- **Backend AI Hibrida**: Sistem "perlombaan model" yang inovatif mengirimkan prompt ke Ollama dan Gemini secara bersamaan, menggunakan respons tercepat untuk latensi minimal.
- **Lapisan Terjemahan Otomatis**: Respons dari model AI (yang mungkin dalam bahasa Inggris) secara otomatis diterjemahkan ke dalam Bahasa Indonesia yang alami.
- **Penampil Log Langsung**: Panel terintegrasi di frontend untuk memantau log backend secara real-time untuk kemudahan debugging.
- **Tumpukan Teknologi Modern**: Dibangun dengan React, TypeScript, dan Vite di frontend, dengan backend Node.js/Express yang andal.

## 🛠️ Tumpukan Teknologi

- **Frontend**: React, TypeScript, Vite, CSS Modules, Web Speech API (STT/TTS)
- **Backend**: Node.js, Express.js
- **Model AI**:
    - **Lokal**: Ollama (dikonfigurasi untuk `gemma:2b`)
    - **Cloud**: Google Gemini (misalnya, `gemini-2.0-flash`)
- **Layanan Pihak Ketiga**: API MyMemory untuk terjemahan bahasa.

## 🚀 Memulai

### Prasyarat

1.  **Node.js**: Versi 18 atau lebih tinggi.
2.  **NPM**: Biasanya terinstal bersama Node.js.
3.  **Ollama**: Pastikan Ollama terinstal dan berjalan.
    - Tarik model yang diperlukan: `ollama pull gemma:2b`
4.  **Kunci API Gemini**: Dapatkan kunci API dari [Google AI Studio](https://aistudio.google.com/app/apikey).

### ⚙️ Penyiapan Backend

1.  **Navigasi ke direktori backend**:
    ```bash
    cd backend
    ```

2.  **Buat file `.env`**:
    Salin `.env.example` menjadi file baru bernama `.env` dan isi nilainya.
    ```bash
    cp .env.example .env
    ```
    - Buka file `.env` dan tambahkan Kunci API Gemini Anda.

3.  **Instal dependensi**:
    ```bash
    npm install
    ```

4.  **Jalankan server backend**:
    ```bash
    node server.js
    ```
    Server akan berjalan di `http://localhost:3333` (atau port yang dikonfigurasi di `.env`).

### 🖥️ Penyiapan Frontend

1.  **Buka terminal baru** dan navigasi ke direktori frontend:
    ```bash
    cd frontend
    ```

2.  **Instal dependensi**:
    ```bash
    npm install
    ```

3.  **Jalankan server pengembangan frontend**:
    ```bash
    npm run dev
    ```

4.  **Buka Aplikasi**:
    Buka browser Anda dan navigasikan ke URL yang ditampilkan di terminal (biasanya `http://localhost:5173` atau serupa). Berikan izin mikrofon saat diminta.

## 🎤 Cara Menggunakan

1.  **Aktifkan Asisten**: Ucapkan kata "Nova". Visualisator akan berubah, dan asisten akan memutar suara singkat untuk menunjukkan bahwa ia sedang mendengarkan.
2.  **Berikan Perintah Anda**: Ajukan pertanyaan atau berikan perintah Anda dengan jelas.
3.  **Dengarkan & Lihat**: Asisten akan memproses permintaan Anda, dan Anda akan mendengar respons yang diucapkan sambil melihat pesan muncul di antarmuka obrolan.
4.  **Ketik (Opsional)**: Anda juga dapat mengetik pesan Anda di kotak input seperti aplikasi obrolan pada umumnya.
