import "./globals";
import React from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/outfit";
import { App } from "./App";
import "./card.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
