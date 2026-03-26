"use client";

import { useEffect, useRef } from "react";
import mermaid from "mermaid";

/**
 * Mermaidフローチャートコンポーネント
 * @param chart - Mermaid記法のチャート定義文字列
 */
export default function MermaidChart({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: false,
            theme: "neutral",
            flowchart: {
                curve: "linear",
                padding: 20,
            },
        });

        const renderChart = async () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = "";
                try {
                    const { svg } = await mermaid.render(
                        `mermaid-${Date.now()}`,
                        chart
                    );
                    containerRef.current.innerHTML = svg;
                } catch {
                    containerRef.current.innerHTML =
                        '<p class="text-error text-sm">チャートの描画に失敗しました</p>';
                }
            }
        };

        renderChart();
    }, [chart]);

    return (
        <div
            ref={containerRef}
            className="overflow-x-auto"
        />
    );
}
