import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import api, { BASE_URL } from "@/utils/api";
import { onSocketEvent } from "@/utils/socket";
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Inbox,
  Wifi,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  Reply,
  Copy,
  Trash2,
  Pin,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  Info,
  CornerDownLeft,
  ArrowDown,
  Bell,
  BellOff,
  User,
  Calendar,
  MoreVertical,
  Phone,
  Video,
  Mic,
  Image as ImageIcon,
  FileText,
  AtSign,
  Link2,
  Users,
  Eye,
  Star,
  Flag,
} from "lucide-react";
import Swal from "sweetalert2";

// ==================== CONSTANTS ====================
const POLLING_INTERVAL = 15000; // 15 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000;
const TYPING_TIMEOUT = 2000;
const SCROLL_DEBOUNCE = 150;
const MAX_PINNED_MESSAGES = 5;
const MAX_MESSAGE_LENGTH = 1000;

// ==================== HELPER FUNCTIONS ====================
const getImageUrl = (image) => {
  if (!image) return null;
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  if (image.startsWith("/")) {
    return `${BASE_URL}${image}`;
  }
  return `${BASE_URL}/uploads/${image}`;
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

const formatRelativeTime = (date) => {
  if (!date) return "";
  const now = new Date();
  const msgDate = new Date(date);
  const diffInSeconds = Math.floor((now - msgDate) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return msgDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

// ==================== CUSTOM HOOKS ====================
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// ==================== AVATAR COMPONENT ====================
const UserAvatar = React.memo(
  ({
    image,
    name,
    size = "h-11 w-11",
    className = "",
    status = "online",
    showStatus = true,
  }) => {
    const [imgError, setImgError] = useState(false);
    const imageUrl = getImageUrl(image);
    const initials = getInitials(name);

    const getColorFromName = useCallback((name) => {
      let hash = 0;
      for (let i = 0; i < name?.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "from-brand-500 to-brand-600",
        "from-purple-500 to-purple-600",
        "from-green-500 to-green-600",
        "from-brand-500 to-brand-600",
        "from-pink-500 to-pink-600",
        "from-indigo-500 to-indigo-600",
      ];
      return colors[Math.abs(hash) % colors.length];
    }, []);

    const statusColors = {
      online: "bg-green-500",
      offline: "bg-gray-400",
      away: "bg-yellow-500",
      busy: "bg-red-500",
    };

    return (
      <div className="relative inline-block">
        {!imageUrl || imgError ? (
          <div
            className={`${size} bg-gradient-to-br ${getColorFromName(name)} rounded-xl flex items-center justify-center shadow-sm ${className}`}
          >
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={name || "User"}
            className={`${size} rounded-xl object-cover border-2 border-white shadow-sm ${className}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}
        {showStatus && status && (
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 ${statusColors[status]} border-2 border-white rounded-full`}
          />
        )}
      </div>
    );
  },
);

UserAvatar.displayName = "UserAvatar";

// ==================== MESSAGE BUBBLE COMPONENT ====================
const MessageBubble = React.memo(
  ({
    message,
    isAdmin,
    userImage,
    userName,
    currentUserImage,
    onReply,
    onCopy,
    onDelete,
    onPin,
    isPinned = false,
  }) => {
    const [showActions, setShowActions] = useState(false);
    const time = useMemo(() => {
      return new Date(message.sentAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    }, [message.sentAt]);

    const handleCopy = useCallback(() => {
      navigator.clipboard.writeText(message.text);
      onCopy?.();
      Swal.fire({
        icon: "success",
        title: "Copied!",
        text: "Message copied to clipboard",
        toast: true,
        timer: 1500,
        showConfirmButton: false,
        position: "top-end",
      });
    }, [message.text, onCopy]);

    const handleReplyClick = useCallback(() => {
      onReply?.(message);
    }, [message, onReply]);

    const handlePinClick = useCallback(() => {
      onPin?.(message);
    }, [message, onPin]);

    const handleDeleteClick = useCallback(() => {
      onDelete?.(message);
    }, [message, onDelete]);

    return (
      <div
        className={`flex ${isAdmin ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div
          className={`flex items-end gap-2 max-w-[85%] ${isAdmin ? "flex-row-reverse" : "flex-row"}`}
        >
          {/* Avatar */}
          <div className="flex-shrink-0">
            <UserAvatar
              image={isAdmin ? currentUserImage : userImage}
              name={isAdmin ? "Admin" : userName}
              size="h-8 w-8"
              showStatus={false}
            />
          </div>

          {/* Message Container */}
          <div className="relative group">
            <div
              className={`relative p-3 rounded-2xl text-sm shadow-sm transition-all ${
                isAdmin
                  ? "bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-tr-none"
                  : "bg-white text-gray-700 rounded-tl-none border border-gray-200 hover:shadow-md"
              } ${isPinned ? "border-l-4 border-l-yellow-500" : ""}`}
            >
              {/* Message Text */}
              <p className="break-words whitespace-pre-wrap">{message.text}</p>

              {/* Timestamp and Status */}
              <div
                className={`flex items-center gap-1 mt-1 text-[10px] ${isAdmin ? "text-brand-100" : "text-gray-400"}`}
              >
                <span>{time}</span>
                {isAdmin && (
                  <span className="ml-1">
                    {message.read ? (
                      <CheckCheck size={10} className="text-brand-200" />
                    ) : (
                      <Check size={10} className="text-brand-200" />
                    )}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              {showActions && (
                <div
                  className={`absolute ${isAdmin ? "-left-20" : "-right-20"} top-1/2 -translate-y-1/2 flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1 z-10`}
                >
                  <button
                    onClick={handleReplyClick}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Reply"
                  >
                    <Reply size={14} className="text-gray-600" />
                  </button>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Copy"
                  >
                    <Copy size={14} className="text-gray-600" />
                  </button>
                  {!isAdmin && (
                    <>
                      <button
                        onClick={handlePinClick}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title={isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin
                          size={14}
                          className={
                            isPinned ? "text-yellow-600" : "text-gray-600"
                          }
                        />
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

MessageBubble.displayName = "MessageBubble";

// ==================== BELL ICON COMPONENT ====================
const BellIcon = React.memo(
  ({
    unreadCount,
    isPollingActive,
    newMessageArrived,
    onClick,
  }) => {
    return (
      <button
        id="notification-button"
        onClick={onClick}
        className="relative p-2.5 bg-gray-100 hover:bg-gray-200 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 group"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5 text-gray-600 group-hover:text-gray-800 transition-colors" />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-lg animate-in zoom-in duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {newMessageArrived && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5">
            <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 opacity-75"></span>
          </span>
        )}
      </button>
    );
  },
);

BellIcon.displayName = "BellIcon";

// ==================== MAIN COMPONENT ====================
export default function NotificationDrop() {
  // State Management with localStorage persistence
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState(null);
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [newMessageArrived, setNewMessageArrived] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isOnline] = useState(true);
  const [pinnedMessages, setPinnedMessages] = useLocalStorage(
    "pinned_messages",
    [],
  );
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isChatPollingActive, setIsChatPollingActive] = useState(true);
  const [soundEnabled, setSoundEnabled] = useLocalStorage(
    "notification_sound",
    true,
  );
  const [hasInitialScroll, setHasInitialScroll] = useState(false);

  // Refs
  const pollingRef = useRef(null);
  const chatPollingRef = useRef(null);
  const previousCountRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const replyInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  // 🟢 SCROLL PREVENTION - Prevent body scroll when modal is open
  useEffect(() => {
    if (selectedChat) {
      // Save current scroll position
      const scrollY = window.scrollY;

      // Add styles to prevent body scroll
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        // Restore scroll when modal closes
        const scrollY = document.body.style.top;
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, parseInt(scrollY || "0") * -1);
      };
    }
  }, [selectedChat]);

  // ==================== UTILITY FUNCTIONS ====================
  const cancelPreviousRequests = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current.signal;
  }, []);

  const fetchWithRetry = useCallback(
    async (url, options = {}, retries = MAX_RETRY_ATTEMPTS) => {
      try {
        const signal = cancelPreviousRequests();
        const response = await api.get(url, { ...options, signal });
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
    },
    [cancelPreviousRequests],
  );

  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior, block: "end" });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isNearBottom);

    if (!isNearBottom) {
      setIsUserScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrolling(false);
      }, SCROLL_DEBOUNCE);
    } else {
      setIsUserScrolling(false);
    }
  }, []);

  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audio = new Audio("/notification.mp3");
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio play failed:", e));
    } catch (error) {
      console.log("Audio not supported:", error);
    }
  }, [soundEnabled]);

  // ==================== API CALLS ====================
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.get(`/api/users/me`);

      if (response.data.success && response.data.user) {
        const userData = response.data.user;
        setCurrentUser({
          _id: userData._id,
          name: userData.name || "Admin",
          role: userData.role || "admin",
          email: userData.email,
          image: userData.profileImage || userData.image,
        });
      }
    } catch (err) {
      console.error("Failed to fetch current user", err);
      setCurrentUser({ name: "Admin", role: "admin", image: null });
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get(
        "/api/notifications/admin/unread-count",
      );
      const newCount = res.data.count || 0;

      if (
        previousCountRef.current > 0 &&
        newCount > previousCountRef.current &&
        !selectedChat
      ) {
        setNewMessageArrived(true);
        playNotificationSound();
        setTimeout(() => setNewMessageArrived(false), 5000);
      }

      previousCountRef.current = newCount;
      setUnreadCount(newCount);
    } catch (err) {
      console.error("Unread count fetch failed", err);
    }
  }, [selectedChat, playNotificationSound]);

  const fetchAllConversations = useCallback(
    async (showLoading = true) => {
      if (showLoading) setIsLoading(true);
      setError(null);

      try {
        const res = await fetchWithRetry("/api/notifications/admin/all");
        if (res) {
          setConversations(res.data);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error("Error fetching conversations", err);
        setError("Failed to load conversations. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [fetchWithRetry],
  );

  const fetchChatHistory = useCallback(
    async (userId, preserveScroll = false) => {
      setIsChatLoading(true);
      setError(null);

      try {
        const res = await api.get(
          `/api/notifications/admin/chat/${userId}`,
        );
        const newHistory = res.data;
        const oldMessageCount = chatHistory.length;

        setChatHistory(newHistory);

        if (
          !preserveScroll &&
          !isUserScrolling &&
          newHistory.length > oldMessageCount
        ) {
          setTimeout(() => scrollToBottom("smooth"), 100);
        }

        return newHistory;
      } catch (err) {
        console.error("Error loading chat history", err);
        setError("Failed to load chat history");
        return [];
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatHistory.length, isUserScrolling, scrollToBottom],
  );

  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        await api.patch(
          `/api/notifications/admin/${notificationId}/read`,
        );
        fetchUnreadCount();
      } catch (err) {
        console.error("Error marking as read", err);
      }
    },
    [fetchUnreadCount],
  );

  const sendReply = useCallback(
    async (userId, messageText) => {
      try {
        const res = await api.post(
          `/api/notifications/admin/reply/${userId}`,
          {
            message: messageText,
          },
        );

        const newMessage = {
          text: messageText,
          sender: "admin",
          sentAt: new Date().toISOString(),
          _id: res.data?._id || Date.now(),
          read: false,
        };

        setChatHistory((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (err) {
        throw err;
      }
    },
    [],
  );

  // ==================== POLLING FUNCTIONS ====================
  const startGlobalPolling = useCallback(() => {
    if (!isPollingActive) return;

    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(() => {
      fetchUnreadCount();
      if (isOpen) {
        fetchAllConversations(false);
      }
    }, POLLING_INTERVAL);
  }, [isPollingActive, isOpen, fetchUnreadCount, fetchAllConversations]);

  const startChatPolling = useCallback(() => {
    if (!selectedChat || !isChatPollingActive) return;

    if (chatPollingRef.current) clearInterval(chatPollingRef.current);

    chatPollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(
          `/api/notifications/admin/chat/${selectedChat.userId}`,
        );
        const newHistory = res.data;

        if (newHistory.length > chatHistory.length) {
          setChatHistory(newHistory);
          playNotificationSound();

          Swal.fire({
            icon: "info",
            title: "New Message",
            text: `New message from ${selectedChat.userName}`,
            toast: true,
            timer: 3000,
            showConfirmButton: false,
            position: "top-end",
          });

          if (!isUserScrolling) {
            setTimeout(() => scrollToBottom("smooth"), 100);
          }
        }
      } catch (err) {
        console.error("Error polling chat history", err);
      }
    }, POLLING_INTERVAL);
  }, [
    selectedChat,
    chatHistory.length,
    scrollToBottom,
    isUserScrolling,
    isChatPollingActive,
    playNotificationSound,
  ]);

  const stopChatPolling = useCallback(() => {
    if (chatPollingRef.current) {
      clearInterval(chatPollingRef.current);
      chatPollingRef.current = null;
    }
  }, []);

  const stopGlobalPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ==================== EVENT HANDLERS ====================
  const toggleNotificationDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const newState = !prev;
      if (newState) {
        fetchAllConversations(true);
      }
      return newState;
    });
  }, [fetchAllConversations]);

  const openChat = useCallback(
    async (conversation) => {
      stopChatPolling();

      setIsOpen(false);
      setSelectedChat(conversation);
      setChatHistory([]);
      setShowUserInfo(false);
      setShowScrollButton(false);
      setIsUserScrolling(false);
      setHasInitialScroll(false);

      await fetchChatHistory(conversation.userId, false);

      if (!conversation.isRead) {
        await markAsRead(conversation._id);
        setConversations((prev) =>
          prev.map((c) =>
            c._id === conversation._id ? { ...c, isRead: true } : c,
          ),
        );
      }

      setTimeout(() => {
        scrollToBottom("auto");
        setHasInitialScroll(true);
        if (replyInputRef.current) {
          replyInputRef.current.focus();
        }
        startChatPolling();
      }, 100);
    },
    [
      stopChatPolling,
      fetchChatHistory,
      markAsRead,
      scrollToBottom,
      startChatPolling,
    ],
  );

  const closeChat = useCallback(() => {
    stopChatPolling();
    setSelectedChat(null);
    setChatHistory([]);
    setReplyingTo(null);
    setReply("");
    setIsUserScrolling(false);
    setHasInitialScroll(false);
  }, [stopChatPolling]);

  const handleReply = useCallback(async () => {
    if (!reply.trim() || sendingReply || !selectedChat) return;
    if (reply.trim().length > MAX_MESSAGE_LENGTH) {
      Swal.fire({
        icon: "warning",
        title: "Message too long",
        text: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`,
        toast: true,
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
      });
      return;
    }

    setSendingReply(true);
    const messageText = reply.trim();

    try {
      await sendReply(selectedChat.userId, messageText);
      setReply("");
      setReplyingTo(null);
      setTimeout(() => scrollToBottom("smooth"), 100);
      await fetchAllConversations(false);
    } catch (err) {
      console.error("Error sending reply", err);
      Swal.fire({
        icon: "error",
        title: "Failed to send",
        text: "Could not send your message. Please try again.",
        toast: true,
        timer: 3000,
        showConfirmButton: false,
        position: "top-end",
      });
    } finally {
      setSendingReply(false);
    }
  }, [
    reply,
    sendingReply,
    selectedChat,
    sendReply,
    scrollToBottom,
    fetchAllConversations,
  ]);

  const handleReplyToMessage = useCallback(
    (message) => {
      setReplyingTo(message);
      setReply(`@${selectedChat.userName} `);
      replyInputRef.current?.focus();
    },
    [selectedChat],
  );

  const handleDeleteMessage = useCallback(
    async (message) => {
      const result = await Swal.fire({
        title: "Delete Message?",
        text: "This action cannot be undone.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel",
      });

      if (result.isConfirmed) {
        try {
          await api.delete(
            `/api/notifications/admin/message/${message._id}`,
          );
          setChatHistory((prev) => prev.filter((m) => m._id !== message._id));
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Message has been deleted.",
            toast: true,
            timer: 1500,
            showConfirmButton: false,
            position: "top-end",
          });
        } catch (err) {
          console.error("Error deleting message", err);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to delete message.",
            toast: true,
            timer: 2000,
            showConfirmButton: false,
            position: "top-end",
          });
        }
      }
    },
    [],
  );

  const handlePinMessage = useCallback(
    (message) => {
      setPinnedMessages((prev) => {
        const isPinned = prev.some((m) => m._id === message._id);
        let newPinned;
        if (isPinned) {
          newPinned = prev.filter((m) => m._id !== message._id);
        } else {
          if (prev.length >= MAX_PINNED_MESSAGES) {
            Swal.fire({
              icon: "warning",
              title: "Pin Limit Reached",
              text: `You can only pin up to ${MAX_PINNED_MESSAGES} messages. Unpin one to pin another.`,
              toast: true,
              timer: 3000,
              showConfirmButton: false,
              position: "top-end",
            });
            return prev;
          }
          newPinned = [...prev, message];
        }

        Swal.fire({
          icon: "success",
          title: isPinned ? "Unpinned" : "Pinned",
          text: `Message ${isPinned ? "unpinned" : "pinned"} successfully`,
          toast: true,
          timer: 1500,
          showConfirmButton: false,
          position: "top-end",
        });

        return newPinned;
      });
    },
    [setPinnedMessages],
  );

  const handleTyping = useCallback(() => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(
      () => setTyping(false),
      TYPING_TIMEOUT,
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await api.post("/api/notifications/admin/mark-all-read");
      setConversations((prev) => prev.map((c) => ({ ...c, isRead: true })));
      setUnreadCount(0);
      setNewMessageArrived(false);

      Swal.fire({
        icon: "success",
        title: "Success",
        text: "All messages marked as read",
        toast: true,
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
      });
    } catch (err) {
      console.error("Error marking all as read", err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to mark all as read",
        toast: true,
        timer: 2000,
        showConfirmButton: false,
        position: "top-end",
      });
    }
  }, []);

  const toggleGlobalPolling = useCallback(() => {
    setIsPollingActive((prev) => {
      const newState = !prev;
      if (newState) {
        startGlobalPolling();
        fetchUnreadCount();
      } else {
        stopGlobalPolling();
      }
      return newState;
    });
  }, [startGlobalPolling, fetchUnreadCount, stopGlobalPolling]);

  const toggleChatPolling = useCallback(() => {
    setIsChatPollingActive((prev) => {
      const newState = !prev;
      if (newState && selectedChat) {
        startChatPolling();
      } else {
        stopChatPolling();
      }
      return newState;
    });
  }, [selectedChat, startChatPolling, stopChatPolling]);

  // ==================== EFFECTS ====================
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  useEffect(() => {
    fetchUnreadCount();
    startGlobalPolling();
    return () => {
      stopGlobalPolling();
      stopChatPolling();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchUnreadCount, startGlobalPolling, stopGlobalPolling, stopChatPolling]);

  // Real-time: react instantly to users waiting for a reply
  useEffect(() => {
    return onSocketEvent("chat:unseen-user", ({ userId, userName }) => {
      fetchUnreadCount();
      if (isOpen) fetchAllConversations(false);
      if (selectedChat?.userId === userId) {
        api.get(`/api/notifications/admin/chat/${userId}`)
          .then((res) => setChatHistory(res.data))
          .catch(() => {});
      } else if (userName) {
        console.log("[Chat] New message from", userName);
      }
    });
  }, [fetchUnreadCount, fetchAllConversations, isOpen, selectedChat]);

  useEffect(() => {
    if (isOpen) {
      fetchAllConversations(true);
    }
  }, [isOpen, fetchAllConversations]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    if (chatEndRef.current && !isUserScrolling && hasInitialScroll) {
      scrollToBottom("auto");
    }
  }, [chatHistory, scrollToBottom, isUserScrolling, hasInitialScroll]);

  // ==================== RENDER ====================
  return (
    <div className="relative font-sans text-gray-900">
      {/* Bell Icon Button */}
      <BellIcon
        unreadCount={unreadCount}
        isPollingActive={isPollingActive}
        newMessageArrived={newMessageArrived}
        onClick={toggleNotificationDropdown}
      />

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 mt-3 w-[400px] bg-white shadow-2xl rounded-2xl border border-gray-200 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2"
        >
          {/* Header */}
          <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">Admin Mentions</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {unreadCount === 0
                  ? "No unread messages"
                  : `${unreadCount} unread message${unreadCount !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  toggleGlobalPolling();
                  fetchAllConversations(true);
                }}
                disabled={isLoading}
                className={`p-1.5 rounded-lg transition-colors ${isPollingActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                title={isPollingActive ? "Pause & refresh" : "Resume & refresh"}
              >
                <RefreshCw
                  size={16}
                  className={isPollingActive || isLoading ? "animate-spin" : ""}
                />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-brand-600 hover:text-brand-800 font-medium px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border-b border-red-200">
              <p className="text-xs text-red-600 text-center flex items-center justify-center gap-2">
                <AlertCircle size={12} />
                {error}
              </p>
            </div>
          )}

          {/* Retry Status */}
          {retryCount > 0 && (
            <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
              <p className="text-xs text-yellow-700 text-center">
                Retrying connection... ({retryCount}/{MAX_RETRY_ATTEMPTS})
              </p>
            </div>
          )}

          {/* Conversations List */}
          <div className="max-h-[450px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2
                  className="animate-spin mx-auto mb-3 text-brand-600"
                  size={32}
                />
                <p className="text-sm text-gray-500">
                  Loading conversations...
                </p>
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((chat) => (
                <div
                  key={chat._id}
                  onClick={() => openChat(chat)}
                  className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all duration-200 border-b border-gray-100 ${
                    !chat.isRead ? "bg-blue-50/30" : ""
                  }`}
                >
                  {/* Unread dot */}
                  <div className={`w-2 h-2 min-w-[8px] rounded-full mr-3 flex-shrink-0 ${
                    !chat.isRead ? "bg-[#065fd4]" : "invisible"
                  }`} />

                  {/* Circular profile picture */}
                  <div className="mr-3 flex-shrink-0">
                    <UserAvatar
                      image={chat.userImage}
                      name={chat.userName}
                      size="w-12 h-12"
                      className="rounded-full"
                      showStatus={false}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug line-clamp-2 ${!chat.isRead ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                      <strong className="font-semibold text-gray-900">{chat.userName}</strong>
                      {" "}{chat.message || "No message"}
                    </p>
                    <span className="text-xs text-gray-500 mt-0.5 block">
                      {formatRelativeTime(chat.sentAt)}
                    </span>
                  </div>

                  {/* Menu dots */}
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="ml-2 p-1 rounded-full hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-all text-gray-400 hover:text-gray-600 flex-shrink-0"
                    title="More options"
                  >
                    <span className="text-xl leading-none font-bold tracking-wider">⋮</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-16 text-center flex flex-col items-center gap-3 text-gray-400">
                <Inbox size={48} strokeWidth={1} />
                <p className="text-sm font-medium">No messages</p>
                <p className="text-xs">No admin mentions yet</p>
              </div>
            )}
          </div>

          {/* Footer */}
          {conversations.length > 0 && (
            <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-[10px] text-gray-400">
                {lastUpdated &&
                  `Last updated: ${lastUpdated.toLocaleTimeString()}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Chat Modal - Fixed position, no scroll overlap */}
      {selectedChat && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex-shrink-0 p-4 border-b bg-gradient-to-r from-blue-50 to-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeChat}
                  className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Back"
                >
                  <ChevronLeft size={20} className="text-gray-600" />
                </button>
                <div
                  className="flex items-center gap-3 cursor-pointer group"
                  onClick={() => setShowUserInfo(!showUserInfo)}
                >
                  <UserAvatar
                    image={selectedChat.userImage}
                    name={selectedChat.userName}
                    size="h-12 w-12"
                    status={isOnline ? "online" : "offline"}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 group-hover:text-brand-600 transition-colors">
                        {selectedChat.userName}
                      </h3>
                      {isOnline && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                          Online
                        </span>
                      )}
                      <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full animate-pulse">
                        Live
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      ID: {selectedChat.userId?.slice(-8).toUpperCase()}
                    </p>
                    {typing && (
                      <p className="text-[10px] text-brand-600 animate-pulse">
                        Typing...
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleChatPolling}
                  className={`p-2 rounded-lg transition-colors ${isChatPollingActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-100"}`}
                  title={
                    isChatPollingActive
                      ? "Pause chat updates"
                      : "Resume chat updates"
                  }
                >
                  {isChatPollingActive ? (
                    <Bell size={18} />
                  ) : (
                    <BellOff size={18} />
                  )}
                </button>
                <button
                  onClick={() => setShowUserInfo(!showUserInfo)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="User Info"
                >
                  <Info size={18} className="text-gray-500" />
                </button>
                <button
                  onClick={closeChat}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close chat"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* User Info Sidebar */}
            {showUserInfo && (
              <div className="flex-shrink-0 border-b bg-gray-50 p-4 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-4 mb-4">
                  <UserAvatar
                    image={selectedChat.userImage}
                    name={selectedChat.userName}
                    size="h-16 w-16"
                    status={isOnline ? "online" : "offline"}
                  />
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {selectedChat.userName}
                    </h4>
                    <p className="text-xs text-gray-500">
                      {selectedChat.userEmail || "No email provided"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-[10px] ${isOnline ? "text-green-600" : "text-gray-500"}`}
                      >
                        {isOnline ? "● Online" : "● Offline"}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Member since {new Date().getFullYear()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <MessageSquare size={12} className="text-brand-500" />
                    <span>{chatHistory.length} messages</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
                    <Calendar size={12} className="text-green-500" />
                    <span>Joined recently</span>
                  </div>
                </div>
              </div>
            )}

            {/* Pinned Messages */}
            {pinnedMessages.length > 0 && (
              <div className="flex-shrink-0 border-b bg-yellow-50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Pin size={14} className="text-yellow-600" />
                  <span className="text-xs font-semibold text-yellow-700">
                    Pinned Messages
                  </span>
                </div>
                <div className="space-y-1">
                  {pinnedMessages.slice(0, 2).map((msg) => (
                    <div
                      key={msg._id}
                      className="text-xs text-gray-600 bg-white p-2 rounded-lg"
                    >
                      <p className="truncate">{msg.text}</p>
                    </div>
                  ))}
                  {pinnedMessages.length > 2 && (
                    <p className="text-[10px] text-yellow-600 text-center">
                      +{pinnedMessages.length - 2} more pinned messages
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white"
              style={{ overflowAnchor: "none" }}
            >
              {isChatLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 className="animate-spin" size={32} />
                  <span className="text-xs font-medium">
                    Loading conversation...
                  </span>
                </div>
              ) : chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400">
                  <MessageSquare size={48} strokeWidth={1} />
                  <p className="text-sm font-medium">No messages yet</p>
                  <p className="text-xs">
                    Start the conversation by sending a message
                  </p>
                </div>
              ) : (
                <>
                  {/* Date Separator */}
                  <div className="sticky top-0 z-10 flex justify-center">
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-3 py-1 rounded-full shadow-sm">
                      {new Date(chatHistory[0]?.sentAt).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        },
                      )}
                    </span>
                  </div>

                  {chatHistory.map((msg, i) => (
                    <MessageBubble
                      key={msg._id || i}
                      message={msg}
                      isAdmin={msg.sender === "admin"}
                      userImage={selectedChat.userImage}
                      userName={selectedChat.userName}
                      currentUserImage={currentUser?.image}
                      onReply={handleReplyToMessage}
                      onCopy={() => {}}
                      onDelete={handleDeleteMessage}
                      onPin={handlePinMessage}
                      isPinned={pinnedMessages.some((p) => p._id === msg._id)}
                    />
                  ))}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollButton && (
              <button
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-24 right-8 bg-brand-600 text-white p-2 rounded-full shadow-lg hover:bg-brand-700 transition-all animate-in fade-in zoom-in z-10"
                title="Scroll to bottom"
              >
                <ArrowDown size={20} />
              </button>
            )}

            {/* Reply Indicator */}
            {replyingTo && (
              <div className="flex-shrink-0 px-4 pt-2 pb-1 bg-brand-50 border-t border-brand-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CornerDownLeft size={14} className="text-brand-600" />
                  <span className="text-xs text-gray-600">Replying to:</span>
                  <span className="text-xs text-gray-800 italic max-w-[200px] truncate">
                    {replyingTo.text}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Reply Input */}
            <div className="flex-shrink-0 p-4 border-t bg-white">
              <div className="flex gap-2 items-center">
                {currentUser && (
                  <UserAvatar
                    image={currentUser.image}
                    name={currentUser.name}
                    size="h-9 w-9"
                    showStatus={false}
                  />
                )}
                <div className="flex-1 relative">
                  <textarea
                    ref={replyInputRef}
                    value={reply}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_MESSAGE_LENGTH) {
                        setReply(e.target.value);
                        handleTyping();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleReply();
                      }
                    }}
                    className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all resize-none"
                    placeholder={`Type your message... (max ${MAX_MESSAGE_LENGTH} chars)`}
                    rows={Math.min(reply.split("\n").length, 3)}
                    disabled={isChatLoading || sendingReply}
                  />
                  <div className="absolute right-2 bottom-2 flex gap-1">
                    <button
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Attach file"
                    >
                      <Paperclip size={16} className="text-gray-400" />
                    </button>
                    <button
                      className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Add emoji"
                    >
                      <Smile size={16} className="text-gray-400" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={handleReply}
                  disabled={!reply.trim() || isChatLoading || sendingReply}
                  className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] shadow-sm"
                >
                  {sendingReply ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-1">
                <p className="text-[10px] text-gray-400">
                  {reply.trim() &&
                    `${reply.length}/${MAX_MESSAGE_LENGTH} chars • Shift + Enter for new line`}
                </p>
                <p className="text-[10px] text-gray-400 flex items-center gap-1">
                  {isChatPollingActive ? (
                    <>
                      <Bell size={10} className="text-brand-500 animate-pulse" />
                      Auto-polling active
                    </>
                  ) : (
                    <>
                      <BellOff size={10} className="text-gray-400" />
                      Auto-polling paused
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
