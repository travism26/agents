import mongoose from 'mongoose';
import { MongoServerError } from 'mongodb';
import { Company, ICompany } from '../../models/Company';

describe('Company Model Test', () => {
  beforeEach(async () => {
    await Company.deleteMany({});
  });

  it('should create a new company with required fields only', async () => {
    const validCompany = {
      name: 'Test Company',
    };

    const savedCompany = await Company.create(validCompany);
    expect(savedCompany._id).toBeDefined();
    expect(savedCompany.name).toBe(validCompany.name);
    expect(savedCompany.details).toBeDefined();
    expect(savedCompany.createdAt).toBeDefined();
    expect(savedCompany.updatedAt).toBeDefined();
  });

  it('should create a new company with all fields', async () => {
    const validCompany = {
      name: 'Full Details Company',
      details: {
        industry: 'Technology',
        size: '1000+',
        location: 'New York',
        website: 'https://example.com',
        description: 'A technology company',
      },
    };

    const savedCompany = await Company.create(validCompany);
    expect(savedCompany._id).toBeDefined();
    expect(savedCompany.name).toBe(validCompany.name);
    expect(savedCompany.details.industry).toBe(validCompany.details.industry);
    expect(savedCompany.details.size).toBe(validCompany.details.size);
    expect(savedCompany.details.location).toBe(validCompany.details.location);
    expect(savedCompany.details.website).toBe(validCompany.details.website);
    expect(savedCompany.details.description).toBe(
      validCompany.details.description
    );
  });

  it('should fail to create a company without required fields', async () => {
    const invalidCompany = {};

    await expect(Company.create(invalidCompany)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should enforce unique company names', async () => {
    const companyData = {
      name: 'Duplicate Company',
    };

    // Create indexes before testing unique constraint
    await Company.init();

    await Company.create(companyData);
    await expect(Company.create(companyData)).rejects.toThrow(MongoServerError);
  });

  it('should automatically set timestamps', async () => {
    const company = await Company.create({
      name: 'Timestamp Test Company',
    });

    expect(company.createdAt).toBeInstanceOf(Date);
    expect(company.updatedAt).toBeInstanceOf(Date);
  });

  it('should successfully find and update a company', async () => {
    const company = await Company.create({
      name: 'Original Company',
      details: {
        industry: 'Tech',
      },
    });

    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      {
        'details.industry': 'Software',
      },
      { new: true }
    );

    expect(updatedCompany).toBeDefined();
    expect(updatedCompany?.details.industry).toBe('Software');
  });

  it('should trim whitespace from string fields', async () => {
    const company = await Company.create({
      name: '  Whitespace Company  ',
      details: {
        industry: '  Technology  ',
        website: '  https://example.com  ',
      },
    });

    expect(company.name).toBe('Whitespace Company');
    expect(company.details.industry).toBe('Technology');
    expect(company.details.website).toBe('https://example.com');
  });
});
