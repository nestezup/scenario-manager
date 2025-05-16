import React, { useState, useEffect, useRef, memo } from 'react'
import { SceneWithVideo } from '../types'

interface VideoProgressProps {
  scene: SceneWithVideo
}

// memo를 사용하여 불필요한 리렌더링 방지
const VideoProgress: React.FC<VideoProgressProps> = memo(({ scene }) => {
  // 시작 시간은 실제로 매우 큰 타임스탬프입니다. 이를 유효하게 처리해야 합니다.
  const startTime = scene.videoRequestStartTime || 0;
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);
  
  // 컴포넌트 마운트 시 초기화 (한 번만 실행)
  useEffect(() => {
    // 이미 초기화되었으면 실행하지 않음
    if (initialized.current) return;
    
    // 유효한 시작 시간이 있는지 확인
    if (startTime > 0) {
      // 현재 시간과 비교하여 경과 시간 계산
      const now = Date.now();
      
      // 현실적인 시간 차이인지 확인 (최대 10분 = 600초)
      // 10분 이상이면 타이머를 0부터 시작
      if (now - startTime > 600000) {
        setElapsedTime(0);
      } else {
        const initialElapsed = Math.floor((now - startTime) / 1000);
        setElapsedTime(initialElapsed);
      }
      
      initialized.current = true;
    } else {
      // 시작 시간이 없으면 0으로 설정
      setElapsedTime(0);
      initialized.current = true;
    }
  }, []);
  
  // 타이머 업데이트 로직 - 1초마다 증가
  useEffect(() => {
    // 이전 타이머 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (scene.videoStatus === 'pending') {
      // 타이머 시작 (1초마다 증가)
      intervalRef.current = setInterval(() => {
        setElapsedTime(prevTime => prevTime + 1);
      }, 1000);
    }
    
    // 컴포넌트 언마운트 또는 의존성 변경 시 타이머 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [scene.videoStatus]);
  
  // 애니메이션을 위한 점 및 진행률 계산
  const dots = '.'.repeat((elapsedTime % 6) + 1); // 1~6개의 점을 번갈아 표시
  const progress = Math.min((elapsedTime / 60) * 100, 95); // 최대 95%까지만 표시 (60초 기준)
  
  return (
    <>
      <div className="text-amber-500 text-sm mb-2">영상 생성 진행 중{dots} (30초~1분 소요)</div>
      <div className="w-full h-2 bg-gray-200 rounded-full">
        <div 
          className="h-2 bg-blue-500 rounded-full transition-all duration-500" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-1">{elapsedTime}초 경과</div>
    </>
  );
});

export default VideoProgress;