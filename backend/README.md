# Slack User Messenger

A Python script that allows sending messages as a user (not a bot) using a Slack user token.

## Important Note

This script uses Slack's legacy token approach with the `as_user=true` parameter, which:
- Only works with classic Slack apps (which will be discontinued in March 2026)
- Requires user tokens (not bot tokens)
- Will stop working entirely on March 31, 2025

## Setup

1. Copy `.env.template` to `.env` and fill in your values:
   ```
   cp .env.template .env
   ```

2. Install the required dependencies:
   ```
   pip install python-dotenv slack_sdk
   ```

## Usage

### Send a test message

```bash
python slack_user_messenger.py --test
```

### Send a specific message to a channel

```bash
python slack_user_messenger.py --message "Hello from the script!" --channel C01234ABCDE
```

### Send a direct message to a user

```bash
python slack_user_messenger.py --message "Hello there!" --user U01234ABCDE
```

### Use custom token

```bash
python slack_user_messenger.py --token xoxp-your-token-here --message "Custom token message" --channel C01234ABCDE
```

## Environment Variables

- `SLACK_USER_TOKEN`: Your Slack user token (starts with `xoxp-`)
- `SLACK_CHANNEL_ID`: Default channel ID to send messages to
- `SLACK_MEMBER_ID`: Default user ID to send direct messages to

## Integration with Other Scripts

You can import and use the `SlackUserMessenger` class in your own Python scripts:

```python
from slack_user_messenger import SlackUserMessenger

# Initialize the messenger
messenger = SlackUserMessenger(token="xoxp-your-token-here")

# Send a message to a channel
messenger.send_message("C01234ABCDE", "Hello from my script!")

# Send a direct message to a user
messenger.send_dm("U01234ABCDE", "Hello there!")
```

## Future Alternatives

When this approach stops working (March 31, 2025), consider these alternatives:

1. Use a bot with a clear identity and custom profile picture/name
2. Create dedicated channels for automated messages
3. Use Slack's Block Kit for rich, interactive messages
4. Use Slack's Incoming Webhooks for simple notifications
