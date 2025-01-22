import type { Config } from "tailwindcss";
import baseConfig from "@repo/design/tailwind.config";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/design/**/*.{ts,tsx}",
  ],
  presets: [baseConfig],
} satisfies Config as any;
