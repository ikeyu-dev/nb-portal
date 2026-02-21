export default function HomeLoading() {
    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-full lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
            <div className="flex items-center gap-3 mb-8 max-lg:hidden shrink-0">
                <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                <div className="h-7 w-48 bg-base-300 rounded-lg animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:flex-1 lg:min-h-0 lg:grid-rows-[auto_1fr]">
                {/* Schedule Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px] lg:h-auto order-2 lg:order-2 lg:min-h-0">
                    <div className="card-body pt-5 flex flex-col overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 h-8 shrink-0">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-40 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>

                {/* Weather & Clock Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 order-1 lg:col-span-2">
                    <div className="card-body pt-5">
                        <div className="flex items-center gap-2 mb-2 h-8 shrink-0">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-48 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col items-center text-center py-4 gap-3">
                            <div className="h-6 w-32 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-14 w-56 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-64 bg-base-300 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Absences Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 h-[420px] lg:h-auto order-3 overflow-hidden lg:min-h-0">
                    <div className="card-body pt-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-4 h-8">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-32 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
