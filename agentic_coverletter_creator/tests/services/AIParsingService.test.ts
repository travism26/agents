import { AIParsingService } from '../../src/services/AIParsingService';
import { BaseLLMClient } from '../../src/agents/writer/interfaces/LLMClient';
import { Resume } from '../../src/utils/resumeParser';

// Mock LLM client for testing
class MockLLMClient extends BaseLLMClient {
  private mockResponse: string;

  constructor(mockResponse: string) {
    super('mock-api-key', 'https://mock-api.com', 'MockLLM');
    this.mockResponse = mockResponse;
  }

  async generate() {
    return {
      text: this.mockResponse,
      usage: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      model: 'mock-model',
      finishReason: 'stop',
    };
  }
}

describe('AIParsingService', () => {
  // Sample resume text for testing
  const sampleResumeText = `
    John Doe
    Software Engineer
    john.doe@example.com
    (123) 456-7890
    San Francisco, CA

    EXPERIENCE
    Senior Software Engineer, Tech Corp
    January 2020 - Present
    - Led development of microservices architecture
    - Implemented CI/CD pipelines
    - Mentored junior developers

    Software Engineer, Startup Inc
    June 2017 - December 2019
    - Developed frontend applications using React
    - Built RESTful APIs with Node.js
    - Improved application performance by 40%

    EDUCATION
    Master of Computer Science, Stanford University
    2015 - 2017

    Bachelor of Science in Computer Engineering, MIT
    2011 - 2015

    SKILLS
    JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes
  `;

  // Sample AI response in JSON format
  const mockAIResponse = `
  {
    "personalInfo": {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "phone": "(123) 456-7890",
      "location": {
        "city": "San Francisco",
        "state": "CA",
        "country": "USA"
      }
    },
    "summary": "Experienced software engineer with expertise in full-stack development, microservices, and cloud technologies.",
    "experience": [
      {
        "title": "Senior Software Engineer",
        "company": "Tech Corp",
        "location": "San Francisco, CA",
        "startDate": "2020-01-01",
        "endDate": null,
        "current": true,
        "highlights": [
          "Led development of microservices architecture",
          "Implemented CI/CD pipelines",
          "Mentored junior developers"
        ],
        "technologies": ["Microservices", "CI/CD", "Leadership"]
      },
      {
        "title": "Software Engineer",
        "company": "Startup Inc",
        "location": "San Francisco, CA",
        "startDate": "2017-06-01",
        "endDate": "2019-12-31",
        "current": false,
        "highlights": [
          "Developed frontend applications using React",
          "Built RESTful APIs with Node.js",
          "Improved application performance by 40%"
        ],
        "technologies": ["React", "Node.js", "RESTful APIs"]
      }
    ],
    "education": [
      {
        "degree": "Master of Computer Science",
        "institution": "Stanford University",
        "location": "Stanford, CA",
        "startDate": "2015-01-01",
        "endDate": "2017-01-01"
      },
      {
        "degree": "Bachelor of Science in Computer Engineering",
        "institution": "MIT",
        "location": "Cambridge, MA",
        "startDate": "2011-01-01",
        "endDate": "2015-01-01"
      }
    ],
    "skills": [
      {
        "name": "JavaScript",
        "category": "Programming Languages",
        "level": "Expert"
      },
      {
        "name": "TypeScript",
        "category": "Programming Languages",
        "level": "Expert"
      },
      {
        "name": "React",
        "category": "Frontend",
        "level": "Expert"
      },
      {
        "name": "Node.js",
        "category": "Backend",
        "level": "Expert"
      },
      {
        "name": "Python",
        "category": "Programming Languages",
        "level": "Intermediate"
      },
      {
        "name": "AWS",
        "category": "Cloud",
        "level": "Advanced"
      },
      {
        "name": "Docker",
        "category": "DevOps",
        "level": "Advanced"
      },
      {
        "name": "Kubernetes",
        "category": "DevOps",
        "level": "Intermediate"
      }
    ]
  }`;

  it('should parse resume text using AI and return structured data', async () => {
    // Create mock LLM client with predefined response
    const mockLLMClient = new MockLLMClient(mockAIResponse);

    // Create AIParsingService with mock client
    const aiParsingService = new AIParsingService(mockLLMClient);

    // Parse resume text
    const result = await aiParsingService.parseResume(sampleResumeText);

    // Verify result
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.confidence.overall).toBeGreaterThan(0);

    // Verify parsed data
    const resumeData = result.data as Resume;
    expect(resumeData.personalInfo.name).toBe('John Doe');
    expect(resumeData.personalInfo.email).toBe('john.doe@example.com');
    expect(resumeData.experience.length).toBe(2);
    expect(resumeData.education.length).toBe(2);
    expect(resumeData.skills).toContain('JavaScript');
    expect(resumeData.skills).toContain('TypeScript');
  });

  it('should handle errors and return appropriate error information', async () => {
    // Create mock LLM client that returns invalid JSON
    const mockLLMClient = new MockLLMClient('Invalid JSON response');

    // Create AIParsingService with mock client
    const aiParsingService = new AIParsingService(mockLLMClient);

    // Parse resume text
    const result = await aiParsingService.parseResume(sampleResumeText);

    // Verify error handling
    expect(result).toBeDefined();
    expect(result.data).toBeNull();
    expect(result.confidence.overall).toBe(0);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].severity).toBe('high');
  });
});
