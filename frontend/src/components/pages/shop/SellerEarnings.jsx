import { useState, useEffect } from "react";
import { FiDollarSign, FiTrendingUp, FiPercent, FiBarChart2 } from "react-icons/fi";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from "chart.js";
import api from "@/utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function SellerEarnings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const { data: res } = await api.get(`/api/sellers/earnings?period=${period}`);
        if (res.success) setData(res.earnings);
      } catch (err) {
        console.error("Earnings fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [period]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-shopprimary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const chartData = {
    labels: (data?.dailyBreakdown || []).map((d) => d.date?.slice(5)),
    datasets: [{
      label: "Revenue",
      data: (data?.dailyBreakdown || []).map((d) => d.amount),
      borderColor: "#4f46e5",
      backgroundColor: "rgba(129, 140, 248, 0.14)",
      fill: true,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#172033", padding: 12, cornerRadius: 8 } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: "#eef0f5" }, beginAtZero: true } },
  };

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-extrabold text-shoptext tracking-[-0.6px]">Earnings</h2>
          <p className="text-sm text-shopmuted mt-1.5">Track your revenue and payouts</p>
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)}
          className="px-3.5 py-2 border border-shopborder rounded-lg text-sm text-[#3d4557] focus:border-shopprimary outline-none bg-white"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[13px] p-5 border border-shopborder">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-shopmuted uppercase tracking-wide">Total Revenue</span>
            <FiDollarSign className="w-4 h-4 text-shopgreen" />
          </div>
          <p className="text-2xl font-bold text-shoptext">Rs. {(data?.totalRevenue || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[13px] p-5 border border-shopborder">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-shopmuted uppercase tracking-wide">Commission</span>
            <FiPercent className="w-4 h-4 text-[#ad6b00]" />
          </div>
          <p className="text-2xl font-bold text-shoptext">{data?.commissionRate || 0}%</p>
        </div>
        <div className="bg-white rounded-[13px] p-5 border border-shopborder">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-shopmuted uppercase tracking-wide">Commission Deducted</span>
            <FiTrendingUp className="w-4 h-4 text-shopred" />
          </div>
          <p className="text-2xl font-bold text-shoptext">Rs. {(data?.commissionDeduction || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[13px] p-5 border border-shopborder">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-shopmuted uppercase tracking-wide">Net Earnings</span>
            <FiBarChart2 className="w-4 h-4 text-shopprimary" />
          </div>
          <p className="text-2xl font-bold text-shopgreen">Rs. {(data?.netEarnings || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-[13px] p-6 border border-shopborder">
        <h3 className="font-bold text-shoptext mb-4">Revenue Trend</h3>
        <div className="h-64">
          {(data?.dailyBreakdown || []).length > 0 ? (
            <Line data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center text-shopmuted">
              <p className="text-sm">No revenue data for this period</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
