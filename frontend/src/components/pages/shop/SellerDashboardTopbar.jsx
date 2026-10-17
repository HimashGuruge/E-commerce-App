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
    <header className="sticky top-0 z-20 bg-white border-b border-shopborder px-4 md:px-8 py-4 flex items-center justify-between min-h-[75px]">
      <div className="flex items-center gap-4">
        <button onClick={toggleMobile} className="lg:hidden p-2 hover:bg-[#f5f6fc] rounded-lg">
          <RxHamburgerMenu className="w-5 h-5 text-shopmuted" />
        </button>
        <div>
          <div className="text-[12px] text-shopmuted mb-1">Seller Portal / {title}</div>
          <div className="text-base md:text-lg font-bold text-shoptext leading-none">{title}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={user?.shopName ? `/store/${encodeURIComponent(user.shopName)}` : "/"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3.5 py-2 bg-shopprimarylight text-shopprimary hover:bg-[#e0e7ff] rounded-[8px] text-sm font-semibold transition-colors"
        >
          <MdStore className="w-4 h-4" />
          <span className="hidden sm:inline">Preview Store</span>
          <FiExternalLink className="w-3 h-3" />
        </a>
      </div>
    </header>
  );
}
