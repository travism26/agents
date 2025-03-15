/**
 * Types and interfaces for the Interview Preparation feature
 */

/**
 * Represents an interview question with context and metadata
 */
export interface Question {
  /** Type of question */
  type: 'technical' | 'cultural' | 'company-specific';

  /** The actual question text */
  content: string;

  /** Context about why this question is relevant */
  context: string;

  /** Difficulty level of the question */
  difficulty: 'basic' | 'intermediate' | 'advanced';

  /** Relevance indicators for different aspects */
  relevance: {
    /** Whether the question is relevant to the job role */
    jobRole: boolean;

    /** Whether the question relates to company values */
    companyValues: boolean;

    /** Whether the question relates to industry trends */
    industryTrends: boolean;
  };

  /** Optional suggested answer to the question */
  suggestedAnswer?: string;

  /** Optional follow-up questions that might be asked */
  followUpQuestions?: string[];
}

/**
 * Represents a talking point for the candidate to discuss during the interview
 */
export interface TalkingPoint {
  /** Main topic of the talking point */
  topic: string;

  /** Context about why this talking point is relevant */
  context: string;

  /** Optional relevant news articles related to the talking point */
  relevantNews?: string[];

  /** Optional key statistics to mention */
  keyStats?: string[];

  /** Different angles to approach discussing this topic */
  discussionAngles: string[];
}

/**
 * Represents an item in the interview preparation checklist
 */
export interface ChecklistItem {
  /** Category of the checklist item */
  category: 'research' | 'preparation' | 'logistics';

  /** The actual task to complete */
  task: string;

  /** Priority level of the task */
  priority: 'high' | 'medium' | 'low';

  /** Suggested timeframe for completing the task */
  timeframe: string;

  /** Optional resources to help with the task */
  resources?: string[];
}

/**
 * Represents the complete interview preparation result
 */
export interface InterviewPrepResult {
  /** List of potential interview questions */
  questions: Question[];

  /** List of talking points for the candidate */
  talkingPoints: TalkingPoint[];

  /** Preparation checklist */
  checklist: ChecklistItem[];

  /** Insights about the company */
  companyInsights: {
    /** Highlights about the company culture */
    cultureHighlights: string[];

    /** Recent developments at the company */
    recentDevelopments: string[];

    /** Challenges and opportunities the company is facing */
    challengesOpportunities: string[];
  };
}

/**
 * Options for customizing the interview preparation
 */
export interface InterviewPrepOptions {
  /** Number of questions to generate (default determined by implementation) */
  questionCount?: number;

  /** Whether to include suggested answers with questions */
  includeSuggestedAnswers?: boolean;

  /** Difficulty level of questions to generate */
  difficultyLevel?: 'basic' | 'intermediate' | 'advanced' | 'mixed';

  /** Types of questions to focus on */
  focusAreas?: ('technical' | 'cultural' | 'company-specific')[];

  /** Whether to force a refresh of cached data */
  forceRefresh?: boolean;
}
