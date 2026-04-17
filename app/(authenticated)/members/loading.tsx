export default function MembersLoading() {
    return (
        <div className="p-4 lg:p-6 w-full">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="skeleton h-10 w-40" />
                <div className="skeleton h-12 w-full max-w-md" />
                <div className="skeleton h-96 w-full" />
            </div>
        </div>
    );
}
