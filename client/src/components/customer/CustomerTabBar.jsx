import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Utensils, ReceiptText, Search, Heart, ShoppingBag } from "lucide-react";
import { useCart } from "../../hooks/useCart";
import { useFavorites } from "../../hooks/useFavorites";
import { useCustomerUI } from "../../hooks/useCustomerUI";

const CustomerTabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { totalItemsCount } = useCart();
  const { favoriteCount } = useFavorites();
  const {
    isCartOpen,
    isSearchOpen,
    isCustomerNavigationHidden,
    lastTableId,
    openCart,
    closeCart,
    openSearch,
    closeSearch,
  } = useCustomerUI();

  if (isCustomerNavigationHidden) return null;

  const path = location.pathname || "";
  const isMenuPage = path.startsWith("/menu/table");
  const activeTab = isMenuPage
    ? "menu"
    : path.startsWith("/favorites")
      ? "favorites"
      : "orders";

  // Switching tabs always dismisses the search overlay and the cart drawer so
  // they can never stay on top of the page we are navigating to.
  const goTo = (path) => {
    closeSearch();
    closeCart();
    navigate(path);
  };

  // The menu needs a table id, which is only known from the QR link, so reuse
  // the last scanned table and fall back to the rescan hint when there is none.
  const handleMenuTab = () => {
    closeSearch();
    closeCart();

    if (isMenuPage) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (lastTableId) {
      navigate(`/menu/table/${lastTableId}`);
      return;
    }

    toast.info(t("rescan_qr_hint"));
  };

  // The cart drawer lives on the menu page because that is where the order for
  // this table is placed, so from any other page we first go back to the menu.
  const handleCartTab = () => {
    closeSearch();

    if (isMenuPage) {
      openCart();
      return;
    }

    if (lastTableId) {
      navigate(`/menu/table/${lastTableId}?cart=1`);
      return;
    }

    toast.info(t("rescan_qr_hint"));
  };

  const tabs = [
    {
      id: "menu",
      label: t("tab_menu"),
      icon: Utensils,
      isActive: isMenuPage && !isSearchOpen && !isCartOpen,
      onClick: handleMenuTab,
    },
    {
      id: "orders",
      label: t("tab_orders"),
      icon: ReceiptText,
      isActive: !isMenuPage && activeTab === "orders" && !isSearchOpen,
      onClick: () => goTo("/my-orders"),
    },
    {
      id: "search",
      label: t("tab_search"),
      icon: Search,
      isActive: isSearchOpen,
      onClick: isSearchOpen ? closeSearch : openSearch,
    },
    {
      id: "favorites",
      label: t("tab_favorites"),
      icon: Heart,
      isActive: activeTab === "favorites" && !isSearchOpen,
      count: favoriteCount,
      onClick: () => goTo("/favorites"),
    },
    {
      id: "cart",
      label: t("tab_cart"),
      icon: ShoppingBag,
      isActive: isMenuPage && isCartOpen,
      count: totalItemsCount,
      onClick: handleCartTab,
    },
  ];

  return (
    <nav
      aria-label={t("customer_tabs_label")}
      className="fixed bottom-4 left-0 right-0 z-[45] mx-auto max-w-md px-4 pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center gap-1 rounded-full border border-cafe-700 bg-cafe-900/95 p-1.5 shadow-xl backdrop-blur dark:border-recipe-border dark:bg-recipe-card/95 dark:shadow-black/60">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={tab.onClick}
              aria-current={tab.isActive ? "page" : undefined}
              aria-label={
                tab.id === "cart" && tab.count > 0
                  ? t("cart_item_count", { total: tab.count })
                  : tab.label
              }
              className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-bold leading-none transition-colors ${
                tab.isActive
                  ? "bg-gold-500 text-cafe-900 shadow-md dark:bg-recipe-orange dark:text-[#17181c] dark:shadow-lg"
                  : "text-cafe-200 hover:bg-cafe-800 hover:text-white dark:text-recipe-muted dark:hover:bg-recipe-pill dark:hover:text-recipe-text"
              }`}
            >
              <span className="relative shrink-0">
                <Icon
                  className={`h-4 w-4 ${
                    tab.id === "favorites" && tab.isActive ? "fill-cafe-900 dark:fill-white" : ""
                  }`}
                />
                {tab.count > 0 && (
                  <span
                    key={tab.count}
                    className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-extrabold text-white"
                  >
                    {tab.count}
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default CustomerTabBar;
