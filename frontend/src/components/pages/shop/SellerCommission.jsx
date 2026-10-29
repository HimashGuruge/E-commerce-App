import { useState, useEffect, useCallback, useRef } from "react";
import { FiPercent, FiDollarSign, FiCheckCircle, FiX, FiEye, FiTrash2, FiInfo, FiPlusCircle, FiClock } from "react-icons/fi";
import api from "@/utils/api";
import { getPublicSettings } from "@/utils/siteSettings";
import Swal from "sweetalert2";

const rs = (n) => `Rs. ${(Number(n) || 0).toLocaleString()}`;
const dstr = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const statusBadge = {
  pending: "bg-amber-100 text-amber-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-rose-100 text-rose-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function monthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return [first.toISOString().slice(0, 10), last.toISOString().slice(0, 10)];
}

export default function SellerCommission() {
  const [seller, setSeller] = useState(null);
  const [balance, setBalance] = useState(null);
  const [payments, setPayments] = useState([]);
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(monthRange()[0]);
  const [to, setTo] = useState(monthRange()[1]);
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentRef, setPaymentRef] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const [b, p] = await Promise.all([
        api.get("/api/sellers/commission/balance"),
        api.get("/api/sellers/commission/payments"),
      ]);
      if (b.data.success) setBalance(b.data.balance);
      if (p.data.success) setPayments(p.data.payments || []);
    } catch (err) {
      console.error("Commission fetch error:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await api.get("/api/sellers/me");
        if (me.data.success) setSeller(me.data.seller);
      } catch {}
      try {
        const s = await getPublicSettings();
        setInstructions(s?.commissionPayment?.instructions || "");
      } catch {}
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const sellerPays = seller?.commissionMode === "seller_pays";

  // ---------------- Submit ----------------
  const submit = async () => {
    const amount = Number(paidAmount);
    if (!from || !to) return Swal.fire({ icon: "error", title: "Pick a start and end date" });
    if (new Date(to) < new Date(from)) return Swal.fire({ icon: "error", title: "End date must be on or after the start date" });
    if (paidAmount === "" || !Number.isFinite(amount) || amount < 0)
      return Swal.fire({ icon: "error", title: "Enter the amount you paid (Rs.)" });

    const ok = await Swal.fire({
      icon: "question",
      title: "Submit commission payment",
      html: `Period: <b>${dstr(from)} → ${dstr(to)}</b><br/>Paid: <b>${rs(amount)}</b><br/><br/>The platform will verify the amount and your proof.`,
      showCancelButton: true,
      confirmButtonText: "Submit",
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("periodFrom", from);
      fd.append("periodTo", to);
      fd.append("paidAmount", paidAmount);
      fd.append("paymentMethod", paymentMethod);
      fd.append("paymentRef", paymentRef);
      fd.append("paidAt", paidAt);
      fd.append("note", note);
      if (file) fd.append("proof", file);

      const res = await api.post("/api/sellers/commission/payments", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      Swal.fire({ icon: "success", title: "Submitted", timer: 1500, showConfirmButton: false });
      setPaidAmount(""); setPaymentMethod(""); setPaymentRef(""); setNote("");
      setPaidAt(new Date().toISOString().slice(0, 10));
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      const id = res.data?.payment?._id;
      await refresh();
      if (!id) return;
      // Show the freshly stored proof so the seller can confirm what was saved.
      try {
        const proofRes = await api.get(`/api/sellers/commission/my-proof/${id}`);
        window.open(proofRes.data.proof.signedUrl, "_blank", "noopener");
      } catch {}
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: err.response?.data?.error || err.response?.data?.message || "Submission failed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- View my proof ----------------
  const viewMyProof = async (p) => {
    try {
      const res = await api.get(`/api/sellers/commission/my-proof/${p._id}`);
      window.open(res.data.proof.signedUrl, "_blank", "noopener");
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.message || "Could not open the proof" });
    }
  };

  // ---------------- Cancel a pending submission ----------------
  const cancel = async (p) => {
    const ok = await Swal.fire({
      icon: "question",
      title: "Cancel this submission?",
      text: "The uploaded proof will be deleted. You can submit again for this period.",
      showCancelButton: true,
      confirmButtonText: "Cancel submission",
      confirmButtonColor: "#ef4444",
      reverseButtons: true,
    });
    if (!ok.isConfirmed) return;
    try {
      await api.delete(`/api/sellers/commission/payments/${p._id}`);
      Swal.fire({ icon: "success", title: "Cancelled", timer: 1500, showConfirmButton: false });
      refresh();
    } catch (err) {
      Swal.fire({ icon: "error", title: err.response?.data?.message || "Could not cancel" });
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin mx-auto my-16" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-[1100px] mx-auto space-y-6">
      <div>
        <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">Commission</h2>
        <p className="text-sm text-shopmuted mt-1.5">
          {sellerPays
            ? "You remit your commission directly — track your balance and submit payments with proof."
            : "Your commission is deducted from payouts automatically. Details below."}
        </p>
      </div>

      {/* ================= Balance (seller_pays) ================= */}
      {sellerPays && balance && (
        <div className="bg-white rounded-[13px] p-6 border border-shopborder">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="col-span-2 lg:col-span-1">
              <span className="text-xs text-shopmuted uppercase tracking-wide">Net balance</span>
              <p className={`text-2xl font-bold mt-1 ${balance.credit ? "text-shopgreen" : "text-shoptext"}`}>
                {rs(balance.balance)}
              </p>
              <p className="text-[11px] text-shopmuted mt-1">
                {balance.credit ? "Credit — contact support" : "To remit, or paid so far"}
              </p>
            </div>
            <div>
              <span className="text-xs text-shopmuted uppercase tracking-wide">Gross COD (verified)</span>
              <p className="text-lg font-semibold text-shoptext mt-1">{rs(balance.grossDue)}</p>
            </div>
            <div>
              <span className="text-xs text-shopmuted uppercase tracking-wide">Commission due</span>
              <p className="text-lg font-semibold text-shoptext mt-1">{rs(balance.eligibleCommission)}</p>
            </div>
            <div>
              <span className="text-xs text-shopmuted uppercase tracking-wide">Cut from payouts</span>
              <p className="text-lg font-semibold text-shoptext mt-1">{rs(balance.deductedPaid)}</p>
            </div>
            <div>
              <span className="text-xs text-shopmuted uppercase tracking-wide">Verified as paid</span>
              <p className="text-lg font-semibold text-[#ad6b00] mt-1">{rs(balance.verifiedPaid)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ================= Instructions (admin-written) ================= */}
      {sellerPays && (
        <div className="bg-white rounded-[13px] p-6 border border-shopborder">
          <div className="flex items-center gap-2 mb-3">
            <FiInfo className="w-4 h-4 text-shopprimary" />
            <h3 className="font-bold text-shoptext">How to pay</h3>
          </div>
          {instructions ? (
            <p className="text-sm text-[#3d4557] whitespace-pre-line leading-relaxed">{instructions}</p>
          ) : (
            <p className="text-sm text-shopmuted">
              Payment instructions have not been set yet. Please contact support with any questions.
            </p>
          )}
        </div>
      )}

      {/* ================= Deduct mode notice ================= */}
      {!sellerPays && (
        <div className="bg-white rounded-[13px] p-6 border border-shopborder flex items-start gap-3">
          <FiCheckCircle className="w-5 h-5 text-shopgreen mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-shoptext">Commission handled automatically</h3>
            <p className="text-sm text-shopmuted mt-1">
              Your commission ({seller?.commissionRate || 0}%) is deducted from each payout batch automatically.
              You do not need to remit anything separately. See <b>Earnings</b> for the details.
            </p>
          </div>
        </div>
      )}

      {sellerPays && (
        <>
          {/* ================= Submit form ================= */}
          <div className="bg-white rounded-[13px] p-6 border border-shopborder">
            <div className="flex items-center gap-2 mb-5">
              <FiPlusCircle className="w-4 h-4 text-shopprimary" />
              <h3 className="font-bold text-shoptext">Submit a commission payment</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">From (inclusive)</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">To (inclusive)</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Amount paid (Rs.)</label>
                <input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder="e.g. 450.00"
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Paid on (date)</label>
                <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Payment method</label>
                <input type="text" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. bank transfer, online banking"
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div>
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Transaction / UTR reference</label>
                <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. NEFT-447192"
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Note (optional)</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows="2"
                  placeholder="Anything the admin should know about this payment"
                  className="w-full px-3.5 py-2.5 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white resize-y" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-shopmuted mb-1.5">Payment proof (screenshot / receipt — image or PDF)</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-sm text-shopmuted file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-shopprimarylight file:text-shopprimary file:font-medium file:cursor-pointer cursor-pointer"
                />
              </div>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-5 px-5 py-2.5 bg-shopprimary text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {submitting ? "Submitting…" : "Submit for verification"}
            </button>
          </div>

          {/* ================= My submissions ================= */}
          <div className="bg-white rounded-[13px] p-6 border border-shopborder">
            <h3 className="font-bold text-shoptext mb-4">My submissions</h3>
            {payments.length === 0 ? (
              <p className="text-sm text-shopmuted">No submissions yet. Your first payment will appear here once submitted.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-shopmuted border-b border-shopborder">
                      <th className="px-2 py-2 font-semibold">Period</th>
                      <th className="px-2 py-2 font-semibold">Commission due</th>
                      <th className="px-2 py-2 font-semibold">Paid</th>
                      <th className="px-2 py-2 font-semibold">Ref</th>
                      <th className="px-2 py-2 font-semibold">Status</th>
                      <th className="px-2 py-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id} className="border-b border-shopborder/60">
                        <td className="px-2 py-2.5 text-[#3d4557] whitespace-nowrap">
                          {dstr(p.periodFrom)} → {dstr(p.periodTo)}
                        </td>
                        <td className="px-2 py-2.5 text-[#3d4557]">{rs(p.grossCommission)}</td>
                        <td className="px-2 py-2.5 text-[#3d4557]">{rs(p.paidAmount)}</td>
                        <td className="px-2 py-2.5 text-[#3d4557] text-xs">
                          {p.paymentRef || "—"}
                          {p.paymentRef && p.paymentMethod && <span className="block text-[11px] text-shopmuted">{p.paymentMethod} · {dstr(p.paidAt)}</span>}
                        </td>
                        <td className="px-2 py-2.5">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusBadge[p.status] || "bg-slate-100 text-slate-600"}`}>
                            {p.status}
                          </span>
                          {p.status === "rejected" && p.rejectReason && (
                            <span className="block text-[11px] text-rose-600 mt-1" title={p.rejectReason}>
                              {p.rejectReason}
                            </span>
                          )}
                          {p.status === "pending" && p.hasProof && (
                            <span className="block text-[11px] text-shopmuted mt-0.5 inline-flex items-center gap-1">
                              <FiClock className="w-3 h-3" /> awaiting admin review
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2.5 text-right whitespace-nowrap">
                          {p.hasProof && (
                            <button onClick={() => viewMyProof(p)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 inline-flex items-center gap-1"
                              title="Open my proof (link expires soon)"
                            >
                              <FiEye className="w-3.5 h-3.5" /> Proof
                            </button>
                          )}
                          {p.status === "pending" && (
                            <button onClick={() => cancel(p)}
                              className="text-xs px-2.5 py-1.5 ml-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center gap-1"
                            >
                              <FiTrash2 className="w-3.5 h-3.5" /> Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
