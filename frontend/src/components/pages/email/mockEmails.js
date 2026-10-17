// ---------------------------------------------------------------------------
// Mock data + helpers for the Gmail-style email UI.
//
// IMPORTANT: every conversation below is local sample data. The email UI does
// NOT send, receive, or deliver real email. Composing/sending only updates
// local UI state (a "mock send" into the Sent list).
// ---------------------------------------------------------------------------

const NOW = Date.now();
const hrs = (h) => new Date(NOW - h * 36e5).toISOString();
const days = (d, hour = 10) => {
  const dt = new Date(NOW - d * 864e5);
  dt.setHours(hour, 15, 0, 0);
  return dt.toISOString();
};
const inDaysAt = (d, hour) => {
  const dt = new Date(NOW + d * 864e5);
  dt.setHours(hour, 0, 0, 0);
  return dt.toISOString();
};

const P = (paras) => paras.map((p) => `<p style="margin:0 0 10px 0">${p}</p>`).join("");

// Placeholder for "the current user"; EmailPage swaps this for the real
// logged-in user (from localStorage) when it loads.
const me = { name: "You", email: "me@you.example", color: "#0b57d0" };

const people = {
  orderBot: { name: "Nimbus Store", email: "orders@nimbusstore.example", color: "#0b57d0" },
  living: { name: "Living Room Collection", email: "deals@livingroom.example", color: "#e8710a" },
  community: { name: "Marketplace Community", email: "community@shopverse.example", color: "#188038" },
  pricing: { name: "Pricing Team", email: "pricing@shopverse.example", color: "#9334e6" },
  flash: { name: "Flash Deals", email: "flash@shopverse.example", color: "#c5221f" },
  review: { name: "ShopVerse Reviews", email: "reviews@shopverse.example", color: "#1a73e8" },
  social: { name: "ShopVerse Social", email: "social@shopverse.example", color: "#d93025" },
  shipping: { name: "SwiftShip Logistics", email: "no-reply@swiftship.example", color: "#107c41" },
  finance: { name: "Seller Finance", email: "finance@shopverse.example", color: "#5f6368" },
  rewards: { name: "ShopVerse Rewards", email: "rewards@shopverse.example", color: "#f29900" },
  scam1: { name: "SecurePay Verification", email: "verify@scam-pay.example", color: "#c5221f" },
  scam2: { name: "Lucky Draw Official", email: "winner@luckydraw.example", color: "#c5221f" },
  newsletter: { name: "ShopVerse Newsletter", email: "news@shopverse.example", color: "#f29900" },
};

