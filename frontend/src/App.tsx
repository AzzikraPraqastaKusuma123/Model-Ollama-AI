import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCard } from "./components/MessageCard";
import styles from './App.module.css';

// Definisi Global Type untuk Web Speech API
// Ini diperlukan karena Web Speech API mungkin belum sepenuhnya distandarisasi di semua lingkungan TypeScript.
interface SpeechRecognitionEventMap {
    "audiostart": Event; "audioend": Event; "end": Event; "error": SpeechRecognitionErrorEvent;
    "nomatch": SpeechRecognitionEvent; "result": SpeechRecognitionEvent; "soundstart": Event;
    "soundend": Event; "speechstart": Event; "speechend": Event; "start": Event;
}
interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    serviceURI: string;
    start(): void;
    stop(): void;
    abort(): void;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
    onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
    addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
    removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}
interface SpeechRecognitionStatic {
    new(): SpeechRecognition;
}
declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic;
        webkitSpeechRecognition: SpeechRecognitionStatic;
        AudioContext: typeof AudioContext;
        webkitAudioContext: typeof AudioContext;
    }
    interface SpeechGrammarList {
        readonly length: number;
        item(index: number): SpeechGrammar;
        addFromURI(src: string, weight?: number): void;
        addFromString(string: string, weight?: number): void;
        [index: number]: SpeechGrammar;
    }
    interface SpeechGrammar {
        src: string;
        weight: number;
    }
    interface SpeechRecognitionResult {
        readonly length: number;
        item(index: number): SpeechRecognitionAlternative;
        readonly isFinal: boolean;
        [index: number]: SpeechRecognitionResult;
    }
    interface SpeechRecognitionAlternative {
        readonly transcript: string;
        readonly confidence: number;
    }
    interface SpeechRecognitionResultList {
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }
    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }
    type SpeechRecognitionErrorCode =
        | "no-speech"
        | "aborted"
        | "audio-capture"
        | "network"
        | "not-allowed"
        | "service-not-allowed"
        | "bad-grammar"
        | "language-not-supported";
    interface SpeechRecognitionErrorEvent extends Event {
        readonly error: SpeechRecognitionErrorCode;
        readonly message: string;
    }
}


// Tipe untuk pesan dalam chat
type Message = {
    role: "assistant" | "user";
    content: string;
    timestamp: string;
    provider?: string;
    audioData?: any; // Untuk data audio TTS jika ada
};

// Komponen Ikon
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 18.75a6 6 0 0 0 6-6v-1.5a6 6 0 0 0-12 0v1.5a6 6 0 0 0 6 6Z" />
        <path d="M12 22.5A8.25 8.25 0 0 0 20.25 14.25v-1.5a8.25 8.25 0 0 0-16.5 0v1.5A8.25 8.25 0 0 0 12 22.5Z" />
        <path d="M15.75 6.75a.75.75 0 0 0-1.5 0v1.659a4.504 4.504 0 0 0-2.25-1.106A4.504 4.504 0 0 0 9.75 8.409V6.75a.75.75 0 0 0-1.5 0v4.019a.75.75 0 0 0 1.085.693A3.001 3.001 0 0 1 12 10.5a2.999 2.999 0 0 1 2.665 1.462.75.75 0 0 0 1.085-.693V6.75Z" />
    </svg>
);

