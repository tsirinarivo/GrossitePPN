import type { Metadata } from "next";
import { NotificationsView } from "@/components/domain/notifications/notifications-view";

export const metadata: Metadata = { title: "Notifications" };

export default function Page() {
  return <NotificationsView />;
}
