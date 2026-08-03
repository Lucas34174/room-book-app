import RoomEquipmentsClient from './RoomEquipmentsClient'

export default async function RoomEquipmentsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <RoomEquipmentsClient id={id} />
}
