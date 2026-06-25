import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { MeetingMemoForm } from "@/features/meeting-memo";

export default function MemoPage() {
    return (
        <div className="w-full px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl">
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
