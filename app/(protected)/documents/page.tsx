import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { getSessionContext } from "@/services/sessionService";
import { listMyDocumentsAction } from "@/actions/employeeDocument.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DocumentUploadDialog } from "@/features/employees/DocumentUploadDialog";
import { DeleteDocumentButton } from "@/features/employees/DeleteDocumentButton";

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  RESUME: "Resume",
  OFFER_LETTER: "Offer Letter",
  EXPERIENCE_LETTER: "Experience Letter",
  OTHER: "Other",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function DocumentsPage() {
  const session = await getSessionContext();
  if (!session) notFound();
  const employeeId = session.employeeId;
  if (!employeeId) notFound();

  const documents = await listMyDocumentsAction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" /> My Documents
          </CardTitle>
          <DocumentUploadDialog employeeId={employeeId} />
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && (
            <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
          )}
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.fileName} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/employees/documents/${doc.storagePath}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/employees/documents/${doc.storagePath}?download=1`} download={doc.fileName}>
                    Download
                  </a>
                </Button>
                {doc.uploadedByUserId === session.userId && (
                  <DeleteDocumentButton documentId={doc.id} employeeId={employeeId} />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
