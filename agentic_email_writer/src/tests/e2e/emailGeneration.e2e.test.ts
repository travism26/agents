import request from 'supertest';
import { createServer } from '../../server';
import { Express } from 'express';
import { GeneratedEmail } from '../../models';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import '../mocks/redis.mock';
import '../mocks/prometheus.mock';
import '../mocks/auth.mock';
import {
  emailGenerationCounter,
  emailProcessingTime,
  researchQualityGauge,
  queueSizeGauge,
} from '../../utils/monitoring';

describe('Email Generation End-to-End Tests', () => {
  let app: Express;
  let mongod: MongoMemoryServer;

  const testUser = {
    name: 'Test User',
    title: 'Sales Manager',
    company: 'Acme Corp',
  };

  const testContact = {
    name: 'John Doe',
    title: 'CEO',
    company: {
      name: 'Tech Corp',
      industry: 'Technology',
      website: 'https://techcorp.com',
    },
    email: 'john@techcorp.com',
    linkedIn: 'linkedin.com/in/johndoe',
  };

  beforeAll(async () => {
    // Only create and connect if not already connected
    if (!mongoose.connection.readyState) {
      mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri);
    }
  });

  afterAll(async () => {
    // Only disconnect and stop if we created the connection
    if (mongod) {
      await mongoose.disconnect();
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    app = await createServer();
  });

  afterEach(async () => {
    await GeneratedEmail.deleteMany({});
  });

  describe('Complete Email Generation Flow', () => {
    it('should process an email through all stages and track metrics', async () => {
      // Initial metrics snapshot
      const initialEmailCount = await emailGenerationCounter.get();

      // Submit email generation request
      const response = await request(app)
        .post('/api/generate-email/generate')
        .send({
          user: testUser,
          contact: testContact,
          options: {
            tone: 'formal',
            maxLength: 500,
            includeCta: true,
          },
        });

      expect(response.status).toBe(202);
      expect(response.body.data).toHaveProperty('jobId');
      expect(response.body.data).toHaveProperty('emailId');
      expect(response.body.data).toHaveProperty('status', 'pending');
      expect(response.body.data).toHaveProperty('estimatedCompletion');

      const generatedEmail = await GeneratedEmail.findById(
        response.body.data.emailId
      );

      expect(generatedEmail).toBeTruthy();
      expect(generatedEmail?.status).toBe('pending');
      expect(generatedEmail?.user).toMatchObject(testUser);
      expect(generatedEmail?.contact).toMatchObject(testContact);

      // Verify metrics were updated
      const updatedEmailCount = await emailGenerationCounter.get();
      expect(updatedEmailCount.values[0].value).toBeGreaterThan(
        initialEmailCount.values[0].value
      );

      // Verify queue metrics
      const queueSizes = await queueSizeGauge.get();
      expect(queueSizes).toBeTruthy();

      // Verify processing time metrics
      const processingTimes = await emailProcessingTime.get();
      expect(processingTimes).toBeTruthy();

      // Verify research quality metrics
      const researchQuality = await researchQualityGauge.get();
      expect(researchQuality).toBeTruthy();
    });

    it('should handle errors gracefully and update metrics', async () => {
      // Submit invalid request
      const response = await request(app)
        .post('/api/generate-email/generate')
        .send({
          user: {
            // Missing required fields
          },
          contact: {
            // Missing required fields
          },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');

      // Verify error metrics were updated
      const errorMetrics = await emailGenerationCounter.get();
      const failureCount = errorMetrics.values.find(
        (v) => v.labels.status === 'failure'
      );
      expect(failureCount).toBeTruthy();
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const requests = 5;

      // Submit multiple requests concurrently
      const promises = Array(requests)
        .fill(null)
        .map(() =>
          request(app)
            .post('/api/generate-email/generate')
            .send({
              user: testUser,
              contact: testContact,
              options: {
                tone: 'formal',
                maxLength: 500,
                includeCta: true,
              },
            })
        );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all requests were successful
      responses.forEach((response) => {
        expect(response.status).toBe(202);
        expect(response.body.data).toHaveProperty('jobId');
        expect(response.body.data).toHaveProperty('emailId');
        expect(response.body.data).toHaveProperty('status', 'pending');
      });

      // Verify performance metrics
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should handle 5 requests within 5 seconds

      // Verify queue sizes were updated correctly
      const queueSizes = await queueSizeGauge.get();
      expect(queueSizes).toBeTruthy();

      // Verify all emails were created in database
      const emailCount = await GeneratedEmail.countDocuments();
      expect(emailCount).toBe(requests);
    });

    it('should handle the complete email generation lifecycle', async () => {
      // Submit generation request
      const response = await request(app)
        .post('/api/generate-email/generate')
        .send({
          user: testUser,
          contact: testContact,
          options: {
            tone: 'formal',
            maxLength: 500,
            includeCta: true,
          },
        });

      expect(response.status).toBe(202);
      const emailId = response.body.data.emailId;

      // Check initial status
      const statusResponse = await request(app).get(
        `/api/generate-email/status/${emailId}`
      );

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data).toHaveProperty('status', 'pending');
      expect(statusResponse.body.data.user).toMatchObject(testUser);
      expect(statusResponse.body.data.contact).toMatchObject(testContact);

      // Update email to completed state
      await GeneratedEmail.findByIdAndUpdate(emailId, {
        status: 'completed',
        finalDraft: {
          subject: 'Test Subject',
          body: 'Test Body',
          version: 1,
          createdAt: new Date(),
          reviewStatus: 'approved',
        },
        articles: [
          {
            title: 'Test Article',
            url: 'https://example.com',
            publishedDate: new Date(),
            summary: 'Test Summary',
          },
        ],
      });

      // Get final draft
      const finalResponse = await request(app).get(
        `/api/generate-email/final/${emailId}`
      );

      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body.data).toHaveProperty('status', 'completed');
      expect(finalResponse.body.data).toHaveProperty('finalDraft');
      expect(finalResponse.body.data).toHaveProperty('articles');
      expect(finalResponse.body.data.user).toMatchObject(testUser);
      expect(finalResponse.body.data.contact).toMatchObject(testContact);
    });
  });
});
