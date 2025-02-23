db = db.getSiblingDB('agentic_email_writer');

// Create collections
db.createCollection('users');
db.createCollection('companies');
db.createCollection('contacts');
db.createCollection('generatedEmails');
