import { getAllAnnouncements } from "@/services/announcementService";
import { AdminAnnouncementsPanel } from "@/features/announcements/AdminAnnouncementsPanel";

export default async function AdminAnnouncementsPage() {
  const announcements = await getAllAnnouncements();
  return (
    <div className="mx-auto max-w-3xl">
      <AdminAnnouncementsPanel initial={announcements} />
    </div>
  );
}
