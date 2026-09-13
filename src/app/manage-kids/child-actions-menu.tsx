'use client';

import { useImpersonation } from '@/components/contexts/impersonation-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { EditChildDialog } from './edit-child-dialog';
import { Edit, Eye, Mail, MoreHorizontal } from 'lucide-react';
import { useState } from 'react';

export function ChildActionsMenu({
  childId,
  childName,
  childEmail,
  isPending,
}: {
  childId: string;
  childName: string;
  childEmail: string;
  isPending: boolean;
}) {
  const { startImpersonation } = useImpersonation();
  const { toast } = useToast();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleImpersonate = async () => {
    setIsImpersonating(true);

    try {
      await startImpersonation({ id: childId });
      window.location.href = '/chores';
    } catch (error) {
      console.error(`Error impersonating ${childName}:`, error);
      toast({
        title: 'Unable to switch accounts',
        description: 'Please try again.',
        variant: 'destructive',
      });
      setIsImpersonating(false);
    }
  };

  const handleResendInvite = async () => {
    setIsResending(true);

    try {
      const response = await fetch(`/api/child-invites/${childId}/resend`, {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to resend invitation');
      }

      toast({
        title: 'Invitation resent',
        description: `A new invitation was sent to ${childName}.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to resend invitation',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            aria-label={`Actions for ${childName}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem
            disabled={isImpersonating || isResending}
            onSelect={() => setIsEditOpen(true)}
          >
            <Edit />
            Edit child
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isImpersonating || isResending}
            onSelect={() => void handleImpersonate()}
          >
            <Eye />
            {isImpersonating ? 'Switching...' : `View as ${childName}`}
          </DropdownMenuItem>
          {isPending && (
            <DropdownMenuItem
              disabled={isImpersonating || isResending}
              onSelect={() => void handleResendInvite()}
            >
              <Mail />
              {isResending ? 'Resending...' : 'Resend invite'}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <EditChildDialog
        childId={childId}
        initialEmail={childEmail}
        initialName={childName}
        isOpen={isEditOpen}
        onOpenChange={setIsEditOpen}
      />
    </>
  );
}
