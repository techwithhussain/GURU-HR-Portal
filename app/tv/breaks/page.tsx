import { Suspense } from "react";
import { TvBreakBoard } from "@/features/tv/TvBreakBoard";

export default function TvBreaksPage() {
  return (
    <Suspense fallback={null}>
      <TvBreakBoard />
    </Suspense>
  );
}
