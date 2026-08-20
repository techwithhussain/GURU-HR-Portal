import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { SalarySlipItem } from "@/types/salarySlip";
import type { CompanyPublicInfo } from "@/services/companySettingsService";
import { numberToWordsRupees } from "@/lib/utils/numberToWords";

// ---------------------------------------------------------------------------
// Styles matching exact target reference image
// ---------------------------------------------------------------------------

const colors = {
  navy: "#0F172A",       // Primary Navy Blue
  navyLight: "#1E293B",  // Card headers
  orange: "#F97316",      // Accent Orange
  green: "#16A34A",       // Earnings Header & Values
  greenBg: "#F0FDF4",     // Light Green Total
  red: "#DC2626",         // Deductions Header & Values
  redBg: "#FEF2F2",       // Light Red Total
  lightGray: "#F8FAFC",   // Card Background
  borderGray: "#CBD5E1",  // Table & Card Borders
  textDark: "#1E293B",
  textMid: "#475569",
  textLight: "#64748B",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: colors.textDark,
    backgroundColor: colors.white,
    paddingTop: 18,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },

  // ── Company Header ──
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.navy,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandBlock: {
    marginRight: 10,
  },
  logoImage: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  brandGuru: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    letterSpacing: 0.5,
  },
  brandTagline: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: colors.orange,
    letterSpacing: 1.5,
    marginTop: -2,
  },
  verticalDivider: {
    width: 1,
    height: 44,
    backgroundColor: colors.borderGray,
    marginHorizontal: 10,
  },
  addressBlock: {
    justifyContent: "center",
  },
  addressText: {
    fontSize: 7,
    color: colors.textMid,
    lineHeight: 1.3,
  },
  emailText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginTop: 2,
  },

  headerRight: {
    alignItems: "flex-end",
  },
  slipTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    letterSpacing: 1,
  },
  slipMonth: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.orange,
    marginTop: 4,
  },

  // ── Section Cards (Top Grid) ──
  topGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  sectionCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
  },
  cardHeader: {
    backgroundColor: colors.navy,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardHeaderText: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 6,
    backgroundColor: colors.white,
  },
  infoRow: {
    flexDirection: "row",
    paddingVertical: 2,
  },
  infoLabel: {
    width: 95,
    fontSize: 7.5,
    color: colors.textMid,
  },
  infoColon: {
    width: 10,
    fontSize: 7.5,
    color: colors.textMid,
  },
  infoValue: {
    flex: 1,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: colors.textDark,
  },

  // ── Attendance Summary Cards ──
  attendanceSummaryRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  attendanceBox: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 3,
    borderWidth: 1,
    alignItems: "center",
  },
  workBox: {
    borderColor: colors.borderGray,
    backgroundColor: colors.lightGray,
  },
  presentBox: {
    borderColor: "#A7F3D0",
    backgroundColor: "#F0FDF4",
  },
  absentBox: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  boxNumber: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  boxLabel: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    marginTop: 1,
  },

  // ── Tables Grid (Middle) ──
  tablesGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  tableCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderGray,
    borderRadius: 4,
    overflow: "hidden",
  },
  tableHeaderEarnings: {
    backgroundColor: colors.green,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableHeaderDeductions: {
    backgroundColor: colors.red,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableHeaderText: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderGray,
  },
  tableCellLabel: {
    fontSize: 7.5,
    color: colors.textDark,
  },
  tableCellValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica",
    color: colors.textDark,
    textAlign: "right",
  },
  totalRowEarnings: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.greenBg,
  },
  totalRowDeductions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: colors.redBg,
  },
  totalLabelEarnings: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  totalValueEarnings: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
    textAlign: "right",
  },
  totalLabelDeductions: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
  },
  totalValueDeductions: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
    textAlign: "right",
  },

  // ── Net Pay Banner ──
  netPayCard: {
    backgroundColor: colors.navy,
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  netPayTitle: {
    color: colors.white,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
  netPayWords: {
    color: "#94A3B8",
    fontSize: 7.5,
    marginTop: 2,
  },
  netPayRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rupeeSymbol: {
    color: colors.white,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginRight: 4,
  },
  netPayAmount: {
    color: colors.white,
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
  },

  // ── Footer & Signatory ──
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  notesBlock: {
    flex: 1,
    marginRight: 15,
  },
  notesHeader: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginBottom: 3,
  },
  notesBullet: {
    fontSize: 6.5,
    color: colors.textMid,
    lineHeight: 1.3,
  },

  signatoryBlock: {
    width: 150,
    alignItems: "center",
  },
  signatoryCompany: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: colors.navy,
    marginBottom: 24,
  },
  signatoryLine: {
    width: 130,
    height: 1,
    backgroundColor: colors.navy,
    marginBottom: 3,
  },
  signatoryLabel: {
    fontSize: 7,
    color: colors.textMid,
  },

  // ── Bottom Ribbon ──
  bottomRibbon: {
    backgroundColor: colors.navy,
    paddingVertical: 3,
    alignItems: "center",
    borderRadius: 2,
  },
  bottomRibbonText: {
    color: colors.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
  },
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function maskAadhaar(val: string | null | undefined): string {
  if (!val) return "XXXX XXXX 9012";
  const cleaned = val.replace(/\s+/g, "");
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `XXXX XXXX ${last4}`;
  }
  return val;
}

