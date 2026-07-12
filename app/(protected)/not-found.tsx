import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ProtectedNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The page or record you&apos;re looking for doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
