# PR Review Management Workflow

This document outlines the workflow for managing PR reviews using the PR Review Bot.

## Overview

The PR Review Bot is designed to automate the review of pull requests and branches in GitHub repositories. It integrates with the Projector application to provide a seamless experience for managing and tracking PR reviews.

## Setup

### Prerequisites

- GitHub account with access to the repositories you want to review
- GitHub API token with appropriate permissions
- Anthropic or OpenAI API key for AI-powered reviews

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/projector.git
   cd projector
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the Projector application:
   ```bash
   python -m api.main
   ```

4. In a separate terminal, start the PR Review Bot:
   ```bash
   cd pr_review_bot
   python main.py --github-token YOUR_GITHUB_TOKEN --ai-provider anthropic --ai-key YOUR_ANTHROPIC_KEY
   ```

## Configuration

The PR Review Bot requires only two main inputs:
1. GitHub token
2. AI provider (Anthropic or OpenAI) and its API key

These can be provided via command-line arguments, environment variables, or a configuration file.

### Command-line Arguments

```bash
python main.py --github-token YOUR_GITHUB_TOKEN --ai-provider anthropic --ai-key YOUR_ANTHROPIC_KEY
```

### Environment Variables

```bash
export GITHUB_TOKEN=YOUR_GITHUB_TOKEN
export ANTHROPIC_API_KEY=YOUR_ANTHROPIC_KEY
# or
export OPENAI_API_KEY=YOUR_OPENAI_KEY

python main.py
```

### Configuration File

Create a JSON configuration file:

```json
{
  "github_token": "YOUR_GITHUB_TOKEN",
  "ai_provider": "anthropic",
  "anthropic_api_key": "YOUR_ANTHROPIC_KEY"
}
```

Then start the bot with:

```bash
python main.py --config path/to/config.json
```

## Workflow

1. **Bot Initialization**:
   - When the PR Review Bot starts, it connects to the Projector application
   - A notification appears in the Projector UI indicating that the bot is connected

2. **PR/Branch Detection**:
   - The bot monitors repositories for new PRs and branches
   - When a new PR or branch is detected, it appears in the PR & Branches section of the Projector UI
   - The status is initially set to "Under Review"

3. **Automated Review**:
   - If auto-review is enabled, the bot automatically reviews new PRs
   - The review includes code quality analysis, documentation validation, and other checks
   - Review comments are posted directly to the GitHub PR

4. **Status Updates**:
   - As the review progresses, the status in the Projector UI is updated
   - When a PR is merged, the status changes from "Under Review" to "Merged"
   - Failed reviews are marked accordingly

5. **Manual Interaction**:
   - Users can manually trigger reviews from the Projector UI
   - Additional review parameters can be configured for each review

## Troubleshooting

### Common Issues

1. **Connection Problems**:
   - Ensure the Projector application is running
   - Check that the PR Review Bot is using the correct Projector API URL

2. **Authentication Errors**:
   - Verify that your GitHub token has the necessary permissions
   - Ensure your AI provider API key is valid

3. **Review Failures**:
   - Check the PR Review Bot logs for detailed error messages
   - Verify that the repository is accessible to the bot

## Development

### Adding New Features

To extend the PR Review Bot functionality:

1. Add new modules to the `pr_review_bot` package
2. Update the main class to incorporate the new features
3. Extend the API routes in `api/routes/pr_review_bot.py` if needed
4. Update the UI components to expose the new features

### Testing

Run tests with:

```bash
pytest tests/
```

## References

- [GitHub API Documentation](https://docs.github.com/en/rest)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
