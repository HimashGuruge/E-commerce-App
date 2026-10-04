import api from "@/utils/api";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import {
  MessageSquare,
  CheckCircle,
  RefreshCw,
  UserCircle,
  Filter,
  Bell,
  Clock,
  Users,
  Search,
  X,
  Menu,
  ChevronDown,
} from "lucide-react";

const POLLING_INTERVAL = 15000;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;

const formatRelativeTime = (date) => {
  if (!date) return "";

  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now - msgDate) / 1000);

  if (diffInSeconds < 60) return "Just now";

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const getInitials = (name) => {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Body lock utility functions
const lockBodyScroll = () => {
  const scrollY = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = "100%";
  document.body.style.overflowY = "scroll";
  document.body.dataset.scrollY = scrollY;
};

const unlockBodyScroll = () => {
  const scrollY = document.body.dataset.scrollY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.width = "";
  document.body.style.overflowY = "";
  if (scrollY) {
    window.scrollTo(0, parseInt(scrollY));
  }
  delete document.body.dataset.scrollY;
};

export default function Notification() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [newMessageArrived, setNewMessageArrived] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userDetails, setUserDetails] = useState({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const pollingRef = useRef(null);
  const previousCountRef = useRef(0);
  const abortControllerRef = useRef(null);
  const swalRef = useRef(null);

  // Remove custom axiosInstance - use centralized api client instead

  const cancelPreviousRequests = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  };

  const fetchWithRetry = async (
    url,
    options = {},
    retries = MAX_RETRY_ATTEMPTS,
  ) => {
    try {
      const signal = cancelPreviousRequests();
      const response = await api.get(url, {
        ...options,
        signal,
      });
      setRetryCount(0);
      setError(null);
      return response;
    } catch (err) {
      if (!err || err.name === "CanceledError" || err.name === "AbortError") {
        return null;
      }
      if (retries > 0) {
        setRetryCount(MAX_RETRY_ATTEMPTS - retries + 1);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return fetchWithRetry(url, options, retries - 1);
      }
      throw err;
    }
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await api.get(
          `/api/users/me`
        );

        if (response.data.success && response.data.user) {
          const userData = response.data.user;
          setCurrentUser({
            _id: userData._id,
            name: userData.name || "Admin",
            role: userData.role || "admin",
            email: userData.email,
              image: userData.profileImage || userData.image,
          });
          setIsLoadingUser(false);
          return;
        }
      } catch {
        try {
          const base64Url = token.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(window.atob(base64));
          setCurrentUser({
            _id: payload.id || payload.userId,
            name: payload.name || "Admin",
            role: payload.role || "admin",
          });
        } catch {
          // Silent fail
        }
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const fetchAllUserDetails = useCallback(async (notificationsList) => {
    if (!notificationsList?.length) return;

    setIsLoadingDetails(true);
    const userDetailsMap = {};

    notificationsList.forEach((notification) => {
      const userId = notification.userId;
      if (userId && !userDetailsMap[userId]) {
        userDetailsMap[userId] = {
          _id: userId,
          name: notification.userName || "Unknown User",
          image: notification.userImage || null,
          email: notification.userEmail,
        };
      }
    });

    setUserDetails((prev) => ({ ...prev, ...userDetailsMap }));
    setIsLoadingDetails(false);
  }, []);

  const groupNotifications = useCallback((data) => {
    if (!Array.isArray(data)) return [];

    const grouped = data.reduce((acc, current) => {
      const userId = current.userId;
      if (!userId) return acc;

      const currentDate = new Date(current.sentAt || current.createdAt);
      const existingDate = acc[userId]
        ? new Date(acc[userId].sentAt || acc[userId].createdAt)
        : null;

      if (!acc[userId] || currentDate > existingDate) {
        acc[userId] = current;
      }
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.sentAt || a.createdAt);
      const dateB = new Date(b.sentAt || b.createdAt);
      return dateB - dateA;
    });
  }, []);

  const fetchNotifications = useCallback(
    async (showLoading = false) => {
      if (showLoading) setIsLoading(true);
      setRefreshing(true);
      setError(null);

      try {
        const response = await fetchWithRetry("/api/notifications/admin/all");
        if (!response) return;

        const { data } = response;

        let notificationsArray = [];
        if (Array.isArray(data)) {
          notificationsArray = data;
        } else if (data?.data && Array.isArray(data.data)) {
          notificationsArray = data.data;
        } else if (data?.notifications && Array.isArray(data.notifications)) {
          notificationsArray = data.notifications;
        }

        const validNotifications = notificationsArray.filter((n) => n.userId);
        const uniqueUsers = groupNotifications(validNotifications);

        if (
          previousCountRef.current > 0 &&
          uniqueUsers.length > previousCountRef.current
        ) {
          setNewMessageArrived(true);
          setTimeout(() => setNewMessageArrived(false), 5000);
        }

        previousCountRef.current = uniqueUsers.length;
        setNotifications(uniqueUsers);
        await fetchAllUserDetails(uniqueUsers);
        setLastUpdated(new Date());
      } catch {
        setError("Failed to load notifications. Please try again.");
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAllUserDetails, groupNotifications],
  );

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchNotifications(true);

    if (isPollingActive) {
      pollingRef.current = setInterval(
        () => fetchNotifications(false),
        POLLING_INTERVAL,
      );
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchNotifications, isPollingActive]);

  const togglePolling = () => setIsPollingActive((prev) => !prev);
  const handleManualRefresh = () => fetchNotifications(false);

  const markAsRead = async (userId) => {
    try {
      await api.patch(
        `/api/notifications/admin/mark-read/${userId}`
      );

      setNotifications((prev) =>
        prev.map((n) => (n.userId === userId ? { ...n, isRead: true } : n)),
      );
    } catch {
      setError("Failed to mark as read");
    }
  };

  const renderBubble = (msg, userImage) => {
    const senderType = msg.senderType || (msg.isAdmin ? (msg.isBot ? "bot" : "admin") : "user");
    const isUser = senderType === "user";
    const time = new Date(msg.sentAt || msg.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const msgText = msg.message || msg.text || "";
    const msgImage = msg.imageUrl || null;
    const avatarSize = 28;
    const avatarUrl = userImage || null;
    const adminAccent = "#2563eb";
    const brandColor = "var(--color-brand-500, #F85606)";
    const bubbleBg = isUser ? "#f1f5f9" : (senderType === "admin" ? adminAccent : brandColor);
    const bubbleText = isUser ? "#334155" : "#ffffff";
    const label = senderType === "bot" ? "AI Assistant" : "Support";

    return `
      <div style="display: flex; flex-direction: column; align-items: ${isUser ? "flex-start" : "flex-end"}; margin-bottom: 20px; animation: fadeIn 0.3s ease;">
        ${msgImage ? `<img src="${msgImage}" style="max-width: 200px; max-height: 200px; object-fit: cover; border-radius: 12px; margin-bottom: 6px; cursor: pointer;" onclick="window.open('${msgImage}', '_blank')" referrerPolicy="no-referrer" />` : ""}
        <div style="display: flex; align-items: flex-end; gap: 8px; flex-direction: ${isUser ? "row" : "row-reverse"};">
          ${!isUser ? `
            <div style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; background: ${bubbleBg}; border: 2px solid white; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              ${senderType === "admin" ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`}
            </div>
          ` : avatarUrl ? `<img src="${avatarUrl}" onerror="this.style.display='none'" style="width: ${avatarSize}px; height: ${avatarSize}px; border-radius: 50%; object-fit: cover; flex-shrink: 0;" />` : ""}
          <div style="max-width: 85%; padding: 12px 16px; border-radius: ${isUser ? "18px 18px 18px 4px" : "18px 18px 4px 18px"}; background: ${bubbleBg}; color: ${bubbleText}; font-size: 0.95rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            ${!isUser ? `<div style="font-size: 0.65rem; font-weight: 600; margin-bottom: 4px; opacity: 0.8;">${label}</div>` : ""}
            ${msgText}
          </div>
        </div>
        <span style="font-size: 0.7rem; color: #94a3b8; margin-top: 6px; padding: 0 4px;">
          ${time}
        </span>
      </div>
    `;
  };

  const openChatModal = async (notification) => {
    if (!notification.isRead) markAsRead(notification.userId);

    // Lock body scroll when modal opens
    lockBodyScroll();
    setIsModalOpen(true);

    try {
        const { data } = await api.get(
          `/api/notifications/admin/chat/${notification.userId}`
        );

      const chatHistory = Array.isArray(data)
        ? data
        : data?.data || data?.chats || [];
      const userImage =
        userDetails[notification.userId]?.image || notification.userImage;

      swalRef.current = await Swal.fire({
        html: `
          <style>
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .chat-container {
              display: flex;
              flex-direction: column;
              height: 550px;
              text-align: left;
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            }
            @media (max-width: 640px) {
              .chat-container {
                height: 85vh;
              }
            }
            .chat-header {
              padding: 16px;
              border-bottom: 1px solid #f1f5f9;
              display: flex;
              align-items: center;
              gap: 12px;
              background: white;
            }
            .chat-messages {
              flex: 1;
              overflow-y: auto;
              padding: 16px;
              background: #fafafa;
              scroll-behavior: smooth;
            }
            .chat-input-container {
              padding: 12px;
              border-top: 1px solid #f1f5f9;
              background: white;
            }
            .chat-input-wrapper {
              display: flex;
              align-items: center;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 4px 12px;
              transition: all 0.2s;
            }
            .chat-input {
              flex: 1;
              border: none;
              background: transparent;
              outline: none;
              padding: 10px 5px;
              font-size: 0.95rem;
            }
            .chat-send-btn {
              background: var(--color-brand-500, #F85606);
              color: white;
              border: none;
              width: 35px;
              height: 35px;
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s;
            }
            .chat-send-btn:hover {
              filter: brightness(0.9);
              transform: scale(1.05);
            }
            .chat-img-btn {
              background: transparent;
              border: none;
              width: 35px;
              height: 35px;
              border-radius: 8px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #94a3b8;
              transition: all 0.2s;
              flex-shrink: 0;
            }
            .chat-img-btn:hover {
              background: #f1f5f9;
              color: #64748b;
            }
            .online-indicator {
              width: 8px;
              height: 8px;
              background: #22c55e;
              border-radius: 50%;
              display: inline-block;
              margin-right: 5px;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0% { opacity: 1; }
              50% { opacity: 0.5; }
              100% { opacity: 1; }
            }
          </style>
          <div class="chat-container">
            <div class="chat-header">
              <img src="${userImage || "https://ui-avatars.com/api/?name=" + (notification.userName || "User")}"
                    onerror="this.onerror=null;this.src='https://ui-avatars.com/api/?name=${notification.userName || "User"}&background=F85606&color=fff&size=80'"
                    style="width: 40px; height: 40px; border-radius: 12px; object-fit: cover; border: 2px solid #e2e8f0;">
              <div style="flex: 1;">
                <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #1e293b;">${notification.userName || "User"}</h4>
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                   <span class="online-indicator"></span>
                   <span style="font-size: 0.7rem; color: #64748b;">Online</span>
                </div>
              </div>
            </div>
            <div id="chat-box" class="chat-messages">
              ${chatHistory.map((msg) => renderBubble(msg, userImage)).join("")}
            </div>
            <div class="chat-input-container">
              <div class="chat-input-wrapper">
                <input id="inline-input" type="text" placeholder="Type your message..." class="chat-input">
                <button id="inline-img-btn" class="chat-img-btn" title="Send image">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </button>
                <input id="inline-img-input" type="file" accept="image/*" style="display:none">
                <button id="inline-send-btn" class="chat-send-btn">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: window.innerWidth < 640 ? "95%" : "480px",
        padding: "0",
        customClass: {
          popup: "rounded-2xl shadow-2xl overflow-hidden",
          closeButton: "swal2-close-custom",
        },
        didOpen: () => {
          const chatBox = document.getElementById("chat-box");
          const input = document.getElementById("inline-input");
          const btn = document.getElementById("inline-send-btn");
          const imgInput = document.getElementById("inline-img-input");
          const imgBtn = document.getElementById("inline-img-btn");

          // Additional scroll lock for Swal
          document.body.style.overflow = "hidden";

          setTimeout(() => {
            if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
          }, 100);

          if (input) input.focus();

          const sendMessage = async () => {
            const message = input.value.trim();
            if ((!message && !pendingImageRef.current) || btn.disabled) return;

            btn.disabled = true;
            const originalText = btn.innerHTML;
            btn.innerHTML =
              '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';

            let imageUrl = pendingImageRef.current || null;
            pendingImageRef.current = null;

            try {
              const payload = { message };
              if (imageUrl) payload.imageUrl = imageUrl;
              await api.post(
                `/api/notifications/admin/reply/${notification.userId}`,
                payload
              );

              if (chatBox) {
                chatBox.insertAdjacentHTML(
                  "beforeend",
                  renderBubble({
                    sender: "admin",
                    text: message || "",
                    sentAt: new Date(),
                    senderType: "admin",
                    isAdmin: true,
                    imageUrl: imageUrl || undefined,
                  }, userImage),
                );
              }

              input.value = "";
              if (chatBox) {
                chatBox.scrollTo({
                  top: chatBox.scrollHeight,
                  behavior: "smooth",
                });
              }

              fetchNotifications(false);
            } catch {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to send message. Please try again.",
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: "top-end",
              });
            } finally {
              btn.disabled = false;
              btn.innerHTML = originalText;
              input.focus();
            }
          };

          const pendingImageRef = { current: null };

          imgBtn.onclick = () => imgInput && imgInput.click();
          imgInput.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            const origHtml = imgBtn.innerHTML;
            imgBtn.disabled = true;
            imgBtn.innerHTML =
              '<div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>';

            try {
              const uploadedUrl = await uploadToMedia(file, "misc");
              if (!uploadedUrl) throw new Error("Upload failed");

              pendingImageRef.current = uploadedUrl;

              if (chatBox) {
                chatBox.insertAdjacentHTML(
                  "beforeend",
                  renderBubble({
                    sender: "admin",
                    text: "📷 Image selected — press send to deliver",
                    sentAt: new Date(),
                    senderType: "admin",
                    isAdmin: true,
                    imageUrl: uploadedUrl,
                  }, userImage),
                );
                chatBox.scrollTo({
                  top: chatBox.scrollHeight,
                  behavior: "smooth",
                });
              }
            } catch {
              Swal.fire({
                icon: "error",
                title: "Error",
                text: "Failed to upload image. Please try again.",
                timer: 2000,
                showConfirmButton: false,
                toast: true,
                position: "top-end",
              });
            } finally {
              imgBtn.disabled = false;
              imgBtn.innerHTML = origHtml;
              imgInput.value = "";
            }
          };

          btn.onclick = sendMessage;
          input.onkeydown = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          };
        },
        willClose: () => {
          // Unlock body scroll when modal closes
          unlockBodyScroll();
          setIsModalOpen(false);
          document.body.style.overflow = "";
        },
      });
    } catch {
      // Unlock body scroll on error
      unlockBodyScroll();
      setIsModalOpen(false);
      document.body.style.overflow = "";

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load chat history.",
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post(
        `/api/notifications/admin/mark-all-read`
      );

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "All messages marked as read",
        timer: 1500,
        showConfirmButton: false,
        toast: true,
        position: "top-end",
      });

      fetchNotifications(false);
    } catch {
      setError("Failed to mark all as read");
    }
  };

  const filteredNotifications = useMemo(() => {
    if (!Array.isArray(notifications)) return [];

    return notifications.filter((n) => {
      if (!n) return false;

      if (activeFilter === "unread" && n.isRead) return false;
      if (activeFilter === "archived" && !n.isRead) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          n.userName?.toLowerCase().includes(term) ||
          n.message?.toLowerCase().includes(term) ||
          n.userId?.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [notifications, activeFilter, searchTerm]);

  const filterCounts = useMemo(
    () => ({
      all: notifications?.length || 0,
      unread: notifications?.filter((n) => !n.isRead).length || 0,
      archived: notifications?.filter((n) => n.isRead).length || 0,
    }),
    [notifications],
  );

  const getUserDisplayInfo = () => {
    if (!currentUser) return { name: "Admin", role: "Administrator" };
    return {
      name: currentUser.name || "Admin",
      role: currentUser.role || "Administrator",
      email: currentUser.email,
      image: currentUser.image || currentUser.profileImage,
    };
  };

  const userInfo = getUserDisplayInfo();

  const getUserImage = useCallback(
    (notification) => {
      if (!notification?.userId) return null;
      const details = userDetails[notification.userId];
      return details?.image || notification.userImage || null;
    },
    [userDetails],
  );

  const handleSearch = debounce((value) => {
    setSearchTerm(value);
  }, 300);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 pb-20 lg:pb-6 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header Section - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-500 to-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
                Customer Inquiries
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 ${isPollingActive ? "bg-green-500 animate-pulse" : "bg-gray-400"} rounded-full`}
                  />
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500">
                    {isPollingActive ? "Live updates" : "Updates paused"}
                  </span>
                </div>
                {lastUpdated && (
                  <span className="text-[8px] sm:text-[10px] text-slate-400 bg-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-sm">
                    <Clock size={8} className="inline mr-1" />
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
                {newMessageArrived && (
                  <span className="flex items-center gap-1 text-[8px] sm:text-[10px] bg-green-100 text-green-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full animate-bounce shadow-sm">
                    <Bell size={8} /> New message!
                  </span>
                )}
                {retryCount > 0 && (
                  <span className="text-[8px] sm:text-[10px] bg-yellow-100 text-yellow-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full">
                    Retrying... ({retryCount}/{MAX_RETRY_ATTEMPTS})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons - Responsive */}
          <div className="flex items-center gap-2 flex-wrap">
            {!isLoadingUser && currentUser && (
              <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
                  {userInfo.image ? (
                    <img
                      src={userInfo.image}
                      alt={userInfo.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  )}
                </div>
                <div className="hidden sm:flex flex-col">
                  <span className="text-xs font-bold text-slate-800">
                    {userInfo.name}
                  </span>
                  <span className="text-[8px] text-indigo-600 font-medium bg-indigo-50 px-1 py-0.5 rounded-full">
                    {userInfo.role}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                togglePolling();
                handleManualRefresh();
              }}
              disabled={refreshing}
              className={`p-2 sm:p-2.5 rounded-xl transition-all relative group ${
                isPollingActive
                  ? "bg-green-50 text-green-600 hover:bg-green-100"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100"
              }`}
              title={
                isPollingActive ? "Pause & refresh" : "Resume & refresh"
              }
            >
              <RefreshCw
                className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-600 ${isPollingActive || refreshing ? "animate-spin" : ""}`}
              />
            </button>

            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:from-indigo-600 hover:to-indigo-700 transition-all flex items-center gap-1 sm:gap-2 shadow-md hover:shadow-lg"
            >
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Mark All Read</span>
              <span className="sm:hidden">All Read</span>
            </button>
          </div>
        </div>

        {/* Search and Filters - Responsive */}
        <div className="mb-4 sm:mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, message, or ID..."
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-8 sm:pr-10 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full md:hidden px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 flex items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3" /> Filters
            </div>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>

          {/* Filter Buttons - Desktop & Mobile */}
          <div
            className={`flex flex-wrap gap-2 ${showFilters ? "flex" : "hidden md:flex"}`}
          >
            {[
              { key: "all", label: "All", icon: <Users className="w-3 h-3" /> },
              {
                key: "unread",
                label: "Unread",
                icon: <Bell className="w-3 h-3" />,
              },
              {
                key: "archived",
                label: "Archived",
                icon: <CheckCircle className="w-3 h-3" />,
              },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[10px] sm:text-xs font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  activeFilter === key
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
                }`}
              >
                {icon}
                {label} ({filterCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs sm:text-sm flex items-center gap-2">
            <span className="w-1 h-1 bg-red-600 rounded-full" />
            <span className="flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        {/* Table Container - Responsive */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="overflow-x-auto">
            {/* Desktop Table View */}
            <table className="min-w-full text-left border-collapse hidden md:table">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Latest Message
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    Received
                  </th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="py-16 sm:py-20">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-xs sm:text-sm text-slate-400">
                          Loading conversations...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : filteredNotifications.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-16 sm:py-20">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300" />
                        <span className="text-xs sm:text-sm text-slate-400">
                          No conversations found
                        </span>
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm("")}
                            className="text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-700"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredNotifications.map((n) => {
                    if (!n?.userId) return null;

                    const userImage = getUserImage(n);
                    const initials = getInitials(n.userName);

                    return (
                      <tr
                        key={n.userId}
                        className={`group hover:bg-slate-50 transition-all cursor-pointer ${!n.isRead ? "bg-indigo-50/30" : ""}`}
                        onClick={() => openChatModal(n)}
                      >
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div
                              className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden transition-all ${
                                !n.isRead
                                  ? "ring-2 ring-indigo-500 ring-offset-2"
                                  : "bg-slate-100 group-hover:shadow-md"
                              }`}
                            >
                              {isLoadingDetails && !userDetails[n.userId] ? (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200">
                                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : userImage ? (
                                <img
                                  src={userImage}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                  alt={n.userName || "User"}
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                    const parent = e.target.parentElement;
                                    if (parent) {
                                      const fallbackDiv =
                                        document.createElement("div");
                                      fallbackDiv.className =
                                        "w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 font-bold text-base sm:text-lg";
                                      fallbackDiv.textContent = initials;
                                      parent.appendChild(fallbackDiv);
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 font-bold text-base sm:text-lg">
                                  {initials}
                                </div>
                              )}
                              {!n.isRead && (
                                <span className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-600 border-2 border-white rounded-full" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 sm:gap-2">
                                {n.userName || "Unknown User"}
                                {!n.isRead && (
                                  <span className="text-[7px] sm:text-[8px] bg-indigo-100 text-indigo-600 px-1 py-0.5 rounded-full font-medium">
                                    NEW
                                  </span>
                                )}
                              </span>
                              <span className="text-[8px] sm:text-[9px] font-mono text-slate-400">
                                ID:{" "}
                                {n.userId
                                  ? n.userId.slice(-8).toUpperCase()
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5">
                          <p
                            className={`text-xs sm:text-sm max-w-[200px] sm:max-w-[300px] truncate ${!n.isRead ? "text-slate-900 font-semibold" : "text-slate-500"}`}
                          >
                            {n.message || n.text || "No message"}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-center">
                          <div className="flex flex-col">
                            <span className="text-[11px] sm:text-xs font-bold text-slate-700">
                              {formatRelativeTime(n.sentAt || n.createdAt)}
                            </span>
                          <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium">
                            {new Date(n.sentAt || n.createdAt || 1704067200000).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openChatModal(n);
                            }}
                            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all transform hover:scale-105 ${
                              !n.isRead
                                ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:from-indigo-700 hover:to-indigo-800 shadow-md"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            OPEN CHAT
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-3">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <span className="text-xs text-slate-400 mt-3">
                    Loading conversations...
                  </span>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageSquare className="w-10 h-10 text-slate-300" />
                  <span className="text-xs text-slate-400 mt-2">
                    No conversations found
                  </span>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="text-xs text-indigo-600 mt-2"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  if (!n?.userId) return null;
                  const userImage = getUserImage(n);
                  const initials = getInitials(n.userName);

                  return (
                    <div
                      key={n.userId}
                      onClick={() => openChatModal(n)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        !n.isRead
                          ? "bg-indigo-50/30 border-indigo-200"
                          : "bg-white border-slate-200 hover:border-indigo-200"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                          {userImage ? (
                            <img
                              src={userImage}
                              className="w-full h-full object-cover"
                              alt={n.userName || "User"}
                              onError={(e) => {
                                e.target.style.display = "none";
                                const parent = e.target.parentElement;
                                if (parent) {
                                  const fallbackDiv =
                                    document.createElement("div");
                                  fallbackDiv.className =
                                    "w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 font-bold text-base";
                                  fallbackDiv.textContent = initials;
                                  parent.appendChild(fallbackDiv);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-100 to-indigo-200 text-indigo-600 font-bold text-base">
                              {initials}
                            </div>
                          )}
                          {!n.isRead && (
                            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-indigo-600 border-2 border-white rounded-full" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="font-bold text-sm text-slate-800 truncate">
                              {n.userName || "Unknown User"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {formatRelativeTime(n.sentAt || n.createdAt)}
                            </span>
                          </div>
                          <p
                            className={`text-xs ${!n.isRead ? "text-slate-800 font-medium" : "text-slate-500"} line-clamp-2`}
                          >
                            {n.message || n.text || "No message"}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[9px] text-slate-400 font-mono">
                              ID:{" "}
                              {n.userId
                                ? n.userId.slice(-8).toUpperCase()
                                : "N/A"}
                            </span>
                            {!n.isRead && (
                              <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                                NEW
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openChatModal(n);
                        }}
                        className={`mt-3 w-full py-2 rounded-lg text-xs font-bold transition-all ${
                          !n.isRead
                            ? "bg-indigo-600 text-white hover:bg-indigo-700"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        OPEN CHAT
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          {!isLoading && filteredNotifications.length > 0 && (
            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-100 text-[10px] sm:text-xs text-slate-500 flex justify-between items-center flex-wrap gap-2">
              <span>
                Showing {filteredNotifications.length} of{" "}
                {notifications?.length || 0} conversations
              </span>
              <span className="flex items-center gap-1.5 sm:gap-2">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-600 rounded-full" />
                {filterCounts.unread} unread
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Add line-clamp utility */}
      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
