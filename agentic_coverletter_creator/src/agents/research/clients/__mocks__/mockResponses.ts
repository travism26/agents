/**
 * Mock responses for API clients used in testing
 * These responses mimic the structure of real API responses
 */

/**
 * Mock Bing Search API response
 */
export const mockBingSearchResponse = {
  _type: 'SearchResponse',
  queryContext: {
    originalQuery: 'Acme Corporation company information',
  },
  webPages: {
    webSearchUrl:
      'https://www.bing.com/search?q=Acme+Corporation+company+information',
    totalEstimatedMatches: 123456,
    value: [
      {
        id: 'https://api.bing.microsoft.com/api/v7/#WebPages.0',
        name: 'Acme Corporation - Official Website',
        url: 'https://www.acmecorp.example.com',
        snippet:
          'Acme Corporation is a leading provider of innovative solutions for businesses. Founded in 1990, we have been delivering quality products and services to customers worldwide.',
        dateLastCrawled: '2025-02-28T10:15:00.0000000Z',
      },
      {
        id: 'https://api.bing.microsoft.com/api/v7/#WebPages.1',
        name: 'About Acme Corporation | Company History and Values',
        url: 'https://www.acmecorp.example.com/about',
        snippet:
          "Learn about Acme Corporation's history, mission, and values. Our company was founded with the vision of creating sustainable solutions for modern businesses.",
        dateLastCrawled: '2025-02-27T14:22:00.0000000Z',
      },
      {
        id: 'https://api.bing.microsoft.com/api/v7/#WebPages.2',
        name: 'Acme Corporation - Wikipedia',
        url: 'https://en.wikipedia.example.org/wiki/Acme_Corporation',
        snippet:
          "Acme Corporation is a fictional company that features prominently in the Road Runner/Wile E. Coyote animated cartoons. The company's name has become a synonym for any generic or fictional company.",
        dateLastCrawled: '2025-02-25T08:30:00.0000000Z',
      },
    ],
  },
  entities: {
    value: [
      {
        id: 'https://api.bing.microsoft.com/api/v7/#Entities.0',
        contractualRules: [
          {
            _type: 'ContractualRules/LicenseAttribution',
            targetPropertyName: 'description',
            mustBeCloseToContent: true,
            license: {
              name: 'CC-BY-SA',
              url: 'https://creativecommons.org/licenses/by-sa/3.0/',
            },
            licenseNotice: 'Text under CC-BY-SA license',
          },
        ],
        webSearchUrl: 'https://www.bing.com/entityexplore?q=Acme+Corporation',
        name: 'Acme Corporation',
        description:
          'Acme Corporation is a fictional company that features prominently in the Road Runner/Wile E. Coyote animated cartoons.',
        image: {
          name: 'Acme Corporation',
          thumbnailUrl: 'https://www.bing.com/th?id=AMMS_123456789',
          provider: [
            {
              _type: 'Organization',
              name: 'Wikipedia',
            },
          ],
          hostPageUrl: 'https://en.wikipedia.example.org/wiki/Acme_Corporation',
        },
      },
    ],
  },
};

/**
 * Mock Perplexity API response
 */
export const mockPerplexityResponse = {
  id: 'pplx-123456789',
  model: 'pplx-7b-online',
  created: 1709308800, // Unix timestamp for 2025-03-01
  answer:
    'Acme Corporation is a leading provider of innovative solutions for businesses across various industries. Founded in 1990 by John Smith, the company has grown from a small startup to a global enterprise with offices in 15 countries.\n\nKey information about Acme Corporation:\n\n1. **Industry**: Technology and Business Solutions\n2. **Headquarters**: San Francisco, California\n3. **CEO**: Sarah Johnson (since 2020)\n4. **Revenue**: $2.5 billion (2024)\n5. **Employees**: Approximately 5,000 worldwide\n6. **Core Values**: Innovation, Sustainability, Customer Focus, and Integrity\n7. **Products and Services**: Cloud computing solutions, enterprise software, consulting services, and digital transformation\n\nThe company is known for its commitment to sustainability, having pledged to achieve carbon neutrality by 2030. Acme Corporation has been recognized as one of the "Best Places to Work" for five consecutive years.',
  sources: [
    {
      title: 'About Acme Corporation | Company Profile',
      url: 'https://www.acmecorp.example.com/about',
      snippet:
        'Acme Corporation is a leading provider of innovative solutions for businesses. Founded in 1990, we have grown to become a global enterprise with a presence in 15 countries.',
      published_date: '2024-12-15',
    },
    {
      title: 'Acme Corporation Announces New Sustainability Initiative',
      url: 'https://www.businessnews.example.com/acme-sustainability-2025',
      snippet:
        'Acme Corporation has announced an ambitious plan to achieve carbon neutrality by 2030. The initiative includes transitioning to 100% renewable energy and implementing sustainable practices across all operations.',
      published_date: '2025-01-10',
    },
    {
      title: 'Interview with Sarah Johnson, CEO of Acme Corporation',
      url: 'https://www.techleaders.example.com/interviews/sarah-johnson-acme',
      snippet:
        'Sarah Johnson discusses her vision for Acme Corporation since taking the helm in 2020. Under her leadership, the company has expanded its product offerings and strengthened its commitment to innovation.',
      published_date: '2024-11-05',
    },
  ],
};

/**
 * Mock error responses for testing error handling
 */
export const mockErrorResponses = {
  // Bing Search API error responses
  bing: {
    // 401 Unauthorized
    unauthorized: {
      error: {
        code: 'InvalidApiKey',
        message: 'The specified API key is invalid or has expired.',
      },
    },
    // 429 Too Many Requests
    rateLimited: {
      error: {
        code: 'RateLimitExceeded',
        message:
          'You have exceeded the rate limit for API requests. Please try again later.',
      },
    },
    // 500 Internal Server Error
    serverError: {
      error: {
        code: 'InternalServerError',
        message:
          'The server encountered an internal error. Please try again later.',
      },
    },
  },

  // Perplexity API error responses
  perplexity: {
    // 401 Unauthorized
    unauthorized: {
      error: 'Invalid API key provided',
    },
    // 429 Too Many Requests
    rateLimited: {
      error: 'Rate limit exceeded. Please try again later.',
    },
    // 500 Internal Server Error
    serverError: {
      error: 'Internal server error occurred. Please try again later.',
    },
  },
};
