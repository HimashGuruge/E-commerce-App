import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { emitToAdmins } from "../services/socketService.js";
import Question from "../models/Question.js";
import Product from "../models/Product.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const notifyAdminsOfQuestion = async (questionDoc, productName) => {
  try {
    const admins = await User.find({ role: "admin" });
    const messageText = `New question on "${productName}": "${questionDoc.question.substring(0, 80)}"`;
    for (const admin of admins) {
      await Message.create({
        sender: questionDoc.user,
        message: messageText,
        senderType: "user",
        isAdmin: false,
        adminRead: false,
        userRead: true,
      });
    }
  } catch (err) {
    console.error("Failed to notify admins of question:", err);
  }
};

export const askQuestion = asyncHandler(async (req, res) => {
  const { productId, question } = req.body;
  if (!productId || !question?.trim()) {
    res.status(400);
    throw new Error("Product ID and question are required");
  }
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    res.status(400);
    throw new Error("Invalid product ID");
  }

  const product = await Product.findById(productId).select("name seller");
  if (!product) {
    res.status(404);
    throw new Error("Product not found");
  }

  const questionDoc = await Question.create({
    user: req.user._id,
    product: productId,
    question: question.trim(),
  });

  await notifyAdminsOfQuestion(questionDoc, product.name);

  // Real-time: refresh the admin questions page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: questionDoc._id, type: "question" });

  const populated = await Question.findById(questionDoc._id)
    .populate("user", "name profileImage")
    .populate("answers.user", "name profileImage");

  res.status(201).json({ success: true, question: populated });
});

export const getProductQuestions = asyncHandler(async (req, res) => {
  const { productId, page, limit } = req.query;
  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    return res.json({ success: true, questions: [], total: 0, pages: 0 });
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const skip = (pageNum - 1) * limitNum;

  const query = { product: productId, status: "active" };

  const [questions, total] = await Promise.all([
    Question.find(query)
      .populate("user", "name profileImage")
      .populate("answers.user", "name profileImage")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Question.countDocuments(query),
  ]);

  res.json({
    success: true,
    questions,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

export const getAllQuestions = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (status) query.status = status;

  const [questions, total] = await Promise.all([
    Question.find(query)
      .populate("user", "name profileImage email")
      .populate("answers.user", "name profileImage")
      .populate("product", "name images")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Question.countDocuments(query),
  ]);

  res.json({
    success: true,
    questions,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
  });
});

export const answerQuestion = asyncHandler(async (req, res) => {
  const { answer } = req.body;
  if (!answer?.trim()) {
    res.status(400);
    throw new Error("Answer is required");
  }

  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }

  question.answers.push({
    user: req.user._id,
    answer: answer.trim(),
  });
  await question.save();

  const populated = await Question.findById(question._id)
    .populate("user", "name profileImage")
    .populate("answers.user", "name profileImage");

  // Real-time: refresh the admin questions page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: question._id, type: "question" });

  res.json({ success: true, question: populated });
});

export const deleteQuestion = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }

  const isOwner = question.user.toString() === req.user._id.toString();
  const isAdmin = req.user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403);
    throw new Error("Not authorized to delete this question");
  }

  await Question.findByIdAndDelete(req.params.id);

  // Real-time: refresh the admin questions page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: question._id, type: "question" });

  res.json({ success: true, message: "Question deleted" });
});

export const toggleQuestionStatus = asyncHandler(async (req, res) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    res.status(404);
    throw new Error("Question not found");
  }

  question.status = question.status === "active" ? "hidden" : "active";
  await question.save();

  // Real-time: refresh the admin questions page without HTTP polling
  emitToAdmins("admin:stats-changed", { orderId: question._id, type: "question" });

  res.json({ success: true, question });
});
