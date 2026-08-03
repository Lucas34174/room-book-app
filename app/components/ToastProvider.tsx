'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'
type Toast = {
    message: string
    type: 'success' | 'error' | 'info'
}

const STORAGE_KEY = 'app_toast'


/** Utilitaire : planifier un toast pour la prochaine page */
export function scheduleToast(toast: Toast) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast))
}

export default function ToastProvider() {
    const [toast, setToast] = useState<Toast | null>(null)
    const [visible, setVisible] = useState(false)
    const path = usePathname();
    useEffect(() => {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) return
        sessionStorage.removeItem(STORAGE_KEY)
        try {
            const parsed = JSON.parse(raw) as Toast
            if (parsed.message) {
                setToast(parsed)
                // Petit délai pour déclencher l'animation d'entrée
                requestAnimationFrame(() => setVisible(true))
            }
        } catch {
            // sessionStorage corrompu : on ignore
        }
    }, [path])

    useEffect(() => {
        if (!toast) return
        const timer = setTimeout(() => dismiss(), 10000)
        return () => clearTimeout(timer)
    }, [toast])

    function dismiss() {
        setVisible(false)
        // Attendre la fin de l'animation avant de supprimer le DOM
        setTimeout(() => setToast(null), 350)
    }

    if (!toast) return null

    const colors = {
        success: 'border-l-[3px] border-[#4a5c33] bg-[#eef1e6] text-[#3a4a28]',
        error: 'border-l-[3px] border-brun-700 bg-brun-100 text-brun-800',
        info: 'border-l-[3px] border-brun-500 bg-brun-050 text-brun-800',
    }

    return (
        <div
            role="status"
            aria-live="polite"
            className={`
                fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                flex items-start gap-3
                max-w-md w-[calc(100%-2rem)] px-4 py-3 shadow-lg
                text-[12.5px] font-serif
                transition-all duration-350
                ${colors[toast.type]}
                ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
        >
            <span className="flex-1">{toast.message}</span>
            <button
                type="button"
                onClick={dismiss}
                aria-label="Fermer"
                className="mt-0.5 shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    )
}
