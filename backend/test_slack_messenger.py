#!/usr/bin/env python3
"""
Test script for SlackUserMessenger

This script demonstrates how to use the SlackUserMessenger class
to send messages as a user (not a bot) to Slack.

Usage:
    python test_slack_messenger.py
"""

import os
from dotenv import load_dotenv
from slack_user_messenger import SlackUserMessenger

def main():
    """Main function to test the SlackUserMessenger."""
    # Load environment variables from .env file
    load_dotenv()
    
    # Get environment variables
    token = os.getenv('SLACK_USER_TOKEN')
    channel_id = os.getenv('SLACK_CHANNEL_ID')
    user_id = os.getenv('SLACK_MEMBER_ID')
    
    if not token:
        print("Error: SLACK_USER_TOKEN environment variable is required")
        return
    
    if not (channel_id or user_id):
        print("Error: Either SLACK_CHANNEL_ID or SLACK_MEMBER_ID environment variable is required")
        return
    
    # Initialize the messenger
    messenger = SlackUserMessenger(token)
    
    # Send a message to a channel
    if channel_id:
        print(f"Sending message to channel {channel_id}...")
        response = messenger.send_message(channel_id, "Hello from the test script! 👋")
        if response:
            print("Message sent successfully!")
        else:
            print("Failed to send message to channel")
    
    # Send a direct message to a user
    if user_id:
        print(f"Sending direct message to user {user_id}...")
        response = messenger.send_dm(user_id, "Hello there! This is a test direct message. 👋")
        if response:
            print("Direct message sent successfully!")
        else:
            print("Failed to send direct message")

if __name__ == "__main__":
    main()
