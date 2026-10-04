import { CheckCircle2, Clock, Truck, AlertCircle } from "lucide-react";

const STATUS_CONFIG = {
  delivered: { color: "bg-brand-50 text-brand-700 border-brand-100", icon: CheckCircle2 },
  pending: { color: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  processing: { color: "bg-blue-50 text-blue-700 border-blue-100", icon: Clock },
  shipped: { color: "bg-purple-50 text-purple-700 border-purple-100", icon: Truck },
  cancelled: { color: "bg-rose-50 text-rose-700 border-rose-100", icon: AlertCircle },
  failed: { color: "bg-red-50 text-red-700 border-red-100", icon: AlertCircle },
};

export default function OrderStatusBadge({ status }) {
  const s = (status || "pending").toLowerCase();
  const config = STATUS_CONFIG[s] || STATUS_CONFIG.pending;
  const Icon = config.icon;

  return (
    <div
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-black uppercase tracking-wider ${config.color}`}
    >
      <Icon size={14} />
      <span>{status || "Pending"}</span>
    </div>
  );
}
