"use strict";
/**
 * Writer Agent
 * Responsible for generating personalized email content based on
 * research findings and specified parameters.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriterAgent = void 0;
const openai_1 = require("@langchain/openai");
const base_1 = require("./base");
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// Initialize the OpenAI chat model
const llm = new openai_1.ChatOpenAI({
    modelName: process.env.MODEL_NAME || 'gpt-4-turbo',
    temperature: parseFloat(process.env.TEMPERATURE || '0.7'),
    maxTokens: parseInt(process.env.MAX_TOKENS || '4000'),
    openAIApiKey: process.env.OPENAI_API_KEY,
});
/**
 * WriterAgent class with autonomous email generation capabilities
 */
class WriterAgent extends base_1.BaseAgent {
    constructor(contextManager) {
        super(contextManager, 'writer');
        this.writerContext = {};
    }
    /**
     * Gets valid phases for this agent
     */
    getValidPhases() {
        return ['writing', 'revision'];
    }
    /**
     * Implements fallback strategy for writing failures
     */
    async getFallbackStrategy() {
        const context = this.getSharedContext();
        const latestDraft = context.memory.draftHistory[context.memory.draftHistory.length - 1];
        // Try a more straightforward approach
        const simplifiedDraft = await this.generateSimplifiedDraft(context.user, context.contact, latestDraft?.content);
        return simplifiedDraft;
    }
    /**
     * Generates a simplified draft when normal generation fails
     */
    async generateSimplifiedDraft(user, contact, previousContent) {
        const prompt = `Generate a simple, straightforward email draft.

Previous Content (for reference):
${previousContent || 'No previous content'}

Contact:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}

Keep it brief and focused on scheduling a discussion.
Use a professional tone and standard business email format.`;
        const response = await llm.invoke([
            { role: 'system', content: 'You are an expert email writer.' },
            { role: 'user', content: prompt },
        ]);
        const content = response.content.toString();
        return {
            content,
            metadata: {
                tone: 'professional',
                wordCount: content.split(/\s+/).length,
                targetGoals: ['schedule_meeting'],
                includedArticles: [],
                personalizationFactors: ['role_based'],
                styleAdherence: {
                    formalityScore: 0.8,
                    toneAlignment: 0.8,
                    clarity: 0.9,
                },
            },
        };
    }
    /**
     * Extracts communication patterns from content
     */
    extractPatterns(content) {
        return (content.match(/(^|\. )[A-Z][^.!?]*[.!?]/g)?.map((s) => s.trim()) || []);
    }
    /**
     * Analyzes articles to determine the most compelling narrative
     */
    async analyzeArticles(articles, goal) {
        const prompt = `As an expert email writer, analyze these news articles and create a compelling narrative that supports the email goal.

Goal: ${goal}

Articles:
${articles
            .map((article) => `
Title: ${article.title}
Summary: ${article.summary}
Category: ${article.tags[0]}
`)
            .join('\n')}

Consider:
1. Relevance to the goal
2. Recency and impact
3. Narrative flow
4. Supporting evidence

Provide a JSON response with:
- narrative: A brief strategy for incorporating these articles
- selectedArticles: Array of article titles to reference`;
        const response = await llm.invoke([
            { role: 'system', content: 'You are an expert email strategist.' },
            { role: 'user', content: prompt },
        ]);
        const result = JSON.parse(response.content.toString());
        const selectedArticles = articles
            .filter((article) => result.selectedArticles.includes(article.title))
            .map((article) => article.id);
        return {
            narrative: result.narrative,
            selectedArticles,
        };
    }
    /**
     * Generates personalized content based on contact and context
     */
    async generatePersonalizedContent(contact, goal, style, narrative) {
        const prompt = `Create highly personalized email content for this contact.

Contact Information:
- Name: ${contact.name}
- Title: ${contact.title}
- Company: ${contact.company}

Goal: ${goal}
Style: ${style}
Narrative Strategy: ${narrative}

Previous Interactions: ${this.summarizePreviousInteractions()}

Consider:
1. Professional context
2. Industry relevance
3. Potential value proposition
4. Natural conversation flow

Generate email content that feels personal and purposeful.`;
        const response = await llm.invoke([
            { role: 'system', content: 'You are an expert email writer.' },
            { role: 'user', content: prompt },
        ]);
        return response.content.toString();
    }
    /**
     * Summarizes previous interactions for context
     */
    summarizePreviousInteractions() {
        if (!this.writerContext.previousEmails?.length) {
            return 'No previous interactions recorded';
        }
        const context = this.getSharedContext();
        const history = context.memory.draftHistory;
        const patterns = this.extractPatternsFromHistory(history);
        return `Previous drafts: ${history.length}
Common patterns: ${patterns.join(', ')}`;
    }
    /**
     * Extracts patterns from draft history
     */
    extractPatternsFromHistory(history) {
        const patterns = new Set();
        history.forEach((entry) => {
            const contentPatterns = this.extractPatterns(entry.content);
            contentPatterns.forEach((p) => patterns.add(p));
        });
        return Array.from(patterns);
    }
    /**
     * Determines optimal email style and tone based on context
     */
    determineOptimalStyle(contact, goal) {
        const context = this.getSharedContext();
        const history = context.memory.draftHistory;
        // Analyze successful drafts
        const successfulStyles = history
            .filter((draft) => draft.feedback && draft.feedback.score >= 80)
            .map((draft) => ({
            style: draft.content.includes('Dear') ? 'formal' : 'casual',
            tone: draft.content.includes('would you be interested')
                ? 'friendly'
                : 'direct',
        }));
        if (successfulStyles.length > 0) {
            // Use most common successful style
            const style = successfulStyles
                .map((s) => s.style)
                .reduce((a, b) => successfulStyles.filter((s) => s.style === a).length >=
                successfulStyles.filter((s) => s.style === b).length
                ? a
                : b);
            const tone = successfulStyles
                .map((s) => s.tone)
                .reduce((a, b) => successfulStyles.filter((s) => s.tone === a).length >=
                successfulStyles.filter((s) => s.tone === b).length
                ? a
                : b);
            return {
                style: style,
                tone: tone,
            };
        }
        // Default based on contact's role
        const formalTitles = ['CEO', 'President', 'Director', 'VP', 'Chief'];
        const isSeniorExecutive = formalTitles.some((title) => contact.title?.toLowerCase().includes(title.toLowerCase()));
        return {
            style: isSeniorExecutive ? 'formal' : 'professional',
            tone: isSeniorExecutive ? 'direct' : 'friendly',
        };
    }
    /**
     * Generates an email draft using autonomous decision making
     */
    async compose(user, contact, emailOptions, newsArticles) {
        // Verify we can proceed
        if (!this.canProceed()) {
            throw new Error('Cannot proceed with composition - invalid state or blocking suggestions');
        }
        try {
            // Record start time for performance tracking
            const startTime = Date.now();
            // Determine optimal style and tone
            const optimalStyle = this.determineOptimalStyle(contact, emailOptions.goal);
            const finalStyle = emailOptions.style || optimalStyle.style;
            const finalTone = emailOptions.tone || optimalStyle.tone;
            // Record style decision
            this.recordDecision('style_selection', `Selected ${finalStyle} style and ${finalTone} tone based on contact analysis`, 0.8, { style: finalStyle, tone: finalTone });
            // Analyze articles and create narrative
            const { narrative, selectedArticles } = await this.analyzeArticles(newsArticles, emailOptions.goal);
            // Generate content
            const content = await this.generatePersonalizedContent(contact, emailOptions.goal, finalStyle, narrative);
            // Generate subject line
            const subject = await this.generateSubjectLine(emailOptions.goal, narrative, finalTone);
            // Calculate metrics
            const wordCount = content.split(/\s+/).length;
            // Create metadata
            const metadata = {
                tone: finalTone,
                wordCount,
                targetGoals: [emailOptions.goal],
                includedArticles: selectedArticles,
                generationStrategy: narrative,
                personalizationFactors: [
                    'role-based-context',
                    'industry-alignment',
                    'news-integration',
                ],
                styleAdherence: {
                    formalityScore: finalStyle === 'formal' ? 0.9 : 0.7,
                    toneAlignment: 0.85,
                    clarity: 0.9,
                },
            };
            // Create draft
            const draft = { content, subject, metadata };
            // Update context
            this.writerContext.previousEmails = [
                ...(this.writerContext.previousEmails || []),
                draft,
            ];
            // Record performance metrics
            this.recordPerformance({
                writingTime: Date.now() - startTime,
            });
            // Record completion
            this.recordDecision('draft_completion', 'Successfully generated personalized email draft', 0.9, { wordCount, style: finalStyle });
            return draft;
        }
        catch (error) {
            // Attempt recovery using fallback strategy
            return this.handleError(async () => {
                throw error;
            }, async () => this.getFallbackStrategy());
        }
    }
    /**
     * Generates an engaging subject line
     */
    async generateSubjectLine(goal, narrative, tone) {
        const prompt = `Create an engaging email subject line.

Goal: ${goal}
Narrative: ${narrative}
Tone: ${tone}

Requirements:
1. Clear and concise
2. Engaging but professional
3. Aligned with email goal
4. No clickbait

Return only the subject line text.`;
        const response = await llm.invoke([
            { role: 'system', content: 'You are an expert email writer.' },
            { role: 'user', content: prompt },
        ]);
        return response.content.toString().trim();
    }
}
exports.WriterAgent = WriterAgent;
