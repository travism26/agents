/**
 * Demo file showcasing the Agentic Email Generator
 * This demo targets generating an email to Elon Musk for business development
 */

import { generateEmails, EmailOptions } from './index';
import { User, Contact, Company } from './models/models';
import { ContextManager } from './models/context';

// Mock user (sender) information
const user: User = {
  _id: 'demo-user',
  name: 'John Doe',
  title: 'Business Development Manager',
  company: 'Our Company',
};

// Contact information for Elon Musk
const contact: Contact = {
  _id: 'elon-musk',
  name: 'Elon Musk',
  title: 'CEO',
  company: 'Tesla',
};

// Company information
const company: Company = {
  _id: 'tesla',
  name: 'Tesla',
  details: {
    industry: 'Automotive',
    focus: ['Electric Vehicles', 'Solar Energy', 'Autonomous Driving'],
  },
};

// Email generation options
const emailOptions: EmailOptions = {
  goal: 'Retain a relationship with Elon Musk and Tesla',
  style: 'casual',
  tone: 'friendly',
  includeSalutation: false,
  includeSignature: true,
};

/**
 * Main demo function that generates an email and displays the results
 */
async function runDemo() {
  console.log('🚀 Starting Email Generation Demo');
  console.log('Target: Generating email to Elon Musk\n');

  try {
    console.log('Generating email...');
    const result = await generateEmails(user, contact, company, emailOptions);

    if (result.record.status === 'approved') {
      const email = result.record.generatedEmails[0];

      console.log('\n✅ Email Generated Successfully!');
      console.log('\n📧 Generated Email:');
      console.log('==================');
      console.log(email.generatedEmailBody);
      console.log('==================\n');

      console.log('📊 Generation Details:');
      console.log('- Generation ID:', result.record._id);
      console.log('- Created At:', result.record.createdAt);
      console.log('- News Articles Used:', email.newsArticles.length);
      console.log('- Angle:', email.angle.title);

      const util = require('util');
      console.log(util.inspect(result, false, null, true /* enable colors */));
    } else {
      console.log('\n❌ Email Generation Failed');
      console.log('Reason:', result.record.failedReason);
    }
  } catch (error) {
    console.error('\n❌ Error during email generation:');
    console.error(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

// Run the demo
runDemo().catch(console.error);
