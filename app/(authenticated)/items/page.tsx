import { getInitialData } from "@/src/shared/api/initial-data";
import type { Item } from "@/src/shared/types/api";
import ItemsClient from "./ItemsClient";

export default async function ItemsPage() {
    return <ItemsClient initialData={await getInitialData<Item[]>("items")} />;
}
