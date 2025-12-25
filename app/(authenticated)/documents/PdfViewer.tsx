"use client";

import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF.jsワーカーの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    src: string;
}

const SCALE_OPTIONS = [
    { value: 1, label: "100%" },
    { value: 1.25, label: "125%" },
    { value: 1.5, label: "150%" },
    { value: 1.75, label: "175%" },
    { value: 2, label: "200%" },
];

export default function PdfViewer({ src }: PdfViewerProps) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [scale, setScale] = useState(1);
    const [isSharing, setIsSharing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
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

    const handleScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setScale(Number(e.target.value));
    };

    const handleShare = async () => {
        setIsSharing(true);
        try {
            // PDFファイルを取得
            const response = await fetch(src);
            const blob = await response.blob();
            const file = new File([blob], filename, {
                type: "application/pdf",
            });

            // ファイル共有がサポートされているかチェック
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: filename.replace(".pdf", ""),
                });
            } else if (navigator.share) {
                // ファイル共有非対応の場合はURLを共有
                await navigator.share({
                    title: filename.replace(".pdf", ""),
                    url: src,
                });
            } else {
                // Web Share API非対応の場合は新しいタブで開く
                window.open(src, "_blank");
            }
        } catch {
            // ユーザーがキャンセルした場合やエラー
        } finally {
            setIsSharing(false);
        }
    };

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
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="btn btn-outline btn-sm gap-2"
                    >
                        {isSharing ? (
                            <span className="loading loading-spinner loading-xs"></span>
                        ) : (
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
                                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                            </svg>
                        )}
                        {isSharing ? "準備中..." : "PDFを共有"}
                    </button>
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
                            <select
                                value={scale}
                                onChange={handleScaleChange}
                                className="select select-bordered"
                            >
                                {SCALE_OPTIONS.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    setIsFullscreen(false);
                                    setScale(1);
                                }}
                                className="btn btn-sm btn-circle btn-ghost"
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
                            </button>
                        </div>
                    </div>

                    {/* PDFコンテンツ - 縦スクロール */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto bg-base-300"
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

                    {/* フッター */}
                    <div className="p-2 border-t border-base-300 bg-base-200">
                        <p className="text-xs text-base-content/60 text-center">
                            スクロールでページ移動
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
