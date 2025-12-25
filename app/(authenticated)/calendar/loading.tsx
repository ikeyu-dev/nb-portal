export default function CalendarLoading() {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-7xl mx-auto">
                {/* ヘッダー Skeleton */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                    <div className="h-8 w-40 bg-base-300 rounded-lg animate-pulse"></div>
                </div>

                {/* スケジュール一覧 Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body">
                        <div className="flex items-center justify-center py-12">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
