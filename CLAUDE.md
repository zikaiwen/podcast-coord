# CLAUDE.md - AI Assistant Guide for podcast-coord

## Project Overview

**podcast-coord** is a podcast coordination project. This repository is in its early stages of development.

- **License**: MIT
- **Author**: Zikai Alex Wen

## Repository Structure

```
podcast-coord/
├── README.md          # Project description and documentation
├── LICENSE            # MIT License
└── CLAUDE.md          # This file - AI assistant guidelines
```

> **Note**: This project is newly initialized. The structure will expand as development progresses.

## Development Guidelines

### Getting Started

Since this is a new project, when adding features:

1. Discuss the technology stack and architecture before implementation
2. Create appropriate configuration files (package.json, requirements.txt, etc.) based on chosen stack
3. Set up linting and formatting tools early
4. Add a `.gitignore` appropriate for the chosen technology

### Code Style Conventions

When code is added to this project, follow these principles:

- Write clear, self-documenting code
- Keep functions focused and single-purpose
- Add comments only where logic isn't self-evident
- Use meaningful variable and function names

### Commit Message Format

Use clear, descriptive commit messages:
- Start with a verb in imperative mood (Add, Fix, Update, Remove, Refactor)
- Keep the first line under 72 characters
- Reference issues when applicable

Examples:
```
Add podcast episode scheduling feature
Fix audio file upload validation
Update README with setup instructions
```

### Branch Naming

- Feature branches: `feature/<description>`
- Bug fixes: `fix/<description>`
- Claude branches: `claude/<description>-<session-id>`

## AI Assistant Instructions

### Before Making Changes

1. **Read before editing**: Always read files before modifying them
2. **Understand context**: Review related files to understand the broader codebase
3. **Check for tests**: If tests exist, understand what they cover before making changes

### When Implementing Features

1. Keep changes minimal and focused
2. Don't over-engineer - implement only what's requested
3. Avoid adding unnecessary abstractions
4. Test your changes when a test framework is available

### What to Avoid

- Don't add features beyond what was requested
- Don't refactor unrelated code while fixing bugs
- Don't add comments to code you didn't change
- Don't create documentation files unless explicitly asked
- Don't guess at project requirements - ask for clarification

### Security Considerations

- Never commit secrets, API keys, or credentials
- Validate user input at system boundaries
- Be cautious with file system operations
- Follow OWASP security guidelines

## Commands Reference

> This section will be populated as the project develops with build, test, and run commands.

### Placeholder Commands

```bash
# Install dependencies (update once stack is chosen)
# npm install / pip install -r requirements.txt / etc.

# Run tests (update once testing framework is set up)
# npm test / pytest / etc.

# Start development server (update once implemented)
# npm run dev / python main.py / etc.
```

## Architecture Notes

> This section will be expanded as architectural decisions are made.

### Planned Features

Based on the project name "podcast-coord", potential features may include:
- Podcast episode scheduling
- Guest coordination
- Recording session management
- Content planning and organization

### Technology Decisions

Technology stack to be determined. Update this section when decisions are made:
- **Backend**: TBD
- **Frontend**: TBD (if applicable)
- **Database**: TBD
- **Hosting**: TBD

## Contributing

1. Create a feature branch from the main branch
2. Make your changes with clear commit messages
3. Ensure all tests pass (when available)
4. Create a pull request with a clear description

## Updating This File

As the project evolves, update this CLAUDE.md file to reflect:
- New directory structure and key files
- Added build/test/run commands
- Architectural decisions and patterns
- Project-specific conventions
- Known issues or gotchas
