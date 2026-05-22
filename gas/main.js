// ============================================
// 欠席連絡フォーム処理 - フィールドマッピング定義
// Googleフォームのヘッダー名から内部フィールド名へ変換するための設定
// ============================================
const FIELD_MAPPING = [
    {
        keywords: ["タイムスタンプ", "timestamp"],
        field: "timestamp",
        formatType: "datetime",
    },
    { keywords: ["学籍番号"], field: "studentId" },
    { keywords: ["氏名", "あだ名"], field: "name" },
    { keywords: ["種別"], field: "type" },
    { keywords: ["理由"], field: "reason" },
    { keywords: ["早退する時間"], field: "leaveTime", formatType: "time" },
    { keywords: ["抜ける時間"], field: "breakStartTime", formatType: "time" },
    {
        keywords: ["戻る時間", "活動に戻る時間"],
        field: "breakEndTime",
        formatType: "time",
    },
];

// ============================================
// ユーティリティ関数
// ============================================

/**
 * 値がDateオブジェクトかどうかを判定
 * @param {*} value - 判定する値
 * @returns {boolean} Dateオブジェクトならtrue
 */
const isDate = (value) =>
    Object.prototype.toString.call(value) === "[object Date]";

/**
 * 時刻をHH:MM形式にフォーマット
 * @param {Date|string} timeValue - 時刻値（Dateオブジェクトまたは文字列）
 * @returns {string} "HH:MM"形式の文字列
 */
