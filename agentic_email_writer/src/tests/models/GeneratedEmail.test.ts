import mongoose, { Types } from 'mongoose';
import {
  GeneratedEmail,
  User,
  Contact,
  Company,
  IUser,
  IContact,
  ICompany,
  IGeneratedEmail,
} from '../../models';

describe('GeneratedEmail Model', () => {
  let testUser: IUser & { _id: Types.ObjectId };
  let testContact: IContact & { _id: Types.ObjectId };
  let testCompany: ICompany & { _id: Types.ObjectId };

  beforeEach(async () => {
    // Create test company
    testCompany = (await Company.create({
      name: 'Test Company',
      details: { industry: 'Technology' },
    })) as ICompany & { _id: Types.ObjectId };

    // Create test user
    testUser = (await User.create({
      name: 'John Doe',
      title: 'Sales Manager',
      company: 'Acme Corp',
    })) as IUser & { _id: Types.ObjectId };

    // Create test contact
    testContact = (await Contact.create({
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
    })) as IContact & { _id: Types.ObjectId };
  });

  afterEach(async () => {
    await GeneratedEmail.deleteMany({});
    await Contact.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
  });

  it('should create a new generated email successfully', async () => {
    const validGeneratedEmail = {
      user: testUser._id,
      contact: testContact._id,
      status: 'pending',
    };

    const generatedEmail = (await GeneratedEmail.create(
      validGeneratedEmail
    )) as IGeneratedEmail & { _id: Types.ObjectId };
    expect(generatedEmail._id).toBeDefined();
    expect((generatedEmail.user as Types.ObjectId).toString()).toBe(
      testUser._id.toString()
    );
    expect((generatedEmail.contact as Types.ObjectId).toString()).toBe(
      testContact._id.toString()
    );
    expect(generatedEmail.status).toBe('pending');
    expect(generatedEmail.articles).toHaveLength(0);
    expect(generatedEmail.drafts).toHaveLength(0);
    expect(generatedEmail.createdAt).toBeDefined();
    expect(generatedEmail.updatedAt).toBeDefined();
  });

  it('should add articles to generated email', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser._id,
      contact: testContact._id,
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
      user: testUser._id,
      contact: testContact._id,
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
      user: testUser._id,
      contact: testContact._id,
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
      user: testUser._id,
      contact: testContact._id,
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

  it('should populate user and contact references', async () => {
    const generatedEmail = await GeneratedEmail.create({
      user: testUser._id,
      contact: testContact._id,
      status: 'pending',
    });

    const populatedEmail = await GeneratedEmail.findById(generatedEmail._id)
      .populate<{ user: IUser }>('user')
      .populate<{ contact: IContact }>('contact');

    expect(populatedEmail?.user.name).toBe(testUser.name);
    expect(populatedEmail?.contact.name).toBe(testContact.name);
  });
});
