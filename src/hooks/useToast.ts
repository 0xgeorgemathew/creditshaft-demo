// src/hooks/useToast.ts
import { useState, useCallback } from 'react';

export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback(
    (type: "success" | "error" | "info", title: string, message: string) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
      const newToast: ToastNotification = { id, type, title, message };
      setToasts((prev) => {
        // Prevent duplicate toasts with same title and type
        const existing = prev.find(toast => toast.title === title && toast.type === type);
        if (existing) {
          return prev; // Don't add duplicate
        }
        // Limit to 5 toasts maximum
        const newToasts = [...prev, newToast];
        return newToasts.slice(-5);
      });
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
  };
}