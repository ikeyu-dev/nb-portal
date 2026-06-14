import { faListCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { auth } from "@/src/auth";
import TasksClient from "./TasksClient";

export default async function TasksPage() {
    const session = await auth();

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <FontAwesomeIcon
                        icon={faListCheck}
                        className="text-2xl text-primary"
                    />
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        タスク管理
                    </h1>
                </div>
                <TasksClient currentStudentId={session?.studentId || null} />
            </div>
        </div>
    );
}
