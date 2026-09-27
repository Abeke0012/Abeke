import { createRoot } from "react-dom/client";
import "./tokens.css";
import "./styles.css";
import { initInput } from "./driver.js";
import App from "./App.jsx";

initInput();
if (import.meta.env.DEV) import("./timeline.js").then((T) => { window.__overlaps = T.checkOverlaps(); console.info("act overlaps", window.__overlaps); });
createRoot(document.getElementById("root")).render(<App />);
