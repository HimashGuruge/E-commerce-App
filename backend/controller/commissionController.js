import asyncHandler from "express-async-handler";
import {
  getSellerCommissionBalance,
  submitCommissionPayment,
  getSellerCommissionPayments,
  getSellerProofUrl,
  cancelCommissionPayment,
  adminGetCommissionPayments,
  adminGetProofUrl,
  adminVerifyCommissionPayment,
  adminRejectCommissionPayment,
} from "../services/commissionService.js";

// @desc    Seller: my commission balance (seller_pays mode)
// @route   GET /api/sellers/commission/balance
export const getSellerCommissionBalanceC = asyncHandler(async (req, res) => {
  const balance = await getSellerCommissionBalance(req.user._id);
  res.json({ success: true, balance });
});

// @desc    Seller: my commission payment submissions
// @route   GET /api/sellers/commission/payments
export const getSellerCommissionPaymentsC = asyncHandler(async (req, res) => {
  const payments = await getSellerCommissionPayments(req.user._id);
  res.json({ success: true, payments });
});

// @desc    Seller: submit a commission payment for a period (multipart, field "proof")
// @route   POST /api/sellers/commission/payments
export const submitCommissionPaymentC = asyncHandler(async (req, res) => {
  const { periodFrom, periodTo, paidAmount, paymentMethod, paymentRef, paidAt, note } = req.body;
  const payment = await submitCommissionPayment(
    req.user._id,
    { periodFrom, periodTo, paidAmount, paymentMethod, paymentRef, paidAt, note },
    req.file
  );
  res.status(201).json({ success: true, payment });
});

// @desc    Seller: short-lived signed URL for MY OWN proof
// @route   GET /api/sellers/commission/my-proof/:paymentId
export const getSellerProofUrlC = asyncHandler(async (req, res) => {
  const proof = await getSellerProofUrl(req.params.paymentId, req.user._id);
  res.json({ success: true, proof });
});

// @desc    Seller: cancel my own PENDING submission (deletes the proof)
// @route   DELETE /api/sellers/commission/payments/:paymentId
export const cancelCommissionPaymentC = asyncHandler(async (req, res) => {
  const payment = await cancelCommissionPayment(req.params.paymentId, req.user._id);
  res.json({ success: true, payment });
});

// @desc    Admin: list commission payments (optional ?status= & ?seller=)
// @route   GET /api/sellers/admin/commission/payments
export const adminGetCommissionPaymentsC = asyncHandler(async (req, res) => {
  const { status, seller } = req.query;
  const payments = await adminGetCommissionPayments({ status, seller });
  res.json({ success: true, payments });
});

// @desc    Admin: short-lived signed URL for a payment's proof
// @route   GET /api/sellers/admin/commission/proof/:paymentId
export const adminGetProofUrlC = asyncHandler(async (req, res) => {
  const proof = await adminGetProofUrl(req.params.paymentId);
  res.json({ success: true, proof });
});

// @desc    Admin: verify a pending commission payment
// @route   POST /api/sellers/admin/commission/payments/:paymentId/verify
export const adminVerifyCommissionPaymentC = asyncHandler(async (req, res) => {
  const { note } = req.body || {};
  const payment = await adminVerifyCommissionPayment(req.params.paymentId, req.user, note);
  res.json({ success: true, payment });
});

// @desc    Admin: reject a pending commission payment (reason required)
// @route   POST /api/sellers/admin/commission/payments/:paymentId/reject
export const adminRejectCommissionPaymentC = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const payment = await adminRejectCommissionPayment(req.params.paymentId, req.user, reason);
  res.json({ success: true, payment });
});
