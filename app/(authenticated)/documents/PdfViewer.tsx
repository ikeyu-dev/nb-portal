"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF.jsワーカーの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    src: string;
}

export default function PdfViewer({ src }: PdfViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [scale, setScale] = useState(1);
    const [isPinching, setIsPinching] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const initialDistanceRef = useRef<number | null>(null);
    const initialScaleRef = useRef<number>(1);
    const filename = src.split("/").pop() || "document.pdf";

    // コンテナの幅を監視
    useEffect(() => {
        if (!isFullscreen) return;

        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.clientWidth);
            }
        };

        updateWidth();
        window.addEventListener("resize", updateWidth);
        return () => window.removeEventListener("resize", updateWidth);
    }, [isFullscreen]);

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
    };

    const resetZoom = useCallback(() => {
        setScale(1);
    }, []);

    // ピンチズーム処理
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            initialScaleRef.current = scale;
            setIsPinching(true);
        }
    }, [scale]);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2 && initialDistanceRef.current !== null) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const scaleChange = distance / initialDistanceRef.current;
                const newScale = Math.min(
                    Math.max(initialScaleRef.current * scaleChange, 1),
                    4
                );
                setScale(newScale);
            }
        },
        []
    );

    const handleTouchEnd = useCallback(() => {
        initialDistanceRef.current = null;
        setIsPinching(false);
    }, []);

    // ダブルタップでズーム
    const lastTapRef = useRef<number>(0);
    const handleTap = useCallback(() => {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
            if (scale > 1) {
                setScale(1);
            } else {
                setScale(2);
            }
        }
        lastTapRef.current = now;
    }, [scale]);

    return (
        <>
            <div className="space-y-6">
                {/* PC用: iframeで表示 */}
                <section className="hidden lg:block">
                    <div className="w-full">
                        <iframe
                            src={src}
                            className="w-full h-screen border border-base-300 rounded-lg"
                            title={filename}
                        />
                    </div>
                    <p className="text-sm text-base-content/60 mt-2 text-center">
                        PDFビューアーで表示中
                    </p>
                </section>

                {/* モバイル用: react-pdfで表示 */}
                <section className="lg:hidden">
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="p-6 rounded-full bg-base-200">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 384 512"
                                className="h-16 w-16 text-error"
                                fill="currentColor"
                            >
                                <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                            </svg>
                        </div>
                        <p className="text-base-content/60 text-center">
                            PDFファイルを表示するには
                            <br />
                            下のボタンをタップしてください
                        </p>
                        <button
                            onClick={() => setIsFullscreen(true)}
                            className="btn btn-primary gap-2"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                            </svg>
                            PDFを開く
                        </button>
                    </div>
                </section>

                <div className="divider"></div>

                <div className="flex justify-center">
                    <a
                        href={src}
                        download
                        className="btn btn-outline btn-sm gap-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        PDFをダウンロード
                    </a>
                </div>

                <div className="divider"></div>

                <div className="text-sm text-base-content/60 text-right">
                    <p>{filename.replace(".pdf", "")}</p>
                </div>
            </div>

            {/* フルスクリーンPDFビューアー（モバイル用） */}
            {isFullscreen && (
                <div className="fixed inset-0 z-50 bg-base-100 flex flex-col">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between p-3 border-b border-base-300 bg-base-200">
                        <div className="flex items-center gap-2 flex-1 mr-2">
                            <span className="text-sm font-medium truncate">
                                {filename.replace(".pdf", "")}
                            </span>
                            {numPages && (
                                <span className="text-xs text-base-content/60">
                                    ({numPages}ページ)
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {scale > 1 && (
                                <button
                                    onClick={resetZoom}
                                    className="btn btn-sm btn-ghost gap-1"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                                        />
                                    </svg>
                                    {Math.round(scale * 100)}%
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsFullscreen(false);
                                    resetZoom();
                                }}
                                className="btn btn-sm btn-ghost gap-1"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                                閉じる
                            </button>
                        </div>
                    </div>

                    {/* PDFコンテンツ - 縦スクロール */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-hidden bg-base-300"
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onClick={handleTap}
                    >
                        <div
                            ref={scrollContainerRef}
                            className="h-full overflow-auto"
                            style={{
                                touchAction: isPinching ? "none" : "pan-y",
                            }}
                        >
                            <div
                                style={{
                                    transform: `scale(${scale})`,
                                    transformOrigin: "top center",
                                    width: scale > 1 ? `${100 / scale}%` : "100%",
                                    marginLeft: scale > 1 ? "auto" : undefined,
                                    marginRight: scale > 1 ? "auto" : undefined,
                                }}
                            >
                                <Document
                                    file={src}
                                    onLoadSuccess={onDocumentLoadSuccess}
                                    loading={
                                        <div className="flex items-center justify-center h-64">
                                            <span className="loading loading-spinner loading-lg"></span>
                                        </div>
                                    }
                                    error={
                                        <div className="flex items-center justify-center h-64">
                                            <p className="text-error">
                                                PDFの読み込みに失敗しました
                                            </p>
                                        </div>
                                    }
                                >
                                    {numPages &&
                                        Array.from(
                                            { length: numPages },
                                            (_, index) => (
                                                <div
                                                    key={`page_${index + 1}`}
                                                    className="mb-2"
                                                >
                                                    <Page
                                                        pageNumber={index + 1}
                                                        width={
                                                            containerWidth ||
                                                            undefined
                                                        }
                                                        loading={
                                                            <div className="flex items-center justify-center py-8 bg-white">
                                                                <span className="loading loading-spinner loading-md"></span>
                                                            </div>
                                                        }
                                                    />
                                                    <div className="text-center text-xs text-base-content/50 py-1 bg-base-300">
                                                        {index + 1} / {numPages}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                </Document>
                            </div>
                        </div>
                    </div>

                    {/* フッター */}
                    <div className="p-2 border-t border-base-300 bg-base-200">
                        <p className="text-xs text-base-content/60 text-center">
                            スクロールでページ移動 / ピンチで拡大・縮小 /
                            ダブルタップでズーム
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
