import {
  PromptTemplate,
  DEFAULT_TEMPLATES,
} from '../../../../src/agents/writer/templates/PromptTemplate';

describe('PromptTemplate', () => {
  describe('constructor', () => {
    it('should create a new instance with the provided template', () => {
      const template = 'This is a {{variable}} template';
      const promptTemplate = new PromptTemplate(template);

      expect(promptTemplate).toBeInstanceOf(PromptTemplate);
    });
  });

  describe('setVariable', () => {
    it('should set a variable value', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariable('name', 'World');

      expect(promptTemplate.getVariable('name')).toBe('World');
    });

    it('should return the instance for chaining', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      const result = promptTemplate.setVariable('name', 'World');

      expect(result).toBe(promptTemplate);
    });
  });

  describe('setVariables', () => {
    it('should set multiple variables at once', () => {
      const template = 'Hello, {{name}}! Today is {{day}}.';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariables({
        name: 'World',
        day: 'Monday',
      });

      expect(promptTemplate.getVariable('name')).toBe('World');
      expect(promptTemplate.getVariable('day')).toBe('Monday');
    });

    it('should return the instance for chaining', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      const result = promptTemplate.setVariables({ name: 'World' });

      expect(result).toBe(promptTemplate);
    });
  });

  describe('getVariable', () => {
    it('should return the variable value if set', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariable('name', 'World');

      expect(promptTemplate.getVariable('name')).toBe('World');
    });

    it('should return undefined if the variable is not set', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      expect(promptTemplate.getVariable('name')).toBeUndefined();
    });
  });

  describe('clearVariables', () => {
    it('should clear all variables', () => {
      const template = 'Hello, {{name}}! Today is {{day}}.';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariables({
        name: 'World',
        day: 'Monday',
      });

      promptTemplate.clearVariables();

      expect(promptTemplate.getVariable('name')).toBeUndefined();
      expect(promptTemplate.getVariable('day')).toBeUndefined();
    });

    it('should return the instance for chaining', () => {
      const template = 'Hello, {{name}}!';
      const promptTemplate = new PromptTemplate(template);

      const result = promptTemplate.clearVariables();

      expect(result).toBe(promptTemplate);
    });
  });

  describe('render', () => {
    it('should replace variables in the template', () => {
      const template = 'Hello, {{name}}! Today is {{day}}.';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariables({
        name: 'World',
        day: 'Monday',
      });

      const result = promptTemplate.render();

      expect(result).toBe('Hello, World! Today is Monday.');
    });

    it('should throw an error if a variable is not set', () => {
      const template = 'Hello, {{name}}! Today is {{day}}.';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariable('name', 'World');

      expect(() => promptTemplate.render()).toThrow(
        'Variable "day" is not set'
      );
    });

    it('should handle templates with no variables', () => {
      const template = 'Hello, World!';
      const promptTemplate = new PromptTemplate(template);

      const result = promptTemplate.render();

      expect(result).toBe('Hello, World!');
    });

    it('should handle multiple occurrences of the same variable', () => {
      const template = 'Hello, {{name}}! Nice to meet you, {{name}}.';
      const promptTemplate = new PromptTemplate(template);

      promptTemplate.setVariable('name', 'World');

      const result = promptTemplate.render();

      expect(result).toBe('Hello, World! Nice to meet you, World.');
    });
  });

  describe('static methods', () => {
    describe('fromTemplate', () => {
      it('should create a new instance from a template string', () => {
        const template = 'Hello, {{name}}!';
        const promptTemplate = PromptTemplate.fromTemplate(template);

        expect(promptTemplate).toBeInstanceOf(PromptTemplate);

        promptTemplate.setVariable('name', 'World');
        expect(promptTemplate.render()).toBe('Hello, World!');
      });
    });

    describe('fromFile', () => {
      it('should create a new instance from a template file content', () => {
        const templateContent = 'Hello, {{name}}!';
        const promptTemplate = PromptTemplate.fromFile(templateContent);

        expect(promptTemplate).toBeInstanceOf(PromptTemplate);

        promptTemplate.setVariable('name', 'World');
        expect(promptTemplate.render()).toBe('Hello, World!');
      });
    });
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('should contain the SYSTEM_PROMPT template', () => {
      expect(DEFAULT_TEMPLATES.SYSTEM_PROMPT).toBeDefined();
      expect(typeof DEFAULT_TEMPLATES.SYSTEM_PROMPT).toBe('string');
    });

    it('should contain the COVER_LETTER template', () => {
      expect(DEFAULT_TEMPLATES.COVER_LETTER).toBeDefined();
      expect(typeof DEFAULT_TEMPLATES.COVER_LETTER).toBe('string');
    });

    it('should contain the TONE_INSTRUCTIONS object', () => {
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS).toBeDefined();
      expect(typeof DEFAULT_TEMPLATES.TONE_INSTRUCTIONS).toBe('object');
    });

    it('should have various tone options in TONE_INSTRUCTIONS', () => {
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS.PROFESSIONAL).toBeDefined();
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS.ENTHUSIASTIC).toBeDefined();
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS.CONFIDENT).toBeDefined();
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS.CREATIVE).toBeDefined();
      expect(DEFAULT_TEMPLATES.TONE_INSTRUCTIONS.BALANCED).toBeDefined();
    });

    it('should be able to use the COVER_LETTER template with variables', () => {
      const promptTemplate = new PromptTemplate(DEFAULT_TEMPLATES.COVER_LETTER);

      promptTemplate.setVariables({
        candidateName: 'John Smith',
        jobTitle: 'Software Engineer',
        companyName: 'Acme Corporation',
        companyInfo: 'A leading technology company',
        companyValues: 'Innovation, Collaboration, Excellence',
        jobDescription: 'Developing software applications',
        candidateSkills: 'JavaScript, TypeScript, React',
        candidateExperience: '5 years of software development',
        candidateEducation: 'Bachelor of Computer Science',
        tone: 'Professional',
      });

      const result = promptTemplate.render();

      expect(result).toContain('John Smith');
      expect(result).toContain('Software Engineer');
      expect(result).toContain('Acme Corporation');
      expect(result).toContain('A leading technology company');
      expect(result).toContain('Innovation, Collaboration, Excellence');
      expect(result).toContain('Developing software applications');
      expect(result).toContain('JavaScript, TypeScript, React');
      expect(result).toContain('5 years of software development');
      expect(result).toContain('Bachelor of Computer Science');
      expect(result).toContain('Professional');
    });
  });
});
