# Hammy 캐릭터 이미지 가이드

## 📁 필요한 이미지 파일들

### 기본 상태 이미지
- `hammy-idle.png` - 기본 대기 상태 (부드러운 호흡 애니메이션용)
- `hammy-typing.png` - 타이핑 중 상태 (집중하는 표정)
- `hammy-excited.png` - 흥분/기쁜 상태 (반짝이는 눈)
- `hammy-sleeping.png` - 잠자는 상태 (감은 눈)

### 이미지 스펙
- **크기**: 80x80 픽셀
- **포맷**: PNG (투명 배경 권장)
- **해상도**: 72 DPI
- **색상**: 주황색 계열 (#FF8C42 기본)

### 디자인 가이드라인
- 귀여운 햄스터 캐릭터
- 둥근 몸체와 작은 귀
- 표정으로 상태 구분
- 일관된 색상 팔레트 사용

### 상태별 특징
1. **Idle (대기)**: 평온한 표정, 일반적인 자세
2. **Typing (타이핑)**: 집중하는 눈, 약간 앞으로 기운 자세
3. **Excited (흥분)**: 반짝이는 눈, 볼이 부푼 모습
4. **Sleeping (잠자기)**: 감은 눈, 편안한 자세

## 🎨 임시 대체 방안
이미지 파일이 없을 경우 다음과 같이 대체됩니다:
- CSS로 구현된 기본 원형 캐릭터
- 이모지 🐹 사용
- 단색 배경의 텍스트 표시

## 📝 사용 방법
```typescript
import idleImage from './assets/images/hammy-idle.png';
import typingImage from './assets/images/hammy-typing.png';
import excitedImage from './assets/images/hammy-excited.png';
import sleepingImage from './assets/images/hammy-sleeping.png';

const imageMap = {
  idle: idleImage,
  typing: typingImage,
  excited: excitedImage,
  sleeping: sleepingImage
};
```