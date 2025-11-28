# 📱 Messaging Feature - Visual Reference Guide

## User Interface Layout

### Desktop View
```
┌─────────────────────────────────────────────────────────────────┐
│ Dashboard Header (with Messaging in sidebar)                    │
├─────────────────────────────┬─────────────────────────────────┤
│                             │                                 │
│  Channels Sidebar           │  Chat Area                      │
│  ┌─────────────────────┐   │  ┌─────────────────────────────┐│
│  │ Channels      [+]   │   │  │ #general                    ││
│  ├─────────────────────┤   │  │ General discussion           ││
│  │ 🟢 # general        │   │  ├─────────────────────────────┤│
│  │ ○  # announcements  │   │  │                             ││
│  │ ○  # random         │   │  │ ┌─────────────┐             ││
│  │ ○  # tech-talk      │   │  │ │ User Avatar │ Alice Smith ││
│  │                     │   │  │ │             │ 5 min ago   ││
│  │                     │   │  │ └─────────────┘             ││
│  │                     │   │  │ Hey everyone!               ││
│  │                     │   │  │ Check out this document     ││
│  │                     │   │  │ [Document Preview]          ││
│  │                     │   │  │ 👍 2                        ││
│  │                     │   │  │                             ││
│  └─────────────────────┘   │  │ ┌─────────────┐             ││
│                             │  │ │ User Avatar │ Bob Johnson ││
│                             │  │ │             │ 2 min ago   ││
│                             │  │ └─────────────┘             ││
│                             │  │ Looks good!                 ││
│                             │  │                             ││
│                             │  ├─────────────────────────────┤│
│                             │  │ [📎] [Message Input...] [➤] ││
│                             │  │ Type @ to mention someone   ││
│                             │  └─────────────────────────────┘│
│                             │                                 │
└─────────────────────────────┴─────────────────────────────────┘
```

### Mobile View
```
┌──────────────────────────────┐
│ Dashboard Header             │
├──────────────────────────────┤
│                              │
│  Channels View (Modal)       │
│  ┌────────────────────────┐  │
│  │ Channels        [+]    │  │
│  ├────────────────────────┤  │
│  │ # general        ► Chat│  │
│  │ # announcements  ► Chat│  │
│  │ # random         ► Chat│  │
│  │ # tech-talk      ► Chat│  │
│  │                        │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘

         OR

┌──────────────────────────────┐
│ ◄ #general                   │
├──────────────────────────────┤
│                              │
│  Chat Area (Full Width)      │
│  ┌────────────────────────┐  │
│  │ Alice Smith      5 min │  │
│  │ Hey everyone!          │  │
│  │ Check this out!        │  │
│  │ [Image Preview]        │  │
│  │ 👍 2                   │  │
│  │                        │  │
│  │ Bob Johnson      2 min │  │
│  │ Looks great!           │  │
│  │                        │  │
│  ├────────────────────────┤  │
│  │ [📎] [Message...] [➤]  │  │
│  │ Type @ to mention      │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

## Component Hierarchy

```
MessagingPage
├── DashboardLayout (wrapper)
│   └── messaging/page.tsx
│       ├── ChannelList
│       │   ├── Channel list
│       │   ├── Create Channel dialog
│       │   │   ├── Input: channel name
│       │   │   └── Textarea: description
│       │   └── Select channel handler
│       │
│       └── Main Chat Area
│           ├── Channel Header
│           │   ├── Back button (mobile only)
│           │   ├── Channel name & icon
│           │   └── Channel description
│           │
│           ├── MessageList
│           │   ├── Message (x N)
│           │   │   ├── Avatar
│           │   │   ├── Author name & time
│           │   │   ├── Message content
│           │   │   ├── Attachments (if any)
│           │   │   │   ├── Images (inline)
│           │   │   │   ├── Videos (with player)
│           │   │   │   └── Files (download)
│           │   │   ├── Reactions (if any)
│           │   │   │   ├── 👍 2
│           │   │   │   ├── ❤️ 1
│           │   │   │   └── 😂 3
│           │   │   └── Hover actions
│           │   │       ├── [😊] Reaction button
│           │   │       └── [↩️] Reply button
│           │   │
│           │   └── Auto-scroll on new messages
│           │
│           └── MessageInput
│               ├── File input (hidden)
│               ├── Paperclip button [📎]
│               ├── Textarea with @mention support
│               │   ├── @mention autocomplete dropdown
│               │   │   ├── User 1 (full_name)
│               │   │   ├── User 2 (email)
│               │   │   └── User N (filtered)
│               │   └── Arrow key navigation
│               ├── Send button [➤]
│               ├── File preview chips (if files selected)
│               └── Help text: "Type @ to mention..."
```

## State Management Flow

```
User Action
    ↓
Component Handler
    ↓
React Query Mutation
    ↓
API Route (/api/messaging/...)
    ↓
Supabase Database
    ↓
PostgreSQL Trigger (if INSERT)
    ↓
Supabase Real-time Subscription
    ↓
Query Invalidation
    ↓
Automatic Refetch
    ↓
Component Re-render
    ↓
User sees update instantly
```

## Message Flow Example

```
User A types and sends: "Hey @Alice, check this out! 📁"

1. onSend() called
   - content: "Hey @Alice, check this out! 📁"
   - mentionedUserIds: ["alice-uuid"]
   - attachments: [File]

2. useSendMessage mutation
   POST /api/messaging/[teamId]/[channelId]/messages
   {
     content: "Hey @Alice, check this out! 📁",
     mentionedUserIds: ["alice-uuid"]
   }

3. API route processes:
   - Validates input
   - Creates message record
   - Creates mention record for Alice
   - Uploads file to storage
   - Creates attachment record
   - Returns complete message object

