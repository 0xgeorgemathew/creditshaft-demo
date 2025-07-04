// src/components/loan/ToastSystem.tsx
"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";
import { ToastNotification } from "@/hooks/useToast";

interface ToastProps {
  toast: ToastNotification;
  onClose: (id: string) => void;
}

function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getToastStyles = (type: string) => {
    switch (type) {
      case "success":
        return "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-200";
      case "error":
        return "border-red-500/30 bg-gradient-to-r from-red-500/10 to-red-600/10 text-red-200";
      case "info":
        return "border-blue-600/30 bg-gradient-to-r from-blue-600/10 to-blue-700/10 text-blue-200";
      default:
        return "border-gray-500/30 bg-gradient-to-r from-gray-500/10 to-slate-500/10 text-gray-200";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return <CheckCircle size={20} className="text-emerald-300" />;
      case "error":
        return <XCircle size={20} className="text-red-400" />;
      case "info":
        return <AlertCircle size={20} className="text-blue-400" />;
      default:
        return <AlertCircle size={20} className="text-gray-300" />;
    }
  };

  return (
    <div
      className={`glassmorphism rounded-xl p-4 border ${getToastStyles(
        toast.type
      )} transform transition-all duration-300 animate-slide-in shadow-xl`}
    >
      <div className="flex items-start gap-3">
        {getIcon(toast.type)}
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm mb-1">
            {toast.title}
          </h4>
          <p className="text-xs leading-relaxed">{toast.message}</p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastNotification[];
  onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}