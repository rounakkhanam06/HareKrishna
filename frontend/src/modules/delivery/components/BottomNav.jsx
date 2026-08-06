import React from "react";
import { NavLink } from "react-router-dom";
import { Home, IndianRupee, History, User } from "lucide-react";

const BottomNav = () => {
  const navItems = [
    { path: "/delivery/dashboard", label: "Home", icon: Home },
    { path: "/delivery/earnings", label: "Earnings", icon: IndianRupee },
    { path: "/delivery/history", label: "History", icon: History },
    { path: "/delivery/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className="flex-1 flex flex-col items-center justify-center h-full relative transition-all"
          >
            {({ isActive }) => (
              <div
                className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-full transition-all duration-300 min-w-[64px] ${
                  isActive
                    ? "bg-primary/10 text-primary scale-105"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                <Icon
                  size={21}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-colors duration-300 ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                />
                <span
                  className={`text-[10px] font-bold tracking-tight mt-0.5 transition-colors duration-300 leading-tight ${
                    isActive ? "text-primary" : "text-slate-400"
                  }`}
                >
                  {label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default BottomNav;

