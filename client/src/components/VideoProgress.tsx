import React, { useState, useEffect } from 'react'
import { SceneWithVideo } from '../types'

interface VideoProgressProps {
  scene: SceneWithVideo
}

const VideoProgress: React.FC<VideoProgressProps> = ({ scene }) => {
  const startTime = scene.videoRequestStartTime || 0;
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // 타이머 업데이트
  useEffect(() => {
    if (startTime > 0 && scene.videoStatus === 'pending') {
      const timer = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - startTime) / 1000);
        setElapsedTime(newElapsed);
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [startTime, scene.videoStatus]);
  
  const dots = '.'.repeat(elapsedTime % 6 + 1); // 1~6개의 점을 번갈아 표시
  const progress = Math.min(elapsedTime / 60 * 100, 95); // 최대 95%까지만 표시 (60초 기준)
  
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