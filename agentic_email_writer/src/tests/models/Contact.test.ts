import mongoose, { Types } from 'mongoose';
import { Contact, Company, IContact, ICompany } from '../../models';

describe('Contact Model', () => {
  let testCompany: ICompany & { _id: Types.ObjectId };

  beforeEach(async () => {
    testCompany = (await Company.create({
      name: 'Test Company',
      details: {
        industry: 'Technology',
      },
    })) as ICompany & { _id: Types.ObjectId };
  });

  afterEach(async () => {
    await Contact.deleteMany({});
    await Company.deleteMany({});
  });

  it('should create a new contact successfully', async () => {
    const validContact = {
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
      email: 'jane@testcompany.com',
      linkedIn: 'https://linkedin.com/in/janesmith',
    };

    const contact = await Contact.create(validContact);
    expect(contact._id).toBeDefined();
    expect(contact.name).toBe(validContact.name);
    expect(contact.title).toBe(validContact.title);
    expect((contact.company as Types.ObjectId).toString()).toBe(
      testCompany._id.toString()
    );
    expect(contact.email).toBe(validContact.email);
    expect(contact.linkedIn).toBe(validContact.linkedIn);
    expect(contact.createdAt).toBeDefined();
    expect(contact.updatedAt).toBeDefined();
  });

  it('should fail to create a contact without required fields', async () => {
    const contactWithoutRequiredFields = {
      name: 'Jane Smith',
      // missing title and company
    };

    await expect(Contact.create(contactWithoutRequiredFields)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should fail to create a contact with invalid email', async () => {
    const contactWithInvalidEmail = {
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
      email: 'invalid-email',
    };

    await expect(Contact.create(contactWithInvalidEmail)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should populate company reference', async () => {
    const contact = await Contact.create({
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
    });

    const populatedContact = await Contact.findById(contact._id).populate<{
      company: ICompany;
    }>('company');

    expect(populatedContact?.company).toBeDefined();
    expect(populatedContact?.company.name).toBe(testCompany.name);
  });

  it('should update contact successfully', async () => {
    const contact = await Contact.create({
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
    });

    const newTitle = 'Chief Technology Officer';
    const updatedContact = await Contact.findByIdAndUpdate(
      contact._id,
      { title: newTitle },
      { new: true }
    );

    expect(updatedContact?.title).toBe(newTitle);
  });

  it('should trim whitespace from string fields', async () => {
    const contact = await Contact.create({
      name: '  Jane Smith  ',
      title: '  CTO  ',
      company: testCompany._id,
      email: '  jane@testcompany.com  ',
    });

    expect(contact.name).toBe('Jane Smith');
    expect(contact.title).toBe('CTO');
    expect(contact.email).toBe('jane@testcompany.com');
  });

  it('should convert email to lowercase', async () => {
    const contact = await Contact.create({
      name: 'Jane Smith',
      title: 'CTO',
      company: testCompany._id,
      email: 'JANE@TESTCOMPANY.COM',
    });

    expect(contact.email).toBe('jane@testcompany.com');
  });
});
