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

### Core CRM Features
- **Landing Page**: Modern, responsive design with feature showcase
- **Authentication**: Login with session management and protected routes
- **Dashboard**: Statistics overview, recent leads and deals, quick actions
- **Leads Management**: List view with filters, create/edit modal, rating system
- **Deals Management**: Kanban board view, pipeline stage visualization
- **Contacts & Accounts**: Full CRUD operations with search and filter
- **Activities**: Task management with calendar integration
- **Pipelines**: Custom pipeline creation with stage management

### Beauty Center Features
- **Appointment Booking**: Multi-step booking modal (Service → Schedule → Client)
- **Calendar View**: Month/Week/Day views with appointment visualization
- **Time Slot Picker**: Smart time slot selection with conflict detection
- **Client Management**: Search existing clients or create new ones
- **Staff Scheduling**: Staff availability and schedule management
- **Service Management**: Service catalog with pricing and duration
- **Status Management**: Appointment status workflow with confirmations
- **Pagination**: Server-side pagination with date range filtering
- **Toast Notifications**: Success/error notifications for user actions

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


