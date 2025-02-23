"use strict";
/**
 * Shared Context Management System
 * Enables communication and state sharing between agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextManager = void 0;
class ContextManager {
    constructor(sessionId, user, contact, company) {
        this.context = {
            sessionId,
            startTime: new Date(),
            user,
            contact,
            company,
            state: {
                phase: 'research',
                progress: 0,
            },
            memory: {
                decisions: [],
                draftHistory: [],
                performance: {
                    totalRevisions: 0,
                    qualityScores: [],
                },
            },
            collaboration: {
                handoffs: [],
                suggestions: [],
            },
        };
    }
    /**
     * Records a decision made by an agent
     */
    recordDecision(decision) {
        this.context.memory.decisions.push(decision);
    }
    /**
     * Updates the current phase of email generation
     */
    updatePhase(phase, subPhase, progress) {
        this.context.state.phase = phase;
        if (subPhase)
            this.context.state.subPhase = subPhase;
        if (progress !== undefined)
            this.context.state.progress = progress;
    }
    /**
     * Records a handoff between agents
     */
    recordHandoff(from, to, reason, data) {
        this.context.collaboration.handoffs.push({
            from,
            to,
            timestamp: new Date(),
            reason,
            data,
        });
    }
    /**
     * Records research findings
     */
    setResearchFindings(articles, angle, relevanceScores) {
        this.context.memory.researchFindings = {
            articles,
            angle,
            relevanceScores,
        };
    }
    /**
     * Records a new draft version
     */
    addDraftVersion(content, feedback) {
        this.context.memory.draftHistory.push({
            version: this.context.memory.draftHistory.length,
            content,
            timestamp: new Date(),
            feedback,
        });
    }
    /**
     * Records a suggestion from one agent to another
     */
    addSuggestion(agent, suggestion, context) {
        this.context.collaboration.suggestions.push({
            agent,
            timestamp: new Date(),
            suggestion,
            context,
            status: 'pending',
        });
    }
    /**
     * Updates the status of a suggestion
     */
    updateSuggestionStatus(index, status) {
        if (this.context.collaboration.suggestions[index]) {
            this.context.collaboration.suggestions[index].status = status;
        }
    }
    /**
     * Records an error and its recovery attempts
     */
    recordError(agent, message) {
        this.context.state.error = {
            agent,
            message,
            timestamp: new Date(),
            recoveryAttempts: 0,
        };
    }
    /**
     * Increments the recovery attempts for the current error
     */
    incrementRecoveryAttempts() {
        if (this.context.state.error) {
            this.context.state.error.recoveryAttempts++;
        }
    }
    /**
     * Clears the current error state
     */
    clearError() {
        delete this.context.state.error;
    }
    /**
     * Updates performance metrics
     */
    updatePerformance(metrics) {
        Object.assign(this.context.memory.performance, metrics);
    }
    /**
     * Gets the current context state
     */
    getContext() {
        return { ...this.context };
    }
    /**
     * Gets the latest draft version
     */
    getLatestDraft() {
        const history = this.context.memory.draftHistory;
        return history.length > 0 ? history[history.length - 1].content : null;
    }
    /**
     * Gets all decisions made by a specific agent
     */
    getAgentDecisions(agent) {
        return this.context.memory.decisions.filter((d) => d.agent === agent);
    }
    /**
     * Gets the current error state if any
     */
    getCurrentError() {
        return this.context.state.error;
    }
    /**
     * Gets all pending suggestions
     */
    getPendingSuggestions() {
        return this.context.collaboration.suggestions.filter((s) => s.status === 'pending');
    }
}
exports.ContextManager = ContextManager;
