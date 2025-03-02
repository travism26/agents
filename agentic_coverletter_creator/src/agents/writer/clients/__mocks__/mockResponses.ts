/**
 * Mock responses for testing LLM clients
 */

/**
 * Mock OpenAI API response for chat completions
 */
export const mockOpenAIChatCompletionResponse = {
  id: 'chatcmpl-123456789',
  object: 'chat.completion',
  created: 1677858242,
  model: 'gpt-4o',
  usage: {
    prompt_tokens: 56,
    completion_tokens: 31,
    total_tokens: 87,
  },
  choices: [
    {
      message: {
        role: 'assistant',
        content:
          'This is a mock response from the OpenAI API for testing purposes.',
      },
      finish_reason: 'stop',
      index: 0,
    },
  ],
};

/**
 * Mock OpenAI API error response
 */
export const mockOpenAIErrorResponse = {
  error: {
    message: 'The API key provided is invalid or has expired.',
    type: 'invalid_request_error',
    param: null,
    code: 'invalid_api_key',
  },
};

/**
 * Mock cover letter response for testing
 */
export const mockCoverLetterResponse = {
  id: 'chatcmpl-987654321',
  object: 'chat.completion',
  created: 1677858242,
  model: 'gpt-4o',
  usage: {
    prompt_tokens: 1024,
    completion_tokens: 512,
    total_tokens: 1536,
  },
  choices: [
    {
      message: {
        role: 'assistant',
        content: `
March 2, 2025

John Smith
123 Main Street
Anytown, USA 12345
john.smith@email.com
(555) 123-4567

Hiring Manager
Acme Corporation
456 Business Avenue
Metropolis, USA 67890

Dear Hiring Manager,

I am writing to express my interest in the Software Engineer position at Acme Corporation. As a passionate developer with over five years of experience in full-stack development, I was excited to learn about this opportunity through your company website. Acme's commitment to innovation and sustainable technology solutions aligns perfectly with my professional values and career aspirations.

Throughout my career, I have developed expertise in JavaScript, TypeScript, and React, which I understand are key technologies for this role. At my current position with Tech Solutions Inc., I successfully led the development of a customer portal that improved user engagement by 45% and reduced support tickets by 30%. This project required close collaboration with cross-functional teams and careful attention to user experience, skills I would bring to the development team at Acme.

I am particularly impressed by Acme's recent launch of the AI-powered analytics platform and would be thrilled to contribute to similar cutting-edge projects. My experience optimizing application performance and implementing responsive design principles would help ensure that Acme's products continue to deliver exceptional user experiences while maintaining technical excellence.

My educational background in Computer Science, combined with continuous learning through professional certifications, has given me a solid foundation in software engineering principles and best practices. I am always eager to expand my knowledge and stay current with emerging technologies.

I would welcome the opportunity to discuss how my skills and experiences align with Acme Corporation's needs. Thank you for considering my application. I look forward to the possibility of contributing to your innovative team.

Sincerely,

John Smith
        `,
      },
      finish_reason: 'stop',
      index: 0,
    },
  ],
};

/**
 * Mock rate limit error response
 */
export const mockRateLimitErrorResponse = {
  error: {
    message: 'Rate limit exceeded. Please try again later.',
    type: 'rate_limit_error',
    param: null,
    code: 'rate_limit_exceeded',
  },
};

/**
 * Mock server error response
 */
export const mockServerErrorResponse = {
  error: {
    message: 'The server encountered an internal error.',
    type: 'server_error',
    param: null,
    code: 'internal_server_error',
  },
};
