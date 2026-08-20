import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { getSalarySlipById } from "@/services/salarySlipService";
import { getCompanyPublicInfo } from "@/services/companySettingsService";
import { generateSalarySlipPdf } from "@/lib/pdf/salarySlipPdf";
import { ForbiddenError } from "@/lib/rbac/permissions";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const session = await getSessionContext();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const slip = await getSalarySlipById(id, session);
    if (!slip) {
      return new NextResponse("Not found", { status: 404 });
    }

    const companyInfo = await getCompanyPublicInfo();
    const pdfBuffer = await generateSalarySlipPdf(slip, companyInfo);
    const filename = `salary-slip-${slip.employeeCode}-${slip.monthName}-${slip.year}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    console.error("[salary-slip-pdf]", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
