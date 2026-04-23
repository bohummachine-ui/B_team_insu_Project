import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Toss Blue
        primary: {
          DEFAULT: "#3182F6",
          50: "#EBF3FF",
          100: "#C9E1FD",
          200: "#9DC6FB",
          300: "#6AABF8",
          400: "#3182F6",
          500: "#1B64DA",
          600: "#1251C3",
          700: "#0B3EA0",
          800: "#082E7A",
          900: "#051E52",
        },
        // Toss Gray
        gray: {
          50: "#F9FAFB",
          100: "#F2F4F6",
          200: "#E5E8EB",
          300: "#D1D6DB",
          400: "#B0B8C1",
          500: "#8B95A1",
          600: "#6B7684",
          700: "#4E5968",
          800: "#333D4B",
          900: "#191F28",
        },
        // Status colors
        success: "#00C368",
        warning: "#FF9500",
        error: "#F04452",
        // Attendance colors
        attendance: {
          office: "#00C368",
          field: "#FF9500",
          remote: "#3182F6",
          hospital: "#FF6B35",
          dayoff: "#B0B8C1",
          vacation: "#A855F7",
          checkout: "#6B7684",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        toss: "0 2px 8px rgba(0, 0, 0, 0.08)",
        "toss-md": "0 4px 16px rgba(0, 0, 0, 0.12)",
        "toss-lg": "0 8px 32px rgba(0, 0, 0, 0.16)",
      },
      borderRadius: {
        toss: "12px",
        "toss-lg": "16px",
        "toss-xl": "24px",
      },
      animation: {
        "slide-in-right": "slideInRight 0.3s ease-out",
        "slide-out-right": "slideOutRight 0.3s ease-in",
        "fade-in": "fadeIn 0.2s ease-out",
      },
      keyframes: {
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideOutRight: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
