# PR Review Bot

The PR Review Bot is a tool that automatically monitors and reviews pull requests in GitHub repositories. It integrates with the Projector application to provide a seamless experience for managing and reviewing PRs.

## Features

- Monitors GitHub repositories for new and updated pull requests
- Automatically reviews pull requests using AI (Anthropic or OpenAI)
- Sets up webhooks to receive real-time notifications from GitHub
- Uses ngrok to expose the local server to the internet
- Integrates with the Projector application

## Requirements

- Python 3.8 or higher
- GitHub API token with appropriate permissions
- Anthropic or OpenAI API key
- ngrok account and auth token (for webhook functionality)

## Installation

1. Clone the repository
2. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

The PR Review Bot can be configured using command-line arguments, environment variables, or a configuration file.

### Environment Variables

Create a `.env` file with the following variables:

```
# GitHub configuration
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# AI configuration
ANTHROPIC_API_KEY=your_anthropic_key
# or
OPENAI_API_KEY=your_openai_key

# ngrok configuration
NGROK_AUTH_TOKEN=your_ngrok_auth_token
NGROK_ENABLED=true

# Server configuration
HOST=0.0.0.0
PORT=8001
LOG_LEVEL=INFO
```

### Command-Line Arguments

```bash
python -m pr_review_bot.main --github-token TOKEN --ai-provider {anthropic,openai} --ai-key KEY --ngrok --ngrok-auth-token TOKEN --setup-webhooks
```

## Usage

### Starting the Bot

```bash
python -m pr_review_bot.main
```

This will start the PR Review Bot with the default configuration. The bot will:

1. Connect to GitHub using the provided token
2. Start an ngrok tunnel to expose the local server to the internet
3. Set up webhooks for the repositories
4. Start monitoring for new and updated pull requests

### Reviewing a Specific PR

```bash
python -m pr_review_bot.main review --repo owner/repo --pr PR_NUMBER
```

This will review a specific pull request without starting the monitoring service.

### Setting Up Webhooks

```bash
python -m pr_review_bot.main setup-webhooks
```

This will set up webhooks for all repositories the GitHub token has access to.

## Integration with Projector

The PR Review Bot integrates with the Projector application to provide a seamless experience for managing and reviewing PRs. When the bot is started, it will:

1. Notify Projector that it is connected
2. Send updates about PR status to Projector
3. Receive commands from Projector to review specific PRs

## Troubleshooting

### Webhook Issues

If you're having issues with webhooks, make sure:

1. Your ngrok auth token is correct
2. The webhook URL is accessible from the internet
3. The webhook secret is correctly configured in both the bot and GitHub

### GitHub API Issues

If you're having issues with the GitHub API, make sure:

1. Your GitHub token has the appropriate permissions
2. You're not exceeding the GitHub API rate limits

## License

This project is licensed under the MIT License - see the LICENSE file for details.
