export default function HomeLoading() {
    return (
        <div className="p-10 max-w-full">
            <div className="h-10 w-64 bg-base-300 rounded-lg animate-pulse mb-8"></div>

            {/* Top Cards Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Schedule Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px]">
                    <div className="card-body pt-5">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-6 w-40 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>

                {/* Weather & Clock Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px]">
                    <div className="card-body pt-5">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-6 w-48 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Absences Section Skeleton */}
            <div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body pt-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                        <div className="h-8 w-40 bg-base-300 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
