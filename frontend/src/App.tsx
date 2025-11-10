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

const LogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM6.166 5.106a.75.75 0 0 1 0 1.06L5.106 7.232a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM18.374 5.106a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 1 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM4.5 12a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 0 1.5H5.25a.75.75 0 0 1-.75-.75ZM17.25 12a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 0 1.5h-.75a.75.75 0 0 1-.75-.75ZM12 18.75a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.75a.75.75 0 0 1 .75-.75ZM5.106 18.374a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM16.313 17.061a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
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
    return <canvas ref={canvasRef} width={width} height={height} className={styles.voiceWaveformCanvasRadial} />;
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
    const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]); // New state for backend logs
    const [isNovaResponding, setIsNovaResponding] = useState<boolean>(false); // New state for Nova activation

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
    // Ref for inactivity timer
    const inactivityTimerRef = useRef<number | null>(null);
    const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

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

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
        }
        inactivityTimerRef.current = window.setTimeout(() => {
            setIsNovaResponding(false);
            console.log("Nova deactivated due to 15 minutes of inactivity.");
        }, INACTIVITY_TIMEOUT_MS);
    }, [setIsNovaResponding, INACTIVITY_TIMEOUT_MS]);

    const playSound = useCallback(async (dataOrText: string | any) => {
        resetInactivityTimer(); // Reset inactivity timer on any sound playback
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

        // --- TTS AnalyserNode Connection Attempt ---
        // This is a complex part because window.speechSynthesis does not expose its audio stream directly.
        // The RadialPulseWaveform will animate based on the 'isActive' prop in a simplified way.
        // For a true audio-driven visualization of speechSynthesis, a MediaStreamDestinationNode
        // would be needed to capture the output, but its support varies and it's less direct.        
        // So, RadialPulseWaveform will simply animate when isActive is true.
        // It's not truly 'following the volume' of the speechSynthesis output itself without advanced workarounds.

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

    // Inactivity timer management
    useEffect(() => {
        resetInactivityTimer(); // Initialize or reset timer on component mount/activity
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [resetInactivityTimer, isNovaResponding]); // Reset timer when Nova state changes or any activity

    // --- LOG FETCHING ---
    const fetchLogs = useCallback(async () => {
        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333";
            const response = await fetch(`${backendUrl}/api/logs`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data: LogEntry[] = await response.json();
            setBackendLogs(data);
        } catch (err) {
            console.error("Error fetching backend logs:", err);
        }
    }, []);

    useEffect(() => {
        let logInterval: number | undefined;
        fetchLogs(); // Fetch immediately
        logInterval = window.setInterval(fetchLogs, 3000); // Poll every 3 seconds
        return () => {
            if (logInterval) clearInterval(logInterval);
        };
    }, [fetchLogs]);


    // --- MODIFIED HANDLESUBMIT ---
    const handleSubmit = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        resetInactivityTimer(); // Reset inactivity timer on user submission

        if (!isNovaResponding) {
            console.log("Nova is not active, AI will not respond to this input.");
            // Optionally, provide user feedback here, e.g., a toast message
            return;
        }

        if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
            autoSubmitTimerRef.current = null;
        }

        const trimmedInput = input.trim();
        if (trimmedInput && !isLoading) {
            // ... (rest of the handleSubmit function) ...

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

    // --- SPEECH RECOGNITION SETUP EFFECT ---
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
            setIsListening(true); // Set isListening to true when STT starts
            if (isSpeakingTTSBrowser && typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
            if (isPlayingTTSFromElement && audioPlayerRef.current) audioPlayerRef.current.pause();
        };
        recognitionInstance.onend = () => {
            console.log("STT berakhir.");
            setIsListening(false); // Set isListening to false when STT ends
            // Attempt to restart recognition if it ended unexpectedly (e.g., due to timeout)
            if (recognitionRef.current && !recognitionRef.current.abort) { // Check if not manually aborted
                console.log("STT ended unexpectedly, attempting to restart...");
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
        
        recognitionInstance.onresult = async (event: SpeechRecognitionEvent) => {
            resetInactivityTimer(); // Reset inactivity timer on speech input
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }
            
            // Update input with interim transcript for immediate feedback
            setInput(prevInput => {
                // Only update if interim results are meaningful or if final transcript is available
                if (interimTranscript.trim() || finalTranscript.trim()) {
                    return finalTranscript.trim() || interimTranscript.trim();
                }
                return prevInput;
            });

            if (finalTranscript.trim()) {
                console.log("Final Transcript:", finalTranscript);
                // Send final transcript to backend for keyword detection
                try {
                    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333";
                    const response = await fetch(`${backendUrl}/api/keyword-detect`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ transcript: finalTranscript }),
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    if (typeof data.novaResponding === 'boolean') {
                        setIsNovaResponding(data.novaResponding);
                        if (data.novaResponding) {
                            console.log("Nova activated!");
                            // If Nova is activated by voice, and there's a pending input, submit it
                            if (finalTranscript.trim() !== "nova") { // Avoid submitting "nova" as a message
                                if (handleSubmitRef.current) {
                                    // Temporarily set input to finalTranscript and then submit
                                    setInput(finalTranscript);
                                    // Use a timeout to ensure state update for input is processed
                                    setTimeout(() => handleSubmitRef.current?.(), 0);
                                }
                            }
                        } else {
                            console.log("Nova deactivated!");
                        }
                    }
                } catch (err) {
                    console.error("Error sending transcript to backend:", err);
                    setError("Gagal mendeteksi kata kunci.");
                }
            }
        };

        recognitionRef.current = recognitionInstance;

        // Start recognition on mount
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
                try { recognitionRef.current.abort(); } catch (e) { /* ignore */ } // Abort cleanly
            }
        };
    }, [isSpeakingTTSBrowser, isPlayingTTSFromElement, setIsNovaResponding]); // Added setIsNovaResponding to dependencies


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
        // This function now primarily acts as a manual trigger for input or to clear it.
        // SpeechRecognition is always running in the background.

        if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
            autoSubmitTimerRef.current = null;
        }

        // If there's input, and Nova is responding, treat this as a manual submit
        if (input.trim() && isNovaResponding) {
            if (handleSubmitRef.current) {
                handleSubmitRef.current();
            }
        } else {
            // Otherwise, clear the input
            setInput("");
            if (textareaRef.current) { textareaRef.current.style.height = "auto"; }
        }
        // No need to start/stop recognitionRef.current here, it's managed by its useEffect
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
                {(isListening || isSpeakingTTSBrowser) && (
                    <div className={styles.unifiedWaveformDisplayContainer}>
                        <VoiceWaveform 
                            analyserNode={sttAnalyserNodeRef.current} 
                            isListening={isListening} 
                            isSpeaking={isSpeakingTTSBrowser} // Pass isSpeaking prop
                            width={240}     
                            height={120}     
                        />
                        <p className={styles.waveformStatusText}>
                            {isNovaResponding ? "Nova Aktif: Mendengarkan..." : "Nova Tidak Aktif: Ucapkan 'Nova'..."}
                        </p>
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
                            disabled={isLoading || anyTTSSpeaking || !isNovaResponding} 
                        />
                        <button
                            type="button" 
                            onClick={handleToggleListen}
                            className={`${styles.iconButton} ${isListening ? styles.micButtonListening : styles.micButtonIdle} ${isNovaResponding ? styles.micButtonListening : ''}`} // Change color if Nova is responding
                            aria-label={isListening ? "Hentikan Merekam" : "Rekam Suara"}
                            disabled={isLoading || anyTTSSpeaking} 
                        >
                            {isNovaResponding ? <span>Nova Aktif</span> : <MicrophoneIcon />}
                        </button>
                        <button
                            type="submit" 
                            disabled={!input.trim() || isLoading || anyTTSSpeaking || !isNovaResponding}
                            className={styles.sendButton} 
                            aria-label="Kirim pesan"
                        >
                            <SendIcon />
                        </button>
                    </div>
                </form>
            </main>
            <div className={styles.logViewerContainer}>
                    <div className={styles.logViewerHeader}>
                        <h2>Log Backend</h2>
                        <button 
                            className={`${styles.iconButton} ${styles.closeLogButton}`}
                            onClick={() => setShowLogs(false)}
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