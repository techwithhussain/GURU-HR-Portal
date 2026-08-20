import fs from "node:fs";
import path from "node:path";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToFile,
} from "@react-pdf/renderer";

const colors = {
  primary: "#1E3A8A",      // Deep Corporate Blue
  primaryDark: "#0F172A",  // Slate 900
  accent: "#2563EB",       // Blue 600
  accentLight: "#EFF6FF",  // Blue 50
  danger: "#DC2626",       // Red 600
  dangerLight: "#FEF2F2",  // Red 50
  success: "#16A34A",      // Green 600
  successLight: "#F0FDF4", // Green 50
  border: "#E2E8F0",       // Slate 200
  textMain: "#1E293B",     // Slate 800
  textMuted: "#64748B",    // Slate 500
  cardBg: "#F8FAFC",       // Slate 50
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 9,
    color: colors.textMain,
    backgroundColor: colors.white,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 32,
  },
  // Header
  header: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: 12,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 9,
    color: colors.textMuted,
  },
  badge: {
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
  },
  // Alert Box
  alertBox: {
    backgroundColor: colors.dangerLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger,
    padding: 10,
    borderRadius: 4,
    marginBottom: 14,
  },
  alertTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: colors.danger,
    marginBottom: 2,
  },
  alertText: {
    fontSize: 8.5,
    color: "#7F1D1D",
    lineHeight: 1.3,
  },
  // Section Titles
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.primaryDark,
    marginTop: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 3,
  },
  // Table
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontFamily: "Helvetica-Bold",
    fontSize: 8.5,
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 5.5,
    paddingHorizontal: 8,
    backgroundColor: colors.cardBg,
  },
  tableTotalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: colors.primary,
    paddingVertical: 6.5,
    paddingHorizontal: 8,
    backgroundColor: colors.accentLight,
  },
  tableCell: {
    fontSize: 8.5,
    color: colors.textMain,
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: colors.primaryDark,
  },
  // Grid Cards
  grid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 8,
  },
  cardTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.textMuted,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
  },
  cardSub: {
    fontSize: 7.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  // Highlights Box
  highlightBox: {
    backgroundColor: colors.successLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  highlightText: {
    fontSize: 8.5,
    color: "#14532D",
    lineHeight: 1.3,
  },
  // Steps list
  bulletItem: {
    flexDirection: "row",
    marginBottom: 4,
    paddingLeft: 4,
  },
  bulletDot: {
    width: 12,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    color: colors.textMain,
    lineHeight: 1.25,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 7.5,
    color: colors.textMuted,
  },
});

