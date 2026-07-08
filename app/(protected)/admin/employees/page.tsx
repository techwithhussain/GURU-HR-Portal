import Link from "next/link";
import { redirect } from "next/navigation";
import { searchEmployeesAction, deactivateEmployeeAction, activateEmployeeAction } from "@/actions/employee.actions";
import { getSessionContext } from "@/services/sessionService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function EmployeesPage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const { items } = await searchEmployeesAction({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/employees/import">Bulk Import</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/employees/new">Add Employee</Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <Link href={`/admin/employees/${employee.id}/edit`} className="hover:underline">
                  {employee.fullName}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={employee.status === "ACTIVE" ? "default" : "secondary"}>
                  {employee.status}
                </Badge>
              </TableCell>
              <TableCell>{employee.salary != null ? String(employee.salary) : "—"}</TableCell>
              <TableCell className="text-right">
                {employee.status === "ACTIVE" ? (
                  <form action={deactivateEmployeeAction.bind(null, employee.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Deactivate
                    </Button>
                  </form>
                ) : (
                  <form action={activateEmployeeAction.bind(null, employee.id)}>
                    <Button type="submit" variant="outline" size="sm">
                      Activate
                    </Button>
                  </form>
                )}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No employees yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
