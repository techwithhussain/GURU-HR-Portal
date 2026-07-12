import { Loader2 } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}
