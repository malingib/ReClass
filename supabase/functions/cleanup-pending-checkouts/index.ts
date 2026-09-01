/**
 * Scheduled function to clean up pending STK checkout requests
 * Handles the case where checkout_requests remain in 'pending' state indefinitely
 */

import { getServiceClient } from '../_shared/supabase.ts';
import { json } from '../_shared/response.ts';

// Maximum time a checkout request can remain in pending state (30 minutes)
const PENDING_TIMEOUT_MS = 30 * 60 * 1000;
const CLEANUP_BATCH_SIZE = 100;

interface CleanupResult {
  cleaned: number;
  failed: number;
  errors: string[];
}

async function cleanupPendingCheckouts(): Promise<CleanupResult> {
  const supabase = getServiceClient();
  const result: CleanupResult = { cleaned: 0, failed: 0, errors: [] };
  
  try {
    // Find pending checkout requests older than the timeout
    const timeoutThreshold = new Date(Date.now() - PENDING_TIMEOUT_MS).toISOString();
    
    const { data: pendingCheckouts, error: fetchError } = await supabase
      .from('checkout_requests')
      .select('checkout_id, created_at, fee_type_id, student_id')
      .eq('status', 'pending')
      .lt('created_at', timeoutThreshold)
      .limit(CLEANUP_BATCH_SIZE);
    
    if (fetchError) {
      result.errors.push(`Failed to fetch pending checkouts: ${fetchError.message}`);
      return result;
    }
    
    if (!pendingCheckouts || pendingCheckouts.length === 0) {
      return result;
    }
    
    console.log(`[cleanup] Found ${pendingCheckouts.length} pending checkouts to clean up`);
    
    // Update each pending checkout to 'failed' with timeout reason
    const checkoutIds = pendingCheckouts.map(c => c.checkout_id);
    
    const { error: updateError } = await supabase
      .from('checkout_requests')
      .update({ 
        status: 'failed', 
        reason: 'TIMEOUT - Request was pending for too long and was automatically cancelled',
        updated_at: new Date().toISOString()
      })
      .in('checkout_id', checkoutIds);
    
    if (updateError) {
      result.errors.push(`Failed to update checkouts: ${updateError.message}`);
      result.failed = pendingCheckouts.length;
    } else {
      result.cleaned = pendingCheckouts.length;
      console.log(`[cleanup] Successfully cleaned up ${result.cleaned} pending checkouts`);
    }
    
    return result;
    
  } catch (error) {
    result.errors.push(`Unexpected error during cleanup: ${error instanceof Error ? error.message : String(error)}`);
    result.failed = 1;
    return result;
  }
}

// Deno.serve for scheduled function
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }
  
  console.log('[cleanup] Starting pending checkout cleanup');
  
  try {
    const result = await cleanupPendingCheckouts();
    
    return json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    }, 200);
    
  } catch (error) {
    console.error('[cleanup] Critical error during cleanup:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, 500);
  }
});