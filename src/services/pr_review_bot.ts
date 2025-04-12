import { PRReviewBotConfig } from '../types';

/**
 * PR Review Bot Service for interacting with the PR Review Bot API
 */
class PRReviewBotService {
  private apiBaseUrl: string;
  private activeConfig: PRReviewBotConfig | null = null;
  
  /**
   * Initialize PR Review Bot service with API base URL
   */
  constructor(apiBaseUrl: string = 'http://localhost:8000') {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Set active PR Review Bot configuration
   */
  setActiveConfig(config: PRReviewBotConfig): void {
    this.activeConfig = config;
  }
  
  /**
   * Clear active PR Review Bot configuration
   */
  clearActiveConfig(): void {
    this.activeConfig = null;
  }
  
  /**
   * Update API base URL
   */
  updateApiBaseUrl(apiBaseUrl: string): void {
    this.apiBaseUrl = apiBaseUrl;
  }
  
  /**
   * Get PR Review Bot configuration
   */
  async getConfig(): Promise<PRReviewBotConfig> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/config`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching PR Review Bot configuration:', error);
      throw error;
    }
  }
  
  /**
   * Update PR Review Bot configuration
   */
  async updateConfig(config: Partial<PRReviewBotConfig>): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/config`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(config)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating PR Review Bot configuration:', error);
      throw error;
    }
  }
  
  /**
   * Trigger a PR review
   */
  async reviewPR(repo: string, prNumber: number): Promise<{ status: string; message: string; review_url?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/review/${repo}/${prNumber}`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error triggering PR review:', error);
      throw error;
    }
  }
  
  /**
   * Set up webhooks for repositories
   */
  async setupWebhooks(repos?: string[]): Promise<{ status: string; message: string; details?: any }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/setup-webhooks`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ repos })
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error setting up webhooks:', error);
      throw error;
    }
  }
  
  /**
   * Get PR Review Bot status
   */
  async getStatus(): Promise<{ 
    status: string; 
    connection_status: string;
    config: PRReviewBotConfig;
    pr_status: Array<{
      repo: string;
      number: number;
      title: string;
      status: string;
      url: string;
    }>;
  }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/status`, {
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error getting PR Review Bot status:', error);
      throw error;
    }
  }
  
  /**
   * Start the PR Review Bot
   */
  async startBot(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/start`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error starting PR Review Bot:', error);
      throw error;
    }
  }
  
  /**
   * Stop the PR Review Bot
   */
  async stopBot(): Promise<{ status: string; message: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/api/pr-review-bot/stop`, {
        method: 'POST',
        headers: this.getHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error stopping PR Review Bot:', error);
      throw error;
    }
  }
  
  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.activeConfig?.githubToken) {
      headers['X-GitHub-Token'] = this.activeConfig.githubToken;
    }
    
    return headers;
  }
}

// Export singleton instance
export const prReviewBotService = new PRReviewBotService();
