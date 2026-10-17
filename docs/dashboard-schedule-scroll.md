# ダッシュボードの予定を最大7件表示し、予定一覧へのリンクを追加する

この資料は、Reactやテストの書き方を学びながら、自分で変更を進めるための実装手順。変更対象は`app/(authenticated)/home/page.tsx`と、その隣に新しく作る`page.test.tsx`である。以下のコードは変更案であり、この資料の更新だけではアプリの動作は変わらない。

## 表示する内容

- 「今後の予定」には、既存の条件・並び順に従って最大7件を表示する。
- 8件以上ある場合、一覧の下に「すべての予定を見る」を表示する。
- リンク先は既存の予定ページ`/calendar`とする。
- 件数バッジは今後の予定の全件数を表示する。9件ある場合、予定行は7件、バッジは9となる。
- 0件の場合は既存の「予定はありません」を表示する。
- 一覧内のスクロールは追加せず、ページ全体を通常どおりスクロールする。
- タイトルは省略せず、折り返して表示する。10行になっても予定1件として数える。

長いタイトルがあれば、その分だけ予定行とダッシュボード全体が高くなる。件数に上限を設ける設計なので、画面内に7件すべてが同時に収まることは保証しない。

以前検討した高さの計測、`maxHeight`、`ResizeObserver`、スクロールスナップは使わない。今回の変更では`UpcomingSchedulesList.tsx`やdashboard用の`variant`も追加する必要はない。既存の`ScheduleCard`をそのまま使う。

## コードを読むための用語

- **配列**: 複数の予定を順番に入れたデータ。今回の`upcomingSchedules`が該当する。
- **メソッド**: 配列などの値が持っている処理。`配列.slice(...)`のように、対象の値に続けて呼び出す。
- **コンポーネント**: Reactで画面の一部分を作る部品。予定1件を表示する`ScheduleCard`がその例。
- **prop（プロップ）**: コンポーネントに渡す値。`<ScheduleCard title="部会" />`では、`title`というpropに`"部会"`を渡す。
- **描画**: Reactがデータをもとに、画面に表示する要素を作ること。
- **モック**: テスト対象の周辺処理を置き換える代用品。テストでは通信や時計などを置き換え、条件を揃える。

## ページで変更する箇所

### 1. 一覧への移動に使うLinkを読み込む

ファイル: `app/(authenticated)/home/page.tsx`

ファイル先頭のimportに追加する。

```tsx
import Link from "next/link";
```

`Link`はNext.jsが提供するページ移動用のコンポーネント。`href="/calendar"`を渡すと、クリックした際に予定ページへ移動する。通常のボタンで独自の移動処理を書く必要はない。

### 2. 全件と表示用7件を分けて持つ

既存の`upcomingSchedules`を作っている処理の後、`return`の前に次を追加する。

```tsx
const MAX_DASHBOARD_SCHEDULES = 7;
const visibleUpcomingSchedules = upcomingSchedules.slice(
    0,
    MAX_DASHBOARD_SCHEDULES
);
const hasMoreUpcomingSchedules =
    upcomingSchedules.length > MAX_DASHBOARD_SCHEDULES;
```

`MAX_DASHBOARD_SCHEDULES`はダッシュボードに表示する上限。7という数値に名前を付け、表示上限とリンクの表示条件で同じ値を使う。

`slice(0, 7)`は、配列の先頭からインデックス7の直前までを取り出す。配列のインデックスは0から始まるため、取り出すのは0〜6番目の7件になる。元の配列は変更されない。

この結果、`upcomingSchedules`には全件が残り、`visibleUpcomingSchedules`にだけ表示用の最大7件が入る。件数バッジは前者、予定行の描画は後者を使う。タイトルの文字数や行数は、この処理に関係しない。

`hasMoreUpcomingSchedules`には、全件数が7を超える場合に`true`、それ以外は`false`が入る。この値をリンクの表示条件に使う。

処理の順番は次を守る。

