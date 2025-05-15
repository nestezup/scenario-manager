import React from 'react'

export interface ToastProps {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
  show: boolean
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, show }) => {
  if (!show) return null
  
  const iconMap = {
    success: 'check-circle',
    error: 'exclamation-circle',
    info: 'info-circle'
  }
  
  const colorMap = {
    success: 'green',
    error: 'red',
    info: 'blue'
  }
  
  const icon = iconMap[type]
  const color = colorMap[type]
  
  return (
    <div
      onClick={onClose}
      className={`fixed bottom-4 right-4 bg-white shadow-lg rounded-lg px-4 py-3 flex items-center cursor-pointer max-w-sm z-50 transform transition-all duration-300 ease-out ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className={`text-${color}-500 mr-3`}>
        <i className={`fas fa-${icon}`}></i>
      </div>
      <p className="text-gray-700">{message}</p>
    </div>
  )
}

export default Toast