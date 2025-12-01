# Messaging System Architecture & Design Decisions

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TeamForge Dashboard                      │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│              DashboardLayout with Sidebar                    │
│         (Added Messaging navigation item)                    │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  Messaging Page (/messaging)                 │
│  ┌──────────────────┐ ┌─────────────────────────────────┐  │
│  │  ChannelList     │ │  Messages + MessageInput         │  │
│  ├──────────────────┤ ├─────────────────────────────────┤  │
│  │ - Channels       │ │ - Real-time message stream      │  │
│  │ - Create Channel │ │ - Message list with reactions   │  │
│  │ - Select Channel │ │ - Input with @mention support   │  │
│  │                  │ │ - File attachment upload        │  │
│  └──────────────────┘ └─────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│           React Query (useMessaging hooks)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ - useMessagingChannels()      [GET /channels]        │  │
│  │ - useCreateChannel()          [POST /channels]       │  │
│  │ - useMessages()               [GET /messages]        │  │
│  │ - useSendMessage()            [POST /messages]       │  │
│  │ - useAddReaction()            [POST /reactions]      │  │
│  │ - useUploadAttachment()       [POST /attachments]    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────┘
             │
        ┌────┴────┐
        ▼         ▼
    ┌────────────────────────────────┐
    │  Real-time Subscriptions       │
    │  (Supabase WebSockets)         │
    │                                │
    │ - useMessagesRealtime()        │
    │ - useChannelsRealtime()        │
    │ - useReactionsRealtime()       │
    └────────────┬───────────────────┘
                 │
    ┌────────────┴──────────────────┐
    │                               │
    ▼                               ▼
┌─────────────────────────┐  ┌──────────────────────────┐
│   REST API Endpoints    │  │  Supabase (PostgreSQL)   │
│                         │  │  + Real-time Subs        │
│ /api/messaging/[teamId] │  │                          │
│   /channels             │  │ Tables:                  │
│   /[channelId]          │  │ - message_channels       │
│     /messages           │  │ - messages               │
│     /[messageId]        │  │ - message_attachments    │
│       /reactions        │  │ - message_mentions       │
│       /attachments      │  │ - message_channel_members│
│                         │  │ - message_reactions      │
└─────────────────────────┘  │                          │
                             │ + Storage Bucket         │
                             │ - message-attachments    │
                             └──────────────────────────┘
```

## Design Decisions

### 1. Channel-Based Architecture
**Decision:** Organize messages into channels rather than global chat

**Rationale:**
- Teams often have multiple topics of discussion
- Channels provide context isolation
- Easier to follow conversations
- Matches Discord UX that users are familiar with
- Scalable for large teams

**Alternative Considered:** Single conversation thread
- Would become too chaotic with 50+ members

---

### 2. Real-Time Updates via Supabase Subscriptions
**Decision:** Use PostgreSQL notify/listen for real-time messages

**Rationale:**
- No separate WebSocket server needed
- Leverages existing Supabase infrastructure
- Automatic reconnection handling
- Built-in authentication
- Scales well with React Query caching

**Alternative Considered:** Polling
- Would create unnecessary server load
- Delayed message delivery (5-10s lag)
- Higher bandwidth usage

**Alternative Considered:** Socket.io
- Requires separate Node.js server
- More complex deployment
- Redundant with Supabase capabilities

---

### 3. Mention System as Text Pattern Matching
**Decision:** Store mentions as `@username` text, extract and validate on backend

**Rationale:**
- Simple implementation
- No separate mention table required initially
- Mentions visible in message content
- Familiar Discord-style syntax
- Easy to extend with markdown later

**Alternative Considered:** Tagged mention syntax
- Would require custom parsing
- More complex UI
- Less intuitive for users

---

### 4. Soft Deletes for Messages
**Decision:** Use `deleted_at` timestamp instead of permanent deletion

**Rationale:**
- Users can recall what they wrote
- Maintains message history
- Meets legal compliance requirements
- Can show [deleted] messages in threads
- Can be purged after retention period

**Alternative Considered:** Hard delete
- Impossible to recover
- Bad for compliance
- Breaks threading

---

### 5. Supabase Storage for Files
**Decision:** Use Supabase Storage bucket instead of database BLOBs

**Rationale:**
- Efficient file handling
- CDN delivery
- Large file support (25MB+)
- Separate from message data
- Can delete files independently
- Public URL without auth required

**Alternative Considered:** Store in database
- Database bloat
- Slower queries
- Less efficient for large files

**Alternative Considered:** AWS S3
- Adds infrastructure complexity
- Extra AWS account management
- Higher cost
- Supabase already integrated

---

### 6. Pagination for Message Loading
**Decision:** Load 50 messages at a time with offset/limit

**Rationale:**
- Reduces initial payload
- Better UI responsiveness
- Handles large conversations (10k+ messages)
- Standard pagination pattern
- Easy to implement infinite scroll

**Alternative Considered:** Load all messages
- Would fail for channels with 10k+ messages
- Excessive bandwidth
- Bad UX

---

### 7. Reactions as Separate Table
**Decision:** Store reactions separately from messages

**Rationale:**
- Independent query loading
- Efficient updates (add/remove emoji)
- Aggregate reactions easily
- No message content modification needed
- Handles multiple reactions per user

**Alternative Considered:** Reactions array in message
- Would require full message update for each reaction
- Inefficient with many reactions
- Complex JSON manipulation

---

### 8. React Query for State Management
**Decision:** Use React Query instead of Redux/Zustand

**Rationale:**
- Automatic caching
- Built-in request deduplication
- Synchronized with real-time subscriptions
- Excellent loading/error states
- Less boilerplate code
- Great DevTools

**Alternative Considered:** Redux
- More boilerplate
- Manual cache management
- Redux Saga complexity

**Alternative Considered:** Zustand
- Doesn't handle async well
- No caching layer
- Manual sync with API

---

### 9. Mobile Responsive Toggle
**Decision:** Hide channel list on mobile, show back button

**Rationale:**
- Maximizes chat area on small screens
- Reduces cognitive load
- Standard mobile messaging pattern
- Breakpoint at 1024px (lg)

**Alternative Considered:** Always show sidebar
- Takes up too much space on mobile
- Makes messages cramped
- Poor UX on phones

---

### 10. Message Grouping by Author & Time
**Decision:** Group consecutive messages from same author within 5 minutes

**Rationale:**
- Reduces visual clutter
- Improves readability
- Matches Discord behavior
- 5 minutes is reasonable conversation boundary
- Avatar/name shown only once per group

**Alternative Considered:** Show avatar every message
- Excessive repetition
- Wastes screen space
- Harder to follow conversation

---

## Data Flow Examples

### Sending a Message Flow
```
User types message + @mention
    ↓
