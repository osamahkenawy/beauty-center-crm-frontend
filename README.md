# Trasealla CRM - Frontend

A modern, responsive React frontend for the Trasealla CRM system.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Backend server running on port 4000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## 🎨 Features

### Landing Page
- Modern, responsive design
- Feature showcase
- Industry templates overview
- Demo credentials section

### Authentication
- Login page with demo credentials
- Session management
- Protected routes

### Dashboard
- Statistics overview
- Recent leads and deals
- Quick actions
- Activity summary

### Leads Management
- List view with filters
- Create/Edit modal
- Lead rating (Hot/Warm/Cold)
- Status tracking

### Deals Management
- Kanban board view
- List view
- Pipeline stage visualization
- Deal value tracking

### Contacts & Accounts
- Full CRUD operations
- Search and filter
- Linked relationships

### Activities
- Task management
- Calendar integration
- Priority and status tracking
- Overdue indicators

### Pipelines
- Custom pipeline creation
- Stage management
- Color coding
- Default pipeline setting

## 🛠️ Tech Stack

- **React 18** - UI library
- **React Router 6** - Client-side routing
- **Vite** - Build tool
- **CSS3** - Styling (no frameworks)

## 📁 Project Structure

```
crm-frontend/
├── public/
│   └── logo.svg
├── src/
│   ├── main.jsx          # Entry point
│   ├── App.jsx           # Root component
│   ├── index.css         # Global styles
│   ├── components/
│   │   ├── Layout.jsx    # App layout
│   │   └── Layout.css
│   └── pages/
│       ├── LandingPage.jsx
│       ├── LandingPage.css
│       ├── LoginPage.jsx
│       ├── LoginPage.css
│       ├── Dashboard.jsx
│       ├── Dashboard.css
│       ├── Leads.jsx
│       ├── Deals.jsx
│       ├── Contacts.jsx
│       ├── Accounts.jsx
│       ├── Activities.jsx
│       ├── Pipelines.jsx
│       └── CRMPages.css   # Shared styles
├── index.html
├── vite.config.js
└── package.json
```

## 🎨 Color Scheme

```css
--primary: #244066     /* Main brand color */
--secondary: #f2421b   /* Accent color */
--success: #22c55e
--warning: #f59e0b
--danger: #ef4444
```

## 🔧 Configuration

Edit `vite.config.js` to change:
- Development port (default: 5173)
- API proxy target (default: http://localhost:4000)

## 🌐 API Proxy

The Vite dev server proxies `/api` requests to the backend:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
  }
}
```

## 📱 Responsive Design

- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Hamburger menu navigation

## 📄 License

Trasealla © 2024


