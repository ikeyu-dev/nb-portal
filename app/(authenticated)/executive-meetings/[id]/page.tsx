import { ExecutiveMeetingDetail } from "../ui/ExecutiveMeetingDetail";

export default async function ExecutiveMeetingPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <ExecutiveMeetingDetail id={id} />;
}
