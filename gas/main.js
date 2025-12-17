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

/**
 * Discord通知用のメッセージ本文を構築
 * @param {Object} formData - フォームデータ
 * @param {boolean} includeTimestamp - タイムスタンプを含めるか
 * @returns {string} Markdown形式のメッセージ本文
 */
const buildMessageBody = (formData, includeTimestamp = true) => {
    let body = "";

    if (includeTimestamp) {
        body += `**送信日時**: ${formData.timestamp}\n`;
    }

    body += `**氏名**: ${formData.name}\n`;

    // 種別に応じて時間情報を付加（早退→早退時間、中抜け→開始〜終了時間）
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

/**
 * Discord Webhookにメッセージを送信
 * @param {string} webhookURL - Discord Webhook URL（スクリプトプロパティから取得）
 * @param {string} body - 送信するメッセージ本文
 */
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
    const body = buildMessageBody(formData);
    sendToDiscord(webhookURL, body);
    sendEmail(formData);
}

// ============================================
// 日次まとめ通知（手動実行または時間トリガー用）
// ============================================

/**
 * 指定行からフォームデータを取得（一括取得用）
 * @param {Sheet} sheet - スプレッドシートのシートオブジェクト
 * @param {number} row - 行番号
 * @param {Array} headers - ヘッダー配列
 * @returns {Object} フィールド名をキーとしたフォームデータ
 */
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

/**
 * 当日の全欠席・遅刻・早退・中抜けをまとめてDiscordに送信
 * 手動実行または時間トリガーで毎日の活動開始前に実行想定
 */
function sendAllAbsece() {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const lastRow = sheet.getLastRow();
    const headers = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0];

    // 現在の日付でタイトルを生成
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

    // タイトルと全メッセージを区切り線で結合して送信
    const combinedBody = title + allMessages.join("-------------\n\n");
    sendToDiscord(webhookURL, combinedBody);
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
            case "schedules":
                return handleGetSchedules(e);
            case "absences":
                return handleGetAbsences(e);
            case "event-absences":
                return handleGetEventAbsences(e);
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
                        schedules: "?path=schedules",
                        absences: "?path=absences&date=YYYY-MM-DD",
                        eventAbsences: "?path=event-absences&eventId=EVENT_ID",
                        verifyMember: "?path=verify-member&identifier=STUDENT_NUMBER",
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
            case "schedules":
                return handlePostSchedule(postData);
            case "schedules/update":
                return handleUpdateSchedule(postData);
            case "schedules/delete":
                return handleDeleteSchedule(postData);
            case "push-subscribe":
                return handlePushSubscribe(postData);
            case "push-unsubscribe":
                return handlePushUnsubscribe(postData);
            default:
                return createErrorResponse("Invalid endpoint", 404);
        }
    } catch (error) {
        return createErrorResponse(error.toString(), 500);
    }
}

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
// API: スケジュール一覧取得
// シート名: schedules
// 列構成: A:EVENT_ID, B:YYYY, C:MM, D:DD, E:TIME_HH, F:TIME_MM, G:TITLE, H:WHERE, I:DETAIL, J:END_YYYY, K:END_MM, L:END_DD, M:COLOR, N:CREATED_BY, O:CREATED_AT, P:UPDATED_BY, Q:UPDATED_AT
// ============================================

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

        const lastRow = sheet.getLastRow();
        if (lastRow < 2) {
            return createResponse({
                success: true,
                data: [],
                count: 0,
            });
        }

        // A2:M（2行目以降、13列）のデータを取得（終了日とカラーを含む）
        const range = sheet.getRange(2, 1, lastRow - 1, 13);
        const values = range.getValues();

        // ヘッダー行（A1:M1）を取得
        const headers = sheet.getRange(1, 1, 1, 13).getValues()[0];

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
 * @returns {TextOutput} { success, isMember: boolean, identifier }
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

        // A列（学籍番号）の2行目以降を取得
        const range = sheet.getRange(2, 1, lastRow - 1, 1);
        const values = range.getValues();

        // 大文字小文字を区別せず、前後の空白を除去して比較
        const normalizedIdentifier = String(identifier).toLowerCase().trim();

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
        const { year, month, date, timeHH, timeMM, title, where, detail, endYear, endMonth, endDate, color, createdBy } =
            postData;

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
                endYear: endYear || null,
                endMonth: endMonth || null,
                endDate: endDate || null,
                color: color || "primary",
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

        // 現在日時でタイムスタンプを生成
        const now = new Date();
        const timestamp = Utilities.formatDate(
            now,
            Session.getScriptTimeZone(),
            "yyyy/MM/dd HH:mm:ss"
        );

        // 列順: A:タイムスタンプ, B:EVENT_ID, C:学籍番号, D:氏名, E:種別, F:理由, G:早退時間, H:抜ける時間, I:戻る時間
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

        // Discord Webhookに通知を送信
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

        // 送信者にメールで完了通知を送信
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
        const { eventId, year, month, date, timeHH, timeMM, title, where, detail, endYear, endMonth, endDate, color, updatedBy } =
            postData;

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
            return createErrorResponse("Schedule not found with eventId: " + eventId, 404);
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

        // P列（UPDATED_BY）とQ列（UPDATED_AT）を更新
        if (updatedBy) {
            sheet.getRange(targetRow, 16, 1, 2).setValues([[updatedBy, updatedAt]]);
        }

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
                title,
                where: where || "",
                detail: detail || "",
                endYear: endYear || null,
                endMonth: endMonth || null,
                endDate: endDate || null,
                color: color || "primary",
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

        // 行を削除
        sheet.deleteRow(targetRow);

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
                // A列（学籍番号）とC列（名前）を取得
                const membersRange = membersSheet.getRange(2, 1, membersLastRow - 1, 3);
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
            const createdBy = String(row[13] || "").toLowerCase().trim();
            const createdAt = row[14];
            const updatedBy = String(row[15] || "").toLowerCase().trim();
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
            return createErrorResponse("Missing required fields (subscription, studentId)", 400);
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
            sheet.getRange(1, 1, 1, 5).setValues([
                ["STUDENT_ID", "ENDPOINT", "P256DH", "AUTH", "CREATED_AT"]
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
            sheet.getRange(existingRow, 1, 1, 5).setValues([
                [studentId.toLowerCase(), endpoint, keys.p256dh, keys.auth, createdAt]
            ]);
        } else {
            // 新規登録
            sheet.appendRow([
                studentId.toLowerCase(),
                endpoint,
                keys.p256dh,
                keys.auth,
                createdAt
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
            return createErrorResponse("Missing required field (endpoint)", 400);
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