const formatTime = (timeValue) => {
    if (!timeValue) return "";

    if (isDate(timeValue)) {
        const hours = String(timeValue.getHours()).padStart(2, "0");
        const minutes = String(timeValue.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    if (typeof timeValue === "string" && /^\d{1,2}:\d{2}$/.test(timeValue)) {
        const [h, m] = timeValue.split(":");
        return `${h.padStart(2, "0")}:${m}`;
    }

    return String(timeValue);
};

/**
 * 日時をYYYY/MM/DD HH:MM形式にフォーマット
 * @param {Date|string} dateValue - 日時値（Dateオブジェクトまたは文字列）
 * @returns {string} "YYYY/MM/DD HH:MM"形式の文字列
 */
const formatDateTime = (dateValue) => {
    if (!dateValue) return "";

    if (isDate(dateValue)) {
        const year = dateValue.getFullYear();
        const month = String(dateValue.getMonth() + 1).padStart(2, "0");
        const day = String(dateValue.getDate()).padStart(2, "0");
        const hours = String(dateValue.getHours()).padStart(2, "0");
        const minutes = String(dateValue.getMinutes()).padStart(2, "0");
        return `${year}/${month}/${day} ${hours}:${minutes}`;
    }

    return String(dateValue);
};

/**
 * フォーマットタイプに応じて値を整形
 * @param {*} value - 整形する値
 * @param {string} formatType - "time" | "datetime" | undefined
 * @returns {*} 整形後の値
 */
const formatValue = (value, formatType) => {
    if (formatType === "time") return formatTime(value);
    if (formatType === "datetime") return formatDateTime(value);
    return value;
};

const GAS_CACHE_KEYS = {
    dashboard: "dashboard-data:v2",
    schedules: "schedules:v2",
    absences: "absences:v2",
    memberDisplayNames: "member-display-names:v1",
};

const GAS_CACHE_SECONDS = {
    dashboard: 60,
    schedules: 60,
    absences: 30,
    memberDisplayNames: 5 * 60,
};

const getScriptCache = () => CacheService.getScriptCache();

const getCachedJson = (key) => {
    try {
        const cached = getScriptCache().get(key);
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.warn(`Cache read failed: ${key}`, error);
        return null;
    }
};

const putCachedJson = (key, value, expirationSeconds) => {
    try {
        getScriptCache().put(key, JSON.stringify(value), expirationSeconds);
    } catch (error) {
        console.warn(`Cache write failed: ${key}`, error);
    }
};

const removeCacheKeys = (keys) => {
    try {
        getScriptCache().removeAll(keys);
    } catch (error) {
        console.warn("Cache remove failed", error);
    }
};

const clearScheduleCaches = () =>
    removeCacheKeys([GAS_CACHE_KEYS.dashboard, GAS_CACHE_KEYS.schedules]);

const clearAbsenceCaches = () =>
    removeCacheKeys([GAS_CACHE_KEYS.dashboard, GAS_CACHE_KEYS.absences]);

const clearMemberCaches = () =>
    removeCacheKeys([
        GAS_CACHE_KEYS.dashboard,
        GAS_CACHE_KEYS.memberDisplayNames,
    ]);

const clearCachesForEditedSheet = (sheetName) => {
    switch (sheetName) {
        case "schedules":
            clearScheduleCaches();
            break;
        case "absence_data":
            clearAbsenceCaches();
            break;
        case "members":
            clearMemberCaches();
            break;
        default:
            break;
    }
};

/**
 * スプレッドシートを直接編集した場合に関連キャッシュを削除する。
 * 単純トリガーとしても、インストール型トリガーとしても利用できる。
 * @param {Object} e - 編集イベント
 */
function onEdit(e) {
    const sheet = e?.range?.getSheet?.();
    if (!sheet) return;
    clearCachesForEditedSheet(sheet.getName());
}

const NEXT_MEETING_TITLES = ["部会", "次回部会"];
const NEXT_MEETING_DEFAULT_TITLE = "部会";
const NEXT_MEETING_DEFAULT_COLOR = "primary";
const APP_TIME_ZONE = "Asia/Tokyo";

const getNextMeetingModeLabel = (mode) =>
    mode === "IN_PERSON" ? "対面" : "Discord";

const parseNextMeetingMode = (value) => {
    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "対面" || normalized === "IN_PERSON") {
        return "IN_PERSON";
    }
    return "DISCORD";
};

const toNextMeetingDate = (year, month, date) =>
    `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

const toNextMeetingTime = (hour, minute) =>
    `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

const splitNextMeetingDate = (dateString) => {
    const [year, month, date] = String(dateString).split("-").map(Number);
    return { year, month, date };
};

const splitNextMeetingTime = (timeString) => {
    const [timeHH, timeMM] = String(timeString).split(":").map(Number);
    return { timeHH, timeMM };
};

const getTodayParts = () => {
    const todayString = Utilities.formatDate(
        new Date(),
        APP_TIME_ZONE,
        "yyyy-MM-dd"
    );
    const [year, month, date] = todayString.split("-").map(Number);
    return { year, month, date, todayString };
};

const buildNextMeetingSettingsFromScheduleRow = (row) => ({
    eventId: String(row[0]),
    date: toNextMeetingDate(row[1], row[2], row[3]),
    time: toNextMeetingTime(row[4], row[5]),
    mode: parseNextMeetingMode(row[7]),
    updatedBy: row[15] || row[13] || null,
    updatedAt: row[16] || row[14] || null,
});

const findNextMeetingSchedule = (sheet) => {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return null;

    const rows = sheet.getRange(2, 1, lastRow - 1, 17).getValues();
    const today = getTodayParts();
    const todayTimestamp = new Date(
        today.year,
        today.month - 1,
        today.date
    ).getTime();

    const candidates = [];
    rows.forEach((row, index) => {
        const title = String(row[6] || "").trim();
        if (!NEXT_MEETING_TITLES.includes(title)) return;

        const year = Number(row[1]);
        const month = Number(row[2]);
        const date = Number(row[3]);
        if (!year || !month || !date) return;

        const timestamp = new Date(year, month - 1, date).getTime();
        if (timestamp < todayTimestamp) return;

        candidates.push({
            rowNumber: index + 2,
            row,
            timestamp,
            timeHH: Number(row[4]) || 0,
            timeMM: Number(row[5]) || 0,
        });
    });

    candidates.sort((a, b) => {
        if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
        if (a.timeHH !== b.timeHH) return a.timeHH - b.timeHH;
        return a.timeMM - b.timeMM;
    });

    return candidates[0] || null;
};

const getNextMeetingSettings = () => {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName("schedules");
    if (!sheet) return null;

    const nextMeeting = findNextMeetingSchedule(sheet);
    return nextMeeting
        ? buildNextMeetingSettingsFromScheduleRow(nextMeeting.row)
        : null;
};

const getTodayString = () => getTodayParts().todayString;

const formatNextMeetingDateLabel = (dateString, timeString) => {
    const date = new Date(`${dateString}T00:00:00`);
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    return `${dateString.replace(/-/g, "/")}(${weekdays[date.getDay()]}) ${timeString}`;
};

const buildNextMeetingReminderEmbed = (settings, options = {}) => {
    const title = options.title || "次回部会のお知らせ";
    const dateLabel = formatNextMeetingDateLabel(settings.date, settings.time);
    const updatedAtLabel = settings.updatedAt
        ? formatDateTime(settings.updatedAt)
        : null;

    const embed = {
        title,
        description: options.description || "次回の部会予定です。",
        color: settings.mode === "DISCORD" ? 0x5865f2 : 0x2ecc71,
        fields: [
            {
                name: "日時",
                value: dateLabel,
                inline: false,
            },
        ],
    };

    if (settings.updatedAt || settings.updatedBy) {
        embed.footer = {
            text: [
                updatedAtLabel ? `更新 ${updatedAtLabel}` : null,
                settings.updatedBy || null,
            ]
                .filter(Boolean)
                .join(" / "),
        };
    }

    return embed;
};

// ============================================
// プッシュ通知送信
// Next.jsのAPIを呼び出して全購読者にプッシュ通知を送信
// ============================================

/**
 * プッシュ通知を送信
 * @param {string} title - 通知タイトル
 * @param {string} body - 通知本文
 * @param {string} url - クリック時のURL
 */
const sendPushNotification = (title, body, url) => {
    try {
        const PUSH_API_URL = "https://nb-portal.vercel.app/api/push-send";
        const PUSH_API_SECRET =
            PropertiesService.getScriptProperties().getProperty(
                "PUSH_API_SECRET"
            );

        if (!PUSH_API_SECRET) {
            console.log("PUSH_API_SECRET is not configured");
            return;
        }

        const response = UrlFetchApp.fetch(PUSH_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${PUSH_API_SECRET}`,
            },
            payload: JSON.stringify({
                title,
                body,
                url,
                tag: "schedule-update",
            }),
            muteHttpExceptions: true,
        });

        const responseCode = response.getResponseCode();
        if (responseCode !== 200) {
            console.log(
                `Push notification failed with status ${responseCode}: ${response.getContentText()}`
            );
        }
    } catch (error) {
        console.log(`Push notification error: ${error.toString()}`);
    }
};

// ============================================
// Googleフォーム送信時のトリガー処理
// フォーム送信 → Discord通知 + メール送信
// ============================================

/**
 * スプレッドシートの新規行からフォームデータを取得
 * FIELD_MAPPINGを使用してヘッダー名からフィールドを特定
 * @param {Object} e - フォーム送信イベントオブジェクト
 * @returns {Object} フィールド名をキーとしたフォームデータ
 */
const getFormData = (e) => {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const row = e.range.getRow();
    const headers = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0];
    const values = sheet
        .getRange(row, 1, 1, sheet.getLastColumn())
        .getValues()[0];

    const formData = {};

    headers.forEach((header, index) => {
        const value = values[index];
        for (const mapping of FIELD_MAPPING) {
            if (mapping.keywords.some((keyword) => header.includes(keyword))) {
                formData[mapping.field] = formatValue(
                    value,
                    mapping.formatType
                );
                break;
            }
        }
    });

    return formData;
};

/** 種別に応じたEmbed色を返す */
const getAbsenceColor = (type) => {
    if (type === "出席") return 0x57f287;
    if (type === "欠席") return 0xed4245;
    if (type === "遅刻") return 0xfee75c;
    if (type === "早退") return 0xf0b232;
    if (type === "中抜け") return 0x5865f2;
    return 0x95a5a6;
};

/**
 * 種別と時間情報を結合した表示文字列を返す
 * @param {string} type - 種別
 * @param {Object} opts - 時間情報 { leaveTime, breakStartTime, breakEndTime, timeLeavingEarly, timeStepOut, timeReturn }
 * @returns {string}
 */
const formatTypeWithTime = (type, opts = {}) => {
    const leaveTime = opts.leaveTime || opts.timeLeavingEarly;
    const stepOut = opts.breakStartTime || opts.timeStepOut;
    const stepReturn = opts.breakEndTime || opts.timeReturn;

    if (type === "早退" && leaveTime) return `${type}（${leaveTime}）`;
    if (type === "中抜け" && (stepOut || stepReturn))
        return `${type}（${stepOut || ""} ~ ${stepReturn || ""}）`;
    return type;
};

/**
 * 欠席連絡用のDiscord Embedオブジェクトを構築
 * @param {Object} params - { name, type, reason, reasonDetail, timestamp, ...時間情報 }
 * @returns {Object} Discord Embedオブジェクト
 */
const buildAbsenceEmbed = (params) => {
    const typeDisplay = formatTypeWithTime(params.type, params);
    const isAttendance = params.type === "出席";
    const fields = [
        { name: "氏名", value: params.name || "不明", inline: true },
        { name: "種別", value: typeDisplay, inline: true },
    ];

    if (params.reason) {
        fields.push({ name: "理由", value: params.reason, inline: false });
    }
    if (params.reasonDetail) {
        fields.push({
            name: "詳細",
            value: params.reasonDetail,
            inline: false,
        });
    }

    const embed = {
        title: isAttendance ? "出席申告" : "欠席連絡",
        color: getAbsenceColor(params.type),
        fields,
    };

    if (params.timestamp) {
        embed.footer = { text: params.timestamp };
    }

    return embed;
};

/**
 * Discord WebhookにEmbedメッセージを送信
 * @param {string} webhookURL - Discord Webhook URL
 * @param {Object|Object[]} embeds - Embedオブジェクトまたは配列
 * @param {Object} options - { content?: string }
 */
const sendToDiscord = (webhookURL, embeds, options = {}) => {
    const embedArray = Array.isArray(embeds) ? embeds : [embeds];
    const message = {
        embeds: embedArray,
    };
    if (options.content) {
        message.content = options.content;
    }
    const MAX_RETRY_WAIT_MS = 5 * 60 * 1000;

    const request = {
        method: "POST",
        headers: { "Content-type": "application/json" },
        payload: JSON.stringify(message),
        muteHttpExceptions: true,
    };

    const normalizeRetryAfterMs = (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue) || numericValue <= 0) return null;

        // Discord usually returns seconds, but Cloudflare 1015 responses may
        // surface millisecond-like integer values through Apps Script.
        return numericValue >= 1000
            ? Math.ceil(numericValue)
            : Math.ceil(numericValue * 1000);
    };

    const getRetryAfterMs = (response) => {
        const body = response.getContentText();
        try {
            const parsedBody = JSON.parse(body);
            const retryAfterMs = normalizeRetryAfterMs(parsedBody.retry_after);
            if (retryAfterMs) return retryAfterMs;
        } catch (_) {
            // Non-JSON rate limit bodies are handled by headers below.
        }

        const headers = response.getAllHeaders();
        const retryAfterHeader =
            headers["Retry-After"] ||
            headers["retry-after"] ||
            headers["X-RateLimit-Reset-After"] ||
            headers["x-ratelimit-reset-after"];

        return normalizeRetryAfterMs(retryAfterHeader) || 5000;
    };

    const sendRequest = () => UrlFetchApp.fetch(webhookURL, request);

    let response = sendRequest();
    let responseCode = response.getResponseCode();

    if (responseCode === 429) {
        const responseBody = response.getContentText();
        if (responseBody.includes("error code: 1015")) {
            throw new Error(
                `Discord webhook request blocked by Cloudflare 1015: ${responseBody}`
            );
        }

        const waitMs = getRetryAfterMs(response);

        if (waitMs > MAX_RETRY_WAIT_MS) {
            throw new Error(
                `Discord webhook rate limited with excessive retry delay ${waitMs}ms: ${responseBody}`
            );
        }

        console.log(
            `Discord webhook rate limited. Retrying after ${waitMs}ms. Body: ${responseBody}`
        );
        Utilities.sleep(waitMs);

        response = sendRequest();
        responseCode = response.getResponseCode();
    }

    if (responseCode < 200 || responseCode >= 300) {
        throw new Error(
            `Discord webhook request failed with status ${responseCode}: ${response.getContentText()}`
        );
    }
};

/**
 * フォーム送信者にメールで送信完了通知を送る
 * 送信先: 学籍番号@NIT_DOMAIN（スクリプトプロパティで設定）
 * @param {Object} formData - フォームデータ
 */
const sendEmail = (formData) => {
    if (!formData.studentId) return;

    const domain =
        PropertiesService.getScriptProperties().getProperty("NIT_DOMAIN");

    const email = `${formData.studentId}@${domain}`;
    const subject = "欠席連絡フォーム送信完了通知";

    let bodyText = `${formData.name} さん\n\n`;
    bodyText += `以下の内容でフォームが送信されました．\n\n`;
    bodyText += `氏名: ${formData.name}\n`;
    bodyText += `種別: ${formData.type}`;

    if (formData.type === "早退" && formData.leaveTime) {
        bodyText += `(${formData.leaveTime})`;
    } else if (
        formData.type?.includes("中抜け") &&
        (formData.breakStartTime || formData.breakEndTime)
    ) {
        bodyText += `(${formData.breakStartTime} ~ ${formData.breakEndTime})`;
    }

    bodyText += `\n\n`;
    bodyText += `送信日時: ${formData.timestamp}\n`;

    MailApp.sendEmail(email, subject, bodyText, { name: "欠席連絡システム" });
};

/**
 * Googleフォーム送信時のメインハンドラ（トリガーで呼び出し）
 * 1. フォームデータを取得
 * 2. Discord Webhookに通知
 * 3. 送信者にメール送信
 * @param {Object} e - フォーム送信イベントオブジェクト
 */
function onSubmit(e) {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

    const formData = getFormData(e);
    const embed = buildAbsenceEmbed(formData);
    sendToDiscord(webhookURL, embed);
    sendEmail(formData);
}

// ============================================
// 日次まとめ通知（手動実行または時間トリガー用）
// ============================================

/**
 * 当日の全欠席・遅刻・早退・中抜けをまとめてDiscordに送信
 * 手動実行または時間トリガーで毎日の活動開始前に実行想定
 */
function sendTodayAbsences() {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
    if (!webhookURL) {
        throw new Error("WEBHOOK_URL is not configured");
    }

    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const schedulesSheet = spreadsheet.getSheetByName("schedules");
    const absenceSheet = spreadsheet.getSheetByName("absence_data");

    if (!schedulesSheet) {
        throw new Error("Sheet 'schedules' not found");
    }
    if (!absenceSheet) {
        throw new Error("Sheet 'absence_data' not found");
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dateString = `${year}/${String(month).padStart(2, "0")}/${String(date).padStart(2, "0")}`;

    const scheduleLastRow = schedulesSheet.getLastRow();
    const todayEventIds = new Set();
    if (scheduleLastRow >= 2) {
        const scheduleRows = schedulesSheet
            .getRange(2, 1, scheduleLastRow - 1, 4)
            .getValues();
        scheduleRows.forEach((row) => {
            const eventId = String(row[0] || "");
            const scheduleYear = Number(row[1]);
            const scheduleMonth = Number(row[2]);
            const scheduleDate = Number(row[3]);
            if (
                eventId &&
                scheduleYear === year &&
                scheduleMonth === month &&
                scheduleDate === date
            ) {
                todayEventIds.add(eventId);
            }
        });
    }

    const targetTypes = new Set(["欠席", "遅刻", "早退", "中抜け"]);
    const absenceLastRow = absenceSheet.getLastRow();

    const fields = [];
    if (todayEventIds.size > 0 && absenceLastRow >= 2) {
        // A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:詳細, H:早退時間, I:抜ける時間, J:戻る時間
        const absenceRows = absenceSheet
            .getRange(2, 1, absenceLastRow - 1, 10)
            .getValues();

        absenceRows.forEach((row) => {
            const eventId = String(row[1] || "");
            const type = String(row[4] || "");
            if (!todayEventIds.has(eventId) || !targetTypes.has(type)) return;

            const typeDisplay = formatTypeWithTime(type, {
                timeLeavingEarly: row[7],
                timeStepOut: row[8],
                timeReturn: row[9],
            });

            fields.push({
                name: String(row[3] || "不明"),
                value: typeDisplay,
                inline: true,
            });
        });
    }

    if (fields.length === 0) {
        fields.push({
            name: "情報",
            value:
                todayEventIds.size === 0
                    ? "本日の予定はありません"
                    : "本日の欠席者はいません",
            inline: false,
        });
    }

    const embed = {
        title: `${dateString} 欠席者一覧`,
        color: 0x5865f2,
        fields,
    };

    sendToDiscord(webhookURL, embed);
}

/**
 * 旧トリガー名との互換用。新規トリガーは sendTodayAbsences を指定する。
 */
function sendAllAbsece() {
    sendTodayAbsences();
}

const getNextMeetingMentionText = () =>
    PropertiesService.getScriptProperties().getProperty(
        "NEXT_MEETING_ROLE_MENTION"
    ) || "@部員";

const getNextMeetingUnsetMentionText = () =>
    PropertiesService.getScriptProperties().getProperty(
        "NEXT_MEETING_UNSET_ROLE_MENTION"
    ) || "@部長";

const getNextMeetingWebhookURL = () =>
    PropertiesService.getScriptProperties().getProperty(
        "NEXT_MEETING_WEBHOOK_URL"
    ) ||
    PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

const sendNextMeetingUnsetReminder = (webhookURL) => {
    sendToDiscord(
        webhookURL,
        {
            title: "次回部会が未設定です",
            description:
                "本日7:00時点で次回部会が設定されていません。ポータルから次回部会を設定してください。",
            color: 0xf1c40f,
        },
        {
            content: getNextMeetingUnsetMentionText(),
        }
    );
};

function sendNextMeetingMorningReminder() {
    const webhookURL = getNextMeetingWebhookURL();
    const settings = getNextMeetingSettings();

    if (!webhookURL) {
        return;
    }

    if (!settings) {
        sendNextMeetingUnsetReminder(webhookURL);
        return;
    }

    if (settings.date !== getTodayString()) {
        return;
    }

    const embed = buildNextMeetingReminderEmbed(settings, {
        title: "本日の部会リマインド",
        description:
            settings.mode === "DISCORD"
                ? "本日の部会は Discord 開催です。"
                : "本日の部会は対面開催です。",
    });
    sendToDiscord(webhookURL, embed, {
        content: getNextMeetingMentionText(),
    });
}

function sendNextMeetingReminderNow() {
    const webhookURL = getNextMeetingWebhookURL();
    const settings = getNextMeetingSettings();

    if (!webhookURL) {
        throw new Error(
            "NEXT_MEETING_WEBHOOK_URL or WEBHOOK_URL is not configured"
        );
    }

    if (!settings) {
        sendNextMeetingUnsetReminder(webhookURL);
        return;
    }

    const embed = buildNextMeetingReminderEmbed(settings, {
        title: "次回部会のお知らせ",
        description:
            settings.mode === "DISCORD"
                ? "次回部会は Discord で行います。"
                : "次回部会は対面で行います。",
    });
    sendToDiscord(webhookURL, embed, {
        content: getNextMeetingMentionText(),
    });
}

function sendNextMeetingEveningReminder() {
    const webhookURL = getNextMeetingWebhookURL();
    const settings = getNextMeetingSettings();

    if (
        !webhookURL ||
        !settings ||
        settings.date !== getTodayString() ||
        settings.mode !== "DISCORD"
    ) {
        return;
    }

    const embed = buildNextMeetingReminderEmbed(settings, {
        title: "本日18:00 Discord部会リマインド",
        description: "このあとの部会は Discord 開催です。",
    });
    sendToDiscord(webhookURL, embed, {
        content: getNextMeetingMentionText(),
    });
}

function setupNextMeetingReminderTriggers() {
    const handlerNames = [
        "sendNextMeetingMorningReminder",
        "sendNextMeetingEveningReminder",
    ];

    ScriptApp.getProjectTriggers().forEach((trigger) => {
        if (handlerNames.includes(trigger.getHandlerFunction())) {
            ScriptApp.deleteTrigger(trigger);
        }
    });

    ScriptApp.newTrigger("sendNextMeetingMorningReminder")
        .timeBased()
        .atHour(7)
        .nearMinute(0)
        .everyDays(1)
        .create();

    ScriptApp.newTrigger("sendNextMeetingEveningReminder")
        .timeBased()
        .atHour(18)
        .nearMinute(0)
        .everyDays(1)
        .create();
}

// ============================================
// Web API エンドポイント
// Next.jsフロントエンドからのHTTPリクエストを処理
// ============================================

/**
 * JSONレスポンスを作成
 * @param {Object} data - レスポンスデータ
 * @param {number} statusCode - HTTPステータスコード（未使用、GASでは常に200）
 * @returns {TextOutput} JSON形式のレスポンス
 */
const createResponse = (data, statusCode = 200) => {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
};

/**
 * エラーレスポンスを作成
 * @param {string} message - エラーメッセージ
 * @param {number} statusCode - HTTPステータスコード（レスポンスに含める）
 * @returns {TextOutput} JSON形式のエラーレスポンス
 */
const createErrorResponse = (message, statusCode = 400) => {
    return createResponse(
        {
            success: false,
            error: message,
        },
        statusCode
    );
};

/**
 * GETリクエストのメインハンドラ（GAS Web App必須関数）
 * pathパラメータでエンドポイントを振り分け
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} JSON形式のレスポンス
 */
function doGet(e) {
    try {
        const path = e.parameter.path || "";

        switch (path) {
            case "items":
                return handleGetItems(e);
            case "members":
                return handleGetMembers(e);
            case "schedules":
                return handleGetSchedules(e);
            case "absences":
                return handleGetAbsences(e);
            case "event-absences":
                return handleGetEventAbsences(e);
            case "next-meeting":
                return handleGetNextMeeting(e);
            case "dashboard-data":
                return handleGetDashboardData(e);
            case "verify-member":
                return handleVerifyMember(e);
            case "notifications":
                return handleGetNotifications(e);
            case "push-subscriptions":
                return handleGetPushSubscriptions(e);
            case "health":
                return createResponse({
                    success: true,
                    message: "API is running",
                    timestamp: new Date().toISOString(),
                });
            default:
                // パス未指定時はAPI情報を返す
                return createResponse({
                    success: true,
                    message: "NB Portal API",
                    version: "1.0.0",
                    endpoints: {
                        items: "?path=items",
                        members: "?path=members",
                        schedules: "?path=schedules",
                        absences: "?path=absences&date=YYYY-MM-DD",
                        eventAbsences: "?path=event-absences&eventId=EVENT_ID",
                        nextMeeting: "?path=next-meeting",
                        dashboardData: "?path=dashboard-data",
                        verifyMember:
                            "?path=verify-member&identifier=STUDENT_NUMBER",
                        notifications: "?path=notifications&limit=N",
                        health: "?path=health",
                    },
                });
        }
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
}

/**
 * OPTIONSリクエストのハンドラ（CORS preflight対応）
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} 空のレスポンス
 */
function doOptions(e) {
    const output = ContentService.createTextOutput("");
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}

/**
 * POSTリクエストのメインハンドラ（GAS Web App必須関数）
 * pathパラメータでエンドポイントを振り分け
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} JSON形式のレスポンス
 */
function doPost(e) {
    try {
        const path = e.parameter.path || "";
        const postData = JSON.parse(e.postData.contents || "{}");

        switch (path) {
            case "absences":
                return handlePostAbsence(postData);
            case "absences/update":
                return handleUpdateAbsence(postData);
            case "absences/delete":
                return handleDeleteAbsence(postData);
            case "schedules":
                return handlePostSchedule(postData);
            case "schedules/update":
                return handleUpdateSchedule(postData);
            case "schedules/delete":
                return handleDeleteSchedule(postData);
            case "next-meeting":
                return handlePostNextMeeting(postData);
            case "next-meeting/announce":
                sendNextMeetingReminderNow();
                return createResponse({
                    success: true,
                    message: "Next meeting announcement sent",
                });
            case "items":
                return handlePostItems(postData);
            case "members":
                return handlePostMember(postData);
            case "items/update":
                return handleUpdateItem(postData);
            case "items/delete":
                return handleDeleteItem(postData);
            case "members/update":
                return handleUpdateMember(postData);
            case "members/delete":
                return handleDeleteMember(postData);
            case "push-subscribe":
                return handlePushSubscribe(postData);
            case "push-unsubscribe":
                return handlePushUnsubscribe(postData);
            case "access-logs":
                return handlePostAccessLogs(postData);
            default:
                return createErrorResponse("Invalid endpoint", 404);
        }
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
}

// ============================================
// API: アクセス履歴登録
// シート名: access_logs
// ============================================

const ACCESS_LOG_HEADERS = [
    "TIMESTAMP",
    "CLIENT_TIMESTAMP",
    "STUDENT_ID",
    "DISPLAY_NAME",
    "PERMISSION",
    "PATH",
    "METHOD",
    "USER_AGENT",
    "IP_HASH",
];

const getOrCreateAccessLogsSheet = (spreadsheet) => {
    let sheet = spreadsheet.getSheetByName("access_logs");
    if (!sheet) {
        sheet = spreadsheet.insertSheet("access_logs");
    }

    const lastColumn = sheet.getLastColumn();
    if (lastColumn < ACCESS_LOG_HEADERS.length) {
        sheet
            .getRange(1, 1, 1, ACCESS_LOG_HEADERS.length)
            .setValues([ACCESS_LOG_HEADERS]);
        return sheet;
    }

    const headers = sheet
        .getRange(1, 1, 1, ACCESS_LOG_HEADERS.length)
        .getValues()[0];
    const needsHeaderUpdate = ACCESS_LOG_HEADERS.some(
        (header, index) => String(headers[index] || "") !== header
    );
    if (needsHeaderUpdate) {
        sheet
            .getRange(1, 1, 1, ACCESS_LOG_HEADERS.length)
            .setValues([ACCESS_LOG_HEADERS]);
    }

    return sheet;
};

const normalizeAccessLogText = (value, maxLength) =>
    String(value || "")
        .trim()
        .slice(0, maxLength);

const handlePostAccessLogs = (postData) => {
    try {
        const logs = Array.isArray(postData.logs) ? postData.logs : [];
        if (logs.length === 0) {
            return createErrorResponse("No access logs provided", 400);
        }

        const rows = logs.slice(0, 10).map((log) => [
            normalizeAccessLogText(log.timestamp, 40) ||
                Utilities.formatDate(
                    new Date(),
                    APP_TIME_ZONE,
                    "yyyy-MM-dd'T'HH:mm:ssXXX"
                ),
            normalizeAccessLogText(log.clientTimestamp, 40),
            normalizeAccessLogText(log.studentId, 20),
            normalizeAccessLogText(log.displayName, 80),
            normalizeAccessLogText(log.permission, 30),
            normalizeAccessLogText(log.path, 200),
            normalizeAccessLogText(log.method, 10),
            normalizeAccessLogText(log.userAgent, 500),
            normalizeAccessLogText(log.ipHash, 128),
        ]);

        const lock = LockService.getScriptLock();
        lock.waitLock(5000);
        try {
            const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
            const sheet = getOrCreateAccessLogsSheet(spreadsheet);
            const startRow = sheet.getLastRow() + 1;
            sheet
                .getRange(startRow, 1, rows.length, ACCESS_LOG_HEADERS.length)
                .setValues(rows);
        } finally {
            lock.releaseLock();
        }

        return createResponse({
            success: true,
            count: rows.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 機材一覧取得
// シート名: items
// 列構成: A:機材名, B:数量, C:備考
// ============================================

/**
 * 機材一覧を取得
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} { success, data: [{機材名, 数量, 備考}], count }
 */
const handleGetItems = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("items");

        if (!sheet) {
            return createErrorResponse("Sheet 'items' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:C（2行目以降、3列）のデータを取得
        const range = sheet.getRange(2, 1, lastRow - 1, 3);
        const values = range.getValues();

        // ヘッダー行（A1:C1）を取得
        const headers = sheet.getRange(1, 1, 1, 3).getValues()[0];

        // ヘッダーをキーとしたオブジェクト配列に変換
        const items = values.map((row) => {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index];
            });
            return item;
        });

        return createResponse({
            success: true,
            data: items,
            count: items.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 機材登録（POST items）
// シート名: items
// 列構成: A:ITEM_ID, B:NAME, C:WHEN
// リクエストボディ: { category, name, count }
// ============================================

/**
 * 機材を登録（複数登録対応）
 * @param {Object} postData - リクエストボディ { category, name, count }
 * @returns {TextOutput} { success, message, data: { itemIds } }
 */
const handlePostItems = (postData) => {
    try {
        const { category, name, count = 1 } = postData;

        if (!category || !name) {
            return createErrorResponse(
                "Missing required fields (category, name)",
                400
            );
        }

        const validCategories = ["MIC", "SPK", "CAB", "OTH"];
        const upperCategory = category.toUpperCase();
        if (!validCategories.includes(upperCategory)) {
            return createErrorResponse(
                "Invalid category. Must be MIC, SPK, CAB, or OTH",
                400
            );
        }

        const itemCount = parseInt(count, 10);
        if (isNaN(itemCount) || itemCount < 1 || itemCount > 100) {
            return createErrorResponse(
                "Count must be a number between 1 and 100",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("items");

        if (!sheet) {
            return createErrorResponse("Sheet 'items' not found", 404);
        }

        // 現在の同カテゴリの最大IDを取得
        const lastRow = sheet.getLastRow();
        let maxNumber = 0;

        if (lastRow >= 2) {
            const existingIds = sheet
                .getRange(2, 1, lastRow - 1, 1)
                .getValues()
                .flat();
            existingIds.forEach((id) => {
                if (String(id).toUpperCase().startsWith(upperCategory)) {
                    const numPart = parseInt(String(id).substring(3), 10);
                    if (!isNaN(numPart) && numPart > maxNumber) {
                        maxNumber = numPart;
                    }
                }
            });
        }

        // 新しい機材を登録
        const createdIds = [];
        const now = new Date();
        const whenStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;

        for (let i = 0; i < itemCount; i++) {
            const newNumber = maxNumber + 1 + i;
            const itemId = `${upperCategory}${String(newNumber).padStart(3, "0")}`;
            sheet.appendRow([itemId, name, whenStr]);
            createdIds.push(itemId);
        }

        return createResponse({
            success: true,
            message: `${itemCount} item(s) created successfully`,
            data: {
                itemIds: createdIds,
                name,
                category: upperCategory,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 機材更新（POST items/update）
// シート名: items
// 列構成: A:ITEM_ID, B:NAME, C:WHEN
// リクエストボディ: { itemId, name }
// ============================================

/**
 * 機材情報を更新
 * @param {Object} postData - リクエストボディ { itemId, name }
 * @returns {TextOutput} { success, message }
 */
const handleUpdateItem = (postData) => {
    try {
        const { itemId, name } = postData;

        if (!itemId || !name) {
            return createErrorResponse(
                "Missing required fields (itemId, name)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("items");

        if (!sheet) {
            return createErrorResponse("Sheet 'items' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createErrorResponse("Item not found", 404);
        }

        // ITEM_IDが一致する行を検索
        const itemIdColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRow = -1;

        for (let i = 0; i < itemIdColumn.length; i++) {
            if (
                String(itemIdColumn[i][0]).toUpperCase() ===
                String(itemId).toUpperCase()
            ) {
                targetRow = i + 2;
                break;
            }
        }

        if (targetRow === -1) {
            return createErrorResponse(
                "Item not found with itemId: " + itemId,
                404
            );
        }

        // NAMEを更新（B列）
        sheet.getRange(targetRow, 2).setValue(name);

        return createResponse({
            success: true,
            message: "Item updated successfully",
            data: {
                itemId,
                name,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 機材削除（POST items/delete）
// シート名: items
// 列構成: A:ITEM_ID, B:NAME, C:WHEN
// リクエストボディ: { itemId }
// ============================================

/**
 * 機材を削除
 * @param {Object} postData - リクエストボディ { itemId }
 * @returns {TextOutput} { success, message }
 */
const handleDeleteItem = (postData) => {
    try {
        const { itemId } = postData;

        if (!itemId) {
            return createErrorResponse("Missing required field (itemId)", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("items");

        if (!sheet) {
            return createErrorResponse("Sheet 'items' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createErrorResponse("Item not found", 404);
        }

        // ITEM_IDが一致する行を検索
        const itemIdColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRow = -1;

        for (let i = 0; i < itemIdColumn.length; i++) {
            if (
                String(itemIdColumn[i][0]).toUpperCase() ===
                String(itemId).toUpperCase()
            ) {
                targetRow = i + 2;
                break;
            }
        }

        if (targetRow === -1) {
            return createErrorResponse(
                "Item not found with itemId: " + itemId,
                404
            );
        }

        // 行を削除
        sheet.deleteRow(targetRow);

        return createResponse({
            success: true,
            message: "Item deleted successfully",
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: スケジュール一覧取得
// シート名: schedules
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT, P:UPDATED_BY, Q:UPDATED_AT, R:ATTENDANCE_MODE, S:END_TIME_HH, T:END_TIME_MM
// ============================================

const SCHEDULE_ATTENDANCE_MODE_COLUMN = 18;
const SCHEDULE_END_TIME_HH_COLUMN = 19;
const SCHEDULE_END_TIME_MM_COLUMN = 20;
const SCHEDULE_COLUMN_COUNT = 20;

const normalizeScheduleAttendanceMode = (mode) =>
    String(mode || "").trim().toUpperCase() === "ATTENDANCE"
        ? "ATTENDANCE"
        : "ABSENCE";

const ensureScheduleAttendanceModeHeader = (sheet) => {
    const headers = [
        [SCHEDULE_ATTENDANCE_MODE_COLUMN, "ATTENDANCE_MODE"],
        [SCHEDULE_END_TIME_HH_COLUMN, "END_TIME_HH"],
        [SCHEDULE_END_TIME_MM_COLUMN, "END_TIME_MM"],
    ];

    headers.forEach(([column, value]) => {
        const header = String(sheet.getRange(1, column).getValue() || "").trim();
        if (!header) {
            sheet.getRange(1, column).setValue(value);
        }
    });
};

/**
 * スケジュール一覧を取得
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} { success, data: [{EVENT_ID, YYYY, MM, DD, ...}], count }
 */
const handleGetSchedules = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        ensureScheduleAttendanceModeHeader(sheet);

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:T（2行目以降、20列）のデータを取得（終了日、カラー、出欠方式、終了時刻を含む）
        const range = sheet.getRange(2, 1, lastRow - 1, SCHEDULE_COLUMN_COUNT);
        const values = range.getValues();

        // ヘッダー行（A1:T1）を取得
        const headers = sheet
            .getRange(1, 1, 1, SCHEDULE_COLUMN_COUNT)
            .getValues()[0];

        // ヘッダーをキーとしたオブジェクト配列に変換
        const schedules = values.map((row) => {
            const schedule = {};
            headers.forEach((header, index) => {
                schedule[header] = row[index];
            });
            return schedule;
        });

        return createResponse({
            success: true,
            data: schedules,
            count: schedules.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 欠席データ一覧取得
// シート名: absence_data
// 列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
// クエリパラメータ: date=YYYY/MM/DD（任意、日付でフィルタ）
// ============================================

/**
 * 欠席データ一覧を取得（日付フィルタ対応）
 * @param {Object} e - リクエストイベントオブジェクト（e.parameter.dateで日付指定可）
 * @returns {TextOutput} { success, data: [{タイムスタンプ, EVENT_ID, 学籍番号, ...}], count }
 */
const handleGetAbsences = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("absence_data");

        if (!sheet) {
            return createErrorResponse("Sheet 'absence_data' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:I（2行目以降、9列）のデータを取得
        const range = sheet.getRange(2, 1, lastRow - 1, 9);
        const values = range.getValues();

        // ヘッダー行（A1:I1）を取得
        const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

        const dateParam = e.parameter.date;
        const absences = [];

        values.forEach((row) => {
            const absence = {};
            headers.forEach((header, index) => {
                absence[header] = row[index];
            });

            // 日付パラメータが指定されている場合、タイムスタンプの日付部分と照合
            if (dateParam) {
                const timestamp = absence[headers[0]]; // A列=タイムスタンプ
                if (timestamp) {
                    const recordDate =
                        typeof timestamp === "string"
                            ? timestamp.split(" ")[0]
                            : formatDateTime(timestamp).split(" ")[0];

                    if (recordDate === dateParam) {
                        absences.push(absence);
                    }
                }
            } else {
                absences.push(absence);
            }
        });

        return createResponse({
            success: true,
            data: absences,
            count: absences.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 特定イベントの欠席者取得
// シート名: absence_data
// 列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
// クエリパラメータ: eventId（必須）
// ============================================

/**
 * 特定イベントIDに紐づく欠席者を取得
 * @param {Object} e - リクエストイベントオブジェクト（e.parameter.eventIdが必須）
 * @returns {TextOutput} { success, data: [{タイムスタンプ, EVENT_ID, 学籍番号, ...}], count }
 */
const handleGetEventAbsences = (e) => {
    try {
        const eventId = e.parameter.eventId;

        if (!eventId) {
            return createErrorResponse("eventId parameter is required", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("absence_data");

        if (!sheet) {
            return createErrorResponse("Sheet 'absence_data' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:I（2行目以降、9列）のデータを取得
        const range = sheet.getRange(2, 1, lastRow - 1, 9);
        const values = range.getValues();

        // ヘッダー行（A1:I1）を取得
        const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

        // B列のEVENT_IDカラムのインデックスを特定
        const eventIdIndex = headers.findIndex((h) => h === "EVENT_ID");

        if (eventIdIndex === -1) {
            return createErrorResponse(
                "EVENT_ID column not found in absence_data sheet",
                500
            );
        }

        const absences = [];

        // EVENT_IDが一致する行のみ抽出
        values.forEach((row) => {
            if (row[eventIdIndex] === eventId) {
                const absence = {};
                headers.forEach((header, index) => {
                    absence[header] = row[index];
                });
                absences.push(absence);
            }
        });

        return createResponse({
            success: true,
            data: absences,
            count: absences.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 名簿一覧取得
// シート名: members
// 列構成: 1行目をヘッダーとして全列を取得
// ============================================

/**
 * membersシートの全項目を取得
 * @returns {TextOutput} { success, data: { headers, members }, count }
 */
const handleGetMembers = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("members");

        if (!sheet) {
            return createErrorResponse("Sheet 'members' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        const lastColumn = sheet.getLastColumn();

        if (lastRow < 1 || lastColumn < 1) {
            return createResponse({
                success: true,
                data: {
                    headers: [],
                    members: [],
                },
                count: 0,
            });
        }

        const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(
            (header, index) => String(header || `列${index + 1}`).trim()
        );

        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: {
                    headers,
                    members: [],
                },
                count: 0,
            });
        }

        const values = sheet
            .getRange(2, 1, lastRow - 1, lastColumn)
            .getValues();
        const members = values.map((row, index) => ({
            rowNumber: index + 2,
            values: row,
        }));

        return createResponse({
            success: true,
            data: {
                headers,
                members,
            },
            count: members.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

/**
 * membersシートに新規行を追加
 * @param {Object} data - { values }
 * @returns {TextOutput} { success, rowNumber, values }
 */
const handlePostMember = (data) => {
    try {
        const values = data.values;

        if (!Array.isArray(values)) {
            return createErrorResponse("Missing required field (values)", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("members");

        if (!sheet) {
            return createErrorResponse("Sheet 'members' not found", 404);
        }

        const lastColumn = sheet.getLastColumn();
        const rowValues = Array.from({ length: lastColumn }, (_, index) =>
            values[index] === undefined ? "" : values[index]
        );

        sheet.appendRow(rowValues);
        clearMemberCaches();

        return createResponse({
            success: true,
            rowNumber: sheet.getLastRow(),
            values: rowValues,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

/**
 * membersシートの指定行を更新
 * @param {Object} data - { rowNumber, values }
 * @returns {TextOutput} { success, rowNumber }
 */
const handleUpdateMember = (data) => {
    try {
        const rowNumber = Number(data.rowNumber);
        const values = data.values;

        if (!rowNumber || rowNumber < 2 || !Array.isArray(values)) {
            return createErrorResponse(
                "Missing required fields (rowNumber, values)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("members");

        if (!sheet) {
            return createErrorResponse("Sheet 'members' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        const lastColumn = sheet.getLastColumn();

        if (rowNumber > lastRow) {
            return createErrorResponse("Member row not found", 404);
        }

        const updateValues = Array.from({ length: lastColumn }, (_, index) =>
            values[index] === undefined ? "" : values[index]
        );

        sheet.getRange(rowNumber, 1, 1, lastColumn).setValues([updateValues]);
        clearMemberCaches();

        return createResponse({
            success: true,
            rowNumber,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

/**
 * membersシートの指定行を削除
 * @param {Object} data - { rowNumber }
 * @returns {TextOutput} { success, rowNumber }
 */
const handleDeleteMember = (data) => {
    try {
        const rowNumber = Number(data.rowNumber);

        if (!rowNumber || rowNumber < 2) {
            return createErrorResponse(
                "Missing required field (rowNumber)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("members");

        if (!sheet) {
            return createErrorResponse("Sheet 'members' not found", 404);
        }

        if (rowNumber > sheet.getLastRow()) {
            return createErrorResponse("Member row not found", 404);
        }

        sheet.deleteRow(rowNumber);
        clearMemberCaches();

        return createResponse({
            success: true,
            rowNumber,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

const handleGetNextMeeting = () => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        const nextMeeting = findNextMeetingSchedule(sheet);
        return createResponse({
            success: true,
            data: nextMeeting
                ? buildNextMeetingSettingsFromScheduleRow(nextMeeting.row)
                : null,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

const buildSchedulesData = (spreadsheet) => {
    const cached = getCachedJson(GAS_CACHE_KEYS.schedules);
    if (cached) return cached;

    const sheet = spreadsheet.getSheetByName("schedules");
    if (!sheet) {
        throw new Error("Sheet 'schedules' not found");
    }

    ensureScheduleAttendanceModeHeader(sheet);

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        putCachedJson(
            GAS_CACHE_KEYS.schedules,
            [],
            GAS_CACHE_SECONDS.schedules
        );
        return [];
    }

    const values = sheet
        .getRange(2, 1, lastRow - 1, SCHEDULE_COLUMN_COUNT)
        .getValues();
    const headers = sheet
        .getRange(1, 1, 1, SCHEDULE_COLUMN_COUNT)
        .getValues()[0];

    const schedules = values.map((row) => {
        const schedule = {};
        headers.forEach((header, index) => {
            schedule[header] = row[index];
        });
        return schedule;
    });

    putCachedJson(
        GAS_CACHE_KEYS.schedules,
        schedules,
        GAS_CACHE_SECONDS.schedules
    );
    return schedules;
};

const buildAbsencesData = (spreadsheet) => {
    const cached = getCachedJson(GAS_CACHE_KEYS.absences);
    if (cached) return cached;

    const sheet = spreadsheet.getSheetByName("absence_data");
    if (!sheet) {
        throw new Error("Sheet 'absence_data' not found");
    }

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
        putCachedJson(GAS_CACHE_KEYS.absences, [], GAS_CACHE_SECONDS.absences);
        return [];
    }

    const values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

    const absences = values.map((row) => {
        const absence = {};
        headers.forEach((header, index) => {
            absence[header] = row[index];
        });
        return absence;
    });

    putCachedJson(
        GAS_CACHE_KEYS.absences,
        absences,
        GAS_CACHE_SECONDS.absences
    );
    return absences;
};

const buildMemberDisplayNameMap = (spreadsheet) => {
    const cached = getCachedJson(GAS_CACHE_KEYS.memberDisplayNames);
    if (cached) return new Map(cached);

    const displayNameMap = new Map();
    const sheet = spreadsheet.getSheetByName("members");
    if (!sheet) return displayNameMap;

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    if (lastRow < 2 || lastColumn < 1) return displayNameMap;

    const headers = sheet
        .getRange(1, 1, 1, lastColumn)
        .getValues()[0]
        .map((header) => String(header || "").trim().toLowerCase());
    const studentNumberIndex = headers.indexOf("studentnumber");
    const nameIndex = headers.indexOf("name");
    const nicknameIndex = headers.indexOf("nickname");
    if (studentNumberIndex < 0) return displayNameMap;

    const rowCount = lastRow - 1;
    const readColumn = (index) =>
        index >= 0
            ? sheet
                  .getRange(2, index + 1, rowCount, 1)
                  .getValues()
                  .map((row) => row[0])
            : Array.from({ length: rowCount }, () => "");
    const studentNumbers = readColumn(studentNumberIndex);
    const names = readColumn(nameIndex);
    const nicknames = readColumn(nicknameIndex);

    studentNumbers.forEach((studentNumber, index) => {
        const studentId = String(studentNumber || "").trim().toLowerCase();
        if (!studentId) return;

        const name = String(names[index] || "").trim();
        const nickname = String(nicknames[index] || "").trim();
        const displayName = nickname && nickname !== "---" ? nickname : name;
        if (displayName) {
            displayNameMap.set(studentId, displayName);
        }
    });

    putCachedJson(
        GAS_CACHE_KEYS.memberDisplayNames,
        Array.from(displayNameMap.entries()),
        GAS_CACHE_SECONDS.memberDisplayNames
    );
    return displayNameMap;
};

const buildNextMeetingData = (spreadsheet) => {
    const sheet = spreadsheet.getSheetByName("schedules");
    if (!sheet) {
        throw new Error("Sheet 'schedules' not found");
    }

    const nextMeeting = findNextMeetingSchedule(sheet);
    if (!nextMeeting) return null;

    const settings = buildNextMeetingSettingsFromScheduleRow(nextMeeting.row);
    if (!settings.updatedBy) return settings;

    const memberDisplayNameMap = buildMemberDisplayNameMap(spreadsheet);
    return {
        ...settings,
        updatedByName:
            memberDisplayNameMap.get(
                String(settings.updatedBy).trim().toLowerCase()
            ) || null,
    };
};

const handleGetDashboardData = () => {
    try {
        const cached = getCachedJson(GAS_CACHE_KEYS.dashboard);
        if (cached) {
            return createResponse({
                success: true,
                data: cached,
            });
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const data = {
            schedules: buildSchedulesData(spreadsheet),
            absences: buildAbsencesData(spreadsheet),
            nextMeeting: buildNextMeetingData(spreadsheet),
        };
        putCachedJson(
            GAS_CACHE_KEYS.dashboard,
            data,
            GAS_CACHE_SECONDS.dashboard
        );

        return createResponse({
            success: true,
            data,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

const handlePostNextMeeting = (data) => {
    try {
        const { date, time, mode, updatedBy } = data;

        if (!date || !time || !mode) {
            return createErrorResponse(
                "Missing required fields (date, time, mode)",
                400
            );
        }

        if (!["IN_PERSON", "DISCORD"].includes(mode)) {
            return createErrorResponse("Invalid mode", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        const { year, month, date: day } = splitNextMeetingDate(date);
        const { timeHH, timeMM } = splitNextMeetingTime(time);
        const modeLabel = getNextMeetingModeLabel(mode);
        const now = new Date();
        const timestamp = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );
        const nextMeeting = findNextMeetingSchedule(sheet);
        let eventId;

        if (nextMeeting) {
            eventId = String(nextMeeting.row[0]);
            const updateData = [
                Number(year),
                Number(month),
                Number(day),
                Number(timeHH),
                Number(timeMM),
                NEXT_MEETING_DEFAULT_TITLE,
                modeLabel,
                "",
                "",
                "",
                "",
                NEXT_MEETING_DEFAULT_COLOR,
            ];

            sheet.getRange(nextMeeting.rowNumber, 2, 1, 12).setValues([
                updateData,
            ]);
            sheet
                .getRange(nextMeeting.rowNumber, 16, 1, 2)
                .setValues([[updatedBy || "", timestamp]]);
        } else {
            const lastRow = sheet.getLastRow();
            const newRowNumber = lastRow + 1;
            const eventIdNumber = newRowNumber - 1;
            eventId = "E-" + String(eventIdNumber).padStart(2, "0");
            const rowData = [
                eventId,
                Number(year),
                Number(month),
                Number(day),
                Number(timeHH),
                Number(timeMM),
                NEXT_MEETING_DEFAULT_TITLE,
                modeLabel,
                "",
                "",
                "",
                "",
                NEXT_MEETING_DEFAULT_COLOR,
                updatedBy || "",
                timestamp,
                updatedBy || "",
                timestamp,
            ];

            sheet.appendRow(rowData);
        }
        clearScheduleCaches();

        const settings = {
            eventId,
            date,
            time,
            mode,
            updatedAt: timestamp,
            updatedBy: updatedBy || null,
        };

        const dateLabel = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
        sendPushNotification(`予定更新: ${NEXT_MEETING_DEFAULT_TITLE}`, dateLabel, "/calendar");

        return createResponse({
            success: true,
            data: settings,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 部員認証
// シート名: members
// 列構成: A:学籍番号
// クエリパラメータ: identifier（必須、学籍番号の先頭7文字）
// 用途: ログイン時にMicrosoftアカウントのメールアドレスから学籍番号を抽出し、
//       membersシートに登録されているか確認する
// ============================================

/**
 * 学籍番号がmembersシートに存在するか確認
 * @param {Object} e - リクエストイベントオブジェクト（e.parameter.identifierが必須）
 * @returns {TextOutput} { success, isMember: boolean, identifier, name: string|null, nickname: string|null, permission: string|null }
 */
const handleVerifyMember = (e) => {
    try {
        const identifier = e.parameter.identifier;

        if (!identifier) {
            return createErrorResponse("identifier parameter is required", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("members");

        if (!sheet) {
            return createErrorResponse("Sheet 'members' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                isMember: false,
                message: "No members found",
            });
        }

        const headers = sheet
            .getRange(1, 1, 1, sheet.getLastColumn())
            .getValues()[0]
            .map((header) => String(header || "").trim().toLowerCase());
        const studentNumberIndex = headers.indexOf("studentnumber");
        const nameIndex = headers.indexOf("name");
        const nicknameIndex = headers.indexOf("nickname");
        const permissionIndex = headers.indexOf("permission");

        // 2行目以降の全列を取得
        const range = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
        const values = range.getValues();

        // 大文字小文字を区別せず、前後の空白を除去して比較
        const normalizedIdentifier = String(identifier).toLowerCase().trim();

        let memberName = null;
        let memberNickname = null;
        let memberPermission = null;
        const isMember = values.some((row) => {
            const studentId = String(
                row[studentNumberIndex >= 0 ? studentNumberIndex : 0] || ""
            )
                .toLowerCase()
                .trim();
            if (studentId === normalizedIdentifier) {
                memberName =
                    String(row[nameIndex >= 0 ? nameIndex : 2] || "").trim() ||
                    null;
                memberNickname =
                    String(row[nicknameIndex >= 0 ? nicknameIndex : -1] || "")
                        .trim() || null;
                memberPermission =
                    String(
                        row[permissionIndex >= 0 ? permissionIndex : 7] || ""
                    ).trim() || null;
                return true;
            }
            return false;
        });

        return createResponse({
            success: true,
            isMember: isMember,
            identifier: identifier,
            name: memberName,
            nickname: memberNickname,
            permission: memberPermission,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: スケジュール登録（POST）
// シート名: schedules
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT
// リクエストボディ: { year, month, date, timeHH?, timeMM?, title, where?, detail?, endYear?, endMonth?, endDate?, color?, createdBy? }
// EVENT_IDは自動採番（E-01, E-02, ...）
// ============================================

/**
 * 新規スケジュールを登録
 * @param {Object} postData - リクエストボディ { year, month, date, title, timeHH?, timeMM?, where?, detail?, endYear?, endMonth?, endDate?, color?, createdBy? }
 * @returns {TextOutput} { success, message, data: {作成されたスケジュール情報} }
 */
const handlePostSchedule = (postData) => {
    try {
        const {
            year,
            month,
            date,
            timeHH,
            timeMM,
            endTimeHH,
            endTimeMM,
            title,
            where,
            detail,
            endYear,
            endMonth,
            endDate,
            color,
            attendanceMode,
            createdBy,
        } = postData;

        // 必須フィールドの検証（年月日とタイトルは必須）
        if (!year || !month || !date || !title) {
            return createErrorResponse(
                "Missing required fields (year, month, date, title)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        ensureScheduleAttendanceModeHeader(sheet);

        // EVENT_IDを自動生成（E-XX形式、行番号-1で0埋め2桁）
        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const eventIdNumber = newRowNumber - 1;
        const eventId = "E-" + String(eventIdNumber).padStart(2, "0");

        // 作成日時を生成
        const now = new Date();
        const createdAt = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        // 列順: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT
        const rowData = [
            eventId,
            Number(year),
            Number(month),
            Number(date),
            timeHH !== undefined && timeHH !== "" ? Number(timeHH) : "",
            timeMM !== undefined && timeMM !== "" ? Number(timeMM) : "",
            title,
            where || "",
            detail || "",
            endYear !== undefined && endYear !== "" ? Number(endYear) : "",
            endMonth !== undefined && endMonth !== "" ? Number(endMonth) : "",
            endDate !== undefined && endDate !== "" ? Number(endDate) : "",
            color || "primary",
            createdBy || "",
            createdAt,
            "",
            "",
            normalizeScheduleAttendanceMode(attendanceMode),
            endTimeHH !== undefined && endTimeHH !== ""
                ? Number(endTimeHH)
                : "",
            endTimeMM !== undefined && endTimeMM !== ""
                ? Number(endTimeMM)
                : "",
        ];

        sheet.appendRow(rowData);
        clearScheduleCaches();

        // プッシュ通知を送信
        const dateStr = `${year}/${String(month).padStart(2, "0")}/${String(date).padStart(2, "0")}`;
        sendPushNotification(`新規予定: ${title}`, dateStr, "/calendar");

        return createResponse({
            success: true,
            message: "Schedule created successfully",
            data: {
                eventId,
                year: Number(year),
                month: Number(month),
                date: Number(date),
                timeHH: timeHH || null,
                timeMM: timeMM || null,
                endTimeHH: endTimeHH || null,
                endTimeMM: endTimeMM || null,
                title,
                where: where || "",
                detail: detail || "",
                endYear: endYear || null,
                endMonth: endMonth || null,
                endDate: endDate || null,
                color: color || "primary",
                attendanceMode: normalizeScheduleAttendanceMode(attendanceMode),
                createdBy: createdBy || "",
                createdAt,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: 欠席データ登録（POST）
// シート名: absence_data
// 列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
// リクエストボディ: { eventId, studentNumber, name, type, reason, timeLeavingEarly?, timeStepOut?, timeReturn? }
// 登録後、Discord通知とメール送信を実行
// ============================================

const ABSENCE_COLUMN_COUNT = 10;

const buildAbsenceRowData = ({
    timestamp,
    eventId,
    studentNumber,
    name,
    type,
    reason,
    reasonDetail,
    timeLeavingEarly,
    timeStepOut,
    timeReturn,
}) => [
    timestamp,
    eventId,
    studentNumber,
    name,
    type,
    type === "出席" ? "" : reason,
    reasonDetail || "",
    timeLeavingEarly || "",
    timeStepOut || "",
    timeReturn || "",
];

const findAbsenceRowsByEventAndStudent = (sheet, eventId, studentNumber) => {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const rows = sheet
        .getRange(2, 1, lastRow - 1, ABSENCE_COLUMN_COUNT)
        .getValues();
    const normalizedEventId = String(eventId);
    const normalizedStudentNumber = String(studentNumber).trim().toLowerCase();

    return rows
        .map((row, index) => ({
            rowNumber: index + 2,
            row,
        }))
        .filter(({ row }) => {
            const rowEventId = String(row[1]);
            const rowStudentNumber = String(row[2]).trim().toLowerCase();
            return (
                rowEventId === normalizedEventId &&
                rowStudentNumber === normalizedStudentNumber
            );
        });
};

const upsertAbsenceRecord = (sheet, rowData) => {
    const matches = findAbsenceRowsByEventAndStudent(
        sheet,
        rowData[1],
        rowData[2]
    );

    if (matches.length === 0) {
        sheet.appendRow(rowData);
        return "created";
    }

    const target = matches[matches.length - 1];
    sheet
        .getRange(target.rowNumber, 1, 1, ABSENCE_COLUMN_COUNT)
        .setValues([rowData]);

    matches
        .slice(0, -1)
        .sort((a, b) => b.rowNumber - a.rowNumber)
        .forEach(({ rowNumber }) => sheet.deleteRow(rowNumber));

    return "updated";
};

const deleteAbsenceRecord = (sheet, eventId, studentNumber) => {
    const matches = findAbsenceRowsByEventAndStudent(sheet, eventId, studentNumber);
    if (matches.length === 0) return false;

    matches
        .sort((a, b) => b.rowNumber - a.rowNumber)
        .forEach(({ rowNumber }) => sheet.deleteRow(rowNumber));

    return true;
};

const validateAbsencePostData = ({
    eventId,
    studentNumber,
    name,
    type,
    reason,
}) =>
    eventId &&
    studentNumber &&
    name &&
    type &&
    (type === "出席" || reason);

const sendAbsenceCompletionEmail = ({
    studentNumber,
    name,
    type,
    reason,
    reasonDetail,
    timestamp,
    timeLeavingEarly,
    timeStepOut,
    timeReturn,
}) => {
    const domain = PropertiesService.getScriptProperties().getProperty("NIT_DOMAIN");
    if (!domain || !studentNumber) return;

    const email = `${studentNumber}@${domain}`;
    const isAttendance = type === "出席";
    const subject = isAttendance
        ? "出席申告フォーム送信完了通知"
        : "欠席連絡フォーム送信完了通知";

    let bodyText = `${name} さん\n\n`;
    bodyText += `以下の内容でフォームが送信されました．\n\n`;
    bodyText += `氏名: ${name}\n`;
    bodyText += `種別: ${type}`;

    if (type === "早退" && timeLeavingEarly) {
        bodyText += `(${timeLeavingEarly})`;
    } else if (type === "中抜け" && (timeStepOut || timeReturn)) {
        bodyText += `(${timeStepOut || ""} ~ ${timeReturn || ""})`;
    }

    if (!isAttendance) {
        bodyText += `\n理由: ${reason}\n`;
    }
    if (reasonDetail) {
        bodyText += `詳細: ${reasonDetail}\n`;
    }
    bodyText += `\n送信日時: ${timestamp}\n`;

    MailApp.sendEmail(email, subject, bodyText, {
        name: isAttendance ? "出席申告システム" : "欠席連絡システム",
    });
};

/**
 * 新規欠席データを登録し、Discord通知とメール送信を実行
 * @param {Object} postData - リクエストボディ
 * @returns {TextOutput} { success, message, data: {作成された欠席データ情報} }
 */
const handlePostAbsence = (postData) => {
    try {
        const {
            eventId,
            studentNumber,
            name,
            type,
            reason,
            reasonDetail,
            timeStepOut,
            timeReturn,
            timeLeavingEarly,
        } = postData;

        if (
            !validateAbsencePostData({
                eventId,
                studentNumber,
                name,
                type,
                reason,
            })
        ) {
            return createErrorResponse("Missing required fields", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("absence_data");

        if (!sheet) {
            return createErrorResponse("Sheet 'absence_data' not found", 404);
        }

        // 現在日時でタイムスタンプを生成
        const now = new Date();
        const timestamp = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        const rowData = buildAbsenceRowData({
            timestamp,
            eventId,
            studentNumber,
            name,
            type,
            reason,
            reasonDetail,
            timeLeavingEarly,
            timeStepOut,
            timeReturn,
        });

        const lock = LockService.getScriptLock();
        lock.waitLock(5000);
        let operation;
        try {
            operation = upsertAbsenceRecord(sheet, rowData);
        } finally {
            lock.releaseLock();
        }
        clearAbsenceCaches();

        // Discord Webhookに通知を送信
        const webhookURL =
            PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

        if (webhookURL) {
            const embed = buildAbsenceEmbed({
                name,
                type,
                reason: type === "出席" ? "" : reason,
                reasonDetail,
                timestamp,
                timeLeavingEarly,
                timeStepOut,
                timeReturn,
            });
            sendToDiscord(webhookURL, embed);
        }

        sendAbsenceCompletionEmail({
            studentNumber,
            name,
            type,
            reason,
            reasonDetail,
            timestamp,
            timeLeavingEarly,
            timeStepOut,
            timeReturn,
        });

        return createResponse({
            success: true,
            message: "Absence record saved successfully",
            data: {
                timestamp,
                eventId,
                studentNumber,
                name,
                type,
                reason: type === "出席" ? "" : reason,
                reasonDetail: reasonDetail || "",
                timeLeavingEarly: timeLeavingEarly || "",
                timeStepOut: timeStepOut || "",
                timeReturn: timeReturn || "",
                operation,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

const handleUpdateAbsence = (postData) => handlePostAbsence(postData);

const handleDeleteAbsence = (postData) => {
    try {
        const { eventId, studentNumber } = postData;
        if (!eventId || !studentNumber) {
            return createErrorResponse(
                "Missing required fields (eventId, studentNumber)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("absence_data");

        if (!sheet) {
            return createErrorResponse("Sheet 'absence_data' not found", 404);
        }

        const lock = LockService.getScriptLock();
        lock.waitLock(5000);
        let deleted;
        try {
            deleted = deleteAbsenceRecord(sheet, eventId, studentNumber);
        } finally {
            lock.releaseLock();
        }
        if (!deleted) {
            return createErrorResponse("Absence record not found", 404);
        }

        clearAbsenceCaches();

        return createResponse({
            success: true,
            message: "Absence record deleted successfully",
            data: {
                eventId,
                studentNumber,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: スケジュール更新（POST schedules/update）
// シート名: schedules
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT, P:UPDATED_BY, Q:UPDATED_AT
// リクエストボディ: { eventId, year, month, date, timeHH?, timeMM?, title, where?, detail?, endYear?, endMonth?, endDate?, color?, updatedBy? }
// ============================================

/**
 * 既存スケジュールを更新
 * @param {Object} postData - リクエストボディ { eventId, year, month, date, title, timeHH?, timeMM?, where?, detail?, endYear?, endMonth?, endDate?, color?, updatedBy? }
 * @returns {TextOutput} { success, message, data: {更新されたスケジュール情報} }
 */
const handleUpdateSchedule = (postData) => {
    try {
        const {
            eventId,
            year,
            month,
            date,
            timeHH,
            timeMM,
            endTimeHH,
            endTimeMM,
            title,
            where,
            detail,
            endYear,
            endMonth,
            endDate,
            color,
            attendanceMode,
            updatedBy,
        } = postData;

        // 必須フィールドの検証
        if (!eventId || !year || !month || !date || !title) {
            return createErrorResponse(
                "Missing required fields (eventId, year, month, date, title)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        ensureScheduleAttendanceModeHeader(sheet);

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createErrorResponse("Schedule not found", 404);
        }

        // EVENT_IDが一致する行を検索
        const eventIdColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRow = -1;

        for (let i = 0; i < eventIdColumn.length; i++) {
            if (String(eventIdColumn[i][0]) === String(eventId)) {
                targetRow = i + 2; // 2行目から始まるため+2
                break;
            }
        }

        if (targetRow === -1) {
            return createErrorResponse(
                "Schedule not found with eventId: " + eventId,
                404
            );
        }

        // 更新日時を生成
        const now = new Date();
        const updatedAt = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        // 列順: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR
        // B〜M列を更新（EVENT_IDは変更しない、CREATED_BY/CREATED_ATも保持）
        const updateData = [
            Number(year),
            Number(month),
            Number(date),
            timeHH !== undefined && timeHH !== "" ? Number(timeHH) : "",
            timeMM !== undefined && timeMM !== "" ? Number(timeMM) : "",
            title,
            where || "",
            detail || "",
            endYear !== undefined && endYear !== "" ? Number(endYear) : "",
            endMonth !== undefined && endMonth !== "" ? Number(endMonth) : "",
            endDate !== undefined && endDate !== "" ? Number(endDate) : "",
            color || "primary",
        ];

        sheet.getRange(targetRow, 2, 1, 12).setValues([updateData]);
        sheet
            .getRange(targetRow, SCHEDULE_ATTENDANCE_MODE_COLUMN)
            .setValue(normalizeScheduleAttendanceMode(attendanceMode));
        sheet
            .getRange(targetRow, SCHEDULE_END_TIME_HH_COLUMN, 1, 2)
            .setValues([
                [
                    endTimeHH !== undefined && endTimeHH !== ""
                        ? Number(endTimeHH)
                        : "",
                    endTimeMM !== undefined && endTimeMM !== ""
                        ? Number(endTimeMM)
                        : "",
                ],
            ]);

        // P列（UPDATED_BY）とQ列（UPDATED_AT）を更新
        if (updatedBy) {
            sheet
                .getRange(targetRow, 16, 1, 2)
                .setValues([[updatedBy, updatedAt]]);
        }
        clearScheduleCaches();

        // プッシュ通知を送信
        const dateStr = `${year}/${String(month).padStart(2, "0")}/${String(date).padStart(2, "0")}`;
        sendPushNotification(`予定更新: ${title}`, dateStr, "/calendar");

        return createResponse({
            success: true,
            message: "Schedule updated successfully",
            data: {
                eventId,
                year: Number(year),
                month: Number(month),
                date: Number(date),
                timeHH: timeHH || null,
                timeMM: timeMM || null,
                endTimeHH: endTimeHH || null,
                endTimeMM: endTimeMM || null,
                title,
                where: where || "",
                detail: detail || "",
                endYear: endYear || null,
                endMonth: endMonth || null,
                endDate: endDate || null,
                color: color || "primary",
                attendanceMode: normalizeScheduleAttendanceMode(attendanceMode),
                updatedBy: updatedBy || "",
                updatedAt,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: スケジュール削除（POST schedules/delete）
// シート名: schedules
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT, P:UPDATED_BY, Q:UPDATED_AT
// リクエストボディ: { eventId }
// ============================================

/**
 * スケジュールを削除
 * @param {Object} postData - リクエストボディ { eventId }
 * @returns {TextOutput} { success, message }
 */
const handleDeleteSchedule = (postData) => {
    try {
        const { eventId } = postData;

        // 必須フィールドの検証
        if (!eventId) {
            return createErrorResponse("Missing required field (eventId)", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createErrorResponse("Schedule not found", 404);
        }

        // EVENT_IDが一致する行を検索
        const eventIdColumn = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        let targetRow = -1;

        for (let i = 0; i < eventIdColumn.length; i++) {
            if (String(eventIdColumn[i][0]) === String(eventId)) {
                targetRow = i + 2; // 2行目から始まるため+2
                break;
            }
        }

        if (targetRow === -1) {
            return createErrorResponse(
                "Schedule not found with eventId: " + eventId,
                404
            );
        }

        // 削除前に予定の情報を取得（通知用）
        const rowData = sheet.getRange(targetRow, 1, 1, 7).getValues()[0];
        const year = rowData[1];
        const month = rowData[2];
        const date = rowData[3];
        const title = rowData[6];

        // 行を削除
        sheet.deleteRow(targetRow);
        clearScheduleCaches();

        // プッシュ通知を送信
        const dateStr = `${year}/${String(month).padStart(2, "0")}/${String(date).padStart(2, "0")}`;
        sendPushNotification(`予定削除: ${title}`, dateStr, "/calendar");

        return createResponse({
            success: true,
            message: "Schedule deleted successfully",
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: お知らせ一覧取得
// schedulesシートからCREATED_BY/UPDATED_BY（学籍番号）が設定されているレコードを取得し、
// membersシートのC列（名前）と照合して作成者/更新者名を付与
// 列構成（schedules）: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT, P:UPDATED_BY, Q:UPDATED_AT
// 列構成（members）: A:学籍番号, B:?, C:名前
// クエリパラメータ: limit（任意、デフォルト20件）
// ============================================

/**
 * お知らせ一覧を取得（カレンダー追加・更新のお知らせ）
 * @param {Object} e - リクエストイベントオブジェクト（e.parameter.limitで件数指定可）
 * @returns {TextOutput} { success, data: [{eventId, title, date, actionBy, actionByName, actionAt, actionType}], count }
 */
const handleGetNotifications = (e) => {
    try {
        const limit = parseInt(e.parameter.limit) || 20;

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const schedulesSheet = spreadsheet.getSheetByName("schedules");
        const membersSheet = spreadsheet.getSheetByName("members");

        if (!schedulesSheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        const lastRow = schedulesSheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // membersシートから学籍番号と名前のマッピングを作成
        const memberNameMap = new Map();
        if (membersSheet) {
            const membersLastRow = membersSheet.getLastRow();
            if (membersLastRow >= 2) {
                // membersシートの全列を取得
                const membersRange = membersSheet.getRange(
                    2,
                    1,
                    membersLastRow - 1,
                    membersSheet.getLastColumn()
                );
                const membersValues = membersRange.getValues();
                membersValues.forEach((row) => {
                    const studentId = String(row[0]).toLowerCase().trim();
                    const name = String(row[2] || "").trim();
                    if (studentId && name) {
                        memberNameMap.set(studentId, name);
                    }
                });
            }
        }

        // schedulesシートから全データを取得（17列: A-Q）
        const range = schedulesSheet.getRange(2, 1, lastRow - 1, 17);
        const values = range.getValues();

        const notifications = [];

        values.forEach((row) => {
            const eventId = String(row[0]);
            const year = Number(row[1]);
            const month = Number(row[2]);
            const day = Number(row[3]);
            const title = String(row[6] || "");
            const dateStr = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;

            // 列構成: M列(12)=COLOR, N列(13)=CREATED_BY, O列(14)=CREATED_AT, P列(15)=UPDATED_BY, Q列(16)=UPDATED_AT
            const createdBy = String(row[13] || "")
                .toLowerCase()
                .trim();
            const createdAt = row[14];
            const updatedBy = String(row[15] || "")
                .toLowerCase()
                .trim();
            const updatedAt = row[16];

            // 作成通知を追加
            if (createdBy !== "" && createdAt !== "") {
                const createdAtStr = isDate(createdAt)
                    ? formatDateTime(createdAt)
                    : String(createdAt);
                const createdByName = memberNameMap.get(createdBy) || createdBy;

                notifications.push({
                    eventId,
                    title,
                    date: dateStr,
                    actionBy: createdBy,
                    actionByName: createdByName,
                    actionAt: createdAtStr,
                    actionType: "created",
                });
            }

            // 更新通知を追加（更新情報がある場合）
            if (updatedBy !== "" && updatedAt !== "") {
                const updatedAtStr = isDate(updatedAt)
                    ? formatDateTime(updatedAt)
                    : String(updatedAt);
                const updatedByName = memberNameMap.get(updatedBy) || updatedBy;

                notifications.push({
                    eventId,
                    title,
                    date: dateStr,
                    actionBy: updatedBy,
                    actionByName: updatedByName,
                    actionAt: updatedAtStr,
                    actionType: "updated",
                });
            }
        });

        // アクション日時で降順ソート
        notifications.sort((a, b) => {
            return b.actionAt.localeCompare(a.actionAt);
        });

        return createResponse({
            success: true,
            data: notifications.slice(0, limit),
            count: notifications.slice(0, limit).length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: プッシュ通知購読登録（POST push-subscribe）
// シート名: push_subscriptions
// 列構成: A:STUDENT_ID, B:ENDPOINT, C:P256DH, D:AUTH, E:CREATED_AT
// リクエストボディ: { subscription: {endpoint, keys: {p256dh, auth}}, studentId }
// ============================================

/**
 * プッシュ通知の購読を登録
 * @param {Object} postData - リクエストボディ
 * @returns {TextOutput} { success, message }
 */
const handlePushSubscribe = (postData) => {
    try {
        const { subscription, studentId } = postData;

        if (!subscription || !studentId) {
            return createErrorResponse(
                "Missing required fields (subscription, studentId)",
                400
            );
        }

        const { endpoint, keys } = subscription;
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return createErrorResponse("Invalid subscription format", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = spreadsheet.getSheetByName("push_subscriptions");

        // シートが存在しない場合は作成
        if (!sheet) {
            sheet = spreadsheet.insertSheet("push_subscriptions");
            sheet
                .getRange(1, 1, 1, 5)
                .setValues([
                    ["STUDENT_ID", "ENDPOINT", "P256DH", "AUTH", "CREATED_AT"],
                ]);
        }

        // 既存の購読を確認（同じendpointがあれば更新）
        const lastRow = sheet.getLastRow();
        let existingRow = -1;

        if (lastRow >= 2) {
            const endpoints = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
            for (let i = 0; i < endpoints.length; i++) {
                if (endpoints[i][0] === endpoint) {
                    existingRow = i + 2;
                    break;
                }
            }
        }

        const now = new Date();
        const createdAt = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        if (existingRow > 0) {
            // 既存の購読を更新
            sheet
                .getRange(existingRow, 1, 1, 5)
                .setValues([
                    [
                        studentId.toLowerCase(),
                        endpoint,
                        keys.p256dh,
                        keys.auth,
                        createdAt,
                    ],
                ]);
        } else {
            // 新規登録
            sheet.appendRow([
                studentId.toLowerCase(),
                endpoint,
                keys.p256dh,
                keys.auth,
                createdAt,
            ]);
        }

        return createResponse({
            success: true,
            message: "Subscription registered successfully",
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: プッシュ通知購読解除（POST push-unsubscribe）
// シート名: push_subscriptions
// リクエストボディ: { endpoint, studentId }
// ============================================

/**
 * プッシュ通知の購読を解除
 * @param {Object} postData - リクエストボディ
 * @returns {TextOutput} { success, message }
 */
const handlePushUnsubscribe = (postData) => {
    try {
        const { endpoint } = postData;

        if (!endpoint) {
            return createErrorResponse(
                "Missing required field (endpoint)",
                400
            );
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("push_subscriptions");

        if (!sheet) {
            return createResponse({
                success: true,
                message: "No subscriptions found",
            });
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                message: "No subscriptions found",
            });
        }

        // endpointが一致する行を検索して削除
        const data = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
        for (let i = data.length - 1; i >= 0; i--) {
            if (data[i][1] === endpoint) {
                sheet.deleteRow(i + 2);
                return createResponse({
                    success: true,
                    message: "Subscription removed successfully",
                });
            }
        }

        return createResponse({
            success: true,
            message: "Subscription not found",
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// ============================================
// API: プッシュ通知購読者一覧取得（GET push-subscriptions）
// シート名: push_subscriptions
// ============================================

/**
 * プッシュ通知の購読者一覧を取得
 * @param {Object} e - リクエストイベントオブジェクト
 * @returns {TextOutput} { success, data: [{studentId, endpoint, p256dh, auth}], count }
 */
const handleGetPushSubscriptions = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("push_subscriptions");

        if (!sheet) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A:STUDENT_ID, B:ENDPOINT, C:P256DH, D:AUTH
        const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
        const subscriptions = data.map((row) => ({
            studentId: row[0],
            endpoint: row[1],
            p256dh: row[2],
            auth: row[3],
        }));

        return createResponse({
            success: true,
            data: subscriptions,
            count: subscriptions.length,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};
