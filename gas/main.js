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

    MailApp.sendEmail(email, subject, bodyText, { name: "欠席連絡システム" });
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

// ============================================
// Web API エンドポイント
// ============================================

// CORSヘッダーを設定したレスポンスを作成
const createResponse = (data, statusCode = 200) => {
    const output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
};

// エラーレスポンスを作成
const createErrorResponse = (message, statusCode = 400) => {
    return createResponse(
        {
            success: false,
            error: message,
        },
        statusCode
    );
};

// GET リクエストのハンドラ
function doGet(e) {
    try {
        const path = e.parameter.path || "";

        // ルーティング
        switch (path) {
            case "items":
                return handleGetItems(e);
            case "schedules":
                return handleGetSchedules(e);
            case "absences":
                return handleGetAbsences(e);
            case "event-absences":
                return handleGetEventAbsences(e);
            case "verify-member":
                return handleVerifyMember(e);
            case "health":
                return createResponse({
                    success: true,
                    message: "API is running",
                    timestamp: new Date().toISOString(),
                });
            default:
                return createResponse({
                    success: true,
                    message: "NB Portal API",
                    version: "1.0.0",
                    endpoints: {
                        items: "?path=items",
                        schedules: "?path=schedules",
                        absences: "?path=absences&date=YYYY-MM-DD",
                        eventAbsences: "?path=event-absences&eventId=EVENT_ID",
                        verifyMember: "?path=verify-member&identifier=STUDENT_NUMBER",
                        health: "?path=health",
                    },
                });
        }
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
}

// OPTIONS リクエストのハンドラ（CORS preflight対応）
function doOptions(e) {
    const output = ContentService.createTextOutput("");
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
}

// POST リクエストのハンドラ
function doPost(e) {
    try {
        const path = e.parameter.path || "";
        const postData = JSON.parse(e.postData.contents || "{}");

        // ルーティング
        switch (path) {
            case "absences":
                return handlePostAbsence(postData);
            case "schedules":
                return handlePostSchedule(postData);
            default:
                return createErrorResponse("Invalid endpoint", 404);
        }
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
}

// Itemsデータ取得API (A2:C)
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

        // A2:Cの範囲を取得
        const range = sheet.getRange(2, 1, lastRow - 1, 3);
        const values = range.getValues();

        // ヘッダーを取得（A1:C1）
        const headers = sheet.getRange(1, 1, 1, 3).getValues()[0];

        // データを整形
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

// Schedulesデータ取得API (A2:I)
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL
const handleGetSchedules = (e) => {
    try {
        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("schedules");

        if (!sheet) {
            return createErrorResponse("Sheet 'schedules' not found", 404);
        }

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:Iの範囲を取得（9列）
        const range = sheet.getRange(2, 1, lastRow - 1, 9);
        const values = range.getValues();

        // ヘッダーを取得（A1:I1）
        const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

        // データを整形
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

// Absencesデータ取得API (absence_data シート: A2:I)
// 列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
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

        // A2:Iの範囲を取得
        const range = sheet.getRange(2, 1, lastRow - 1, 9);
        const values = range.getValues();

        // ヘッダーを取得（A1:I1）
        const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

        const dateParam = e.parameter.date;
        const absences = [];

        // データを整形
        values.forEach((row) => {
            const absence = {};
            headers.forEach((header, index) => {
                absence[header] = row[index];
            });

            // 日付フィルタリング（指定されている場合）
            if (dateParam) {
                // タイムスタンプから日付部分を抽出
                const timestamp = absence[headers[0]]; // A列がタイムスタンプと仮定
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

// 特定イベントの欠席者取得API (absence_data シート)
// 列構成: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
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

        // A2:Iの範囲を取得
        const range = sheet.getRange(2, 1, lastRow - 1, 9);
        const values = range.getValues();

        // ヘッダーを取得（A1:I1）
        const headers = sheet.getRange(1, 1, 1, 9).getValues()[0];

        // EVENT_IDのカラムインデックスを見つける (B列 = index 1)
        const eventIdIndex = headers.findIndex((h) => h === "EVENT_ID");

        if (eventIdIndex === -1) {
            return createErrorResponse(
                "EVENT_ID column not found in absence_data sheet",
                500
            );
        }

        const absences = [];

        // データを整形してフィルタリング
        values.forEach((row) => {
            // EVENT_IDが一致する行のみ処理
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

// 部員確認API (members シートのA列と照合)
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

        // A列（学籍番号）を取得
        const range = sheet.getRange(2, 1, lastRow - 1, 1);
        const values = range.getValues();

        // 識別子を正規化（小文字化、トリム）
        const normalizedIdentifier = String(identifier).toLowerCase().trim();

        // A列の値と比較
        const isMember = values.some((row) => {
            const studentId = String(row[0]).toLowerCase().trim();
            return studentId === normalizedIdentifier;
        });

        return createResponse({
            success: true,
            isMember: isMember,
            identifier: identifier,
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// スケジュール登録API
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL
const handlePostSchedule = (postData) => {
    try {
        const { year, month, date, timeHH, timeMM, title, where, detail } =
            postData;

        // 必須フィールドの検証
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

        // EVENT_IDを生成（E-XX形式、行番号-1、最低2桁で0埋め）
        const lastRow = sheet.getLastRow();
        const newRowNumber = lastRow + 1;
        const eventIdNumber = newRowNumber - 1;
        const eventId = "E-" + String(eventIdNumber).padStart(2, "0");

        // データを追加
        // A: EVENT_ID, B: YYYY, C: MM, D: DD, E: TIME_HH, F: TIME_MM, G: TITLE, H: WHERE, I: DETAIL
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
        ];

        sheet.appendRow(rowData);

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
                title,
                where: where || "",
                detail: detail || "",
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};

// 欠席データ登録API
const handlePostAbsence = (postData) => {
    try {
        const {
            eventId,
            studentNumber,
            name,
            type,
            reason,
            timeStepOut,
            timeReturn,
            timeLeavingEarly,
        } = postData;

        // 必須フィールドの検証
        if (!eventId || !studentNumber || !name || !type || !reason) {
            return createErrorResponse("Missing required fields", 400);
        }

        const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        const sheet = spreadsheet.getSheetByName("absence_data");

        if (!sheet) {
            return createErrorResponse("Sheet 'absence_data' not found", 404);
        }

        // タイムスタンプを作成
        const now = new Date();
        const timestamp = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        // データを追加（A列: タイムスタンプ, B列以降: フォームデータ）
        // absence_data シートの列構成に合わせる:
        // A: タイムスタンプ, B: EVENT_ID, C: 学籍番号, D: 氏名, E: 種別, F: 理由, G: 早退時間, H: 抜ける時間, I: 戻る時間
        // A: TIMESTAMP, B: EVENT_ID, C: STUDENT_NUMBER, D: NAME, E: TYPE, F: REASON, G: TimeLeavingEarly, H: TimeStepOut, I: TimeReturn
        const rowData = [
            timestamp,
            eventId,
            studentNumber,
            name,
            type,
            reason,
            timeLeavingEarly || "",
            timeStepOut || "",
            timeReturn || "",
        ];

        sheet.appendRow(rowData);

        // Discord通知を送信
        const webhookURL =
            PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

        if (webhookURL) {
            let body = `**新しい欠席連絡**\n`;
            body += `**氏名**: ${name}\n`;
            body += `**種別**: ${type}`;

            if (type === "早退" && timeLeavingEarly) {
                body += `(${timeLeavingEarly})`;
            } else if (type === "中抜け" && (timeStepOut || timeReturn)) {
                body += `(${timeStepOut || ""} ~ ${timeReturn || ""})`;
            }

            body += `\n**理由**: ${reason}\n`;

            sendToDiscord(webhookURL, body);
        }

        // メール送信
        const domain =
            PropertiesService.getScriptProperties().getProperty("NIT_DOMAIN");

        if (domain && studentNumber) {
            const email = `${studentNumber}@${domain}`;
            const subject = "欠席連絡フォーム送信完了通知";

            let bodyText = `${name} さん\n\n`;
            bodyText += `以下の内容でフォームが送信されました．\n\n`;
            bodyText += `氏名: ${name}\n`;
            bodyText += `種別: ${type}`;

            if (type === "早退" && timeLeavingEarly) {
                bodyText += `(${timeLeavingEarly})`;
            } else if (type === "中抜け" && (timeStepOut || timeReturn)) {
                bodyText += `(${timeStepOut || ""} ~ ${timeReturn || ""})`;
            }

            bodyText += `\n理由: ${reason}\n`;
            bodyText += `\n送信日時: ${timestamp}\n`;

            MailApp.sendEmail(email, subject, bodyText, {
                name: "欠席連絡システム",
            });
        }

        return createResponse({
            success: true,
            message: "Absence record created successfully",
            data: {
                timestamp,
                eventId,
                studentNumber,
                name,
                type,
            },
        });
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
};
