import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Seller from "../models/Seller.js";
import crypto from "crypto";
import { googleOAuthConfig, appConfig } from "../config/env.js";
import { sendEmail, sendLoginAlert } from "../utils/mailer.js";
import logger from "../utils/logger.js";

const generateToken = (user) => {
  return jwt.sign({ id: user._id, role: user.role }, appConfig.jwtSecret, { expiresIn: "30d" });
};

export const Loginuser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400);
    throw new Error("Please enter a valid email address");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user || !user.password) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid credentials");
  }

  if (user.status !== "active") {
    res.status(403);
    throw new Error("Account is not active");
  }

  res.json({
    success: true,
    token: generateToken(user),
    role: user.role,
    message: "Login successful",
  });

  // Send login alert email (non-blocking)
  sendLoginAlert(user, req).catch((err) => logger.error("Login alert email failed:", err.message));
});

export const handleGoogleAuth = asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  const { authUrl, tokenUrl, userInfoUrl, redirectUri, clientId, clientSecret, scopes } = googleOAuthConfig;

  // Initiate: no code param, redirect to Google
  if (!code && !error) {
    const url = `${authUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(" "))}&access_type=offline&prompt=consent`;
    return res.redirect(url);
  }

  // Callback: handle error or code
  if (error) {
    return res.redirect(`${appConfig.frontendUrl}/login?error=google_${error}`);
  }

  if (!code) {
    return res.redirect(`${appConfig.frontendUrl}/login?error=auth_failed`);
  }

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.redirect(`${appConfig.frontendUrl}/login?error=invalid_token`);
    }

    const userInfoRes = await fetch(userInfoUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const payload = await userInfoRes.json();

    if (!payload.email) {
      return res.redirect(`${appConfig.frontendUrl}/login?error=auth_failed`);
    }

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        profileImage: payload.picture,
        googleId: payload.id,
      });
    } else {
      if (payload.picture) user.profileImage = payload.picture;
      if (payload.id) user.googleId = payload.id;
      await user.save();
    }

const token = generateToken(user);

    // Send login alert email (non-blocking) BEFORE redirect
    sendLoginAlert(user, req).catch((err) => logger.error("Login alert email failed:", err.message));

    res.redirect(
      `${appConfig.frontendUrl}/login?token=${encodeURIComponent(token)}&role=${user.role}`
    );
  } catch (err) {
    logger.error("Google OAuth error:", err);
    res.redirect(`${appConfig.frontendUrl}/login?error=auth_failed`);
  }
});

export const createNewUser = asyncHandler(async (req, res) => {
  // Public signup: only these fields are accepted. Any submitted `role`,
  // `isMainAdmin` or other privileged fields are intentionally ignored.
  const { name, lastname, email, phone, address, password, profileImage } = req.body;

  if (!name?.trim()) {
    res.status(400);
    throw new Error("First name is required");
  }
  if (!email?.trim()) {
    res.status(400);
    throw new Error("Email is required");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400);
    throw new Error("Please enter a valid email address");
  }
  if (!password || password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const userExists = await User.findOne({ email: email.toLowerCase() });
  if (userExists) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const user = await User.create({
    name: name.trim(),
    lastname: lastname?.trim() || "",
    email: email.toLowerCase().trim(),
    phone: phone?.trim() || "",
    address: address?.trim() || "",
    password,
    profileImage: profileImage || "",
    // Public registration always creates a customer account.
    role: "customer",
  });
  res.status(201).json({
    success: true,
    token: generateToken(user),
    role: user.role,
    message: "User created successfully",
  });
});

export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, users });
});

export const getCurrentUserHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

export const getUserByIdHandler = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json({ success: true, user });
});

