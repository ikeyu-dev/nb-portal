export default function HomeLoading() {
    return (
        <div className="max-w-full p-4 sm:px-6 sm:py-5 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:px-8 lg:py-6">
            <div className="mb-5 flex items-center gap-3 max-lg:hidden shrink-0 lg:mb-6">
                <div className="h-6 w-6 bg-base-300 rounded animate-pulse"></div>
                <div className="h-7 w-48 bg-base-300 rounded-lg animate-pulse"></div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:flex-1 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-[auto_auto_minmax(0,1fr)]">
                {/* Schedule Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 order-3 h-[420px] lg:order-none lg:col-span-7 lg:row-start-3 lg:h-full lg:min-h-0">
                    <div className="card-body flex flex-col overflow-hidden p-5 pb-4">
                        <div className="mb-3 flex h-8 items-center gap-2 shrink-0">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-40 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                            <span className="loading loading-spinner loading-lg text-primary"></span>
                        </div>
                    </div>
                </div>

                {/* Weather & Clock Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 order-1 lg:order-none lg:col-span-12 lg:row-start-1">
                    <div className="card-body p-4">
                        <div className="flex h-7 items-center gap-2 shrink-0">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-48 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="flex flex-col items-center gap-1 pt-1 text-center">
                            <div className="h-4 w-32 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-10 w-48 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-64 bg-base-300 rounded animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Next Meeting Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 order-2 lg:order-none lg:col-span-12 lg:row-start-2">
                    <div className="card-body gap-4 p-5 pb-4">
                        <div className="flex items-center gap-2">
                            <div className="h-5 w-5 bg-base-300 rounded animate-pulse"></div>
                            <div className="h-5 w-28 bg-base-300 rounded animate-pulse"></div>
                        </div>
                        <div className="rounded-lg border border-base-300 bg-base-50 px-4 py-3">
                            <div className="flex items-stretch gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 h-4 w-12 bg-base-300 rounded animate-pulse"></div>
                                    <div className="h-5 w-64 max-w-full bg-base-300 rounded animate-pulse"></div>
                                    <div className="mt-2 h-3 w-48 max-w-full bg-base-300 rounded animate-pulse"></div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="h-8 w-20 bg-base-300 rounded-lg animate-pulse"></div>
                                    <div className="h-8 w-20 bg-base-300 rounded-lg animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Absences Card Skeleton */}
                <div className="card bg-base-100 shadow-xl border border-base-300 order-4 h-[420px] overflow-hidden lg:order-none lg:col-span-5 lg:row-start-3 lg:h-full lg:min-h-0">
                    <div className="card-body flex flex-col p-5 pb-4">
                        <div className="mb-3 flex h-8 items-center gap-2">
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
