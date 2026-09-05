import { getInitialData } from "@/src/shared/api/initial-data";
import type { MembersData } from "@/src/shared/types/api";
import MembersClient from "./MembersClient";

export default async function MembersPage() {
    return <MembersClient initialData={await getInitialData<MembersData>("members")} />;
}
