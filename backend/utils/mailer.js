import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import { googleOAuthConfig } from "../config/env.js";
import SiteConfig from "../models/SiteConfig.js";

const getEmailConfig = async () => {
  const config = await SiteConfig.findOne();
  if (!config) return null;

  if (config.emailProvider === "gmail" && config.gmailRefreshToken) {
    return { provider: "gmail", config };
  }

  if (config.smtpUser && config.smtpPass) {
    return {
      provider: "smtp",
      fromName: config.emailFromName || config.brandName || "Brand",
      fromAddress: config.emailFromAddress || config.smtpUser,
      host: config.smtpHost || "smtp.gmail.com",
      port: config.smtpPort || 587,
      user: config.smtpUser,
      pass: config.smtpPass,
    };
  }

  return null;
};

const createTransporter = async () => {
  const emailCfg = await getEmailConfig();

  if (emailCfg?.provider === "gmail") {
    const c = emailCfg.config;
    const oauth2Client = new OAuth2Client(
      c.gmailClientId || googleOAuthConfig.clientId,
      c.gmailClientSecret || googleOAuthConfig.clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: c.gmailRefreshToken });
    const accessToken = await oauth2Client.getAccessToken();
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: c.gmailEmail || process.env.GOOGLE_EMAIL,
          clientId: c.gmailClientId || googleOAuthConfig.clientId,
          clientSecret: c.gmailClientSecret || googleOAuthConfig.clientSecret,
          refreshToken: c.gmailRefreshToken,
          accessToken: accessToken.token,
        },
      }),
      fromName: c.emailFromName || c.brandName || "Brand",
      fromAddress: c.emailFromAddress || c.gmailEmail || process.env.GOOGLE_EMAIL,
    };
  }

  if (emailCfg?.provider === "smtp") {
    return {
      transporter: nodemailer.createTransport({
        host: emailCfg.host,
        port: emailCfg.port,
        auth: { user: emailCfg.user, pass: emailCfg.pass },
      }),
      fromName: emailCfg.fromName,
      fromAddress: emailCfg.fromAddress,
    };
  }

  if (process.env.GOOGLE_REFRESH_TOKEN) {
    const oauth2Client = new OAuth2Client(
      googleOAuthConfig.clientId,
      googleOAuthConfig.clientSecret,
      "https://developers.google.com/oauthplayground"
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const accessToken = await oauth2Client.getAccessToken();
    return {
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: process.env.GOOGLE_EMAIL,
          clientId: googleOAuthConfig.clientId,
          clientSecret: googleOAuthConfig.clientSecret,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
          accessToken: accessToken.token,
        },
      }),
      fromName: process.env.EMAIL_FROM_NAME || "Brand",
      fromAddress: process.env.GOOGLE_EMAIL,
    };
  }

  return {
    transporter: nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    }),
    fromName: process.env.EMAIL_FROM_NAME || "Brand",
    fromAddress: process.env.EMAIL_USER || process.env.GOOGLE_EMAIL || "noreply@brand.com",
  };
};

export const sendEmail = async ({ to, subject, html }) => {
  const { transporter, fromName, fromAddress } = await createTransporter();
  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to,
    subject,
    html,
  });
};

const brandName = "Brand";

export const sendLoginAlert = async (user, req) => {
  const loginTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Colombo" });
  const method = user.googleId ? "Google OAuth" : "Email/Password";
  const ip = req.ip || req.headers["x-forwarded-for"] || "Unknown";
  const device = req.headers["user-agent"] || "Unknown";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f85606, #f37021); padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Login Detected</h1>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 30px; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151;">Hi ${user.name || user.email.split("@")[0]},</p>
        <p style="font-size: 16px; color: #374151;">We detected a new login to your <strong>${brandName}</strong> account. Please review the details below:</p>
        <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <table style="width: 100%; font-size: 14px; color: #374151;">
            <tr><td style="padding: 8px 0;"><strong>Time:</strong></td><td>${loginTime}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Method:</strong></td><td>${method}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>Device:</strong></td><td style="word-break: break-all;">${device}</td></tr>
            <tr><td style="padding: 8px 0;"><strong>IP Address:</strong></td><td>${ip}</td></tr>
          </table>
        </div>
        <div style="background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #166534; font-size: 14px;"><strong>If this was you</strong> — no action needed.</p>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>If this wasn't you</strong> — please secure your account immediately by changing your password.</p>
        </div>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;"/>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">You received this email because login alerts are enabled for your account.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: user.email, subject: `New login to your ${brandName} account`, html });
};
