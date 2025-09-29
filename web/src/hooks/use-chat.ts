'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChatCommand, ChatResponse, ThreadInfo, MessageInfo } from '@/types/api'

interface UseChatOptions {
  apiUrl?: string
  token?: string | null
}

interface ChatState {
  isConnected: boolean
  threads: ThreadInfo[]
  messages: Record<string, MessageInfo[]> // threadId -> messages
  activeThreadId: string | null
}

export function useChat({ apiUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : 'https://api.oxylize.com'), token }: UseChatOptions) {
  const [state, setState] = useState<ChatState>({
    isConnected: false,
    threads: [],
    messages: {},
    activeThreadId: null
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  const connect = useCallback(() => {
    if (!token) {
      console.warn('No token provided for chat connection')
      return
    }

    try {
      const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:'
      const wsUrl = apiUrl.replace(/^https?:/, wsProtocol)
      // Add token as query parameter for WebSocket authentication
      const wsUrlWithAuth = `${wsUrl}/chat/ws?token=${encodeURIComponent(token)}`
      const ws = new WebSocket(wsUrlWithAuth)
      
      ws.onopen = () => {
        console.log('Chat WebSocket connected')
        setState(prev => ({ ...prev, isConnected: true }))
        
        // Get threads on connection
        sendCommand({ cmd: 'get_threads' })
      }

      ws.onmessage = (event) => {
        try {
          const response: ChatResponse = JSON.parse(event.data)
          handleResponse(response)
        } catch (error) {
          console.error('Failed to parse chat message:', error)
        }
      }

      ws.onclose = () => {
        console.log('Chat WebSocket disconnected')
        setState(prev => ({ ...prev, isConnected: false }))
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.onerror = (error) => {
        console.error('Chat WebSocket error:', error)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to connect to chat WebSocket:', error)
    }
  }, [apiUrl, token])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  const sendCommand = useCallback((command: ChatCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(command))
    } else {
      console.warn('WebSocket not connected, cannot send command:', command)
    }
  }, [])

  const handleResponse = useCallback((response: ChatResponse) => {
    setState(prev => {
      switch (response.type) {
        case 'threads_list':
          return { ...prev, threads: response.threads }

        case 'thread_created':
          return { 
            ...prev, 
            threads: [response.thread, ...prev.threads],
            activeThreadId: response.thread.id
          }

        case 'messages_list':
          const threadId = response.messages[0]?.thread_id
          if (threadId) {
            return {
              ...prev,
              messages: {
                ...prev.messages,
                [threadId]: response.messages.reverse() // Reverse to show oldest first
              }
            }
          }
          return prev

        case 'message_sent':
        case 'new_message':
          const messageThreadId = response.message.thread_id
          return {
            ...prev,
            messages: {
              ...prev.messages,
              [messageThreadId]: [
                ...(prev.messages[messageThreadId] || []),
                response.message
              ]
            },
            // Update thread's last message
            threads: prev.threads.map(thread => 
              thread.id === messageThreadId 
                ? { 
                    ...thread, 
                    last_message: response.message.content,
                    last_message_at: response.message.sent_at,
                    updated_at: response.message.sent_at
                  }
                : thread
            )
          }

        case 'error':
          console.error('Chat error:', response.message)
          return prev

        default:
          return prev
      }
    })
  }, [])

  // Chat actions
  const createThread = useCallback((postId: string, otherUserId: string) => {
    sendCommand({ cmd: 'create_thread', post_id: postId, other_user_id: otherUserId })
  }, [sendCommand])

  const sendMessage = useCallback((threadId: string, content: string) => {
    if (content.trim()) {
      sendCommand({ cmd: 'send_message', thread_id: threadId, content: content.trim() })
    }
  }, [sendCommand])

  const selectThread = useCallback((threadId: string) => {
    setState(prev => ({ ...prev, activeThreadId: threadId }))
    
    // Load messages if not already loaded
    if (!state.messages[threadId]) {
      sendCommand({ cmd: 'get_messages', thread_id: threadId, limit: 50, offset: 0 })
    }
  }, [sendCommand, state.messages])

  const loadMoreMessages = useCallback((threadId: string) => {
    const currentMessages = state.messages[threadId] || []
    sendCommand({ 
      cmd: 'get_messages', 
      thread_id: threadId, 
      limit: 50, 
      offset: currentMessages.length 
    })
  }, [sendCommand, state.messages])

  // Effects
  useEffect(() => {
    if (token) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [token, connect, disconnect])

  return {
    ...state,
    connect,
    disconnect,
    createThread,
    sendMessage,
    selectThread,
    loadMoreMessages,
    activeThread: state.activeThreadId ? state.threads.find(t => t.id === state.activeThreadId) : null,
    activeMessages: state.activeThreadId ? state.messages[state.activeThreadId] || [] : []
  }
}

