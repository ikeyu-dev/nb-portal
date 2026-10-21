export default function SurveysLoading() {
    return (
        <div className="w-full p-4 lg:p-6">
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="skeleton h-10 w-40" />
                <div className="space-y-4">
                    {[...Array(3)].map((_, index) => (
                        <div
                            key={index}
                            className="skeleton h-24 w-full"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