function maskBank(val: string | null | undefined, bankName: string | null | undefined): string {
  const bName = bankName || "HDFC Bank";
  if (!val) return `XXXXXX1234 (${bName})`;
  const cleaned = val.replace(/[^0-9A-Za-z]/g, "");
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `XXXXXX${last4} (${bName})`;
  }
  return `${val} (${bName})`;
}

function formatDate(d: unknown): string {
  if (!d) return "15 January 2024";
  const dateObj = d instanceof Date ? d : new Date(String(d));
  if (isNaN(dateObj.getTime())) return "15 January 2024";
  return dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SalarySlipDocumentProps {
  slip: SalarySlipItem;
  companyInfo?: CompanyPublicInfo;
}

export function SalarySlipDocument({ slip, companyInfo }: SalarySlipDocumentProps) {
  const companyName = companyInfo?.name || "GURU DIGITAL ADVERTISING";
  const companyAddress =
    companyInfo?.address ||
    "F361, 2nd Floor, Phase 8B, Industrial Area, Sector 74, Sahibzada Ajit Singh Nagar, Mohali, Punjab-140307";
  const companyEmail = companyInfo?.email || "cris@gurudigitaladvertising.com";

  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // Itemized Earnings
  const grossEarnings =
    slip.basicSalary + slip.specialAllowance + slip.nightAllowance + slip.otherAllowance + slip.bonus;

  const earningsRows = [
    { label: "Basic Salary", amount: slip.basicSalary },
    { label: "Special Allowance", amount: slip.specialAllowance },
    { label: "Night Allowance", amount: slip.nightAllowance },
    { label: "Other Allowance", amount: slip.otherAllowance },
    { label: "Bonus / Incentive", amount: slip.bonus },
  ];

  // Itemized Deductions
  const lopDaysCount = slip.lopDays ?? 0;
  const lopLabel = lopDaysCount > 0 ? `LOP Deduction (${lopDaysCount} Days)` : "LOP Deduction";

  const totalDeductions =
    slip.pfDeduction +
    slip.profTaxDeduction +
    slip.tdsDeduction +
    slip.lopDeduction +
    slip.otherDeduction;

  const deductionsRows = [
    { label: "Employee PF", amount: slip.pfDeduction },
    { label: "Professional Tax", amount: slip.profTaxDeduction },
    { label: "TDS", amount: slip.tdsDeduction },
    { label: lopLabel, amount: slip.lopDeduction },
    { label: "Other Deductions", amount: slip.otherDeduction },
  ];

  const netPay = slip.netSalary || grossEarnings - totalDeductions;
  const amountInWords = numberToWordsRupees(netPay);

  // Pay period formatted — month and year ONLY as requested
  const monthName = slip.monthName;
  const year = slip.year;
  const payPeriodText = `${monthName} ${year}`;
  const generatedOnText = formatDate(slip.createdAt);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ── Company Header ── */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <View style={styles.brandBlock}>
              <Image src={logoPath} style={styles.logoImage} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.addressBlock}>
              <Text style={styles.addressText}>{companyAddress}</Text>
              <Text style={styles.emailText}>{companyEmail}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.slipTitle}>SALARY SLIP</Text>
            <Text style={styles.slipMonth}>
              {monthName} {year}
            </Text>
          </View>
        </View>

        {/* ── Top Grid: Employee Info & Attendance ── */}
        <View style={styles.topGrid}>
          {/* Employee Information */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>EMPLOYEE INFORMATION</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Employee Name</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.employeeName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Employee ID</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.employeeCode}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Designation</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.designation || "Executive"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.department || "Operations"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Joining</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{formatDate(slip.joiningDate)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Employment Type</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.employmentType || "Full Time"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.location || "Mohali, Punjab"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PAN</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.panNumber || "ABCDE1234F"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Aadhaar Number</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{maskAadhaar(slip.aadhaarNumber)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bank Account</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{maskBank(slip.bankAccount, slip.bankName)}</Text>
              </View>
            </View>
          </View>

          {/* Pay Period & Attendance */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderText}>PAY PERIOD & ATTENDANCE</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Pay Period</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{payPeriodText}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Payable Days</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.workingDays || 30}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Present Days</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.presentDays ?? 30}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Paid Leave</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.paidLeaveDays ?? 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>LOP Days</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.lopDays ?? 0}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Working Days</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{slip.workingDays || 30}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Generated On</Text>
                <Text style={styles.infoColon}>:</Text>
                <Text style={styles.infoValue}>{generatedOnText}</Text>
              </View>

              {/* Attendance Badges */}
              <View style={styles.attendanceSummaryRow}>
                <View style={[styles.attendanceBox, styles.workBox]}>
                  <Text style={[styles.boxNumber, { color: colors.navy }]}>
                    {slip.workingDays || 30}
                  </Text>
                  <Text style={[styles.boxLabel, { color: colors.textMid }]}>WORKING DAYS</Text>
                </View>
                <View style={[styles.attendanceBox, styles.presentBox]}>
                  <Text style={[styles.boxNumber, { color: colors.green }]}>
                    {slip.presentDays ?? 30}
                  </Text>
                  <Text style={[styles.boxLabel, { color: colors.green }]}>PRESENT DAYS</Text>
                </View>
                <View style={[styles.attendanceBox, styles.absentBox]}>
                  <Text style={[styles.boxNumber, { color: colors.red }]}>
                    {slip.absentDays ?? 0}
                  </Text>
                  <Text style={[styles.boxLabel, { color: colors.red }]}>ABSENT DAYS</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ── Middle Grid: Earnings & Deductions Tables ── */}
        <View style={styles.tablesGrid}>
          {/* Earnings */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderEarnings}>
              <Text style={styles.tableHeaderText}>EARNINGS</Text>
              <Text style={styles.tableHeaderText}>AMOUNT (₹)</Text>
            </View>
            {earningsRows.map((row) => (
              <View key={row.label} style={styles.tableRow}>
                <Text style={styles.tableCellLabel}>{row.label}</Text>
                <Text style={styles.tableCellValue}>{formatCurrency(row.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalRowEarnings}>
              <Text style={styles.totalLabelEarnings}>GROSS EARNINGS</Text>
              <Text style={styles.totalValueEarnings}>{formatCurrency(grossEarnings)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.tableCard}>
            <View style={styles.tableHeaderDeductions}>
              <Text style={styles.tableHeaderText}>DEDUCTIONS</Text>
              <Text style={styles.tableHeaderText}>AMOUNT (₹)</Text>
            </View>
            {deductionsRows.map((row) => (
              <View key={row.label} style={styles.tableRow}>
                <Text style={styles.tableCellLabel}>{row.label}</Text>
                <Text style={styles.tableCellValue}>{formatCurrency(row.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalRowDeductions}>
              <Text style={styles.totalLabelDeductions}>TOTAL DEDUCTIONS</Text>
              <Text style={styles.totalValueDeductions}>{formatCurrency(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* ── Net Pay Banner ── */}
        <View style={styles.netPayCard}>
          <View>
            <Text style={styles.netPayTitle}>NET PAY (Take Home)</Text>
            <Text style={styles.netPayWords}>Amount in Words: {amountInWords}</Text>
          </View>
          <View style={styles.netPayRight}>
            <Text style={styles.rupeeSymbol}>₹</Text>
            <Text style={styles.netPayAmount}>{formatCurrency(netPay)}</Text>
          </View>
        </View>

        {/* ── Footer & Signatory ── */}
        <View style={styles.footerRow}>
          <View style={styles.notesBlock}>
            <Text style={styles.notesHeader}>NOTE :</Text>
            <Text style={styles.notesBullet}>
              • This is a computer-generated document and does not require a signature.
            </Text>
            <Text style={styles.notesBullet}>
              • For any queries, please contact the HR Department.
            </Text>
            <Text style={styles.notesBullet}>
              • Keep this salary slip for your records and reference.
            </Text>
          </View>

          <View style={styles.signatoryBlock}>
            <Text style={styles.signatoryCompany}>{companyName}</Text>
            <View style={styles.signatoryLine} />
            <Text style={styles.signatoryLabel}>Authorized Signatory</Text>
          </View>
        </View>

        {/* ── Bottom Ribbon ── */}
        <View style={styles.bottomRibbon}>
          <Text style={styles.bottomRibbonText}>Thank you for your contribution!</Text>
        </View>
      </Page>
    </Document>
  );
}

// ---------------------------------------------------------------------------
// Export PDF Generator
// ---------------------------------------------------------------------------

export async function generateSalarySlipPdf(
  slip: SalarySlipItem,
  companyInfo?: CompanyPublicInfo,
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <SalarySlipDocument slip={slip} companyInfo={companyInfo} />,
  );
  return Buffer.from(buffer);
}
