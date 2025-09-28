# Slack OAuth Setup Guide

## Overview

This guide covers Slack OAuth 2.0 integration for the Scrum board application, enabling team authentication and Slack workspace integration for notifications, project updates, and team collaboration features.

## Prerequisites

- Slack workspace with admin permissions
- Ability to create Slack apps
- Understanding of Slack OAuth scopes and permissions
- Basic knowledge of Slack API concepts

## Step 1: Create Slack App

### 1.1 Access Slack App Management

1. Navigate to [Slack API Portal](https://api.slack.com/apps)
2. Sign in to your Slack workspace
3. Click "Create New App"

### 1.2 App Creation Options

```yaml
# Option 1: From scratch
App Name: "Scrum Board Integration"
Development Slack Workspace: your-workspace.slack.com

# Option 2: From app manifest (recommended)
Manifest Type: JSON
```

### 1.3 App Manifest Configuration

```json
{
  "display_information": {
    "name": "Scrum Board Integration",
    "description": "Agile project management and team collaboration platform",
    "background_color": "#2c3e50",
    "long_description": "Connect your Scrum board with Slack for seamless project management, sprint updates, and team notifications."
  },
  "features": {
    "bot_user": {
      "display_name": "ScrumBot",
      "always_online": true
    },
    "slash_commands": [
      {
        "command": "/sprint-status",
        "url": "https://your-domain.com/api/slack/commands/sprint-status",
        "description": "Get current sprint status and progress",
        "usage_hint": "[sprint-id]"
      },
      {
        "command": "/create-task",
        "url": "https://your-domain.com/api/slack/commands/create-task",
        "description": "Create a new task in the current sprint",
        "usage_hint": "[task-title] [description]"
      }
    ]
  },
  "oauth_config": {
    "redirect_urls": [
      "http://localhost:3000/api/auth/callback/slack",
      "https://staging.your-domain.com/api/auth/callback/slack",
      "https://your-domain.com/api/auth/callback/slack"
    ],
    "scopes": {
      "user": [
        "identity.basic",
        "identity.email",
        "identity.avatar"
      ],
      "bot": [
        "channels:read",
        "chat:write",
        "users:read",
        "users:read.email",
        "team:read"
      ]
    }
  },
  "settings": {
    "event_subscriptions": {
      "request_url": "https://your-domain.com/api/slack/events",
      "bot_events": [
        "message.channels",
        "team_join",
        "user_change"
      ]
    },
    "interactivity": {
      "is_enabled": true,
      "request_url": "https://your-domain.com/api/slack/interactivity"
    },
    "org_deploy_enabled": false,
    "socket_mode_enabled": false,
    "token_rotation_enabled": false
  }
}
```

## Step 2: OAuth Scopes Configuration

### 2.1 User Token Scopes

```yaml
# Identity and Profile
identity.basic:     # Basic identity information
identity.email:     # User email address
identity.avatar:    # User profile picture
identity.team:      # Workspace/team information

# Optional User Scopes
channels:read:      # List public channels user is in
groups:read:        # List private channels user is in
users:read:         # Read user information
team:read:          # Read team information
```

### 2.2 Bot Token Scopes

```yaml
# Essential Bot Scopes
channels:read:      # List and read public channels
chat:write:         # Send messages as bot
users:read:         # Read user information
users:read.email:   # Read user email addresses
team:read:          # Read workspace information

# Extended Bot Scopes (based on features)
channels:manage:    # Create and manage channels
groups:read:        # Read private channels
groups:write:       # Write to private channels
im:read:           # Read direct messages
im:write:          # Send direct messages
files:read:        # Read uploaded files
files:write:       # Upload files
reactions:read:    # Read message reactions
reactions:write:   # Add message reactions
pins:read:         # Read pinned messages
pins:write:        # Pin messages
```

### 2.3 Scope Selection Strategy

```typescript
// lib/auth/slack-scopes.ts
export const SlackScopes = {
  // Minimal scopes for basic authentication
  basic: {
    user: ['identity.basic', 'identity.email'],
    bot: ['chat:write', 'users:read']
  },

  // Enhanced scopes for team integration
  team: {
    user: ['identity.basic', 'identity.email', 'identity.team'],
    bot: ['channels:read', 'chat:write', 'users:read', 'users:read.email', 'team:read']
  },

  // Full scopes for complete workspace integration
  full: {
    user: ['identity.basic', 'identity.email', 'identity.team', 'channels:read'],
    bot: [
      'channels:read', 'channels:manage', 'chat:write',
      'users:read', 'users:read.email', 'team:read',
      'files:read', 'files:write', 'reactions:read', 'reactions:write'
    ]
  }
} as const;

export function getSlackScopes(integrationLevel: 'basic' | 'team' | 'full' = 'team') {
  return SlackScopes[integrationLevel];
}
```

## Step 3: Environment Configuration

### 3.1 Development Environment

```bash
# .env.local
SLACK_CLIENT_ID=your_slack_client_id_here
SLACK_CLIENT_SECRET=your_slack_client_secret_here
SLACK_SIGNING_SECRET=your_slack_signing_secret_here

# Bot configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_APP_TOKEN=xapp-your-app-token-here

# NextAuth configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key
```

### 3.2 Production Environment

```bash
# .env.production
SLACK_CLIENT_ID=prod-1234567890.1234567890123
SLACK_CLIENT_SECRET=prod-abcdef1234567890abcdef1234567890
SLACK_SIGNING_SECRET=prod-1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
SLACK_BOT_TOKEN=xoxb-prod-token
SLACK_APP_TOKEN=xapp-prod-token
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret-key
```

## Step 4: NextAuth.js Implementation

### 4.1 Slack Provider Configuration

```typescript
// pages/api/auth/[...nextauth].ts
import SlackProvider from 'next-auth/providers/slack';

export default NextAuth({
  providers: [
    SlackProvider({
      clientId: process.env.SLACK_CLIENT_ID!,
      clientSecret: process.env.SLACK_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identity.basic,identity.email,identity.team',
          user_scope: 'identity.basic,identity.email,identity.team'
        }
      },
      profile(profile) {
        return {
          id: profile.user.id,
          name: profile.user.name,
          email: profile.user.email,
          image: profile.user.image_192,
          // Slack-specific fields
          slack_team_id: profile.team.id,
          slack_team_name: profile.team.name,
          slack_user_id: profile.user.id,
          slack_username: profile.user.name,
          real_name: profile.user.real_name,
          display_name: profile.user.profile?.display_name,
          title: profile.user.profile?.title,
          phone: profile.user.profile?.phone,
          timezone: profile.user.tz,
          timezone_label: profile.user.tz_label
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'slack') {
        // Verify team membership if required
        const allowedTeams = process.env.ALLOWED_SLACK_TEAMS?.split(',');
        if (allowedTeams && allowedTeams.length > 0) {
          const userTeam = (profile as any)?.team?.id;
          if (!allowedTeams.includes(userTeam)) {
            return false;
          }
        }
        return true;
      }
      return true;
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === 'slack') {
        token.slack_user_id = (profile as any)?.user?.id;
        token.slack_team_id = (profile as any)?.team?.id;
        token.slack_access_token = account.access_token;
        token.bot_user_id = (profile as any)?.bot?.bot_user_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.slack_user_id) {
        session.user.slack_user_id = token.slack_user_id;
        session.user.slack_team_id = token.slack_team_id;
        session.user.bot_user_id = token.bot_user_id;
      }
      return session;
    }
  }
});
```

### 4.2 Custom Slack OAuth Service

```typescript
// lib/auth/slack-oauth.ts
export class SlackOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.SLACK_CLIENT_ID!;
    this.clientSecret = process.env.SLACK_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/slack`;
  }

  getAuthorizationUrl(
    state: string,
    scopes: string[] = ['identity.basic', 'identity.email', 'identity.team']
  ): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes.join(','),
      state,
      granular_bot_scope: '1' // Enable granular bot scopes
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Slack OAuth error: ${data.error}`);
    }

    return data;
  }

  async getUserInfo(accessToken: string) {
    const response = await fetch('https://slack.com/api/users.identity', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`User info fetch failed: ${data.error}`);
    }

    return data;
  }

  async getTeamInfo(accessToken: string) {
    const response = await fetch('https://slack.com/api/team.info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Team info fetch failed: ${data.error}`);
    }

    return data;
  }
}
```

## Step 5: Slack API Integration

### 5.1 Slack Web API Client

```typescript
// lib/integrations/slack-client.ts
import { WebClient } from '@slack/web-api';

