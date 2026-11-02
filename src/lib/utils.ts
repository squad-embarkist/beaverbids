import { createCn } from "cn/config"

// The class merger has to know the project's own theme tokens from
// src/app/globals.css, or it mistakes them for the Tailwind defaults with the
// same prefix: `text-wordmark` would count as a text colour and lose to
// `text-paper`, `font-expanded` as a font family and drop `font-heading`,
// and `size-control` would not yield to a later `size-20`. Import `cn` from
// here, never from the `cn` package directly.
const TEXT_SIZES = [
  "body-15",
  "button",
  "button-sm",
  "caption",
  "card-title",
  "coverage-lead",
  "display",
  "eyebrow",
  "figure",
  "figure-sm",
  "footer",
  "h1",
  "h2",
  "help",
  "hero",
  "hero-md",
  "hero-sm",
  "hero-xs",
  "label",
  "lead",
  "list-15",
  "mono-md",
  "mono-xs",
  "note",
  "portal",
  "score",
  "score-sm",
  "section",
  "section-lg",
  "section-sm",
  "step",
  "tag",
  "wordmark",
  "wordmark-lg",
]

const SPACING = ["control", "button", "header"]

export const cn = createCn({
  extend: {
    theme: {
      text: TEXT_SIZES,
      spacing: SPACING,
    },
    classGroups: {
      // The font-expanded and font-condensed utilities set font-stretch.
      "font-width": [{ font: ["expanded", "condensed"] }],
    },
  },
})
