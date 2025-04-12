# PR Review Bot

The PR Review Bot is a tool that automatically monitors GitHub repositories for new pull requests and branches, and can provide reviews using AI.

## Features

- Monitors GitHub repositories for new pull requests and branches
- Automatically reviews pull requests using AI (Anthropic or OpenAI)
- Sets up webhooks for real-time notifications
- Uses ngrok to expose local server to the internet
- Integrates with Projector UI

## Requirements

- Python 3.8+
- GitHub token with appropriate permissions
- Anthropic or OpenAI API key
- ngrok (optional, but recommended for webhook functionality)

## Installation

1. Install the required dependencies:

```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your configuration:

```
# GitHub configuration
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# AI configuration
ANTHROPIC_API_KEY=your_anthropic_key
# or
OPENAI_API_KEY=your_openai_key

# ngrok configuration (optional)
NGROK_ENABLED=true
NGROK_AUTH_TOKEN=your_ngrok_auth_token
```

## Usage

### Starting the PR Review Bot

```bash
python -m pr_review_bot.main
```

### Command-line Options

- `--github-token TOKEN`: GitHub API token
- `--ai-provider {anthropic,openai}`: AI provider to use (default: anthropic)
- `--ai-key KEY`: API key for the selected AI provider
- `--config PATH`: Path to configuration file
- `--env-file PATH`: Path to .env file
- `--monitor-all-repos`: Monitor all accessible repositories
- `--poll-interval SECONDS`: Polling interval in seconds (default: 30)
- `--ngrok`: Use ngrok to expose the server
- `--ngrok-auth-token TOKEN`: Ngrok auth token
- `--webhook-port PORT`: Port for webhook server (default: 8001)
- `--webhook-host HOST`: Host for webhook server (default: 0.0.0.0)
- `--webhook-secret SECRET`: Secret for webhook verification
- `--setup-webhooks`: Set up webhooks for repositories

### Reviewing a Specific PR

```bash
python -m pr_review_bot.main review --repo owner/repo --pr PR_NUMBER
```

### Setting Up Webhooks

```bash
python -m pr_review_bot.main setup-webhooks
```

## Configuration

The PR Review Bot can be configured using a combination of:

1. Command-line arguments
2. Environment variables
3. Configuration file

### Environment Variables

- `GITHUB_TOKEN`: GitHub API token
- `GITHUB_WEBHOOK_SECRET`: Secret for webhook verification
- `ANTHROPIC_API_KEY`: Anthropic API key
- `OPENAI_API_KEY`: OpenAI API key
- `MONITOR_ALL_REPOS`: Whether to monitor all accessible repositories (true/false)
- `POLL_INTERVAL`: Polling interval in seconds
- `NGROK_AUTH_TOKEN`: Ngrok auth token
- `WEBHOOK_SECRET`: Secret for webhook verification

## Webhook Setup

For the PR Review Bot to receive real-time notifications from GitHub, you need to set up webhooks. This can be done automatically using the `--setup-webhooks` flag or the `setup-webhooks` command.

The PR Review Bot uses ngrok to expose your local server to the internet, which allows GitHub to send webhook events to your local machine.

1. Get an ngrok auth token from [ngrok.com](https://ngrok.com)
2. Set the `NGROK_AUTH_TOKEN` environment variable or use the `--ngrok-auth-token` flag
3. Enable ngrok with the `--ngrok` flag or set `NGROK_ENABLED=true` in your environment
4. Start the PR Review Bot with the `--setup-webhooks` flag

## Integration with Projector

The PR Review Bot integrates with the Projector UI to display PR status and provide a user-friendly interface for managing the bot.

When the PR Review Bot is started, it automatically connects to the Projector API and sends status updates.

## Troubleshooting

### Webhook Issues

If you're having issues with webhooks:

1. Make sure ngrok is properly configured with a valid auth token
2. Check that the webhook URL is accessible from the internet
3. Verify that the webhook secret is correctly set
4. Check GitHub repository settings to ensure webhooks are allowed

### Connection Issues

If the PR Review Bot shows as "Connected" in the UI but doesn't detect new PRs:

1. Make sure ngrok is enabled and properly configured
2. Check that webhooks are set up correctly
3. Verify that the GitHub token has the necessary permissions
4. Check the logs for any errors

## License

This project is licensed under the MIT License - see the LICENSE file for details.