4. Response:
   {
     message: {
       id: "msg-123",
       channel_id: "chan-456",
       user_id: "user-a-id",
       content: "Hey @Alice, check this out! 📁",
       created_at: "2025-11-11T10:30:00Z",
       author: { ... },
       attachments: [ { file_url, file_name, ... } ],
       mentions: [ { mentioned_user_id: "alice-uuid", ... } ],
       reactions: []
     }
   }

5. React Query invalidates ["messages", channelId]

6. Query auto-refetches

7. MessageList re-renders with new message

8. Supabase subscription triggers on INSERT
   - User B gets real-time notification
   - User B's query refetches
   - User B sees message instantly

9. Timeline:
   - T+0ms: User A clicks send
   - T+50ms: Message sent to API
   - T+100ms: Message stored in DB
   - T+120ms: User A sees message
   - T+150ms: User B receives via WebSocket
   - T+200ms: User B sees message
```

## Mention System Flow

```
User types in MessageInput
    ↓
Text: "Hey @al"
    ↓
useEffect triggers (on content change)
    ↓
Detect @ and capture query "al"
    ↓
extractMentions("Hey @al") → ["al"]
    ↓
getMatchingUsers("al", teamMembers)
    ↓
Filter team members:
  - Alice Smith (full_name includes "al") ✓
  - Albert Johnson (full_name includes "al") ✓
  - Bob (doesn't match) ✗
    ↓
Show dropdown:
  ┌──────────────────────┐
  │ ▸ Alice Smith        │ (highlighted)
  │   alice@team.com     │
  │                      │
  │   Albert Johnson     │
  │   albert@team.com    │
  └──────────────────────┘
    ↓
User presses ↓ arrow
    ↓
Highlight Albert Johnson
    ↓
User presses Enter
    ↓
handleSelectMention(Albert)
    ↓
Update text to: "Hey @Albert Johnson "
    ↓
Move cursor after mention
    ↓
Close dropdown
    ↓
Extract mention ID: "albert-uuid"
    ↓
When sending message:
POST /api/messaging/[teamId]/[channelId]/messages
{
  content: "Hey @Albert Johnson ",
  mentionedUserIds: ["albert-uuid"]
}
```

## File Upload Flow

```
User clicks [📎] button
    ↓
File input opens
    ↓
User selects file(s)
    ↓
handleAttachmentSelect()
    ↓
File added to state
    ↓
Preview shown above input:
┌──────────────────────────────┐
│ Document.pdf [✕]             │
│ Resume.pdf [✕]               │
└──────────────────────────────┘
    ↓
User types message + clicks send
    ↓
useSendMessage executes
    ↓
POST /api/messaging/.../messages (without files)
    ↓
Message created
    ↓
For each file:
    POST /api/messaging/.../[messageId]/attachments
    FormData: { file: File }
        ↓
    Upload to Supabase Storage
        ↓
    Get public URL
        ↓
    Create attachment record
        ↓
    Return attachment
    ↓
Invalidate messages query
    ↓
Refetch messages
    ↓
Show attachments in message:

┌─────────────────────────────┐
│ Check this document!        │
│ [Document.pdf preview]      │
│   📄 Document.pdf (245 KB)  │
│   [Download ↓]              │
└─────────────────────────────┘
```

## Real-Time Update Flow

```
User A sends message
    ↓
Message INSERT in database
    ↓
PostgreSQL trigger fires
    ↓
message_channels.updated_at updated
    ↓
Supabase notify event
    ↓
WebSocket transmission
    ↓
User B's subscription receives
    ↓
Real-time hook fires
    ↓
onNewMessage callback
    ↓
invalidateQueries(['messages', channelId])
    ↓
Query client marks stale
    ↓
Automatic background refetch
    ↓
New message data fetched
    ↓
React component re-renders
    ↓
User B sees new message (total: ~100ms)

Timeline:
T+0ms: User A sends
T+10ms: DB INSERT
T+30ms: Trigger fires
T+40ms: WebSocket sent
T+80ms: User B receives
T+90ms: Query refetch
T+100ms: User B sees message
```

## Database Relationships

```
teams
  │
  ├─────→ message_channels (team_id)
  │         │
  │         ├─→ message_channel_members (channel_id)
  │         │     └─→ auth.users (user_id)
  │         │
  │         └─→ messages (channel_id)
  │             │
  │             ├─→ auth.users (user_id) [author]
  │             │
  │             ├─→ message_attachments (message_id)
  │             │
  │             ├─→ message_mentions (message_id)
  │             │     └─→ auth.users (mentioned_user_id)
  │             │
  │             └─→ message_reactions (message_id)
  │                 └─→ auth.users (user_id)
  │
  └─→ team_members (user_id)
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `@` | Trigger mention autocomplete |
| `↑` / `↓` | Navigate mention suggestions |
| `Enter` | Select mention / Send message |
| `Esc` | Close mention dropdown |
| `Ctrl+Enter` | Send message |
| `Backspace` | Remove selected file |
| `Click 📎` | Open file selector |
| `Hover message` | Show reaction/reply buttons |

## Color & Theme

### Light Theme
- Background: #ffffff
- Text: #000000
- Borders: #e5e7eb
- Hover: #f3f4f6
- Primary: #[accent-color]
- Muted: #6b7280

### Dark Theme
- Background: #1f2937
- Text: #f3f4f6
- Borders: #374151
- Hover: #111827
- Primary: #[accent-color]
- Muted: #9ca3af

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Full-width, modal sidebar |
| Tablet | 768-1023px | Full-width, modal sidebar |
| Desktop | ≥ 1024px | Sidebar + chat (fixed width) |

---

**This visual reference helps understand the messaging system's structure, data flow, and user interactions.**
