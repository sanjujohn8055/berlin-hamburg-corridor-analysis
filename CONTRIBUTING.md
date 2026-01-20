# Contributing to Berlin-Hamburg Corridor Analysis

Thank you for your interest in contributing to the Berlin-Hamburg Corridor Analysis project! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- PostgreSQL with PostGIS extension
- Redis server
- Git

### Development Setup
1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/berlin-hamburg-corridor-analysis.git
   cd berlin-hamburg-corridor-analysis
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```
5. Start development services:
   ```bash
   npm run docker:up  # Start PostgreSQL and Redis
   npm run dev        # Start development servers
   ```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- CorridorService.property.test.ts

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests
- All new features must include comprehensive tests
- Use property-based testing with fast-check for business logic
- Aim for >90% test coverage
- Tests should run in under 15 seconds total

### Test Structure
```typescript
// Example property test
import fc from 'fast-check';

describe('ServiceName', () => {
  it('should handle valid inputs correctly', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      (input) => {
        const result = service.method(input);
        expect(result).toBeDefined();
        expect(result).toBeGreaterThan(0);
      }
    ), { numRuns: 10 });
  });
});
```

## 📝 Code Style

### TypeScript Guidelines
- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Follow functional programming patterns where possible

### Code Formatting
```bash
# Format code (if prettier is configured)
npm run format

# Lint code (if eslint is configured)
npm run lint
```

### Naming Conventions
- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase
- **Functions**: camelCase, descriptive names

## 🏗️ Architecture Guidelines

### Service Layer
- Services should be stateless and injectable
- Use dependency injection for database and external services
- Each service should have a single responsibility
- Include comprehensive error handling

### API Design
- Follow RESTful conventions
- Use consistent response formats
- Include proper HTTP status codes
- Validate all inputs

### Frontend Components
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for all props
- Include loading and error states

## 🔄 Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - Individual features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes

### Commit Messages
Follow conventional commits format:
```
type(scope): description

feat(api): add station priority calculation endpoint
fix(ui): resolve map rendering issue on mobile
docs(readme): update installation instructions
test(services): add property tests for risk analysis
```

### Pull Request Process
1. Create a feature branch from `develop`
2. Make your changes with tests
3. Ensure all tests pass locally
4. Update documentation if needed
5. Submit pull request to `develop`
6. Address review feedback
7. Squash commits before merge

## 📚 Documentation

### Code Documentation
- Use JSDoc for all public methods
- Include parameter and return type descriptions
- Add usage examples for complex functions

### API Documentation
- Document all endpoints in README
- Include request/response examples
- Specify error conditions and codes

### README Updates
- Keep installation instructions current
- Update feature lists for new capabilities
- Include screenshots for UI changes

## 🐛 Bug Reports

### Before Submitting
- Check existing issues for duplicates
- Verify the bug in the latest version
- Test in a clean environment

### Bug Report Template
```markdown
**Bug Description**
Clear description of the issue

**Steps to Reproduce**
1. Step one
2. Step two
3. Step three

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Environment**
- OS: [e.g., Windows 10, macOS 12]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 115]

**Additional Context**
Screenshots, logs, or other relevant information
```

## ✨ Feature Requests

### Feature Request Template
```markdown
**Feature Description**
Clear description of the proposed feature

**Use Case**
Why is this feature needed?

**Proposed Solution**
How should this feature work?

**Alternatives Considered**
Other approaches you've considered

**Additional Context**
Mockups, examples, or references
```

## 🚀 Release Process

### Version Numbering
Follow semantic versioning (SemVer):
- `MAJOR.MINOR.PATCH`
- Major: Breaking changes
- Minor: New features (backward compatible)
- Patch: Bug fixes (backward compatible)

### Release Checklist
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Version number bumped
- [ ] Changelog updated
- [ ] Security audit clean
- [ ] Performance benchmarks acceptable

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Maintain professional communication

### Getting Help
- Check existing documentation first
- Search closed issues for solutions
- Ask questions in GitHub Discussions
- Join community chat if available

## 🏆 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributor graphs
- Special mentions for major features

## 📞 Contact

- **Issues**: GitHub Issues for bugs and features
- **Discussions**: GitHub Discussions for questions
- **Security**: Email for security vulnerabilities
- **Maintainers**: @username for urgent matters

Thank you for contributing to making railway infrastructure analysis better! 🚄