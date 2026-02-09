# Elevation Loom (Elvgain Calculator)

This is a web application for tracking elevation gain progress with weekly targets.

## Development Setup

### Prerequisites

- Node.js (for running linting and formatting tools)

### Installation

```bash
npm install
```

This will install the development dependencies and set up Git hooks automatically via husky.

## Code Quality Tools

This project uses ESLint and Prettier to maintain code quality and consistency.

### Available Scripts

- `npm run lint` - Check JavaScript files for ESLint errors
- `npm run lint:fix` - Automatically fix ESLint errors where possible
- `npm run format` - Format all JavaScript, HTML, and CSS files with Prettier
- `npm run format:check` - Check if files are formatted correctly without making changes

### Pre-commit Hooks

The project uses husky and lint-staged to automatically run ESLint and Prettier on staged files before each commit. This ensures that all committed code meets the project's quality standards.

### ESLint Configuration

- Uses ESLint v10 with flat config format (eslint.config.js)
- Configured for browser environment
- Includes custom globals for functions shared across files via global scope
- Based on ESLint recommended rules

### Prettier Configuration

- Tab width: 2 spaces
- Single quotes for strings
- Semicolons required
- Trailing commas: ES5 style
- Print width: 80 characters

## Project Structure

```
.
├── index.html              # Main page
├── week-target.html        # Weekly target management page
├── js/                     # JavaScript files
│   ├── app.js             # Main application logic
│   ├── backup.js          # Backup/restore functionality
│   ├── calculations.js    # Progress calculation logic
│   ├── chart.js           # Chart rendering
│   ├── date-utils.js      # Date formatting and parsing utilities
│   ├── db.js              # IndexedDB database operations
│   ├── export-image.js    # Image export functionality
│   ├── iso-week.js        # ISO week calculations
│   ├── sample-data.js     # Sample data generation for testing/demo
│   ├── week-target.js     # Weekly target management
│   └── dev/               # Development utilities
│       └── test.js        # Test utilities (not loaded in production)
├── css/                    # Stylesheets
│   └── style.css
├── docs/                   # Documentation files
│   ├── DOCUMENTATION_INDEX.md           # 📖 Start here for documentation guide
│   ├── DEVELOPMENT_PHASE_ASSESSMENT.md  # Current development phase
│   ├── KPI_ROADMAP.md                   # Goals and roadmap with KPIs
│   ├── BEGINNER_WORKFLOW.md             # Workflow for IT beginners
│   ├── LEARNING_PATH.md                 # Learning path for PLC engineers
│   ├── QUICK_START_FOR_PLC_ENGINEERS.md # Quick start guide
│   ├── CODE_WALKTHROUGH.md              # Detailed code explanation
│   ├── CODE_REVIEW_SUMMARY.md           # Code review results
│   ├── ROADMAP.md                       # Development roadmap
│   └── Elevation_Loom_MVP仕様書_final.md # MVP specification (Japanese)
└── scripts/                # Utility scripts
    └── run_local.sh       # Local development server
```

## Architecture

This application uses vanilla JavaScript without ES6 modules. JavaScript files share functions via the global scope, with dependencies documented at the top of each file. The load order of script tags in HTML files is important for proper functionality.

Data is stored locally using IndexedDB for day logs and weekly targets.

## Documentation

This project has comprehensive documentation for various audiences:

- **📖 [Documentation Index](docs/DOCUMENTATION_INDEX.md)** - Start here to find the right documentation for your needs
- **📊 [Development Phase Assessment](docs/DEVELOPMENT_PHASE_ASSESSMENT.md)** - Current project status and phase
- **🎯 [KPI Roadmap](docs/KPI_ROADMAP.md)** - Goals and roadmap with KPIs
- **👨‍💻 [Beginner Workflow](docs/BEGINNER_WORKFLOW.md)** - Standard workflow for IT beginners
- **🔧 [Quick Start for PLC Engineers](docs/QUICK_START_FOR_PLC_ENGINEERS.md)** - Quick start guide for PLC/ST engineers
- **📚 [Learning Path](docs/LEARNING_PATH.md)** - Comprehensive learning path for web development

For a complete list of documentation, see the [Documentation Index](docs/DOCUMENTATION_INDEX.md).

## Contributing

When contributing to this project:

1. Make sure your code passes ESLint checks (`npm run lint`)
2. Format your code with Prettier (`npm run format`)
3. The pre-commit hook will automatically check and format your staged files
4. Follow the existing code structure and patterns
