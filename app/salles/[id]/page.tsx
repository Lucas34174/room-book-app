import EditRoomClient from './EditRoomClient'

export default async function EditRoomPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <EditRoomClient id={id} />
}
