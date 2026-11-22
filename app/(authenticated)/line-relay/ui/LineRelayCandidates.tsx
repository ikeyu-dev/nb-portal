export type Candidate = {
    userId: string;
    lastSeenAt: string;
    messages?: { id: string; text: string; receivedAt: string }[];
};

const receivedAt = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
});

export function LineRelayCandidates({
    candidates,
    contacts,
    onSelect,
    onDelete,
    disabled,
}: {
    candidates: Candidate[];
    contacts: {
        organizationKey: string;
        organizationName: string;
        lineUserId: string | null;
    }[];
    onSelect: (index: number, userId: string) => void;
    onDelete: (userId: string) => void;
    disabled: boolean;
}) {
    if (candidates.length === 0) return null;

    return (
        <section className="mt-8 border-t border-base-300 pt-4">
            <h2 className="font-bold">LINEアカウントの登録</h2>
            <ul className="mt-2 divide-y divide-base-300">
                {candidates.map(({ userId, messages }) => (
                    <li
                        key={userId}
                        className="flex flex-wrap items-center justify-between gap-2 py-3"
                    >
                        <code className="min-w-0 break-all text-xs">
                            {userId}
                        </code>
                        <select
                            className="select select-bordered select-sm"
                            disabled={disabled}
                            aria-label={`${userId}を割り当てる団体`}
                            value={String(
                                contacts.findIndex(
                                    (contact) => contact.lineUserId === userId
                                )
                            )}
                            onChange={(event) => {
                                onSelect(Number(event.target.value), userId);
                            }}
                        >
                            <option value={-1}>団体を選択</option>
                            {contacts.map((contact, index) => (
                                <option
                                    key={contact.organizationKey}
                                    value={index}
                                >
                                    {contact.organizationName}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="btn btn-outline btn-error btn-sm"
                            disabled={disabled}
                            aria-label={`${userId}を候補から削除`}
                            onClick={() => onDelete(userId)}
                        >
                            候補から削除
                        </button>
                        {messages && messages.length > 0 && (
                            <ul className="w-full divide-y divide-base-300">
                                {messages.map((message) => (
                                    <li
                                        key={message.id}
                                        className="py-2"
                                    >
                                        <time
                                            className="text-xs text-base-content/70"
                                            dateTime={message.receivedAt}
                                        >
                                            {receivedAt.format(
                                                new Date(message.receivedAt)
                                            )}
                                        </time>
                                        <p className="whitespace-pre-wrap break-words text-sm">
                                            {message.text}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
