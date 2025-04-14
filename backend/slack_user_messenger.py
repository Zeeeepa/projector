#!/usr/bin/env python3
"""
Slack User Messenger - Send messages as a user (not a bot)

This script uses a legacy user token to send messages that appear to come from your user account.
Note: This approach uses legacy tokens which will be discontinued by Slack on March 31, 2025.

Usage:
    python slack_user_messenger.py [options]

Environment Variables:
    SLACK_USER_TOKEN - Your user token (xoxp-...)
    SLACK_CHANNEL_ID - Channel ID to send messages to
    SLACK_MEMBER_ID - Member ID to send direct messages to
"""

import os
import sys
import argparse
import logging
from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SlackUserMessenger:
    """Send messages as a user (not a bot) using a user token."""

    def __init__(self, token=None):
        """Initialize with user token."""
        self.token = token or os.getenv('SLACK_USER_TOKEN')
        if not self.token:
            raise ValueError("SLACK_USER_TOKEN environment variable is required")
        
        self.client = WebClient(token=self.token)
        logger.info("SlackUserMessenger initialized")

    def send_message(self, channel_id, text):
        """Send a message to a channel as the user."""
        try:
            response = self.client.chat_postMessage(
                channel=channel_id,
                text=text,
                as_user=True  # This is the key parameter to send as user
            )
            logger.info(f"Message sent to channel {channel_id}")
            return response
        except SlackApiError as e:
            logger.error(f"Error sending message: {e.response['error']}")
            return None

    def send_dm(self, user_id, text):
        """Send a direct message to a user as the user."""
        try:
            # Open a DM channel with the user
            response = self.client.conversations_open(users=user_id)
            dm_channel_id = response["channel"]["id"]
            
            # Send the message
            message_response = self.client.chat_postMessage(
                channel=dm_channel_id,
                text=text,
                as_user=True
            )
            logger.info(f"DM sent to user {user_id}")
            return message_response
        except SlackApiError as e:
            logger.error(f"Error sending DM: {e.response['error']}")
            return None

    def get_user_info(self, user_id):
        """Get information about a user."""
        try:
            response = self.client.users_info(user=user_id)
            return response["user"]
        except SlackApiError as e:
            logger.error(f"Error getting user info: {e.response['error']}")
            return None

    def get_channel_info(self, channel_id):
        """Get information about a channel."""
        try:
            response = self.client.conversations_info(channel=channel_id)
            return response["channel"]
        except SlackApiError as e:
            logger.error(f"Error getting channel info: {e.response['error']}")
            return None

def main():
    """Main function to run the script."""
    # Load environment variables from .env file
    load_dotenv()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Send messages as a user in Slack')
    parser.add_argument('--token', help='Slack user token (xoxp-...)')
    parser.add_argument('--channel', help='Channel ID to send message to')
    parser.add_argument('--user', help='User ID to send direct message to')
    parser.add_argument('--message', help='Message to send')
    parser.add_argument('--test', action='store_true', help='Send a test message "Hi"')
    
    args = parser.parse_args()
    
    # Get values from arguments or environment variables
    token = args.token or os.getenv('SLACK_USER_TOKEN')
    channel_id = args.channel or os.getenv('SLACK_CHANNEL_ID')
    user_id = args.user or os.getenv('SLACK_MEMBER_ID')
    message = args.message or "Hi" if args.test else None
    
    if not token:
        logger.error("No Slack user token provided. Set SLACK_USER_TOKEN environment variable or use --token")
        sys.exit(1)
    
    if not message:
        logger.error("No message provided. Use --message or --test")
        sys.exit(1)
    
    if not (channel_id or user_id):
        logger.error("No channel or user specified. Set SLACK_CHANNEL_ID/SLACK_MEMBER_ID or use --channel/--user")
        sys.exit(1)
    
    # Initialize the messenger
    messenger = SlackUserMessenger(token)
    
    # Send the message
    if channel_id:
        response = messenger.send_message(channel_id, message)
        if response:
            logger.info(f"Message sent to channel {channel_id}")
    
    if user_id:
        response = messenger.send_dm(user_id, message)
        if response:
            logger.info(f"Direct message sent to user {user_id}")

if __name__ == "__main__":
    main()
