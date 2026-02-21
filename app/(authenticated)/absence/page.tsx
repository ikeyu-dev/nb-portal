import { Suspense } from "react";
import { auth } from "@/src/auth";
import { AbsenceFormContent } from "./AbsenceFormContent";

export default async function AbsencePage() {
    const session = await auth();
    const studentId = session?.studentId || null;
    const memberName = session?.memberName || null;

    return (
        <Suspense
            fallback={
                <div className="p-4 sm:p-6 max-w-4xl mx-auto">
                    <h1
                        className="font-bold mb-6 max-lg:hidden"
                        style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}
                    >
                        欠席連絡
                    </h1>
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body">
                            <div className="flex justify-center">
                                <span className="loading loading-spinner loading-lg"></span>
                            </div>
                        </div>
                    </div>
                </div>
            }
        >
            <AbsenceFormContent
                studentId={studentId}
                memberName={memberName}
            />
        </Suspense>
    );
}
