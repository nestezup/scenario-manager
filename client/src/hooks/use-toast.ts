import { useState, useCallback } from 'react'
import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => 
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id: Math.random().toString(36).substring(2, 9) }]
    })),
  removeToast: (id) => 
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
}))

export const useToast = () => {
  const { toasts, addToast, removeToast } = useToastStore()
  
  const toast = useCallback(
    ({ message, type = 'info' }: { message: string; type?: ToastType }) => {
      const id = addToast({ message, type })
      
      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        removeToast(id as unknown as string)
      }, 3000)
      
      return id
    },
    [addToast, removeToast]
  )
  
  return { toasts, toast, removeToast }
}