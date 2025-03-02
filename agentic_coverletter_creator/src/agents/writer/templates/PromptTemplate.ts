/**
 * Class for managing prompt templates
 * Provides functionality for creating and rendering templates with variables
 */
export class PromptTemplate {
  private template: string;
  private variables: Map<string, string> = new Map();

  /**
   * Creates a new PromptTemplate instance
   * @param template The template string with variable placeholders
   */
  constructor(template: string) {
    this.template = template;
  }

  /**
   * Sets a variable value
   * @param name The variable name
   * @param value The variable value
   * @returns The PromptTemplate instance for chaining
   */
  public setVariable(name: string, value: string): PromptTemplate {
    this.variables.set(name, value);
    return this;
  }

  /**
   * Sets multiple variables at once
   * @param variables Object with variable names as keys and values as values
   * @returns The PromptTemplate instance for chaining
   */
  public setVariables(variables: Record<string, string>): PromptTemplate {
    Object.entries(variables).forEach(([name, value]) => {
      this.setVariable(name, value);
    });
    return this;
  }

  /**
   * Gets a variable value
   * @param name The variable name
   * @returns The variable value or undefined if not set
   */
  public getVariable(name: string): string | undefined {
    return this.variables.get(name);
  }

  /**
   * Clears all variables
   * @returns The PromptTemplate instance for chaining
   */
  public clearVariables(): PromptTemplate {
    this.variables.clear();
    return this;
  }

  /**
   * Renders the template with the current variables
   * @returns The rendered template
   * @throws Error if a variable is used in the template but not set
   */
  public render(): string {
    let result = this.template;

    // Replace all variables in the template
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const matches = this.template.match(variableRegex) || [];

    for (const match of matches) {
      const variableName = match.slice(2, -2).trim();
      const variableValue = this.variables.get(variableName);

      if (variableValue === undefined) {
        throw new Error(`Variable "${variableName}" is not set`);
      }

      result = result.replace(match, variableValue);
    }

    return result;
  }

  /**
   * Creates a new PromptTemplate from a template string
   * @param template The template string
   * @returns A new PromptTemplate instance
   */
  public static fromTemplate(template: string): PromptTemplate {
    return new PromptTemplate(template);
  }

  /**
   * Creates a new PromptTemplate from a template file
   * @param templatePath The path to the template file
   * @returns A new PromptTemplate instance
   */
  public static fromFile(templateContent: string): PromptTemplate {
    return new PromptTemplate(templateContent);
  }
}

/**
 * Default templates for cover letter generation
 */
export const DEFAULT_TEMPLATES = {
  /**
   * System prompt template for cover letter generation
   */
  SYSTEM_PROMPT: `
<SystemPrompt>
  <Role>Professional Cover Letter Writer</Role>
  <Expertise>
    <Item>Creating personalized, compelling cover letters</Item>
    <Item>Highlighting candidate's relevant skills and experiences</Item>
    <Item>Tailoring content to specific jobs and companies</Item>
  </Expertise>
  <Task>Create a cover letter for a job application that is tailored to both the candidate's background and the specific job they're applying for</Task>
</SystemPrompt>`,

  /**
   * Cover letter generation template
   * Variables:
   * - candidateName: The name of the candidate
   * - jobTitle: The title of the job
   * - companyName: The name of the company
   * - companyInfo: Information about the company
   * - companyValues: The company's values and culture
   * - jobDescription: The job description
   * - candidateSkills: The candidate's skills
   * - candidateExperience: The candidate's work experience
   * - candidateEducation: The candidate's education
   * - tone: The desired tone of the cover letter
   */
  COVER_LETTER: `
<CoverLetterRequest>
  <Candidate>
    <Name>{{candidateName}}</Name>
    <Skills>{{candidateSkills}}</Skills>
    <Experience>{{candidateExperience}}</Experience>
    <Education>{{candidateEducation}}</Education>
  </Candidate>
  
  <Position>
    <JobTitle>{{jobTitle}}</JobTitle>
    <Company>{{companyName}}</Company>
    <JobDescription>{{jobDescription}}</JobDescription>
  </Position>
  
  <CompanyContext>
    <Information>{{companyInfo}}</Information>
    <Values>{{companyValues}}</Values>
  </CompanyContext>
  
  <OutputRequirements>
    <Tone>{{tone}}</Tone>
    <Length>Approximately 350-450 words</Length>
    <Format>Professional business letter format with date, address, greeting, body, closing, and signature</Format>
    <ContentFocus>
      <Item>Highlight the candidate's most relevant skills and experiences that match the job requirements</Item>
      <Item>Reference specific company information and values to show genuine interest</Item>
      <Item>Include a polite request for an interview or further discussion</Item>
    </ContentFocus>
    <Structure>
      <Section>An engaging opening paragraph that mentions the position and expresses enthusiasm</Section>
      <Section>2-3 body paragraphs highlighting relevant qualifications and achievements</Section>
      <Section>A closing paragraph with a call to action and expression of gratitude</Section>
    </Structure>
  </OutputRequirements>
</CoverLetterRequest>`,

  /**
   * Template for generating a cover letter with a specific tone
   * Variables:
   * - tone: The desired tone of the cover letter
   */
  TONE_INSTRUCTIONS: {
    PROFESSIONAL: `
<ToneInstructions type="PROFESSIONAL">
  <Description>Formal, professional tone that demonstrates maturity and business acumen</Description>
  <Guidelines>
    <Item>Use precise language</Item>
    <Item>Avoid colloquialisms</Item>
    <Item>Maintain a respectful, confident voice throughout</Item>
  </Guidelines>
</ToneInstructions>`,

    ENTHUSIASTIC: `
<ToneInstructions type="ENTHUSIASTIC">
  <Description>Convey genuine excitement about the role and company</Description>
  <Guidelines>
    <Item>Use dynamic language</Item>
    <Item>Demonstrate passion for the industry</Item>
    <Item>Show eagerness to contribute while maintaining professionalism</Item>
  </Guidelines>
</ToneInstructions>`,

    CONFIDENT: `
<ToneInstructions type="CONFIDENT">
  <Description>Project self-assurance without arrogance</Description>
  <Guidelines>
    <Item>Emphasize achievements with concrete metrics</Item>
    <Item>Use decisive language</Item>
    <Item>Clearly articulate the value the candidate would bring to the company</Item>
  </Guidelines>
</ToneInstructions>`,

    CREATIVE: `
<ToneInstructions type="CREATIVE">
  <Description>Showcase originality and innovative thinking while remaining appropriate for the industry</Description>
  <Guidelines>
    <Item>Use vivid language</Item>
    <Item>Incorporate storytelling elements where suitable</Item>
    <Item>Demonstrate unique approaches to challenges</Item>
  </Guidelines>
</ToneInstructions>`,

    BALANCED: `
<ToneInstructions type="BALANCED">
  <Description>Strike a balance between professionalism and personality</Description>
  <Guidelines>
    <Item>Maintain formal structure</Item>
    <Item>Allow the candidate's character to shine through in select examples</Item>
    <Item>Express genuine interest in the position and company</Item>
  </Guidelines>
</ToneInstructions>`,
  },
};
