import tokens from "./tokens.json"

export type ThemeName = "noche" | "dia"

function applyGroup(style: CSSStyleDeclaration, prefix: string, group: Record<string, string>) {
  for (const [key, value] of Object.entries(group)) {
    style.setProperty(`--${prefix}-${key}`, value)
  }
}

export function applyTheme(name: ThemeName = "noche") {
  const style = document.documentElement.style
  applyGroup(style, "space", tokens.space)
  applyGroup(style, "radius", tokens.radius)
  applyGroup(style, "font", tokens.font)
  applyGroup(style, "size", tokens.size)
  applyGroup(style, "tracking", tokens.tracking)
  applyGroup(style, "shadow", tokens.shadow)
  applyGroup(style, "target", tokens.target)
  applyGroup(style, "icon", tokens.icon)
  style.setProperty("--mark-min", tokens.mark.min)
  style.setProperty("--mark-cap", tokens.mark.cap)
  for (const [key, value] of Object.entries(tokens[name])) {
    style.setProperty(`--${key}`, value)
  }
  document.documentElement.dataset.theme = name
}
