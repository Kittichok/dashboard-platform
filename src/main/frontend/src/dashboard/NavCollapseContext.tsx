import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const NAV_COLLAPSED_STORAGE_KEY = "ui.nav.collapsed";

type NavCollapseContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const NavCollapseContext = createContext<NavCollapseContextValue | null>(null);

function readStoredCollapsePreference() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function NavCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(readStoredCollapsePreference);

  useEffect(() => {
    try {
      window.localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, String(collapsed));
    } catch {
      // Ignore storage write failures and keep the in-memory preference active.
    }
  }, [collapsed]);

  return (
    <NavCollapseContext.Provider
      value={{
        collapsed,
        toggle: () => setCollapsed((current) => !current)
      }}
    >
      {children}
    </NavCollapseContext.Provider>
  );
}

export function useNavCollapse() {
  const context = useContext(NavCollapseContext);

  if (!context) {
    throw new Error("useNavCollapse must be used within NavCollapseProvider.");
  }

  return context;
}
