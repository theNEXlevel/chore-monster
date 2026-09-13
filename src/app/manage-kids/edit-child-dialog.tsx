'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function EditChildDialog({
  childId,
  initialEmail,
  initialName,
  isOpen,
  onOpenChange,
}: {
  childId: string;
  initialEmail: string;
  initialName: string;
  isOpen: boolean;
  onOpenChange: (_open: boolean) => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setEmail(initialEmail);
    }
  }, [initialEmail, initialName, isOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/children/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to update child');
      }

      toast({
        title: 'Child updated',
        description: `${name}'s information has been updated.`,
      });
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Unable to update child',
        description:
          error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Edit child</DialogTitle>
          <DialogDescription>
            Update your child&apos;s name or email address.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor={`child-name-${childId}`}>Name</Label>
              <Input
                id={`child-name-${childId}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor={`child-email-${childId}`}>Email</Label>
              <Input
                id={`child-email-${childId}`}
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
