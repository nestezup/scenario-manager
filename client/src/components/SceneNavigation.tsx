import React, { useRef } from 'react'
import { Scene } from '../types'

interface SceneNavigationProps {
  scenes: Scene[]
  activeIndex: number
  onSelect: (index: number) => void
}

const SceneNavigation: React.FC<SceneNavigationProps> = ({ scenes, activeIndex, onSelect }) => {
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      <div ref={sceneSliderRef} className="overflow-x-auto py-2 px-8">
        <div className="flex space-x-4 min-w-max">
          {scenes.map((scene, index) => (
            <div 
              key={scene.id}
              onClick={() => onSelect(index)}
              className={`cursor-pointer border-2 rounded-md p-3 min-w-[180px] max-w-[180px] flex flex-col items-center transition-all ${
                activeIndex === index 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 mb-2">
                <span className="text-gray-700 font-medium">{index + 1}</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2 text-center">{getScenePreview(scene.text)}</p>
              
              {/* Progress Indicator */}
              <div className="w-full mt-2 flex justify-center">
                <svg 
                  className={`h-4 w-4 mx-0.5 ${
                    scene.imagePrompt 
                      ? 'text-green-500' 
                      : 'text-gray-300'
                  }`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                
                <svg 
                  className={`h-4 w-4 mx-0.5 ${
                    scene.images && scene.images.length 
                      ? 'text-green-500' 
                      : 'text-gray-300'
                  }`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                
                <svg 
                  className={`h-4 w-4 mx-0.5 ${
                    scene.selectedImage 
                      ? 'text-green-500' 
                      : 'text-gray-300'
                  }`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                
                <svg 
                  className={`h-4 w-4 mx-0.5 ${
                    scene.videoPrompt 
                      ? 'text-green-500' 
                      : 'text-gray-300'
                  }`}
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button 
          onClick={() => scrollScenes('right')}
          className="bg-white shadow-md rounded-full p-2 text-gray-600 hover:text-gray-800 focus:outline-none z-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SceneNavigation