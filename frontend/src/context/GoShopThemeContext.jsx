import React, { createContext, useContext, useEffect, useState } from "react";

const GoShopThemeContext = createContext();

export const GoShopThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("goshop_theme") || "dark";
  });

  useEffect(() => {
    localStorage.setItem("goshop_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light-mode");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <GoShopThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === "dark" }}>
      {children}
    </GoShopThemeContext.Provider>
  );
};

export const useGoShopTheme = () => useContext(GoShopThemeContext);
