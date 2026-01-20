# Berlin-Hamburg Corridor Analysis

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/corridor-analysis)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)

A comprehensive decision aid system for analyzing the Berlin-Hamburg railway corridor, providing infrastructure upgrade priorities, connection fragility analysis, and population-traffic risk zone assessment.

## 🚀 Quick Deploy

### One-Click Deploy to Railway
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Local Development
```bash
git clone https://github.com/YOUR_USERNAME/berlin-hamburg-corridor-analysis.git
cd berlin-hamburg-corridor-analysis
npm install
npm run dev
```

## ✨ Features

### 🚄 **Core Capabilities**
- **Interactive Corridor Dashboard** - Real-time visualization of all 13 major stations
- **Priority Analysis Engine** - Multi-criteria decision analysis for upgrade prioritization
- **Risk Zone Management** - Population-traffic risk assessment and mitigation strategies
- **Station Management System** - Comprehensive database of corridor infrastructure
- **Configuration Management** - User-customizable priority calculation parameters

### 📊 **Analysis Features**
- **Infrastructure Analysis** - Facility assessment and capacity evaluation
- **Connection Fragility Analysis** - Network vulnerability identification
- **Population Impact Analysis** - Demographic and traffic flow integration
- **Real-time Updates** - Live data synchronization every 60 seconds
- **Multi-criteria Scoring** - Configurable weighting system (0-100 scale)

### 🔧 **Technical Features**
- **RESTful API** - Complete backend API with comprehensive endpoints
- **Property-Based Testing** - 40 comprehensive tests with fast-check
- **Docker Containerization** - Production-ready deployment setup
- **TypeScript** - Full type safety across frontend and backend
- **Responsive Design** - Works on desktop and mobile devices

## 🏗️ Technology Stack

### Backend
- **Node.js 18+** with **TypeScript**
- **Express.js** REST API
- **PostgreSQL** with **PostGIS** for spatial data
- **Redis** for caching and session management
- **Winston** for structured logging

### Frontend
- **React 18** with **TypeScript**
- **Webpack 5** for bundling and optimization
- **Custom Hooks** for state management
- **CSS-in-JS** for component styling

### Testing & Quality
- **Jest** for unit testing
- **fast-check** for property-based testing
- **TypeScript** for compile-time safety
- **ESLint** and **Prettier** for code quality

## 📋 Prerequisites

- **Node.js 18+**
- **PostgreSQL** with PostGIS extension
- **Redis** server
- **Docker** (optional, for containerized deployment)

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/berlin-hamburg-corridor-analysis.git
cd berlin-hamburg-corridor-analysis
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
cp .env.example .env
# Edit .env with your database and Redis configuration
```

### 4. Database Setup
```bash
# Start services with Docker (recommended)
npm run docker:up

# Or set up manually:
# 1. Install PostgreSQL with PostGIS
# 2. Install Redis
# 3. Create database and enable PostGIS extension
```

### 5. Build and Start
```bash
# Development mode (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

## 🌐 API Endpoints

### Stations
- `GET /api/stations` - Get all corridor stations
- `GET /api/stations/:eva` - Get station by EVA number
- `GET /api/stations/distance/:distance` - Get stations within distance
- `GET /api/stations/priority/:minPriority` - Get stations by priority threshold

### Priority Analysis
- `GET /api/priorities/analysis` - Get comprehensive priority analysis
- `GET /api/priorities/station/:eva` - Get station-specific priority data
- `POST /api/priorities/calculate` - Calculate priorities with custom weights
- `GET /api/priorities/recommendations/:eva` - Get upgrade recommendations

### Configuration Management
- `GET /api/config/:userId` - Get user configurations
- `GET /api/config/:userId/active` - Get active configuration
- `POST /api/config/:userId` - Save new configuration
- `PUT /api/config/:userId/active` - Set active configuration

### Risk Zone Analysis
- `GET /api/risk-zones` - Get all risk zones with filtering
- `GET /api/risk-zones/:zoneId` - Get specific risk zone details
- `GET /api/risk-zones/analysis/population` - Population risk analysis
- `GET /api/risk-zones/corridor/profile` - Corridor risk profile

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test suite
npm test -- --testPathPattern=CorridorService
```

### Test Coverage
- **40 Property-Based Tests** using fast-check
- **7 Test Suites** covering all major services
- **Sub-11 Second Execution** time for full test suite
- **Service Layer Testing** - Complete business logic coverage
- **Component Testing** - React component validation

## 🐳 Docker Deployment

### Development
```bash
npm run docker:up
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🚀 Deployment Options

### Railway (Recommended)
1. Push to GitHub
2. Connect Railway to your repository
3. Add PostgreSQL and Redis services
4. Deploy automatically

### Other Platforms
- **Heroku** - Ready with Dockerfile
- **DigitalOcean App Platform** - Container-ready
- **AWS ECS/Fargate** - Production scalable
- **Google Cloud Run** - Serverless deployment
- **Azure Container Instances** - Enterprise ready

## 📊 Project Statistics

- **13 Corridor Stations** - Complete Berlin-Hamburg route (289km)
- **40 Test Cases** - Comprehensive quality assurance
- **4 Analysis Modes** - Balanced, Infrastructure, Timetable, Population focus
- **Real-time Updates** - 60-second refresh intervals
- **Multi-platform Support** - Web, mobile, and API access
- **Production Ready** - Docker containerization and CI/CD ready

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support & Documentation

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/berlin-hamburg-corridor-analysis/issues)
- **Documentation**: See `/docs` folder for detailed guides
- **API Documentation**: Available at `/api/health` when running
- **Deployment Guide**: See [deploy-railway.md](deploy-railway.md)

## 🏆 Acknowledgments

- Deutsche Bahn for railway data standards
- PostGIS community for spatial database capabilities
- React and Node.js communities for excellent tooling
- fast-check library for property-based testing framework

---

**Built with ❤️ for railway infrastructure analysis**