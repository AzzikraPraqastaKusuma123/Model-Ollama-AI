import React from 'react';
import styles from './MessageCard.module.css';

type MessageCardProps = {
    role: "assistant" | "user";
    message: string;
    timestamp: string;
    onPlaySound?: (textOrAudioData: string | any) => void;
    audioData?: any; 
    provider?: string;
};

export const MessageCard = (props: MessageCardProps) => {
    const isUser = props.role === "user";

    const handlePlaySound = () => {
        if (props.onPlaySound) {
            if (props.audioData) {
                props.onPlaySound(props.audioData);
            } else if (!isUser && props.message) { 
                props.onPlaySound(props.message);
            }
        }
    };

    const UserAvatar = <div className={`${styles.avatar} ${styles.avatarUser}`}>U</div>;
    const AssistantAvatar = <div className={`${styles.avatar} ${styles.avatarAssistant}`}>A</div>;

    return (
        <div className={`${styles.messageWrapper} ${isUser ? styles.user : styles.assistant}`}>
            {!isUser && AssistantAvatar}
            
            <div className={styles.contentWrapper}>
                <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAssistant}`}>
                    <p className={styles.messageText}>{props.message}</p>
                </div>
                <div className={styles.metaContainer}>
                    <span className={styles.timestamp}>
                        {props.timestamp}
                    </span>
                    {!isUser && props.provider && (
                        <span className={styles.providerText}>via {props.provider}</span>
                    )}
                </div>
            </div>

            {isUser && UserAvatar}
        </div>
    );
};
