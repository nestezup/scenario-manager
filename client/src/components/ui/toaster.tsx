import React, { useState, useCallback } from 'react'
import Toast from './toast'
import { useToast } from '../../hooks/use-toast'

export const Toaster: React.FC = () => {
  const { toasts, removeToast } = useToast()
  
  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          show={true}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  )
}