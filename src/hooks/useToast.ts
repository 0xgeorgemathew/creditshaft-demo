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
      const id = Math.random().toString(36).substring(2, 11);
      const newToast: ToastNotification = { id, type, title, message };
      setToasts((prev) => [...prev, newToast]);
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