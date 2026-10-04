import asyncHandler from "express-async-handler";
import Address from "../models/Address.js";

export const getUserAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ user: req.user._id });
  res.json({ success: true, addresses });
});

export const getAddressById = asyncHandler(async (req, res) => {
  const address = await Address.findOne({
    _id: req.params.addressId,
    user: req.user._id,
  });
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }
  res.json({ success: true, address });
});

export const addAddress = asyncHandler(async (req, res) => {
  if (req.body.isDefault) {
    await Address.updateMany(
      { user: req.user._id },
      { $set: { isDefault: false } }
    );
  }
  const address = await Address.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, address });
});

export const updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndUpdate(
    { _id: req.params.addressId, user: req.user._id },
    req.body,
    { new: true }
  );
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }
  res.json({ success: true, address });
});

export const deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOneAndDelete({
    _id: req.params.addressId,
    user: req.user._id,
  });
  if (!address) {
    res.status(404);
    throw new Error("Address not found");
  }
  res.json({ success: true, message: "Address deleted" });
});
