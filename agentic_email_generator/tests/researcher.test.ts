import { Contact, Company, NewsArticle } from '../src/models/models';
import { fetchNewsArticles, ArticleCategory } from '../src/agents/researcher';

describe('ResearcherAgent', () => {
  const mockContact: Contact = {
    _id: '1',
    name: 'John Doe',
    title: 'CEO',
    company: 'Test Corp',
  };

  const mockCompany: Company = {
    _id: '1',
    name: 'Test Corp',
    details: {
      industry: 'Technology',
    },
  };

  describe('fetchNewsArticles', () => {
    it('should filter out articles older than 6 months', async () => {
      const articles = await fetchNewsArticles(mockContact, mockCompany);
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      articles.forEach((article) => {
        const articleDate = new Date(article.publishedAt).getTime();
        expect(articleDate).toBeGreaterThanOrEqual(sixMonthsAgo.getTime());
      });
    });

    it('should categorize articles correctly', async () => {
      const articles = await fetchNewsArticles(mockContact, mockCompany);

      // Verify each article has exactly one category tag
      articles.forEach((article) => {
        expect(article.tags).toHaveLength(1);
        expect(Object.values(ArticleCategory)).toContain(article.tags[0]);
      });
    });

    it('should prioritize articles in the correct order', async () => {
      const articles = await fetchNewsArticles(mockContact, mockCompany);

      const categoryOrder = [
        ArticleCategory.PARTNERSHIPS_INVESTMENTS,
        ArticleCategory.DEVELOPMENTS_INNOVATIONS,
        ArticleCategory.LEADERSHIP_STRATEGY,
        ArticleCategory.ACHIEVEMENTS_MILESTONES,
        ArticleCategory.OTHER,
      ];

      // Check if articles are sorted by category priority
      for (let i = 1; i < articles.length; i++) {
        const prevCategoryIndex = categoryOrder.indexOf(
          articles[i - 1].tags[0] as ArticleCategory
        );
        const currentCategoryIndex = categoryOrder.indexOf(
          articles[i].tags[0] as ArticleCategory
        );
        expect(prevCategoryIndex).toBeLessThanOrEqual(currentCategoryIndex);
      }
    });

    it('should include required article fields', async () => {
      const articles = await fetchNewsArticles(mockContact, mockCompany);

      articles.forEach((article) => {
        expect(article).toHaveProperty('id');
        expect(article).toHaveProperty('title');
        expect(article).toHaveProperty('url');
        expect(article).toHaveProperty('publishedAt');
        expect(article).toHaveProperty('summary');
        expect(article).toHaveProperty('source');
        expect(article).toHaveProperty('companyName');
        expect(article).toHaveProperty('tags');
      });
    });
  });
});
