# Discord-like Messaging Implementation Guide

## Overview
A fully-featured Discord-like messaging system has been implemented for TeamForge, allowing team members to communicate in real-time across channels with support for mentions, file attachments, and reactions.

## Features Implemented

### 1. **Channel Management**
- Create new channels per team
- Channel descriptions
- Channel member management
- Direct message support (foundation in place)

### 2. **Messaging**
- Real-time message sending and receiving
- Message editing support (database schema ready)
- Message deletion support (soft delete with `deleted_at`)
- Message timestamps and formatting
- Consecutive message grouping (same author within 5 minutes)

### 3. **@Mentions System**
- Autocomplete for team member mentions using `@` symbol
- Mention notifications stored in database
- Extract mentioned user IDs and notify them
- Type-to-search functionality with arrow key navigation

### 4. **File Attachments**
- Support for images, videos, documents, and more
- File size validation (25MB limit)
- File type validation
- Direct preview for images/videos
- Download button for other file types
- Supabase Storage integration

### 5. **Reactions**
- Emoji reactions on messages
- Toggle reactions on/off
- Reaction aggregation display
- Real-time reaction updates

### 6. **Real-Time Updates**
- Supabase PostgreSQL subscriptions via WebSockets
- Real-time new message delivery
- Real-time channel updates
- Real-time reaction updates
- Automatic query invalidation with React Query

### 7. **Discord-like UI**
- Sidebar with channel list
- Main chat area with message history
- Message input with @ autocomplete
- File attachment preview
- Mobile-responsive design
- Hover actions on messages

### 8. **Authentication & Authorization**
- User-based message creation
- Channel membership validation
- Access control for message operations

## File Structure

### Database Migrations
```
database/migrations/0005_messaging.sql
```
Creates tables:
- `message_channels` - Team channels
- `messages` - Message content
- `message_attachments` - File attachments
- `message_mentions` - @mention records
- `message_channel_members` - Channel membership & read status
- `message_reactions` - Emoji reactions

### API Routes
```
src/app/api/messaging/
├── [teamId]/
│   ├── channels/
│   │   └── route.ts                    # GET/POST channels
│   └── [channelId]/
│       ├── messages/
│       │   └── route.ts                # GET/POST messages
│       └── [messageId]/
│           ├── reactions/
│           │   └── route.ts            # POST reactions
│           └── attachments/
│               └── route.ts            # POST file uploads
```

### React Components
```
src/components/messaging/
├── ChannelList.tsx          # Channel sidebar with create dialog
├── Message.tsx              # Individual message with attachments/reactions
├── MessageInput.tsx         # Message input with @mention autocomplete
├── MessageList.tsx          # Message list with auto-scroll
```

### Hooks
```
src/hooks/
├── useMessaging.ts          # Query hooks for channels, messages, reactions
└── useMessagingRealtime.ts  # Real-time subscription hooks
```

### Types & Utilities
```
src/types/messaging.ts               # TypeScript interfaces
src/lib/messagingHelpers.ts          # Mention parsing, formatting utilities
```

### Pages
```
src/app/messaging/page.tsx           # Main messaging page
```

## Database Schema

### message_channels
```sql
- id (UUID, PRIMARY KEY)
- team_id (UUID, FK to teams)
- name (TEXT)
- description (TEXT)
- is_direct_message (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### messages
```sql
- id (UUID, PRIMARY KEY)
- channel_id (UUID, FK to message_channels)
- user_id (UUID, FK to auth.users)
- content (TEXT)
- edited_at (TIMESTAMP)
- deleted_at (TIMESTAMP, soft delete)
- created_at (TIMESTAMP)
```

### message_attachments
```sql
- id (UUID, PRIMARY KEY)
- message_id (UUID, FK to messages)
- file_url (TEXT)
- file_name (TEXT)
- file_type (TEXT)
- file_size (INTEGER)
- created_at (TIMESTAMP)
```

### message_mentions
```sql
- id (UUID, PRIMARY KEY)
- message_id (UUID, FK to messages)
- mentioned_user_id (UUID, FK to auth.users)
- is_read (BOOLEAN)
- created_at (TIMESTAMP)
```

### message_channel_members
```sql
- id (UUID, PRIMARY KEY)
- channel_id (UUID, FK to message_channels)
- user_id (UUID, FK to auth.users)
- last_read_message_id (UUID, FK to messages)
- last_read_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

### message_reactions
```sql
- id (UUID, PRIMARY KEY)
- message_id (UUID, FK to messages)
- user_id (UUID, FK to auth.users)
- emoji (TEXT)
- created_at (TIMESTAMP)
```

## API Endpoints

### Channels
**GET `/api/messaging/[teamId]/channels`**
- Fetch all channels user is member of
- Returns array of channels

**POST `/api/messaging/[teamId]/channels`**
- Create new channel
- Body: `{ name: string, description?: string }`

### Messages
**GET `/api/messaging/[teamId]/[channelId]/messages`**
- Fetch messages with pagination
- Query params: `limit=50&offset=0`
- Returns messages with relationships (author, attachments, mentions, reactions)

**POST `/api/messaging/[teamId]/[channelId]/messages`**
- Send new message
- Body: `{ content: string, mentionedUserIds?: string[] }`

### Reactions
**POST `/api/messaging/[teamId]/[channelId]/[messageId]/reactions`**
- Add/remove emoji reaction
- Body: `{ emoji: string }`
- Toggles reaction (adds if not exists, removes if exists)

