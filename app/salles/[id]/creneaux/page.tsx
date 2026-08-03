import RoomPeriodsClient from './RoomPeriodsClient'

export default async function RoomPeriodsPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <RoomPeriodsClient id={id} />
}
