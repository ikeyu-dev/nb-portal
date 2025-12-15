import { NextRequest, NextResponse } from "next/server";

interface BusTime {
    hour: number;
    minutes: number[];
}

interface BusSchedule {
    stationName: string;
    fromStation: BusTime[];
    fromUniversity: BusTime[];
    notices: string[];
}

interface BusScheduleResponse {
    success: boolean;
    data?: {
        date: string;
        scheduleType: string;
        tobu: BusSchedule;
        jr: BusSchedule;
    };
    error?: string;
}

// テーブルをパース
const parseTable = (tableHtml: string): BusTime[] => {
    const times: BusTime[] = [];

    // ヘッダー行から時間を取得 <th>8</th><th>9</th>...
    const headerRowMatch = tableHtml.match(
        /<tr[^>]*>[\s\S]*?<th[^>]*>時<\/th>([\s\S]*?)<\/tr>/i
    );
    if (!headerRowMatch) return times;

    const hourMatches = headerRowMatch[1].match(/<th>(\d+)<\/th>/g);
    const hours =
        hourMatches?.map((h) => {
            const match = h.match(/(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }) || [];

    // データ行から分を取得 - 2番目の<tr>を探す（駅発 or 大学発の行）
    const dataRowMatch = tableHtml.match(
        /<tr[^>]*>\s*<td[^>]*class="tbl_title"[^>]*>[\s\S]*?<\/td>([\s\S]*?)<\/tr>/i
    );
    if (!dataRowMatch) return times;

    // 各<td>を取得
    const tdMatches = dataRowMatch[1].match(/<td>[\s\S]*?<\/td>/gi) || [];

    hours.forEach((hour, index) => {
        const td = tdMatches[index] || "";
        // <li>55</li> から数字を抽出
        const minuteMatches = td.match(/<li>(\d+)<\/li>/g);
        const minutes =
            minuteMatches?.map((m) => {
                const match = m.match(/(\d+)/);
                return match ? parseInt(match[1]) : 0;
            }) || [];

        times.push({ hour, minutes });
    });

    return times;
};

// HTMLからバス時刻表をパース
const parseScheduleSection = (
    html: string,
    sectionClass: string
): BusSchedule => {
    // divセクションを抽出
    const sectionRegex = new RegExp(
        `<div\\s+class="${sectionClass}"[^>]*>([\\s\\S]*?)(?=<div\\s+class="(?:tobu|jr)"[^>]*>|$)`,
        "i"
    );
    let sectionMatch = html.match(sectionRegex);

    // マッチしない場合、別のパターンを試す
    if (!sectionMatch) {
        const altRegex = new RegExp(
            `<div class="${sectionClass}">([\\s\\S]*?)(?:<div class="(?:tobu|jr)">|<footer|$)`,
            "i"
        );
        sectionMatch = html.match(altRegex);
    }

    const defaultName = sectionClass === "tobu" ? "東武動物公園駅" : "新白岡駅";

    if (!sectionMatch) {
        return {
            stationName: defaultName,
            fromStation: [],
            fromUniversity: [],
            notices: [],
        };
    }

    const content = sectionMatch[1];

    // 駅名を取得
    const captionMatch = content.match(/<caption>([^<]+)<\/caption>/);
    const stationName = captionMatch?.[1] || defaultName;

    // テーブルを取得（最大2つ）
    const tableMatches =
        content.match(
            /<table[^>]*class="[^"]*_tbl"[^>]*>[\s\S]*?<\/table>/gi
        ) || [];

    // テーブルが見つからない場合、class属性なしのパターンも試す
    const tables =
        tableMatches.length > 0
            ? tableMatches
            : content.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || [];

    // お知らせ（tobu_att）を取得
    const noticeMatches =
        content.match(/<div\s+class="[^"]*_att"[^>]*>([\s\S]*?)<\/div>/gi) ||
        [];
    const notices = noticeMatches
        .map((notice) => {
            // HTMLタグを除去してテキストのみ抽出
            return notice
                .replace(/<div[^>]*>/gi, "")
                .replace(/<\/div>/gi, "")
                .replace(/<br\s*\/?>/gi, " ")
                .replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, "$1")
                .trim();
        })
        .filter((notice) => notice.length > 0);

    return {
        stationName,
        fromStation: tables[0] ? parseTable(tables[0]) : [],
        fromUniversity: tables[1] ? parseTable(tables[1]) : [],
        notices,
    };
};

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const date =
            searchParams.get("date") || new Date().toISOString().split("T")[0];

        const url = `https://www.nit.ac.jp/campus/access/bus-schedule?date=${date}`;

        // 今日の23:59:59までの秒数を計算（日本時間）
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        const secondsUntilEndOfDay = Math.max(
            Math.floor((endOfDay.getTime() - now.getTime()) / 1000),
            60 // 最低60秒はキャッシュ
        );

        const response = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
            },
            next: { revalidate: secondsUntilEndOfDay }, // その日の23:59までキャッシュ
        });

        if (!response.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Failed to fetch bus schedule: ${response.status}`,
                } as BusScheduleResponse,
                { status: response.status }
            );
        }

        const html = await response.text();

        // ダイヤの種類を取得（平日ダイヤ、土曜ダイヤ、特別ダイヤなど）
        const scheduleTypeMatch = html.match(
            /<div\s+class="bus_subtitle"[^>]*>([^<]+)<\/div>/i
        );
        const scheduleType = scheduleTypeMatch?.[1]?.trim() || "";

        // パース
        const tobu = parseScheduleSection(html, "tobu");
        const jr = parseScheduleSection(html, "jr");

        return NextResponse.json({
            success: true,
            data: {
                date,
                scheduleType,
                tobu,
                jr,
            },
        } as BusScheduleResponse);
    } catch (error) {
        console.error("Bus schedule API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            } as BusScheduleResponse,
            { status: 500 }
        );
    }
}