export class SlackClientService {
  private client: WebClient;

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  async postMessage(channel: string, text: string, blocks?: any[]) {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text,
        blocks
      });
      return result;
    } catch (error) {
      console.error('Error posting message:', error);
      throw error;
    }
  }

  async getUserInfo(userId: string) {
    try {
      const result = await this.client.users.info({
        user: userId
      });
      return result.user;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw error;
    }
  }

  async getChannelsList() {
    try {
      const result = await this.client.conversations.list({
        types: 'public_channel,private_channel'
      });
      return result.channels;
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async createChannel(name: string, isPrivate: boolean = false) {
    try {
      const result = await this.client.conversations.create({
        name,
        is_private: isPrivate
      });
      return result.channel;
    } catch (error) {
      console.error('Error creating channel:', error);
      throw error;
    }
  }

  async inviteUsersToChannel(channelId: string, userIds: string[]) {
    try {
      const result = await this.client.conversations.invite({
        channel: channelId,
        users: userIds.join(',')
      });
      return result;
    } catch (error) {
      console.error('Error inviting users to channel:', error);
      throw error;
    }
  }

  async uploadFile(channels: string[], file: Buffer, filename: string, title?: string) {
    try {
      const result = await this.client.files.upload({
        channels: channels.join(','),
        file,
        filename,
        title
      });
      return result;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  async addReaction(channel: string, timestamp: string, name: string) {
    try {
      const result = await this.client.reactions.add({
        channel,
        timestamp,
        name
      });
      return result;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
}
```

### 5.2 Slack Notifications Service

```typescript
// lib/integrations/slack-notifications.ts
export class SlackNotificationService {
  private client: SlackClientService;

  constructor(botToken: string) {
    this.client = new SlackClientService(botToken);
  }

  async notifySprintStart(channelId: string, sprintData: any) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🚀 Sprint ${sprintData.name} Started!`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Duration:* ${sprintData.duration} days`
          },
          {
            type: 'mrkdwn',
            text: `*Goal:* ${sprintData.goal}`
          },
          {
            type: 'mrkdwn',
            text: `*Tasks:* ${sprintData.taskCount} tasks`
          },
          {
            type: 'mrkdwn',
            text: `*Team:* ${sprintData.teamMembers.length} members`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Sprint Board'
            },
            url: `${process.env.NEXTAUTH_URL}/sprint/${sprintData.id}`,
            action_id: 'view_sprint'
          }
        ]
      }
    ];

    return await this.client.postMessage(
      channelId,
      `Sprint ${sprintData.name} has started! 🎯`,
      blocks
    );
  }

  async notifyTaskCompletion(channelId: string, taskData: any, completedBy: any) {
    const text = `✅ Task completed: *${taskData.title}* by <@${completedBy.slack_user_id}>`;

    return await this.client.postMessage(channelId, text);
  }

  async notifySprintBurndown(channelId: string, burndownData: any) {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `📊 *Sprint Burndown Update*\n\n*Completed:* ${burndownData.completed}/${burndownData.total} tasks\n*Remaining Days:* ${burndownData.remainingDays}`
        }
      }
    ];

    return await this.client.postMessage(
      channelId,
      'Sprint burndown update',
      blocks
    );
  }

  async notifyDailyStandup(channelId: string, standupData: any) {
    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🌅 Daily Standup Reminder'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Time for today's standup! Please share:\n• What did you complete yesterday?\n• What are you working on today?\n• Any blockers or impediments?`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Submit Standup Update'
            },
            action_id: 'standup_update',
            value: standupData.sprintId
          }
        ]
      }
    ];

    return await this.client.postMessage(
      channelId,
      'Daily standup reminder',
      blocks
    );
  }
}
```

## Step 6: Slash Commands Implementation

### 6.1 Slash Command Handler

```typescript
// pages/api/slack/commands/[command].ts
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify request signature
  if (!verifySlackSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { command } = req.query;
  const body = req.body;

  switch (command) {
    case 'sprint-status':
      return await handleSprintStatus(req, res);
    case 'create-task':
      return await handleCreateTask(req, res);
    case 'standup-update':
      return await handleStandupUpdate(req, res);
    default:
      return res.status(404).json({ error: 'Command not found' });
  }
}

function verifySlackSignature(req: NextApiRequest): boolean {
  const signature = req.headers['x-slack-signature'] as string;
  const timestamp = req.headers['x-slack-request-timestamp'] as string;
  const body = JSON.stringify(req.body);

  // Check timestamp (should be within 5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return false;
  }

  // Verify signature
  const sigBasestring = `v0:${timestamp}:${body}`;
  const expectedSignature = `v0=${crypto
    .createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
    .update(sigBasestring)
    .digest('hex')}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

async function handleSprintStatus(req: NextApiRequest, res: NextApiResponse) {
  const { user_id, text } = req.body;

  // Fetch sprint status from database
  const sprintData = await getSprintStatus(text || 'current');

  const response = {
    response_type: 'ephemeral',
    text: `Sprint Status: ${sprintData.name}`,
    blocks: [
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Progress:* ${sprintData.completedTasks}/${sprintData.totalTasks} tasks`
          },
          {
            type: 'mrkdwn',
            text: `*Days Remaining:* ${sprintData.daysRemaining}`
          }
        ]
      }
    ]
  };

  res.json(response);
}
```

### 6.2 Interactive Components

```typescript
// pages/api/slack/interactivity.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const payload = JSON.parse(req.body.payload);

  switch (payload.type) {
    case 'block_actions':
      return await handleBlockActions(payload, res);
    case 'view_submission':
      return await handleViewSubmission(payload, res);
    case 'shortcut':
      return await handleShortcut(payload, res);
    default:
      return res.status(400).json({ error: 'Unknown interaction type' });
  }
}

async function handleBlockActions(payload: any, res: NextApiResponse) {
  const action = payload.actions[0];

  switch (action.action_id) {
    case 'standup_update':
      // Open modal for standup update
      const modal = {
        type: 'modal',
        title: {
          type: 'plain_text',
          text: 'Daily Standup Update'
        },
        blocks: [
          {
            type: 'input',
            label: {
              type: 'plain_text',
              text: 'What did you complete yesterday?'
            },
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'yesterday_work'
            }
          },
          {
            type: 'input',
            label: {
              type: 'plain_text',
              text: 'What are you working on today?'
            },
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'today_work'
            }
          },
          {
            type: 'input',
            label: {
              type: 'plain_text',
              text: 'Any blockers or impediments?'
            },
            element: {
              type: 'plain_text_input',
              multiline: true,
              action_id: 'blockers'
            },
            optional: true
          }
        ],
        submit: {
          type: 'plain_text',
          text: 'Submit'
        }
      };

      // Open modal using Slack Web API
      res.json({ response_action: 'push', view: modal });
      break;

    default:
      res.json({ response_action: 'clear' });
  }
}
```

## Step 7: Event Subscriptions

### 7.1 Event Handler

```typescript
// pages/api/slack/events.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, challenge } = req.body;

  // Handle URL verification
  if (type === 'url_verification') {
    return res.json({ challenge });
  }

  // Verify request signature
  if (!verifySlackSignature(req)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event } = req.body;

  switch (event.type) {
    case 'team_join':
      await handleTeamJoin(event);
      break;
    case 'user_change':
      await handleUserChange(event);
      break;
    case 'message':
      await handleMessage(event);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ ok: true });
}

async function handleTeamJoin(event: any) {
  // Auto-invite new team members to project channels
  const user = event.user;
  console.log(`New team member joined: ${user.name}`);

  // Add logic to invite to relevant channels
  // based on user role or department
}

async function handleUserChange(event: any) {
  // Sync user profile changes with Scrum board
  const user = event.user;
  await updateUserProfile(user.id, {
    name: user.real_name,
    email: user.profile.email,
    avatar: user.profile.image_192
  });
}
```

## Step 8: Testing

### 8.1 Development Testing

```typescript
// __tests__/auth/slack-oauth.test.ts
import { SlackOAuthService } from '../../lib/auth/slack-oauth';

describe('Slack OAuth Integration', () => {
  const service = new SlackOAuthService();

  test('should generate valid authorization URL', () => {
    const state = 'test-state-123';
    const authUrl = service.getAuthorizationUrl(state);

    expect(authUrl).toContain('slack.com/oauth/v2/authorize');
    expect(authUrl).toContain(`client_id=${process.env.SLACK_CLIENT_ID}`);
    expect(authUrl).toContain(`state=${state}`);
  });

  test('should handle token exchange', async () => {
    const mockCode = 'test-auth-code';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        access_token: 'xoxp-mock-token',
        team: { id: 'T1234567890', name: 'Test Team' },
        authed_user: { id: 'U1234567890' }
      })
    });

    const tokens = await service.exchangeCodeForTokens(mockCode);
    expect(tokens.access_token).toBe('xoxp-mock-token');
  });
});
```

### 8.2 Slash Command Testing

```bash
# Test slash command locally using ngrok
ngrok http 3000

# Update Slack app settings with ngrok URL
# https://abc123.ngrok.io/api/slack/commands/sprint-status
```

## Step 9: Production Deployment

### 9.1 Security Configuration

```typescript
// Enhanced security for production
const isProduction = process.env.NODE_ENV === 'production';

const slackSecurity = {
  verifyTimestamp: (timestamp: string) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const requestTime = parseInt(timestamp);
    return Math.abs(currentTime - requestTime) <= 300; // 5 minutes
  },

  rateLimitByTeam: new Map(),

  checkRateLimit: (teamId: string) => {
    const now = Date.now();
    const teamRequests = slackSecurity.rateLimitByTeam.get(teamId) || [];

    // Remove requests older than 1 minute
    const recentRequests = teamRequests.filter(time => now - time < 60000);

    if (recentRequests.length >= 60) { // 60 requests per minute
      return false;
    }

    recentRequests.push(now);
    slackSecurity.rateLimitByTeam.set(teamId, recentRequests);
    return true;
  }
};
```

### 9.2 Monitoring and Logging

```typescript
// lib/monitoring/slack-monitoring.ts
export class SlackMonitoring {
  static logSlackEvent(eventType: string, teamId: string, userId?: string) {
    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      teamId,
      userId,
      provider: 'slack'
    };

    console.log('[Slack Event]', logData);

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to your monitoring/analytics service
    }
  }

  static trackApiUsage(endpoint: string, teamId: string, responseTime: number) {
    if (responseTime > 3000) { // Slow response
      console.warn(`[Slack API] Slow response for ${endpoint}: ${responseTime}ms`);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Invalid Client ID
```
Error: invalid_client_id
Solution: Verify client ID matches the one in Slack app settings
```

#### 2. Redirect URI Mismatch
```
Error: invalid_redirect_uri
Solution: Ensure redirect URI exactly matches registered URLs
```

#### 3. Insufficient Scopes
```
Error: missing_scope
Solution: Request additional scopes in OAuth authorization
```

#### 4. Expired Bot Token
```
Error: token_revoked
Solution: Re-install app to workspace or refresh tokens
```

### Debug Configuration

```typescript
// Enable Slack debugging
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN, {
  logLevel: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
});
```

## Security Best Practices

### 1. Request Verification
```typescript
// Always verify Slack requests
function verifySlackRequest(req: NextApiRequest): boolean {
  return verifySlackSignature(req) && verifyTimestamp(req);
}
```

### 2. Team Restrictions
```typescript
// Restrict to specific Slack workspaces
const allowedTeams = process.env.ALLOWED_SLACK_TEAMS?.split(',') || [];

if (allowedTeams.length > 0 && !allowedTeams.includes(teamId)) {
  return res.status(403).json({ error: 'Team not authorized' });
}
```

### 3. Scope Minimization
```typescript
// Request only necessary scopes
const requiredScopes = ['identity.basic', 'identity.email'];
// Avoid broad scopes like 'admin' unless absolutely necessary
```

## Resources

- [Slack API Documentation](https://api.slack.com/)
- [Slack OAuth Guide](https://api.slack.com/authentication/oauth-v2)
- [Slack Bolt Framework](https://slack.dev/bolt-js/concepts)
- [Slack App Manifest](https://api.slack.com/reference/manifests)

## Support

For Slack OAuth issues:

1. Check Slack app event logs in app management portal
2. Verify OAuth scopes and permissions
3. Test with Slack's API testing tools
4. Review Slack workspace admin settings
5. Contact Slack developer support for API-specific issues