import { MeetingMemoForm } from "@/features/meeting-memo";

export default function MemoPage() {
    return (
        <div className="container mx-auto px-4 py-6 max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold">部会メモ作成</h1>
                <p className="text-base-content/70 mt-1">
                    部会メモを作成してマークダウン形式でコピーできます
                </p>
            </div>
            <MeetingMemoForm />
        </div>
    );
}
