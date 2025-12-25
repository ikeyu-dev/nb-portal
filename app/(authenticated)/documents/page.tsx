"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import mermaid from "mermaid";

// ピンチズーム対応画像ビューアー
function ImageViewer({ src, onClose }: { src: string; onClose: () => void }) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const lastTouchRef = useRef<{ x: number; y: number } | null>(null);
    const lastDistanceRef = useRef<number | null>(null);
    const lastPinchCenterRef = useRef<{ x: number; y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            // ピンチ開始
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            // ピンチの中心点を記録
            lastPinchCenterRef.current = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            };
        } else if (e.touches.length === 1) {
            // ドラッグ開始
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
                // ピンチズーム
                e.preventDefault();
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const delta = distance / lastDistanceRef.current;
                const newScale = Math.min(Math.max(scale * delta, 1), 5);

                // ピンチの中心点
                const centerX =
                    (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY =
                    (e.touches[0].clientY + e.touches[1].clientY) / 2;

                if (containerRef.current && lastPinchCenterRef.current) {
                    const rect = containerRef.current.getBoundingClientRect();
                    // 画面中心からの距離
                    const screenCenterX = rect.width / 2;
                    const screenCenterY = rect.height / 2;

                    // ピンチ中心点の画面中心からのオフセット
                    const pinchOffsetX = centerX - rect.left - screenCenterX;
                    const pinchOffsetY = centerY - rect.top - screenCenterY;

                    // スケール変化に応じて位置を調整
                    const scaleChange = newScale / scale;
                    const newX =
                        position.x -
                        pinchOffsetX * (scaleChange - 1) +
                        (centerX - lastPinchCenterRef.current.x);
                    const newY =
                        position.y -
                        pinchOffsetY * (scaleChange - 1) +
                        (centerY - lastPinchCenterRef.current.y);

                    setPosition({ x: newX, y: newY });
                }

                setScale(newScale);
                lastDistanceRef.current = distance;
                lastPinchCenterRef.current = { x: centerX, y: centerY };

                // スケールが1以下になったらpositionをリセット
                if (newScale <= 1) {
                    setPosition({ x: 0, y: 0 });
                }
            } else if (
                e.touches.length === 1 &&
                isDragging &&
                lastTouchRef.current &&
                scale > 1
            ) {
                // ドラッグ移動（ズーム時のみ）
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
        [isDragging, scale, position]
    );

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
        lastTouchRef.current = null;
        lastDistanceRef.current = null;
        lastPinchCenterRef.current = null;
        // スケールが1以下の場合はpositionをリセット
        if (scale <= 1) {
            setPosition({ x: 0, y: 0 });
        }
    }, [scale]);

    // ダブルタップでタップ位置を中心に拡大
    const handleDoubleClick = useCallback(
        (e: React.MouseEvent) => {
            if (scale === 1 && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const tapX = e.clientX - rect.left;
                const tapY = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;

                // タップ位置を中心にするためのオフセット
                const offsetX = (centerX - tapX) * 1; // 2倍に拡大するので1倍分オフセット
                const offsetY = (centerY - tapY) * 1;

                setScale(2);
                setPosition({ x: offsetX, y: offsetY });
            } else {
                setScale(1);
                setPosition({ x: 0, y: 0 });
            }
        },
        [scale]
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={onClose}
        >
            <div
                ref={containerRef}
                className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onClick={(e) => e.stopPropagation()}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={src}
                    alt="拡大画像"
                    className="max-h-[90vh] max-w-[95vw] object-contain select-none"
                    style={{
                        transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
                        transition: isDragging ? "none" : "transform 0.1s",
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                        WebkitBackfaceVisibility: "hidden",
                    }}
                    onDoubleClick={handleDoubleClick}
                    draggable={false}
                />
            </div>
            <button
                className="btn btn-circle btn-ghost absolute top-4 right-4 text-white"
                onClick={onClose}
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
        </div>
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
        id: "wakasugi-rain-manual",
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
        id: "gakuyukaikan-wiring",
        title: "学友会館ライブ 標準結線図",
        category: "学友会館",
        content: (
            <div className="space-y-6">
                <section>
                    <h3 className="text-lg font-bold mb-2">結線図</h3>
                    <p className="text-sm text-base-content/60 mb-2">
                        タップして拡大
                    </p>
                    <div className="overflow-x-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/documents/gakuyukaikan-wiring.jpg"
                            alt="学友会館ライブ 標準結線図 Ver2.0"
                            className="w-full max-w-none cursor-pointer hover:opacity-90 transition-opacity expandable-image"
                            data-image-src="/documents/gakuyukaikan-wiring.jpg"
                        />
                    </div>
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
];

export default function DocumentsPage() {
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
    const [expandedImage, setExpandedImage] = useState<string | null>(null);

    const categories = [...new Set(documents.map((doc) => doc.category))];

    // 拡大可能な画像のクリックイベントを処理
    useEffect(() => {
        const handleImageClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains("expandable-image")) {
                const imageSrc = target.getAttribute("data-image-src");
                if (imageSrc) {
                    setExpandedImage(imageSrc);
                }
            }
        };

        document.addEventListener("click", handleImageClick);
        return () => document.removeEventListener("click", handleImageClick);
    }, []);

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-6 max-lg:hidden">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 384 512"
                        className="h-6 w-6 text-primary"
                        fill="currentColor"
                    >
                        <path d="M0 64C0 28.7 28.7 0 64 0L224 0l0 128c0 17.7 14.3 32 32 32l128 0 0 288c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm384 64l-128 0L256 0 384 128z" />
                    </svg>
                    <h1
                        className="font-normal text-base-content"
                        style={{ fontSize: "clamp(1.125rem, 3vw, 1.5rem)" }}
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

            {/* 画像拡大モーダル */}
            {expandedImage && (
                <ImageViewer
                    src={expandedImage}
                    onClose={() => setExpandedImage(null)}
                />
            )}
        </div>
    );
}