// Komponen VoiceWaveform (untuk STT)
interface VoiceWaveformProps {
    analyserNode: AnalyserNode | null;
    isListening: boolean;
    width?: number;
    height?: number;
}
const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
    analyserNode, isListening, width = 280, height = 120,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    const baseWidthForScaling = 150;
    const NUM_BARS = width < baseWidthForScaling ? 46 : 90;
    const CENTER_ORB_MIN_RADIUS = width < baseWidthForScaling ? (height * 0.1) : (height * 0.15);
    const CENTER_ORB_MAX_RADIUS = width < baseWidthForScaling ? (height * 0.18) : (height * 0.22);
    const RING_RADIUS = width < baseWidthForScaling ? (height * 0.25) : (height * 0.35);
    const MAX_BAR_LENGTH = width < baseWidthForScaling ? (height * 0.3) : (height * 0.4);
    const BAR_WIDTH = Math.max(1.5, Math.min(3.5, width * 0.02));
    const BAR_COLORS = ['#67E8F9', '#4FD1C5', '#A7F3D0', '#3B82F6', '#818CF8', '#A5B4FC'];
    const CENTER_MAIN_COLOR = 'rgba(150, 230, 255, 0.9)';
    const CENTER_GLOW_COLOR = 'rgba(150, 230, 255, 0.25)';

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!isListening || !analyserNode || !canvas) {
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            if (canvas) { const ctx = canvas.getContext('2d'); ctx?.clearRect(0, 0, canvas.width, canvas.height); }
            return;
        }
        const context = canvas.getContext('2d'); if (!context) return;
        
        analyserNode.fftSize = 256; 
        analyserNode.smoothingTimeConstant = 0.75; 
        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            analyserNode.getByteFrequencyData(dataArray);
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            let avgVol = 0;
            for(let k=0; k < bufferLength; k++) avgVol += dataArray[k];
            avgVol = (avgVol / bufferLength) / 255; 
            avgVol = Math.min(avgVol * 2.5, 1); 

            const orbR = CENTER_ORB_MIN_RADIUS + (CENTER_ORB_MAX_RADIUS - CENTER_ORB_MIN_RADIUS) * avgVol;
            context.save();
            context.shadowBlur = width < baseWidthForScaling ? 18 : 35;
            context.shadowColor = CENTER_GLOW_COLOR;
            context.fillStyle = CENTER_MAIN_COLOR;
            context.beginPath(); context.arc(centerX, centerY, orbR, 0, 2 * Math.PI); context.fill();
            context.restore();
            
            context.lineWidth = BAR_WIDTH;
            context.lineCap = 'round';

            const halfNumBars = Math.floor(NUM_BARS / 2);

            for (let i = 0; i < NUM_BARS; i++) {
                const angle = (i / NUM_BARS) * 2 * Math.PI - Math.PI / 2;

                let barPosIndex = i;
                if (NUM_BARS > 0 && halfNumBars > 0 && i >= halfNumBars) {
                    barPosIndex = (NUM_BARS - 1) - i; 
                }
                
                const normalizedPos = halfNumBars > 0 ? (barPosIndex % halfNumBars) / halfNumBars : 0;
                const dataIdx = Math.min(bufferLength - 1, Math.floor(Math.pow(normalizedPos, 0.75) * (bufferLength * 0.85)));

                const barVal = dataArray[dataIdx] / 255.0;
                const barLenFactor = 0.4 + avgVol * 0.6; 
                const barLen = (BAR_WIDTH / 2) + barVal * MAX_BAR_LENGTH * barLenFactor;
                
                if (barLen <= (BAR_WIDTH / 2)) continue;

                const sX = centerX + RING_RADIUS * Math.cos(angle);
                const sY = centerY + RING_RADIUS * Math.sin(angle);
                const eX = centerX + (RING_RADIUS + barLen) * Math.cos(angle);
                const eY = centerY + (RING_RADIUS + barLen) * Math.sin(angle);
                
                context.strokeStyle = BAR_COLORS[i % BAR_COLORS.length];
                context.globalAlpha = 0.6 + barVal * 0.4; 
                context.beginPath(); context.moveTo(sX, sY); context.lineTo(eX, eY); context.stroke();
            }
            context.globalAlpha = 1.0;
        };
        draw();
        return () => {
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
        };
    }, [isListening, analyserNode, width, height, NUM_BARS, CENTER_ORB_MIN_RADIUS, CENTER_ORB_MAX_RADIUS, RING_RADIUS, MAX_BAR_LENGTH, BAR_WIDTH, BAR_COLORS, CENTER_MAIN_COLOR, CENTER_GLOW_COLOR, baseWidthForScaling]);
    return <canvas ref={canvasRef} width={width} height={height} className={styles.voiceWaveformCanvasRadial} />;
};

