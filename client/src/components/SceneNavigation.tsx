import React, { useRef } from 'react'
import { useSceneStore } from '../store/sceneStore'

const SceneNavigation: React.FC = () => {
  const { scenes, activeSceneIndex, setActiveSceneIndex } = useSceneStore()
  const sceneSliderRef = useRef<HTMLDivElement>(null)
  
  const getScenePreview = (text: string): string => {
    if (!text) return ''
    return text.length > 50 ? text.substring(0, 50) + '...' : text
  }
  
  const scrollScenes = (direction: 'left' | 'right') => {
    if (!sceneSliderRef.current) return
    
    const scrollAmount = 400
    
    if (direction === 'left') {
      sceneSliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    } else {
      sceneSliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }
  
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 flex items-center">
        <button 
          onClick={() => scrollScenes('left')}
          className="bg-white shadow-md rounded-full p-2 text-gray-600 hover:text-gray-800 focus:outline-none z-10">
          <i className="fas fa-chevron-left"></i>
        </button>
      </div>
      
      <div ref={sceneSliderRef} className="overflow-x-auto scrollbar-hide py-2 px-8">
        <div className="flex space-x-4 min-w-max">
          {scenes.map((scene, index) => (
            <div 
              key={scene.id}
              onClick={() => setActiveSceneIndex(index)}
              className={`cursor-pointer border-2 rounded-md p-3 min-w-[180px] max-w-[180px] flex flex-col items-center transition-all ${
                activeSceneIndex === index 
                  ? 'border-primary-500 bg-primary-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-2">
                <span className="text-gray-700 font-medium">{index + 1}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 text-center">{getScenePreview(scene.text)}</p>
              
              {/* Progress Indicator */}
              <div className="w-full mt-2 flex justify-center">
                <i 
                  className={`${
                    scene.imagePrompt 
                      ? 'fas fa-check-circle text-green-500' 
                      : 'far fa-circle text-gray-300'
                  } mx-0.5`}
                ></i>
                
                <i 
                  className={`${
                    scene.images && scene.images.length 
                      ? 'fas fa-check-circle text-green-500' 
                      : 'far fa-circle text-gray-300'
                  } mx-0.5`}
                ></i>
                
                <i 
                  className={`${
                    scene.selectedImage 
                      ? 'fas fa-check-circle text-green-500' 
                      : 'far fa-circle text-gray-300'
                  } mx-0.5`}
                ></i>
                
                <i 
                  className={`${
                    scene.videoPrompt 
                      ? 'fas fa-check-circle text-green-500' 
                      : 'far fa-circle text-gray-300'
                  } mx-0.5`}
                ></i>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button 
          onClick={() => scrollScenes('right')}
          className="bg-white shadow-md rounded-full p-2 text-gray-600 hover:text-gray-800 focus:outline-none z-10">
          <i className="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  )
}

export default SceneNavigation