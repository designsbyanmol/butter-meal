# Butter Meal

React + TypeScript + SCSS project with single-file build

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build single index.html file (all CSS + JS inlined)
npm run build

# Preview the single-file build (serve with Vite)
npm run preview
```

## How to View the Build

The `dist/index.html` file is a single-file build with everything inlined. 
**Always use `npm run preview` to view it** - this serves it with a proper web server.

Opening `dist/index.html` directly in a browser (`file://`) will NOT work due to 
CORS restrictions. The preview command serves it correctly.

## Build Output

The build creates a **single `index.html` file** with all CSS and JavaScript inlined.
No separate CSS, JS, or asset files are created.

## Project Structure

```
src/
  components/
    App/
      App.tsx
      App.scss
    Button/
      Button.tsx
      Button.scss
  styles/
    global.scss
  main.tsx
  vite-env.d.ts
scripts/
  inline.js  # Post-build inlining script
```
