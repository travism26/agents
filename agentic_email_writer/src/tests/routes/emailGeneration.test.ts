import request from 'supertest';
import mongoose from 'mongoose';
import { Express } from 'express';
import { createServer } from '../../server'; // You'll need to create this
import { GeneratedEmail, Contact, Company, User } from '../../models';
import { ResearcherQueue } from '../../queues/ResearcherQueue';
import { researcherQueue } from '../../queues';
import { generateTestToken } from '../utils/auth'; // You'll need to create this

let app: Express;
let testUser: mongoose.Document;
let testCompany: mongoose.Document;
let testContact: mongoose.Document;
let testToken: string;

describe('Email Generation Routes', () => {
  beforeAll(async () => {
    app = await createServer();

    // Create test data
    testCompany = await Company.create({
      name: 'Test Company',
      details: {
        industry: 'Technology',
        size: '100-500',
        location: 'San Francisco, CA',
      },
    });

    testContact = await Contact.create({
      name: 'John Doe',
      title: 'CTO',
      company: testCompany._id,
      email: 'john@testcompany.com',
    });

    testUser = await User.create({
      name: 'Test User',
      title: 'Sales Manager',
      company: 'Our Company',
    });

    testToken = generateTestToken(testUser._id);
  });

  afterAll(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Contact.deleteMany({}),
      GeneratedEmail.deleteMany({}),
    ]);
    await mongoose.connection.close();
  });

  describe('Authentication', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .send({
          userId: testUser._id,
          contactId: testContact._id,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          userId: testUser._id,
          contactId: testContact._id,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept requests with valid authentication token', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser._id,
          contactId: testContact._id,
        });

      expect(response.status).toBe(202);
    });
  });

  describe('Job Submission', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should validate contact exists', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser._id,
          contactId: new mongoose.Types.ObjectId(), // Non-existent contact
        });

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('Contact not found');
    });

    it('should create job and return tracking info', async () => {
      const response = await request(app)
        .post('/api/generate-email/generate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          userId: testUser._id,
          contactId: testContact._id,
          options: {
            tone: 'formal',
            maxLength: 500,
            includeCta: true,
          },
        });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('emailId');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('estimatedCompletion');

      // Verify job was created in queue
      const job = await researcherQueue.getJob(response.body.data.jobId);
      expect(job).toBeTruthy();
      expect(job?.data).toHaveProperty('generatedEmailId');
    });
  });

  describe('Status Polling', () => {
    let testEmailId: string;

    beforeEach(async () => {
      // Create a test email generation record
      const email = await GeneratedEmail.create<IGeneratedEmail>({
        user: testUser._id,
        contact: testContact._id,
        status: 'pending',
      });
      testEmailId = email._id.toString();
    });

    it('should return 404 for non-existent email', async () => {
      const response = await request(app)
        .get(`/api/generate-email/status/${new mongoose.Types.ObjectId()}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not found');
    });

    it('should return current status for existing email', async () => {
      const response = await request(app)
        .get(`/api/generate-email/status/${testEmailId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('createdAt');
      expect(response.body.data).toHaveProperty('draftsCount');
      expect(response.body.data).toHaveProperty('articlesCount');
    });

    it('should handle status transitions', async () => {
      // Update email status
      await GeneratedEmail.findByIdAndUpdate(testEmailId, {
        status: 'researching',
        articles: [
          {
            title: 'Test Article',
            url: 'http://test.com',
            publishedDate: new Date(),
            summary: 'Test summary',
          },
        ],
      });

      const response = await request(app)
        .get(`/api/generate-email/status/${testEmailId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('researching');
      expect(response.body.data.articlesCount).toBe(1);
    });

    it('should not return draft content in status check', async () => {
      // Add a draft
      await GeneratedEmail.findByIdAndUpdate(testEmailId, {
        drafts: [
          {
            subject: 'Test Subject',
            body: 'Test body content',
            version: 1,
            createdAt: new Date(),
            reviewStatus: 'pending',
          },
        ],
      });

      const response = await request(app)
        .get(`/api/generate-email/status/${testEmailId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.draftsCount).toBe(1);
      expect(response.body.data).not.toHaveProperty('drafts');
    });
  });

  describe('Final Draft Retrieval', () => {
    let testEmailId: string;

    beforeEach(async () => {
      // Create a completed email generation record
      const email = await GeneratedEmail.create<IGeneratedEmail>({
        user: testUser._id,
        contact: testContact._id,
        status: 'completed',
        finalDraft: {
          subject: 'Final Test Subject',
          body: 'Final test body content',
          version: 2,
          createdAt: new Date(),
          reviewStatus: 'approved',
        },
        articles: [
          {
            title: 'Test Article',
            url: 'http://test.com',
            publishedDate: new Date(),
            summary: 'Test summary',
          },
        ],
      });
      testEmailId = email._id.toString();
    });

    it('should return 404 when final draft not ready', async () => {
      // Create an email without final draft
      const incompleteEmail = await GeneratedEmail.create({
        user: testUser._id,
        contact: testContact._id,
        status: 'writing',
      });

      const response = await request(app)
        .get(`/api/generate-email/final/${incompleteEmail._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.message).toContain('not available yet');
    });

    it('should return final draft and related articles', async () => {
      const response = await request(app)
        .get(`/api/generate-email/final/${testEmailId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('finalDraft');
      expect(response.body.data).toHaveProperty('articles');
      expect(response.body.data.finalDraft.subject).toBe('Final Test Subject');
      expect(response.body.data.articles).toHaveLength(1);
    });
  });
});
