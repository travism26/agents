import mongoose from 'mongoose';
import { GeneratedEmail, IGeneratedEmail } from '../../models';

describe('GeneratedEmail Model', () => {
  const testUser = {
    name: 'John Doe',
    title: 'Sales Manager',
    company: 'Acme Corp'
  };

  const testContact = {
    name: 'Jane Smith',
    title: 'CTO',
    company: {
      name: 'Tech Corp',
      industry: 'Technology',
      website: 'https://techcorp.com'
    },
    email: 'jane@techcorp.com',
    linkedIn: 'linkedin.com/in/janesmith'
  };

  beforeEach(async () => {
    await GeneratedEmail.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a new generated email successfully', async () => {
    const validGeneratedEmail = {
      user: testUser,
      contact: testContact,
      status: 'pending',
    };

    const generatedEmail = await GeneratedEmail.create(
      validGeneratedEmail
    ) as IGeneratedEmail;

    expect(generatedEmail._id).toBeDefined();
    expect(generatedEmail.user).toMatchObject(testUser);
    expect(generatedEmail.contact).toMatchObject(testContact);
    expect(generatedEmail.status).toBe('pending');
    expect(generatedEmail.articles).toHaveLength(0);
    expect(generatedEmail.drafts).toHaveLength(0);
    expect(generatedEmail.createdAt).toBeDefined();
    expect(generatedEmail.updatedAt).toBeDefined();
  });

  it('should add articles to generated email', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser,
      contact: testContact,
      status: 'researching',
    });

    const articles = [
      {
        title: 'Test Article 1',
        url: 'https://example.com/article1',
        publishedDate: new Date(),
        summary: 'Test summary 1',
        relevanceScore: 0.8,
      },
      {
        title: 'Test Article 2',
        url: 'https://example.com/article2',
        publishedDate: new Date(),
        summary: 'Test summary 2',
        relevanceScore: 0.9,
      },
    ];

    const updatedEmail = await GeneratedEmail.findByIdAndUpdate(
      generatedEmail._id,
      { $push: { articles: { $each: articles } } },
      { new: true }
    );

    expect(updatedEmail?.articles).toHaveLength(2);
    expect(updatedEmail?.articles[0].title).toBe(articles[0].title);
    expect(updatedEmail?.articles[1].title).toBe(articles[1].title);
  });

  it('should add drafts to generated email', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser,
      contact: testContact,
      status: 'writing',
    });

    const draft = {
      subject: 'Test Subject',
      body: 'Test body content',
      version: 1,
      createdAt: new Date(),
      reviewStatus: 'pending' as const,
    };

    const updatedEmail = await GeneratedEmail.findByIdAndUpdate(
      generatedEmail._id,
      { $push: { drafts: draft } },
      { new: true }
    );

    expect(updatedEmail?.drafts).toHaveLength(1);
    expect(updatedEmail?.drafts[0].subject).toBe(draft.subject);
    expect(updatedEmail?.drafts[0].version).toBe(draft.version);
  });

  it('should update status and set final draft', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser,
      contact: testContact,
      status: 'reviewing',
    });

    const finalDraft = {
      subject: 'Final Subject',
      body: 'Final body content',
      version: 2,
      createdAt: new Date(),
      reviewStatus: 'approved' as const,
    };

    const updatedEmail = await GeneratedEmail.findByIdAndUpdate(
      generatedEmail._id,
      {
        status: 'completed',
        finalDraft,
        completedAt: new Date(),
      },
      { new: true }
    );

    expect(updatedEmail?.status).toBe('completed');
    expect(updatedEmail?.finalDraft).toBeDefined();
    expect(updatedEmail?.finalDraft?.subject).toBe(finalDraft.subject);
    expect(updatedEmail?.completedAt).toBeDefined();
  });

  it('should handle failure status with reason', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser,
      contact: testContact,
      status: 'researching',
    });

    const failedReason = 'Failed to fetch company articles';
    const updatedEmail = await GeneratedEmail.findByIdAndUpdate(
      generatedEmail._id,
      {
        status: 'failed',
        failedReason,
      },
      { new: true }
    );

    expect(updatedEmail?.status).toBe('failed');
    expect(updatedEmail?.failedReason).toBe(failedReason);
  });

  it('should validate required user fields', async () => {
    const invalidEmail = {
      user: {
        // Missing required fields
      },
      contact: testContact,
      status: 'pending',
    };

    await expect(GeneratedEmail.create(invalidEmail)).rejects.toThrow();
  });

  it('should validate required contact fields', async () => {
    const invalidEmail = {
      user: testUser,
      contact: {
        // Missing required fields
      },
      status: 'pending',
    };

    await expect(GeneratedEmail.create(invalidEmail)).rejects.toThrow();
  });

  it('should validate contact company fields', async () => {
    const invalidEmail = {
      user: testUser,
      contact: {
        ...testContact,
        company: {
          // Missing required name field
          industry: 'Technology',
        },
      },
      status: 'pending',
    };

    await expect(GeneratedEmail.create(invalidEmail)).rejects.toThrow();
  });

  it('should validate email format if provided', async () => {
    const invalidEmail = {
      user: testUser,
      contact: {
        ...testContact,
        email: 'invalid-email', // Invalid email format
      },
      status: 'pending',
    };

    await expect(GeneratedEmail.create(invalidEmail)).rejects.toThrow();
  });
});
