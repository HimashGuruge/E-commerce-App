import { motion } from "framer-motion";
import { Clock, CheckCircle2, Truck } from "lucide-react";

const STEPS = [
  { label: "Ordered", icon: Clock },
  { label: "Processing", icon: Clock },
  { label: "Shipped", icon: Truck },
  { label: "Arrived", icon: CheckCircle2 },
];

const STEP_ORDER = { pending: 0, processing: 1, shipped: 2, delivered: 3 };

export default function OrderProgressTracker({ currentStatus }) {
  if (!currentStatus || currentStatus.toLowerCase() === "cancelled" || currentStatus.toLowerCase() === "failed") return null;

  const activeStep = STEP_ORDER[currentStatus.toLowerCase()] ?? 0;
  const progressWidth = (activeStep / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full py-8">
      <div className="relative flex justify-between">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -translate-y-1/2 rounded-full" />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressWidth}%` }}
          transition={{ duration: 1, ease: "easeInOut" }}
          className="absolute top-1/2 left-0 h-1 bg-brand-600 -translate-y-1/2 rounded-full"
        />
        {STEPS.map((step, index) => {
          const isActive = index <= activeStep;
          const isCurrent = index === activeStep;
          const Icon = step.icon;
          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  scale: isCurrent ? 1.2 : 1,
                  borderColor: isActive ? "#ffffff" : "#f1f5f9",
                  color: isActive ? "#ffffff" : "#cbd5e1",
                }}
                className="w-10 h-10 rounded-full flex items-center justify-center border-4 shadow-sm transition-all duration-500"
              >
                {isActive && index < activeStep ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </motion.div>
              <span
                className={`text-[9px] font-black uppercase mt-3 tracking-tighter ${
                  isActive ? "text-brand-600" : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
