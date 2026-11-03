import nodemailer from "nodemailer";

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  verified: boolean;
}

// In-memory store for OTPs: email (lowercase) -> OtpRecord attached to globalThis for Next.js App Router route sharing
const globalForOtp = globalThis as unknown as {
  profileOtpMap?: Map<string, OtpRecord>;
  profileOtpCleanupTimer?: NodeJS.Timeout;
};

export const otpMap =
  globalForOtp.profileOtpMap || new Map<string, OtpRecord>();

if (!globalForOtp.profileOtpMap) {
  globalForOtp.profileOtpMap = otpMap;

  // Clean up expired records every 10 minutes
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [email, record] of otpMap.entries()) {
      if (now > record.expiresAt + 10 * 60 * 1000) {
        otpMap.delete(email);
      }
    }
  }, 10 * 60 * 1000);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }

  globalForOtp.profileOtpCleanupTimer = cleanupTimer;
}

const getMailTransporter = () => {
  const host = process.env.SMTP_HOST || "192.167.5.51";
  const port = Number(process.env.SMTP_PORT) || 1025;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASSWORD || "";
  const secure = process.env.SMTP_SECURE === "true";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send a 6-digit OTP code to the specified email address
 */
export const sendProfileEmailOtp = async (
  email: string,
  locale = "th"
): Promise<{ success: boolean; message: string; cooldownSeconds?: number }> => {
  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cleanEmail || !emailRegex.test(cleanEmail)) {
    return {
      success: false,
      message: locale === "th" ? "รูปแบบอีเมลไม่ถูกต้อง" : "Invalid email format",
    };
  }

  const now = Date.now();
  const existing = otpMap.get(cleanEmail);

  // Rate-limit: 60 seconds cooldown between send requests
  if (existing && now - existing.lastSentAt < 60000) {
    const remainingSeconds = Math.ceil((60000 - (now - existing.lastSentAt)) / 1000);
    return {
      success: false,
      message:
        locale === "th"
          ? `กรุณารออีก ${remainingSeconds} วินาที ก่อนขอรหัสใหม่`
          : `Please wait ${remainingSeconds} seconds before requesting a new code`,
      cooldownSeconds: remainingSeconds,
    };
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 5 * 60 * 1000; // 5 minutes validity

  otpMap.set(cleanEmail, {
    code: otp,
    expiresAt,
    attempts: 0,
    lastSentAt: now,
    verified: false,
  });

  const isThai = locale.startsWith("th");
  const subject = isThai
    ? `[LES Platform] รหัสสำหรับยืนยันอีเมลของคุณคือ ${otp}`
    : `[LES Platform] Your email verification code is ${otp}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="${isThai ? "th" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LES Platform OTP</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #f1f5f9; font-family: 'Kanit', Arial, sans-serif;">
  <div style="font-family: 'Kanit', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 28px 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h2 style="color: #0284c7; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">LES Platform</h2>
      <p style="color: #64748b; font-size: 13px; margin: 6px 0 0 0;">Lighting and Equipment Public Company Limited</p>
    </div>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px 20px; text-align: center; border: 1px dashed #cbd5e1; margin-bottom: 20px;">
      <p style="font-size: 14px; color: #475569; margin: 0 0 14px 0; font-weight: 500;">
        ${isThai ? "รหัสสำหรับยืนยันอีเมลของคุณ (OTP):" : "Your email verification code (OTP):"}
      </p>
      <div style="font-size: 34px; font-weight: 700; letter-spacing: 8px; color: #0284c7; font-family: monospace; line-height: 1.2;">
        ${otp}
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin: 14px 0 0 0;">
        ${isThai ? "* รหัสนี้มีอายุการใช้งาน 300 วินาที" : "* This code is valid for 300 seconds"}
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0; text-align: center;">
      ${isThai ? "หากคุณไม่ได้เป็นผู้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้" : "If you did not request this code, please ignore this email."}
    </p>
    
    <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
      &copy; 2026 Lighting and Equipment PCL. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const transporter = getMailTransporter();
    const fromAddress = process.env.SMTP_FROM || '"LES Platform" <keycloak@example.local>';
    await transporter.sendMail({
      from: fromAddress,
      to: cleanEmail,
      subject,
      html: htmlContent,
      text: isThai
        ? `[LES Platform] รหัสสำหรับยืนยันอีเมล (OTP): ${otp}\nรหัสนี้มีอายุการใช้งาน 300 วินาที\nหากคุณไม่ได้เป็นผู้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้`
        : `[LES Platform] Your email verification code (OTP): ${otp}\nThis code will expire in 300 seconds.\nIf you did not request this code, please ignore this email.`,
    });

    return {
      success: true,
      message:
        locale === "th"
          ? "ส่งรหัสยืนยันไปยังอีเมลเรียบร้อยแล้ว"
          : "Verification code sent to your email",
    };
  } catch (err) {
    console.error("[Email OTP Service] Failed to send email:", err);
    return {
      success: false,
      message:
        locale === "th"
          ? "ไม่สามารถส่งอีเมลได้ กรุณาตรวจสอบอีเมลหรือลองใหม่อีกครั้ง"
          : "Failed to send email. Please check your address or try again.",
    };
  }
};

/**
 * Verify a 6-digit OTP code for the specified email
 */
export const verifyProfileEmailOtp = (
  email: string,
  inputCode: string,
  locale = "th"
): { success: boolean; verified: boolean; message: string } => {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();

  const record = otpMap.get(cleanEmail);
  const isThai = locale.startsWith("th");

  if (!record) {
    return {
      success: false,
      verified: false,
      message:
        isThai
          ? "ยังไม่มีการขอรหัส OTP สำหรับอีเมลนี้ หรือรหัสหมดอายุแล้ว"
          : "No OTP requested for this email or code has expired",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpMap.delete(cleanEmail);
    return {
      success: false,
      verified: false,
      message: isThai ? "รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่" : "OTP code has expired. Please request a new one",
    };
  }

  if (record.attempts >= 5) {
    otpMap.delete(cleanEmail);
    return {
      success: false,
      verified: false,
      message:
        isThai
          ? "คุณกรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณากดขอรหัสใหม่"
          : "Too many incorrect attempts. Please request a new code",
    };
  }

  if (record.code !== cleanCode) {
    record.attempts += 1;
    return {
      success: false,
      verified: false,
      message:
        isThai
          ? `รหัส OTP ไม่ถูกต้อง (เหลือโอกาสอีก ${5 - record.attempts} ครั้ง)`
          : `Incorrect OTP code (${5 - record.attempts} attempts remaining)`,
    };
  }

  // Verification successful!
  record.verified = true;
  // Keep verified status valid for 15 minutes to complete form submission
  record.expiresAt = Date.now() + 15 * 60 * 1000;

  return {
    success: true,
    verified: true,
    message: isThai ? "ยืนยันอีเมลสำเร็จเรียบร้อยแล้ว" : "Email verified successfully",
  };
};

/**
 * Check if the email is currently verified
 */
export const isProfileEmailVerified = (email: string): boolean => {
  const cleanEmail = email.trim().toLowerCase();
  const record = otpMap.get(cleanEmail);
  if (!record) return false;
  return record.verified && Date.now() <= record.expiresAt;
};
