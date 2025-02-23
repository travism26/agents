"use strict";
/**
 * Base Agent Class
 * Provides shared functionality and context management for all agents
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseAgent = void 0;
class BaseAgent {
    constructor(contextManager, agentType) {
        this.maxRecoveryAttempts = 3;
        this.contextManager = contextManager;
        this.agentType = agentType;
    }
    /**
     * Records a decision made by this agent
     */
    recordDecision(decision, reasoning, confidence, metadata = {}) {
        const agentDecision = {
            agent: this.agentType,
            timestamp: new Date(),
            decision,
            reasoning,
            confidence,
            metadata,
        };
        this.contextManager.recordDecision(agentDecision);
    }
    /**
     * Handles errors with automatic recovery attempts
     */
    async handleError(operation, fallbackStrategy) {
        try {
            return await operation();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.contextManager.recordError(this.agentType, errorMessage);
            // Attempt recovery if fallback strategy is provided
            if (fallbackStrategy) {
                const currentError = this.contextManager.getCurrentError();
                if (currentError &&
                    currentError.recoveryAttempts < this.maxRecoveryAttempts) {
                    this.contextManager.incrementRecoveryAttempts();
                    try {
                        const result = await fallbackStrategy();
                        this.contextManager.clearError();
                        return result;
                    }
                    catch (fallbackError) {
                        throw new Error(`Recovery attempt failed: ${fallbackError instanceof Error
                            ? fallbackError.message
                            : 'Unknown error'}`);
                    }
                }
            }
            throw error;
        }
    }
    /**
     * Initiates a handoff to another agent
     */
    handoffToAgent(targetAgent, reason, data) {
        this.contextManager.recordHandoff(this.agentType, targetAgent, reason, data);
    }
    /**
     * Makes a suggestion to another agent
     */
    makeSuggestion(suggestion, context) {
        this.contextManager.addSuggestion(this.agentType, suggestion, context);
    }
    /**
     * Updates the current phase and progress
     */
    updatePhase(phase, subPhase, progress) {
        this.contextManager.updatePhase(phase, subPhase, progress);
    }
    /**
     * Records performance metrics for the agent
     */
    recordPerformance(metrics) {
        this.contextManager.updatePerformance(metrics);
    }
    /**
     * Gets all decisions made by this agent
     */
    getAgentDecisions() {
        return this.contextManager.getAgentDecisions(this.agentType);
    }
    /**
     * Gets pending suggestions for this agent
     */
    getPendingSuggestions() {
        return this.contextManager
            .getPendingSuggestions()
            .filter((s) => s.agent === this.agentType);
    }
    /**
     * Gets the complete shared context
     */
    getSharedContext() {
        return this.contextManager.getContext();
    }
    /**
     * Validates if a handoff to this agent is expected
     */
    validateHandoff(fromAgent, data) {
        const context = this.getSharedContext();
        const lastHandoff = context.collaboration.handoffs[context.collaboration.handoffs.length - 1];
        return (lastHandoff &&
            lastHandoff.from === fromAgent &&
            lastHandoff.to === this.agentType);
    }
    /**
     * Checks if the agent can proceed with its operation
     */
    canProceed() {
        const context = this.getSharedContext();
        // Check if there's an active error
        if (context.state.error) {
            return false;
        }
        // Check if we're in the correct phase
        const validPhases = this.getValidPhases();
        if (!validPhases.includes(context.state.phase)) {
            return false;
        }
        // Check if there are blocking suggestions
        const pendingSuggestions = this.getPendingSuggestions();
        if (pendingSuggestions.length > 0) {
            return false;
        }
        return true;
    }
}
exports.BaseAgent = BaseAgent;
