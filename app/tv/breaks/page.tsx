import { Suspense } from "react";
import { TvBreakBoard } from "@/features/tv/TvBreakBoard";
import { getCompanyTimezone } from "@/services/reportsService";

export const dynamic = "force-dynamic";

export default async function TvBreaksPage() {
  const timezone = await getCompanyTimezone();

  return (
    <Suspense fallback={null}>
      <TvBreakBoard timezone={timezone} />
    </Suspense>
  );
}
