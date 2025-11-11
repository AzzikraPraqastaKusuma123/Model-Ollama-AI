import React, { useState, useEffect, useRef, useCallback } from "react";
import { MessageCard } from "./components/MessageCard";
import styles from './App.module.css';

// Definisi Global Type untuk Web Speech API
interface SpeechRecognitionEventMap {
    "audiostart": Event; "audioend": Event; "end": Event; "error": SpeechRecognitionErrorEvent;
    "nomatch": SpeechRecognitionEvent; "result": SpeechRecognitionEvent; "soundstart": Event;
    "soundend": Event; "speechstart": Event; "speechend": Event; "start": Event;
}
interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList; lang: string; continuous: boolean; interimResults: boolean;
    maxAlternatives: number; serviceURI: string; start(): void; stop(): void; abort(): void;
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
interface SpeechRecognitionStatic { new(): SpeechRecognition; }
declare global {
    interface Window {
        SpeechRecognition: SpeechRecognitionStatic; webkitSpeechRecognition: SpeechRecognitionStatic;
        AudioContext: typeof AudioContext; webkitAudioContext: typeof AudioContext;
    }
    interface SpeechGrammarList { readonly length: number; item(index: number): SpeechGrammar; addFromURI(src: string, weight?: number): void; addFromString(string: string, weight?: number): void; [index: number]: SpeechGrammar; }
    interface SpeechGrammar { src: string; weight: number; }
    interface SpeechRecognitionResult { readonly length: number; item(index: number): SpeechRecognitionAlternative; readonly isFinal: boolean; [index: number]: SpeechRecognitionResult; }
    interface SpeechRecognitionAlternative { readonly transcript: string; readonly confidence: number; }
    interface SpeechRecognitionResultList { readonly length: number; item(index: number): SpeechRecognitionResult; [index: number]: SpeechRecognitionResult; }
    interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList; }
    type SpeechRecognitionErrorCode = | "no-speech" | "aborted" | "audio-capture" | "network" | "not-allowed" | "service-not-allowed" | "bad-grammar" | "language-not-supported";
    interface SpeechRecognitionErrorEvent extends Event { readonly error: SpeechRecognitionErrorCode; readonly message: string; }
}

type Message = { role: "assistant" | "user"; content: string; timestamp: string; provider?: string; };
type LogEntry = { timestamp: string; level: string; message: string; };

// --- Icon Components ---
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"> <path d="M3.105 3.105a.75.75 0 0 1 .814-.156l14.692 4.897a.75.75 0 0 1 0 1.308L3.919 14.05a.75.75 0 0 1-.814-.156L1.905 4.26a.75.75 0 0 1 .156-.814L3.105 3.105Z" /> </svg> );
const MicIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"> <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" /> <path d="M2 10a.75.75 0 0 1 .75.75v.25a5.25 5.25 0 0 0 10.5 0v-.25a.75.75 0 0 1 1.5 0v.25a6.75 6.75 0 1 1-13.5 0v-.25A.75.75 0 0 1 2 10Z" /> </svg> );
const LogIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"> <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h13A1.5 1.5 0 0 1 18 3.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 2 16.5v-13Zm1.5-.5a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-13a.5.5 0 0 0-.5-.5h-13Z" clipRule="evenodd" /> <path d="M5 6.25a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5a.75.75 0 0 1-.75-.75Zm0 3.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z" /> </svg> );
const CloseIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="20" height="20"> <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /> </svg> );

