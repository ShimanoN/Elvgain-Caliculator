# Elevation Loom (エレベーションルーム)

[![CI](https://github.com/ShimanoN/Elvgain-Caliculator/actions/workflows/ci.yml/badge.svg)](https://github.com/ShimanoN/Elvgain-Caliculator/actions/workflows/ci.yml)
[![Deploy](https://github.com/ShimanoN/Elvgain-Caliculator/actions/workflows/deploy.yml/badge.svg)](https://github.com/ShimanoN/Elvgain-Caliculator/actions/workflows/deploy.yml)

**A cloud-native web application for tracking elevation gain (climbing) progress with weekly targets.**

🌐 **Live App**: https://elevation-loom.web.app

## 🚀 Architecture

This application uses a **Firestore-authoritative architecture** (Phase 5 completed):
- **Firestore**: Single source of truth for all persistent data
- **IndexedDB**: Read-through/write-through cache (5-minute TTL)
- **localStorage**: Ephemeral UI state only
- **Anonymous Authentication**: User isolation via Firebase Auth
- **Result types**: Type-safe error handling

**Current Documentation**:
- [ARCHITECTURE.md](ARCHITECTURE.md) - Production-ready architecture (Latest)
- [FIRESTORE_RULES.md](FIRESTORE_RULES.md) - Security rules documentation
- [FIREBASE_DEPLOYMENT_GUIDE.md](FIREBASE_DEPLOYMENT_GUIDE.md) - Deployment guide (Phase 6)
- [USER_MANUAL.md](USER_MANUAL.md) - User manual for daily usage

**Historical References**:
- [Firebase Refactoring](docs/archive/FIREBASE_REFACTORING.md) - Migration process record
- [Archive Documentation](docs/archive/README.md) - Background and historical documents

## ✨ Features

- **Daily Elevation Tracking**: Log elevation gained across multiple sessions per day
- **Weekly Targets**: Set and track weekly elevation goals
- **Progress Visualization**: View weekly progress with charts
- **Condition Tracking**: Record subjective training conditions
- **Auto-Backup**: Automatic backup to cloud storage (Firestore)
- **Offline Support**: Work offline with local cache, sync when online
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: TypeScript, Vite, HTML5, CSS3
- **Database**: 
  - Firestore (authoritative storage)
  - IndexedDB (client-side cache)
- **Testing**: Vitest (unit), Playwright (e2e)
- **Code Quality**: ESLint, Prettier, Husky
- **Deployment**: GitHub Pages

## 📋 Prerequisites

- Node.js `^20.19.0 || ^22.13.0 || >=24.0.0`
- npm (comes with Node.js)
- Firebase project (for production deployment)

## 🚀 Quick Start

### Development Mode (Demo)

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Open http://localhost:8000
```

**Note**: Development mode uses demo credentials. All users share the same data.

### Production Setup

1. **Create Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Firestore Database

2. **Configure Environment**:
   ```bash
   # Copy example env file
   cp .env.example .env
   
   # Edit .env with your Firebase credentials
   nano .env
   ```

3. **Deploy**:
   ```bash
   # Build for production
   npm run build
   
   # Deploy to Firebase Hosting (or your platform)
   firebase deploy
   ```

## 📚 Documentation

### Getting Started
- [Documentation Index](docs/DOCUMENTATION_INDEX.md) - Start here (role-based navigation)
- [Quick Start for PLC Engineers](docs/QUICK_START_FOR_PLC_ENGINEERS.md) - 30-minute onboarding
- [Development Guide](docs/BEGINNER_WORKFLOW.md) - Getting started for developers

### Core Documentation
- [Code Walkthrough](docs/CODE_WALKTHROUGH.md) - Implementation details with PLC analogies
- [Architecture Guide](ARCHITECTURE.md) - Production-ready architecture (**Current**)
- [Roadmap](docs/ROADMAP.md) - Development plan (**Phase 6: Production Deployment in progress**)
- [Contributing Guide](docs/CONTRIBUTING.md) - How to contribute

### Security & Operations
- [Firestore Rules](FIRESTORE_RULES.md) - Security rules documentation
- [Security Policy](SECURITY.md) - Security guidelines
- [Production Checklist](PRODUCTION_CHECKLIST.md) - Pre-deployment checklist

### Historical References
- [Archive Documentation](docs/archive/README.md) - Background, migration history, and audits
- [Firebase Refactoring](docs/archive/FIREBASE_REFACTORING.md) - Phase 5 migration record
- [Security Summary](docs/archive/SECURITY_SUMMARY.md) - Security evaluation (2026-02-12)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run e2e

# Run e2e tests in UI mode
npm run e2e:ui
```

## 🔧 Development Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Build for production
npm run build

# Preview production build
npm run preview
```

## ⚠️ Important Notes

### Demo Mode Security

**WARNING**: The default configuration uses demo mode where all users share the same data. This is for development only.

**For Production**:
1. Configure Firebase Authentication
2. Remove demo mode fallback in `js/firebase-config.ts`
3. Implement user login/logout flows
4. Deploy with proper environment variables

See [Security Summary](docs/archive/SECURITY_SUMMARY.md) for details.

### Data Migration

If upgrading from a previous version with IndexedDB-only storage:

```typescript
import { migrateAllData } from './js/migration-adapter.js';

// Run migration (one-time)
const result = await migrateAllData();
console.log(`Migrated ${result.migratedWeeks} weeks`);
```

## 🏗️ Project Structure

```
├── js/                    # TypeScript source files
│   ├── storage.ts         # Main storage gateway (Firestore + cache)
│   ├── firebase-config.ts # Firebase initialization
│   ├── result.ts          # Result type system
│   ├── types.ts           # Core domain types
│   ├── storage-compat.ts  # Compatibility layer
│   ├── db.ts              # Database facade
│   └── ...                # Other modules
├── docs/                  # Documentation
├── test/                  # Unit tests
├── e2e/                   # End-to-end tests
├── css/                   # Stylesheets
├── public/                # Static assets
└── dist/                  # Build output
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/CONTRIBUTING.md) for details.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Live Demo](https://shimanon.github.io/Elvgain-Caliculator/)
- [Documentation](docs/DOCUMENTATION_INDEX.md)
- [Issue Tracker](https://github.com/ShimanoN/Elvgain-Caliculator/issues)

## 👥 Target Audience

This project is specifically designed for **PLC (Programmable Logic Controller) engineers** transitioning to web development. Documentation uses PLC/ST terminology mappings and analogies for easier understanding.

---

**Made with ❤️ for climbers and PLC engineers**
