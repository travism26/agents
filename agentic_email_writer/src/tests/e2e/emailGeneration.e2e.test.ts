import request from 'supertest';
import { createServer } from '../../server';
import { Express } from 'express';
import { GeneratedEmail, Company, Contact, User } from '../../models';
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
  let testCompany: any;
  let testContact: any;
  let testUser: any;

  let mongod: MongoMemoryServer;

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

    // Create test data
    testCompany = await Company.create({
      name: 'Test Company',
      details: {
        industry: 'Technology',
        size: '1000+',
        location: 'San Francisco',
      },
    });

    testContact = await Contact.create({
      name: 'John Doe',
      title: 'CEO',
      company: testCompany._id,
    });

    testUser = await User.create({
      name: 'Test User',
      title: 'Sales Manager',
      company: testCompany._id,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await Company.deleteMany({});
    await Contact.deleteMany({});
    await User.deleteMany({});
    await GeneratedEmail.deleteMany({});

    // No need to close queue connections as they are mocked
  });

  describe('Complete Email Generation Flow', () => {
    it('should process an email through all stages and track metrics', async () => {
      // Initial metrics snapshot
      const initialEmailCount = await emailGenerationCounter.get();

      // Submit email generation request
      const response = await request(app).post('/api/generate-email').send({
        userId: testUser._id,
        contactId: testContact._id,
        companyId: testCompany._id,
      });

      expect(response.status).toBe(202);
      expect(response.body).toHaveProperty('jobId');

      const generatedEmail = await GeneratedEmail.findOne({
        user: testUser._id,
        contact: testContact._id,
      });

      expect(generatedEmail).toBeTruthy();
      expect(generatedEmail?.status).toBe('pending');

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
      const response = await request(app).post('/api/generate-email').send({
        userId: 'invalid-id',
        contactId: 'invalid-id',
        companyId: 'invalid-id',
      });

      expect(response.status).toBe(400);

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
          request(app).post('/api/generate-email').send({
            userId: testUser._id,
            contactId: testContact._id,
            companyId: testCompany._id,
          })
        );

      const responses = await Promise.all(promises);
      const endTime = Date.now();

      // Verify all requests were successful
      responses.forEach((response) => {
        expect(response.status).toBe(202);
        expect(response.body).toHaveProperty('jobId');
      });

      // Verify performance metrics
      const processingTime = endTime - startTime;
      expect(processingTime).toBeLessThan(5000); // Should handle 5 requests within 5 seconds

      // Verify queue sizes were updated correctly
      const queueSizes = await queueSizeGauge.get();
      expect(queueSizes).toBeTruthy();
    });
  });
});
