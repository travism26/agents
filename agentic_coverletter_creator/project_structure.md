# Cover Letter Generation Agent - Project Structure

This document outlines the recommended project structure for implementing the Cover Letter Generation Agent based on the detailed design document.

## Directory Structure

```
cover-letter-agent/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
├── src/
│   ├── agents/
│   │   ├── research/
│   │   │   ├── researchAgent.ts
│   │   │   └── searchClients.ts
│   │   ├── writer/
│   │   │   └── writerAgent.ts
│   │   └── evaluator/
│   │       └── evaluatorAgent.ts
│   ├── controllers/
│   │   └── coverLetterController.ts
│   ├── utils/
│   │   ├── resumeParser.ts
│   │   ├── inputSanitizer.ts
│   │   └── resilience.ts
│   ├── orchestrator.ts
│   └── index.ts
├── tests/
│   ├── agents/
│   │   ├── research/
│   │   │   ├── researchAgent.test.ts
│   │   │   └── searchClients.test.ts
│   │   ├── writer/
│   │   │   └── writerAgent.test.ts
│   │   └── evaluator/
│   │       └── evaluatorAgent.test.ts
│   ├── controllers/
│   │   └── coverLetterController.test.ts
│   ├── utils/
│   │   ├── resumeParser.test.ts
│   │   ├── inputSanitizer.test.ts
│   │   └── resilience.test.ts
│   ├── integration/
│   │   └── coverLetterGeneration.test.ts
│   └── e2e/
│       └── api.test.ts
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── jest.config.js
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Steps

Follow these steps to implement the Cover Letter Generation Agent:

1. **Project Setup**

   - Initialize a new TypeScript project
   - Install required dependencies
   - Configure TypeScript, Jest, and ESLint

2. **Core Components Implementation**

   - Implement utility classes (resumeParser, inputSanitizer, resilience)
   - Implement the three agents (Research, Writer, Evaluator)
   - Implement the Orchestrator

3. **API Layer Implementation**

   - Set up Express server
   - Implement controllers and routes
   - Configure middleware for file uploads and error handling

4. **Testing**

   - Write unit tests for each component
   - Write integration tests for the complete workflow
   - Write end-to-end tests for the API

5. **Deployment Configuration**
   - Set up Docker configuration
   - Configure CI/CD pipeline
   - Prepare environment variables

## Getting Started

### 1. Initialize the Project

```bash
# Create project directory
mkdir cover-letter-agent
cd cover-letter-agent

# Initialize npm project
npm init -y

# Install dependencies
npm install langchain @langchain/openai express multer pdf-parse mammoth axios zod winston dotenv

# Install dev dependencies
npm install -D typescript ts-node @types/node @types/express @types/multer jest ts-jest @types/jest supertest eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Initialize TypeScript
npx tsc --init
```

### 2. Configure TypeScript

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "sourceMap": true,
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 3. Configure Jest

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
```

### 4. Create Environment Variables

Create `.env.example`:

```
# API Keys
OPENAI_API_KEY=your_openai_api_key
BING_API_KEY=your_bing_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 5. Update package.json Scripts

Add the following scripts to `package.json`:

```json
"scripts": {
  "start": "node dist/index.js",
  "dev": "ts-node src/index.ts",
  "build": "tsc",
  "test": "jest",
  "test:watch": "jest --watch",
  "lint": "eslint src/**/*.ts",
  "lint:fix": "eslint src/**/*.ts --fix"
}
```

## Next Steps

After setting up the project structure, you can start implementing each component following the detailed design document. Begin with the utility classes, then implement the agents, and finally the orchestrator and API layer.

The implementation should follow the TypeScript interfaces and class structures defined in the design document. Each component should be thoroughly tested to ensure it works as expected.
