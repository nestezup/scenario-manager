import React, { useState, useEffect, useRef, memo } from 'react'
import { SceneWithVideo } from '../types'

interface VideoProgressProps {
  scene: SceneWithVideo
}

// memo를 사용하여 불필요한 리렌더링 방지
const VideoProgress: React.FC<VideoProgressProps> = memo(({ scene }) => {
  const startTime = scene.videoRequestStartTime || 0;
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 컴포넌트 마운트 시 초기 경과 시간 계산 및 타이머 시작
  useEffect(() => {
    // 즉시 초기값 설정
    if (startTime > 0) {
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(initialElapsed);
      
      // 타이머 시작 (리렌더링 없이 초기화)
      if (scene.videoStatus === 'pending') {
        // 이전 타이머가 있으면 정리
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // 새 타이머 설정
        intervalRef.current = setInterval(() => {
          setElapsedTime(curr => {
            // 이전 상태를 기반으로 업데이트하여 의존성 문제 방지
            return Math.floor((Date.now() - startTime) / 1000);
          });
        }, 1000);
      }
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, scene.videoStatus]); // 의존성 배열 최소화
  
  // 애니메이션을 위한 점 및 진행률 계산 (매 렌더링마다 새로 계산)
  const dots = '.'.repeat((elapsedTime % 6) + 1); // 1~6개의 점을 번갈아 표시
  const progress = Math.min((elapsedTime / 60) * 100, 95); // 최대 95%까지만 표시 (60초 기준)
  
  // 타이머 주기적 업데이트 강제 트리거
  useEffect(() => {
    const forceUpdateTimer = setInterval(() => {
      // 강제로 상태 업데이트하여 렌더링 트리거
      setElapsedTime(curr => {
        return Math.floor((Date.now() - startTime) / 1000);
      });
    }, 1000);
    
    return () => clearInterval(forceUpdateTimer);
  }, [startTime]);
  
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