export default function ExecutiveMeetingsLoading() {
    return (
        <div className="flex min-h-[50dvh] items-center justify-center">
            <span
                className="loading loading-spinner loading-lg text-primary"
                role="status"
                aria-label="議事録を読み込み中"
            />
        </div>
    );
}
