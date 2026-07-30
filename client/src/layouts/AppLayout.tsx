import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PlusCircle,
  BookOpen,
  Package,
  Truck,
  Bell as BellIcon,
  Settings,
  ChevronDown,
  KeyRound,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ThemeToggle } from "../components/ThemeToggle";
import { LowStockBell } from "../components/LowStockBell";
import { ChangePasswordModal } from "../components/ChangePasswordModal";
import { GlobalSearchBar } from "../components/GlobalSearchBar";
import { useMenuLabels, resolveMenuLabel } from "../hooks/useMenuLabels";

const NAV_ITEMS = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/orders/new", key: "orders", icon: PlusCircle },
  { to: "/khata", key: "khata", icon: BookOpen },
  { to: "/stock", key: "stock", icon: Package },
  { to: "/challans", key: "challans", icon: Truck },
  { to: "/reminders", key: "reminders", icon: BellIcon },
  { to: "/masters", key: "masters", icon: Settings },
];

const BOTTOM_BAR_ITEMS = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/orders/new", key: "orders", icon: PlusCircle },
  { to: "/khata", key: "khata", icon: BookOpen },
  { to: "/stock", key: "stock", icon: Package },
  { to: "/challans", key: "challans", icon: Truck },
  { to: "/reminders", key: "reminders", icon: BellIcon },
  { to: "/masters", key: "masters", icon: Settings },
];

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(now);
  return <span className="hidden font-mono text-xs text-slate-500 dark:text-slate-400 lg:block">{formatted}</span>;
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-700/70">
        <div className="text-right">
          <div className="text-sm font-medium">{user?.name}</div>
          <div className="text-xs text-slate-500">{user?.role}</div>
        </div>
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-48 rounded-xl border border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 shadow-xl backdrop-blur-sm">
          <button
            onClick={() => {
              setOpen(false);
              navigate("/masters?tab=settings&changePassword=1");
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <KeyRound className="h-4 w-4" /> Change Password
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
              navigate("/login");
            }}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-danger hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, setMustChangePassword } = useAuth();
  const { data: menuLabels } = useMenuLabels();

  return (
    <div className="flex h-screen">
      {user?.mustChangePassword && <ChangePasswordModal isOpen onClose={() => setMustChangePassword(false)} />}
      {/* Desktop sidebar */}
      <aside className="no-print hidden w-56 flex-col border-r border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 backdrop-blur md:flex">
        <div className="px-4 py-5 text-lg font-bold text-primary">Indrani Traders</div>
        <nav className="flex-1 space-y-1 px-2">
          {NAV_ITEMS.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {resolveMenuLabel(menuLabels, key)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="no-print flex items-center justify-between gap-3 border-b border-slate-200/70 dark:border-slate-700/70 bg-white/90 dark:bg-slate-900/80 px-4 py-3 backdrop-blur">
          <LiveClock />
          <GlobalSearchBar />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LowStockBell />
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 pb-20 md:pb-4">{children}</main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="no-print fixed bottom-0 left-0 right-0 z-30 flex border-t border-slate-200/70 dark:border-slate-700/70 bg-white/95 dark:bg-slate-900/95 backdrop-blur md:hidden">
        {BOTTOM_BAR_ITEMS.map(({ to, key, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                isActive ? "text-primary" : "text-slate-500 dark:text-slate-400"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {key === "masters" ? "More" : resolveMenuLabel(menuLabels, key)}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
