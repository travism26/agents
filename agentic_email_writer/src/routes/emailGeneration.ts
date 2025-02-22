import { Router } from 'express';
import { asyncHandler, authenticate, validateRequest } from './middleware';
import { researcherQueue } from '../queues';
import mongoose from 'mongoose';
import {
  GeneratedEmail,
  Contact,
  Company,
  IGeneratedEmail,
  IContact,
  ICompany,
} from '../models';
import Joi from 'joi';

const router = Router();

// Validation schema for email generation request
const generateEmailSchema = Joi.object({
  userId: Joi.string().required(),
  contactId: Joi.string().required(),
  timeframe: Joi.object({
    startDate: Joi.date(),
    endDate: Joi.date().greater(Joi.ref('startDate')),
  }),
  options: Joi.object({
    tone: Joi.string().valid('formal', 'casual', 'friendly').default('formal'),
    maxLength: Joi.number().min(100).max(2000).default(500),
    includeCta: Joi.boolean().default(true),
  }),
});

// Route to generate a new email
router.post(
  '/generate',
  authenticate,
  validateRequest(generateEmailSchema),
  asyncHandler(async (req, res) => {
    const { userId, contactId, timeframe, options } = req.body;

    // Verify contact exists and get company
    const contact = await Contact.findById(contactId).populate<{
      company: ICompany;
    }>('company');
    if (!contact) {
      return res.status(404).json({
        error: {
          message: 'Contact not found',
        },
      });
    }

    // Create a new GeneratedEmail record
    const generatedEmail = await GeneratedEmail.create({
      user: userId,
      contact: contactId,
      status: 'pending',
    });

    // Start the email generation process by adding a job to the researcher queue
    const job = await researcherQueue.addJob({
      generatedEmailId: (
        generatedEmail._id as mongoose.Types.ObjectId
      ).toString(),
      contactId,
      companyId: (contact.company._id as mongoose.Types.ObjectId).toString(),
      timeframe,
    });

    return res.status(202).json({
      message: 'Email generation started',
      data: {
        jobId: job.id,
        emailId: generatedEmail._id as mongoose.Types.ObjectId,
        status: generatedEmail.status,
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000), // Estimate 5 minutes
      },
    });
  })
);

// Route to get email generation status
router.get(
  '/status/:emailId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { emailId } = req.params;

    const email = await GeneratedEmail.findById(emailId)
      .populate<{ contact: IContact }>('contact')
      .select('-drafts.body'); // Don't send draft content for performance

    if (!email) {
      return res.status(404).json({
        error: {
          message: 'Generated email not found',
        },
      });
    }

    return res.json({
      data: {
        status: email.status,
        createdAt: email.createdAt,
        completedAt: email.completedAt,
        failedReason: email.failedReason,
        draftsCount: email.drafts.length,
        articlesCount: email.articles.length,
        hasFinalDraft: !!email.finalDraft,
      },
    });
  })
);

// Route to get final email draft
router.get(
  '/final/:emailId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { emailId } = req.params;

    const email = await GeneratedEmail.findById(emailId).populate<{
      contact: IContact;
    }>('contact');

    if (!email) {
      return res.status(404).json({
        error: {
          message: 'Generated email not found',
        },
      });
    }

    if (!email.finalDraft) {
      return res.status(404).json({
        error: {
          message: 'Final draft not available yet',
        },
      });
    }

    return res.json({
      data: {
        status: email.status,
        finalDraft: email.finalDraft,
        articles: email.articles,
      },
    });
  })
);

export const emailGenerationRoutes = router;
