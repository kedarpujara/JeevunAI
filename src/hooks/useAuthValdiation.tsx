// src/hooks/useAuthValidation.ts - New hook for critical operations
import { useAuth } from '@/context/AuthContext';
import { useCallback } from 'react';

export function useAuthValidation() {
  const { isSessionValid, validateSession, user } = useAuth();
  
  const ensureValidSession = useCallback(async (): Promise<boolean> => {
    if (!user) {
      console.log('❌ No user, session invalid');
      return false;
    }
    
    if (!isSessionValid) {
      console.log('🔄 Session marked invalid, attempting validation...');
      return await validateSession();
    }
    
    // Double-check with server for critical operations
    return await validateSession();
  }, [user, isSessionValid, validateSession]);
  
  return { ensureValidSession, isSessionValid };
}