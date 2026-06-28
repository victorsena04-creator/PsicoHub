import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta de Cores Importada do Google Stitch
        "secondary-fixed": "#89f5e7",
        "on-secondary-container": "#006f66",
        "secondary-fixed-dim": "#6bd8cb",
        "surface-container-highest": "#dae2fd",
        "primary-container": "#4f46e5",
        "on-primary-fixed": "#0f0069",
        "tertiary-container": "#4b4dd8",
        "error": "#ba1a1a",
        "on-tertiary": "#ffffff",
        "on-tertiary-fixed-variant": "#2f2ebe",
        "outline-variant": "#c7c4d8",
        "tertiary-fixed-dim": "#c0c1ff",
        "error-container": "#ffdad6",
        "tertiary": "#3130c0",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "surface-tint": "#4d44e3",
        "on-secondary-fixed-variant": "#005049",
        "on-primary-fixed-variant": "#3323cc",
        "surface": "#faf8ff",
        "outline": "#777587",
        "primary": "#3525cd",
        "secondary-container": "#86f2e4",
        "background": "#faf8ff",
        "on-error-container": "#93000a",
        "surface-container-lowest": "#ffffff",
        "on-error": "#ffffff",
        "on-surface-variant": "#464555",
        "inverse-surface": "#283044",
        "surface-variant": "#dae2fd",
        "on-primary-container": "#dad7ff",
        "inverse-on-surface": "#eef0ff",
        "surface-container-low": "#f2f3ff",
        "inverse-primary": "#c3c0ff",
        "surface-bright": "#faf8ff",
        "tertiary-fixed": "#e1e0ff",
        "primary-fixed-dim": "#c3c0ff",
        "surface-container": "#eaedff",
        "surface-container-high": "#e2e7ff",
        "primary-fixed": "#e2dfff",
        "on-secondary-fixed": "#00201d",
        "on-surface": "#131b2e",
        "secondary": "#006a61",
        "on-background": "#131b2e",
        "on-tertiary-container": "#d9d8ff",
        "surface-dim": "#d2d9f4",
        "on-tertiary-fixed": "#07006c"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px"
      },
      spacing: {
        "base": "4px",
        "2xl": "48px",
        "container-max": "1440px",
        "xs": "4px",
        "sidebar-width": "240px",
        "md": "16px",
        "lg": "24px",
        "sm": "8px",
        "xl": "32px"
      },
      fontFamily: {
        "label-md": ["Inter", "sans-serif"],
        "body-lg": ["Inter", "sans-serif"],
        "mono-sm": ["Geist Mono", "monospace"],
        "headline-lg": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-sm": ["Inter", "sans-serif"],
        "headline-sm": ["Inter", "sans-serif"],
        "headline-md": ["Inter", "sans-serif"]
      },
      fontSize: {
        "label-md": ["14px", { "lineHeight": "20px", "fontWeight": "500" }],
        "body-lg": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "mono-sm": ["12px", { "lineHeight": "16px", "fontWeight": "400" }],
        "headline-lg": ["30px", { "lineHeight": "36px", "letterSpacing": "-0.02em", "fontWeight": "600" }],
        "body-md": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.02em", "fontWeight": "500" }],
        "headline-sm": ["20px", { "lineHeight": "28px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "headline-md": ["24px", { "lineHeight": "32px", "letterSpacing": "-0.015em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [],
};

export default config;