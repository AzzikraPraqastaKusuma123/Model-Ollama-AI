import React from 'react';
import styles from './MessageCard.module.css';

interface MessageCardProps {
    role: "assistant" | "user";
    message: string;
    timestamp: string;
    onPlaySound: (text: string) => void;
    audioData?: any;
    provider?: string;
}

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm6.39-2.908a.75.75 0 0 1 .98 1.044l-3.25 3.5a.75.75 0 0 1-1.044-.98l3.25-3.5a.75.75 0 0 1 .064-.064Z" clipRule="evenodd" />
    </svg>
);

export const MessageCard: React.FC<MessageCardProps> = ({ role, message, timestamp, onPlaySound, provider }) => {
    const isUser = role === "user";
    const cardClass = isUser ? styles.userMessage : styles.assistantMessage;
    const contentClass = isUser ? styles.userContent : styles.assistantContent;
    const avatarClass = isUser ? styles.userAvatar : styles.assistantAvatar;

    const handlePlayClick = () => {
        onPlaySound(message);
    };

    const Avatar = ({ children }: { children: React.ReactNode }) => (
        <div className={`${styles.avatar} ${avatarClass}`}>
            {children}
        </div>
    );

    return (
        <div className={`${styles.messageCard} ${cardClass}`}>
            <div className={styles.messageHeader}>
                <span className={styles.messageRole}>{isUser ? "You" : "Nova AI"}</span>
                <span className={styles.messageTimestamp}>{timestamp}</span>
            </div>
            <div className={styles.contentWrapper}>
                <Avatar>{isUser ? "Y" : "AI"}</Avatar>
                <div className={contentClass}>
                    <p>{message}</p>
                    {!isUser && (
                        <div className={styles.assistantActions}>
                            <button onClick={handlePlayClick} className={styles.playButton} aria-label="Play message audio">
                                <PlayIcon />
                            </button>
                            {provider && <span className={styles.providerTag}>via {provider}</span>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};