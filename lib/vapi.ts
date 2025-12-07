'use client';

import Vapi from '@vapi-ai/web';

// Vapi public key from environment (client-side only)
// Must use NEXT_PUBLIC_ prefix for client-side environment variables
const VAPI_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;

if (!VAPI_PUBLIC_KEY) {
  console.warn('NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set. Voice journaling will not work.');
}

// Initialize Vapi client
export const vapiClient = VAPI_PUBLIC_KEY ? new Vapi(VAPI_PUBLIC_KEY) : null;

export default vapiClient;
