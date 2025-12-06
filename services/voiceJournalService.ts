import type { VapiTranscript, VapiMessage } from '@/types';

/**
 * Extract only user speech from Vapi transcript
 * Filters out agent questions and system messages
 */
export function extractUserContent(transcript: VapiTranscript | VapiMessage[]): string {
  try {
    // Handle both array of messages and transcript object
    const messages: VapiMessage[] = Array.isArray(transcript) 
      ? transcript 
      : transcript.messages || [];

    if (messages.length === 0) {
      return '';
    }

    // Filter to get only user messages
    const userMessages = messages
      .filter((msg) => msg.role === 'user')
      .map((msg) => msg.content.trim())
      .filter((content) => content.length > 0);

    // Join user messages with spaces
    const userContent = userMessages.join(' ');

    return userContent;
  } catch (error) {
    console.error('Error extracting user content from transcript:', error);
    return '';
  }
}

/**
 * Create journal entry from voice transcript
 * This function is called client-side and uses the existing entry API
 */
export async function createEntryFromVoice(
  userContent: string,
  prompt: string,
  tags: string[] = [],
  fullTranscript?: VapiMessage[]
): Promise<{ success: boolean; entry?: any; error?: string }> {
  try {
    if (!userContent || userContent.trim().length === 0) {
      return {
        success: false,
        error: 'No content to save. Please try speaking again.',
      };
    }

    // Call the existing entry creation API
    const response = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: userContent,
        prompt,
        tags,
        fullTranscript: fullTranscript || [], // Send full transcript
        entryType: 'voice', // Mark as voice entry
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to save entry' }));
      return {
        success: false,
        error: errorData.error || 'Failed to save entry',
      };
    }

    const data = await response.json();
    return {
      success: true,
      entry: data.entry,
    };
  } catch (error) {
    console.error('Error creating entry from voice:', error);
    return {
      success: false,
      error: 'Failed to create entry. Please try again.',
    };
  }
}
