db = db.getSiblingDB('agentic_email_writer');

// Create a test user
const userResult = db.users.insertOne({
  name: "Test User",
  email: "test@example.com",
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a test company
const companyResult = db.companies.insertOne({
  name: "Tech Corp",
  details: {
    industry: "Software",
    size: "500-1000",
    location: "San Francisco, CA",
    website: "https://techcorp.example.com",
    description: "Leading software solutions provider"
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

// Create a test contact
db.contacts.insertOne({
  name: "John Smith",
  title: "CTO",
  company: companyResult.insertedId,
  email: "john.smith@techcorp.example.com",
  linkedIn: "https://linkedin.com/in/johnsmith",
  createdAt: new Date(),
  updatedAt: new Date()
});
