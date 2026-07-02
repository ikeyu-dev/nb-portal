import type { ReactNode } from "react";
import AnchorLink from "./AnchorLink";

type ListItem = {
    text: ReactNode;
    children?: ReactNode[];
    orderedChildren?: ReactNode[];
};

type TableRow = {
    label: string;
    value: ReactNode;
};

const tocItems = [
    { id: "common-facility", label: "学友会館の使用ルール" },
    { id: "common-day", label: "当日の基本ルール" },
    { id: "rehearsal-flow", label: "リハーサルの流れ" },
    { id: "performance-notes", label: "演奏時の注意" },
    { id: "nb-rehearsal", label: "リハ対応" },
    { id: "appendix-equipment", label: "機材構成の概要" },
    { id: "nb-setup", label: "搬入搬出の流れ" },
    { id: "plan-reading", label: "構成表の読み方" },
];

const facilityRules: ListItem[] = [
    { text: "ホール内は基本飲食禁止です。" },
    {
        text: "ゴミは臨時設置のゴミ袋に捨てるようにしてください。",
        children: [
            "通常のゴミ箱には養生テープでフタをします。",
            "分別をしっかり行うようにしてください。",
        ],
    },
    { text: "原則、20:30になる前に完全撤収するようにしてください。" },
    {
        text: "搬入口を開けている時に音出しをしないでください。音出しをしている時は搬入口を開けないようにしてください。",
        children: [
            "搬入口のすぐ外は住宅街です。近隣の方に配慮するようにしましょう。",
        ],
    },
    {
        text: "備品が破損した場合は、すぐに所属団体部長とNB部長に報告するようお願いします。",
    },
    { text: "ホール以外で使用できる場所は、ロビーと2階イスのみです。" },
    {
        text: "会議室、宿泊室、給湯室などには指示がない限り入らないようにしてください。",
    },
    {
        text: "タバコは大学内の喫煙所でのみ吸うようにしてください。",
        children: ["学友会館内および周辺は禁煙です。"],
    },
    { text: "正面入口以外の出入口は使用しないでください。" },
    { text: "自転車は正面側に置くようにしてください。" },
];

const dayRules: ListItem[] = [
    {
        text: "ステージの下手・上手を確認しておくようにしてください。",
        children: ["ステージ向かって左側が下手、右側が上手です。"],
    },
    {
        text: "集合時間を必ず守るようにしてください。",
        children: [
            "当日の時間は限られています。集合時間に遅れると全体の進行を妨げることに繋がりますので、集合時間に遅れそうな場合は必ずNBへ連絡をしてください。",
        ],
    },
    {
        text: "常に人が通れるよう、楽器や機材は通路に置かないようにしてください。NBのカゴ類も通路に置かず、設営完了後はステージ袖などに置くようにしてください。",
    },
    { text: "PA卓前2列には入らないようにしてください。" },
    { text: "分からない点はNBのステージマンへ確認をお願いします。" },
];

const performanceNotes: ListItem[] = [
    {
        text: (
            <span className="font-bold underline underline-offset-4">
                マイクは絶対に叩かないようにしてください。
            </span>
        ),
    },
    {
        text: (
            <span className="font-bold underline underline-offset-4">
                返しスピーカーにマイクを向けないようにしてください。
            </span>
        ),
    },
    {
        text: "リハが始まったら、音を取っているパート以外はできるだけ静かにするようにお願いします。",
    },
    { text: "返しスピーカーに足を乗せないようにしてください。" },
    { text: "不明点や困ったことがあれば、ステージマンへ相談をお願いします。" },
];

