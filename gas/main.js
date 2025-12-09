function onSubmit(e) {
    const webhookURL =
        PropertiesService.getScriptProperties().getProperty("WEBHOOK_URL");

    let body = "";

    try {
        const responses = e.response.getItemResponses();
        responses.forEach((response) => {
            const question = response.getItem().getTitle();
            const answer = response.getResponse();
            body += `**${question}**\n${answer}\n\n`;
        });
    } catch (error) {
        body = "フォームの送信内容の取得に失敗しました。";
    }

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
}

function main() {}
