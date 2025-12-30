"use client";

import { ReactNode } from "react";

interface HelpSectionProps {
    id: string;
    title: string;
    description: string;
    tips?: string[];
    children: ReactNode;
}

/**
 * ヘルプセクションコンポーネント
 * 説明文と実際のUIデモを並べて表示する
 */
export function HelpSection({
    id,
    title,
    description,
    tips,
    children,
}: HelpSectionProps) {
    return (
        <section
            id={id}
            className="scroll-mt-20"
        >
            <div className="card bg-base-100 shadow-sm border border-base-300">
                <div className="card-body">
                    <h2 className="card-title text-xl">{title}</h2>
                    <p className="text-base-content/70">{description}</p>

                    {tips && tips.length > 0 && (
                        <div className="mt-4">
                            <h3 className="font-semibold text-sm mb-2">
                                使い方のヒント
                            </h3>
                            <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
                                {tips.map((tip, index) => (
                                    <li key={index}>{tip}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="divider">デモ</div>

                    <div className="border border-dashed border-base-300 rounded-lg p-4 bg-base-200/30">
                        {children}
                    </div>
                </div>
            </div>
        </section>
    );
}
