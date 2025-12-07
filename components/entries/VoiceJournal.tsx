'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { vapiClient } from '@/lib/vapi';
import { extractUserContent, createEntryFromVoice } from '@/services/voiceJournalService';
import type { VapiMessage } from '@/types';

interface VoiceJournalProps {
  dailyPrompt: string;
  onEntryCreated?: (entry: any) => void;
  onError?: (error: string) => void;
}

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending' | 'processing' | 'completed' | 'error';

const MAX_CALL_DURATION = 6 * 60 * 1000; // 6 minutes in milliseconds
const MIN_CALL_DURATION = 2 * 60 * 1000; // 2 minutes minimum (reduced from 5 for better UX)
const SILENCE_TIMEOUT = 8; // 8 seconds of silence before auto-ending (as backup)

export function VoiceJournal({ dailyPrompt, onEntryCreated, onError }: VoiceJournalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [messages, setMessages] = useState<VapiMessage[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(MAX_CALL_DURATION);
  const [callDuration, setCallDuration] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(0);
  const vapiRef = useRef<any>(null);
  const lastUserMessageTimeRef = useRef<number>(0);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const callStatusRef = useRef<CallStatus>('idle');
  const messagesRef = useRef<VapiMessage[]>([]); // Keep messages in ref to avoid state race conditions
  const isProcessingEndRef = useRef<boolean>(false); // Prevent duplicate call-end processing

  // Keep refs in sync with state for use in timers and async operations
  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Format time in MM:SS format
  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Start the voice call
  const startCall = async () => {
    if (!vapiClient) {
      const errorMsg = 'Voice journaling is not available. Please check your configuration.';
      setCallStatus('error');
      onError?.(errorMsg);
      return;
    }

    // Check for microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      const errorMsg = 'Microphone access is required for voice journaling. Please allow microphone access and try again.';
      setCallStatus('error');
      onError?.(errorMsg);
      return;
    }

    try {
      setCallStatus('connecting');
      setMessages([]);
      setTimeRemaining(MAX_CALL_DURATION);
      setCallDuration(0);
      callStartTimeRef.current = Date.now();
      isProcessingEndRef.current = false; // Reset processing flag for new call

      // Create assistant configuration with daily prompt
      // Note: Simplified configuration - removed function calling for now
      // We'll rely on silence detection for automatic ending
      const assistantConfig: any = {
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en-US',
        },
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an empathetic, non-judgmental AI journaling companion. Your role is to:
- Welcome the user warmly and ask them the daily prompt
- After they respond, if their answer is brief or underdeveloped, ask 1-2 thoughtful follow-up questions to help them explore deeper
- If their answer is well-developed, acknowledge it warmly and ask if there's anything else they'd like to explore
- Keep the conversation natural, supportive, and focused on helping them explore their thoughts and emotions
- Maximum conversation time: 6 minutes
- Be warm, empathetic, and encouraging
- When the conversation feels complete (user has explored their thoughts fully), you can say something like "Thank you for sharing. I think we've covered a lot today. Feel free to end the call whenever you're ready."`,
            },
            {
              role: 'user',
              content: `Welcome the user warmly, then ask them: "${dailyPrompt}"`,
            },
          ],
        },
        voice: {
          provider: '11labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Warm, empathetic voice
        },
        firstMessage: `Hi! I'm here to help you reflect today. ${dailyPrompt}`,
        name: 'Voice Journaling Assistant',
      };

      // Start the call
      try {
        vapiRef.current = await vapiClient.start(assistantConfig);
      } catch (startError: any) {
        console.error('Vapi start error details:', startError);
        throw new Error(startError?.message || startError?.toString() || 'Failed to start call');
      }
      
      setCallStatus('active');
      startTimer();
      lastUserMessageTimeRef.current = Date.now(); // Initialize silence detection

      // Set up event listeners
      // Note: Using type assertion for event names as Vapi SDK types may not be fully defined
      (vapiClient as any).on('message', handleMessage);
      (vapiClient as any).on('transcript', handleMessage); // Also listen to transcript events
      (vapiClient as any).on('call-end', handleCallEnd);
      // Removed duplicate 'call-ended' listener to prevent double processing
      (vapiClient as any).on('status-update', handleStatusUpdate);
      (vapiClient as any).on('error', handleError);
    } catch (error: any) {
      console.error('Error starting call:', error);
      console.error('Error stack:', error?.stack);
      console.error('Error details:', {
        message: error?.message,
        name: error?.name,
        cause: error?.cause,
        fullError: error,
      });
      setCallStatus('error');
      const errorMsg = error?.message || error?.toString() || 'Failed to start voice call. Please check your Vapi configuration and try again.';
      onError?.(errorMsg);
    }
  };

  // Handle incoming messages
  const handleMessage = (data: any) => {
    try {
      // Vapi message structure may vary, handle different formats
      // Could be: { role, content }, { type, text }, { message, role }, etc.
      let message: VapiMessage | null = null;

      // Skip partial/interim transcripts - only process final messages
      // Vapi sends transcript-partial for incremental updates, transcript-final for complete
      if (data?.type && (
        data.type.includes('partial') ||
        data.type.includes('interim') ||
        data.type.includes('progress')
      )) {
        return; // Skip incremental updates
      }

      // Handle array of messages
      if (Array.isArray(data)) {
        data.forEach((msg) => {
          const parsed = parseMessage(msg);
          if (parsed) {
            setMessages((prev) => {
              // Check if this is an update to the last message of the same role
              const lastMsg = prev[prev.length - 1];
              if (lastMsg && lastMsg.role === parsed.role) {
                // If new message starts with or contains last message, it's likely an update
                if (parsed.content.includes(lastMsg.content) || lastMsg.content.includes(parsed.content)) {
                  // Replace the last message with the newer, more complete one
                  return [...prev.slice(0, -1), parsed];
                }
              }
              // Otherwise add as new message
              return [...prev, parsed];
            });
            // Track user messages for silence detection
            if (parsed.role === 'user') {
              lastUserMessageTimeRef.current = Date.now();
              resetSilenceTimer();
            }
          }
        });
        return;
      }

      // Handle single message object
      message = parseMessage(data);
      if (message && message.content) {
        setMessages((prev) => {
          // Check if this is an incremental update of the last message
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.role === message!.role) {
            // If exact duplicate, skip
            if (lastMsg.content === message!.content) {
              return prev;
            }
            // If new message contains or extends the last message, replace it
            if (message!.content.includes(lastMsg.content) || lastMsg.content.includes(message!.content)) {
              return [...prev.slice(0, -1), message!];
            }
          }
          // Otherwise add as new message
          return [...prev, message!];
        });

        // Track user messages for silence detection
        if (message.role === 'user') {
          lastUserMessageTimeRef.current = Date.now();
          resetSilenceTimer();
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  // Helper to parse different message formats
  const parseMessage = (data: any): VapiMessage | null => {
    if (!data) return null;

    // Try different field names for role
    let role: 'user' | 'assistant' | 'system' = 'assistant'; // Default to assistant
    
    if (data.role) {
      role = data.role;
    } else if (data.type === 'user-message' || data.type === 'user' || data.type === 'userMessage') {
      role = 'user';
    } else if (data.type === 'assistant-message' || data.type === 'assistant' || data.type === 'assistantMessage') {
      role = 'assistant';
    } else if (data.speaker === 'user' || data.speaker === 'caller') {
      role = 'user';
    } else if (data.speaker === 'assistant' || data.speaker === 'agent') {
      role = 'assistant';
    } else if (data.from === 'user' || data.from === 'caller') {
      role = 'user';
    } else if (data.from === 'assistant' || data.from === 'agent') {
      role = 'assistant';
    }

    // Try different field names for content
    const content = data.content || 
                   data.text || 
                   data.message || 
                   data.transcript || 
                   data.body ||
                   '';

    if (!content || content.trim().length === 0) {
      return null;
    }

    const parsed: VapiMessage = {
      role: role,
      content: content.trim(),
      timestamp: data.timestamp || data.time || Date.now(),
    };

    // Debug log for user messages
    if (role === 'user') {
      console.log('Parsed user message:', parsed);
    }

    return parsed;
  };

  // Handle call end
  const handleCallEnd = async (data: any) => {
    try {
      // Prevent duplicate processing
      if (isProcessingEndRef.current) {
        console.log('handleCallEnd already in progress, skipping duplicate call');
        return;
      }
      isProcessingEndRef.current = true;

      setCallStatus('ending');
      stopTimer();

      // Collect all messages from different sources (use ref to get latest messages)
      let allMessages: VapiMessage[] = [...messagesRef.current];
      console.log('handleCallEnd - Current messages from ref:', allMessages.length, 'messages');

      // Get final messages if available from webhook data
      if (data?.messages && Array.isArray(data.messages)) {
        const parsedMessages = data.messages
          .map((m: any) => parseMessage(m))
          .filter((m: VapiMessage | null): m is VapiMessage => m !== null);
        
        // Merge avoiding duplicates
        const existingContents = new Set(allMessages.map((m) => m.content));
        const newMessages = parsedMessages.filter(m => !existingContents.has(m.content));
        allMessages = [...allMessages, ...newMessages];
      }

      // Also try to get messages from call object if available
      if (vapiRef.current) {
        try {
          // Try different methods to get messages
          let callMessages: any[] = [];
          
          if (typeof vapiRef.current.getMessages === 'function') {
            callMessages = await vapiRef.current.getMessages();
          } else if (vapiRef.current.messages) {
            callMessages = vapiRef.current.messages;
          } else if (data?.transcript) {
            callMessages = Array.isArray(data.transcript) ? data.transcript : data.transcript.messages || [];
          }

          if (callMessages && Array.isArray(callMessages)) {
            const parsedMessages = callMessages
              .map((m: any) => parseMessage(m))
              .filter((m: VapiMessage | null): m is VapiMessage => m !== null);
            
            // Merge avoiding duplicates
            const existingContents = new Set(allMessages.map((m) => m.content));
            const newMessages = parsedMessages.filter(m => !existingContents.has(m.content));
            allMessages = [...allMessages, ...newMessages];
          }
        } catch (err) {
          console.warn('Could not get messages from call object:', err);
        }
      }

      // Update state with all collected messages
      setMessages(allMessages);

      console.log('handleCallEnd - About to process transcript with', allMessages.length, 'messages');

      // Process transcript with the collected messages (don't wait for state update)
      // Use a small delay to let any final messages arrive
      setTimeout(() => {
        processTranscript(allMessages);
      }, 1000); // Increased from 500ms to 1000ms to ensure all messages arrive
    } catch (error: any) {
      console.error('Error handling call end:', error);
      setCallStatus('error');
      const errorMsg = error?.message || 'Error processing call. Please try again.';
      onError?.(errorMsg);
    }
  };

  // Handle status updates
  const handleStatusUpdate = (data: any) => {
    if (data.status === 'ended' || data.status === 'call-ended') {
      handleCallEnd(data);
    }
  };

  // Handle errors
  const handleError = (error: any) => {
    console.error('Vapi error:', error);
    console.error('Error details:', {
      type: error?.type,
      error: error?.error,
      message: error?.error?.msg || error?.message,
      timestamp: error?.timestamp,
    });

    // Don't set error status if call is already ending/processing
    // This prevents the error from interrupting transcript processing
    if (callStatusRef.current === 'ending' || callStatusRef.current === 'processing') {
      console.log('Ignoring error during call end/processing phase');
      return;
    }

    setCallStatus('error');
    stopTimer();

    // Provide more specific error message
    const errorMsg = error?.error?.msg || error?.message || 'An error occurred during the call. Please try again.';
    onError?.(errorMsg);
  };

  // Process transcript and create entry
  const processTranscript = async (messagesToProcess?: VapiMessage[]) => {
    try {
      setCallStatus('processing');

      // Use provided messages or current state
      const messagesToUse = messagesToProcess || messages;

      // Debug: log messages to see what we have
      console.log('Processing transcript with messages:', messagesToUse);
      console.log('User messages:', messagesToUse.filter(m => m.role === 'user'));

      // Extract user content from messages
      const userContent = extractUserContent(messagesToUse);

      console.log('Extracted user content:', userContent);
      console.log('Total messages:', messagesToUse.length);
      console.log('User messages count:', messagesToUse.filter(m => m.role === 'user').length);

      // Only validate if we have messages but no user content
      // If we have messages, try to save anyway (might be a parsing issue)
      if (!userContent || userContent.trim().length === 0) {
        // Check if we have any messages at all
        if (messagesToUse.length === 0) {
          setCallStatus('error');
          onError?.('No speech detected. Please try speaking again or switch to text mode.');
          return;
        }
        // If we have messages but couldn't extract user content, it might be a parsing issue
        // Try to save with a fallback message
        console.warn('Could not extract user content, but messages exist. Attempting to save with fallback.');
        const fallbackContent = messagesToUse
          .map(m => m.content)
          .filter(c => c && c.trim().length > 0)
          .join(' ');
        
        if (!fallbackContent || fallbackContent.trim().length === 0) {
          setCallStatus('error');
          onError?.('No speech detected. Please try speaking again or switch to text mode.');
          return;
        }
        
        // Use fallback content but still pass full transcript
        const result = await createEntryFromVoice(fallbackContent, dailyPrompt, [], messagesToUse);
        if (result.success && result.entry) {
          setCallStatus('completed');
          onEntryCreated?.(result.entry);
        } else {
          setCallStatus('error');
          onError?.(result.error || 'Failed to save entry. Please try again.');
        }
        return;
      }

      // Validate minimum content length (but don't block if we have transcript)
      const wordCount = userContent.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 5 && messagesToUse.length === 0) {
        setCallStatus('error');
        onError?.('Your entry seems too short. Please try speaking more or switch to text mode.');
        return;
      }

      // Create entry from voice transcript (pass full transcript for storage)
      const result = await createEntryFromVoice(userContent, dailyPrompt, [], messagesToUse);

      if (result.success && result.entry) {
        setCallStatus('completed');
        onEntryCreated?.(result.entry);
        // Reset processing flag after successful completion
        setTimeout(() => {
          isProcessingEndRef.current = false;
        }, 2000);
      } else {
        // Only show error if save actually failed
        // Don't show error if entry was saved but we got a false negative
        setCallStatus('error');
        onError?.(result.error || 'Failed to save entry. Please try again.');
        isProcessingEndRef.current = false; // Reset on error
      }
    } catch (error: any) {
      console.error('Error processing transcript:', error);
      setCallStatus('error');
      const errorMsg = error?.message || 'Error processing your journal entry. Please try again.';
      onError?.(errorMsg);
      isProcessingEndRef.current = false; // Reset on error
    }
  };

  // End call manually - Just stop the call, let handleCallEnd event process the transcript
  const endCall = async () => {
    try {
      // Just stop the Vapi call - the 'call-end' event will trigger handleCallEnd
      if (vapiRef.current && vapiClient) {
        console.log('Stopping Vapi call...');
        await vapiClient.stop();
        // handleCallEnd will be triggered by the call-end event from Vapi
      }
    } catch (error) {
      console.error('Error stopping call:', error);
      // Fallback: if stop fails and we haven't started processing yet, try to process manually
      if (!isProcessingEndRef.current) {
        console.log('Stop failed, processing manually as fallback');
        handleCallEnd({});
      }
    }
  };

  // Timer functions
  const startTimer = () => {
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - callStartTimeRef.current;
      const remaining = Math.max(0, MAX_CALL_DURATION - elapsed);
      setTimeRemaining(remaining);
      setCallDuration(elapsed);

      // Auto-end call when time limit reached
      if (remaining === 0) {
        setCallStatus((prevStatus) => {
          if (prevStatus === 'active') {
            endCall();
          }
          return prevStatus;
        });
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };

  // Reset silence detection timer
  const resetSilenceTimer = () => {
    // Clear existing timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    // DISABLED: Silence detection auto-end removed per user request
    // Call will only end when user clicks "End Call" button or max duration reached
    // Only start silence detection if call is active
    // if (callStatusRef.current === 'active') {
    //   const elapsed = Date.now() - callStartTimeRef.current;
    //   // Only enable silence detection after minimum duration and if user has spoken
    //   if (elapsed >= MIN_CALL_DURATION && lastUserMessageTimeRef.current > callStartTimeRef.current) {
    //     // Set timer to check for silence after SILENCE_TIMEOUT seconds
    //     silenceTimerRef.current = setTimeout(() => {
    //       const timeSinceLastUserMessage = Date.now() - lastUserMessageTimeRef.current;
    //       // If no user message in the last SILENCE_TIMEOUT seconds, end the call
    //       if (timeSinceLastUserMessage >= SILENCE_TIMEOUT * 1000 && callStatusRef.current === 'active') {
    //         console.log('Silence detected after user speech, ending call automatically');
    //         endCall();
    //       }
    //     }, SILENCE_TIMEOUT * 1000);
    //   }
    // }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      if (vapiClient) {
        (vapiClient as any).off('message', handleMessage);
        (vapiClient as any).off('transcript', handleMessage);
        (vapiClient as any).off('call-end', handleCallEnd);
        // Removed duplicate 'call-ended' cleanup
        (vapiClient as any).off('status-update', handleStatusUpdate);
        (vapiClient as any).off('error', handleError);
        if (vapiRef.current) {
          vapiClient.stop().catch(() => {});
        }
      }
    };
  }, []);

  const getStatusColor = () => {
    switch (callStatus) {
      case 'active':
        return 'text-[hsl(var(--color-positive))]';
      case 'connecting':
      case 'processing':
        return 'text-[hsl(var(--color-primary))]';
      case 'completed':
        return 'text-[hsl(var(--color-positive))]';
      case 'error':
        return 'text-[hsl(var(--color-negative))]';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusText = () => {
    switch (callStatus) {
      case 'idle':
        return 'Ready to start';
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return 'Recording';
      case 'ending':
        return 'Ending call...';
      case 'processing':
        return 'Processing your entry...';
      case 'completed':
        return 'Entry saved!';
      case 'error':
        return 'Error occurred';
      default:
        return '';
    }
  };

  return (
    <Card className="border-2 border-[hsl(var(--color-primary))]/30">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Status and Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full bg-[hsl(var(--color-primary))]/10 ${getStatusColor()}`}>
                {callStatus === 'active' ? (
                  <Mic className="w-6 h-6 animate-pulse" />
                ) : callStatus === 'processing' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : callStatus === 'completed' ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : callStatus === 'error' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <MicOff className="w-6 h-6" />
                )}
              </div>
              <div>
                <p className="font-semibold text-foreground">{getStatusText()}</p>
                {callStatus === 'active' && (
                  <p className="text-sm text-muted-foreground">
                    Time remaining: {formatTime(timeRemaining)}
                  </p>
                )}
              </div>
            </div>
            {callStatus === 'active' && (
              <Button onClick={endCall} variant="outline" size="sm">
                End Call
              </Button>
            )}
          </div>


          {/* Call Controls */}
          {callStatus === 'idle' && (
            <div className="space-y-2">
              <Button
                onClick={startCall}
                className="w-full"
                size="lg"
                disabled={!vapiClient}
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Journaling
              </Button>
              {!vapiClient && (
                <p className="text-sm text-muted-foreground text-center">
                  Voice journaling is not configured. Please add <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_VAPI_PUBLIC_KEY</code> to your environment variables.
                </p>
              )}
            </div>
          )}

          {/* Transcript Preview (optional, for debugging) */}
          {messages.length > 0 && callStatus !== 'idle' && (
            <div className="max-h-48 overflow-y-auto p-4 rounded-lg bg-[hsl(var(--color-muted))]/30 border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-2">Conversation Preview</p>
              <div className="space-y-2 text-sm">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      msg.role === 'user'
                        ? 'bg-[hsl(var(--color-primary))]/10 text-foreground'
                        : 'bg-[hsl(var(--color-muted))]/50 text-muted-foreground'
                    }`}
                  >
                    <span className="font-medium text-xs">
                      {msg.role === 'user' ? 'You' : 'Assistant'}:
                    </span>{' '}
                    {msg.content}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {callStatus === 'idle' && (
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• Speak naturally and answer the prompt</p>
              <p>• The assistant may ask follow-up questions to help you explore deeper</p>
              <p>• Your entry will be saved automatically when the call ends</p>
              <p>• Maximum call duration: 6 minutes</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
