export interface PRReviewBotConfig {
  id: string;
  name: string;
  githubToken: string;
  webhook_secret: string;
  auto_review: boolean;
  monitor_branches: boolean;
  setup_all_repos_webhooks: boolean;
  validate_documentation: boolean;
  documentation_files: string[];
  anthropic_api_key?: string;
  openai_api_key?: string;
  slack_bot_token?: string;
  slack_channel?: string;
  instructions?: string;
  isVerified?: boolean;
  ngrok_enabled?: boolean;
  ngrok_auth_token?: string;
  webhook_port?: number;
  webhook_host?: string;
}

export interface ProjectConfig {
  id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  githubToken?: string;
  githubUsername?: string;
  githubRepoName?: string;
  githubRepoOwner?: string;
  githubRepoFullName?: string;
  githubRepoDescription?: string;
  githubRepoUrl?: string;
  githubRepoPrivate?: boolean;
  githubRepoFork?: boolean;
  githubRepoDefaultBranch?: string;
  githubRepoCreatedAt?: string;
  githubRepoUpdatedAt?: string;
  githubRepoPushedAt?: string;
  githubRepoSize?: number;
  githubRepoStargazersCount?: number;
  githubRepoWatchersCount?: number;
  githubRepoForksCount?: number;
  githubRepoOpenIssuesCount?: number;
  githubRepoLanguage?: string;
  githubRepoHasIssues?: boolean;
  githubRepoHasProjects?: boolean;
  githubRepoHasWiki?: boolean;
  githubRepoHasPages?: boolean;
  githubRepoHasDownloads?: boolean;
  githubRepoArchived?: boolean;
  githubRepoDisabled?: boolean;
  githubRepoLicense?: string;
  githubRepoTopics?: string[];
  githubRepoVisibility?: string;
  githubRepoForks?: number;
  githubRepoOpenIssues?: number;
  githubRepoWatchers?: number;
  githubRepoNetworkCount?: number;
  githubRepoSubscribersCount?: number;
}

export interface ApiSettings {
  githubToken?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  slackBotToken?: string;
  slackChannel?: string;
}
