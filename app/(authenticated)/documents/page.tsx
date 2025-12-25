"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import mermaid from "mermaid";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF.jsワーカーの設定
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// SVGのネイティブサイズ
const SVG_WIDTH = 2525;
const SVG_HEIGHT = 2078;

// ピンチズーム対応画像コンポーネント（フルスクリーンモーダル）
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [scale, setScale] = useState(1);
    const [minScale, setMinScale] = useState(0.1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
    const lastDistanceRef = useRef<number | null>(null);
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
    const lastMouseRef = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const resetZoom = useCallback(() => {
        if (src.endsWith(".svg")) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const isPC = viewportWidth >= 1024;
            const scaleX = viewportWidth / SVG_WIDTH;
            const scaleY = viewportHeight / SVG_HEIGHT;
            // PCは画面全体にフィット、モバイルは横幅フィット
            const fitScale = Math.min(scaleX, scaleY);
            const newScale = isPC ? fitScale : scaleX;
            setScale(newScale);
            // PCは中央配置、モバイルは左上
            if (isPC) {
                const scaledWidth = SVG_WIDTH * newScale;
                const scaledHeight = SVG_HEIGHT * newScale;
                const centerX = (viewportWidth - scaledWidth) / 2;
                const centerY = (viewportHeight - scaledHeight) / 2;
                setPosition({ x: centerX, y: centerY });
            } else {
                setPosition({ x: 0, y: 0 });
            }
        } else {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    }, [src]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            lastPinchCenterRef.current = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
        } else if (e.touches.length === 1) {
            setIsDragging(true);
            lastTouchRef.current = {
                x: e.touches[0].clientX,
                y: e.touches[0].clientY,
            };
        }
    }, []);

    const handleTouchMove = useCallback(
        (e: React.TouchEvent) => {
            if (e.touches.length === 2 && lastDistanceRef.current !== null) {
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delta = distance / lastDistanceRef.current;
                const newScale = Math.min(
                    Math.max(scale * delta, minScale),
                    10
                );

                const centerX =
                    (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY =
                    (e.touches[0].clientY + e.touches[1].clientY) / 2;

                if (containerRef.current && lastPinchCenterRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    // ピンチ位置（画面上の座標）
                    const pinchX = centerX - rect.left;
                    const pinchY = centerY - rect.top;
                    // 画像上のピンチ位置
                    const imageX = (pinchX - position.x) / scale;
                    const imageY = (pinchY - position.y) / scale;
                    // 新しい位置を計算（ピンチ位置が同じ画像位置を指すように）
                    const newX = pinchX - imageX * newScale;
                    const newY = pinchY - imageY * newScale;
                    setPosition({ x: newX, y: newY });
                }

                setScale(newScale);
                lastDistanceRef.current = distance;
                lastPinchCenterRef.current = { x: centerX, y: centerY };

                if (newScale <= minScale) {
                    setPosition({ x: 0, y: 0 });
                }
            } else if (
                e.touches.length === 1 &&
                isDragging &&
                lastTouchRef.current &&
                scale > minScale
            ) {
                const deltaX = e.touches[0].clientX - lastTouchRef.current.x;
                const deltaY = e.touches[0].clientY - lastTouchRef.current.y;
                setPosition((prev) => ({
                    x: prev.x + deltaX,
                    y: prev.y + deltaY,
                }));
                lastTouchRef.current = {
                    x: e.touches[0].clientX,
                    y: e.touches[0].clientY,
                };
            }
        },
        [isDragging, scale, position, minScale]
    );

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        lastTouchRef.current = null;
        lastDistanceRef.current = null;
        lastPinchCenterRef.current = null;
        if (scale <= minScale) {
            setPosition({ x: 0, y: 0 });
        }
    }, [scale, minScale]);

    // PC用: マウスホイールでズーム
    const handleWheel = useCallback(
        (e: React.WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            const newScale = Math.min(Math.max(scale * delta, minScale), 10);

            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                const imageX = (mouseX - position.x) / scale;
                const imageY = (mouseY - position.y) / scale;
                const newX = mouseX - imageX * newScale;
                const newY = mouseY - imageY * newScale;
                setPosition({ x: newX, y: newY });
            }

            setScale(newScale);

            // 最小スケール付近ではPCは中央配置、モバイルは左上
            if (newScale <= minScale * 1.1) {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const isPC = viewportWidth >= 1024;
                if (isPC) {
                    const scaledWidth = SVG_WIDTH * newScale;
                    const scaledHeight = SVG_HEIGHT * newScale;
                    const centerX = (viewportWidth - scaledWidth) / 2;
                    const centerY = (viewportHeight - scaledHeight) / 2;
                    setPosition({ x: centerX, y: centerY });
                } else {
                    setPosition({ x: 0, y: 0 });
                }
            }
        },
        [scale, position, minScale]
    );

    // PC用: マウスドラッグで移動
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button === 0) {
            setIsDragging(true);
            lastMouseRef.current = { x: e.clientX, y: e.clientY };
        }
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (isDragging && lastMouseRef.current) {
                const deltaX = e.clientX - lastMouseRef.current.x;
                const deltaY = e.clientY - lastMouseRef.current.y;
                setPosition((prev) => ({
                    x: prev.x + deltaX,
                    y: prev.y + deltaY,
                }));
                lastMouseRef.current = { x: e.clientX, y: e.clientY };
            }
        },
        [isDragging]
    );

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        lastMouseRef.current = null;
    }, []);

    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            if (scale <= minScale * 1.1 && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const tapX = e.clientX - rect.left;
                const tapY = e.clientY - rect.top;
                // タップ位置を中心に3倍ズーム（左上基準）
                const imageX = (tapX - position.x) / scale;
                const imageY = (tapY - position.y) / scale;
                const newScale = 3;
                const newX = tapX - imageX * newScale;
                const newY = tapY - imageY * newScale;
                setScale(newScale);
                setPosition({ x: newX, y: newY });
            } else {
                resetZoom();
            }
        },
        [scale, minScale, position, resetZoom]
    );

    const openFullscreen = () => {
        setIsFullscreen(true);
        if (src.endsWith(".svg")) {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const isPC = viewportWidth >= 1024;
            const scaleX = viewportWidth / SVG_WIDTH;
            const scaleY = viewportHeight / SVG_HEIGHT;
            const fitScale = Math.min(scaleX, scaleY);
            const newScale = isPC ? fitScale : scaleX;
            setMinScale(fitScale * 0.5);
            setScale(newScale);
            // PCは中央配置、モバイルは左上
            if (isPC) {
                const scaledWidth = SVG_WIDTH * newScale;
                const scaledHeight = SVG_HEIGHT * newScale;
                const centerX = (viewportWidth - scaledWidth) / 2;
                const centerY = (viewportHeight - scaledHeight) / 2;
                setPosition({ x: centerX, y: centerY });
            } else {
                setPosition({ x: 0, y: 0 });
            }
        } else {
            setScale(1);
            setPosition({ x: 0, y: 0 });
        }
    };

    const closeFullscreen = () => {
        setIsFullscreen(false);
        resetZoom();
    };

    return (
        <>
            {/* サムネイル表示 */}
            <div
                className="cursor-pointer hover:opacity-90 transition-opacity"
                onClick={openFullscreen}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt={alt}
                    className="w-full"
                />
                <p className="text-sm text-base-content/60 mt-2 text-center">
                    タップして拡大表示
                </p>
            </div>

            {/* フルスクリーンモーダル */}
            {isFullscreen && (
                <div
                    className="fixed inset-0 z-50 bg-white flex items-center justify-center"
                    onClick={closeFullscreen}
                >
                    <div
                        ref={containerRef}
                        className={`w-full h-full overflow-hidden touch-none ${
                            src.endsWith(".svg")
                                ? "relative"
                                : "flex items-center justify-center"
                        } ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={handleWheel}
                        onDoubleClick={handleDoubleClick}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {src.endsWith(".svg") ? (
                            <iframe
                                src={src}
                                title={alt}
                                className="select-none pointer-events-none border-0 absolute top-0 left-0"
                                style={{
                                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                                    transformOrigin: "0 0",
                                    transition: isDragging
                                        ? "none"
                                        : "transform 0.1s",
                                    willChange: "transform",
                                    width: "2525px",
                                    height: "2078px",
                                }}
                            />
                        ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={src}
                                alt={alt}
                                className="max-w-none select-none pointer-events-none"
                                style={{
                                    transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                                    transformOrigin: "center center",
                                    transition: isDragging
                                        ? "none"
                                        : "transform 0.1s",
                                    willChange: "transform",
                                    maxHeight: "100vh",
                                    maxWidth: "100vw",
                                    objectFit: "contain",
                                }}
                                draggable={false}
                            />
                        )}
                    </div>
                    <button
                        className="btn btn-circle btn-ghost absolute top-4 right-4 text-gray-800"
                        onClick={closeFullscreen}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6"
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
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gray-500 text-sm text-center">
                        <span className="hidden lg:inline">
                            ホイールで拡大・縮小 / ダブルクリックで3倍ズーム /
                            ドラッグで移動
                        </span>
                        <span className="lg:hidden">
                            ピンチで拡大・縮小 / ダブルタップで3倍ズーム
                        </span>
                    </div>
                </div>
            )}
        </>
    );
}

// PDFビューアーコンポーネント
function PdfViewer({ src }: { src: string }) {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [containerWidth, setContainerWidth] = useState<number>(0);
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
        setCurrentPage(1);
    };

    const goToPrevPage = () => {
        setCurrentPage((prev) => Math.max(prev - 1, 1));
    };

    const goToNextPage = () => {
        setCurrentPage((prev) => Math.min(prev + 1, numPages || 1));
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
                        <span className="text-sm font-medium truncate flex-1 mr-2">
                            {filename.replace(".pdf", "")}
                        </span>
                        <button
                            onClick={() => setIsFullscreen(false)}
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

                    {/* PDFコンテンツ */}
                    <div
                        ref={containerRef}
                        className="flex-1 overflow-auto bg-base-300"
                    >
                        <Document
                            file={src}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="flex items-center justify-center h-full">
                                    <span className="loading loading-spinner loading-lg"></span>
                                </div>
                            }
                            error={
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-error">
                                        PDFの読み込みに失敗しました
                                    </p>
                                </div>
                            }
                        >
                            <Page
                                pageNumber={currentPage}
                                width={containerWidth || undefined}
                                loading={
                                    <div className="flex items-center justify-center py-8">
                                        <span className="loading loading-spinner loading-md"></span>
                                    </div>
                                }
                            />
                        </Document>
                    </div>

                    {/* フッター（ページ操作） */}
                    {numPages && numPages > 1 && (
                        <div className="flex items-center justify-center gap-4 p-3 border-t border-base-300 bg-base-200">
                            <button
                                onClick={goToPrevPage}
                                disabled={currentPage <= 1}
                                className="btn btn-sm btn-ghost"
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
                                        d="M15 19l-7-7 7-7"
                                    />
                                </svg>
                            </button>
                            <span className="text-sm">
                                {currentPage} / {numPages}
                            </span>
                            <button
                                onClick={goToNextPage}
                                disabled={currentPage >= numPages}
                                className="btn btn-sm btn-ghost"
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
                                        d="M9 5l7 7-7 7"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

// Mermaidフローチャートコンポーネント
function MermaidChart({ chart }: { chart: string }) {
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
                const { svg } = await mermaid.render(
                    `mermaid-${Date.now()}`,
                    chart
                );
                containerRef.current.innerHTML = svg;
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

interface Document {
    id: string;
    title: string;
    category: string;
    content: React.ReactNode;
}

const weatherFlowChart = `flowchart TD
    A["📅 準備日 9:00<br/>翌日の天気確認"]
    A --> B{"降水確率<br/>60%超？"}
    B -->|"☔ 雨予報"| C["🏢 スチューデントホールで実施<br/>【中規模】"]
    B -->|"☀️ 晴れ予報"| D["🎪 想定通り屋外実施<br/>【大規模】<br/>※スチューデントホール準備も行う"]
    D --> E{"突然の<br/>降雨？"}
    E -->|"☔ 雨が降り出した"| F{"現在の<br/>状況は？"}
    E -->|"☀️ 問題なし"| G["✅ 通常通り続行"]
    F -->|"🎸 音団ライブ中"| H["🏢 スチューデントホールに移動<br/>【小規模】"]
    F -->|"🎭 イベント中"| I["🏢 スチューデントホールに移動<br/>【極小規模】"]
`;

const documents: Document[] = [
    {
        id: "nb-daigakusai-rain-manual",
        title: "大学祭 雨天時対応マニュアル",
        category: "大学祭",
        content: (
            <div className="space-y-6">
                <section>
                    <h3 className="text-lg font-bold mb-2">概要</h3>
                    <p>
                        雨量・大学祭実行委員会（学祭委）の判断で対応を変更する。
                        ステージ、卓、NB本部、学祭委と連絡を密にし状況を判断する必要がある。
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold mb-2">対応パターン</h3>
                    <ol className="list-decimal list-inside space-y-1">
                        <li>
                            <a
                                href="#pattern-1"
                                className="link link-primary"
                            >
                                全日程の場合
                            </a>
                        </li>
                        <li>
                            <a
                                href="#pattern-2"
                                className="link link-primary"
                            >
                                音団ライブ前、途中の場合
                            </a>
                        </li>
                        <li>
                            <a
                                href="#pattern-3"
                                className="link link-primary"
                            >
                                ステージ企画前、途中の場合
                            </a>
                        </li>
                    </ol>
                </section>

                <section>
                    <h3 className="text-lg font-bold mb-2">NBCの設営</h3>
                    <ul className="list-disc list-inside space-y-2">
                        <li>
                            雨天トラブル等が予想されるため、スチューデントホールには小規模編成の機材を準備しておく
                        </li>
                        <li>
                            <strong>大学祭準備日 9:00</strong>{" "}
                            に天気予報を確認し、雨天の可能性が{" "}
                            <strong>60%を超える</strong>{" "}
                            場合、学祭委と協議しステージ設営場所を検討
                        </li>
                        <li>
                            <strong>本番1日目 9:00</strong>{" "}
                            も同様に確認し、スチューデントホールで行うかの判断を行う
                        </li>
                        <li>突如雨天になった場合、行動図に従って対応</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-lg font-bold mb-2">
                        行動図（天気判断フロー）
                    </h3>
                    <div className="bg-base-200 p-4 rounded-lg overflow-x-auto">
                        <MermaidChart chart={weatherFlowChart} />
                    </div>
                </section>

                <div className="divider"></div>

                <section id="pattern-1">
                    <h3 className="text-lg font-bold mb-2">1. 全日程の場合</h3>
                    <p>
                        スチューデントホールにステージ等を展開する。 構成表は{" "}
                        <strong>『中規模』</strong> を参照し、適切に展開する。
                    </p>
                </section>

                <div className="divider"></div>

                <section id="pattern-2">
                    <h3 className="text-lg font-bold mb-2">
                        2. 音団ライブ前、途中の場合
                    </h3>

                    <h4 className="font-semibold mt-4 mb-2">【ステージ側】</h4>
                    <p className="mb-2">
                        最優先事項としてステージ上の機材を保護する：
                    </p>
                    <ul className="list-disc list-inside mb-4">
                        <li>Gtアンプ、Bassアンプ</li>
                        <li>外音・中音スピーカー</li>
                        <li>アンプ、BOX等</li>
                    </ul>
                    <p className="mb-2">
                        <strong>保護方法:</strong> ブルーシート等で機材を覆う
                    </p>
                    <p className="text-warning mb-4">
                        注意: 電気使用機材は漏電・感電に十分注意
                    </p>
                    <p className="mb-4">
                        保護終了後、機材をスチューデントホールへ移動。使用しないものはNB本部へ移動。
                        雨天用スピーカー・雨天用AMPは、観客がスチューデントホールへ移動するまでそのままにしておく。
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">【優先順位】</h4>
                    <div className="bg-base-200 p-3 rounded-lg text-sm">
                        演者の機材 ＞ ギター・ベースアンプ ＞
                        外音・中音スピーカー ＞ マイク ＞ BOX ＞ アンプ
                    </div>

                    <h4 className="font-semibold mt-4 mb-2">【卓側】</h4>
                    <ul className="list-disc list-inside space-y-1">
                        <li>演奏を一時中断し、全チャンネルMUTE</li>
                        <li>ファンタム電源を切る（漏電・感電防止）</li>
                        <li>
                            外音・中音の信号を切り、雨天用スピーカーのみに信号を送る
                        </li>
                        <li>BGMをうっすらとかける</li>
                        <li>適宜マイクのON/OFFを行う</li>
                    </ul>

                    <h4 className="font-semibold mt-4 mb-2">【全体】</h4>
                    <p className="mb-2">
                        大学祭側の判断を待ち、スチューデントホールへ機材を移動。
                        一部の部員は先にスチューデントホールへ行き準備を行う。
                    </p>
                    <p className="mb-2">
                        演奏続行の場合、構成表は <strong>『小規模』</strong>{" "}
                        を参照。
                    </p>
                    <p className="text-error">
                        演奏全体中止の場合、「3.ステージ企画前、途中の場合」の対応を取る。
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">
                        【タイムライン（150分で完了）】
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>担当</th>
                                    <th>降雨〜</th>
                                    <th>40分〜</th>
                                    <th>60分〜</th>
                                    <th>120分〜</th>
                                    <th>完了 150分</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>主卓</td>
                                    <td>安全対策</td>
                                    <td>施設誘導</td>
                                    <td>施設誘導</td>
                                    <td>誘導完了</td>
                                    <td className="text-error">完全停止</td>
                                </tr>
                                <tr>
                                    <td>副卓</td>
                                    <td>移動開始</td>
                                    <td>卓展開・周辺展開</td>
                                    <td>卓チェック</td>
                                    <td>卓完了</td>
                                    <td className="text-success">演奏開始</td>
                                </tr>
                                <tr>
                                    <td>ステージ</td>
                                    <td>ステージ保護</td>
                                    <td>保護完了</td>
                                    <td>撤収開始</td>
                                    <td>撤収</td>
                                    <td>撤収完了</td>
                                </tr>
                                <tr>
                                    <td>サイド</td>
                                    <td>ステージ保護</td>
                                    <td>移動開始</td>
                                    <td>ステージ展開</td>
                                    <td>展開完了</td>
                                    <td>演奏補助</td>
                                </tr>
                                <tr>
                                    <td>演者</td>
                                    <td>片付け</td>
                                    <td>移動開始</td>
                                    <td>ステージ準備</td>
                                    <td>準備</td>
                                    <td className="text-success">演奏開始</td>
                                </tr>
                                <tr>
                                    <td>運び出し</td>
                                    <td>AMP・スピーカー</td>
                                    <td>ケーブル系</td>
                                    <td>Mic系</td>
                                    <td>BOX系</td>
                                    <td className="text-info">早い方が良い</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="divider"></div>

                <section id="pattern-3">
                    <h3 className="text-lg font-bold mb-2">
                        3. ステージ企画前、途中の場合
                    </h3>

                    <h4 className="font-semibold mt-4 mb-2">【ステージ側】</h4>
                    <p className="mb-2">
                        最優先事項としてステージ上の機材を保護する：
                    </p>
                    <ul className="list-disc list-inside mb-4">
                        <li>外音・中音スピーカー</li>
                        <li>アンプ、BOX等</li>
                    </ul>
                    <p>
                        保護終了後、機材を{" "}
                        <strong>ステージテント側・NB本部</strong> に避難させる。
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">【優先順位】</h4>
                    <div className="bg-base-200 p-3 rounded-lg text-sm">
                        外音・中音スピーカー ＞ マイク ＞ BOX ＞ アンプ
                    </div>

                    <h4 className="font-semibold mt-4 mb-2">【卓側】</h4>
                    <ul className="list-disc list-inside space-y-1">
                        <li>大学祭の指示に従う</li>
                        <li>演目一時中断の場合、全チャンネルMUTE</li>
                        <li>ファンタム電源を切る</li>
                        <li>雨天用スピーカーのみに信号を送る</li>
                        <li>適宜マイクのON/OFFを行う</li>
                    </ul>

                    <p className="mt-4">
                        並行してスチューデントホールに必要最低限の機材を搬入・展開。
                        構成表は <strong>『極小規模』</strong> を参照。
                    </p>

                    <h4 className="font-semibold mt-4 mb-2">
                        【タイムライン（40分で完了）】
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>担当</th>
                                    <th>降雨〜</th>
                                    <th>10分〜</th>
                                    <th>20分〜</th>
                                    <th>30分〜</th>
                                    <th>完了 40分</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>主卓</td>
                                    <td>安全対策</td>
                                    <td>施設誘導</td>
                                    <td>施設誘導</td>
                                    <td>誘導完了</td>
                                    <td className="text-error">完全停止</td>
                                </tr>
                                <tr>
                                    <td>副卓</td>
                                    <td>移動開始</td>
                                    <td>卓展開・周辺展開</td>
                                    <td>卓チェック</td>
                                    <td>卓完了</td>
                                    <td className="text-success">演目開始</td>
                                </tr>
                                <tr>
                                    <td>ステージ</td>
                                    <td>ステージ保護</td>
                                    <td>保護完了</td>
                                    <td>撤収開始</td>
                                    <td>撤収</td>
                                    <td>撤収完了</td>
                                </tr>
                                <tr>
                                    <td>サイド</td>
                                    <td>ステージ保護</td>
                                    <td>移動開始</td>
                                    <td>ステージ展開</td>
                                    <td>展開完了</td>
                                    <td>演目補助</td>
                                </tr>
                                <tr>
                                    <td>演者</td>
                                    <td>片付け</td>
                                    <td>移動開始</td>
                                    <td>ステージ準備</td>
                                    <td>準備</td>
                                    <td className="text-success">演目開始</td>
                                </tr>
                                <tr>
                                    <td>運び出し</td>
                                    <td>AMP・スピーカー</td>
                                    <td>ケーブル系</td>
                                    <td>Mic系</td>
                                    <td>BOX系</td>
                                    <td className="text-info">早い方が良い</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="divider"></div>

                <div className="text-sm text-base-content/60 text-right">
                    <p>大学祭 雨天時対応マニュアル v1.0.0</p>
                </div>
            </div>
        ),
    },
    {
        id: "nb-gakuyu-wiring",
        title: "学友会館ライブ 標準結線図 v2.0.0",
        category: "学友会館",
        content: (
            <div className="space-y-6">
                <section>
                    <ZoomableImage
                        src="/documents/gakuyukaikan-wiring.svg"
                        alt="学友会館ライブ 標準結線図 Ver2.0"
                    />
                </section>

                <div className="divider"></div>

                <section>
                    <h3 className="text-lg font-bold mb-2">注意事項</h3>
                    <div className="alert alert-info">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            className="stroke-current shrink-0 w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            ></path>
                        </svg>
                        <div>
                            <p className="text-sm">
                                録画を部室NASに入れるための回線あり。
                                Danteは必ず本体の有線LANポートに接続。
                            </p>
                        </div>
                    </div>
                    <div className="alert alert-warning mt-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current shrink-0 h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                        <span>MacminiはQUAD CAPTURE使用不可</span>
                    </div>
                </section>

                <div className="divider"></div>

                <div className="text-sm text-base-content/60 text-right">
                    <p>学友会館ライブ 標準結線図 Ver2.0</p>
                </div>
            </div>
        ),
    },
    {
        id: "nb-pa-plan-20250803",
        title: "機材構成表 v3.0.2",
        category: "機材構成表",
        content: <PdfViewer src="/documents/機材構成表20250803.pdf" />,
    },
];

function DocumentsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const docId = searchParams.get("doc");

    const selectedDoc = docId
        ? documents.find((doc) => doc.id === docId) || null
        : null;

    const setSelectedDoc = (doc: Document | null) => {
        if (doc) {
            router.push(`/documents?doc=${doc.id}`);
        } else {
            router.push("/documents");
        }
    };

    const categories = [...new Set(documents.map((doc) => doc.category))];

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー */}
                <div className="flex items-center gap-3 mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 384 512"
                        className="h-6 w-6 text-primary"
                        fill="currentColor"
                    >
                        <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                    </svg>
                    <h1
                        className="font-bold"
                        style={{ fontSize: "clamp(1.25rem, 3vw, 1.5rem)" }}
                    >
                        資料
                    </h1>
                </div>

                {!selectedDoc ? (
                    <div className="space-y-6">
                        {categories.map((category) => (
                            <div key={category}>
                                <h2 className="text-lg font-semibold mb-3">
                                    {category}
                                </h2>
                                <div className="grid gap-3">
                                    {documents
                                        .filter(
                                            (doc) => doc.category === category
                                        )
                                        .map((doc) => (
                                            <button
                                                key={doc.id}
                                                onClick={() =>
                                                    setSelectedDoc(doc)
                                                }
                                                className="card bg-base-100 shadow-md border border-base-300 hover:shadow-lg transition-shadow"
                                            >
                                                <div className="card-body p-4">
                                                    <div className="flex items-center justify-between">
                                                        <h3 className="card-title text-base">
                                                            {doc.title}
                                                        </h3>
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="h-5 w-5 text-base-content/40"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 5l7 7-7 7"
                                                            />
                                                        </svg>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div>
                        <button
                            onClick={() => setSelectedDoc(null)}
                            className="btn btn-ghost btn-sm mb-4 gap-2"
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
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                            戻る
                        </button>

                        <div className="card bg-base-100 shadow-xl border border-base-300">
                            <div className="card-body">
                                <h2 className="card-title text-xl mb-4">
                                    {selectedDoc.title}
                                </h2>
                                {selectedDoc.content}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <Suspense
            fallback={
                <div className="p-4 lg:p-6 w-full">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center gap-3 mb-6">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 384 512"
                                className="h-6 w-6 text-primary"
                                fill="currentColor"
                            >
                                <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                            </svg>
                            <h1
                                className="font-bold"
                                style={{
                                    fontSize: "clamp(1.25rem, 3vw, 1.5rem)",
                                }}
                            >
                                資料
                            </h1>
                        </div>
                        <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-lg"></span>
                        </div>
                    </div>
                </div>
            }
        >
            <DocumentsContent />
        </Suspense>
    );
}
