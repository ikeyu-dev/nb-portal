export default function NotificationsLoading() {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-4xl mx-auto">
                {/* ヘッダー Skeleton */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                    <div className="h-8 w-32 bg-base-300 rounded-lg animate-pulse"></div>
                </div>

                {/* プッシュ通知設定 Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 mb-6">
                    <div className="card-body p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                                <div className="space-y-2">
                                    <div className="h-4 w-24 bg-base-300 rounded animate-pulse"></div>
                                    <div className="h-3 w-32 bg-base-300 rounded animate-pulse"></div>
                                </div>
                            </div>
                            <div className="h-6 w-12 bg-base-300 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* 通知一覧 Skeleton */}
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="card bg-base-100 shadow-xl border border-base-300"
                        >
                            <div className="card-body p-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 bg-base-300 rounded-lg animate-pulse"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-3/4 bg-base-300 rounded animate-pulse"></div>
                                        <div className="h-5 w-1/2 bg-base-300 rounded animate-pulse"></div>
                                        <div className="h-3 w-24 bg-base-300 rounded animate-pulse"></div>
                                    </div>
                                    <div className="h-3 w-12 bg-base-300 rounded animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