export const updateUserInfo = asyncHandler(async (req, res) => {
  // PUT /me updates the caller; PUT /:userId updates that user (admin only)
  const targetId = req.params.userId ? req.params.userId : req.user._id;
  const user = await User.findById(targetId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  if (user._id.toString() !== req.user._id.toString()) {
    if (req.user.role !== "admin") {
      res.status(403);
      throw new Error("Not authorized as admin");
    }
    // Admins cannot update another admin through this endpoint
    if (user.role === "admin") {
      if (user.isMainAdmin) {
        res.status(403);
        throw new Error("Main Admin account is protected");
      }
      res.status(403);
      throw new Error("Cannot modify another admin account");
    }
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.phone = req.body.phone || user.phone;
  user.profileImage = req.body.profileImage || user.profileImage;

  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();
  res.json({
    success: true,
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profileImage: updatedUser.profileImage,
      phone: updatedUser.phone,
    },
  });
});

// Keep the Seller document in sync when an admin changes a user's role.
// A seller demoted to customer/admin gets a suspended Seller doc so
// seller-only routes stop working, and a user set to seller gets (or
// restores) a Seller doc that goes through the normal approval flow.
async function syncSellerDocForRoleChange(prevRole, user, nextRole) {
  if (nextRole === "seller") {
    const existing = await Seller.findOne({ user: user._id });
    if (!existing) {
      await Seller.create({
        user: user._id,
        shopName: `${user.name}'s Store`,
        ownerName: user.name,
        // ownerPhone is required on the Seller model; the seller can fill in
        // real contact details later from Seller Settings.
        ownerPhone: user.phone || "Not provided",
        status: "pending",
      });
      return true;
    }
    // A seller that was approved before (and later demoted) is re-enabled;
    // docs that never went through the approval flow stay pending.
    if (existing.status !== "approved" && existing.approvedAt) {
      existing.status = "approved";
      await existing.save();
      return true;
    }
    return false;
  }

  if (prevRole === "seller" && nextRole !== "seller") {
    const existing = await Seller.findOne({ user: user._id });
    if (existing && existing.status !== "suspended") {
      existing.status = "suspended";
      await existing.save();
      return true;
    }
  }
  return false;
}

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const nextRole = req.body.role;
  if (!["customer", "seller", "admin"].includes(nextRole)) {
    res.status(400);
    throw new Error("Invalid role");
  }
  // The acting admin can never change their own role.
  if (user._id.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error("Cannot change your own role");
  }
  // The Main Admin account is protected from any role change.
  if (user.isMainAdmin) {
    res.status(403);
    throw new Error("Main Admin account is protected");
  }
  const prevRole = user.role;
  user.role = nextRole;
  await user.save();
  const sellerSynced = await syncSellerDocForRoleChange(prevRole, user, nextRole);
  res.json({
    success: true,
    user,
    message: `Role updated to ${nextRole}${sellerSynced ? " (seller record synced)" : ""}`,
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  const nextStatus = req.body.status;
  if (!["active", "inactive", "suspended"].includes(nextStatus)) {
    res.status(400);
    throw new Error("Invalid status");
  }
  if (user.isMainAdmin) {
    res.status(403);
    throw new Error("Main Admin account is protected");
  }
  if (user.role === "admin") {
    res.status(403);
    throw new Error("Cannot change status of admin accounts");
  }
  user.status = nextStatus;
  await user.save();
  res.json({ success: true, user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  // The acting admin, other admin accounts, and the Main Admin can
  // never be deleted.
  if (user.isMainAdmin || user.role === "admin" || user._id.toString() === req.user._id.toString()) {
    res.status(403);
    throw new Error(user.isMainAdmin ? "Main Admin account is protected" : "Cannot delete this user");
  }
  await user.deleteOne();
  res.json({ success: true, message: "User deleted" });
});

export const getUserStats = asyncHandler(async (req, res) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ status: "active" });
  const adminUsers = await User.countDocuments({ role: "admin" });
  res.json({
    success: true,
    stats: { totalUsers, activeUsers, adminUsers },
  });
});

