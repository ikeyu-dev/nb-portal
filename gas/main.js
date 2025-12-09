// 定数定義
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

// Dateオブジェクトかどうかを判定
const isDate = (value) =>
    Object.prototype.toString.call(value) === "[object Date]";

// 時刻をhh:mm形式にフォーマット
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

// 日時をYYYY/MM/DD HH:MM形式にフォーマット
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

// 値をフォーマット
const formatValue = (value, formatType) => {
    if (formatType === "time") return formatTime(value);
    if (formatType === "datetime") return formatDateTime(value);
    return value;
};

// スプレッドシートからフォームデータを取得
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

// メッセージ本文を構築
const buildMessageBody = (formData, includeTimestamp = true) => {
    let body = "";

    if (includeTimestamp) {
        body += `**送信日時**: ${formData.timestamp}\n`;
    }

    body += `**氏名**: ${formData.name}\n`;

    // 種別の後ろに時間情報を追加
    let typeText = `**種別**: ${formData.type}`;

    if (formData.type === "早退" && formData.leaveTime) {
        typeText += `(${formData.leaveTime})`;
    } else if (
        formData.type?.includes("中抜け") &&
        (formData.breakStartTime || formData.breakEndTime)
    ) {
        typeText += `(${formData.breakStartTime} ~ ${formData.breakEndTime})`;
    }

    body += typeText + "\n\n";

    return body;
};

// Discordにメッセージを送信
const sendToDiscord = (webhookURL, body) => {
    const message = {
        content: body,
        tts: false,
    };

    const param = {
        method: "POST",
        headers: { "Content-type": "application/json" },
        payload: JSON.stringify(message),
    };

    UrlFetchApp.fetch(webhookURL, param);
};

// メール送信
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

    MailApp.sendEmail(email, subject, bodyText);
};

// メイン
function onSubmit(e) {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

    const formData = getFormData(e);
    const body = buildMessageBody(formData);
    sendToDiscord(webhookURL, body);
    sendEmail(formData);
}

// スプレッドシートの特定行からフォームデータを取得
const getFormDataFromRow = (sheet, row, headers) => {
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

// 全ての欠席・遅刻・早退・中抜けをまとめて送信
function sendAllAbsece() {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    const headers = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0];

    // 現在の日付を取得
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateString = `${year}/${month}/${day}`;

    let allMessages = [];
    const title = `# ${dateString} 欠席者一覧\n`;

    for (let row = 2; row <= lastRow; row++) {
        const formData = getFormDataFromRow(sheet, row, headers);
        const body = buildMessageBody(formData, false);
        allMessages.push(body);
    }

    // タイトルと最初のメッセージを区切り線なしで結合、その後は区切り線あり
    const combinedBody = title + allMessages.join("-------------\n\n");
    sendToDiscord(webhookURL, combinedBody);
}