const setupRules: ListItem[] = [
    {
        text: "積み込みする機材を確認し、次の順に積み込むようにしてください。",
        orderedChildren: [
            "外音スピーカー、返しスピーカー、IO BOX、TF5、照明類",
            "足場(ドラム・PA卓用)、棺桶、部室荷物",
            "スタジオ機材",
        ],
    },
    {
        text: "カゴは重いものから積み、軽いカゴが上にくるように積み込むようにしてください。",
        children: ["高く積みすぎないようにしてください。"],
    },
    {
        text: "照明は安定する場所、かつ高すぎない場所に置くようにしてください。",
    },
    {
        text: "スピーカー類はグリル(網状のカバー)を内側にし、互い違いになるように載せてください。",
    },
    {
        text: "荷物を押さえる人を必ず1人以上確保し、機材が動かないようにしてください。",
        children: [
            "荷台に乗って機材を押さえる人と運転手とで通話を繋いでおき、何かあったらすぐ運転手に伝えられるようにしてください。",
            "荷台の中は暗いので、スマホのライトなどを点けましょう。",
        ],
    },
    { text: "トラック発進時は全体グループLINEに連絡をお願いします。" },
    { text: "キックはスパイクがあるため注意してください。" },
    { text: "荷下ろしの際は無理せず、複数人で行うようにしてください。" },
];

const soundCheckItems = [
    "ドラムは、キック、スネア、ハイハット、ハイタム、ロータム、フロアタム、金物類の順に音を取っていきます。その後、3点セットで音を出してもらい、PA側で音量バランスを調整します。",
    "キーボードは、使う音色を一通り出してください。特に音量差が大きい音色や、曲中で目立つ音色がある場合はPAに伝えてください。",
    "ギターは、通常の音や歪み、その他音色を順に出してください。曲によって音量差が大きい場合はPAに伝えてください。",
    "ベースは、通常の音や歪み、その他音色を順に出してください。スラップなどの奏法変更がある場合はPAに伝えてください。",
    "ボーカルは、本番と同じ声量で声を出してください。複数人いる場合は、1人ずつ確認します。コーラスについても、1人ずつ確認します。",
    "管楽器は、ピンマイクを付けて音を取る場合があります。NB部員がサポートしますので、必要に応じて声をかけてください。",
];

const equipmentRows: TableRow[] = [
    { label: "ミキサー", value: "TF5" },
    { label: "IO BOX", value: "Dr Side/Stage Side/FOH：Tio1608" },
    { label: "外音スピーカー", value: "High-L/High-R：TX2152、Low-L/Low-R：TX1181" },
    { label: "返しスピーカー", value: "FB.SR/FB.C/FB.SL/FB.Dr：WDG-15" },
    { label: "ラインアレイ", value: "InFill-L/InFill-R：HX-5B" },
    { label: "IEM", value: "IEM.1~4：PSM300、IEM.5-L/R：HP2" },
    { label: "パワーアンプ", value: "返し：DP4035、InFill：GX7、High / Low：XTi4002" },
    {
        label: "ドラム",
        value: "Top-L/Top-R：C414、F.Tom/L.Tom/H.Tom：E904、H.Hat：C451、Sn-Top：B57A、Sn-Btm：SM57、Kick-In：B91A、Kick-Out：B52A",
    },
    {
        label: "楽器入力",
        value: "E.Gt.1~3：E906、Ba-Line：PRO48(DI)、Ba-Mic：ATM25、Key.1 / Key.2：DI-1(DI)",
    },
    {
        label: "ボーカル・管",
        value: "Vo.SR/Vo.C/Vo.SL/Vo.Sub：B58A、Vo.Dr：SM58、Horn.1~4：ATM35",
    },
    {
        label: "鋳造に保管されている機材",
        value: "TF5、IO BOX 4つ、TX1181 2発、TX2152 2発、WDG-15 5発、照明、スモーク、カメラ三脚、足場4枚、電源ドラム、イーサコンケーブル、LANケーブル、スピーカーケーブル、キャノンケーブル、フォンケーブル、各種変換ケーブル/アダプタ、黄色3口電源ケーブル、マイクケース、DIケース、大・小 棺桶(マイクスタンドケース)",
    },
    {
        label: "NB部室に保管されている機材",
        value: "PA卓カゴ、配信カゴ、ポータブル電源、インカム、カメラ、AKGマイクケース、タリーランプ、電源タップ、工具箱",
    },
    {
        label: "スタジオの機材",
        value: (
            <>
                7スタ(モダン)：JCM2000
                <br />
                8スタ(サウンド)：JCM900・JC-120・SVT-CL・ドラムセット
                <br />
                9スタ(ロック)：キーボードスタンド・譜面台
            </>
        ),
    },
    {
        label: "ステージ配置",
        value: (
            <>
                ステージは下手から「SR(Stage Right)」、「C(Center)」、「SL(Stage
                Left)」となっています。また、SRはL(FOHから見てLeft)、SLはR(FOHから見てRight)となっています。
                これに従って、VoはVo.SR,Vo.C,Vo.SL,Vo.Sub、外音・ラインアレイはHigh-L,
                Low-R, InFill-Lのように呼びます。
                <br />
                E.GtとHornは下手から1、2、3、4(Hornのみ)で割り当てます。
            </>
        ),
    },
    {
        label: "電源系統",
        value: "構成表の電源系統ページで、接続先と消費電力を確認してください。",
    },
];

