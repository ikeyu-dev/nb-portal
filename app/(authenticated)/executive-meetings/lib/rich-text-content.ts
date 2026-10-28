import type { JSONContent } from "@tiptap/core";

const AGENDA_DOCUMENT_PREFIX = "tiptap-json-v1:";

export function serializeAgendaDocument(document: JSONContent): string {
    return `${AGENDA_DOCUMENT_PREFIX}${JSON.stringify(document)}`;
}

export function parseAgendaDocument(value: string): JSONContent {
    if (value.startsWith(AGENDA_DOCUMENT_PREFIX)) {
        try {
            const document = JSON.parse(
                value.slice(AGENDA_DOCUMENT_PREFIX.length)
            ) as JSONContent;
            if (document.type === "doc") return document;
        } catch {
            // Fall back to plain text for legacy or malformed records.
        }
    }

    const paragraphs = value
        .replaceAll("\r\n", "\n")
        .split(/\n{2,}/)
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph) => ({
            type: "paragraph",
            content: paragraph
                .split("\n")
                .flatMap((line, index) => [
                    ...(index > 0 ? [{ type: "hardBreak" }] : []),
                    ...(line ? [{ type: "text", text: line }] : []),
                ]),
        }));

    return {
        type: "doc",
        content: paragraphs.length ? paragraphs : [{ type: "paragraph" }],
    };
}