// --- VoiceWaveform Component ---
interface VoiceWaveformProps {
    analyserNode: AnalyserNode | null;
    isListening: boolean;
    isSpeaking: boolean;
    width?: number;
    height?: number;
}
const VoiceWaveform: React.FC<VoiceWaveformProps> = ({ analyserNode, isListening, isSpeaking, width = 280, height = 120 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameIdRef = useRef<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const context = canvas.getContext('2d');
        if (!context) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        context.scale(dpr, dpr);

        const bufferLength = analyserNode?.frequencyBinCount || 128;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameIdRef.current = requestAnimationFrame(draw);
            context.clearRect(0, 0, canvas.width, canvas.height);

            let avgVol = 0;
            if (isListening && analyserNode) {
                analyserNode.getByteFrequencyData(dataArray);
                avgVol = dataArray.reduce((sum, val) => sum + val, 0) / bufferLength / 255;
            } else if (isSpeaking) {
                const time = Date.now() * 0.005;
                avgVol = 0.4 + Math.sin(time) * 0.2 + Math.sin(time * 1.7) * 0.1;
            }

            if (!isListening && !isSpeaking) {
                if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
                context.clearRect(0, 0, canvas.width, canvas.height);
                return;
            }
            
            const centerX = width / 2;
            const centerY = height / 2;
            const primaryRGB = '56, 189, 248';
            
            // Orb
            const orbRadius = 10 + (avgVol * 20);
            context.fillStyle = `rgba(${primaryRGB}, ${0.6 + avgVol * 0.4})`;
            context.shadowColor = `rgba(${primaryRGB}, 0.4)`;
            context.shadowBlur = 25 * avgVol;
            context.beginPath();
            context.arc(centerX, centerY, orbRadius, 0, 2 * Math.PI);
            context.fill();
            context.shadowBlur = 0;

            // Bars
            const barCount = 80;
            const ringRadius = 40;
            const maxBarHeight = 35;
            context.lineWidth = 2.5;
            context.lineCap = 'round';

            for (let i = 0; i < barCount; i++) {
                const angle = (i / barCount) * 2 * Math.PI;
                const barVal = isListening && analyserNode ? (dataArray[Math.floor(i/barCount * bufferLength)] / 255) : (0.4 + Math.sin(Date.now() * 0.01 + i * 0.2) * 0.3);
                const barHeight = Math.max(2, barVal * maxBarHeight * (0.5 + avgVol * 0.5));

                const sX = centerX + ringRadius * Math.cos(angle);
                const sY = centerY + ringRadius * Math.sin(angle);
                const eX = centerX + (ringRadius + barHeight) * Math.cos(angle);
                const eY = centerY + (ringRadius + barHeight) * Math.sin(angle);
                
                context.strokeStyle = `rgba(100, 116, 139, ${0.5 + barVal * 0.5})`;
                context.beginPath();
                context.moveTo(sX, sY);
                context.lineTo(eX, eY);
                context.stroke();
            }
        };
        draw();
        return () => {
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [isListening, isSpeaking, analyserNode, width, height]);

    return <canvas ref={canvasRef} width={width} height={height} />;
};

const getCurrentTimestamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

