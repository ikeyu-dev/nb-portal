export default function AbsenceLoading() {
    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="h-9 w-32 bg-base-300 rounded-lg animate-pulse mb-6"></div>

            <div className="card bg-base-100 shadow-xl border border-base-300">
                <div className="card-body">
                    <div className="flex items-center justify-center py-12">
                        <span className="loading loading-spinner loading-lg text-primary"></span>
                    </div>
                </div>
            </div>
        </div>
    );
}
