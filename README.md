# YallaFtar - Session-Based Restaurant Ordering PWA

<div align="center">
  <h3>🍳 Group breakfast ordering made simple</h3>
  <p>A Progressive Web App for session-based restaurant ordering with real-time updates</p>
</div>

## 🚀 Features

### Core Functionality
- **Session Management**: Create time-limited ordering sessions with unique access codes
- **Role-Based Access**: Session Creator, Individual Users, and Admin roles
- **Real-time Updates**: Live order tracking and notifications
- **Offline Support**: Continue ordering even when offline, sync when back online
- **PWA Ready**: Installable on mobile devices with native app experience

### User Roles

#### 1. Session Creator
- Select restaurant and set session expiry (30 minutes)
- Get shareable link with 4-digit access code
- View all orders in real-time dashboard
- Edit/delete any order in the session
- Close session and send grouped order to restaurant via WhatsApp
- Manage session fees (VAT, service fee, delivery)

#### 2. Individual Users
- Join sessions using access code or direct link
- View and edit ONLY their own order
- Add items with custom notes and special requests
- Cannot edit after session expires
- Receive order summary via WhatsApp

#### 3. Admin
- Manage restaurants and menus (CSV/JSON upload)
- View and manage all sessions system-wide
- User management (block/unblock, edit profiles)
- System configuration and database setup

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- Supabase account (free tier works)

### 1. Clone and Install
```bash
git clone <repository-url>
cd YallaFtar
npm install
```

### 2. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and run the contents of `database-schema.sql`
4. Note your Project URL and anon key from Settings > API

### 3. Configure the App

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000
3. Click "Go to Admin Setup" 
4. Enter your Supabase Project URL and anon key
5. The app will reload and connect to your database

### 4. Admin Access

- Navigate to `/admin`
- Default admin password: `paysky`
- Create restaurants and upload menus
- Start creating sessions!

## 📱 PWA Installation

The app is a full Progressive Web App:

- **Mobile**: Add to home screen for native app experience
- **Desktop**: Install via browser's install prompt
- **Offline**: Core functionality works offline with sync when online

## 🏗️ Architecture

### Database Schema
```sql
-- Core tables
users (id, firstName, lastName, mobile, instapayUsername, isBlocked)
restaurants (id, name, menu)
sessions (id, name, creatorId, expiresAt, isActive, orders, accessCode)
```

### API Endpoints (Supabase)
- Real-time subscriptions for live updates
- Row Level Security for data protection
- CRUD operations for all entities

### Routes
- `/` - Home dashboard
- `/session/:id` - Order page (user view)
- `/session/:id/dashboard` - Creator dashboard
- `/admin` - Admin panel

## 🔧 Development

### Project Structure
```
├── components/          # React components
│   ├── AdminPanel.tsx   # Restaurant & session management
│   ├── Dashboard.tsx    # Creator session dashboard
│   ├── OrderPage.tsx    # Individual user ordering
│   ├── Auth.tsx         # User authentication
│   └── PWA components   # Install prompt, share modal
├── services/
│   └── supabase.ts      # Database service layer
├── hooks/
│   └── useOfflineSync.ts # Offline functionality
├── types.ts             # TypeScript definitions
└── public/
    ├── manifest.json    # PWA manifest
    └── sw.js           # Service worker
```

### Key Technologies
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Real-time)
- **PWA**: Service Worker, Web App Manifest
- **Routing**: React Router
- **State**: React hooks + localStorage

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy dist/ folder to Vercel
```

### Other Platforms
- Build: `npm run build`
- Deploy the `dist/` folder to any static hosting
- Ensure proper routing for SPA

## 📋 Usage Flow

1. **Admin** sets up restaurants and menus
2. **Session Creator** creates a session, selects restaurant
3. **Creator** shares access code via WhatsApp/link
4. **Users** join using code, place orders
5. **Creator** monitors orders in real-time dashboard
6. **Creator** closes session, sends final order to restaurant
7. **Users** receive individual order summaries

## 🔒 Security Features

- Session-based access control
- Time-limited sessions (auto-expire)
- User blocking/management
- Input validation and sanitization
- Secure database policies

## 🌐 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with PWA support

## 📞 Support

For issues or questions:
1. Check the admin panel for configuration
2. Verify database connection
3. Check browser console for errors
4. Ensure proper Supabase setup

---

**Built with ❤️ for seamless group ordering experiences**