function App() {
    const [messages, setMessages] = useState<Message[]>([
        { role: "assistant", content: "Hello! Say 'Nova' to start.", timestamp: getCurrentTimestamp(), provider: "System" },
    ]);
    const [input, setInput] = useState<string>("");
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isListening, setIsListening] = useState<boolean>(false);
    const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
    const [isNovaResponding, setIsNovaResponding] = useState<boolean>(false);
    const [showLogViewer, setShowLogViewer] = useState<boolean>(true);
    const [backendLogs, setBackendLogs] = useState<LogEntry[]>([]);
    
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const sttMediaStreamRef = useRef<MediaStream | null>(null);
    const sttMediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const analyserNodeRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const speechQueueRef = useRef<string[]>([]);
    const ttsWatchdogTimerRef = useRef<NodeJS.Timeout | null>(null);

    const toggleLogViewer = useCallback(() => setShowLogViewer(prev => !prev), []);

    const autoGrowTextarea = useCallback(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, []);

    const ensureAudioContext = useCallback(async () => {
        if (!audioContextRef.current || audioContextRef.current.state === 'suspended') {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            await audioContextRef.current.resume();
        }
        return audioContextRef.current;
    }, []);

    const cancelAllSpeech = useCallback(() => {
        if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
        if (ttsWatchdogTimerRef.current) clearTimeout(ttsWatchdogTimerRef.current);
        speechQueueRef.current = [];
        setIsSpeaking(false);
    }, []);

    const processSpeechQueue = useCallback(() => {
        if (isSpeaking || speechQueueRef.current.length === 0 || typeof speechSynthesis === 'undefined') return;
        const textToSpeak = speechQueueRef.current.shift();
        if (!textToSpeak) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        const indonesianVoice = speechSynthesis.getVoices().find(v => v.lang === 'id-ID');
        if (indonesianVoice) utterance.voice = indonesianVoice;
        utterance.lang = 'id-ID';

        const onEndOrError = () => {
            if (ttsWatchdogTimerRef.current) clearTimeout(ttsWatchdogTimerRef.current);
            setIsSpeaking(false);
            setTimeout(processSpeechQueue, 50);
        };

        utterance.onstart = () => {
            setIsSpeaking(true);
            ttsWatchdogTimerRef.current = setTimeout(() => {
                console.warn("TTS watchdog triggered.");
                cancelAllSpeech();
            }, 10000);
        };
        utterance.onend = onEndOrError;
        utterance.onerror = (e) => { console.error("TTS error:", e.error); onEndOrError(); };
        speechSynthesis.speak(utterance);
    }, [isSpeaking, cancelAllSpeech]);

    const playSound = useCallback((text: string) => {
        if (!text) return;
        const chunks = text.match(/[\s\S]{1,180}/g) || [];
        speechQueueRef.current.push(...chunks.filter(c => c.trim()));
        processSpeechQueue();
    }, [processSpeechQueue]);

    const sendPromptToAI = useCallback(async (prompt: string) => {
        const trimmedInput = prompt.trim();
        if (!trimmedInput || isLoading) return;

        const newMessage: Message = { role: "user", content: trimmedInput, timestamp: getCurrentTimestamp() };
        setMessages(prev => [...prev, newMessage]);
        setInput("");
        setIsLoading(true);
        setError(null);

        const contextMessages = [...messages, newMessage].slice(-6).map(m => ({ role: m.role, content: m.content }));

        try {
            const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333/api/chat";
            const response = await fetch(backendUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: contextMessages }),
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.reply?.content) {
                const newAssistantMessage: Message = { role: "assistant", content: data.reply.content, timestamp: getCurrentTimestamp(), provider: data.reply.provider };
                setMessages(prev => [...prev, newAssistantMessage]);
                playSound(data.reply.content);
            } else { throw new Error("Invalid response from server."); }
        } catch (err: any) {
            const errorMessage = err.message || "Failed to get response from server.";
            setError(errorMessage);
            setMessages(prev => [...prev, { role: "assistant", content: `Error: ${errorMessage}`, timestamp: getCurrentTimestamp(), provider: "System Error" }]);
            playSound(`An error occurred: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, playSound]);

    const handleFormSubmit = useCallback((e: React.FormEvent) => {
        e.preventDefault();
        sendPromptToAI(input);
    }, [input, sendPromptToAI]);

    useEffect(() => {
        const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognitionAPI) { console.warn("STT not supported."); return; }

        const recognition = new SpeechRecognitionAPI();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'id-ID';

        recognition.onstart = () => { setIsListening(true); cancelAllSpeech(); };
        recognition.onend = () => { setIsListening(false); if (recognitionRef.current) setTimeout(() => recognitionRef.current?.start(), 500); };
        recognition.onerror = (e) => { console.error('STT error:', e.error, e.message); if (e.error === 'not-allowed') setError('Microphone access denied.'); };
        recognition.onresult = (e) => {
            const transcript = e.results[e.results.length - 1][0].transcript.trim().toLowerCase();
            if (!transcript) return;
            console.log("Transcript:", transcript);
            if (isNovaResponding) {
                if (transcript === "nova off") setIsNovaResponding(false);
                else { sendPromptToAI(transcript); setIsNovaResponding(false); }
            } else if (transcript.includes("nova")) {
                playSound("Iya, tuan");
                setIsNovaResponding(true);
                setError(null);
            }
        };
        recognitionRef.current = recognition;
        try { recognition.start(); } catch (e) { console.error("Could not start STT:", e); setError("Failed to start STT."); }
        return () => { recognition.abort(); recognitionRef.current = null; };
    }, [isNovaResponding, playSound, sendPromptToAI, cancelAllSpeech]);

    useEffect(() => {
        const setupSTTAnalyser = async () => {
            if (!isListening) {
                sttMediaStreamRef.current?.getTracks().forEach(track => track.stop());
                sttMediaStreamSourceRef.current?.disconnect();
                analyserNodeRef.current?.disconnect();
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                sttMediaStreamRef.current = stream;
                const audioContext = await ensureAudioContext();
                if (audioContext) {
                    sttMediaStreamSourceRef.current = audioContext.createMediaStreamSource(stream);
                    analyserNodeRef.current = audioContext.createAnalyser();
                    sttMediaStreamSourceRef.current.connect(analyserNodeRef.current);
                }
            } catch (err) {
                console.error("Error accessing microphone for STT visualization:", err);
                setError("Could not access microphone for visualization.");
            }
        };
        setupSTTAnalyser();
        return () => {
            sttMediaStreamRef.current?.getTracks().forEach(track => track.stop());
            sttMediaStreamSourceRef.current?.disconnect();
            analyserNodeRef.current?.disconnect();
        };
    }, [isListening, ensureAudioContext]);

    useEffect(() => { messagesContainerRef.current?.scrollTo({ top: messagesContainerRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);
    useEffect(() => { autoGrowTextarea(); }, [input, autoGrowTextarea]);
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://192.168.100.55:3333";
                const response = await fetch(`${backendUrl}/api/logs`);
                setBackendLogs(await response.json());
            } catch (err) { console.error("Error fetching logs:", err); }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className={styles.appContainer}>
            <div className={styles.logViewerContainer} data-collapsed={!showLogViewer}>
                <div className={styles.logViewerHeader}>
                    <h2>Backend Logs</h2>
                    <button className={styles.iconButton} onClick={toggleLogViewer} aria-label="Close logs"><CloseIcon /></button>
                </div>
                <div className={styles.logViewerContent}>
                    {backendLogs.length > 0 ? backendLogs.map((log, index) => (
                        <div key={index} className={`${styles.logEntry} ${styles[log.level]}`}>
                            <div className={styles.logHeader}>
                                <span className={styles.logLevel}>[{log.level.toUpperCase()}]</span>
                                <span className={styles.logTimestamp}>{log.timestamp}</span>
                            </div>
                            <div className={styles.logMessage}>{log.message}</div>
                        </div>
                    )) : <p>No logs available.</p>}
                </div>
            </div>

            <div className={styles.mainPanel}>
                <header className={styles.appHeader}>
                    <h1>Nova AI Assistant</h1>
                    <button className={styles.iconButton} onClick={toggleLogViewer} aria-label="Toggle logs"><LogIcon /></button>
                </header>

                <main className={styles.mainContent}>
                    {(isListening || isSpeaking) && (
                        <div className={styles.unifiedWaveformDisplayContainer}>
                            <VoiceWaveform analyserNode={analyserNodeRef.current} isListening={isListening} isSpeaking={isSpeaking} />
                            <p className={styles.waveformStatusText}>
                                {isNovaResponding ? "Nova is active: Listening..." : (isListening ? "Listening for 'Nova'..." : "Speaking...")}
                            </p>
                        </div>
                    )}
                    <div ref={messagesContainerRef} className={styles.messagesListContainer}>
                        {messages.map((msg, index) => (
                            <MessageCard key={index} role={msg.role} message={msg.content} timestamp={msg.timestamp} onPlaySound={playSound} provider={msg.provider} />
                        ))}
                        {isLoading && (
                            <div className={styles.loadingIndicatorContainer}>
                                <div className={styles.loadingIndicatorBubble}>
                                    <div className={styles.loadingDots}> <div/> <div/> <div/> </div>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {error && !isLoading && ( <div className={styles.errorMessageContainer}> <strong>Error:</strong> {error} </div> )}

                <form onSubmit={handleFormSubmit} className={styles.messageInputForm}>
                    <div className={styles.inputFormInnerWrapper}>
                        <textarea
                            ref={textareaRef}
                            placeholder={isNovaResponding ? "Listening..." : "Say 'Nova' or type here..."}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleFormSubmit(e); }}
                            className={styles.inputTextArea}
                            rows={1}
                            disabled={isLoading || isSpeaking}
                        />
                        <button type="submit" disabled={!input.trim() || isLoading || isSpeaking} className={styles.sendButton} aria-label="Send message"><SendIcon /></button>
                        <button
                            type="button"
                            onClick={() => recognitionRef.current && (isListening ? recognitionRef.current.stop() : recognitionRef.current.start())}
                            className={`${styles.iconButton} ${isListening ? styles.micButtonListening : ''}`}
                            disabled={isLoading || isSpeaking}
                            aria-label={isListening ? "Stop listening" : "Start listening"}
                        ><MicIcon /></button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default App;