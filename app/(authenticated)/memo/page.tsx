import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { MeetingMemoForm } from "@/features/meeting-memo";

export default function MemoPage() {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center gap-3 mb-6">
                    <FontAwesomeIcon
                        icon={faFileLines}
                        className="text-2xl text-primary"
                    />
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        部会メモ作成
                    </h1>
                </div>

                <MeetingMemoForm />
            </div>
        </div>
    );
}
