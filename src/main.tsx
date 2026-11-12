import React from "react";
import { createRoot } from "react-dom/client";
import { AuthProvider } from "./auth";
import App from "./App";
import "./styles.css";
import "./polish.css";
import { ThemeProvider } from "./theme";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
