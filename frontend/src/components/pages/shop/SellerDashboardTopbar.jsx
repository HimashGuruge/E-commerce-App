import { RxHamburgerMenu } from "react-icons/rx";
import { MdStore } from "react-icons/md";
import { FiExternalLink } from "react-icons/fi";

const PAGE_TITLES = {
  "": "Overview",
  "products": "Products",
  "add-product": "Add Product",
  "edit-product": "Edit Product",
  "orders": "Orders",
  "earnings": "Earnings",
  "messages": "Messages",
  "settings": "Shop Settings",
};

export default function SellerDashboardTopbar({ user, toggleMobile }) {
  const path = window.location.pathname.split("/seller/dashboard/")[1] || "";
  const segment = path.split("/")[0];
  const title = PAGE_TITLES[segment] || "Seller Dashboard";

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button onClick={toggleMobile} className="lg:hidden p-2 hover:bg-slate-100 rounded-lg">
          <RxHamburgerMenu className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-lg md:text-xl font-bold text-slate-900">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={user?.shopName ? `/store/${encodeURIComponent(user.shopName)}` : "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-600 hover:bg-brand-100 rounded-lg text-sm font-medium transition-colors"
        >
          <MdStore className="w-4 h-4" />
          Preview Store
          <FiExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
}
