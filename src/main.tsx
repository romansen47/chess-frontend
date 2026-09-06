import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./boardMoveAnimation.css";
import { installBoardMoveAnimationTiming } from "./boardMoveAnimation";

installBoardMoveAnimationTiming();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
