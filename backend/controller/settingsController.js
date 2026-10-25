import asyncHandler from "express-async-handler";
import SiteConfig from "../models/SiteConfig.js";
import { sendEmail } from "../utils/mailer.js";
import { emitToAll } from "../services/socketService.js";

const getFirstConfig = async () => {
  let config = await SiteConfig.findOne();
  if (!config) {
    config = await SiteConfig.create({});
  }
  return config;
};

export const getPublicSettings = asyncHandler(async (req, res) => {
  const config = await getFirstConfig();
  res.json({
    success: true,
    settings: {
      brandName: config.brandName,
      iconLetter: config.iconLetter,
      logo: config.logo,
      primaryColor: config.primaryColor,
      chatWidgetColor: config.chatWidgetColor,
      fontFamily: config.fontFamily,
      fontUrl: config.fontUrl,
      tagline: config.tagline,
      footerCompanyName: config.footerCompanyName,
      footerSupportEmail: config.footerSupportEmail,
      footerDescription: config.footerDescription,
      footerAddress: config.footerAddress,
      footerPhone: config.footerPhone,
      footerBg: config.footerBg,
      footerTextColor: config.footerTextColor,
      footerHeadingColor: config.footerHeadingColor,
      footerLinkHoverColor: config.footerLinkHoverColor,
      footerFontSize: config.footerFontSize,
      footerFontFamily: config.footerFontFamily,
      footerLogo: config.footerLogo,
      socialEnabled: config.socialEnabled,
      metaTitle: config.metaTitle,
      metaDescription: config.metaDescription,
      shipping: config.shipping,
      returnPolicy: config.returnPolicy,
      announcement: config.announcement,
      newsletter: config.newsletter,
      appPromo: config.appPromo,
      sellerDefaults: config.sellerDefaults,
    },
  });
});

export const getSettings = asyncHandler(async (req, res) => {
  const config = await getFirstConfig();
  res.json({ success: true, settings: config });
});

export const updateSettings = asyncHandler(async (req, res) => {
  let config = await getFirstConfig();
  const allowed = [
    "brandName", "iconLetter", "logo", "primaryColor", "chatWidgetColor", "fontFamily", "fontUrl", "tagline",
    "footerCompanyName", "footerSupportEmail", "footerDescription", "footerAddress", "footerPhone",
    "footerBg", "footerTextColor", "footerHeadingColor", "footerLinkHoverColor", "footerFontSize", "footerFontFamily", "footerLogo",
    "socialEnabled",
    "metaTitle", "metaDescription", "social",
    "emailFromName", "emailFromAddress", "emailProvider", "smtpHost", "smtpPort", "smtpUser", "smtpPass",
    "gmailEmail", "gmailClientId", "gmailClientSecret", "gmailRefreshToken",
    "navbarBg", "navbarText", "navbarBorder", "topbarBg", "topbarText", "shipping", "returnPolicy", "announcement", "newsletter", "appPromo", "sellerDefaults",
  ];
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      // Merge sub-objects instead of replacing them, so partial saves from
      // different admin pages don't wipe sibling fields (e.g. the new
      // announcement background fields vs the old bar fields).
      if (typeof req.body[field] === "object" && req.body[field] !== null && !Array.isArray(req.body[field])) {
        const target = config[field] && typeof config[field] === "object" ? config[field] : {};
        Object.keys(req.body[field]).forEach((key) => {
          if (typeof req.body[field][key] === "object" && req.body[field][key] !== null && !Array.isArray(req.body[field][key])) {
            const nested = target[key] && typeof target[key] === "object" ? target[key] : {};
            Object.assign(nested, req.body[field][key]);
            target[key] = nested;
          } else {
            target[key] = req.body[field][key];
          }
        });
        config[field] = target;
      } else {
        config[field] = req.body[field];
      }
    }
  });
  if (req.body.social && typeof req.body.social === "object") {
    Object.keys(req.body.social).forEach((key) => {
      if (config.social[key] !== undefined) {
        config.social[key] = req.body.social[key];
      }
    });
  }
  await config.save();
  // Real-time: tell all clients the theme changed so they can refetch public settings
  emitToAll("settings:updated", {});
  res.json({ success: true, settings: config, message: "Settings updated successfully" });
});

export const testEmail = asyncHandler(async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ success: false, message: "Recipient email required" });
  await sendEmail({
    to,
    subject: "Test Email from Your Site",
    html: `<div style="font-family:sans-serif;padding:20px;text-align:center"><h2 style="color:#10b981">✅ Email works!</h2><p>Your SMTP configuration is correct.</p></div>`,
  });
  res.json({ success: true, message: "Test email sent successfully" });
});
