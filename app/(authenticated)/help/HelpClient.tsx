"use client";

import { HelpSection } from "@/src/features/help";
import {
    DemoCalendar,
    DemoItems,
    DemoAbsence,
    DemoBus,
    DemoPushNotification,
    DemoMemo,
} from "@/src/features/help/demo";

const HELP_SECTIONS = [
    { id: "calendar", title: "カレンダー", icon: "calendar" },
    { id: "items", title: "機材管理", icon: "items" },
    { id: "absence", title: "欠席連絡", icon: "absence" },
    { id: "bus", title: "バス時刻表", icon: "bus" },
    { id: "memo", title: "部会メモ", icon: "memo" },
    { id: "notification", title: "プッシュ通知", icon: "notification" },
] as const;

/**
 * ヘルプページのクライアントコンポーネント
 */
export function HelpClient() {
    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: "smooth" });
        }
    };

    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* ヘッダー */}
                <div className="text-center">
                    <h1
                        className="font-bold mb-2"
                        style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)" }}
                    >
                        NB-Portal ヘルプ
                    </h1>
                    <p className="text-base-content/70">
                        各機能の使い方を確認できます
                    </p>
                </div>

                {/* 目次 */}
                <div className="card bg-base-100 border border-base-300">
                    <div className="card-body p-4">
                        <h2 className="font-bold text-lg mb-3">目次</h2>
                        <div className="flex flex-wrap gap-2">
                            {HELP_SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => scrollToSection(section.id)}
                                    className="btn btn-outline btn-sm"
                                >
                                    {section.title}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* カレンダー */}
                <HelpSection
                    id="calendar"
                    title="カレンダー"
                    description="活動予定を確認・管理できます。日付をタップすると、その日の予定一覧を表示します。予定の追加・編集・削除も可能です。"
                    tips={[
                        "日付をタップすると、その日の予定一覧が表示されます",
                        "「追加」ボタンから新しい予定を作成できます",
                        "予定をタップすると詳細を確認できます",
                        "終日イベントは複数日にまたがる予定を作成できます",
                        "カラーを選択して予定を色分けできます",
                    ]}
                >
                    <DemoCalendar />
                </HelpSection>

                {/* 機材管理 */}
                <HelpSection
                    id="items"
                    title="機材管理"
                    description="サークルで所有している機材を一覧で確認できます。カテゴリごとにフィルタリングしたり、新しい機材を追加したりできます。"
                    tips={[
                        "上部のボタンでカテゴリを絞り込めます",
                        "行をタップすると編集画面が開きます",
                        "「追加」ボタンから新しい機材を登録できます",
                        "同じ機材を複数登録する場合は「登録数」を指定します",
                    ]}
                >
                    <DemoItems />
                </HelpSection>

                {/* 欠席連絡 */}
                <HelpSection
                    id="absence"
                    title="欠席連絡"
                    description="活動日に参加できない場合、欠席・遅刻・早退・中抜けの連絡ができます。送信された情報はカレンダーの予定詳細から確認できます。"
                    tips={[
                        "学籍番号と氏名は必須です",
                        "種別に応じて追加の入力項目が表示されます",
                        "中抜けの場合は「抜ける時間」と「戻る時間」を入力します",
                        "早退の場合は「早退する時間」を入力します",
                    ]}
                >
                    <DemoAbsence />
                </HelpSection>

                {/* バス時刻表 */}
                <HelpSection
                    id="bus"
                    title="バス時刻表"
                    description="大学への通学に使用するバスの時刻表を確認できます。東武動物公園駅と新白岡駅の両方の時刻表を表示します。"
                    tips={[
                        "日付を選択すると、その日の時刻表が表示されます",
                        "「駅発」は駅から大学へ向かうバスです",
                        "「大学発」は大学から駅へ向かうバスです",
                    ]}
                >
                    <DemoBus />
                </HelpSection>

                {/* 部会メモ */}
                <HelpSection
                    id="memo"
                    title="部会メモ"
                    description="部会メモを統一フォーマットで作成し、マークダウン形式でコピーできます。Discordなどに貼り付けて共有できます。"
                    tips={[
                        "予定のタイトルと詳細を分けて入力できます",
                        "詳細は複数行入力可能で、入れ子リスト形式で出力されます",
                        "「追加」ボタンで複数の予定を追加できます",
                        "プレビューで出力結果を確認できます",
                        "コピーボタンでクリップボードにコピーされます",
                    ]}
                >
                    <DemoMemo />
                </HelpSection>

                {/* プッシュ通知 */}
                <HelpSection
                    id="notification"
                    title="プッシュ通知"
                    description="カレンダーに新しい予定が追加されたときにプッシュ通知を受け取ることができます。お知らせページから設定できます。"
                    tips={[
                        "トグルをオンにするとプッシュ通知が有効になります",
                        "初回有効化時にブラウザの通知許可が必要です",
                        "通知が不要な場合はいつでもオフにできます",
                    ]}
                >
                    <DemoPushNotification />
                </HelpSection>

                {/* フッター */}
                <div className="text-center text-sm text-base-content/50 py-4">
                    <p>ご不明な点があれば、管理者にお問い合わせください。</p>
                </div>
            </div>
        </div>
    );
}