### Attachments
**POST `/api/messaging/[teamId]/[channelId]/[messageId]/attachments`**
- Upload file attachment
- Content-Type: multipart/form-data
- Form field: `file`
- Max size: 25MB

## Key Features Explained

### @Mention System
1. User types `@` in message input
2. Autocomplete dropdown shows filtered team members
3. Select member or continue typing to filter
4. Arrow keys navigate, Enter to select
5. Mention is stored as `@username` in message content
6. Mention records created in `message_mentions` table
7. Mentioned users can see unread mention count

### File Attachments
1. Click paperclip icon or select files from input
2. Multiple files supported
3. Preview shown before sending
4. Files uploaded to Supabase Storage after message creation
5. Public URL stored in `message_attachments` table
6. Images show inline preview
7. Videos show with player controls
8. Other files show download button

### Real-Time Updates
1. After message sent, Supabase trigger updates `message_channels.updated_at`
2. WebSocket subscriptions listen for INSERT/UPDATE/DELETE on messages
3. React Query automatically refetches messages on change
4. Channel list updates in real-time when new channels created
5. Reactions update in real-time across all users

### Mobile Responsiveness
1. Channels sidebar hidden on mobile (< 1024px)
2. Back button to return to channel list on mobile
3. Message input optimized for touch
4. Full-width chat area on mobile
5. Responsive typography and spacing

## Styling

All components use the existing TeamForge UI system:
- Radix UI components (buttons, dialogs, inputs, etc.)
- Tailwind CSS for styling
- Consistent color scheme with accent colors
- Dark/light theme support via existing ThemeProvider

## Integration Points

### AppDataProvider
- `team` - Current team data
- `teamMembers` - List of team members for @mentions

### AuthProvider
- `user` - Current authenticated user
- Used for authorization on API routes

### DashboardLayout
- Messaging added to core modules navigation
- Uses MessageSquare icon from lucide-react

### Supabase
- PostgreSQL backend for data storage
- Storage for file attachments
- Real-time subscriptions via PostgREST

### React Query
- Query caching for channels and messages
- Mutations for sending messages, creating channels, adding reactions
- Automatic refetch on mutations
- Stale data handling

## Setup Instructions

### 1. Run Database Migration
```bash
# Run the migration on your Supabase database
psql -h [host] -U [user] -d [database] < database/migrations/0005_messaging.sql
```

### 2. Configure Supabase Storage Bucket
```sql
-- Create storage bucket for message attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-attachments', 'message-attachments', true);

-- Enable public access
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'message-attachments'
  AND auth.role() = 'authenticated'
);
```

### 3. Set Row Level Security (RLS)

Channels:
```sql
ALTER TABLE message_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view team channels"
ON message_channels FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM team_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

Messages:
```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in accessible channels"
ON messages FOR SELECT
USING (
  channel_id IN (
    SELECT id FROM message_channels
    WHERE team_id IN (
      SELECT team_id FROM team_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  )
);

CREATE POLICY "Users can create messages"
ON messages FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

### 4. Access the Feature
- Navigate to sidebar → Messaging
- Create first channel (auto-creates "general")
- Start sending messages!

## Usage Examples

### Send a Message
```typescript
const sendMessage = async () => {
  await sendMessageMutation.mutate({
    content: "Hey @Alice, check this out!",
    mentionedUserIds: ["alice-id"]
  })
}
```

### Create a Channel
```typescript
await createChannelMutation.mutate({
  name: "announcements",
  description: "Team-wide announcements"
})
```

### Add Reaction
```typescript
await addReactionMutation.mutate({
  messageId: "msg-123",
  emoji: "👍"
})
```

## Performance Optimizations

1. **Message Pagination** - Load 50 messages at a time
2. **Query Caching** - React Query caches channels and messages
3. **Real-time Subscriptions** - Only subscribe to current channel
4. **Lazy Loading** - Images load on demand
5. **File Size Limits** - 25MB max to prevent large uploads

## Future Enhancements

1. **Threading** - Reply to specific messages in threads
2. **Pinned Messages** - Important messages at top of channel
3. **Search** - Full-text search across messages
4. **Mentions Notifications** - Badge count of unread mentions
5. **Direct Messages** - 1-on-1 conversations
6. **Message History** - Preserve deleted messages (soft delete ready)
7. **Read Receipts** - Show who has read messages
8. **Typing Indicators** - Show when users are typing
9. **Voice Messages** - Audio message support
10. **Channel Roles** - Different permissions per role

## Troubleshooting

### Messages not loading
- Check browser console for network errors
- Verify Supabase connection
- Ensure user is team member

### Real-time updates not working
- Check WebSocket connection in browser DevTools
- Verify Supabase subscription is active
- Check RLS policies allow data access

### File uploads failing
- Check file size (< 25MB)
- Verify file type is allowed
- Check Supabase Storage permissions
- Ensure storage bucket exists

### Mentions not working
- Type `@` to trigger autocomplete
- Check team members list is populated
- Verify member emails/names match

## Notes

- All timestamps are in UTC with timezone
- Soft deletes used for messages (deleted_at field)
- Real-time updates use PostgreSQL notify/listen
- File URLs are public (no auth required to view)
- Message content stored as plain text (no markdown parsing)
- Mentions are simple text patterns (no sophisticated parsing)

## Support

For issues or questions about the messaging implementation, refer to:
- Component source files for implementation details
- API route files for endpoint documentation
- Database schema in migration file for data structure
- Hook files for query/mutation patterns
