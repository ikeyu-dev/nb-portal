export default function CalendarLoading() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="h-9 w-40 bg-base-300 rounded-lg animate-pulse mb-6"></div>

            {/* スケジュール一覧 Skeleton */}
            <section className="mb-8">
                <div className="h-8 w-36 bg-base-300 rounded animate-pulse mb-4"></div>
                <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body">
                        <div className="flex items-center justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
