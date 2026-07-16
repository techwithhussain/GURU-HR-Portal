import { Suspense } from "react";
import { TvBreakBoard } from "@/features/tv/TvBreakBoard";
import { getCompanyTimezone } from "@/services/reportsService";

export default async function TvBreaksPage() {
  const timezone = await getCompanyTimezone();

  return (
    <Suspense fallback={null}>
      <TvBreakBoard timezone={timezone} />
    </Suspense>
  );
}
