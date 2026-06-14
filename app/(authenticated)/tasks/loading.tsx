export default function TasksLoading() {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-6 w-6 bg-base-300 rounded animate-pulse" />
                    <div className="h-8 w-32 bg-base-300 rounded-lg animate-pulse" />
                </div>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(320px,420px)_1fr]">
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body space-y-4">
                            <div className="skeleton h-6 w-32" />
                            <div className="skeleton h-12 w-full" />
                            <div className="skeleton h-24 w-full" />
                            <div className="skeleton h-12 w-full" />
                            <div className="skeleton h-10 w-28" />
                        </div>
                    </div>
                    <div className="card bg-base-100 shadow-xl border border-base-300">
                        <div className="card-body space-y-4">
                            <div className="skeleton h-6 w-36" />
                            {[...Array(4)].map((_, index) => (
                                <div
                                    key={index}
                                    className="skeleton h-24 w-full"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
