import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import api from "@/utils/api";
import Swal from "sweetalert2";
import uploadToMedia from "@/components/utils/Mediaupload.jsx";
import { Bot, MessageCircle, Send, User, X } from "lucide-react";

// Helper to compute animation duration based on user preference
const getAnimationDuration = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    const matches =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return matches ? "duration-0" : "duration-300";
  }
  return "duration-300";
};

/* =====================
     WhatsApp-Style Message Bubble Component
===================== */
const MessageBubble = React.memo(({ msg, userProfilePic }) => {
  const senderType = msg.senderType || (msg.isAdmin ? (msg.isBot ? "bot" : "admin") : "user");
  const isUser = senderType === "user";

  const label = senderType === "bot" ? "AI Assistant" : "Support";
  const accentColor = senderType === "admin" ? "#2563eb" : "var(--chat-color)";

  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"} mb-2 px-3 items-end gap-1.5`}>
      {/* Admin / Bot avatar on the left */}
      {!isUser && (
        <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center shadow-sm shrink-0"
          style={{ backgroundColor: accentColor }}>
          {senderType === "admin" ? (
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          ) : (
            <Bot className="w-3.5 h-3.5 text-white" />
          )}
        </div>
      )}

      {/* Message bubble */}
      <div
        className={`relative px-3.5 py-2.5 text-sm leading-relaxed break-words max-w-[80%] ${
          isUser
            ? "text-white shadow-md"
            : "text-slate-800 border shadow-sm"
        }`}
        style={{
          whiteSpace: "pre-wrap",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          backgroundColor: isUser ? "var(--chat-color)" : "#ffffff",
          borderColor: isUser ? "transparent" : "#e5e7eb",
        }}
      >
          {/* Sender label for admin/AI */}
          {!isUser && (
            <div className="text-[10px] font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: accentColor }}>
              <span className="w-1 h-1 rounded-full inline-block" style={{ backgroundColor: accentColor }} />
              {label}
            </div>
          )}

        {/* Image attachment */}
        {msg.imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden">
            <img
              src={msg.imageUrl}
              alt="Message attachment"
              className="max-w-full rounded-xl max-h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => window.open(msg.imageUrl, '_blank')}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Message text */}
        <div className={`${isUser ? "pr-6" : ""}`}>{msg.message}</div>

        {/* Timestamp and status */}
        <div className={`text-[10px] mt-1.5 flex items-center ${isUser ? "justify-end" : "justify-start"} ${isUser ? "text-white/70" : "text-slate-400"}`}>
          <span>{formatTime(msg.createdAt)}</span>
          {isUser && (
            <span className="inline-flex ml-1">
              {msg.status === "read" ? (
                <svg className="w-3.5 h-3.5 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17l-2.83-2.83-1.41 1.41L11.66 19l8.66-8.59-1.42-1.42z"/>
                </svg>
              ) : msg.status === "delivered" ? (
                <svg className="w-3.5 h-3.5 text-white/50" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17l-2.83-2.83-1.41 1.41L11.66 19l8.66-8.59-1.42-1.42z"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </span>
          )}
        </div>
      </div>

      {/* User avatar on the right */}
      {isUser && (
        <div
          className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white shadow-sm bg-cover bg-center shrink-0 overflow-hidden"
          style={userProfilePic ? { backgroundImage: `url(${userProfilePic})` } : {}}
        >
          {!userProfilePic && (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* =====================
     Typing Indicator Component - WhatsApp Style
===================== */
const TypingIndicator = ({ ariaLabel = "Assistant is typing" }) => (
  <div className="flex justify-start mb-2 px-3" role="status" aria-label={ariaLabel}>
    <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1.5 border border-gray-100">
      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"></div>
    </div>
  </div>
);

// Module-level cache — survives SPA navigations, resets on page refresh
let cachedChatColor = null;

const setChatColorCookie = (hex) => {
  if (!hex) return;
  try {
    document.cookie = `opencodeChatColor=${encodeURIComponent(hex)}; max-age=31536000; path=/`;
  } catch (_) {}
};

const getChatColorCookie = () => {
  try {
    const match = document.cookie.split("; ").find((r) => r.startsWith("opencodeChatColor="));
    if (match) return decodeURIComponent(match.split("=")[1]);
  } catch (_) {}
  return null;
};

export default function ChatBot() {
  const navigate = useNavigate();

  // State
  const [input, setInput] = useState("");
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedLang, setSelectedLang] = useState(
    typeof navigator !== "undefined" && navigator.language?.startsWith("si") ? "si-LK" : "en-US"
  );
  const [allMessages, setAllMessages] = useState([]);

  // ✅ New loading state for initial chat load
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Pagination states
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Network status
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Auto polling states
  const [pollingInterval, setPollingInterval] = useState(null);
  const pollingIntervalRef = useRef(null);
  const [isPolling, setIsPolling] = useState(false);

  // Audio state
  const isSpeakingRef = useRef(false);
  const lastMessageIdRef = useRef(null);
  const chatBadgeRef = useRef(0);
  const [pendingAudio, setPendingAudio] = useState(null);

  // Dynamic brand color from settings — module cache → cookie → CSS var → fallback
  const getInitialColor = () => {
    if (cachedChatColor) return cachedChatColor;
    const cookieColor = getChatColorCookie();
    if (cookieColor) return cookieColor;
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      const brand = getComputedStyle(root).getPropertyValue("--color-brand-500").trim();
      if (brand && brand !== "none") return brand;
    }
    return "#F85606";
  };
  const [primaryColor, setPrimaryColor] = useState(getInitialColor);

  // User profile image
  const [userProfilePic, setUserProfilePic] = useState(
    JSON.parse(localStorage.getItem("user") || "{}").profileImage || ""
  );

  const fetchUserProfile = useCallback(async () => {
    if (!localStorage.getItem("token")) {
      setUserProfilePic("");
      return;
    }
    const cached = JSON.parse(localStorage.getItem("user") || "{}").profileImage;
    if (cached) { setUserProfilePic(cached); return; }
    try {
      const { data } = await api.get("/api/users/me");
      const pic = data?.user?.profileImage || "";
      setUserProfilePic(pic);
    } catch { setUserProfilePic(""); }
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const [r, g, b] = hexToRgb(primaryColor).split(",").map(Number);
    root.style.setProperty("--chat-color", primaryColor);
    root.style.setProperty("--chat-color-dark", darkenColor(primaryColor));
    root.style.setProperty("--chat-color-darker", darkenColor(primaryColor, 0.9));
    root.style.setProperty("--chat-color-r", r);
    root.style.setProperty("--chat-color-g", g);
    root.style.setProperty("--chat-color-b", b);
  }, [primaryColor]);

  useEffect(() => {
    const fetchColor = () => {
      api
        .get("/api/settings/public")
        .then(({ data }) => {
          const s = data?.settings;
          const color =
            s?.chatWidgetColor || s?.primaryColor || "#F85606";
          setPrimaryColor(color);
          cachedChatColor = color;
          setChatColorCookie(color);
        })
        .catch(() => {});
    };
    fetchColor();

    const handleSettingsUpdate = () => {
      cachedChatColor = null; // invalidate on admin save so we re-fetch
      fetchColor();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("settingsUpdated", handleSettingsUpdate);
      return () => window.removeEventListener("settingsUpdated", handleSettingsUpdate);
    }
  }, []);

  const darkenColor = (hex, factor = 0.85) => {
    if (!hex || hex === "none") return "#c04800";
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
  };

  const hexToRgb = (hex) => {
    if (!hex || hex === "none") return "248,86,6";
    return `${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}`;
  };

  // Unread chat badge - with lazy init to reset on mount
  const [chatUnreadCount, setChatUnreadCount] = useState(() => 0);

  useEffect(() => {
    if (chatUnreadCount > 0) {
      document.title = `(${chatUnreadCount}) AI Chat`;
    } else {
      document.title = "AI Chat";
    }
  }, [chatUnreadCount]);

  // Scroll logic
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const prevMessageLength = useRef(0);
  const prevScrollHeight = useRef(0);

  // Refs
  const mainRef = useRef(null);
  const audioRef = useRef(null);
  const sendMessageRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionTimeoutRef = useRef(null);
  const hasFetchedSession = useRef(false);

  // Constants (memoized)
  const token = localStorage.getItem("token");

  // --- Helper: Reduced Motion ---
  const animationDuration = getAnimationDuration();

  // --- Helper: Scroll Function ---
  const scrollToBottom = useCallback((behavior = "smooth") => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: mainRef.current.scrollHeight,
        behavior: animationDuration === "duration-0" ? "auto" : behavior,
      });
    }
  }, [animationDuration]);

  // --- Image Upload Handler ---
  const handleImageSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      Swal.fire("Error", "Please select an image file", "error");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire("Error", "Image size must be less than 5MB", "error");
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  }, []);

  const removeSelectedImage = useCallback(() => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview(null);
  }, [imagePreview]);

  // Fetch messages
  const fetchMessages = useCallback(
    async (isLoadMore = false) => {
      if (isHistoryLoading || (isLoadMore && !hasMore)) return;
      if (!localStorage.getItem("token")) return;

      setIsHistoryLoading(true);
      try {
        const params = { limit: 20 };
        if (isLoadMore && cursor) params.cursor = cursor;

        const { data } = await api.get(
          `/api/messages/getmessages`,
          { params },
        );

        if (data.success) {
          const fetchedMessages = data.messages || [];

          // Debug: Log image data from MongoDB
          const msgsWithImages = fetchedMessages.filter(m => m.imageUrl).length;

          if (isLoadMore) {
            const currentScrollHeight = mainRef.current?.scrollHeight || 0;
            prevScrollHeight.current = currentScrollHeight;
            setAllMessages((prev) => [...fetchedMessages, ...prev]);
          } else {
            setAllMessages(fetchedMessages);
          }

          setCursor(data.nextCursor);
          setHasMore(data.hasMore);

          if (!isLoadMore && fetchedMessages.length > 0) {
            const lastMsg = fetchedMessages[fetchedMessages.length - 1];
            if (lastMsg?._id) lastMessageIdRef.current = lastMsg._id;
          }
        }
      } catch (err) {
        console.error("❌ Fetch messages error:", err);
      } finally {
        setIsHistoryLoading(false);
      }
    },
    [cursor, hasMore, isHistoryLoading],
  );

  // Handle scroll
  const handleScroll = useCallback(() => {
    if (!mainRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = mainRef.current;

    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isAtBottom);
    setShowJumpButton(scrollHeight - scrollTop - clientHeight > 200);

    if (
      scrollTop === 0 &&
      hasMore &&
      !isHistoryLoading &&
      allMessages.length > 0
    ) {
      fetchMessages(true);
    }
  }, [hasMore, isHistoryLoading, allMessages.length, fetchMessages]);

  // Restore scroll position after loading older messages
  useEffect(() => {
    if (prevScrollHeight.current > 0 && mainRef.current && !isHistoryLoading) {
      const newScrollHeight = mainRef.current.scrollHeight;
      const heightDifference = newScrollHeight - prevScrollHeight.current;
      if (heightDifference > 0) {
        mainRef.current.scrollTop = heightDifference;
        prevScrollHeight.current = 0;
      }
    }
  }, [allMessages, isHistoryLoading]);

  // Attach scroll listener
  useEffect(() => {
    const container = mainRef.current;
    if (container && isOpen) {
      container.addEventListener("scroll", handleScroll, { passive: true });
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll, isOpen]);

  // Auto-scroll logic for new messages
  useLayoutEffect(() => {
    if (!isOpen || !mainRef.current || isChatLoading) return;

    const currentLength = allMessages.length;
    const hasNewMessage = currentLength > prevMessageLength.current;
    const isFirstLoad = prevMessageLength.current === 0 && currentLength > 0;

    if (isFirstLoad) {
      requestAnimationFrame(() => {
        if (mainRef.current) {
          mainRef.current.scrollTop = mainRef.current.scrollHeight;
        }
      });
      prevMessageLength.current = currentLength;
      setShouldAutoScroll(true);
      return;
    }

    if (hasNewMessage && shouldAutoScroll) {
      scrollToBottom("smooth");
      prevMessageLength.current = currentLength;
    }
  }, [allMessages, isOpen, shouldAutoScroll, scrollToBottom, isChatLoading]);

  // Reset state when chat closes
  useEffect(() => {
    if (!isOpen) {
      setShouldAutoScroll(true);
      prevMessageLength.current = 0;
      prevScrollHeight.current = 0;
      setCursor(null);
      setHasMore(true);
      hasFetchedSession.current = false;
    }
  }, [isOpen]);

  // Network status listeners
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
        recognitionRef.current = null;
      }
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    };
  }, []);

  // Fetch unread chat count
  const fetchChatUnreadCount = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const { data, status } = await api.get(`/api/messages/unread-chat-count`);
      setChatUnreadCount(data.count || 0);
    } catch (err) {
      console.error("Chat unread count error:", err.response?.data || err.message);
      setChatUnreadCount(0);
    }
  }, []);

  // Listen for auth changes - refetch unread count and profile when user logs in/out
  useEffect(() => {
    const handleAuthChange = () => {
      setChatUnreadCount(0);
      fetchChatUnreadCount();
      fetchUserProfile();
    };

    // Only bind to window if component is mounted (check for document)
    if (typeof window !== "undefined") {
      window.addEventListener("authChange", handleAuthChange);
      return () => window.removeEventListener("authChange", handleAuthChange);
    }
  }, [fetchChatUnreadCount, fetchUserProfile]);

  useEffect(() => {
    fetchUserProfile();
    fetchChatUnreadCount();
    const interval = setInterval(fetchChatUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchChatUnreadCount, fetchUserProfile]);

  // Clear badge when chat opens + mark messages as read in backend
  const chatClearedRef = useRef(false);
  useEffect(() => {
    if (isOpen && chatUnreadCount > 0 && !chatClearedRef.current) {
      chatClearedRef.current = true;
      setChatUnreadCount(0);
      // Tell backend to mark these messages as read so badge doesn't persist on refresh
      api.put("/api/messages/mark-user-read").catch((err) => {
        console.error("❌ Failed to mark messages as read:", err?.response?.data || err.message);
      });
    }
    if (!isOpen) chatClearedRef.current = false;
  }, [isOpen, chatUnreadCount]);

  // Audio Player
  const playAudio = useCallback((base64Audio) => {
    if (!base64Audio) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      const cleanBase64 = base64Audio.replace(
        /^audio\/(mp3|wav|mpeg);base64,/,
        "",
      );
      const audioUrl = `data:audio/mp3;base64,${cleanBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        isSpeakingRef.current = true;
        setPendingAudio(null);
      };
      audio.onended = () => {
        isSpeakingRef.current = false;
        audioRef.current = null;
      };
      audio.onerror = () => isSpeakingRef.current = false;

      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => {
          setPendingAudio(cleanBase64);
          isSpeakingRef.current = false;
        });
      }
    } catch (error) {
      console.error("Audio setup error:", error);
      isSpeakingRef.current = false;
    }
  }, []);

  // Polling for new messages
  const checkForNewMessages = useCallback(async () => {
    if (!isOpen || loading || isChatLoading) return;
    if (!localStorage.getItem("token")) return;

    try {
      const params = { limit: 20 };
      if (lastMessageIdRef.current) params.after = lastMessageIdRef.current;

      const { data } = await api.get(`/api/messages/getmessages`, { params });

      const newMessages = data?.messages || [];

      if (newMessages.length > 0) {
        const last = newMessages[newMessages.length - 1];
        if (last?._id) lastMessageIdRef.current = last._id;

        setAllMessages((prev) => {
          const messageMap = new Map();
          // Only use server messages (real _id from DB) — skip optimistic (temp-*) messages
          const serverMsgs = newMessages.filter((msg) => msg._id && !String(msg._id).startsWith("temp-"));
          prev.forEach((msg) => {
            if (msg._id && String(msg._id).startsWith("temp-")) return; // skip optimistic
            messageMap.set(msg._id.toString(), msg);
          });
          serverMsgs.forEach((msg) => {
            if (msg._id) messageMap.set(msg._id.toString(), msg);
          });

          const allMsgs = Array.from(messageMap.values()).sort(
            (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0),
          );

          if (allMsgs.length > 20 && !hasMore) {
            return allMsgs.slice(-20);
          }
          return allMsgs;
        });
      }
    } catch (err) {
      console.error("❌ Polling error:", err);
    }
  }, [isOpen, loading, hasMore, isChatLoading]);

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || isChatLoading) return;
    setIsPolling(true);
    const interval = setInterval(checkForNewMessages, 5000);
    pollingIntervalRef.current = interval;
    setPollingInterval(interval);
  }, [checkForNewMessages, isChatLoading]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setPollingInterval(null);
      setIsPolling(false);
    }
  }, []);

  // Auto polling effect
  useEffect(() => {
    if (isOpen && !isChatLoading) {
      startPolling();
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [isOpen, startPolling, stopPolling, isChatLoading]);

  // ==================================================
  // sendMessage function
  // ==================================================
  const sendMessage = useCallback(
    async (text, isVoice = false) => {
      if (!localStorage.getItem("token")) return;
      const trimmedText = text?.trim();
      if ((!trimmedText && !selectedImage) || loading || isChatLoading) return;

      // Alert when user types @admin — explain how it works
      if (trimmedText?.toLowerCase().includes("@admin")) {
        const result = await Swal.fire({
          icon: "info",
          title: "Contact Admin",
          text: "Your message will be sent to the admin. They will reply to you in this chat.",
          confirmButtonText: "Send",
          showCancelButton: true,
          cancelButtonText: "Cancel",
        });
        if (!result.isConfirmed) return;
      }

      const tempId = `temp-${Date.now()}`;
      const currentImage = selectedImage;

      const optimisticUserMsg = {
        _id: tempId,
        message: trimmedText,
        senderType: "user",
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };

      // Clear input immediately
      setAllMessages((prev) => [...prev, optimisticUserMsg]);
      setLoading(true);
      setInput("");

      // Extract and clear selected image before upload
      setSelectedImage(null);
      setImagePreview(null);

      try {
        // Upload image if selected
        let imageUrl = null;
        if (currentImage) {
          setIsUploading(true);
          try {
            imageUrl = await uploadToMedia(currentImage);
          } catch (uploadErr) {
            console.error("❌ Image upload failed:", uploadErr);
            Swal.fire({
              icon: "error",
              title: "Upload Failed",
              text: "Could not upload image. Message sent without it.",
              toast: true,
              position: "top-end",
              showConfirmButton: false,
              timer: 3000,
            });
          } finally {
            setIsUploading(false);
          }
        }

        const detectedLang = trimmedText && /[\u0D80-\u0DFF]/.test(trimmedText) ? "si-LK" : "en-US";

        // Read cart & wishlist from localStorage for AI context
        const cartContext = JSON.parse(localStorage.getItem("cart") || "[]")
          .slice(0, 5)
          .map((i) => ({ name: i.productName, qty: i.qty, price: i.price }));
        const wishlistContext = JSON.parse(localStorage.getItem("myWishlist") || "[]")
          .slice(0, 5)
          .map((i) => ({ name: i.productName }));

        const { data } = await api.post(
          `/api/messages/sendmessage`,
          {
            message: trimmedText,
            isVoice,
            language: detectedLang,
            userImage: userProfilePic,
            imageUrl: imageUrl,
            cart: cartContext,
            wishlist: wishlistContext,
          },
        );

        if (data?.success) {
          const newMsgs = Array.isArray(data.messages)
            ? data.messages
            : [data.messages];

          // Debug: Log server response with images
          const serverMsgsWithImages = newMsgs.filter(m => m.imageUrl).length;

          setAllMessages((prev) => {
            const filtered = prev.filter((m) => m._id !== tempId);
            const updated = [...filtered, ...newMsgs];
            if (updated.length > 20 && !hasMore) {
              return updated.slice(-20);
            }
            return updated;
          });

          if (newMsgs.length > 0) {
            const lastMsg = newMsgs[newMsgs.length - 1];
            if (lastMsg?._id) lastMessageIdRef.current = lastMsg._id;
          }

          if (data.audio) playAudio(data.audio);
        }
      } catch (err) {
        console.error("❌ Send Error:", err);
        
        // Clean up optimistic message only
        setAllMessages((prev) => prev.filter((m) => m._id !== tempId));
        
        Swal.fire({
          icon: "error",
          title: "Send Failed",
          text: err.response?.data?.message || 
                 err.message || 
                 "Failed to send message. Check your connection.",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 5000,
        });
      } finally {
        setLoading(false);
        setIsUploading(false);
      }
    },
    [loading, selectedLang, playAudio, hasMore, isChatLoading, userProfilePic, selectedImage, imagePreview],
  );

  // Sync ref so voice handler always has the latest sendMessage
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  // ==================================================
  // Voice Input
  // ==================================================
  const startVoiceInput = useCallback(() => {
    // Warn if not localhost and not HTTPS (SpeechRecognition requires secure context)
    if (
      typeof window !== "undefined" &&
      window.location.protocol !== "https:" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      Swal.fire({
        icon: "warning",
        title: "Voice may not work",
        text: "Speech recognition requires a secure connection (HTTPS). Please use HTTPS or localhost.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Swal.fire(
        "Not Supported",
        "Please use Chrome or Edge for voice features.",
        "warning",
      );
      return;
    }

    // Abort any previous session
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (_) {}
    }
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = selectedLang;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition; // keep alive — prevents GC

    // Timeout: auto-stop after 10s of silence
    recognitionTimeoutRef.current = setTimeout(() => {
      try { recognition.abort(); } catch (_) {}
      setIsListening(false);
      recognitionRef.current = null;
      Swal.fire({
        icon: "info",
        title: "No speech detected",
        text: "Listening timed out. Please try again and speak clearly.",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
      });
    }, 10000);

    recognition.onstart = () => {
      setIsListening(true);
      if (audioRef.current) audioRef.current.pause();
    };

    recognition.onresult = (e) => {
      // Got a result — cancel the silent timeout
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      const transcript = e.results[0][0].transcript;
      if (transcript) sendMessageRef.current(transcript, true);
    };

    recognition.onerror = (e) => {
      setIsListening(false);
      recognitionRef.current = null;
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
      const errorMessages = {
        "no-speech": "No speech was detected. Please try again.",
        "aborted": "Voice input was aborted.",
        "audio-capture": "No microphone found. Please check your microphone.",
        "network": "Network error occurred during voice recognition.",
        "not-allowed": "Microphone access was denied. Please allow microphone permissions.",
        "service-not-allowed": "Speech recognition service is not allowed.",
        "bad-grammar": "Speech recognition grammar error.",
        "language-not-supported": `Language "${selectedLang}" is not supported for speech recognition.`,
      };
      Swal.fire({
        icon: "error",
        title: "Voice Input Error",
        text: errorMessages[e.error] || `Voice recognition error: ${e.error}`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
      });
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (recognitionTimeoutRef.current) {
        clearTimeout(recognitionTimeoutRef.current);
        recognitionTimeoutRef.current = null;
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Voice start error", e);
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [selectedLang]);

  // ==================================================
  // Event Listener
  // ==================================================
  useEffect(() => {
    const handleReturnEvent = (e) => {
      setIsOpen(true);
      if (!token) {
        const returnUrl = window.location.pathname + window.location.search;
        navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`);
        return;
      }
      if (e.detail?.message) {
        setTimeout(() => sendMessage(e.detail.message, false), 500);
      }
    };

    window.addEventListener("trigger-chatbot-message", handleReturnEvent);
    return () => {
      window.removeEventListener("trigger-chatbot-message", handleReturnEvent);
    };
}, [sendMessage, token, navigate]);

  // Toggle handler
  const toggleChat = useCallback(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    setIsOpen((prev) => !prev);
  }, [token, navigate]);

  // Initialize chat with loading state
  useEffect(() => {
    const initializeChat = async () => {
      if (isOpen && !hasFetchedSession.current) {
        if (!localStorage.getItem("token")) return;
        setIsChatLoading(true);
        try {
          const { data } = await api.get(
            `/api/messages/initialize`,
          );

          if (data.success) {
            const messages = data.messages || [];
            setAllMessages(messages.slice(-20));
            if (data.nextCursor) setCursor(data.nextCursor);
            if (data.hasMore !== undefined) setHasMore(data.hasMore);
            const last = messages[messages.length - 1];
            if (last?._id) lastMessageIdRef.current = last._id;
          }
        } catch (err) {
          console.error("❌ Initialize error:", err);
          const { data: fallbackData } = await api.get(
            `/api/messages/getmessages`,
            { params: { limit: 20 } },
          );
          if (fallbackData?.success) {
            setAllMessages(fallbackData.messages || []);
            setCursor(fallbackData.nextCursor);
            setHasMore(fallbackData.hasMore);
            const last = fallbackData.messages?.[fallbackData.messages.length - 1];
            if (last?._id) lastMessageIdRef.current = last._id;
          }
        } finally {
          setIsChatLoading(false);
          hasFetchedSession.current = true;
        }
      }
    };

    initializeChat();
  }, [isOpen]);

  return (
    <>
      <style>{`
        .chat-color-bg { background-color: var(--chat-color) !important; }
        .chat-color-bg-hover:hover { background-color: var(--chat-color-dark) !important; }
        .chat-color-text { color: var(--chat-color) !important; }
        .chat-color-border { border-color: var(--chat-color) !important; }
        .chat-color-border-20 { border-color: rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.2) !important; }
        .chat-color-ring:focus { box-shadow: 0 0 0 2px rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.15) !important; border-color: var(--chat-color) !important; }
        .chat-color-ring-btn:focus { box-shadow: 0 0 0 2px rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.4) !important; }
        .chat-ping { background-color: rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.3) !important; }
        .chat-color-light-bg { background-color: rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.08) !important; }
        .chat-shadow { box-shadow: 0 4px 24px rgba(var(--chat-color-r), var(--chat-color-g), var(--chat-color-b), 0.15) !important; }
      `}</style>
      <div className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-[1000] font-sans antialiased">
        {/* Toggle Button */}
        <button
          onClick={toggleChat}
          className="relative w-12 h-12 chat-color-bg text-white rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 chat-color-ring-btn chat-shadow"
          aria-label={isOpen ? "Close chat" : "Open chat"}
        >
          <span className="relative">
            {isOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <MessageCircle className="w-5 h-5" />
            )}
          </span>
          {!isOpen && chatUnreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-lg ring-2 ring-white">
              {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
            </span>
          )}
          {!isOpen && chatUnreadCount === 0 && (
            <span className="absolute inline-flex h-full w-full rounded-2xl animate-ping chat-ping" />
          )}
        </button>

        {/* Chat Window */}
        {isOpen && (
          <div
            className={`absolute bottom-20 right-0 w-[calc(100vw-2rem)] sm:w-[380px] h-[80vh] sm:h-[600px] bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden border border-gray-100 ${animationDuration}`}
          >
            {/* Offline indicator banner */}
            {!isOnline && (
              <div className="bg-amber-50 text-amber-700 text-xs text-center py-2 font-medium shrink-0 border-b border-amber-200/50">
                You're offline. Messages will send when reconnected.
              </div>
            )}

            {/* Header */}
            <header className="chat-color-bg text-white shrink-0">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  {/* Bot Avatar */}
                  <div className="relative">
                    <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center shadow-inner">
                      <Bot className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 ring-2 ring-white rounded-full" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">Smart Assistant</h2>
                    <p className="text-[10px] text-white/70 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Online
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Current user profile */}
                  <div
                    className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white/60 shadow-sm bg-cover bg-center shrink-0 overflow-hidden"
                    style={userProfilePic ? { backgroundImage: `url(${userProfilePic})` } : {}}
                  >
                    {!userProfilePic && (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    )}
                  </div>
                  {isPolling && (
                    <div className="flex items-center gap-1 bg-white/15 px-2 py-1 rounded-lg">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-[7px] font-semibold text-white/80 uppercase tracking-wider">
                        Live
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Messages Area */}
            <main
              ref={mainRef}
              className="relative flex-1 p-4 overflow-y-auto space-y-3"
              style={{ backgroundColor: '#f8fafc' }}
            >
              <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
              `}</style>

              {/* Loading state when opening chat */}
              {isChatLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-7 h-7 border-[3px] border-slate-200 rounded-full animate-spin" style={{ borderTopColor: primaryColor }}></div>
                  <p className="text-xs text-slate-400 font-medium">
                    Loading chat...
                  </p>
                </div>
              ) : (
                <>
                  {/* Loading indicator for older messages */}
                  {isHistoryLoading && allMessages.length > 0 && (
                    <div className="flex justify-center py-2">
                      <div className="w-5 h-5 border-2 border-slate-200 rounded-full animate-spin" style={{ borderTopColor: primaryColor }}></div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!isChatLoading && allMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center chat-color-light-bg">
                        <MessageCircle className="w-7 h-7 chat-color-text" />
                      </div>
                      <div className="text-center max-w-[260px]">
                        <p className="font-semibold text-slate-700 text-sm">
                          Welcome!
                        </p>
                        <p className="text-xs mt-0.5 text-slate-400">
                          How can I help you today?
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Show "Beginning of conversation" when no more messages */}
                      {!hasMore && allMessages.length > 0 && (
                        <div className="flex justify-center py-2">
                          <span className="text-[9px] text-slate-400 bg-white px-2.5 py-1 rounded-full shadow-sm border border-slate-200/60">
                            Beginning of conversation
                          </span>
                        </div>
                      )}

                      {/* Display all messages */}
                      {allMessages.map((m) => (
                        <MessageBubble key={m._id || m.tempId} msg={m} userProfilePic={userProfilePic} />
                      ))}
                    </>
                  )}
                </>
              )}

              {loading && !isChatLoading && <TypingIndicator />}

              {/* Pending audio play button */}
              {pendingAudio && (
                <div className="flex justify-center py-3">
                  <button
                    onClick={() => {
                      const audio = new Audio(`data:audio/mp3;base64,${pendingAudio}`);
                      audioRef.current = audio;
                      audio.onended = () => { audioRef.current = null; setPendingAudio(null); };
                      audio.play().catch(() => {});
                      setPendingAudio(null);
                    }}
                    className="flex items-center gap-2 chat-color-bg text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                    Listen to response
                  </button>
                </div>
              )}

              {/* Jump to bottom button */}
              {showJumpButton && !isChatLoading && (
                <button
                  onClick={() => scrollToBottom("smooth")}
                  className="sticky bottom-3 left-1/2 -translate-x-1/2 z-10 bg-white shadow-lg text-slate-600 px-3.5 py-2 rounded-full hover:shadow-xl transition-all flex items-center gap-2 border border-slate-200/80 chat-color-border-hover focus:outline-none chat-color-ring"
                >
                  <svg className="w-3.5 h-3.5 chat-color-text" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M19 9l-7 7-7-7"/>
                  </svg>
                  <span className="text-[11px] font-medium">Jump to bottom</span>
                </button>
              )}
            </main>

            {/* Input Footer */}
            <footer className="bg-white border-t border-gray-100 shrink-0">
              {/* Image Preview */}
              {imagePreview && (
                <div className="pt-3 px-3">
                  <div className="relative inline-block max-w-[180px]">
                    <img
                      src={imagePreview}
                      alt="Selected"
                      className="max-h-24 rounded-xl border border-gray-200 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={removeSelectedImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-md"
                    >
                      ×
                    </button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!isChatLoading && !isUploading) sendMessage(input, false);
                }}
                className="flex items-end gap-2 p-3"
              >
                {/* Image Upload Button */}
                <label
                  className={`p-2 rounded-xl transition-all cursor-pointer ${
                    isUploading
                      ? "opacity-40 cursor-not-allowed"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  } focus:outline-none chat-color-ring`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={isUploading || isChatLoading}
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </label>

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={startVoiceInput}
                  disabled={loading || isChatLoading || isUploading}
                  className={`p-2 rounded-xl transition-all ${
                    isListening
                      ? "bg-red-500 text-white shadow-md"
                      : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                   } disabled:opacity-40 focus:outline-none chat-color-ring`}
                  aria-label={isListening ? "Listening..." : "Voice input"}
                >
                  {isListening ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 6h12v12H6z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>

                {/* Text Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      isChatLoading
                        ? "Loading chat..."
                        : isListening
                          ? "Listening..."
                          : isUploading
                            ? "Uploading..."
                            : "Type your message..."
                    }
                    disabled={loading || isListening || isChatLoading || isUploading}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:bg-white chat-color-ring transition-all placeholder-slate-400 disabled:opacity-40"
                    aria-label="Message input"
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!input.trim() && !selectedImage) || loading || isChatLoading || isUploading}
                  className="p-2.5 chat-color-bg chat-color-bg-hover text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-md hover:shadow-lg focus:outline-none chat-color-ring-btn"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </footer>
          </div>
        )}
      </div>
    </>
  );
}
