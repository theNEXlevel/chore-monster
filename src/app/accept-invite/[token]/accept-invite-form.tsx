'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { authClient, signIn } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function AcceptInviteForm({
  email,
  name,
  token,
}: {
  email: string;
  name: string;
  token: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (error) {
      toast({
        title: 'Invitation expired',
        description:
          error.message || 'Request a new invitation from your parent.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const signInResult = await signIn.email({ email, password });
    if (signInResult.error) {
      toast({
        title: 'Account created',
        description: 'Your account is ready. Sign in to continue.',
      });
      router.push('/signin');
      return;
    }

    router.push('/chores');
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='space-y-2'>
        <Label htmlFor='invite-email'>Email</Label>
        <Input id='invite-email' value={email} disabled />
      </div>
      <div className='space-y-2'>
        <Label htmlFor='invite-password'>Create a password</Label>
        <Input
          id='invite-password'
          type='password'
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          autoFocus
        />
      </div>
      <Button type='submit' className='w-full' disabled={isLoading}>
        {isLoading ? 'Setting up account...' : `Join as ${name}`}
      </Button>
    </form>
  );
}
