import React, { useState, useEffect } from 'react';
import { HammyState } from '../HammyWidget';

interface HammyCharacterProps {
    state: HammyState;
    isDragging: boolean;
}

// 이미지 파일을 정적으로 import
let hammyIdleImage = null;
let hammyTypingImage = null;
let hammyExcitedImage = null;
let hammySleepingImage = null;

try {
    hammyIdleImage = require('../assets/images/hammy-idle.png');
} catch {
    // 이미지 파일이 없으면 null
}

try {
    hammyTypingImage = require('../assets/images/hammy-typing.png');
} catch {
    // 이미지 파일이 없으면 null
}

try {
    hammyExcitedImage = require('../assets/images/hammy-excited.png');
} catch {
    // 이미지 파일이 없으면 null
}

try {
    hammySleepingImage = require('../assets/images/hammy-sleeping.png');
} catch {
    // 이미지 파일이 없으면 null
}

const imageMap = {
    idle: hammyIdleImage,
    typing: hammyTypingImage,
    excited: hammyExcitedImage,
    sleeping: hammySleepingImage
};

const HammyCharacter: React.FC<HammyCharacterProps> = ({ state, isDragging }) => {
    const [useImages, setUseImages] = useState(false);

    useEffect(() => {
        // 이미지 파일이 있는지 확인
        const hasImages = Object.values(imageMap).some(img => img !== null);
        setUseImages(hasImages);
    }, []);

    // 이미지가 있으면 이미지 사용
    if (useImages && imageMap[state]) {
        return (
            <div className={`hammy-character hammy-image hammy-${state} ${isDragging ? 'dragging' : ''}`}>
                <img
                    src={imageMap[state]}
                    alt={`Hammy ${state}`}
                    draggable={false}
                />
            </div>
        );
    }

    // 이미지가 없으면 햄스터 이모지 사용 (fallback)
    return (
        <div className={`hammy-character hammy-emoji hammy-${state} ${isDragging ? 'dragging' : ''}`}>
            <div className="hammy-emoji-container">
                <div className="hammy-emoji-main">
                    {getHammyEmoji(state)}
                </div>
                {/* 상태별 추가 이모티콘 표시 */}
                <div className="hammy-emotion">
                    {getEmotionIcon(state)}
                </div>
            </div>
        </div>
    );
};

// 상태별 햄스터 이모지
const getHammyEmoji = (state: HammyState): string => {
    switch (state) {
        case 'sleeping':
            return '😴';
        case 'excited':
            return '🤩';
        case 'typing':
            return '🤓';
        default:
            return '🐹';
    }
};

// 상태별 이모티콘
const getEmotionIcon = (state: HammyState): string => {
    switch (state) {
        case 'typing':
            return '⌨️';
        case 'excited':
            return '✨';
        case 'sleeping':
            return '💤';
        default:
            return '';
    }
};

export default HammyCharacter;