1. 既存の条件で今後の予定を抽出する。
2. 既存の比較処理で開始日順に並べる。
3. 並べた配列の先頭7件を表示用に取り出す。

先に7件を取り出すと、その7件に過去の予定が混ざる可能性がある。また、並び替え前に取り出すと、直近の予定が表示対象から漏れる。全件の抽出と並び替えが済んだ後に`slice`を使う。同日内の並び順は既存の処理に従う。

### 3. 描画する配列を変更する

195行前後の予定一覧で、既存の`upcomingSchedules.map(...)`を`visibleUpcomingSchedules.map(...)`へ変更する。行番号は編集でずれるため、名前を検索して探す。

`map`は配列の各要素に処理を適用するメソッド。この箇所では、予定のデータを`ScheduleCard`に変換している。対象の配列を変えると、最大7枚だけが描画される。

`map`の中にある日付・場所・出欠情報の加工や、`ScheduleCard`へ渡すpropsはそのまま使う。

次の箇所は全件用の`upcomingSchedules`を使い続ける。

- 件数バッジの`upcomingSchedules.length`
- 予定が存在するか判定する`upcomingSchedules.length > 0`

既存一覧の`overflow-hidden`は角丸の枠から内容がはみ出さないための指定で、スクロール枠を作る指定ではない。固定高や`overflow-y-auto`は追加しない。

### 4. 一覧の下にリンクを追加する

予定一覧の条件分岐が終わる位置、つまり「予定はありません」を表示する分岐の後に、次を追加する。配置先は「今後の予定」の`card-body`内で、他のカードの外に出さない。

```tsx
<>
    {hasMoreUpcomingSchedules && (
        <div className="mt-3 flex justify-end">
            <Link
                href="/calendar"
                className="link link-primary text-sm"
            >
                すべての予定を見る
            </Link>
        </div>
    )}
</>
```

これは既存のJSXの途中に挿入するコード。`条件 && 表示する要素`は、条件が`true`の場合だけ右側の要素を描画するReactの書き方。7件ちょうどではリンクを表示せず、8件目がある場合に表示する。

外側の`<>...</>`は、要素をまとめるFragment（フラグメント）。画面上には追加の枠を作らない。既存の`card-body`の中へ直接挿入する場合は、この外側のFragmentを省略して中身だけを書くこともできる。

`mt-3`は上側の余白、`flex justify-end`はリンクを右寄せする指定。`link link-primary`はdaisyUIのリンク用スタイルである。

## テストはページの振る舞いを確認する

テスト対象は既存の`HomePage`にする。新しい計算関数や一覧コンポーネントをテストのために追加する必要はない。

`app/(authenticated)/home/page.test.tsx`を新規作成する。以下の例は、このページから読み込む周辺部品をモック化している。`ScheduleCard`のモックは受け取った予定IDとタイトルを表示するだけにし、ページがどの予定を何件渡したかを調べる。

