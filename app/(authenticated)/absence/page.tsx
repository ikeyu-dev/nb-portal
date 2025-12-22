"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { submitAbsence } from "@/src/shared/api/client";

function AbsenceFormContent() {
    const searchParams = useSearchParams();
    const eventId = searchParams.get("eventId") || "";

    const [formData, setFormData] = useState({
        studentNumber: "",
        name: "",
        type: "",
        reason: "",
        isStepOut: false,
        timeStepOut: "",
        timeReturn: "",
        isLeavingEarly: false,
        timeLeavingEarly: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus({ type: null, message: "" });

        try {
            // GAS APIに送信
            const result = await submitAbsence({
                eventId,
                studentNumber: formData.studentNumber,
                name: formData.name,
                type: formData.type,
                reason: formData.reason,
                timeStepOut: formData.timeStepOut || undefined,
                timeReturn: formData.timeReturn || undefined,
                timeLeavingEarly: formData.timeLeavingEarly || undefined,
            });

            if (result.success) {
                setSubmitStatus({
                    type: "success",
                    message: "欠席連絡を送信しました",
                });

                // フォームをリセット
                setFormData({
                    studentNumber: "",
                    name: "",
                    type: "",
                    reason: "",
                    isStepOut: false,
                    timeStepOut: "",
                    timeReturn: "",
                    isLeavingEarly: false,
                    timeLeavingEarly: "",
                });
            } else {
                throw new Error("送信に失敗しました");
            }
        } catch (error) {
            setSubmitStatus({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "送信に失敗しました。もう一度お試しください。",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
            <h1
                className="font-bold mb-6 max-lg:hidden"
                style={{ fontSize: "clamp(1.5rem, 4vw, 1.875rem)" }}
            >
                欠席連絡
            </h1>

            {submitStatus.type && (
                <div
                    className={`alert ${
                        submitStatus.type === "success"
                            ? "alert-success"
                            : "alert-error"
                    } mb-6`}
                >
                    <span>{submitStatus.message}</span>
                </div>
            )}

            <div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body">
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6"
                    >
                        {/* 学籍番号 */}
                        <div className="form-control">
                            <label className="label">
                                <span
                                    className="label-text font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    学籍番号{" "}
                                    <span className="text-error">*</span>
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="例: 12345678"
                                className="input input-bordered w-full"
                                value={formData.studentNumber}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        studentNumber: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* 氏名 または あだ名 */}
                        <div className="form-control">
                            <label className="label">
                                <span
                                    className="label-text font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    氏名 または あだ名{" "}
                                    <span className="text-error">*</span>
                                </span>
                            </label>
                            <input
                                type="text"
                                placeholder="例: 山田 太郎"
                                className="input input-bordered w-full"
                                value={formData.name}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        name: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* 種別 */}
                        <div className="form-control">
                            <label className="label">
                                <span
                                    className="label-text font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    種別 <span className="text-error">*</span>
                                </span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={formData.type}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        type: e.target.value,
                                    })
                                }
                                required
                            >
                                <option value="">選択してください</option>
                                <option value="欠席">欠席</option>
                                <option value="遅刻">遅刻</option>
                                <option value="中抜け">中抜け</option>
                                <option value="早退">早退</option>
                            </select>
                        </div>

                        {/* 理由 */}
                        <div className="form-control">
                            <label className="label">
                                <span
                                    className="label-text font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    理由 <span className="text-error">*</span>
                                </span>
                            </label>
                            <textarea
                                placeholder="欠席・遅刻の理由を入力してください"
                                className="textarea textarea-bordered w-full h-24"
                                value={formData.reason}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        reason: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* 中抜けの場合 */}
                        {formData.type === "中抜け" && (
                            <div className="space-y-4 p-4 bg-base-200/50 rounded-lg border border-base-300">
                                <h3
                                    className="font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    中抜け情報
                                </h3>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            抜ける時間
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered w-full"
                                        value={formData.timeStepOut}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                timeStepOut: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            活動に戻る時間
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered w-full"
                                        value={formData.timeReturn}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                timeReturn: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        {/* 早退の場合 */}
                        {formData.type === "早退" && (
                            <div className="space-y-4 p-4 bg-base-200/50 rounded-lg border border-base-300">
                                <h3
                                    className="font-semibold"
                                    style={{
                                        fontSize: "clamp(0.875rem, 2vw, 1rem)",
                                    }}
                                >
                                    早退情報
                                </h3>
                                <div className="form-control">
                                    <label className="label">
                                        <span className="label-text">
                                            早退する時間を入力してください
                                        </span>
                                    </label>
                                    <input
                                        type="time"
                                        className="input input-bordered w-full"
                                        value={formData.timeLeavingEarly}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                timeLeavingEarly:
                                                    e.target.value,
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        )}

                        {/* 送信ボタン */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className={`btn btn-primary flex-1 ${
                                    isSubmitting ? "loading" : ""
                                }`}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "送信中..." : "送信"}
                            </button>
                            <a
                                href="/home"
                                className="btn btn-ghost flex-1"
                            >
                                キャンセル
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default function AbsencePage() {
    return (
        <Suspense
            fallback={
                <div className="p-4 sm:p-6 max-w-3xl mx-auto">
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
            <AbsenceFormContent />
        </Suspense>
    );
}
