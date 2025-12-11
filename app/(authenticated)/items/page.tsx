import { getItems } from "@/src/shared/api";
import type { Item } from "@/src/shared/types/api";

export default async function ItemsPage() {
    let items: Item[] = [];
    let error: string | null = null;

    try {
        const itemsRes = await getItems();
        items = itemsRes.data || [];
    } catch (err) {
        error =
            err instanceof Error ? err.message : "データの取得に失敗しました";
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 max-lg:hidden">物品管理</h1>
            {error && (
                <div className="alert alert-error mb-6">
                    <span>{error}</span>
                </div>
            )}

            {/* 物品一覧 */}
            <section className="mb-8">
                <h2 className="text-2xl font-bold mb-4 max-lg:hidden">
                    物品一覧
                </h2>
                <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                        <thead>
                            <tr>
                                {items.length > 0 &&
                                    Object.keys(items[0]).map((key) => (
                                        <th key={key}>{key}</th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={index}>
                                    {Object.values(item).map((value, i) => (
                                        <td key={i}>{String(value)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {items.length === 0 && !error && (
                        <p className="text-center py-8 text-base-content/60">
                            物品がありません
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}