onSend() called with content and mentionedUserIds
    ↓
useSendMessage mutation executed
    ↓
POST /api/messaging/[teamId]/[channelId]/messages
    ↓
Backend extracts mentions from content
    ↓
Create message record
    ↓
Create mention records for mentioned users
    ↓
Trigger PostgreSQL function → update message_channels.updated_at
    ↓
Supabase subscription detects INSERT
    ↓
Real-time subscriber invalidates React Query
    ↓
Messages refetch automatically
    ↓
UI updates with new message
    ↓
User sees message instantly
```

### File Upload Flow
```
User selects file from input
    ↓
File preview shown in UI
    ↓
User sends message
    ↓
Message created first (with content)
    ↓
For each file: POST /attachments with FormData
    ↓
Backend validates file
    ↓
Upload to Supabase Storage
    ↓
Get public URL
    ↓
Create message_attachments record
    ↓
React Query refetch triggered
    ↓
Attachment appears in message
```

### Real-time Update Flow
```
User A sends message in channel #announcements
    ↓
Database INSERT triggers PostgreSQL notify
    ↓
Supabase subscription on User B's client triggers
    ↓
Custom hook fetches complete message with relations
    ↓
React Query invalidates [messages, channelId]
    ↓
Query automatically refetch
    ↓
Message list re-renders with new message
    ↓
User B sees message appear instantly
```

### @Mention Autocomplete Flow
```
User types "@al"
    ↓
useEffect detects @ and captures query "al"
    ↓
getMatchingUsers() filters team members
    ↓
Dropdown shows ["Alice", "Albert"]
    ↓
User presses down arrow to highlight "Alice"
    ↓
User presses Enter
    ↓
handleSelectMention() called
    ↓
Message text updated with "@Alice "
    ↓
Cursor moved after mention
    ↓
Dropdown closed
```

## Performance Optimizations

### Caching Strategy
- Channels cached for team ID
- Messages cached per channel ID
- Stale time: 30 seconds
- Manual refetch on mutations

### Query Deduplication
- React Query prevents duplicate requests
- Multiple subscribers get same request
- Automatic background refetch

### Lazy Loading
- Messages load on demand (50 per load)
- Attachments load on display
- Images lazy loaded with browser native

### Subscription Efficiency
- Only subscribe to current channel messages
- Unsubscribe when channel changes
- Single subscription per data type

### UI Optimization
- useLayoutEffect for smooth scrolling
- Conditional rendering for loading states
- Memoization where needed
- Avatar images cached by browser

## Security Considerations

### Authentication
- All API routes require valid user token
- Token verified with Supabase auth.getUser()

### Authorization
- Users can only see team channels
- Users can only create messages in accessible channels
- Users can only upload with their own messages
- RLS policies enforce team isolation

### Input Validation
- Message content validated (non-empty)
- File sizes checked (< 25MB)
- File types validated
- SQL injection prevented by Supabase

### Data Privacy
- Messages only visible within team
- File URLs are public but listed in channel (not secret)
- Soft deletes preserve audit trail
- User IDs in foreign keys ensure attribution

## Error Handling

### Network Errors
- React Query automatically retries
- User sees loading state
- Error toast notification (not implemented yet)

### Validation Errors
- Server responds with 400/422 status
- Mutation.error set with error message
- UI shows validation message

### Not Found Errors
- 404 response if channel not found
- 403 if user lacks access
- Error displayed to user

### Upload Errors
- File validation before send
- Size check prevents large uploads
- Type validation rejects bad files
- Upload failure doesn't affect message

## Monitoring & Analytics

**Recommended additions:**
- Message count per channel
- Active users per channel
- File upload frequency/size
- Reaction popularity
- Average message response time

## Testing Recommendations

### Unit Tests
- extractMentions() function
- getMatchingUsers() function
- isValidMessageAttachment() function
- Message grouping logic

### Integration Tests
- Create channel flow
- Send message flow
- Upload file flow
- Add reaction flow

### E2E Tests
- Complete messaging workflow
- Real-time updates
- Mobile responsiveness
- Error scenarios

---

**This architecture is built to scale from small teams to large organizations with thousands of messages per day.**