```tsx
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "@/src/shared/types/api";

const mocks = vi.hoisted(() => ({
    getDashboardDataServer: vi.fn(),
}));

vi.mock("@/src/auth", () => ({
    auth: async () => ({ studentId: "member1", memberName: "部員" }),
}));
vi.mock("@/src/shared/api/server", () => ({
    getDashboardDataServer: mocks.getDashboardDataServer,
}));
vi.mock("next/link", () => ({
    default: ({ href, children }: { href: string; children: ReactNode }) => (
        <a href={href}>{children}</a>
    ),
}));
vi.mock("@/features/schedule-card", () => ({
    ScheduleCard: ({ eventId, title }: { eventId: string; title: string }) => (
        <article aria-label={eventId}>{title}</article>
    ),
}));
vi.mock("@/features/digital-clock", () => ({ DigitalClock: () => null }));
vi.mock("@/features/weather", () => ({ WeatherWidget: () => null }));
vi.mock("@/features/date-display", () => ({ DateDisplay: () => null }));
vi.mock("@/src/features/next-meeting", () => ({ NextMeetingCard: () => null }));
vi.mock("@/src/features/pwa-install", () => ({
    MobilePWAInstallBanner: () => null,
}));

import HomePage from "./page";

function makeSchedule(day: number, title = `予定${day}`): Schedule {
    return {
        EVENT_ID: `EVENT-${day}`,
        YYYY: 2026,
        MM: 10,
        DD: day,
        TIME_HH: 18,
        TIME_MM: 0,
        TITLE: title,
        WHERE: "部室",
        DETAIL: "",
        END_YYYY: 2026,
        END_MM: 10,
        END_DD: day,
        END_TIME_HH: 19,
        END_TIME_MM: 0,
        ATTENDANCE_MODE: "ABSENCE",
        IS_PAST: false,
    };
}

function setSchedules(schedules: Schedule[]) {
    mocks.getDashboardDataServer.mockResolvedValue({
        success: true,
        data: { schedules, absences: [], nextMeeting: null },
    });
}

describe("ダッシュボードの今後の予定", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-10-17T03:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([1, 7, 8, 9])(
        "%i件ある場合、最大7件を表示し、続きがある場合だけリンクを出す",
        async (count) => {
            const schedules = Array.from({ length: count }, (_, index) =>
                makeSchedule(18 + index)
            );
            setSchedules(schedules);

            render(await HomePage());

            expect(screen.getAllByRole("article")).toHaveLength(
                Math.min(count, 7)
            );
            expect(
                screen.getByText(String(count), { selector: ".badge" })
            ).toBeInTheDocument();

            const link = screen.queryByRole("link", {
                name: "すべての予定を見る",
            });
            if (count > 7) {
                expect(link).toHaveAttribute("href", "/calendar");
            } else {
                expect(link).toBeNull();
            }
        }
    );

    it("過去の予定を除き、開始日順に並べてから先頭7件を表示する", async () => {
        const future = Array.from({ length: 9 }, (_, index) =>
            makeSchedule(18 + index)
        );
        setSchedules([makeSchedule(16), ...future.reverse()]);

        render(await HomePage());

        expect(
            screen
                .getAllByRole("article")
                .map((row) => row.getAttribute("aria-label"))
        ).toEqual([
            "EVENT-18",
            "EVENT-19",
            "EVENT-20",
            "EVENT-21",
            "EVENT-22",
            "EVENT-23",
            "EVENT-24",
        ]);
        expect(
            screen.getByText("9", { selector: ".badge" })
        ).toBeInTheDocument();
    });

    it("長いタイトルも1件として数え、全文をScheduleCardへ渡す", async () => {
        const title = Array.from(
            { length: 10 },
            (_, index) => `タイトル${index + 1}行目`
        ).join("\n");
        const schedules = Array.from({ length: 8 }, (_, index) =>
            makeSchedule(18 + index)
        );
        schedules[0] = makeSchedule(18, title);
        setSchedules(schedules);

        render(await HomePage());

        expect(screen.getAllByRole("article")).toHaveLength(7);
        expect(
            screen.getByRole("article", { name: "EVENT-18" }).textContent
        ).toBe(title);
    });

    it("0件の場合は空の表示になり、一覧へのリンクを出さない", async () => {
        setSchedules([]);

        render(await HomePage());

        expect(screen.getByText("予定はありません")).toBeInTheDocument();
        expect(screen.queryAllByRole("article")).toHaveLength(0);
        expect(
            screen.queryByRole("link", { name: "すべての予定を見る" })
        ).toBeNull();
    });
});
```

### モックと日付を固定する理由

`vi.hoisted`は、`vi.mock`から参照するモック関数を先に用意する仕組み。`setSchedules`で取得APIの返り値を設定すると、HomePageに任意の予定データを渡せる。テストから本番のAPIへは接続しない。

時計・天気・次回部会などは今回のテスト対象外なので、何も描画しないモックへ置き換える。`ScheduleCard`は予定のタイトルとIDを表示する代用品にする。これにより、出欠情報の追加通信やモーダルの状態に左右されず、ページが選んだ予定を確認できる。

