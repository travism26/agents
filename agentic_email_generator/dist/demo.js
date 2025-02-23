"use strict";
/**
 * Demo file showcasing the Agentic Email Generator
 * This demo targets generating an email to Elon Musk for business development
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
// Mock user (sender) information
const user = {
    _id: 'demo-user',
    name: 'John Doe',
    title: 'Business Development Manager',
    company: 'Our Company',
};
// Contact information for Elon Musk
const contact = {
    _id: 'elon-musk',
    name: 'Elon Musk',
    title: 'CEO',
    company: 'X Corp',
};
// Company information
const company = {
    _id: 'x-corp',
    name: 'X Corp',
    details: {
        industry: 'Technology',
        focus: ['Social Media', 'AI', 'Digital Payments'],
    },
};
// Email generation options
const emailOptions = {
    goal: 'Secure a meeting to discuss AI-driven social media analytics solutions',
    style: 'professional',
    tone: 'direct',
    includeSalutation: true,
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
        const result = await (0, index_1.generateEmails)(user, contact, company, emailOptions);
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
        }
        else {
            console.log('\n❌ Email Generation Failed');
            console.log('Reason:', result.record.failedReason);
        }
    }
    catch (error) {
        console.error('\n❌ Error during email generation:');
        console.error(error instanceof Error ? error.message : 'An unknown error occurred');
    }
}
// Run the demo
runDemo().catch(console.error);
