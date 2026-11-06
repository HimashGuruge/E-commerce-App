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
    <header className="sticky top-0 z-20 bg-white border-b border-shopborder px-3 md:px-4 py-2.5 flex items-center justify-between min-h-[54px]">
      <div className="flex items-center gap-3">
        <button onClick={toggleMobile} className="lg:hidden p-1.5 hover:bg-[#f5f6fc] rounded-md">
          <RxHamburgerMenu className="w-[18px] h-[18px] text-shopmuted" />
        </button>
        <div>
          <div className="text-[11px] text-shopmuted mb-0.5">Seller Portal / {title}</div>
          <div className="text-sm md:text-[15px] font-bold text-shoptext leading-none">{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href={user?.shopName ? `/store/${encodeURIComponent(user.shopName)}` : "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-shopprimarylight text-shopprimary hover:bg-[#e0e7ff] rounded-md text-xs font-semibold transition-colors"
        >
          <MdStore className="w-4 h-4" />
          <span className="hidden sm:inline">Preview Store</span>
          <FiExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
}
