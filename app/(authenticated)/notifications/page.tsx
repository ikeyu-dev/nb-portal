import { auth } from "@/src/auth";
import { NotificationsContent, type Notification } from "./NotificationsContent";
import { getInitialData } from "@/src/shared/api/initial-data";

export default async function NotificationsPage() {
    const [session, initialData] = await Promise.all([
        auth(),
        getInitialData<Notification[]>("notifications", { limit: "50" }),
    ]);
    const userEmail = session?.user?.email || null;

    return <NotificationsContent userEmail={userEmail} initialData={initialData} />;
}