`vi.setSystemTime`で「今日」を2026年10月17日に揃える。日付を固定すると、将来このテストを実行しても予定が過去扱いにならない。テスト後は`vi.useRealTimers`で時計を元に戻す。

HomePageはデータを取得する非同期のサーバーコンポーネントなので、`render(await HomePage())`で取得処理が終わった結果を描画する。実際のページ関数を通すため、取得データから表示までのつながりを確認できる。

### テストデータと検証コードの読み方

`makeSchedule(day, title)`は予定1件のテストデータを作る関数。`day`に18を渡すと、2026年10月18日の予定を返す。返り値の型を`: Schedule`と書き、予定の型に必要なフィールドが揃っているかをTypeScriptで確認する。

`Array.from({ length: count }, (_, index) => makeSchedule(18 + index))`は、指定件数の予定をまとめて作る処理。`index`は0から始まるので、日付は18日、19日、20日と続く。`_`は、この例で使わない引数を示す名前である。

`beforeEach`は各テストの前にモックの呼び出し履歴と時刻を準備し、`afterEach`は各テストの後に時計を戻す。テストごとに同じ前提を作り、前のテストの状態に影響されないようにする。

`screen.getAllByRole("article")`は、ScheduleCardのモックが出力した全予定行を取得する。`expect(...).toHaveLength(7)`は、その行数が7件であることを検証する。`getByText`は表示されるはずの文字がない場合にテストを失敗させ、`queryByRole`は要素がない場合に`null`を返す。リンクが出ないケースには後者を使う。

`toHaveAttribute("href", "/calendar")`はリンク先の指定を確認する。実際のNext.jsの画面遷移は、このモックを使うテストでは実行しないため、ブラウザでもリンクをクリックして確認する。

### 各テストが確認するロジック

`it.each([1, 7, 8, 9])`は、同じテストを4種類の件数で実行する書き方。7件と8件を含めることで、上限の判定が1件ずれていないかを確認する。9件の場合にバッジが9のままなら、表示用の配列で全件数を上書きする不具合も検出できる。

並び順のテストでは、過去の予定と、逆順の今後の予定を渡す。期待するIDを明示し、「今後の予定を抽出する → 並べる → 7件を選ぶ」という順序が守られているかを検証する。実装側と同じ`slice`や`sort`で期待値を作っていないため、処理順序を誤ってもテスト側が同じ誤りを繰り返すことはない。

長いタイトルのテストは、改行を含むデータが途中で削られず、1予定として扱われることを確認する。jsdomは実際の折り返しや行高を計算しないため、画面上で10行表示になることはこのテストでは確認しない。

### TDDで進める順序

1. `page.test.tsx`を作り、まず8件以上のケースを実行する。
2. 現状では全件描画され、一覧へのリンクもないため、件数やリンクの期待が失敗することを確認する。
3. ページへ表示用の配列とリンクを追加する。
4. テストが通ったことを確認し、残りのケースも実行する。

実行コマンド:

```sh
npm test -- 'app/(authenticated)/home/page.test.tsx'
```

テスト対象の`page.tsx`は既存なので、新しいコンポーネントファイルを仮作成する必要はない。モジュールが見つからない場合は、テストの配置場所・import先・モック対象のパスを確認する。

## ブラウザで確認する表示

- モバイルとデスクトップで、予定が0件・7件・8件以上の場合を確認する。
- 8件以上の場合は7件の下にリンクがあり、クリックすると`/calendar`へ移動する。
- タイトルが長くても全文が折り返され、他の予定やリンクに重ならない。
- 一覧内に縦スクロールが追加されず、ページ全体を通常どおりスクロールできる。
- 予定の詳細モーダルが引き続き開閉できる。
- ライトモードとダークモードでリンクを読める。

予定ページが持つ既存のカレンダー表示や絞り込みはそのまま使う。このリンクを追加するために、予定ページの取得条件を変更する必要はない。
