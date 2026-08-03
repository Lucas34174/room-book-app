import { redirect } from 'next/navigation'

// /dashboard redirects to /accueil (the actual home page)
export default function DashboardPage() {
    redirect('/accueil')
}
