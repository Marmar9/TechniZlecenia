'use client'

import { useState } from 'react'
import { useChat } from '@/hooks/use-chat'
import { ThreadInfo, MessageInfo } from '@/types/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface ChatInterfaceProps {
  token: string | null
  currentUserId?: string
}

export function ChatInterface({ token, currentUserId }: ChatInterfaceProps) {
  const {
    isConnected,
    threads,
    activeThread,
    activeMessages,
    selectThread,
    sendMessage,
    loadMoreMessages
  } = useChat({ token })

  const [messageInput, setMessageInput] = useState('')

  const handleSendMessage = () => {
    if (activeThread && messageInput.trim()) {
      sendMessage(activeThread.id, messageInput)
      setMessageInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (!token) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Please login to access chat</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex h-[600px] max-w-4xl mx-auto border rounded-lg overflow-hidden">
      {/* Thread List */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            Chat Messages
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Online" : "Offline"}
            </Badge>
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            threads.map((thread) => (
              <ThreadListItem
                key={thread.id}
                thread={thread}
                isActive={activeThread?.id === thread.id}
                onClick={() => selectThread(thread.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col">
        {activeThread ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b">
              <h4 className="font-semibold">{activeThread.other_user_name}</h4>
              <p className="text-sm text-muted-foreground">{activeThread.post_title}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwnMessage={message.sender_id === currentUserId}
                />
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={!isConnected}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!isConnected || !messageInput.trim()}
                >
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  )
}

interface ThreadListItemProps {
  thread: ThreadInfo
  isActive: boolean
  onClick: () => void
}

function ThreadListItem({ thread, isActive, onClick }: ThreadListItemProps) {
  return (
    <div
      className={`p-4 cursor-pointer border-b hover:bg-muted/50 ${
        isActive ? 'bg-muted' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10">
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            {thread.other_user_name.charAt(0).toUpperCase()}
          </div>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium truncate">{thread.other_user_name}</h4>
            {thread.last_message_at && (
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
              </span>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground truncate">{thread.post_title}</p>
          
          {thread.last_message && (
            <p className="text-sm text-muted-foreground truncate mt-1">
              {thread.last_message}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

interface MessageBubbleProps {
  message: MessageInfo
  isOwnMessage: boolean
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 ${
          isOwnMessage
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        }`}
      >
        {!isOwnMessage && (
          <p className="text-xs font-medium mb-1">{message.sender_name}</p>
        )}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          {formatDistanceToNow(new Date(message.sent_at), { addSuffix: true })}
        </p>
      </div>
    </div>
  )
}