export function initialEmails() {
  return [
    // ------------------------------ INBOX ------------------------------
    {
      id: "e1", folder: "inbox", category: "primary", important: true,
      from: people.orderBot, to: [me], cc: [],
      subject: "Your order #48213 has shipped",
      text: "Hi there,\n\nYour order #48213 (Ceramic Dinner Set) has been handed to SwiftShip and ships today.\n\nTracking: SWS-884213-SW\nExpected delivery: by Thursday.\n\nTrack it anytime from your Orders page.",
      html: P([
        "Hi there,",
        "Your order <b>#48213</b> (Ceramic Dinner Set) has been handed to SwiftShip and ships today.",
        "Tracking: <b>SWS-884213-SW</b> &middot; Expected delivery: by <b>Thursday</b>.",
        "Track it anytime from your Orders page.",
      ]),
      date: hrs(2), read: false, starred: true, labels: ["ShopVerse"],
      attachments: [{ name: "invoice-48213.pdf", size: "182 KB" }],
    },
    {
      id: "e2", folder: "inbox", category: "promotions",
      from: people.living, to: [me], cc: [],
      subject: "New arrivals in the Living Room collection",
      text: "Fresh pieces just landed.\n\nSofas, side tables and lighting — 40+ new items from 12 makers.\n\nShop the new collection before stock runs out.",
      html: P([
        "Fresh pieces just landed.",
        "Sofas, side tables and lighting — <b>40+ new items</b> from 12 makers.",
        "<a href='#' style=\"color:#0b57d0\">Shop the new collection</a> before stock runs out.",
      ]),
      date: hrs(5), read: false, starred: false, labels: [], attachments: [],
    },
    {
      id: "e3", folder: "inbox", category: "social",
      from: people.community, to: [me], cc: [],
      subject: "Priya mentioned you in the Weekend Markets thread",
      text: "Priya Kumar wrote:\n\n\"@you any tips on packaging glassware for delivery? I keep getting returns.\"\n\nReply in the community thread or check the full discussion.",
      html: P([
        "Priya Kumar wrote:",
        "<blockquote style=\"border-left:3px solid #dadce0;padding-left:10px;color:#5f6368\">&ldquo;@you any tips on packaging glassware for delivery? I keep getting returns.&rdquo;</blockquote>",
        "Reply in the community thread or check the full discussion.",
      ]),
      date: hrs(8), read: false, starred: false, labels: ["Personal"], attachments: [],
    },
    {
      id: "e4", folder: "inbox", category: "primary",
      from: people.pricing, to: [me], cc: [],
      subject: "Price change alert: 2 of your items are below buybox",
      text: "Good morning,\n\nTwo items in your catalogue are currently priced below the buybox threshold:\n\n- Ceramic Dinner Set — 6% below\n- Oak Serving Board — 3% below\n\nItems below the buybox show fewer results in search. Update your prices from the Seller dashboard.",
      html: P([
        "Good morning,",
        "Two items in your catalogue are currently priced below the buybox threshold:",
        "<ul style=\"margin:0 0 10px 18px;padding:0\"><li>Ceramic Dinner Set — <b>6% below</b></li><li>Oak Serving Board — <b>3% below</b></li></ul>",
        "Items below the buybox show fewer results in search. Update your prices from the Seller dashboard.",
      ]),
      date: hrs(26), read: true, starred: false, labels: ["ShopVerse"], attachments: [],
      snoozedUntil: inDaysAt(1, 9),
    },
    {
      id: "e5", folder: "inbox", category: "promotions",
      from: people.flash, to: [me], cc: [],
      subject: "48-hour flash sale: up to 40% off top sellers",
      text: "The biggest flash sale of the month is live now.\n\nUp to 40% off top-selling home goods, ending this Sunday.\n\nUse code FLASH40 at checkout.",
      html: P([
        "The biggest flash sale of the month is <b>live now</b>.",
        "Up to <b>40% off</b> top-selling home goods, ending this Sunday.",
        "Use code <b>FLASH40</b> at checkout.",
      ]),
      date: hrs(30), read: false, starred: false, labels: [], attachments: [],
    },
    {
      id: "e6", folder: "inbox", category: "primary",
      from: people.review, to: [me], cc: [],
      subject: "Your review was published",
      text: "Your 5-star review for \"Oak Serving Board\" is now live.\n\nThanks for helping other shoppers make a confident purchase.",
      html: P([
        "Your <b>5-star review</b> for &ldquo;Oak Serving Board&rdquo; is now live.",
        "Thanks for helping other shoppers make a confident purchase.",
      ]),
      date: days(1), read: true, starred: true, labels: ["ShopVerse"], attachments: [],
    },
    {
      id: "e7", folder: "inbox", category: "social",
      from: people.social, to: [me], cc: [],
      subject: "3 new followers this week",
      text: "Your store gained 3 new followers this week.\n\nFollowers get notified the moment you list a new product.",
      html: P([
        "Your store gained <b>3 new followers</b> this week.",
        "Followers get notified the moment you list a new product.",
      ]),
      date: days(1, 18), read: true, starred: false, labels: ["Personal"], attachments: [],
    },
    {
      id: "e8", folder: "inbox", category: "primary",
      from: people.shipping, to: [me], cc: [],
      subject: "Shipment SWS-88102 delayed — new delivery date",
      text: "Due to a regional weather advisory, shipment SWS-88102 is delayed by one day.\n\nNew expected delivery: Friday.\n\nNo action needed on your side. We will keep you updated.",
      html: P([
        "Due to a regional weather advisory, shipment <b>SWS-88102</b> is delayed by one day.",
        "New expected delivery: <b>Friday</b>.",
        "No action needed on your side. We will keep you updated.",
      ]),
      date: days(2, 15), read: true, starred: false, labels: [], attachments: [],
    },
    {
      id: "e9", folder: "inbox", category: "primary",
      from: people.finance, to: [me], cc: [{ name: "Accounts Team", email: "accounts@blueprintstudio.example" }],
      subject: "Your tax summary for last month is ready",
      text: "Hi,\n\nYour monthly tax summary is attached.\n\nPayout schedule: every 7th and 21st.\n\nQuestions? Reply to this message or contact your dedicated manager.",
      html: P([
        "Hi,",
        "Your monthly tax summary is attached.",
        "Payout schedule: every <b>7th and 21st</b>.",
        "Questions? Reply to this message or contact your dedicated manager.",
      ]),
      date: days(3, 9), read: true, starred: true, labels: ["Work"],
      attachments: [{ name: "tax-summary-sept.pdf", size: "96 KB" }],
    },
    {
      id: "e10", folder: "inbox", category: "promotions",
      from: people.rewards, to: [me], cc: [],
      subject: "Refer a friend — you both get rewards",
      text: "Share your referral link.\n\nWhen a friend makes their first order, you both earn rewards credit.",
      html: P([
        "Share your referral link.",
        "When a friend makes their first order, <b>you both earn rewards credit</b>.",
        "<a href='#' style=\"color:#0b57d0\">Get your link</a>",
      ]),
      date: days(5, 12), read: true, starred: false, labels: [], attachments: [],
    },

    // ------------------------------- SENT -------------------------------
    {
      id: "s1", folder: "sent", category: "primary",
      from: me, to: [{ name: "Support", email: "support@shopverse.example" }], cc: [],
      subject: "Re: Your order #48211",
      text: "Hi team,\n\nI checked the tracking page and it shows delivered, but I have not received the parcel yet. Could you confirm with the courier?\n\nThanks,",
      html: P([
        "Hi team,",
        "I checked the tracking page and it shows delivered, but I have not received the parcel yet. Could you confirm with the courier?",
        "Thanks,",
      ]),
      date: days(1, 19), read: true, starred: false, labels: ["ShopVerse"], attachments: [],
    },
    {
      id: "s2", folder: "sent", category: "primary",
      from: me, to: [{ name: "Rohan (BluePrint Studio)", email: "rohan@blueprintstudio.example" }], cc: [],
      subject: "Question about bulk pricing",
      text: "Hi Rohan,\n\nI am looking to order 25 units of the serving board. Do you have a bulk rate, and how long is your current lead time?\n\nThanks.",
      html: P([
        "Hi Rohan,",
        "I am looking to order <b>25 units</b> of the serving board. Do you have a bulk rate, and how long is your current lead time?",
        "Thanks.",
      ]),
      date: days(2, 20), read: true, starred: false, labels: ["Work"], attachments: [],
    },
    {
      id: "s3", folder: "sent", category: "primary",
      from: me, to: [{ name: "SwiftShip Support", email: "help@swiftship.example" }], cc: [],
      subject: "Following up on my return request",
      text: "Hello,\n\nThis is a gentle follow-up on return request RR-20412 — it has been pending for a week. Please let me know the next step.\n\nRegards,",
      html: P([
        "Hello,",
        "This is a gentle follow-up on return request <b>RR-20412</b> — it has been pending for a week. Please let me know the next step.",
        "Regards,",
      ]),
      date: days(4, 11), read: true, starred: false, labels: [], attachments: [],
    },

    // ------------------------------ DRAFTS ------------------------------
    {
      id: "d1", folder: "drafts", category: "primary",
      from: me, to: [], cc: [],
      subject: "Warranty claim for the mixer base",
      text: "Hi,\n\nThe mixer base developed a fault after 3 months of normal use. I have the invoice and a short video. What do I need to submit for the warranty claim?",
      html: P([
        "Hi,",
        "The mixer base developed a fault after 3 months of normal use. I have the invoice and a short video. What do I need to submit for the warranty claim?",
      ]),
      date: hrs(5), read: true, starred: false, labels: [], attachments: [],
    },
    {
      id: "d2", folder: "drafts", category: "primary",
      from: me, to: [], cc: [],
      subject: "Re: Shipping rates for the coastal area",
      text: "Thanks for the update. Could you also confirm whether insurance is included in the quoted rate for 5 kg parcels?",
      html: P([
        "Thanks for the update. Could you also confirm whether insurance is included in the quoted rate for 5 kg parcels?",
      ]),
      date: days(1, 16), read: true, starred: false, labels: [], attachments: [],
    },

    // ------------------------------- SPAM -------------------------------
    {
      id: "sp1", folder: "spam", category: "primary",
      from: people.scam1, to: [me], cc: [],
      subject: "URGENT: Verify your account to avoid suspension",
      text: "Your account will be suspended unless you verify your details within 24 hours.\n\nClick here to continue.",
      html: P([
        "<b>Your account will be suspended</b> unless you verify your details within <b>24 hours</b>.",
        "<a href='#' style=\"color:#0b57d0\">Click here to continue.</a>",
      ]),
      date: days(3, 7), read: false, starred: false, labels: [], attachments: [],
    },
    {
      id: "sp2", folder: "spam", category: "primary",
      from: people.scam2, to: [me], cc: [],
      subject: "You won a prize! Claim within 24 hours",
      text: "Congratulations! You have been selected as a prize winner.\n\nClaim your prize now to avoid losing it.",
      html: P([
        "<b>Congratulations!</b> You have been selected as a <b>prize winner</b>.",
        "Claim your prize now to avoid losing it.",
      ]),
      date: days(1, 22), read: false, starred: false, labels: [], attachments: [],
    },

    // ------------------------------ TRASH ------------------------------
    {
      id: "t1", folder: "trash", category: "promotions",
      from: people.newsletter, to: [me], cc: [],
      subject: "Newsletter: end-of-season sale prep starts now",
      text: "Plan your end-of-season sale this week.\n\nSet your discounts, update banners, and notify your followers early.",
      html: P([
        "Plan your end-of-season sale this week.",
        "Set your discounts, update banners, and notify your followers early.",
      ]),
      date: days(7, 13), read: true, starred: false, labels: [], attachments: [],
    },
  ];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function stripHtml(html) {
  try {
    const div = document.createElement("div");
    div.innerHTML = html;
    return (div.textContent || "").replace(/\s+/g, " ").trim();
  } catch {
    return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

export function escHtml(s) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatShort(d) {
  const date = new Date(d);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  if (date.toDateString() === now.toDateString()) return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (date.toDateString() === yest.toDateString()) return "Yst";
  if (now - date < 7 * 864e5) return `${DAYS[date.getDay()]} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (date.getFullYear() === now.getFullYear()) return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
}

export function formatFull(d) {
  return new Date(d).toLocaleString("en-GB", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatFileSize(bytes) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

// Parse a comma/semicolon separated recipient string into [{name, email}].
export function parseRecipients(str) {
  return (str || "")
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean)
    .map((addr) => {
      const m = addr.match(/^<(.+?)>\s*$/);
      const email = (m ? m[1] : addr).trim();
      const name = email.split("@")[0] || email;
      return { name, email };
    });
}

// Build the quoted block used in Reply / Reply all / Forward bodies.
export function quoteMail(mail, { full = false } = {}) {
  if (!mail) return "";
  const head = `On ${formatFull(mail.date)}, ${escHtml(mail.from.name)} &lt;${escHtml(mail.from.email)}&gt; wrote:`;
  const meta = full
    ? `<br/>To: ${escHtml((mail.to || []).map((t) => t.email).join(", "))}<br/>Cc: ${escHtml((mail.cc || []).map((t) => t.email).join(", "))}<br/>Subject: ${escHtml(mail.subject || "(no subject)")}`
    : "";
  const lines = (mail.text || "").split("\n").map(escHtml).join("<br/>");
  const attach = mail.attachments?.length
    ? `<br/><br/>(Attached: ${escHtml(mail.attachments.map((a) => a.name).join(", "))})`
    : "";
  return (
    `<div style="border-left:3px solid #dadce0;padding:4px 0 4px 12px;margin:12px 0;color:#5f6368;font-size:13px;line-height:1.6">` +
    `${head}${meta}<br/><br/>${lines}${attach}</div>`
  );
}

// Appends the user's signature (Settings) to a compose body.
export function withSignature(html, signature) {
  const base = html || "";
  if (!signature?.trim()) return base;
  const sig = `<p style="margin-top:16px;color:#86868b;font-size:12px">--<br/>${escHtml(signature)}</p>`;
  return base ? `${base}${sig}` : sig;
}
