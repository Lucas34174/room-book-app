'use client'

import { useEffect, useState, FormEvent } from 'react'
import Link from 'next/link'
import Topbar from '../../../components/Topbar'
import { scheduleToast } from '../../../components/ToastProvider'

type Room = {
    roomId: number
    name: string
}

type CatalogEquipment = {
    equipmentId: number
    name: string
}

type AssociatedEquipment = {
    equipmentId: number
    name: string
    quantity: number
    usable: boolean
}

export default function RoomEquipmentsClient({ id }: { id: string }) {
    const [room, setRoom] = useState<Room | null>(null)
    const [catalog, setCatalog] = useState<CatalogEquipment[]>([])
    const [equipments, setEquipments] = useState<AssociatedEquipment[]>([])

    const [selectedCatalogId, setSelectedCatalogId] = useState<string>('')
    const [quantity, setQuantity] = useState<string>('1')
    const [usable, setUsable] = useState<string>('true')

    const [loading, setLoading] = useState<boolean>(true)
    const [actionLoading, setActionLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [apiError, setApiError] = useState<string | null>(null)

    const fetchAllData = async () => {
        try {
            const [roomRes, equipRes, catalogRes] = await Promise.all([
                fetch(`/api/rooms/${id}`),
                fetch(`/api/rooms/${id}/equipments`),
                fetch('/api/equipments')
            ])

            if (!roomRes.ok || !equipRes.ok || !catalogRes.ok) {
                throw new Error('Erreur lors du chargement des données.')
            }

            const roomData = await roomRes.json()
            const equipData = await equipRes.json()
            const catalogData = await catalogRes.json()

            setRoom(roomData.room)
            setEquipments(equipData.equipments || [])
            setCatalog(catalogData.equipments || [])

            if (catalogData.equipments && catalogData.equipments.length > 0) {
                setSelectedCatalogId(String(catalogData.equipments[0].equipmentId))
            }
        } catch (err: any) {
            setError(err.message || 'Une erreur est survenue.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAllData()
    }, [id])

    async function handleAddOrUpdate(e: FormEvent) {
        e.preventDefault()
        setApiError(null)

        const qtyNum = parseInt(quantity)
        if (!selectedCatalogId) {
            setApiError('Veuillez sélectionner un équipement.')
            return
        }
        if (isNaN(qtyNum) || qtyNum <= 0) {
            setApiError('La quantité doit être supérieure à 0.')
            return
        }

        setActionLoading(true)
        try {
            const res = await fetch(`/api/rooms/${id}/equipments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    equipmentId: parseInt(selectedCatalogId),
                    quantity: qtyNum,
                    usable: usable === 'true'
                })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de l’association.')
            }

            // Refresh equipment list
            await fetchAllData()
            setQuantity('1')
            setUsable('true')
            scheduleToast({
                message: 'Équipement associé avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible d’associer l’équipement.')
        } finally {
            setActionLoading(false)
        }
    }

    async function handleRemove(equipmentId: number) {
        setApiError(null)
        setActionLoading(true)
        try {
            const res = await fetch(`/api/rooms/${id}/equipments/${equipmentId}`, {
                method: 'DELETE'
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la suppression.')
            }

            // Refresh equipment list
            await fetchAllData()
            scheduleToast({
                message: 'Équipement retiré avec succès.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible de retirer l’équipement.')
        } finally {
            setActionLoading(false)
        }
    }

    async function handleToggleUsable(equipmentId: number, currentUsable: boolean) {
        setApiError(null)
        setActionLoading(true)
        try {
            const res = await fetch(`/api/rooms/${id}/equipments/${equipmentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usable: !currentUsable })
            })

            let data: Record<string, any> = {}
            try {
                data = await res.json()
            } catch { /* ignore */ }

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la mise à jour.')
            }

            // Optimistic update: update state without full reload
            setEquipments((prev) =>
                prev.map((eq) =>
                    eq.equipmentId === equipmentId ? { ...eq, usable: !currentUsable } : eq
                )
            )
            scheduleToast({
                message: currentUsable
                    ? 'Équipement marqué en maintenance.'
                    : 'Équipement remis en service.',
                type: 'success'
            })
        } catch (err: any) {
            setApiError(err.message || 'Impossible de modifier le statut.')
        } finally {
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[760px] w-full mx-auto px-8 py-9 text-center text-brun-600 font-sans text-sm">
                    Chargement des équipements de la salle...
                </div>
            </div>
        )
    }

    if (error && !room) {
        return (
            <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
                <Topbar />
                <div className="max-w-[760px] w-full mx-auto px-8 py-9 text-center">
                    <p className="text-red-700 font-sans text-sm mb-4">{error}</p>
                    <Link href="/salles" className="underline text-brun-700 text-xs uppercase tracking-wider font-sans">
                        Retour à la liste des salles
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-brun-050 flex flex-col font-serif">
            <Topbar />

            <div className="max-w-[760px] w-full mx-auto px-8 py-9 flex-1">
                <div className="flex justify-between items-baseline border-b border-[#d3bd9d] pb-3.5 mb-7">
                    <h1 className="text-xl font-normal tracking-wide text-brun-900">
                        Équipements — {room?.name}
                    </h1>
                    <Link
                        href="/salles"
                        className="text-xs text-brun-600 uppercase tracking-wider underline hover:text-brun-900"
                    >
                        Retour
                    </Link>
                </div>

                {/* Liste des équipements de la salle */}
                <div className="bg-white border border-[#d3bd9d] overflow-hidden mb-6.5">
                    {equipments.length === 0 ? (
                        <div className="p-8 text-center text-brun-600 font-sans text-sm">
                            Aucun équipement associé à cette salle.
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse text-[13.5px]">
                            <thead>
                                <tr className="bg-brun-050">
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Équipement
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Quantité
                                    </th>
                                    <th className="font-normal text-[11px] tracking-wider uppercase text-brun-600 border-b border-brun-400 px-3.5 py-2 font-sans">
                                        Utilisable
                                    </th>
                                    <th className="border-b border-brun-400 px-3.5 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {equipments.map((eq) => (
                                    <tr key={eq.equipmentId} className={`transition-colors duration-150 ${!eq.usable ? 'bg-amber-50/60' : 'hover:bg-brun-100/50'}`}>
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans font-medium text-brun-900">
                                            <span className="flex items-center gap-2">
                                                {eq.name}
                                                {!eq.usable && (
                                                    <span className="inline-block py-0.5 px-2 text-[10px] uppercase tracking-wider border text-amber-800 border-amber-400 bg-amber-100 rounded-sm">
                                                        en maintenance
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 font-sans text-brun-850">
                                            {eq.quantity}
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleUsable(eq.equipmentId, eq.usable)}
                                                disabled={actionLoading}
                                                title={eq.usable ? 'Marquer en maintenance' : 'Remettre en service'}
                                                className={`inline-flex items-center gap-1.5 py-0.5 px-2.5 text-[10.5px] uppercase tracking-wider border cursor-pointer disabled:opacity-50 transition-colors ${
                                                    eq.usable
                                                        ? 'text-[#3a4a28] border-[#7c9257] bg-[#eef1e6] hover:bg-[#e2e8d8]'
                                                        : 'text-amber-800 border-amber-400 bg-amber-100 hover:bg-amber-200'
                                                }`}
                                            >
                                                {eq.usable ? 'Utilisable' : 'Maintenance'}
                                            </button>
                                        </td>
                                        <td className="px-3.5 py-3 border-b border-brun-200 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(eq.equipmentId)}
                                                disabled={actionLoading}
                                                className="text-red-700 hover:text-red-900 underline underline-offset-2 text-xs font-sans cursor-pointer disabled:opacity-50"
                                            >
                                                Retirer
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Formulaire d'association d'équipement */}
                <div className="bg-white border border-[#d3bd9d] p-6.5">
                    <div className="text-xs uppercase tracking-widest text-brun-600 border-b border-brun-200 pb-2 mb-4.5 font-sans">
                        Ajouter ou modifier un équipement
                    </div>

                    <form onSubmit={handleAddOrUpdate} className="flex flex-col gap-4.5" noValidate>
                        {apiError && (
                            <div role="alert" className="border-l-[3px] border-brun-700 bg-brun-100 px-3 py-2.5 text-[12.5px] text-brun-800">
                                {apiError}
                            </div>
                        )}

                        <div className="flex gap-4">
                            <div className="flex-[2] flex flex-col">
                                <label htmlFor="equipment-select" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                    Équipement
                                </label>
                                <select
                                    id="equipment-select"
                                    value={selectedCatalogId}
                                    onChange={(e) => setSelectedCatalogId(e.target.value)}
                                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white font-sans"
                                >
                                    {catalog.map((item) => (
                                        <option key={item.equipmentId} value={item.equipmentId}>
                                            {item.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex-1 flex flex-col font-sans">
                                <label htmlFor="equipment-qty" className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                    Quantité
                                </label>
                                <input
                                    id="equipment-qty"
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full px-2.5 py-2 border border-brun-400 bg-brun-050 text-sm text-encre focus:outline-none focus:border-brun-700 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col">
                            <span className="block text-xs uppercase tracking-wide text-brun-700 mb-1.5 font-sans">
                                Équipement utilisable
                            </span>
                            <div className="flex gap-4 font-sans text-sm">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="usable"
                                        value="true"
                                        checked={usable === 'true'}
                                        onChange={() => setUsable('true')}
                                        className="accent-brun-700"
                                    />
                                    Oui
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="usable"
                                        value="false"
                                        checked={usable === 'false'}
                                        onChange={() => setUsable('false')}
                                        className="accent-brun-700"
                                    />
                                    Non
                                </label>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4">
                            <button
                                type="submit"
                                disabled={actionLoading}
                                className="px-6 py-2 bg-brun-800 text-brun-050 text-xs uppercase tracking-wider border border-brun-800 hover:bg-brun-900 cursor-pointer disabled:opacity-50"
                            >
                                {actionLoading ? 'Association...' : 'Ajouter / Enregistrer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
