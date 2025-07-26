# Agenda PMS - Property Management System

A comprehensive, multi-tenant property management system built with Next.js and Supabase, designed for small to mid-sized property managers and agencies.

## 🚀 Features

### Core Functionality
- **Multi-tenant Architecture** - Secure data isolation between different property management agencies
- **Role-based Access Control** - Admin, Staff, and Property Owner roles with appropriate permissions
- **Property Management** - Complete CRUD operations with owner relationships and audit trails
- **Calendar Synchronization** - iCal import/export with OTA platforms (Airbnb, Booking.com, etc.)
- **Task Management** - Automated task generation from booking events with staff assignment
- **Financial Tracking** - Revenue and expense tracking with owner attribution
- **Comprehensive Reporting** - PDF/CSV export with secure sharing links
- **Mobile Responsive** - Optimized for all devices with touch-friendly interfaces

### Technical Features
- **Real-time Updates** - Live data synchronization across all users
- **Accessibility Compliant** - WCAG AA standards with screen reader support
- **Performance Optimized** - Code splitting, lazy loading, and caching strategies
- **Comprehensive Testing** - Unit, integration, and E2E tests with 90%+ coverage
- **CI/CD Pipeline** - Automated testing and deployment workflows

## 🛠 Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Hook Form** - Form management and validation
- **Heroicons** - Beautiful SVG icons

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Row Level Security (RLS)** - Database-level multi-tenancy
- **Supabase Auth** - Authentication and authorization
- **Supabase Storage** - File uploads and management

### Testing & Quality
- **Jest** - Unit testing framework
- **React Testing Library** - Component testing
- **Playwright** - End-to-end testing
- **ESLint** - Code linting and formatting

### DevOps
- **Docker** - Containerization
- **GitHub Actions** - CI/CD pipeline
- **Vercel** - Deployment platform (optional)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/duhman21/agenda-pms.git
cd agenda-pms
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Copy the environment template and configure your variables:
```bash
cp .env.production.template .env.local
```

Update `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### 4. Database Setup
Run the Supabase migrations:
```bash
# If using Supabase CLI
supabase db reset

# Or manually run the migration files in supabase/migrations/
```

### 5. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📁 Project Structure

```
agenda-pms/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── dashboard/         # Dashboard page
│   │   ├── properties/        # Properties management
│   │   ├── tasks/             # Task management
│   │   ├── revenue/           # Revenue tracking
│   │   └── expenses/          # Expense logging
│   ├── components/            # React components
│   │   ├── auth/              # Authentication components
│   │   ├── layout/            # Layout and responsive components
│   │   ├── properties/        # Property management UI
│   │   ├── tasks/             # Task management UI
│   │   ├── revenue/           # Revenue tracking UI
│   │   ├── expenses/          # Expense logging UI
│   │   └── reports/           # Reporting components
│   ├── lib/                   # Utility libraries
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript type definitions
├── supabase/
│   └── migrations/            # Database migration files
├── tests/
│   └── e2e/                   # End-to-end tests
└── scripts/                   # Deployment and utility scripts
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Unit Tests
```bash
npm run test:unit
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
```bash
npm run test:coverage
```

## 🚀 Deployment

### Using Docker
```bash
# Build the image
docker build -t agenda-pms .

# Run the container
docker run -p 3000:3000 agenda-pms
```

### Using Docker Compose
```bash
docker-compose up -d
```

### Manual Deployment
```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📊 Database Schema

The system uses a multi-tenant architecture with the following core tables:

- **tenants** - Tenant isolation
- **user_profiles** - User management with roles
- **properties** - Property information
- **property_owners** - Property-owner relationships
- **bookings** - Calendar and booking data
- **tasks** - Task management
- **expenses** - Expense tracking
- **revenue** - Revenue tracking

All tables include `tenant_id` for data isolation via Row Level Security (RLS).

## 🔐 Security Features

- **Multi-tenant Data Isolation** - RLS policies ensure data separation
- **Role-based Access Control** - Granular permissions by user role
- **JWT Authentication** - Secure token-based authentication
- **Input Validation** - Comprehensive server-side validation
- **SQL Injection Protection** - Parameterized queries and ORM usage
- **XSS Protection** - Content Security Policy and input sanitization

## 📱 Mobile Features

- **Responsive Design** - Optimized for all screen sizes
- **Touch-friendly Interface** - Large tap targets and gestures
- **Pull-to-refresh** - Native mobile interactions
- **Offline Indicators** - Clear feedback for connectivity issues
- **Progressive Web App** - App-like experience on mobile devices

## 🎯 Accessibility

- **WCAG AA Compliance** - Meets accessibility standards
- **Screen Reader Support** - Proper ARIA labels and semantic markup
- **Keyboard Navigation** - Full keyboard accessibility
- **High Contrast** - Sufficient color contrast ratios
- **Focus Management** - Clear focus indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Ensure accessibility compliance
- Update documentation as needed
- Follow the existing code style

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions

## 🗺 Roadmap

- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] API integrations (Stripe, QuickBooks)
- [ ] Advanced reporting features
- [ ] Multi-language support
- [ ] Dark mode theme

## 📈 Performance

- **Lighthouse Score**: 95+ across all metrics
- **Bundle Size**: Optimized with code splitting
- **Database**: Indexed queries with sub-100ms response times
- **Caching**: Redis caching for frequently accessed data

---

Built with ❤️ by the Agenda PMS team