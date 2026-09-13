'use client';

import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/components/contexts/impersonation-context';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function ImpersonateChildButton({
  childId,
  childName,
}: {
  childId: string;
  childName: string;
}) {
  const router = useRouter();
  const { startImpersonation } = useImpersonation();
  const [isLoading, setIsLoading] = useState(false);

  const handleImpersonate = async () => {
    setIsLoading(true);

    try {
      await startImpersonation({ id: childId });
      router.push('/chores');
      router.refresh();
    } catch (error) {
      console.error(`Error impersonating ${childName}:`, error);
      setIsLoading(false);
    }
  };

  return (
    <Button type='button' onClick={handleImpersonate} disabled={isLoading}>
      {isLoading ? 'Switching...' : `View as ${childName}`}
    </Button>
  );
}
