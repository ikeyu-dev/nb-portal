import { SurveyDetail } from "../SurveyDetail";

export default async function SurveyPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <SurveyDetail id={id} />;
}
