import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  ArrowRight,
  Bot,
  Mic,
  UserCheck,
  Languages,
} from "lucide-react";
import { useSearchParams, useLocation } from "react-router-dom";

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [orderInfo, setOrderInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [autoMessage, setAutoMessage] = useState("");

  useEffect(() => {
    // Get all URL parameters
    const orderId = searchParams.get("order");
    const orderStatus = searchParams.get("status");
    const userEmail = searchParams.get("email");
    const userName = searchParams.get("name");
    const productId = searchParams.get("product");

    console.log("🔍 URL Parameters Received:");
    console.log("  - Order ID:", orderId);
    console.log("  - Order Status:", orderStatus);
    console.log("  - User Email:", userEmail);
    console.log("  - User Name:", userName);
    console.log("  - Product ID:", productId);
    console.log("  - Full URL:", location.search);

    // Store order information
    if (orderId || orderStatus) {
      setOrderInfo({
        orderId: orderId,
        status: orderStatus,
        productId: productId,
      });
    }

    // Store user information
    if (userEmail || userName) {
      setUserInfo({
        email: userEmail,
        name: userName,
      });
    }

    // Create auto message if order info exists
    if (orderId) {
      let message = `Hello! I need assistance with my order #${orderId}.`;
      if (orderStatus) {
        message += ` The current status is "${orderStatus}".`;
      }
      message += ` Can you please help me?`;
      setAutoMessage(message);

      // Auto-trigger chat with order details after 1 second
      setTimeout(() => {
        handleOpenChatWithMessage(message);
      }, 1500);
    } else if (productId) {
      let message = `Hello! I have a question about product ID: ${productId}. Can you help me?`;
      setAutoMessage(message);
      setTimeout(() => {
        handleOpenChatWithMessage(message);
      }, 1500);
    }
  }, [searchParams, location]);

  const handleOpenChatWithMessage = (message) => {
    const event = new CustomEvent("trigger-chatbot-message", {
      detail: {
        message: message,
        orderInfo: orderInfo,
        userInfo: userInfo,
      },
    });
    window.dispatchEvent(event);
  };

  const handleOpenChat = () => {
    let message = "Hello! I need some assistance. Can you help me?";

    // If we have order info, include it in the message
    if (orderInfo?.orderId) {
      message = `Hello! I need assistance with my order #${orderInfo.orderId}.`;
      if (orderInfo.status) {
        message += ` The current status is "${orderInfo.status}".`;
      }
      message += ` Can you please help me?`;
    } else if (userInfo?.name) {
      message = `Hello! I'm ${userInfo.name}. I need some assistance. Can you help me?`;
    }

    handleOpenChatWithMessage(message);
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] py-20 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Main Header */}
        <div className="text-center mb-16">
          <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <MessageSquare size={40} />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter mb-4">
            NEED HELP?
          </h1>
          <p className="text-slate-500 font-medium max-w-lg mx-auto mb-10 leading-relaxed">
            Our AI assistant is ready to help you instantly. Read the guidelines
            below to get started.
          </p>

          {/* Order Info Card - Shows if coming from email */}
          {(orderInfo?.orderId || userInfo?.name) && (
            <div className="max-w-md mx-auto mb-8 bg-brand-50 border border-brand-200 rounded-2xl p-4 text-left">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={20} className="text-brand-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-900 mb-1">
                    We've detected you came from an order email
                  </p>
                  {orderInfo?.orderId && (
                    <p className="text-xs text-brand-700 mb-1">
                      Order #:{" "}
                      <span className="font-mono font-bold">
                        {orderInfo.orderId}
                      </span>
                      {orderInfo.status && (
                        <span> • Status: {orderInfo.status}</span>
                      )}
                    </p>
                  )}
                  {userInfo?.name && (
                    <p className="text-xs text-brand-700">
                      Welcome back,{" "}
                      <span className="font-semibold">{userInfo.name}</span>!
                    </p>
                  )}
                  <p className="text-xs text-brand-600 mt-2">
                    Your order details will be automatically sent to our support
                    team.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleOpenChat}
            className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.1em] hover:bg-brand-600 transition-all duration-300 flex items-center justify-center gap-3 mx-auto"
          >
            Chat with AI Assistant <ArrowRight size={18} />
          </button>
        </div>

        {/* Guidelines Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GuideCard
            icon={<Languages size={24} />}
            title="Language Support"
            desc="Toggle between Sinhala (සිංහල) and English using the buttons in the chat header."
          />
          <GuideCard
            icon={<Bot size={24} />}
            title="AI Assistant"
            desc="Ask general queries about products, returns, or orders for instant AI-powered answers."
          />
          <GuideCard
            icon={<Mic size={24} />}
            title="Voice Support"
            desc="Click the microphone (🎤) icon to speak your questions instead of typing."
          />
          <GuideCard
            icon={<UserCheck size={24} />}
            title="Admin Support"
            desc="Type '@admin' at the start of your message to escalate your query to a human agent."
          />
        </div>
      </div>
    </div>
  );
}

function GuideCard({ icon, title, desc }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all text-center">
      <div className="text-brand-600 mb-4 flex justify-center">{icon}</div>
      <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  );
}
