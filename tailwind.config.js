import colors from 'tailwindcss/colors'; // Import default colors

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Accent Color (Using CSS Variables)
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-dark': 'rgb(var(--color-accent-dark) / <alpha-value>)',

        // Light Theme Colors (Primarily for content on white panels)
        'cream-bg': '#0D1117',          // Base background forced dark
        'cream-panel': '#FFFFFF',       // Light panels will be opaque white
        'text-main': '#1F2328',        // Dark text for light panels
        'text-secondary': '#656D76',    // Medium gray text for light panels
        'border-soft': '#D0D7DE',      // Light gray border for light panels

        // Dark Theme Colors
        'dark-bg': '#0D1117',          // Very dark blue/gray
        'dark-panel': '#161B22',        // Slightly lighter dark panel color
        'dark-text-main': '#C9D1D9',      // Light gray text for dark panels
        'dark-text-secondary': '#8B949E',  // Medium gray text for dark panels
        'dark-border-soft': '#30363D',      // Darker border color for dark panels

        // Glow Color (Only for dark mode background)
        'glow-color': 'rgba(79, 70, 229, 0.15)', // Reference's blue/purple glow

        // Light Purple placeholders (Not currently used)
        'light-purple-header': colors.purple[50], // #FAF5FF
        'light-purple-panel': colors.purple[100], // #F3E8FF
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'soft-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.03)',
        'soft-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.07), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}