const cableColors = [
    { label: "赤：ドラム", className: "bg-[#d94141]" },
    { label: "緑：同期", className: "bg-[#3f9b50]" },
    { label: "黄：ギター", className: "bg-[#e0c23a]" },
    { label: "青：ボーカル", className: "bg-[#3478c6]" },
    { label: "水：キーボード", className: "bg-[#47b9cf]" },
    { label: "ピンク：管楽器", className: "bg-[#d66aa5]" },
    { label: "橙：ベース", className: "bg-[#df8a32]" },
];

function SectionTitle({ id, children }: { id?: string; children: ReactNode }) {
    return (
        <h3
            id={id}
            className="scroll-mt-24 grid grid-cols-[8px_1fr] items-center gap-3 text-xl font-bold leading-tight"
        >
            <span className="h-[1.8em] w-2 rounded-sm bg-primary" />
            <span>{children}</span>
        </h3>
    );
}

function DocumentSection({ children }: { children: ReactNode }) {
    return (
        <section className="space-y-4 border-t border-base-300 pt-8 first:border-t-0 first:pt-0">
            {children}
        </section>
    );
}

function CheckList({ items }: { items: ListItem[] }) {
    return (
        <ul className="grid gap-3">
            {items.map((item, index) => (
                <li
                    key={index}
                    className="grid grid-cols-[8px_1fr] gap-3 text-sm leading-8"
                >
                    <span className="mt-[0.8em] h-1.5 w-1.5 rounded-full bg-base-content/70" />
                    <div>
                        <div>{item.text}</div>
                        {item.children && (
                            <ul className="mt-1 grid gap-1">
                                {item.children.map((child, childIndex) => (
                                    <li
                                        key={childIndex}
                                        className="grid grid-cols-[6px_1fr] gap-2 text-sm leading-7 text-base-content/75"
                                    >
                                        <span className="mt-[0.9em] h-1 w-1 rounded-full bg-base-content/50" />
                                        <span>{child}</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {item.orderedChildren && (
                            <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm leading-7 text-base-content/75">
                                {item.orderedChildren.map((child, childIndex) => (
                                    <li key={childIndex}>{child}</li>
                                ))}
                            </ol>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function NumberedPanel({
    number,
    title,
    children,
}: {
    number: number;
    title: string;
    children: ReactNode;
}) {
    return (
        <article className="grid grid-cols-[28px_1fr] gap-x-3 rounded-md border border-base-300 bg-base-100 p-3">
            <span className="row-span-full grid h-7 w-7 place-items-center rounded-full border border-base-300 bg-base-200 text-sm font-bold">
                {number}
            </span>
            <h4 className="text-base font-bold leading-tight">{title}</h4>
            <div className="col-start-2 mt-1 space-y-2 text-sm leading-7 text-base-content/80">
                {children}
            </div>
        </article>
    );
}

function FlowCard({ children }: { children: ReactNode }) {
    return (
        <article className="rounded-md border border-base-300 bg-base-100 p-3 text-sm leading-7">
            {children}
        </article>
    );
}

function DataTable({ rows }: { rows: TableRow[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="table table-zebra table-sm min-w-[640px] border border-base-300">
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label}>
                            <th className="w-40 whitespace-normal border-r border-base-300 align-top">
                                {row.label}
                            </th>
                            <td className="align-top leading-7">{row.value}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function TrainingDocument() {
    return (
        <article className="space-y-8 text-base-content">
            <section className="space-y-8">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src="/nb_logo.png"
                    alt="日本工業大学 放送研究部 NBC"
                    className="h-auto w-[150px]"
                />
                <div className="space-y-3 text-center">
                    <h2 className="text-3xl font-bold leading-tight">
                        NB講習会 資料
                    </h2>
                    <p className="text-right text-sm text-base-content/60">
                        20260702版
                    </p>
                </div>

                <nav className="border-t border-base-300 pt-6">
                    <h3 className="mb-3 text-lg font-bold">目次</h3>
                    <ol className="grid gap-2 pl-5 text-sm leading-7 sm:grid-cols-2">
                        {tocItems.map((item) => (
                            <li
                                key={item.id}
                                className="list-decimal"
                            >
                                <AnchorLink
                                    targetId={item.id}
                                    className="link link-hover"
                                >
                                    {item.label}
                                </AnchorLink>
                            </li>
                        ))}
                    </ol>
                </nav>
            </section>

            <DocumentSection>
                <SectionTitle id="common-facility">
                    学友会館の使用ルール
                </SectionTitle>
                <CheckList items={facilityRules} />
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="common-day">当日の基本ルール</SectionTitle>
                <CheckList items={dayRules} />
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="rehearsal-flow">
                    リハーサルの流れ
                </SectionTitle>
                <p className="text-sm leading-8">
                    リハーサルでは、本番で演奏しやすい環境を作るために、返しの音量バランスを確認します。また、転換の流れを事前に確認する時間でもあります。限られた時間で進行するため、準備・音出し・撤収をスムーズに行っていただくようご協力をお願いします。
                </p>
                <div className="grid gap-3">
                    <NumberedPanel
                        number={1}
                        title="ステージ下で準備"
                    >
                        <p>
                            ステージに上がる前から、ケースから楽器を出すなど準備を進めておいてください。前のバンドが片付け始めたらステージに上がるようにしてください。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={2}
                        title="セッティング"
                    >
                        <p>
                            NB部員が必要に応じて手伝います。コンセントを使う場合は近くにいるNBのステージマンにお聞きください。返しスピーカー・マイクスタンドの位置を調節するため、ある程度準備が完了したら演奏する位置へ移動をお願いします。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={3}
                        title="音取り"
                    >
                        <p>
                            PAから「セッティング完了している方から音お願いします」や「下手のギターさん音ください」のようにお願いするので、音を出してください。
                        </p>
                        <ul className="list-disc space-y-1 pl-5 text-xs leading-7">
                            {soundCheckItems.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </NumberedPanel>
                    <NumberedPanel
                        number={4}
                        title="返しスピーカーの音量調整"
                    >
                        <p>
                            音取りの後、足元の返しスピーカーの音量バランスを調節します。「ワンフレーズ演奏していただいた後に返しスピーカーの要望を伺います」とPAから案内がありますので、必要に応じて返しスピーカーの音量や音色の要望を伝えてください。
                            近くにいるiPadを持ったNBのステージマンに要望を伝えるか、マイクに向かって「ドラムが大きいので下げてください」や「返しスピーカーのギターを小さくしてください」のようにPAへ伝えてください。調整後、再度ワンフレーズ演奏していただき最終的な返しスピーカーのバランスを確認します。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={5}
                        title="つまみの位置を記録"
                    >
                        <p>
                            本番でも同じ音量バランスで演奏できるように、ヘッドやエフェクターなどのつまみ位置を正確にメモしてください。スマホで写真を撮るのも有効です。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={6}
                        title="撤収"
                    >
                        <p>
                            リハーサルが完了したら、PAより「本番でもよろしくお願いします。」と案内がありますので、素早く撤収してください。
                        </p>
                        <p className="font-bold underline underline-offset-4">
                            ベースやキーボードの方は、PAが「ミュートしたのでケーブルを抜いていただいてOKです」と言うまでケーブルを抜かないようにしてください。
                        </p>
                    </NumberedPanel>
                </div>
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="performance-notes">
                    演奏時の注意
                </SectionTitle>
                <CheckList items={performanceNotes} />
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="nb-rehearsal">リハ対応</SectionTitle>
                <p className="text-sm leading-8">
                    以下の点を確認しながら、臨機応変に対応してください。必要に応じてPAとコミュニケーションを取るようお願いします。
                </p>
                <div className="grid gap-3">
                    <NumberedPanel
                        number={1}
                        title="リハ前"
                    >
                        <p>
                            次のバンドがステージ下で準備できているか確認してください。マイク、返しスピーカー、DI、電源の位置に問題がないかも見ておくようにしてください。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={2}
                        title="セッティング"
                    >
                        <p>
                            演者の立ち位置、マイクスタンドの高さ、返しスピーカーの位置を確認してください。演者からコンセント使用の相談があれば、NB部員が案内してください。
                        </p>
                        <p>
                            キーボードの上段/下段を5・6番どちらに繋いだかなどをPAに伝えていただけると大変助かります。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={3}
                        title="音取り中"
                    >
                        <p>
                            音を出しているパート以外が静かにできているか確認してください。音が来ていない場合は、ケーブル、DI、アンプ、電源の状態を確認し、必要に応じてPAへ共有してください。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={4}
                        title="返しスピーカー調整"
                    >
                        <p>
                            iPadでTF
                            StageMixを開いているステージマンは、返し音量の過不足を演者から聞き取り、必要最小限のバランスにしてください。要望が曖昧な場合は、何を上げるか、何を下げるかを具体的に確認してください。
                        </p>
                    </NumberedPanel>
                    <NumberedPanel
                        number={5}
                        title="撤収・次バンド準備"
                    >
                        <p>
                            リハーサルが完了したら、次のバンドのリハーサルの準備を行ってください。PAから合図があるまで、ベースやキーボードのケーブルが抜かれないよう十分注意してください。
                        </p>
                    </NumberedPanel>
                </div>
                <p className="pt-2 text-sm font-bold leading-8 underline underline-offset-4">
                    リハ中にセット図からの変更が生じた場合は、必ずDiscordの該当イベントチャンネルに共有してください。
                </p>
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="appendix-equipment">
                    機材構成の概要
                </SectionTitle>
                <DataTable rows={equipmentRows} />
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="nb-setup">搬入搬出の流れ</SectionTitle>
                <CheckList items={setupRules} />
            </DocumentSection>

            <DocumentSection>
                <SectionTitle id="plan-reading">構成表の読み方</SectionTitle>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3 text-sm leading-8">
                        <p>
                            各チャンネルの色は、キャノンケーブルについているカラーリングの色と対応しています。
                        </p>
                        <p>
                            結線する際は、ケーブルの色とチャンネルの色が一致しているか確認してください。
                        </p>
                    </div>
                    <ul className="grid gap-2 rounded-md border border-base-300 p-3 text-sm">
                        {cableColors.map((color) => (
                            <li
                                key={color.label}
                                className="flex items-center gap-2"
                            >
                                <span
                                    className={`h-3 w-3 rounded-sm border border-base-300 ${color.className}`}
                                />
                                <span>{color.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="grid gap-3">
                    <FlowCard>
                        <strong className="mb-1 block">1. 機材配置を見る</strong>
                        <p>
                            まずステージ配置図で、下手・上手、ドラム位置、ギターアンプ、ベースアンプ、キーボード、ボーカルマイクの位置関係を確認してください。
                        </p>
                    </FlowCard>
                    <FlowCard>
                        <strong className="mb-1 block">
                            2. IO BOXの記号を把握する
                        </strong>
                        <p>
                            ▲はDr Side、■はStage Side、●はFOHのIO
                            BOXとして読み、構成表上の記号と配置場所を確認してください。
                        </p>
                        <dl className="mt-3 border-l-2 border-base-300 pl-3 text-base-content/75">
                            <dt className="font-bold">IO BOXとは</dt>
                            <dd>
                                「Input/Output
                                Box」の略で、信号の入力と出力を管理するための機材です。
                            </dd>
                        </dl>
                    </FlowCard>
                    <FlowCard>
                        <strong className="mb-1 block">3. INPUTを読む</strong>
                        <p>
                            チャンネル番号、Multiの番号、Name、MIC/DIの各項目を左から確認してください。Nameはミキサー上のチャンネル名と合わせて読むようにしてください。
                        </p>
                        <dl className="mt-3 space-y-2 border-l-2 border-base-300 pl-3 text-base-content/75">
                            <div>
                                <dt className="font-bold">Multiの番号とは</dt>
                                <dd>
                                    普段Vo.Cの足元に置かれている「マルチボックス」のどこに接続するかを示す番号です。
                                </dd>
                            </div>
                            <div>
                                <dt className="font-bold">DIとは</dt>
                                <dd>
                                    DIとは「Direct Injection
                                    Box」の略で、ギターやベース、キーボードなどの電子楽器の信号をマイクと同じ形式に変換し、ノイズを抑えてクリアな状態でミキサーに送るための機材です。
                                </dd>
                            </div>
                        </dl>
                    </FlowCard>
                    <FlowCard>
                        <strong className="mb-1 block">4. OUTPUTを追う</strong>
                        <p>
                            Purpose(用途)、Power
                            Amp(アンプ)、Speaker(スピーカー)を見て、音の信号がどこをどう流れているかを追ってください。
                        </p>
                        <p className="mt-2">
                            「→」はアナログ接続(ケーブルでの結線)、それ以外はデジタル接続(Dante上での割り当て)となっています。
                        </p>
                        <dl className="mt-3 border-l-2 border-base-300 pl-3 text-base-content/75">
                            <dt className="font-bold">Danteとは</dt>
                            <dd>
                                オーストラリアのAudinate社が開発したデジタルオーディオネットワークの規格です。音声信号をデジタル化し、LANケーブルを通じて複数の機器間で伝送することができます。
                                <br />
                                これにより、従来のアナログ接続に比べてケーブルの本数を大幅に削減できるとともに、音質の劣化や遅延を防ぐことができます。
                            </dd>
                        </dl>
                    </FlowCard>
                    <FlowCard>
                        <strong className="mb-1 block">
                            5. ミキサー接続表を見る
                        </strong>
                        <p>
                            TF5の入力番号、AUX、ST、MTRX、DCA/GROUPがそれぞれ書かれています。TF5を操作する際、どのチャンネルを触るかを事前に確認してください。
                        </p>
                        <p className="mt-2">
                            管楽器を含むバンドでは固定バンク(MAIN)を必ず使用しますが、管楽器を含まないバンドではカスタムフェーダーバンク(CUSTOM)を使用すると便利です。
                        </p>
                    </FlowCard>
                </div>

                <p className="text-sm leading-8">
                    以上の手順で構成表を読み、まずは音の流れをおおまかに把握してください。実際の機材を見ながら構成表を読むと、より理解が深まると思います。
                </p>
            </DocumentSection>
        </article>
    );
}
