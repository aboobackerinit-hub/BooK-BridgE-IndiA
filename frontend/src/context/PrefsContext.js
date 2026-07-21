import React, { createContext, useContext, useEffect, useState } from "react";

const PrefsContext = createContext(null);

const translations = {
  en: {
    store: "Store", reviews: "Community", cart: "Cart", chat: "Discussion",
    dashboard: "Dashboard", profile: "My Profile", settings: "Settings",
    orders: "My Orders", logout: "Logout", welcome_back: "Welcome back",
    login_title: "Login to your account", search_placeholder: "Search title, author, ISBN...",
  },
  ml: {
    store: "സ്റ്റോർ", reviews: "കമ്മ്യൂണിറ്റി", cart: "കാർട്ട്", chat: "ചർച്ച",
    dashboard: "ഡാഷ്ബോർഡ്", profile: "എൻ്റെ പ്രൊഫൈൽ", settings: "സെറ്റിംഗ്സ്",
    orders: "എൻ്റെ ഓർഡറുകൾ", logout: "പുറത്തുകടക്കുക", welcome_back: "തിരികെ സ്വാഗതം",
    login_title: "അക്കൗണ്ടിലേക്ക് ലോഗിൻ ചെയ്യുക", search_placeholder: "പേര്, രചയിതാവ്, ISBN തിരയുക...",
  },
};

export const PrefsProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem("bb_theme") || "light");
  const [lang, setLang] = useState(() => localStorage.getItem("bb_lang") || "en");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("bb_theme", theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem("bb_lang", lang); }, [lang]);

  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;

  return (
    <PrefsContext.Provider value={{ theme, setTheme, lang, setLang, t }}>
      {children}
    </PrefsContext.Provider>
  );
};

export const usePrefs = () => useContext(PrefsContext);