const CostReportDocument = () => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Database Hosting & Cost Analysis Report</Text>
          <Text style={styles.subtitle}>
            Application: Guru Digital Advertising HR MIS (mis.gurudigitaladvertising.com)
          </Text>
          <Text style={styles.subtitle}>
            Database: Neon Serverless PostgreSQL | Region: AWS Asia Pacific 1 (Singapore)
          </Text>
        </View>
        <View>
          <Text style={styles.badge}>Date: Aug 20, 2026</Text>
        </View>
      </View>

      {/* Incident / Cause Alert */}
      <View style={styles.alertBox}>
        <Text style={styles.alertTitle}>Downtime Cause & Context</Text>
        <Text style={styles.alertText}>
          The portal is experiencing an HTTP 500 error because the database compute allowance has exceeded the Neon Free Tier limit (110.24 CU-hours consumed vs 100 CU-hours quota). To restore live operations and ensure uninterrupted 24/7 access, upgrading to the pay-as-you-go Launch Plan is required.
        </Text>
      </View>

      {/* Current Metrics KPI Grid */}
      <Text style={styles.sectionTitle}>1. Current Resource Usage (Recorded to Date)</Text>
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Compute Consumed</Text>
          <Text style={[styles.cardValue, { color: colors.danger }]}>110.24 CU-hrs</Text>
          <Text style={styles.cardSub}>Free Quota: 100 CU-hrs (Exceeded)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Database Size</Text>
          <Text style={styles.cardValue}>0.04 GB (40 MB)</Text>
          <Text style={styles.cardSub}>Free Allowance: 0.50 GB (8% used)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Network Transfer</Text>
          <Text style={styles.cardValue}>3.33 GB</Text>
          <Text style={styles.cardSub}>Free Allowance: 5.00 GB (66% used)</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Primary Compute</Text>
          <Text style={styles.cardValue}>0.25 CU</Text>
          <Text style={styles.cardSub}>0.25 vCPU / 1 GB RAM (Auto-scale to 2 CU)</Text>
        </View>
      </View>

      {/* Monthly Cost Breakdown Table */}
      <Text style={styles.sectionTitle}>2. Projected 1-Month Cost Estimate (30 Days @ 24/7 Availability)</Text>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, { width: "42%" }]}>Resource / Item</Text>
          <Text style={[styles.tableHeaderCell, { width: "24%" }]}>Estimated Usage</Text>
          <Text style={[styles.tableHeaderCell, { width: "18%" }]}>Unit Rate</Text>
          <Text style={[styles.tableHeaderCell, { width: "16%", textAlign: "right" }]}>Monthly (USD)</Text>
        </View>

        <View style={styles.tableRow}>
          <View style={{ width: "42%" }}>
            <Text style={styles.tableCellBold}>Database Compute (24/7)</Text>
            <Text style={{ fontSize: 7.5, color: colors.textMuted }}>720 hrs @ 0.25 CU minimum baseline</Text>
          </View>
          <Text style={[styles.tableCell, { width: "24%" }]}>~170 - 180 CU-hrs</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>$0.106 / CU-hr</Text>
          <Text style={[styles.tableCellBold, { width: "16%", textAlign: "right" }]}>$18.00 - $19.00</Text>
        </View>

        <View style={styles.tableRowAlt}>
          <View style={{ width: "42%" }}>
            <Text style={styles.tableCellBold}>Database Storage</Text>
            <Text style={{ fontSize: 7.5, color: colors.textMuted }}>Current storage 0.04 GB (Projected ~0.10 GB)</Text>
          </View>
          <Text style={[styles.tableCell, { width: "24%" }]}>~0.10 GB</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>$0.35 / GB-mo</Text>
          <Text style={[styles.tableCell, { width: "16%", textAlign: "right" }]}>$0.04</Text>
        </View>

        <View style={styles.tableRow}>
          <View style={{ width: "42%" }}>
            <Text style={styles.tableCellBold}>Data Transfer (Bandwidth)</Text>
            <Text style={{ fontSize: 7.5, color: colors.textMuted }}>Includes 500 GB free transfer / month</Text>
          </View>
          <Text style={[styles.tableCell, { width: "24%" }]}>~4 - 5 GB</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>Included Free</Text>
          <Text style={[styles.tableCell, { width: "16%", textAlign: "right" }]}>$0.00</Text>
        </View>

        <View style={styles.tableRowAlt}>
          <View style={{ width: "42%" }}>
            <Text style={styles.tableCellBold}>Spike / Traffic Headroom</Text>
            <Text style={{ fontSize: 7.5, color: colors.textMuted }}>Buffer for peak concurrency during check-ins</Text>
          </View>
          <Text style={[styles.tableCell, { width: "24%" }]}>Variable</Text>
          <Text style={[styles.tableCell, { width: "18%" }]}>Pay-as-you-go</Text>
          <Text style={[styles.tableCell, { width: "16%", textAlign: "right" }]}>$1.00 - $1.96</Text>
        </View>

        {/* Total Row */}
        <View style={styles.tableTotalRow}>
          <Text style={[styles.tableCellBold, { width: "42%", color: colors.primary }]}>
            TOTAL ESTIMATED MONTHLY BUDGET
          </Text>
          <Text style={[styles.tableCellBold, { width: "24%", color: colors.primary }]}>Full 30 Days</Text>
          <Text style={[styles.tableCellBold, { width: "18%", color: colors.primary }]}>Launch Plan</Text>
          <Text style={[styles.tableCellBold, { width: "16%", textAlign: "right", color: colors.primary, fontSize: 9.5 }]}>
            $19.00 - $21.00
          </Text>
        </View>
      </View>

      {/* Local Currency Summary Box */}
      <View style={styles.highlightBox}>
        <Text style={[styles.highlightText, { fontFamily: "Helvetica-Bold", marginBottom: 2 }]}>
          Currency Conversion (Budget Estimate):
        </Text>
        <Text style={styles.highlightText}>
          - Estimated Monthly Cost in INR: approx. Rs. 1,550 to Rs. 1,750 per month.
        </Text>
        <Text style={styles.highlightText}>
          - Immediate Cost for Remaining Days of Current Month (Aug 20-31): approx. $1.50 to $2.50 (~Rs. 150 - Rs. 200).
        </Text>
      </View>

      {/* Key Benefits of Upgrade */}
      <Text style={styles.sectionTitle}>3. Key Benefits of Upgrading to Launch Plan</Text>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>*</Text>
        <Text style={styles.bulletText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>100% Zero Data Loss:</Text> All existing employee records, attendance histories, shift assignments, and salary slips remain fully intact.
        </Text>
      </View>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>*</Text>
        <Text style={styles.bulletText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Instant Zero-Downtime Recovery:</Text> System recovers within seconds of activating the card on the Neon dashboard with no code redeployment required.
        </Text>
      </View>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>*</Text>
        <Text style={styles.bulletText}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>Pay-as-you-go Flexibility:</Text> No long-term lock-in contracts; charges adapt dynamically based on actual usage.
        </Text>
      </View>

      {/* Action Plan */}
      <Text style={styles.sectionTitle}>4. Execution Steps</Text>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>1.</Text>
        <Text style={styles.bulletText}>Log in to the Neon Console (console.neon.tech) and open project: Guru digital advertising hr.</Text>
      </View>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>2.</Text>
        <Text style={styles.bulletText}>Click "Upgrade plan" on top banner and select the "Launch" plan.</Text>
      </View>
      <View style={styles.bulletItem}>
        <Text style={styles.bulletDot}>3.</Text>
        <Text style={styles.bulletText}>Enter valid billing payment method to immediately re-enable production database connectivity.</Text>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Guru Digital Advertising - Technical Architecture & Cloud Operations</Text>
        <Text style={styles.footerText}>Confidential - For Internal Use</Text>
      </View>
    </Page>
  </Document>
);

async function generatePdf() {
  const outputPath = path.resolve(process.cwd(), "Neon_Database_Cost_Analysis_Report.pdf");
  console.log("Generating PDF at:", outputPath);
  await renderToFile(<CostReportDocument />, outputPath);
  console.log("PDF generated successfully!");
}

generatePdf().catch((err) => {
  console.error("Error generating PDF:", err);
  process.exit(1);
});
