import React from 'react';
import styles from './MessageCard.module.css';

interface MessageCardProps {
    role: "assistant" | "user";
    message: string;
    timestamp: string;
    onPlaySound: (text: string) => void;
    audioData?: any; // Untuk data audio TTS jika ada
    provider?: string;
}

export const MessageCard: React.FC<MessageCardProps> = ({ role, message, timestamp, onPlaySound, provider }) => {
    const isUser = role === "user";
    const cardClass = isUser ? styles.userMessage : styles.assistantMessage;
    const contentClass = isUser ? styles.userContent : styles.assistantContent;

    const handlePlayClick = () => {
        onPlaySound(message);
    };

    return (
        <div className={`${styles.messageCard} ${cardClass}`}>
            <div className={styles.messageHeader}>
                <span className={styles.messageRole}>{isUser ? "Anda" : "Nova AI Assistant"}</span>
                <span className={styles.messageTimestamp}>{timestamp}</span>
            </div>
            <div className={contentClass}>
                <p>{message}</p>
                {!isUser && (
                    <div className={styles.assistantActions}>
                        <button onClick={handlePlayClick} className={styles.playButton} aria-label="Dengarkan pesan">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
                            </svg>
                        </button>
                        {provider && <span className={styles.providerTag}>via {provider}</span>}
                    </div>
                )}
            </div>
        </div>
    );
};