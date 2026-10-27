import { ExecutiveMeetingDetail } from "../../ui/ExecutiveMeetingDetail";

export default async function ExecutiveMeetingEditPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return (
        <ExecutiveMeetingDetail
            id={id}
            initialEdit
        />
    );
}
