/**
 * Prompt templates for interview preparation
 */
export const InterviewPrompts = {
  /**
   * Prompt for generating technical interview questions
   */
  technicalQuestions: `
<InterviewQuestionGeneration>
  <Purpose>
    Generate {count} technical interview questions for a {role} position at {company}.
  </Purpose>
  <Context>
    Company: {company}
    Industry: {industry}
    Job Role: {role}
    Key Technologies: {technologies}
    Difficulty Level: {difficulty}
  </Context>
  <Requirements>
    <Format>
      For each question, provide:
      1. The question text
      2. Context about why this is relevant to the role and company
      3. A suggested answer (if includeSuggestedAnswers is true)
      4. 1-2 potential follow-up questions the interviewer might ask
    </Format>
    <Constraints>
      - Questions should be specific to the technologies mentioned
      - Questions should vary in complexity based on the difficulty level
      - Questions should be relevant to the company's industry and products
      - Include a mix of conceptual and practical questions
    </Constraints>
  </Requirements>
</InterviewQuestionGeneration>
`,

  /**
   * Prompt for generating cultural fit questions
   */
  culturalQuestions: `
<InterviewQuestionGeneration>
  <Purpose>
    Generate {count} cultural fit questions for an interview at {company}.
  </Purpose>
  <Context>
    Company: {company}
    Company Values: {values}
    Company Description: {description}
    Job Role: {role}
  </Context>
  <Requirements>
    <Format>
      For each question, provide:
      1. The question text
      2. Context about why this relates to the company culture
      3. A suggested approach to answering (if includeSuggestedAnswers is true)
      4. 1-2 potential follow-up questions the interviewer might ask
    </Format>
    <Constraints>
      - Questions should reflect the company's stated values
      - Questions should assess cultural alignment without being too obvious
      - Include questions about teamwork, conflict resolution, and work style
      - Questions should help reveal if the candidate would thrive in this environment
    </Constraints>
  </Requirements>
</InterviewQuestionGeneration>
`,

  /**
   * Prompt for generating company-specific questions
   */
  companyQuestions: `
<InterviewQuestionGeneration>
  <Purpose>
    Generate {count} company-specific questions for an interview at {company}.
  </Purpose>
  <Context>
    Company: {company}
    Recent Developments: {recentDevelopments}
    Company Challenges: {challenges}
    Industry Position: {industryPosition}
  </Context>
  <Requirements>
    <Format>
      For each question, provide:
      1. The question text
      2. Context about why this is relevant to the company's current situation
      3. A suggested approach to answering (if includeSuggestedAnswers is true)
      4. 1-2 potential follow-up questions the interviewer might ask
    </Format>
    <Constraints>
      - Questions should demonstrate knowledge of the company's recent news and developments
      - Questions should show understanding of the company's market position
      - Questions should be forward-looking and strategic
      - Questions should allow the candidate to demonstrate genuine interest in the company
    </Constraints>
  </Requirements>
</InterviewQuestionGeneration>
`,

  /**
   * Prompt for generating talking points
   */
  talkingPoints: `
<TalkingPointsGeneration>
  <Purpose>
    Generate talking points for a candidate to use during the "do you have any questions for us?" portion of an interview at {company}.
  </Purpose>
  <Context>
    Company: {company}
    Recent News: {recentNews}
    Company Values: {values}
    Job Role: {role}
  </Context>
  <Requirements>
    <Format>
      For each talking point, provide:
      1. The main topic
      2. Context about why this topic is relevant
      3. Key statistics or facts to mention (if available)
      4. Different angles to approach discussing this topic
    </Format>
    <Constraints>
      - Talking points should demonstrate research and genuine interest
      - Include topics related to company growth, culture, and future plans
      - Avoid basic questions that could be answered by reading the website
      - Include at least one talking point about recent company news or developments
      - Include at least one talking point about the team or department structure
    </Constraints>
  </Requirements>
</TalkingPointsGeneration>
`,

  /**
   * Prompt for generating a preparation checklist
   */
  preparationChecklist: `
<ChecklistGeneration>
  <Purpose>
    Generate a preparation checklist for a candidate interviewing for a {role} position at {company}.
  </Purpose>
  <Context>
    Company: {company}
    Industry: {industry}
    Job Role: {role}
    Interview Timeline: {timeline}
  </Context>
  <Requirements>
    <Format>
      For each checklist item, provide:
      1. The category (research, preparation, or logistics)
      2. The specific task to complete
      3. Priority level (high, medium, or low)
      4. Suggested timeframe for completion
      5. Helpful resources (if applicable)
    </Format>
    <Constraints>
      - Include items for before, during, and after the interview
      - Cover research tasks about the company, role, and interviewers
      - Include preparation for common and technical questions
      - Include logistics like what to bring and wear
      - Prioritize tasks based on their impact on interview success
    </Constraints>
  </Requirements>
</ChecklistGeneration>
`,

  /**
   * Prompt for extracting company insights
   */
  companyInsights: `
<CompanyInsightsExtraction>
  <Purpose>
    Extract key insights about {company} that would be valuable for interview preparation.
  </Purpose>
  <Context>
    Company Research: {companyResearch}
    Recent News: {recentNews}
    Company Values: {values}
    Industry Trends: {industryTrends}
  </Context>
  <Requirements>
    <Format>
      Provide insights in these categories:
      1. Culture Highlights: Key aspects of the company culture
      2. Recent Developments: Important news, product launches, or changes
      3. Challenges and Opportunities: Current challenges the company faces and opportunities for growth
    </Format>
    <Constraints>
      - Focus on actionable insights that can be used in interview responses
      - Highlight unique aspects of the company that differentiate it from competitors
      - Include both positive aspects and potential areas of concern
      - Connect insights to how the candidate can add value
    </Constraints>
  </Requirements>
</CompanyInsightsExtraction>
`,
};