// Komponen RadialPulseWaveform (untuk TTS di header)
interface RadialPulseWaveformProps {
    isActive: boolean;
    width?: number;
    height?: number;
    colorScheme?: 'vibrant' | 'subtle';
}
const RadialPulseWaveform: React.FC<RadialPulseWaveformProps> = ({
    isActive, width = 100, height = 30, colorScheme = 'vibrant'
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    const BAR_COUNT = 20;
    const BAR_SPACING = 2;
    const BAR_WIDTH = 2;

    const getColors = (scheme: string) => {
        if (scheme === 'subtle') {
            return {
                base: 'rgba(100, 100, 100, 0.3)',
                active: 'rgba(150, 150, 150, 0.6)',
            };
        }
        return {
            base: 'rgba(74, 222, 128, 0.4)', // emerald-400
            active: 'rgba(52, 211, 153, 0.8)', // emerald-500
        };
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const colors = getColors(colorScheme);

        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            context.clearRect(0, 0, width, height);

            if (isActive && analyserNodeRef.current && dataArrayRef.current) {
                analyserNodeRef.current.getByteFrequencyData(dataArrayRef.current);
                const dataArray = dataArrayRef.current;
                const bufferLength = analyserNodeRef.current.frequencyBinCount;

                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                const maxBarHeight = height * 0.8;
                const minBarHeight = height * 0.1;

                for (let i = 0; i < BAR_COUNT; i++) {
                    const x = i * (BAR_WIDTH + BAR_SPACING);
                    const normalizedIndex = Math.floor((i / BAR_COUNT) * bufferLength);
                    const barHeight = Math.max(minBarHeight, (dataArray[normalizedIndex] / 255) * maxBarHeight);
                    const y = (height - barHeight) / 2;

                    context.fillStyle = colors.active;
                    context.fillRect(x, y, BAR_WIDTH, barHeight);
                }
            } else {
                // Draw static bars when inactive or no audio data
                const staticBarHeight = height * 0.2;
                const staticY = (height - staticBarHeight) / 2;
                for (let i = 0; i < BAR_COUNT; i++) {
                    const x = i * (BAR_WIDTH + BAR_SPACING);
                    context.fillStyle = colors.base;
                    context.fillRect(x, staticY, BAR_WIDTH, staticBarHeight);
                }
            }
        };

        draw();

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
        };
    }, [isActive, width, height, colorScheme]);

    // Initialize AudioContext and AnalyserNode if not already done
    useEffect(() => {
        if (isActive && !audioContextRef.current) {
            try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                analyserNodeRef.current = audioContextRef.current.createAnalyser();
                analyserNodeRef.current.fftSize = 256;
                dataArrayRef.current = new Uint8Array(analyserNodeRef.current.frequencyBinCount);

                // Connect to a dummy source or global audio output if needed for visualization
                // For TTS, this would typically connect to the output of the SpeechSynthesisUtterance
                // or an HTMLAudioElement playing the TTS audio.
                // For now, it will just show static bars if no audio is actively connected.
            } catch (e) {
                console.error("Failed to initialize AudioContext for RadialPulseWaveform:", e);
            }
        }
    }, [isActive]);


    return <canvas ref={canvasRef} width={width} height={height} />;
};


const getCurrentTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
};

