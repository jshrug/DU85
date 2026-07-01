import "./index.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./lib/AuthContext.jsx";
import AuthGate from "./components/AuthGate.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

window.addEventListener("vite:preloadError", () => {
  if (sessionStorage.getItem("preloadErrorReloaded") === "1") return;
  sessionStorage.setItem("preloadErrorReloaded", "1");
  window.location.reload();
});
window.addEventListener("load", () => {
  sessionStorage.removeItem("preloadErrorReloaded");
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <AuthGate>
            <App />
          </AuthGate>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);