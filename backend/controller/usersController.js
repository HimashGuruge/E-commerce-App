import asyncHandler from "express-async-handler";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
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
  const { name, lastname, email, phone, address, password, profileImage, role } = req.body;

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
    role: role || "customer",
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
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
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

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.role = req.body.role;
  await user.save();
  res.json({ success: true, user });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  user.status = req.body.status;
  await user.save();
  res.json({ success: true, user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
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
  const updateField = action === "status" ? "status" : "role";
  await User.updateMany({ _id: { $in: userIds } }, { [updateField]: value });
  res.json({ success: true, message: "Bulk action completed" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const resetToken = crypto.randomBytes(20).toString("hex");
  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  const resetUrl = `${appConfig.frontendUrl}/reset-password/${resetToken}`;

  await sendEmail({
    to: user.email,
    subject: "Password Reset",
    html: `<p>Click <a href="${resetUrl}">here</a> to reset your password</p>`,
  });

  res.json({ success: true, message: "Reset email sent" });
});

export const resetPassword = asyncHandler(async (req, res) => {
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

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ success: true, message: "Password reset successful" });
});
