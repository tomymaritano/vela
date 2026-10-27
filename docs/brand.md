# Vela

Vela is an IDE where the agent is part of the team, not autocomplete with extra steps. Everything below exists to hold that idea: the code is the brightest thing on the screen, the agent has a fixed place, and it never changes anything you cannot see.

The brand has two faces. Vela is the professional tool: dark, dense, quiet. Vela Kids is the front door: light, round, with the result larger than the code. They share the symbol, the accent, and the voice. They do not share the palette or the interface type.

Values live in `src/brand/tokens.json`. The theme that runs in the window is Noche. Día is defined for Kids, for print, and for anyone who needs it. There is no switcher: the app has no settings screen. No component writes a literal color.

The repository is English, including the sentences a person reads. The project is open source.

## The name

Vela, from a sail. Always written Vela, with an initial capital and the rest in lowercase. Never VELA, never vela, never Vëla. The sub-brand is Vela Kids, two words, no hyphen.

The metaphor leads: a sail does not row for you. It takes the wind that is already there. That is the relationship between the person and the agent, and the symbol comes from it.

## The symbol

A triangle with the mast on the left and the point on the right: a filled sail seen from the side. That it is also the Play icon is not explained.

Construction. A grid of 96. Vertical mast at x = 24, from y = 12 to y = 84. Point at (78, 48). Width-to-height ratio 3:4, sharp vertices, no radius. Do not redraw it by eye: use the file in `public/brand/`. The file `viewBox` is the triangle (`24 12 54 72`). Clear space is applied outside the file, not inside it.

Clear space. The minimum air around the symbol is 24 units of the 96 grid, one third of the triangle's height (72). Nothing enters that zone: not text, not a border, not the edge of a card. In the lockup, that air is the gap between the symbol and the wordmark.

Minimum size. 16 px tall on screen, 6 mm in print. Below that the point fills in. The favicon uses the symbol alone, never the lockup.

Inks. One ink per application, chosen by the background:

| Background | File | Token |
|---|---|---|
| Dark (`bg-000`, `bg-100`) | `vela-marca-azul-noche.svg` | `accent-100` in Noche |
| Light (`bg-000` in Día) | `vela-marca-azul-dia.svg` | `accent-100` in Día |
| Light, monochrome | `vela-marca-tinta.svg` | `ink-100` in Día |
| On a saturated color or a photo | `vela-marca-blanco.svg` | white |

Do not. Do not rotate it. Do not stretch it. Do not add a gradient, a shadow, an outline, or a striped fill. Do not enclose it in a circle. Do not use it as a list bullet. Do not draw a 3D version. Do not place it on a detailed photo where the point disappears.

## The wordmark

The wordmark is type, not a drawing: Space Grotesk SemiBold (600), tracking +4%, in `ink-100`. There is no logo file with outlined letters. Whoever needs it sets it in the font.

Horizontal lockup. Symbol plus wordmark, separated by the symbol's clear space. The cap height of the V matches the height of the symbol. Space Grotesk 600 puts the cap height at 0.7 of the em (`mark.cap` in `tokens.json`). The wordmark is trimmed to that box (`cap` / `alphabetic`) so it aligns to the symbol, not to the geometric center of the font.

Sub-brand lockup. Vela in `ink-100` plus Kids in `accent-100`, same line, same size, one space between the words. In Kids the wordmark is set in Nunito ExtraBold (800), with no extra tracking. That is the only exception to Space Grotesk.

## Color

Vela is dark first. Noche is the product theme. Día exists for Kids, for print, and for anyone who needs it.

Roles. `bg-000` is the floor. `bg-100` is the side panels. `bg-200` is the title and status bars. `bg-300` is fields and chips. `bg-400` is the active or selected state. `line-100` separates panels at the same level. `line-200` is the edge between the app and its chrome. Text steps down from `ink-100` (what you read) to `ink-300` (labels and metadata). `ink-200` is secondary text that is still read. `ink-400` is only for line numbers and timestamps.

The accent is earned. `accent-100` marks the active tab, the caret, what the agent does, and the fill of a primary button. If it shows up anywhere else, something is wrong. A primary button uses `accent-100` as the background and `on-accent` as the text.

Semantics. `ok-100`, `warn-100`, and `danger-100` say state and nothing else. They do not replace the accent. Every state is also said with an icon and a word.

Syntax. The six `syntax-*` tokens are part of the identity. They stay saturated in Noche and get darker, not duller, in Día. They do not use `accent-100`. Comments are not italic.

Accessibility. Every text color reaches 4.5:1 against its background in both themes (3:1 from 24 px). When a pair has to be told apart, choose blue and orange before red and green.

## Typography

Four families, each with one job:

- Space Grotesk (600) is the brand only. Never in the interface, never in running text.
- Inter (400 / 500 / 600) is the whole Vela interface. 13 px is the body.
- JetBrains Mono (400 / 500) is code, paths, branches, and anything a person could paste into a terminal. A file name is mono.
- Nunito (600 / 700 / 800) is Vela Kids only, where the body rises to 15 px.

Small-cap labels use +0.09em of tracking and weight 600. Titles use `text-wrap: balance`. Nothing is italic except the ghost text of an agent suggestion and the name of an unsaved file.

## Spacing, radii, and surfaces

The scale is `space-1` through `space-7` in `tokens.json`. Do not invent values in between. Sibling groups are built with flex or grid and `gap`, never with loose margins. The symbol's clear space is the exception: it comes from the symbol grid, not from the scale.

Radii grow with the object: `radius-sm` on chips and icons, `radius-md` on buttons and fields, `radius-lg` on cards and panels, `radius-xl` on large surfaces and on all of Kids, `radius-pill` on states and counters. In Vela the border does the work a shadow does elsewhere. `shadow-overlay` exists only for what actually floats: the command palette and menus.

Click targets. 32 px minimum height on Vela controls. 44 px everywhere in Vela Kids.

## Iconography

A grid of 20, a 1.5 px stroke, round caps and joins, no fill except the brand symbol. Icons take the color of the text they sit with, never the accent, with one exception: the agent icon. An icon alone, with no label, has an `aria-label`.

Never use an emoji as an interface icon. Not in Vela, and not in Kids.

## Voice

English, the way a teammate talks. Short sentences. No exclamation marks except when something went well for a kid in Kids.

The product talks about what happened, not about what the system did. "2 files changed", not "The operation has completed". An error says what happened and what to do: "Session 4f2 does not exist. Try the session list." The agent proposes. It does not announce. "Found the cause" is fine. "I have solved your problem" is not. In Kids the agent asks. It never gives the answer, even when asked twice: it gives a hint and hands the question back.

## Vela Kids

Same brand, a different hierarchy. The result takes two thirds of the screen and the code is the narrow column. Each line is a rounded block colored by type, and the inside is real code. The agent is named Compa, and the label "Doesn't write for you" is always visible.

Kids uses the Día theme, Nunito, `radius-xl` everywhere, and a 44 px minimum target. It does not use points, streaks, or badges. Progress is counted in missions. Kids is not in this window.

## What not to do

Blue-to-violet gradients. Backgrounds with noise or a color mesh. Cards with an accent bar on the left. Emoji as a section divider. Fake screenshots with a drawn phone status bar. A second accent. Showing the agent writing code alone, without a diff someone can reject.
