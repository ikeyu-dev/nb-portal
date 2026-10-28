"use client";

import { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBold,
    faIndent,
    faListOl,
    faListUl,
    faOutdent,
    faRotateLeft,
    faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
    parseAgendaDocument,
    serializeAgendaDocument,
} from "../lib/rich-text-content";

const extensions = [
    StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        italic: false,
        strike: false,
    }),
];

export function AgendaRichTextEditor({
    value,
    editable,
    onChange,
}: {
    value: string;
    editable: boolean;
    onChange?: (value: string) => void;
}) {
    const latestOnChange = useRef(onChange);
    const lastValue = useRef(value);

    useEffect(() => {
        latestOnChange.current = onChange;
    }, [onChange]);

    const editor = useEditor({
        extensions,
        content: parseAgendaDocument(value),
        editable,
        immediatelyRender: false,
        editorProps: {
            attributes: { "aria-label": "議事録本文" },
        },
        onUpdate: ({ editor: updatedEditor }) => {
            const nextValue = serializeAgendaDocument(updatedEditor.getJSON());
            lastValue.current = nextValue;
            latestOnChange.current?.(nextValue);
        },
    });

    useEffect(() => {
        if (!editor || value === lastValue.current) return;
        editor.commands.setContent(parseAgendaDocument(value), {
            emitUpdate: false,
        });
        lastValue.current = value;
    }, [editor, value]);

    const active = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => ({
            bold: currentEditor?.isActive("bold") ?? false,
            bulletList: currentEditor?.isActive("bulletList") ?? false,
            orderedList: currentEditor?.isActive("orderedList") ?? false,
            canIndent: currentEditor?.can().sinkListItem("listItem") ?? false,
            canOutdent: currentEditor?.can().liftListItem("listItem") ?? false,
            canUndo: currentEditor?.can().undo() ?? false,
            canRedo: currentEditor?.can().redo() ?? false,
        }),
    });

    const toolbarButton = (
        label: string,
        icon: typeof faBold,
        isActive: boolean,
        disabled: boolean,
        action: () => void
    ) => (
        <button
            key={label}
            type="button"
            className={`btn btn-ghost btn-sm ${isActive ? "bg-primary/10 text-primary" : ""}`}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            disabled={disabled}
            onMouseDown={(event) => event.preventDefault()}
            onClick={action}
        >
            <FontAwesomeIcon icon={icon} />
        </button>
    );

    return (
        <div
            className={`${editable ? "rounded-box border border-base-300 bg-base-100 focus-within:border-primary" : ""} ${editable ? "" : "py-1"}`}
        >
            {editable && editor && (
                <div className="flex flex-wrap gap-1 border-b border-base-300 p-2">
                    {toolbarButton(
                        "元に戻す",
                        faRotateLeft,
                        false,
                        !(active?.canUndo ?? false),
                        () => editor.chain().focus().undo().run()
                    )}
                    {toolbarButton(
                        "やり直す",
                        faRotateRight,
                        false,
                        !(active?.canRedo ?? false),
                        () => editor.chain().focus().redo().run()
                    )}
                    {toolbarButton(
                        "太字",
                        faBold,
                        active?.bold ?? false,
                        false,
                        () => editor.chain().focus().toggleBold().run()
                    )}
                    {toolbarButton(
                        "箇条書き",
                        faListUl,
                        active?.bulletList ?? false,
                        false,
                        () => editor.chain().focus().toggleBulletList().run()
                    )}
                    {toolbarButton(
                        "番号付きリスト",
                        faListOl,
                        active?.orderedList ?? false,
                        false,
                        () => editor.chain().focus().toggleOrderedList().run()
                    )}
                    {toolbarButton(
                        "インデントを減らす",
                        faOutdent,
                        false,
                        !(active?.canOutdent ?? false),
                        () =>
                            editor
                                .chain()
                                .focus()
                                .liftListItem("listItem")
                                .run()
                    )}
                    {toolbarButton(
                        "インデントを増やす",
                        faIndent,
                        false,
                        !(active?.canIndent ?? false),
                        () =>
                            editor
                                .chain()
                                .focus()
                                .sinkListItem("listItem")
                                .run()
                    )}
                </div>
            )}
            <EditorContent
                editor={editor}
                className={`px-3 py-2 [&_.tiptap]:min-h-28 [&_.tiptap]:outline-none [&_.tiptap_p]:my-2 [&_.tiptap_p:first-child]:mt-0 [&_.tiptap_p:last-child]:mb-0 [&_.tiptap_ul]:my-2 [&_.tiptap_ul]:list-disc [&_.tiptap_ul]:pl-6 [&_.tiptap_ol]:my-2 [&_.tiptap_ol]:list-decimal [&_.tiptap_ol]:pl-6 [&_.tiptap_li]:pl-1 ${editable ? "" : "px-0"}`}
            />
        </div>
    );
}