export const bulkUserActions = asyncHandler(async (req, res) => {
  const { userIds, action, value } = req.body;
  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error("No users selected");
  }
  // Never touch the acting admin, other admin accounts, or the Main
  // Admin in bulk operations
  const baseFilter = {
    _id: { $in: userIds, $ne: req.user._id },
    role: { $ne: "admin" },
    isMainAdmin: { $ne: true },
  };

  if (action === "delete") {
    const result = await User.deleteMany(baseFilter);
    return res.json({ success: true, message: `Deleted ${result.deletedCount} user(s)` });
  }

  if (action !== "status" && action !== "role") {
    res.status(400);
    throw new Error("Invalid action or value");
  }
  const validValues =
    action === "status" ? ["active", "inactive", "suspended"] : ["customer", "seller", "admin"];
  if (!validValues.includes(value)) {
    res.status(400);
    throw new Error("Invalid action or value");
  }

  const result = await User.updateMany(baseFilter, { [action]: value });
  res.json({ success: true, message: `Updated ${result.modifiedCount} user(s)` });
});

// The caller is always identified from the verified JWT (req.user), never
// from the request body, so a user can only change their own password.
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    res.status(400);
    throw new Error("Current password, new password, and confirm password are required");
  }
  if (newPassword.length < 6) {
    res.status(400);
    throw new Error("New password must be at least 6 characters");
  }
  if (newPassword !== confirmPassword) {
    res.status(400);
    throw new Error("New password and confirm password do not match");
  }

  // authMiddleware loads the user with .select("-password"), so re-fetch it
  // in full to verify the current password and to write the new hash.
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Google-only accounts have no local password to verify or replace.
  if (!user.password) {
    res.status(400);
    throw new Error(
      "This account uses Google sign-in and has no password to change"
    );
  }

  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) {
    res.status(400);
    throw new Error("Current password is incorrect");
  }
  if (currentPassword === newPassword) {
    res.status(400);
    throw new Error("New password must be different from the current password");
  }

  user.password = newPassword; // pre-save hook hashes once (bcrypt, 10 rounds)
  await user.save();

  res.json({ success: true, message: "Password changed successfully" });
});

// Generic, enumeration-safe response for every outcome (unknown email,
// Google-only account, SMTP failure alike) so a caller cannot learn whether
// an address is registered. The token is always saved when it applies, so
// a later retry within the window still works even if this attempt's email
// delivery failed.
const FORGOT_PASSWORD_MESSAGE =
  "If this email address is registered, a password reset link has been sent to it.";

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string" || !email.trim()) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.trim() });

  // Unknown email or a Google-only account (no local password to reset):
  // do nothing, but answer identically to the success path.
  if (user) {
    let resetToken = null;
    if (user.password) {
      resetToken = crypto.randomBytes(20).toString("hex");
      user.resetPasswordToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");
      const resetPasswordExpire = Date.now() + 10 * 60 * 1000;
      user.resetPasswordExpire = resetPasswordExpire;
      await user.save();

      const resetUrl = `${appConfig.frontendUrl}/reset-password/${resetToken}?expires=${resetPasswordExpire}`;

      try {
        await sendEmail({
          to: user.email,
          subject: "Password Reset",
          html: `<p>Hi ${user.name || user.email.split("@")[0]},</p>
            <p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 10 minutes.</p>
            <p>If you did not request this, you can safely ignore this email.</p>`,
        });
      } catch (err) {
        // Never expose SMTP details or tokens; the saved token still allows
        // a retry once email delivery is configured.
        logger.error("Password reset email failed:", err.message);
      }
    }
  }

  res.json({ success: true, message: FORGOT_PASSWORD_MESSAGE });
});

const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  const checks = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[!@#$%^&*(),.?":{}|<>]/.test(password),
  ];
  return checks.filter(Boolean).length >= 3;
};

export const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!isStrongPassword(password)) {
    res.status(400);
    throw new Error(
      "Password must be at least 8 characters and include at least 3 of: uppercase, lowercase, number, special character"
    );
  }

  // Reused, unknown, or expired tokens all fail the lookup and get the
  // same error (the token is cleared on first successful use).
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  // Defensive: forgot-password never issues tokens to Google-only accounts,
  // but fail clearly if one somehow exists.
  if (!user.password) {
    res.status(400);
    throw new Error("This account uses Google sign-in and has no local password");
  }

  user.password = password; // pre-save hook hashes once (bcrypt, 10 rounds)
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});
