"use client";

import { useState } from "react";

/**
 * 欠席連絡のデモコンポーネント
 */
export function DemoAbsence() {
    const [formData, setFormData] = useState({
        studentNumber: "",
        name: "",
        type: "",
        reason: "",
        timeStepOut: "",
        timeReturn: "",
        timeLeavingEarly: "",
    });

    const [submitStatus, setSubmitStatus] = useState<{
        type: "success" | "error" | null;
        message: string;
    }>({ type: null, message: "" });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitStatus({
            type: "success",
            message: "欠席連絡を送信しました（デモ）",
        });

        setTimeout(() => {
            setSubmitStatus({ type: null, message: "" });
            setFormData({
                studentNumber: "",
                name: "",
                type: "",
                reason: "",
                timeStepOut: "",
                timeReturn: "",
                timeLeavingEarly: "",
            });
        }, 2000);
    };

    return (
        <div className="space-y-4">
            {submitStatus.type && (
                <div
                    className={`alert ${
                        submitStatus.type === "success"
                            ? "alert-success"
                            : "alert-error"
                    }`}
                >
                    <span>{submitStatus.message}</span>
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                {/* 学籍番号 */}
                <div className="form-control">
                    <label className="label">
                        <span className="label-text text-sm font-semibold">
                            学籍番号 <span className="text-error">*</span>
                        </span>
                    </label>
                    <input
                        type="text"
                        placeholder="例: 12345678"
                        className="input input-bordered input-sm w-full"
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

                {/* 氏名 */}
                <div className="form-control">
                    <label className="label">
                        <span className="label-text text-sm font-semibold">
                            氏名 または あだ名{" "}
                            <span className="text-error">*</span>
                        </span>
                    </label>
                    <input
                        type="text"
                        placeholder="例: 山田 太郎"
                        className="input input-bordered input-sm w-full"
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
                        <span className="label-text text-sm font-semibold">
                            種別 <span className="text-error">*</span>
                        </span>
                    </label>
                    <select
                        className="select select-bordered select-sm w-full"
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
                        <span className="label-text text-sm font-semibold">
                            理由 <span className="text-error">*</span>
                        </span>
                    </label>
                    <textarea
                        placeholder="欠席・遅刻の理由を入力してください"
                        className="textarea textarea-bordered textarea-sm w-full h-16"
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
                    <div className="space-y-3 p-3 bg-base-200/50 rounded-lg border border-base-300">
                        <h4 className="font-semibold text-sm">中抜け情報</h4>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">
                                    抜ける時間
                                </span>
                            </label>
                            <input
                                type="time"
                                className="input input-bordered input-sm w-full"
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
                                <span className="label-text text-sm">
                                    活動に戻る時間
                                </span>
                            </label>
                            <input
                                type="time"
                                className="input input-bordered input-sm w-full"
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
                    <div className="space-y-3 p-3 bg-base-200/50 rounded-lg border border-base-300">
                        <h4 className="font-semibold text-sm">早退情報</h4>
                        <div className="form-control">
                            <label className="label">
                                <span className="label-text text-sm">
                                    早退する時間を入力してください
                                </span>
                            </label>
                            <input
                                type="time"
                                className="input input-bordered input-sm w-full"
                                value={formData.timeLeavingEarly}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        timeLeavingEarly: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>
                )}

                {/* 送信ボタン */}
                <div className="flex gap-2">
                    <button
                        type="submit"
                        className="btn btn-primary btn-sm flex-1"
                    >
                        送信
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm flex-1"
                        onClick={() =>
                            setFormData({
                                studentNumber: "",
                                name: "",
                                type: "",
                                reason: "",
                                timeStepOut: "",
                                timeReturn: "",
                                timeLeavingEarly: "",
                            })
                        }
                    >
                        クリア
                    </button>
                </div>
            </form>

            <p className="text-xs text-base-content/50 text-center">
                これはデモ表示です。実際の送信は行われません。
            </p>
        </div>
    );
}
