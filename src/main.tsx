import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/400-italic.css"
import "@fontsource/jetbrains-mono/500.css"
import "@fontsource/space-grotesk/600.css"
import React from "react"
import ReactDOM from "react-dom/client"

import { applyTheme } from "./brand/applyTheme"
import App from "./shell/App"

applyTheme("noche")

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
