'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { Bell, LogOut } from 'lucide-react'

type UserRole = 'admin' | 'teacher' | 'student' | 'validator' | null

type NavItem = {
    label: string
    href: string
    roles?: UserRole[]
}

type NotificationItem = {
    notificationId: number
    message: string
    status: 'PENDING' | 'SENT' | 'FAILED'
    createdAt: string
    targetUrl: string
}

const ALL_NAV_ITEMS: NavItem[] = [
    { label: 'Accueil', href: '/accueil' },
    { label: 'Mes réservations', href: '/reservations', roles: ['teacher', 'student'] },
    // Seul le validator valide les demandes, pas l'admin
    { label: 'Demandes', href: '/demandes', roles: ['validator'] },
    { label: 'Rechercher', href: '/recherche', roles: ['teacher', 'student', 'admin'] },
    { label: 'Planning', href: '/calendrier', roles: ['teacher', 'student', 'admin', 'validator'] },
    { label: 'Statistiques', href: '/statistiques', roles: ['admin'] },
    { label: 'Logs', href: '/logs', roles: ['admin'] },
    { label: 'Utilisateurs', href: '/utilisateurs', roles: ['admin'] },
    { label: 'Salles', href: '/salles', roles: ['admin'] },
]

const CACHE_KEY = 'rb_auth'

type AuthCache = {
    role: UserRole
    username: string | null
}

/** Lit le cache sessionStorage sans lever d'exception */
function readCache(): AuthCache | null {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY)
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

/** Écrit dans le cache sessionStorage */
function writeCache(data: AuthCache) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
    } catch { /* ignore */ }
}

/** Efface le cache à la déconnexion */
function clearCache() {
    try {
        sessionStorage.removeItem(CACHE_KEY)
    } catch { /* ignore */ }
}

