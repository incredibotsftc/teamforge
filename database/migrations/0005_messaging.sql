-- Messaging system tables for Discord-like functionality

-- Create message channels table
CREATE TABLE "public"."message_channels" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES "public"."teams"(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_direct_message BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for team_id to optimize queries
CREATE INDEX idx_message_channels_team_id ON "public"."message_channels"(team_id);

-- Create messages table
CREATE TABLE "public"."messages" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES "public"."message_channels"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "auth"."users"(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for messages
CREATE INDEX idx_messages_channel_id ON "public"."messages"(channel_id);
CREATE INDEX idx_messages_user_id ON "public"."messages"(user_id);
CREATE INDEX idx_messages_created_at ON "public"."messages"(created_at DESC);
CREATE INDEX idx_messages_channel_created ON "public"."messages"(channel_id, created_at DESC);

-- Create message attachments table
CREATE TABLE "public"."message_attachments" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES "public"."messages"(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for message_id
CREATE INDEX idx_message_attachments_message_id ON "public"."message_attachments"(message_id);

-- Create mentions table for @mentions
CREATE TABLE "public"."message_mentions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES "public"."messages"(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES "auth"."users"(id) ON DELETE CASCADE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for mentions
CREATE INDEX idx_message_mentions_message_id ON "public"."message_mentions"(message_id);
CREATE INDEX idx_message_mentions_user_id ON "public"."message_mentions"(mentioned_user_id);

-- Create channel members table (who has access to which channels)
CREATE TABLE "public"."message_channel_members" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES "public"."message_channels"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "auth"."users"(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES "public"."messages"(id) ON DELETE SET NULL,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create indexes for channel members
CREATE INDEX idx_message_channel_members_channel_id ON "public"."message_channel_members"(channel_id);
CREATE INDEX idx_message_channel_members_user_id ON "public"."message_channel_members"(user_id);

-- Create reactions table for message reactions (optional but nice to have)
CREATE TABLE "public"."message_reactions" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES "public"."messages"(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "auth"."users"(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_id, emoji)
);

-- Create index for reactions
CREATE INDEX idx_message_reactions_message_id ON "public"."message_reactions"(message_id);

-- Add trigger to update message_channels updated_at
CREATE OR REPLACE FUNCTION update_message_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE "public"."message_channels"
    SET updated_at = NOW()
    WHERE id = NEW.channel_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_channels_on_message
AFTER INSERT ON "public"."messages"
FOR EACH ROW EXECUTE FUNCTION update_message_channels_updated_at();
