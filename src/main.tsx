import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

window.addEventListener("error", (event) => {
  console.error(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
