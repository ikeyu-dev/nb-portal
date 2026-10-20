import { SurveyResponses } from "../../SurveyResponses";

export default async function SurveyResponsesPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    return <SurveyResponses id={id} />;
}
