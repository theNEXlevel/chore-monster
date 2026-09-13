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
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AddChildDialog() {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && !isLoading) resetForm();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/child-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Unable to send invitation');
      }

      toast({
        title: 'Invitation sent',
        description: `An account invitation was sent to ${email}.`,
      });
      setIsOpen(false);
      resetForm();
      router.refresh();
    } catch (error) {
      toast({
        title: 'Unable to add child',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <Button type='button' onClick={() => setIsOpen(true)}>
        <Plus />
        Add child
      </Button>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Add child</DialogTitle>
          <DialogDescription>
            Send an invitation so your child can set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='space-y-2'>
              <Label htmlFor='child-name'>Name</Label>
              <Input
                id='child-name'
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder='Alex Monster'
                required
                autoFocus
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='child-email'>Email</Label>
              <Input
                id='child-email'
                type='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder='alex@example.com'
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type='submit' disabled={isLoading}>
              {isLoading ? 'Sending invitation...' : 'Add child'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
