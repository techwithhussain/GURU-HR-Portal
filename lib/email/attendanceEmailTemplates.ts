/**
 * Corporate HTML Email Templates for Attendance Alerts
 * GURU DIGITAL ADVERTISING
 */

interface BaseEmailProps {
  employeeName: string;
  portalUrl?: string;
}

interface LateClockInEmailProps extends BaseEmailProps {
  date: string;
  shiftStartTime: string;
  clockInTime: string;
  lateMinutes: number;
}

interface MissedClockOutEmailProps extends BaseEmailProps {
  date: string;
  shiftEndTime: string;
  clockInTime: string;
}

interface EarlyExitEmailProps extends BaseEmailProps {
  date: string;
  shiftEndTime: string;
  clockOutTime: string;
  earlyMinutes: number;
}

const DEFAULT_PORTAL_URL = "https://mis.gurudigitaladvertising.com";

function getEmailWrapper(title: string, contentHtml: string, portalUrl: string = DEFAULT_PORTAL_URL): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1E293B;
      -webkit-font-smoothing: antialiased;
    }
    .email-container {
      max-width: 580px;
      margin: 30px auto;
      background: #FFFFFF;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(15, 23, 42, 0.08);
      border: 1px solid #E2E8F0;
    }
    .header {
      background-color: #0F172A;
      padding: 24px 32px;
      text-align: left;
      border-bottom: 4px solid #F97316;
    }
    .brand-title {
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .brand-sub {
      color: #F97316;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }
    .content {
      padding: 32px;
    }
    .greeting {
      font-size: 16px;
      font-weight: 600;
      color: #0F172A;
      margin-bottom: 16px;
    }
    .alert-banner {
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
    }
    .alert-late {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      color: #92400E;
    }
    .alert-missed {
      background-color: #FEE2E2;
      border-left: 4px solid #EF4444;
      color: #991B1B;
    }
    .alert-title {
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 4px 0;
    }
    .alert-desc {
      font-size: 13px;
      margin: 0;
      line-height: 1.4;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background-color: #F8FAFC;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #E2E8F0;
    }
    .info-table tr {
      border-bottom: 1px solid #E2E8F0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 12px 16px;
      font-size: 13px;
    }
    .info-table td.label {
      color: #64748B;
      font-weight: 500;
      width: 40%;
    }
    .info-table td.value {
      color: #0F172A;
      font-weight: 700;
      width: 60%;
    }
    .highlight-late {
      color: #D97706;
      font-weight: 800;
    }
    .highlight-missed {
      color: #DC2626;
      font-weight: 800;
    }
    .btn-container {
      text-align: center;
      margin: 28px 0 10px 0;
    }
    .btn {
      display: inline-block;
      background-color: #0F172A;
      color: #FFFFFF !important;
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
      padding: 12px 28px;
      border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .footer {
      background-color: #F8FAFC;
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid #E2E8F0;
      font-size: 11px;
      color: #64748B;
      line-height: 1.5;
    }
    .footer strong {
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="brand-title">GURU</div>
      <div class="brand-sub">DIGITAL ADVERTISING</div>
    </div>
    <div class="content">
      ${contentHtml}
      <div class="btn-container">
        <a href="${portalUrl}" class="btn" target="_blank">Access HR Portal</a>
      </div>
    </div>
    <div class="footer">
      <strong>Guru Digital Advertising</strong><br />
      F361, 2nd Floor, Phase 8B, Industrial Area, Sector 74, Mohali, Punjab-140307<br />
      This is an automated attendance notice. For corrections, please contact HR.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates HTML & Plain text for Late Clock-In
 */
export function renderLateClockInEmail(props: LateClockInEmailProps) {
  const subject = `⚠️ Late Clock-In Notice — ${props.date} (${props.lateMinutes} mins late)`;

  const contentHtml = `
    <div class="greeting">Hi ${props.employeeName},</div>
    <div class="alert-banner alert-late">
      <div class="alert-title">Late Arrival Recorded</div>
      <div class="alert-desc">Your punch-in was recorded after the shift grace time on <strong>${props.date}</strong>.</div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="label">Date</td>
        <td class="value">${props.date}</td>
      </tr>
      <tr>
        <td class="label">Shift Start Time</td>
        <td class="value">${props.shiftStartTime}</td>
      </tr>
      <tr>
        <td class="label">Actual Clock-In</td>
        <td class="value">${props.clockInTime}</td>
      </tr>
      <tr>
        <td class="label">Late Duration</td>
        <td class="value highlight-late">${props.lateMinutes} Minutes Late</td>
      </tr>
      <tr>
        <td class="label">Status</td>
        <td class="value" style="color: #D97706;">LATE</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-top: 16px;">
      Please ensure timely check-ins to maintain shift continuity. If you had prior approval or experienced an unavoidable issue, please submit a support ticket or notify HR.
    </p>
  `;

  const html = getEmailWrapper("Late Clock-In Notice", contentHtml, props.portalUrl);

  const text = `Hi ${props.employeeName},

Late Arrival Notice - ${props.date}

Shift Start Time: ${props.shiftStartTime}
Actual Clock-In: ${props.clockInTime}
Late By: ${props.lateMinutes} Minutes

Please ensure timely arrival. For queries, contact HR.

GURU DIGITAL ADVERTISING HR Department`;

  return { subject, html, text };
}

/**
 * Generates HTML & Plain text for Missed Clock-Out
 */
export function renderMissedClockOutEmail(props: MissedClockOutEmailProps) {
  const subject = `⚠️ Notice: Missed Logout on ${props.date} (Auto-Logged Out)`;

  const contentHtml = `
    <div class="greeting">Hi ${props.employeeName},</div>
    <div class="alert-banner alert-missed">
      <div class="alert-title">Missed Logout — Auto Closed by System</div>
      <div class="alert-desc">You forgot to punch out at the end of your shift on <strong>${props.date}</strong>. The system has automatically recorded your punch-out at your shift end time.</div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="label">Date</td>
        <td class="value">${props.date}</td>
      </tr>
      <tr>
        <td class="label">Shift End Time</td>
        <td class="value">${props.shiftEndTime}</td>
      </tr>
      <tr>
        <td class="label">Clock-In Time</td>
        <td class="value">${props.clockInTime}</td>
      </tr>
      <tr>
        <td class="label">Status</td>
        <td class="value highlight-missed">Auto-Closed by System</td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #475569; line-height: 1.5; margin-top: 16px;">
      Please ensure you punch out daily before leaving office. If you worked overtime or need an adjustment, please apply for attendance correction on the HR portal.
    </p>
  `;

  const html = getEmailWrapper("Missed Logout Notice", contentHtml, props.portalUrl);

  const text = `Hi ${props.employeeName},

Missed Logout Notice - ${props.date}

You forgot to punch out on ${props.date}.
The system has automatically recorded your checkout at shift end (${props.shiftEndTime}).

If you worked overtime or need a time adjustment, please apply for attendance correction on the HR portal.

GURU DIGITAL ADVERTISING HR Department`;

  return { subject, html, text };
}

/**
 * Generates HTML & Plain text for Early Exit
 */
export function renderEarlyExitEmail(props: EarlyExitEmailProps) {
  const subject = `Notice: Early Clock-Out Recorded on ${props.date}`;

  const contentHtml = `
    <div class="greeting">Hi ${props.employeeName},</div>
    <div class="alert-banner alert-late">
      <div class="alert-title">Early Departure Recorded</div>
      <div class="alert-desc">You clocked out <strong>${props.earlyMinutes} minutes</strong> before shift end on <strong>${props.date}</strong>.</div>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="label">Date</td>
        <td class="value">${props.date}</td>
      </tr>
      <tr>
        <td class="label">Shift End Time</td>
        <td class="value">${props.shiftEndTime}</td>
      </tr>
      <tr>
        <td class="label">Actual Clock-Out</td>
        <td class="value">${props.clockOutTime}</td>
      </tr>
      <tr>
        <td class="label">Early By</td>
        <td class="value highlight-late">${props.earlyMinutes} Minutes</td>
      </tr>
    </table>
  `;

  const html = getEmailWrapper("Early Clock-Out Notice", contentHtml, props.portalUrl);

  const text = `Hi ${props.employeeName},

Early Clock-Out Recorded - ${props.date}
Shift End Time: ${props.shiftEndTime}
Actual Clock-Out: ${props.clockOutTime}
Early By: ${props.earlyMinutes} Minutes

GURU DIGITAL ADVERTISING HR Department`;

  return { subject, html, text };
}
