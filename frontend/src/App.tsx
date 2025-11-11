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

const MicIcon = ({ isListening }: { isListening: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        {isListening ? (
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 0 1 9 0v4.5a4.5 4.5 0 0 1-9 0V6Zm5.993 14.217a.75.75 0 0 1-.353 0H8.86a.75.75 0 0 1-.353 0A8.966 8.966 0 0 0 6 17.75a.75.75 0 0 1 1.5 0 7.466 7.466 0 0 1 6.5 7.5c0 .414.336.75.75.75h.001a.75.75 0 0 1 .75-.75 8.966 8.966 0 0 0 2.86-2.25.75.75 0 0 1-.353 0Z" clipRule="evenodd" />
        ) : (
            <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
        )}
        <path d="M6 10.5a.75.75 0 0 1 .75.75v1.5a5.25 5.25 0 1 0 10.5 0v-1.5a.75.75 0 0 1 1.5 0v1.5a6.75 6.75 0 1 1-13.5 0v-1.5a.75.75 0 0 1 .75-.75Z" />
    </svg>
);

// Tipe untuk entri log backend
type LogEntry = {
    timestamp: string;
    level: string;
    message: string;
};

// Komponen VoiceWaveform (untuk STT)
interface VoiceWaveformProps {
    analyserNode: AnalyserNode | null;
    isListening: boolean;
    isSpeaking: boolean; // New prop for TTS activity
    width?: number;
    height?: number;
}
const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
    analyserNode, isListening, isSpeaking, width = 280, height = 120,
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
    
    // Base colors - will be made dynamic
    const BAR_COLORS_BASE = ['#67E8F9', '#4FD1C5', '#A7F3D0', '#3B82F6', '#818CF8', '#A5B4FC'];
    const PRIMARY_RGB = '56, 189, 248'; // RGB values for var(--primary) #38bdf8
    const CENTER_MAIN_COLOR_BASE = `rgba(${PRIMARY_RGB}, 0.9)`;
    const CENTER_GLOW_COLOR_BASE = `rgba(${PRIMARY_RGB}, 0.25)`;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d'); if (!context) return;

        // Set higher resolution for canvas for better rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.scale(dpr, dpr);
        
        const bufferLength = analyserNode?.frequencyBinCount || 128; // Default if no analyser
        const dataArray = new Uint8Array(bufferLength);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            let currentAvgVol = 0;
            if (isListening && analyserNode) {
                analyserNode.getByteFrequencyData(dataArray);
                let sum = 0;
                for(let k=0; k < bufferLength; k++) sum += dataArray[k];
                currentAvgVol = (sum / bufferLength) / 255; 
                currentAvgVol = Math.min(currentAvgVol * 2.5, 1); 
            } else if (isSpeaking) {
                // Simulate volume for TTS when no analyserNode is available
                const time = Date.now() * 0.003; // Slower time for overall pulse
                const fastTime = Date.now() * 0.01; // Faster time for subtle fluctuations
                currentAvgVol = 0.4 + Math.sin(time) * 0.2 + Math.sin(fastTime * 1.5) * 0.1;
                currentAvgVol = Math.max(0.1, Math.min(0.8, currentAvgVol));
            }

            if (!isListening && !isSpeaking) {
                // Clear canvas and stop animation if neither is active
                if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
                context.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }

            // Dynamic Glow and Orb
            const dynamicGlow = (width < baseWidthForScaling ? 18 : 35) * currentAvgVol * 1.5;
            const dynamicOrbOpacity = 0.6 + currentAvgVol * 0.4;
            const orbR = CENTER_ORB_MIN_RADIUS + (CENTER_ORB_MAX_RADIUS - CENTER_ORB_MIN_RADIUS) * currentAvgVol;
            
            context.save();
            context.shadowBlur = dynamicGlow;
            context.shadowColor = `rgba(${PRIMARY_RGB}, ${dynamicOrbOpacity * 0.5})`;
            context.fillStyle = `rgba(${PRIMARY_RGB}, ${dynamicOrbOpacity})`;
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
                const barVal = isListening && analyserNode ? (dataArray[Math.min(bufferLength - 1, Math.floor(Math.pow(normalizedPos, 0.75) * (bufferLength * 0.85)))] / 255.0) : (isSpeaking ? (0.4 + Math.sin(Date.now() * 0.01 + i * 0.1) * 0.3) : 0);
                
                const barLenFactor = 0.4 + currentAvgVol * 0.6; 
                const barLen = (BAR_WIDTH / 2) + barVal * MAX_BAR_LENGTH * barLenFactor;
                
                if (barLen <= (BAR_WIDTH / 2)) continue;

                const sX = centerX + RING_RADIUS * Math.cos(angle);
                const sY = centerY + RING_RADIUS * Math.sin(angle);
                const eX = centerX + (RING_RADIUS + barLen) * Math.cos(angle);
                const eY = centerY + (RING_RADIUS + barLen) * Math.sin(angle);
                
                // Dynamic bar color based on volume and time
                const colorIndex = Math.floor((i / NUM_BARS) * BAR_COLORS_BASE.length);
                const baseColor = BAR_COLORS_BASE[colorIndex];
                const r = parseInt(baseColor.slice(1, 3), 16);
                const g = parseInt(baseColor.slice(3, 5), 16);
                const b = parseInt(baseColor.slice(5, 7), 16);
                context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.6 + barVal * 0.4})`; // Dynamic opacity
                
                context.beginPath(); context.moveTo(sX, sY); context.lineTo(eX, eY); context.stroke();
            }
            context.globalAlpha = 1.0;
        };
        draw();
        return () => {
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            if (canvasRef.current) { const ctx = canvasRef.current.getContext('2d'); ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
        };
    }, [isListening, isSpeaking, analyserNode, width, height, NUM_BARS, CENTER_ORB_MIN_RADIUS, CENTER_ORB_MAX_RADIUS, RING_RADIUS, MAX_BAR_LENGTH, BAR_WIDTH, BAR_COLORS_BASE, CENTER_MAIN_COLOR_BASE, CENTER_GLOW_COLOR_BASE, baseWidthForScaling]);
    return <canvas ref={canvasRef} width={width} height={height} />;
};




const getCurrentTimestamp = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

function App() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Halo! Ucapkan 'Nova' untuk memulai.", timestamp: getCurrentTimestamp(), provider: "Sistem" },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSpeakingTTSBrowser, setIsSpeakingTTSBrowser] = useState<boolean>(false);
    const [speechQueue, setSpeechQueue] = useState<string[]>([]);
    const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
    const [isNovaResponding, setIsNovaResponding] = useState<boolean>(false);

    const messagesContainerRef = useRef<null | HTMLDivElement>(null);
    const textareaRef = useRef<null | HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const sttMediaStreamRef = useRef<MediaStream | null>(null);
    const sttMediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const sttAnalyserNodeRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const ttsWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
    const audioPlayerRef = useRef<HTMLAudioElement>(null); // Deklarasi audioPlayerRef
    
    // --- REFS FOR NEW FLOW ---
    const novaActivationTimerRef = useRef<NodeJS.Timeout | null>(null);
    const handleSubmitRef = useRef<((prompt: string) => Promise<void>) | null>(null);


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
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const cancelAllSpeech = useCallback(() => {
        if (typeof speechSynthesis !== 'undefined') {
            if (ttsWatchdogTimerRef.current) {
                clearTimeout(ttsWatchdogTimerRef.current);
            }
            setSpeechQueue([]);
            setIsSpeakingTTSBrowser(false);
            speechSynthesis.cancel();
        }
    }, []);

    const createChunks = (text: string, maxLength: number): string[] => {
    if (text.length <= maxLength) {
        return [text];
    }

    const chunks: string[] = [];
    let remainingText = text;

    while (remainingText.length > 0) {
        if (remainingText.length <= maxLength) {
            chunks.push(remainingText);
            break;
        }

        let splitIndex = -1;
        const sentenceBreak = remainingText.lastIndexOf('.', maxLength);
        if (sentenceBreak !== -1) {
            splitIndex = sentenceBreak + 1;
        } else {
            const spaceBreak = remainingText.lastIndexOf(' ', maxLength);
            if (spaceBreak !== -1) {
                splitIndex = spaceBreak + 1;
            }
        }

        if (splitIndex === -1 || splitIndex === 0) {
            splitIndex = maxLength;
        }

        chunks.push(remainingText.substring(0, splitIndex));
        remainingText = remainingText.substring(splitIndex);
    }

    return chunks.filter(chunk => chunk.trim().length > 0);
};

    const playSound = useCallback((dataOrText: string | any) => {
        const textToSpeak = typeof dataOrText === 'string' ? dataOrText : dataOrText.content;
        if (!textToSpeak) return;

        const MAX_CHUNK_LENGTH = 180; // More conservative chunk length
        const chunks = createChunks(textToSpeak, MAX_CHUNK_LENGTH);
        
        if (chunks.length > 0) {
            setSpeechQueue(prev => [...prev, ...chunks]);
        }
    }, []);

    const playDeactivationSound = useCallback(async () => {
        try {
            const audioContext = await ensureAudioContext();
            if (!audioContext) return;

            const playBeep = (freq: number, startTime: number, duration: number) => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(freq, startTime);
                gainNode.gain.setValueAtTime(0.3, startTime); 
                gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

                oscillator.start(startTime);
                oscillator.stop(startTime + duration);
            };

            const now = audioContext.currentTime;
            playBeep(523.25, now, 0.1); 
            playBeep(440.00, now + 0.15, 0.1);

        } catch (err) {
            console.error("Could not play deactivation sound", err);
        }
    }, [ensureAudioContext]);

    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            setAvailableVoices(voices);
        };

        if (typeof window.speechSynthesis !== 'undefined') {
            if (window.speechSynthesis.getVoices().length > 0) {
                loadVoices();
            } else {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    // Speech Queue Processor
    useEffect(() => {
        if (speechQueue.length > 0 && !isSpeakingTTSBrowser && availableVoices.length > 0) {
            const textToSpeak = speechQueue[0];
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = 'id-ID';

            const indonesianVoice = availableVoices.find(voice => voice.lang === 'id-ID');
            if (indonesianVoice) {
                utterance.voice = indonesianVoice;
            } else {
                console.warn("Indonesian voice not found, using default.");
            }

            const onEndOrError = () => {
                if (ttsWatchdogTimerRef.current) {
                    clearTimeout(ttsWatchdogTimerRef.current);
                }
                setIsSpeakingTTSBrowser(false);
                setSpeechQueue(prev => prev.slice(1));
            };

            utterance.onstart = () => {
                setIsSpeakingTTSBrowser(true);
                if (ttsWatchdogTimerRef.current) clearTimeout(ttsWatchdogTimerRef.current);
                ttsWatchdogTimerRef.current = setTimeout(() => {
                    console.warn("TTS watchdog triggered. Resetting state.");
                    cancelAllSpeech();
                }, 15000); // Increased to 15 seconds
            };

            utterance.onend = () => {
                onEndOrError();
            };
            utterance.onerror = (event) => {
                console.error("Browser TTS error:", event.error, "for text:", textToSpeak);
                onEndOrError();
            };
            
            window.speechSynthesis.speak(utterance);
        }
    }, [speechQueue, isSpeakingTTSBrowser, availableVoices, cancelAllSpeech]);


    useEffect(() => {
        if (messagesContainerRef.current) {
            const { scrollHeight } = messagesContainerRef.current;
            messagesContainerRef.current.scrollTo({ top: scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    useEffect(() => { autoGrowTextarea(); }, [input, autoGrowTextarea]);

    const fetchLogs = useCallback(async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333";
            const response = await fetch(`${backendUrl}/api/logs`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data: LogEntry[] = await response.json();
            setBackendLogs(data);
        } catch (err) {
            console.error("Error fetching backend logs:", err);
        }
    }, []);

    useEffect(() => {
        let logInterval: number | undefined;
        fetchLogs();
        logInterval = window.setInterval(fetchLogs, 3000);
        return () => {
            if (logInterval) clearInterval(logInterval);
        };
    }, [fetchLogs]);

    const sendPromptToAI = useCallback(async (prompt: string) => {
        const trimmedInput = prompt.trim();
        if (trimmedInput && !isLoading) {
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
                    playSound(newAssistantMessage.content);
                } else { throw new Error("Struktur respons dari server tidak valid."); }
            } catch (err: any) {
                const errorMessageText = err.message || "Gagal mendapatkan respons dari server.";
                console.error("Submit Error:", err);
                setError(errorMessageText);
                const assistantErrorMessage: Message = { role: "assistant", content: `Error: ${errorMessageText}`, timestamp: getCurrentTimestamp(), provider: "Sistem Error" };
                setMessages((prevMessages) => [...prevMessages, assistantErrorMessage]);
                playSound(`Terjadi kesalahan: ${errorMessageText}`);
            } finally {
                setIsLoading(false);
            }
        }
    }, [isLoading, messages, playSound]);

    const handleFormSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (isNovaResponding) {
            sendPromptToAI(input);
        } else {
            console.log("Nova is not active. Please say 'Nova' to activate.");
            setError("Nova tidak aktif. Ucapkan 'Nova' untuk memulai.");
        }
    }, [input, isNovaResponding, sendPromptToAI]);

    useEffect(() => {
        handleSubmitRef.current = sendPromptToAI;
    }, [sendPromptToAI]);

    useEffect(() => {
        const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) {
            console.warn("Browser tidak mendukung Web Speech API (STT).");
            return;
        }
        
        const recognitionInstance: SpeechRecognition = new SpeechRecognitionAPI();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = 'id-ID';
        
        recognitionInstance.onstart = () => {
            console.log("STT dimulai.");
            setError(null);
            setIsListening(true);
            cancelAllSpeech();
        };
        recognitionInstance.onend = () => {
            console.log("STT berakhir. Memulai ulang...");
            setIsListening(false);
            if (recognitionRef.current) {
                recognitionRef.current.start();
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
        
        recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
            const finalTranscript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('')
                .trim()
                .toLowerCase();

            if (!finalTranscript) return;

            console.log("Final Transcript:", finalTranscript);

            if (isNovaResponding) {
                if (novaActivationTimerRef.current) {
                    clearTimeout(novaActivationTimerRef.current);
                    novaActivationTimerRef.current = null;
                }

                if (finalTranscript === "nova off") {
                    console.log("Nova deactivated by user command.");
                    playDeactivationSound();
                    setIsNovaResponding(false);
                } else {
                    console.log("Prompt captured:", finalTranscript);
                    playDeactivationSound();
                    handleSubmitRef.current?.(finalTranscript);
                    setIsNovaResponding(false);
                }
            } else {
                if (finalTranscript.includes("nova")) {
                    console.log("Nova activated! Listening for prompt for 5 minutes.");
                    setTimeout(() => {
                        playSound("Iya, tuan");
                    }, 100);
                    setIsNovaResponding(true);
                    setError(null);

                    if (novaActivationTimerRef.current) {
                        clearTimeout(novaActivationTimerRef.current);
                    }
                    novaActivationTimerRef.current = setTimeout(() => {
                        console.log("5-minute timeout reached. Nova deactivated.");
                        playDeactivationSound();
                        setIsNovaResponding(false);
                        novaActivationTimerRef.current = null;
                    }, 5 * 60 * 1000);
                }
            }
        };
        
        recognitionRef.current = recognitionInstance;

        try {
            recognitionRef.current.start();
        } catch (e) {
            console.error("Error starting initial speech recognition:", e);
            setError("Gagal memulai STT awal.");
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.onstart = null;
                recognitionRef.current.onresult = null;
                recognitionRef.current.onerror = null;
                recognitionRef.current.onend = null;
                try { recognitionRef.current.abort(); } catch (e) { /* ignore */ }
            }
            if (novaActivationTimerRef.current) {
                clearTimeout(novaActivationTimerRef.current);
            }
        };
    }, [isNovaResponding, playSound, playDeactivationSound, cancelAllSpeech]);


    useEffect(() => {
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
    
    const anyTTSSpeaking = isSpeakingTTSBrowser;

    const toggleListening = useCallback(() => {
        if (recognitionRef.current) {
            if (isListening) {
                recognitionRef.current.stop();
            } else {
                recognitionRef.current.start();
            }
        }
    }, [isListening]);

    return (
        <div className={styles.appContainer}>
            <header className={styles.appHeader}>
                <h1>Asisten AI Cerdas</h1>
                <button 
                    className={`${styles.iconButton} ${styles.logButton}`}
                    onClick={() => {}} // Placeholder for log viewer toggle
                    aria-label="Tampilkan Log Backend"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" d="M2.25 6A2.25 2.25 0 0 1 4.5 3.75h15A2.25 2.25 0 0 1 21.75 6v12a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 18V6Zm1.5 0v12a.75.75 0 0 0 .75.75h15a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H4.5a.75.75 0 0 0-.75.75ZM6 9a.75.75 0 0 1 .75-.75h.008v.008H6.75A.75.75 0 0 1 6 9Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H7.5a.75.75 0 0 0-.75-.75ZM6 12a.75.75 0 0 1 .75-.75h.008v.008H6.75A.75.75 0 0 1 6 12Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H7.5a.75.75 0 0 0-.75-.75ZM6 15a.75.75 0 0 1 .75-.75h.008v.008H6.75A.75.75 0 0 1 6 15Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H7.5a.75.75 0 0 0-.75-.75ZM9 9a.75.75 0 0 1 .75-.75h.008v.008H9.75A.75.75 0 0 1 9 9Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H10.5a.75.75 0 0 0-.75-.75ZM9 12a.75.75 0 0 1 .75-.75h.008v.008H9.75A.75.75 0 0 1 9 12Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H10.5a.75.75 0 0 0-.75-.75ZM9 15a.75.75 0 0 1 .75-.75h.008v.008H9.75A.75.75 0 0 1 9 15Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H10.5a.75.75 0 0 0-.75-.75ZM12 9a.75.75 0 0 1 .75-.75h.008v.008H12.75A.75.75 0 0 1 12 9Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H13.5a.75.75 0 0 0-.75-.75ZM12 12a.75.75 0 0 1 .75-.75h.008v.008H12.75A.75.75 0 0 1 12 12Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H13.5a.75.75 0 0 0-.75-.75ZM12 15a.75.75 0 0 1 .75-.75h.008v.008H12.75A.75.75 0 0 1 12 15Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H13.5a.75.75 0 0 0-.75-.75ZM15 9a.75.75 0 0 1 .75-.75h.008v.008H15.75A.75.75 0 0 1 15 9Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H16.5a.75.75 0 0 0-.75-.75ZM15 12a.75.75 0 0 1 .75-.75h.008v.008H15.75A.75.75 0 0 1 15 12Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H16.5a.75.75 0 0 0-.75-.75ZM15 15a.75.75 0 0 1 .75-.75h.008v.008H15.75A.75.75 0 0 1 15 15Zm.75 0a.75.75 0 0 0 .75.75h.008v.008H16.5a.75.75 0 0 0-.75-.75Z" clipRule="evenodd" />
                    </svg>
                </button>
            </header>

            <main className={styles.mainContent}>
                {(isListening || anyTTSSpeaking) && (
                    <div className={styles.unifiedWaveformDisplayContainer}>
                        <VoiceWaveform 
                            analyserNode={sttAnalyserNodeRef.current} 
                            isListening={isListening} 
                            isSpeaking={anyTTSSpeaking}
                            width={280}     
                            height={120}     
                        />
                        <p className={styles.waveformStatusText}>
                            {isNovaResponding ? "Nova Aktif: Mendengarkan..." : "Nova Tidak Aktif: Ucapkan 'Nova'..."}
                        </p>
                    </div>
                )}
                <div ref={messagesContainerRef} className={styles.messagesListContainer}>
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
                </div>

                {error && !isLoading && (
                       <div className={styles.errorMessageContainer}>
                           <strong>Error:</strong> {error}
                       </div>
                )}

                <form 
                    onSubmit={handleFormSubmit} 
                    className={styles.messageInputForm}
                >
                    <div className={styles.inputFormInnerWrapper}>
                        <textarea
                            ref={textareaRef} 
                            placeholder={isNovaResponding ? "Mendengarkan..." : "Ucapkan 'Nova' atau ketik di sini..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !isLoading) { handleFormSubmit(e); } }}
                            className={styles.inputTextArea} 
                            rows={1} 
                            disabled={isLoading || anyTTSSpeaking} 
                        />
                        <button
                            type="submit" 
                            disabled={!input.trim() || isLoading || anyTTSSpeaking}
                            className={styles.sendButton} 
                            aria-label="Kirim pesan"
                        >
                            <SendIcon />
                        </button>
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`${isListening ? styles.micButtonListening : styles.micButtonIdle} ${isNovaResponding ? styles.micButtonWithText : ''}`}
                            disabled={isLoading || anyTTSSpeaking}
                            aria-label={isListening ? "Berhenti mendengarkan" : "Mulai mendengarkan"}
                        >
                            <MicIcon isListening={isListening} />
                            {isNovaResponding && <span>Mendengarkan...</span>}
                        </button>
                    </div>
                </form>
            </main>
            <div className={styles.logViewerContainer}>
                        <div className={styles.logViewerHeader}>
                            <h2>Log Backend</h2>
                            <button 
                                className={`${styles.iconButton} ${styles.closeLogButton}`}
                                onClick={() => {}}
                                aria-label="Tutup Log Backend"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                        <div className={styles.logViewerContent}>
                            {backendLogs.length === 0 ? (
                                <p>Tidak ada log yang tersedia.</p>
                            ) : (
                                backendLogs.map((log, index) => (
                                    <div key={index} className={`${styles.logEntry} ${styles[log.level]}`}>
                                        <span className={styles.logTimestamp}>{log.timestamp}</span>
                                        <span className={styles.logLevel}>[{log.level.toUpperCase()}]</span>
                                        <span className={styles.logMessage}>{log.message}</span>
                                    </div>
                                ))
                            )}
                        </div>
                </div>
        </div>
    );
}

export default App;