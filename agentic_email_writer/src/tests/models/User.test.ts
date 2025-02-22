import mongoose from 'mongoose';
import { User, IUser } from '../../models';

describe('User Model', () => {
  afterEach(async () => {
    await User.deleteMany({});
  });

  it('should create a new user successfully', async () => {
    const validUser = {
      name: 'John Doe',
      title: 'Sales Manager',
      company: 'Acme Corp',
    };

    const user = await User.create(validUser);
    expect(user._id).toBeDefined();
    expect(user.name).toBe(validUser.name);
    expect(user.title).toBe(validUser.title);
    expect(user.company).toBe(validUser.company);
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it('should fail to create a user without required fields', async () => {
    const userWithoutRequiredField = {
      name: 'John Doe',
      // missing title and company
    };

    await expect(User.create(userWithoutRequiredField)).rejects.toThrow(
      mongoose.Error.ValidationError
    );
  });

  it('should update a user successfully', async () => {
    const user = await User.create({
      name: 'John Doe',
      title: 'Sales Manager',
      company: 'Acme Corp',
    });

    const updatedTitle = 'Senior Sales Manager';
    await User.findByIdAndUpdate(user._id, { title: updatedTitle });

    const updatedUser = await User.findById(user._id);
    expect(updatedUser?.title).toBe(updatedTitle);
  });

  it('should delete a user successfully', async () => {
    const user = await User.create({
      name: 'John Doe',
      title: 'Sales Manager',
      company: 'Acme Corp',
    });

    await User.findByIdAndDelete(user._id);
    const deletedUser = await User.findById(user._id);
    expect(deletedUser).toBeNull();
  });

  it('should trim whitespace from string fields', async () => {
    const user = await User.create({
      name: '  John Doe  ',
      title: '  Sales Manager  ',
      company: '  Acme Corp  ',
    });

    expect(user.name).toBe('John Doe');
    expect(user.title).toBe('Sales Manager');
    expect(user.company).toBe('Acme Corp');
  });
});
