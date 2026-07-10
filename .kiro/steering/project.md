# Project: Expense & Budget Visualizer

## Overview
A client-side web application for tracking personal expenses and income, built with vanilla HTML, CSS, and JavaScript. No backend or build tools required — runs entirely in the browser.

## Project Structure
```
├── index.html        # Main application entry point
├── css/
│   └── style.css     # All styles including dark mode and responsive layout
├── js/
│   └── app.js        # All application logic (state, DOM, chart rendering)
└── .kiro/
    └── steering/
        └── project.md  # This file — project context for Kiro
```

## Tech Stack
- HTML5
- CSS3 (custom properties for theming, CSS Grid/Flexbox for layout)
- Vanilla JavaScript (ES6+)
- Chart.js v4.4.3 (via CDN) — for the pie chart visualization

## Features
- Add income and expense transactions with a category
- Custom category support via modal dialog
- Spending limit with visual warning alert
- Sort transactions by date, amount, or category
- Pie chart showing spending breakdown by category
- Dark/light mode toggle
- Data persisted in `localStorage`
- Accessible markup (ARIA roles, live regions, labels)

## Coding Conventions
- No frameworks or build steps — plain JS, CSS, HTML only
- All JS lives in `js/app.js`
- All styles live in `css/style.css`
- Use `const`/`let`, arrow functions, template literals
- DOM queries cached at the top of `app.js`
- State stored in a single `state` object and synced to `localStorage`

## Assignment Info
- Course: RevoU CodingCamp
- Start Date: 6 July 2026
- Author: perwirasinaga
