import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Construction className="size-10 text-primary" />
          <h1 className="text-lg font-semibold">{feature ?? "This feature"} is coming soon</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;re still building this out. Check back later!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