function App() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Halo! Saya Asisten AI Anda. Ada yang bisa dibantu?", timestamp: getCurrentTimestamp(), provider: "Sistem" },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSpeakingTTSBrowser, setIsSpeakingTTSBrowser] = useState<boolean>(false);
    const [isPlayingTTSFromElement, setIsPlayingTTSFromElement] = useState<boolean>(false);

    const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const textareaRef = useRef<null | HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const sttMediaStreamRef = useRef<MediaStream | null>(null);
    const sttMediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sttAnalyserNodeRef = useRef<AnalyserNode | null>(null);
    const ttsAudioElementSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const ttsAudioElementAnalyserNodeRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    
    // --- REFS FOR AUTO-SUBMIT ---
    const autoSubmitTimerRef = useRef<number | null>(null);
    // Ref to hold the latest handleSubmit function to avoid stale closures in timers
    const handleSubmitRef = useRef<((e?: React.FormEvent) => Promise<void>) | null>(null);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const autoGrowTextarea = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            const scrollHeight = textareaRef.current.scrollHeight;
            const maxHeightStyle = window.getComputedStyle(textareaRef.current).getPropertyValue('max-height');
            const maxHeight = maxHeightStyle.endsWith('px') ? parseInt(maxHeightStyle, 10) : 150;
            textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
        }
    }, []);

    const ensureAudioContext = useCallback(async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Resume context if it's suspended (e.g., after user interaction)
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const playSound = useCallback(async (dataOrText: string | any) => {
        const textToSpeak = typeof dataOrText === 'string' ? dataOrText : dataOrText.content;
        if (!textToSpeak) return;

        // Stop any ongoing browser TTS
        if (typeof speechSynthesis !== 'undefined') {
            speechSynthesis.cancel();
        }
        setIsSpeakingTTSBrowser(true);

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'id-ID'; // Set language to Indonesian

        // Try to find an Indonesian voice
        const voices = window.speechSynthesis.getVoices();
        const indonesianVoice = voices.find(voice => voice.lang === 'id-ID');
        if (indonesianVoice) {
            utterance.voice = indonesianVoice;
        } else {
            console.warn("Indonesian voice not found, using default.");
        }

        utterance.onend = () => {
            setIsSpeakingTTSBrowser(false);
            console.log("Browser TTS finished speaking.");
        };
        utterance.onerror = (event) => {
            setIsSpeakingTTSBrowser(false);
            console.error("Browser TTS error:", event.error);
        };

        window.speechSynthesis.speak(utterance);

        // Connect AnalyserNode for TTS waveform visualization
        const audioContext = await ensureAudioContext();
        if (audioContext && !ttsAudioElementSourceRef.current) {
            // This part is tricky with window.speechSynthesis as it doesn't expose an audio source node directly.
            // The RadialPulseWaveform for TTS in the header will show static bars or react to other audio.
            // For actual TTS visualization, a different approach (e.g., using a Web Audio API based TTS library) is needed.
            // For now, we'll just rely on the isActive prop to show some animation.
        }

    }, [ensureAudioContext]);

    useEffect(() => {
        // Load voices when component mounts
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        // Some browsers load voices asynchronously
        if (typeof window.speechSynthesis !== 'undefined') {
            if (window.speechSynthesis.getVoices().length > 0) {
                loadVoices();
            } else {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
    useEffect(() => { autoGrowTextarea(); }, [input, autoGrowTextarea]);

    // --- MODIFIED HANDLESUBMIT ---
    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
            autoSubmitTimerRef.current = null;
        }

        const trimmedInput = input.trim();
        if (trimmedInput && !isLoading) {
            if (isListening && recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch(e){}
            }

            const newMessage: Message = { role: "user", content: trimmedInput, timestamp: getCurrentTimestamp() };
            setMessages((prevMessages) => [...prevMessages, newMessage]);
            setInput("");
            if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
            
            setIsLoading(true);
            setError(null);
            
            const currentMessagesContext = [...messages, newMessage];
            const finalMessagesForApi = currentMessagesContext.slice(Math.max(0, currentMessagesContext.length - 6)).map(m => ({ role: m.role, content: m.content }));

            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333/api/chat";
                const response = await fetch(backendUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: finalMessagesForApi }), });
                
                if (!response.ok) {
                    let errData = { error: `HTTP error! status: ${response.status} ${response.statusText}` };
                    try { const errorBody = await response.json(); errData.error = errorBody.error || (errorBody.reply?.content) || errData.error; } catch (parseError) { /* ignore */ }
                    throw new Error(errData.error);
                }
                const data = await response.json();
                if (data.reply && data.reply.content) {
                    const newAssistantMessage: Message = { role: "assistant", content: data.reply.content, timestamp: getCurrentTimestamp(), provider: data.reply.provider };
                    setMessages((prevMessages) => [...prevMessages, newAssistantMessage]);
                    await playSound(newAssistantMessage.content);
                } else { throw new Error("Struktur respons dari server tidak valid."); }
            } catch (err: any) {
                const errorMessageText = err.message || "Gagal mendapatkan respons dari server.";
                console.error("Submit Error:", err);
                setError(errorMessageText);
                const assistantErrorMessage: Message = { role: "assistant", content: `Error: ${errorMessageText}`, timestamp: getCurrentTimestamp(), provider: "Sistem Error" };
                setMessages((prevMessages) => [...prevMessages, assistantErrorMessage]);
                await playSound(`Terjadi kesalahan: ${errorMessageText}`);
            } finally {
                setIsLoading(false);
            }
        }
    }, [input, isLoading, isListening, messages, playSound]);

    // Keep the ref updated with the latest handleSubmit function
    useEffect(() => {
        handleSubmitRef.current = handleSubmit;
    }, [handleSubmit]);

    // --- MODIFIED SPEECH RECOGNITION EFFECT ---
    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            console.warn("Browser tidak mendukung Web Speech API (STT).");
            return;
        }
        
        const recognitionInstance: SpeechRecognition = new SpeechRecognitionAPI();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = true;
        recognitionInstance.lang = 'id-ID';
        
        recognitionInstance.onstart = () => {
            console.log("STT dimulai.");
            setError(null);
            if (isSpeakingTTSBrowser && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
            if (isPlayingTTSFromElement && audioPlayerRef.current) audioPlayerRef.current.pause();
        };
        recognitionInstance.onend = () => {
            console.log("STT berakhir.");
            setIsListening(false);
            if (autoSubmitTimerRef.current) {
                clearTimeout(autoSubmitTimerRef.current);
                autoSubmitTimerRef.current = null;
            }
        };
        recognitionInstance.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error:', event.error, event.message);
            let userMessage = `Error STT: ${event.error}.`;
            if (event.error === 'not-allowed' || event.error === 'service-not-allowed') userMessage = 'Akses mikrofon tidak diizinkan. Periksa izin browser Anda.';
            else if (event.error === 'no-speech' && isListening) userMessage = "Tidak ada suara terdeteksi. Coba lagi.";
            else if (event.error === 'audio-capture') userMessage = "Masalah dengan mikrofon. Pastikan terhubung.";
            else if (event.error === 'network') userMessage = "Masalah jaringan dengan layanan STT.";
            
            if (userMessage !== `Error STT: ${event.error}.` || event.error === 'network') setError(userMessage);
            setIsListening(false);
        };
        
        let finalTranscript = '';
        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
            if (autoSubmitTimerRef.current) {
                clearTimeout(autoSubmitTimerRef.current);
            }

            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript.trim() + ' ';
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            
            setInput(finalTranscript.trim() + (interimTranscript ? ' ' + interimTranscript : ''));

            autoSubmitTimerRef.current = window.setTimeout(() => {
                console.log("Auto-submitting after 3 seconds of silence...");
                if (handleSubmitRef.current) {
                    handleSubmitRef.current();
                }
            }, 3000); // 3-second delay
        };

        recognitionRef.current = recognitionInstance;

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
            }
            if (autoSubmitTimerRef.current) {
                clearTimeout(autoSubmitTimerRef.current);
            }
        };
    }, [isSpeakingTTSBrowser, isPlayingTTSFromElement]); // Dependencies managed

    useEffect(() => {
        // Setup STT AnalyserNode
        const setupSTTAnalyser = async () => {
            if (!isListening) {
                if (sttMediaStreamRef.current) {
                    sttMediaStreamRef.current.getTracks().forEach(track => track.stop());
                    sttMediaStreamRef.current = null;
                }
                if (sttMediaStreamSourceRef.current) {
                    sttMediaStreamSourceRef.current.disconnect();
                    sttMediaStreamSourceRef.current = null;
                }
                if (sttAnalyserNodeRef.current) {
                    sttAnalyserNodeRef.current.disconnect();
                    sttAnalyserNodeRef.current = null;
                }
                return;
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                sttMediaStreamRef.current = stream;
                const audioContext = await ensureAudioContext();
                if (audioContext) {
                    sttMediaStreamSourceRef.current = audioContext.createMediaStreamSource(stream);
                    sttAnalyserNodeRef.current = audioContext.createAnalyser();
                    sttMediaStreamSourceRef.current.connect(sttAnalyserNodeRef.current);
                    // sttAnalyserNodeRef.current.connect(audioContext.destination); // Connect to speakers for monitoring if needed
                }
            } catch (err) {
                console.error("Error accessing microphone for STT visualization:", err);
                setError("Gagal mengakses mikrofon untuk visualisasi STT.");
            }
        };

        setupSTTAnalyser();

        return () => {
            if (sttMediaStreamRef.current) {
                sttMediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (sttMediaStreamSourceRef.current) sttMediaStreamSourceRef.current.disconnect();
            if (sttAnalyserNodeRef.current) sttAnalyserNodeRef.current.disconnect();
        };
    }, [isListening, ensureAudioContext]);

    // --- MODIFIED HANDLETOGGLELISTEN ---
    const handleToggleListen = async () => {
        if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
            autoSubmitTimerRef.current = null;
        }

        if (!recognitionRef.current) {
            setError("Fitur input suara tidak didukung browser ini.");
            return;
        }
        
        if (isListening) {
            try {
                recognitionRef.current.stop();
                // Manually trigger submit if there's content in the input
                if (input.trim()) {
                    handleSubmit();
                }
            } catch(e) { console.warn("Error stopping STT:", e); }
        } else {
            setError(null);
            try {
                await ensureAudioContext();
                if (isSpeakingTTSBrowser && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
                if (isPlayingTTSFromElement && audioPlayerRef.current) audioPlayerRef.current.pause();

                setIsListening(true);
                recognitionRef.current.start();
            } catch (e: any) {
                console.error("Gagal memulai speech recognition:", e.message, e.name);
                setError(`Gagal memulai STT: ${e.message}.`);
                setIsListening(false);
            }
        }
    };
    
    const anyTTSSpeaking = isSpeakingTTSBrowser || isPlayingTTSFromElement;

    // DEBUG LOG
    console.log({ isListening, anyTTSSpeaking, availableVoicesCount: availableVoices.length });

    return (
        <div className={styles.appContainer}>
            <audio ref={audioPlayerRef} style={{ display: 'none' }} crossOrigin="anonymous" />
            <header className={styles.appHeader}>
                <h1>Asisten AI Cerdas</h1>
            </header>

            <main className={styles.mainContent}>
                {isSpeakingTTSBrowser && (
                    <div className={styles.ttsWaveformDisplayContainer}>
                        <RadialPulseWaveform 
                            isActive={isSpeakingTTSBrowser} 
                            width={200}     
                            height={60}     
                            colorScheme="vibrant" 
                        />
                    </div>
                )}
                <div className={styles.messagesListContainer}>
                    {messages.map((message, index) => (
                        <MessageCard
                            key={index} 
                            role={message.role} 
                            message={message.content}
                            timestamp={message.timestamp}
                            onPlaySound={playSound}
                            audioData={message.audioData}
                            provider={message.provider}
                        />
                    ))}
                    {isLoading && (
                        <div className={styles.loadingIndicatorContainer}>
                            <div className={styles.loadingIndicatorBubble}>
                                <div className={styles.loadingDots}>
                                    <span className="sr-only">Mengetik...</span>
                                    <div></div> <div></div> <div></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} style={{ height: '1px' }}/>
                </div>

                {isListening && !anyTTSSpeaking && (
                    <div className={styles.waveformContainerRadial}>
                        <VoiceWaveform 
                            analyserNode={sttAnalyserNodeRef.current} 
                            isListening={isListening} 
                            width={240} 
                            height={120}
                        />
                        <p className={styles.listeningText}>Mendengarkan...</p>
                    </div>
                )}

                {error && !isLoading && (
                       <div className={styles.errorMessageContainer}>
                           <strong>Error:</strong> {error}
                       </div>
                )}

                <form 
                    onSubmit={handleSubmit} 
                    className={styles.messageInputForm}
                >
                    <div className={styles.inputFormInnerWrapper}>
                        <textarea
                            ref={textareaRef} 
                            placeholder="Tulis pesan atau klik ikon mikrofon..." 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isLoading && !isListening) { handleSubmit(e); } }}
                            className={styles.inputTextArea} 
                            rows={1} 
                            disabled={isLoading || anyTTSSpeaking} 
                        />
                        <button
                            type="button" 
                            onClick={handleToggleListen}
                            className={`${styles.iconButton} ${isListening ? styles.micButtonListening : styles.micButtonIdle} ${isListening ? styles.micButtonWithText : ''}`}
                            aria-label={isListening ? "Hentikan Merekam" : "Rekam Suara"}
                            disabled={isLoading || anyTTSSpeaking} 
                        >
                            {isListening ? <span>Hentikan</span> : <MicrophoneIcon />}
                        </button>
                        <button
                            type="submit" 
                            disabled={!input.trim() || isLoading || anyTTSSpeaking}
                            className={styles.sendButton} 
                            aria-label="Kirim pesan"
                        >
                            <SendIcon />
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

export default App;