import {
  User,
  Contact,
  Company,
  NewsArticle,
  Angle,
  GeneratedEmail,
  GeneratedEmailRecord,
} from '../src/models/models';

describe('Data Models', () => {
  describe('User Interface', () => {
    it('should validate a correct user object', () => {
      const user: User = {
        _id: '123',
        name: 'John Doe',
        title: 'Sales Director',
        company: 'Acme Corp',
      };
      expect(user).toBeDefined();
    });
  });

  describe('Contact Interface', () => {
    it('should validate a correct contact object', () => {
      const contact: Contact = {
        _id: '456',
        name: 'Jane Smith',
        title: 'VP Marketing',
        company: 'Tech Inc',
      };
      expect(contact).toBeDefined();
    });
  });

  describe('Company Interface', () => {
    it('should validate a correct company object', () => {
      const company: Company = {
        _id: '789',
        name: 'Tech Inc',
        details: {
          industry: 'Technology',
          size: '1000+',
          location: 'San Francisco',
        },
      };
      expect(company).toBeDefined();
    });
  });

  describe('NewsArticle Interface', () => {
    it('should validate a correct news article object', () => {
      const article: NewsArticle = {
        id: 'art123',
        title: 'Tech Industry Growth',
        url: 'https://example.com/article',
        publishedAt: '2024-02-23T12:00:00Z',
        summary: 'Technology sector shows strong growth in Q1 2024',
        source: 'Tech News Daily',
        companyName: 'Tech Inc',
        tags: ['technology', 'growth', 'q1'],
      };
      expect(article).toBeDefined();
    });
  });

  describe('GeneratedEmailRecord Interface', () => {
    it('should validate a complete email generation record', () => {
      const angle: Angle = {
        id: 'ang1',
        title: 'Partnership Opportunity',
        body: 'Exploring potential collaboration opportunities',
      };

      const article: NewsArticle = {
        id: 'art123',
        title: 'Tech Industry Growth',
        url: 'https://example.com/article',
        publishedAt: '2024-02-23T12:00:00Z',
        summary: 'Technology sector shows strong growth in Q1 2024',
        source: 'Tech News Daily',
        companyName: 'Tech Inc',
        tags: ['technology', 'growth', 'q1'],
      };

      const generatedEmail: GeneratedEmail = {
        _id: 'email1',
        angle,
        newsArticles: [article],
        generatedEmailBody:
          "Dear Jane, I noticed your company's recent growth...",
      };

      const record: GeneratedEmailRecord = {
        _id: 'rec123',
        userId: 'user123',
        contact: {
          _id: '456',
          name: 'Jane Smith',
          title: 'VP Marketing',
          company: 'Tech Inc',
        },
        createdAt: '2024-02-23T12:00:00Z',
        status: 'approved',
        generatedEmails: [generatedEmail],
      };

      expect(record).toBeDefined();
      expect(record.status).toBe('approved');
      expect(record.generatedEmails).toHaveLength(1);
    });

    it('should validate a failed email generation record', () => {
      const record: GeneratedEmailRecord = {
        _id: 'rec456',
        userId: 'user123',
        contact: {
          _id: '456',
          name: 'Jane Smith',
          title: 'VP Marketing',
          company: 'Tech Inc',
        },
        createdAt: '2024-02-23T12:00:00Z',
        status: 'failed',
        failedReason: 'No relevant news articles found',
        generatedEmails: [],
      };

      expect(record).toBeDefined();
      expect(record.status).toBe('failed');
      expect(record.failedReason).toBeDefined();
      expect(record.generatedEmails).toHaveLength(0);
    });
  });
});