export default function Topbar() {
    const pathname = usePathname()
    const router = useRouter()
    const [loggingOut, setLoggingOut] = useState(false)
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

    // Initialisation à null côté SSR (safe pour l'hydratation)
    const [role, setRole] = useState<UserRole>(null)
    const [username, setUsername] = useState<string | null>(null)

    // Notifications state
    const [notifications, setNotifications] = useState<NotificationItem[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isNotifOpen, setIsNotifOpen] = useState(false)
    const notifRef = useRef<HTMLDivElement>(null)

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications')
            if (res.ok) {
                const data = await res.json()
                setNotifications(data.notifications || [])
                setUnreadCount(data.unreadCount || 0)
            }
        } catch { /* silencieux */ }
    }

    // Hydratation depuis le cache sessionStorage (uniquement côté client)
    useEffect(() => {
        const cached = readCache()
        if (cached?.role) {
            setRole(cached.role)
            setUsername(cached.username ?? null)
        }
    }, [])

    // Fetch identité une seule fois — met à jour le cache
    useEffect(() => {
        fetch('/api/auth/me')
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (!data) return
                const newRole = (data.roleName as UserRole) ?? null
                const newUsername = (data.username as string) ?? null
                setRole(newRole)
                setUsername(newUsername)
                writeCache({ role: newRole, username: newUsername })

                if (newRole) {
                    fetchNotifications()
                    const interval = setInterval(fetchNotifications, 10000)
                    return () => clearInterval(interval)
                }
            })
            .catch(() => { })
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Fermer dropdown si clic extérieur
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const navItems = ALL_NAV_ITEMS.filter(
        (item) => !item.roles || (role && item.roles.includes(role))
    )

    async function handleLogout() {
        clearCache()
        setShowLogoutConfirm(false)
        setLoggingOut(true)
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            router.push('/login')
            router.refresh()
        } catch {
            router.push('/login')
        } finally {
            setLoggingOut(false)
        }
    }

    async function handleNotificationClick(n: NotificationItem) {
        if (n.status === 'PENDING') {
            try {
                await fetch(`/api/notifications/${n.notificationId}`, { method: 'PATCH' })
                fetchNotifications()
            } catch { /* ignore */ }
        }
        setIsNotifOpen(false)
        router.push(n.targetUrl)
        router.refresh()
    }

    async function handleMarkAllAsRead() {
        try {
            const res = await fetch('/api/notifications/read-all', { method: 'POST' })
            if (res.ok) fetchNotifications()
        } catch { /* ignore */ }
    }

    const roleLabel: Record<string, string> = {
        admin: 'Administrateur',
        teacher: 'Enseignant',
        student: 'Étudiant',
        validator: 'Service Validateur',
    }

    const roleColor: Record<string, string> = {
        admin: 'bg-amber-900/40 text-amber-200',
        teacher: 'bg-brun-700/40 text-brun-200',
        student: 'bg-brun-600/30 text-brun-300',
        validator: 'bg-indigo-900/40 text-indigo-200',
    }

    return (
        <>
        {/* Modal de confirmation de déconnexion */}
        {showLogoutConfirm && (
            <div
                className="fixed inset-0 bg-brun-950/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
                onClick={() => setShowLogoutConfirm(false)}
            >
                <div
                    className="bg-white border border-[#d3bd9d] p-7 w-full max-w-sm shadow-2xl rounded-sm"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 bg-brun-100 flex items-center justify-center rounded-sm flex-shrink-0">
                            <LogOut className="w-4 h-4 text-brun-700" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-brun-900">Déconnexion</h2>
                            <p className="text-xs text-brun-500 mt-0.5">Voulez-vous vraiment vous déconnecter ?</p>
                        </div>
                    </div>
                    <div className="flex gap-2.5 justify-end">
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            className="px-4 py-2 border border-brun-300 text-brun-700 hover:bg-brun-100 text-xs uppercase tracking-wider cursor-pointer rounded-sm font-medium"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            className="px-4 py-2 bg-brun-900 text-white hover:bg-brun-950 text-xs uppercase tracking-wider cursor-pointer rounded-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            {loggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <header
            className="bg-brun-900 h-[62px] flex items-center justify-between px-6 text-brun-100 relative z-30 flex-shrink-0"
            style={{ boxShadow: 'var(--shadow-topbar)' }}
        >
            {/* Logo */}
            <Link href="/accueil" className="flex items-center gap-2 group flex-shrink-0">
                <span className="text-sm font-semibold tracking-wider uppercase text-white">
                    Room<span className="text-brun-400 font-normal">Book</span>
                </span>
            </Link>

            {/* Navigation — toujours visible même pendant le chargement */}
            <nav className="flex items-center gap-1 text-[11.5px] uppercase tracking-wider font-medium">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-3 py-1.5 rounded-sm transition-colors duration-100 ${isActive
                                ? 'bg-brun-700/60 text-white'
                                : 'text-brun-300 hover:bg-brun-800/60 hover:text-white'
                                }`}
                        >
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Zone droite */}
            <div className="flex items-center gap-3 flex-shrink-0">

                {/* Badge rôle + username */}
                {username && role && (
                    <Link href="/profil" className="hidden lg:flex items-center gap-2 hover:opacity-90 cursor-pointer">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-none font-medium ${roleColor[role] ?? 'bg-brun-700/30 text-brun-300'}`}>
                            {roleLabel[role] ?? role}
                        </span>
                        <span className="text-brun-300 hover:text-white transition-colors text-xs font-medium underline underline-offset-2">{username}</span>
                    </Link>
                )}

                {/* Séparateur */}
                {username && role && (
                    <div className="w-px h-5 bg-brun-700 hidden lg:block" />
                )}

                {/* Cloche notifications */}
                {username && (
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => setIsNotifOpen(!isNotifOpen)}
                            className={`relative flex items-center justify-center w-8 h-8 rounded-sm cursor-pointer transition-colors ${isNotifOpen ? 'bg-brun-700 text-white' : 'text-brun-400 hover:bg-brun-800 hover:text-white'}`}
                            aria-label="Notifications"
                        >
                            <Bell className="w-4 h-4" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border-2 border-brun-900">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {isNotifOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#d3bd9d] shadow-xl text-encre text-left z-50 rounded-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-brun-100 flex justify-between items-center bg-brun-050">
                                    <span className="text-xs font-semibold text-brun-900 tracking-wide uppercase">Notifications</span>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllAsRead}
                                            className="text-[10px] text-brun-600 hover:text-brun-900 font-medium underline uppercase tracking-wider cursor-pointer"
                                        >
                                            Tout marquer comme lu
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-brun-500 text-xs">
                                            <Bell className="w-6 h-6 mx-auto mb-2 text-brun-300" />
                                            Aucune notification
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-brun-100">
                                            {notifications.map((n) => (
                                                <button
                                                    key={n.notificationId}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`w-full px-4 py-3 text-left hover:bg-brun-050 flex gap-3 items-start cursor-pointer ${n.status === 'PENDING' ? 'bg-amber-50/50' : ''}`}
                                                >
                                                    <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.status === 'PENDING' ? 'bg-amber-500' : 'bg-brun-200'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`block text-xs leading-relaxed ${n.status === 'PENDING' ? 'text-brun-900 font-medium' : 'text-brun-600'}`}>
                                                            {n.message}
                                                        </span>
                                                        <span className="text-[10px] text-brun-400 mt-0.5 block">
                                                            {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Déconnexion */}
                <button
                    onClick={() => setShowLogoutConfirm(true)}
                    disabled={loggingOut}
                    className="flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider text-brun-400 hover:text-white cursor-pointer disabled:opacity-50 px-2 py-1.5 rounded-sm hover:bg-brun-800 transition-colors font-medium"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
                </button>
            </div>
        </header>
        </>
    )
}
