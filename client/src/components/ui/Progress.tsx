import React from 'react'

interface ProgressProps {
  percentage: number
}

const Progress: React.FC<ProgressProps> = ({ percentage }) => {
  return (
    <div className="w-44 bg-gray-200 rounded-full h-2.5">
      <div 
        className="bg-primary-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  )
}

export default Progress