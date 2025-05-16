import React, { useState, useEffect, useRef } from 'react'
import { SceneWithVideo } from '../types'

interface VideoProgressProps {
  scene: SceneWithVideo
}

const VideoProgress: React.FC<VideoProgressProps> = ({ scene }) => {
  const startTime = scene.videoRequestStartTime || 0;
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 컴포넌트 마운트 시 초기 경과 시간 계산
  useEffect(() => {
    if (startTime > 0) {
      const initialElapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(initialElapsed);
    }
  }, []);
  
  // 타이머 업데이트 - 컴포넌트가 마운트되면 1초마다 업데이트
  useEffect(() => {
    // 이전 타이머 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (startTime > 0 && scene.videoStatus === 'pending') {
      intervalRef.current = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(newElapsed);
      }, 1000);
    }
    
    // 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [startTime, scene.videoStatus]);
  
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
}

export default VideoProgress;