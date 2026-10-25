import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { LifeGridProvider } from "./context/LifeGridContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <LifeGridProvider>
        <App />
      </LifeGridProvider>
    </AuthProvider>
  </StrictMode>
);
