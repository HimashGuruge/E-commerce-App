import React, { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import EmailSidebar from "./EmailSidebar.jsx";
import EmailTopBar from "./EmailTopBar.jsx";
import EmailList from "./EmailList.jsx";
import EmailReader from "./EmailReader.jsx";
import ComposeWindow from "./ComposeWindow.jsx";
import {
  initialEmails,
  stripHtml,
  escHtml,
  parseRecipients,
  quoteMail,
  withSignature,
} from "./mockEmails.js";

// ---------------------------------------------------------------------------
// Gmail-style email UI — 100% client-side demo.
// All mail is mock sample data; "Send" only writes to local UI state.
// ---------------------------------------------------------------------------

const CLOSED_COMPOSE = {
  open: false,
  mode: "new",
  to: "",
  cc: "",
  bcc: "",
  subject: "",
  html: "",
  attachments: [],
  minimized: false,
  baseId: null,
  fromSeed: 0,
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function EmailPage() {
  // ------------------------------ identity ------------------------------
  const [me] = useState(() => {
    const u = loadJSON("user", null);
    return u?.name
      ? { name: u.name, email: u.email || "me@you.example", color: "#0b57d0" }
      : { name: "You", email: "me@you.example", color: "#0b57d0" };
  });

  // ------------------------------- state -------------------------------
  const [emails, setEmails] = useState(initialEmails);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState("inbox"); // 'inbox' ... or 'label:Work'
  const [activeCategory, setActiveCategory] = useState(
    () => loadJSON("emailDefaultCat", "all")
  );
  const [query, setQuery] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState({ from: "", to: "", subject: "", after: "", before: "", attach: "any" });
  const [selected, setSelected] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [compose, setCompose] = useState(CLOSED_COMPOSE);
  const [density, setDensity] = useState(() => loadJSON("emailDensity", "comfortable"));
  const [signature, setSignature] = useState(() => loadJSON("emailSignature", ""));
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : true
  );

  // Simulated initial fetch for the skeleton state.
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  // Persist preferences.
  useEffect(() => localStorage.setItem("emailDensity", JSON.stringify(density)), [density]);
  useEffect(() => localStorage.setItem("emailDefaultCat", JSON.stringify(activeCategory)), [activeCategory]);
  useEffect(() => localStorage.setItem("emailSignature", JSON.stringify(signature)), [signature]);

  const dense = density === "compact";
  const now = () => new Date();

  // ---------------------------- derived data ----------------------------
  const isSnoozed = (m) => m.snoozedUntil && new Date(m.snoozedUntil) > now();

  const counts = useMemo(
    () => ({
      inboxUnread: emails.filter(
        (m) => m.folder === "inbox" && !m.read && !m.archived && !isSnoozed(m)
      ).length,
      drafts: emails.filter((m) => m.folder === "drafts").length,
    }),
    [emails]
  );

  const visible = useMemo(() => {
    let list = emails.filter((m) => {
      switch (folder) {
        case "inbox":
          return m.folder === "inbox" && !m.archived && !isSnoozed(m);
        case "starred":
          return m.starred && !m.archived;
        case "snoozed":
          return isSnoozed(m);
        case "sent":
          return m.folder === "sent";
        case "drafts":
          return m.folder === "drafts";
        case "important":
          return m.important && !m.archived;
        case "spam":
          return m.folder === "spam";
        case "trash":
          return m.folder === "trash";
        default:
          if (folder.startsWith("label:")) {
            return m.folder !== "trash" && !m.archived && (m.labels || []).includes(folder.slice(6));
          }
          return false;
      }
    });

    if (folder === "inbox" && activeCategory !== "all") {
      list = list.filter((m) => m.category === activeCategory);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (m) =>
          (m.subject || "").toLowerCase().includes(q) ||
          (m.from?.name || "").toLowerCase().includes(q) ||
          (m.from?.email || "").toLowerCase().includes(q) ||
          (m.text || "").toLowerCase().includes(q)
      );
    }

    if (advOpen) {
      if (adv.from.trim()) {
        const f = adv.from.trim().toLowerCase();
        list = list.filter(
          (m) =>
            (m.from?.name || "").toLowerCase().includes(f) ||
            (m.from?.email || "").toLowerCase().includes(f)
        );
      }
      if (adv.to.trim()) {
        const t = adv.to.trim().toLowerCase();
        list = list.filter((m) =>
          (m.to || []).some((r) => r.email.toLowerCase().includes(t) || r.name.toLowerCase().includes(t))
        );
      }
      if (adv.subject.trim()) {
        const s = adv.subject.trim().toLowerCase();
        list = list.filter((m) => (m.subject || "").toLowerCase().includes(s));
      }
      if (adv.after) {
        list = list.filter((m) => m.date >= `${adv.after}T00:00:00`);
      }
      if (adv.before) {
        list = list.filter((m) => m.date <= `${adv.before}T23:59:59`);
      }
      if (adv.attach === "with") list = list.filter((m) => (m.attachments || []).length > 0);
      if (adv.attach === "without") list = list.filter((m) => (m.attachments || []).length === 0);
    }

    return [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [emails, folder, activeCategory, query, advOpen, adv]);

  const openMail = openId ? emails.find((m) => m.id === openId) : null;

  useEffect(() => {
    if (focusIdx >= visible.length) setFocusIdx(Math.max(0, visible.length - 1));
  }, [visible.length, focusIdx]);

  // ------------------------------ mutations ------------------------------
  const patch = useCallback((id, fn) => {
    setEmails((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
  }, []);

  const toggleStar = (id) => patch(id, (m) => ({ ...m, starred: !m.starred }));

  const openMailById = (m) => {
    if (m.folder === "drafts") {
      // Drafts open straight into the compose window (Gmail behavior).
      setCompose({
        open: true,
        mode: "draft",
        to: (m.to || []).map((t) => t.email).join(", "),
        cc: (m.cc || []).map((t) => t.email).join(", "),
        bcc: "",
        subject: m.subject || "",
        html: m.html || "",
        attachments: [...(m.attachments || [])],
        minimized: false,
        baseId: m.id,
        fromSeed: Date.now(),
      });
      return;
    }
    setOpenId(m.id);
    if (!m.read) patch(m.id, (x) => ({ ...x, read: true }));
  };

  const closeReader = () => setOpenId(null);

  const archive = (id) => {
    patch(id, (m) => ({ ...m, archived: true }));
    toast.success("Archived (mock)");
  };
  const trash = (id) => {
    patch(id, (m) => ({ ...m, folder: "trash" }));
    toast.success("Moved to Trash");
  };
  const spam = (id) => {
    patch(id, (m) => ({ ...m, folder: "spam" }));
    toast.success("Reported as spam");
  };
  const notSpam = (id) => {
    patch(id, (m) => ({ ...m, folder: "inbox", read: m.read }));
    toast.success("Marked as not spam");
  };
  const restore = (id) => {
    patch(id, (m) => ({ ...m, folder: "inbox" }));
    toast.success("Restored to Inbox");
  };
  const deleteForever = (id) => {
    setEmails((prev) => prev.filter((m) => m.id !== id));
    if (openId === id) setOpenId(null);
    toast.success("Deleted forever");
  };

  const computeSnooze = (o) => {
    const d = new Date();
    if (o.hours) return new Date(d.getTime() + o.hours * 36e5);
    d.setDate(d.getDate() + (o.tomorrow ? 1 : o.days || 1));
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const snooze = (id, option) => {
    patch(id, (m) => ({ ...m, snoozedUntil: computeSnooze(option).toISOString(), read: true }));
    toast.success(`Snoozed until ${computeSnooze(option).toLocaleString("en-GB")}`);
  };

  const markRead = (id) => patch(id, (m) => ({ ...m, read: true }));
  const markUnread = (id) => {
    patch(id, (m) => ({ ...m, read: false }));
    if (openId === id) setOpenId(null);
  };

  // ------------------------------ bulk bar ------------------------------
  const bulk = (key) => {
    const ids = new Set(selected);
    if (key === "deleteForever") {
      setEmails((prev) => prev.filter((m) => !ids.has(m.id)));
      if (openId && ids.has(openId)) setOpenId(null);
      toast.success("Deleted forever");
    } else {
      setEmails((prev) =>
        prev.map((m) => {
          if (!ids.has(m.id)) return m;
          switch (key) {
            case "archive":
              return { ...m, archived: true };
            case "spam":
              return { ...m, folder: "spam" };
            case "trash":
              return { ...m, folder: "trash" };
            case "notSpam":
              return { ...m, folder: "inbox" };
            case "restore":
              return { ...m, folder: "inbox" };
            case "read":
              return { ...m, read: true };
            case "unread":
              return { ...m, read: false };
            default:
              return m;
          }
        })
      );
      if (openId && ids.has(openId) && key !== "read") setOpenId(null);
      toast.success("Done");
    }
    setSelected([]);
  };

  const selectAll = () => {
    setSelected((prev) =>
      prev.length === visible.length ? [] : visible.map((m) => m.id)
    );
  };
  const toggleSelect = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelected([]);

  // ------------------------------- compose -------------------------------
  const hasComposeContent = (c) =>
    Boolean(
      c.to.trim() ||
        c.cc.trim() ||
        c.bcc.trim() ||
        c.subject.trim() ||
        stripHtml(c.html) ||
        c.attachments.length
    );

  const startNewCompose = () =>
    setCompose({ ...CLOSED_COMPOSE, open: true, fromSeed: Date.now() });

  const openReply = (mode, mail) => {
    const to =
      mode === "reply"
        ? mail.from.email
        : (mail.to || []).map((t) => t.email).join(", ");
    const cc = mode === "replyall" ? (mail.cc || []).map((c) => c.email).join(", ") : "";
    const subject = mail.subject?.startsWith("Re:")
      ? mail.subject
      : `Re: ${mail.subject || "(no subject)"}`;
    const html =
      mode === "forward"
        ? `${
            mail.subject ? `<p>Subject: ${escHtml(`Fwd: ${mail.subject}`)}</p>` : ""
          }<p>---------- Forwarded message ----------</p>${quoteMail(mail, { full: true })}`
        : quoteMail(mail);
    setCompose({
      open: true,
      mode,
      to,
      cc,
      bcc: "",
      subject: mode === "forward" ? `Fwd: ${mail.subject || "(no subject)"}` : subject,
      html,
      attachments: [],
      minimized: false,
      baseId: null,
      fromSeed: Date.now(),
    });
    setOpenId(null);
  };

  const composeChange = (field, value) =>
    setCompose((c) => ({ ...c, [field]: value }));
  const toggleMinimized = () =>
    setCompose((c) => ({ ...c, minimized: !c.minimized }));

  const closeCompose = () => {
    if (compose.open && hasComposeContent(compose)) {
      const c = compose;
      const toArr = parseRecipients(c.to);
      const ccArr = parseRecipients(c.cc);
      const bccArr = parseRecipients(c.bcc);
      setEmails((prev) => {
        const body = {
          subject: c.subject.trim() || "(no subject)",
          text: stripHtml(c.html),
          html: c.html,
          to: toArr,
          cc: ccArr,
          attachments: c.attachments,
          date: new Date().toISOString(),
        };
        if (c.baseId) {
          return prev.map((e) => (e.id === c.baseId ? { ...e, ...body } : e));
        }
        return [
          {
            id: `d${Date.now()}`,
            folder: "drafts",
            category: "primary",
            from: me,
            ...body,
            read: true,
            starred: false,
            labels: [],
            snoozedUntil: undefined,
          },
          ...prev,
        ];
      });
      toast.success("Draft saved");
    }
    setCompose(CLOSED_COMPOSE);
  };

  const sendCompose = () => {
    const toArr = parseRecipients(compose.to);
    if (toArr.length === 0) {
      toast.error("Add at least one recipient in “To”");
      return;
    }
    const subject = compose.subject.trim() || "(no subject)";
    const html = withSignature(compose.html, signature);
    const text = stripHtml(html);
    const sent = {
      id: `s${Date.now()}`,
      folder: "sent",
      category: "primary",
      from: me,
      to: toArr,
      cc: parseRecipients(compose.cc),
      subject,
      text,
      html,
      date: new Date().toISOString(),
      read: true,
      starred: false,
      labels: [],
      attachments: compose.attachments,
    };
    setEmails((prev) => [
      sent,
      ...(compose.baseId ? prev.filter((e) => e.id !== compose.baseId) : prev),
    ]);
    setCompose(CLOSED_COMPOSE);
    if (folder !== "sent") setFolder("sent");
    toast.success("Saved to Sent (mock — no real email was sent)", { icon: "📬" });
  };

  // --------------------------- navigation etc. ---------------------------
  const navigate = (key) => {
    setFolder(key);
    setOpenId(null);
    setSelected([]);
    setFocusIdx(0);
    if (key === "inbox") setActiveCategory(loadJSON("emailDefaultCat", "all"));
  };

  // -------------------------- keyboard shortcuts -------------------------
  useEffect(() => {
    const onKey = (e) => {
      const inField = e.target.closest?.("input, textarea, select, [contenteditable='true']");
      if (e.key === "Escape") {
        if (compose.open) {
          e.preventDefault();
          closeCompose();
          return;
        }
        if (openId) {
          setOpenId(null);
          return;
        }
        if (selected.length) setSelected([]);
        return;
      }
      if (compose.open || inField) return;

      const focusedMail = visible[focusIdx];
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusIdx((i) => Math.min(visible.length - 1, i + 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusIdx((i) => Math.max(0, i - 1));
          break;
        case "Enter":
          if (focusedMail) openMailById(focusedMail);
          break;
        case "a":
          if (visible.length) selectAll();
          break;
        case "s":
          if (focusedMail) toggleStar(focusedMail.id);
          break;
        case "d":
          if (focusedMail && !focusedMail.archived && focusedMail.folder !== "trash") {
            archive(focusedMail.id);
          }
          break;
        case "Backspace":
          if (focusedMail) {
            if (focusedMail.folder === "trash") deleteForever(focusedMail.id);
            else trash(focusedMail.id);
          }
          break;
        case "r":
          if (focusedMail && focusedMail.folder !== "drafts") openReply("reply", focusedMail);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, focusIdx, compose, openId, selected, folder]);

  // -------------------------------- render --------------------------------
  return (
    <div className="flex h-screen overflow-hidden bg-white text-[#202124]">
      <EmailSidebar
        open={sidebarOpen}
        active={folder}
        counts={counts}
        onNavigate={navigate}
        onClose={() => setSidebarOpen(false)}
        onCompose={startNewCompose}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <EmailTopBar
          me={me}
          query={query}
          onQueryChange={setQuery}
          advOpen={advOpen}
          onToggleAdv={() => setAdvOpen((v) => !v)}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          density={density}
          onDensityChange={setDensity}
          defaultCat={activeCategory}
          onDefaultCatChange={(c) => {
            setActiveCategory(c);
            if (folder !== "inbox") setFolder("inbox");
          }}
          signature={signature}
          onSignatureChange={setSignature}
        />

        {/* Advanced search panel */}
        {advOpen && (
          <div className="flex flex-wrap items-end gap-3 border-b border-[#eee] bg-[#fafbfe] px-4 py-3">
            {[
              { k: "from", label: "From", type: "text", ph: "sender" },
              { k: "to", label: "To", type: "text", ph: "recipient" },
              { k: "subject", label: "Subject", type: "text", ph: "keywords" },
              { k: "after", label: "After", type: "date" },
              { k: "before", label: "Before", type: "date" },
            ].map((f) => (
              <label key={f.k} className="flex flex-col gap-1 text-xs text-[#5f6368]">
                {f.label}
                <input
                  type={f.type}
                  value={adv[f.k]}
                  onChange={(e) => setAdv((a) => ({ ...a, [f.k]: e.target.value }))}
                  placeholder={f.ph}
                  className="w-36 rounded border border-[#dadce0] px-2 py-1.5 text-sm text-[#202124] focus:border-[#0b57d0] focus:outline-none"
                />
              </label>
            ))}
            <label className="flex flex-col gap-1 text-xs text-[#5f6368]">
              Attachments
              <select
                value={adv.attach}
                onChange={(e) => setAdv((a) => ({ ...a, attach: e.target.value }))}
                className="w-36 rounded border border-[#dadce0] bg-white px-2 py-1.5 text-sm text-[#202124] focus:border-[#0b57d0] focus:outline-none"
              >
                <option value="any">Any</option>
                <option value="with">Has attachment</option>
                <option value="without">No attachment</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setAdv({ from: "", to: "", subject: "", after: "", before: "", attach: "any" });
                setQuery("");
              }}
              className="rounded-full px-3 py-1.5 text-sm text-[#0b57d0] hover:bg-[#e8f0fe]"
            >
              Reset
            </button>
          </div>
        )}

        {/* List + reader */}
        <div className="flex min-h-0 flex-1">
          <div
            className={`${
              openId ? "hidden md:flex md:w-[45%] lg:w-[42%]" : "flex w-full"
            } min-h-0 flex-col border-r border-[#eee] bg-white`}
          >
            <EmailList
              mails={visible}
              loading={loading}
              folder={folder}
              activeCategory={activeCategory}
              onCategory={setActiveCategory}
              dense={dense}
              query={query}
              selected={selected}
              focusIdx={focusIdx}
              onToggleSelect={toggleSelect}
              onToggleStar={toggleStar}
              onSelectAll={selectAll}
              onOpen={openMailById}
              onClearSelection={clearSelection}
              onBulk={bulk}
            />
          </div>

          {openMail && (
            <div className="min-h-0 min-w-0 flex-1 bg-white md:overflow-hidden">
              <EmailReader
                mail={openMail}
                onBack={closeReader}
                onArchive={() => archive(openMail.id)}
                onTrash={() => trash(openMail.id)}
                onSpam={() => spam(openMail.id)}
                onNotSpam={() => notSpam(openMail.id)}
                onRestore={() => restore(openMail.id)}
                onDeleteForever={() => deleteForever(openMail.id)}
                onSnooze={(opt) => snooze(openMail.id, opt)}
                onMarkRead={() => markRead(openMail.id)}
                onMarkUnread={() => markUnread(openMail.id)}
                onReply={() => openReply("reply", openMail)}
                onReplyAll={() => openReply("replyall", openMail)}
                onForward={() => openReply("forward", openMail)}
              />
            </div>
          )}
        </div>
      </div>

      {compose.open && (
        <ComposeWindow
          compose={compose}
          me={me}
          onChange={composeChange}
          onSend={sendCompose}
          onClose={closeCompose}
          onToggleMinimized={toggleMinimized}
        />
      )}
    </div>
  );
}
