'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Check, Pencil, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

type FamilyNameEditorProps = {
  initialName: string;
};

export function FamilyNameEditor({ initialName }: FamilyNameEditorProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setName(initialName);
    }
  }, [initialName, isEditing]);

  function cancelEditing() {
    setName(initialName);
    setIsEditing(false);
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast({
        title: 'Family name required',
        description: 'Enter a name for your family.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/family', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to update the family name');
      }

      setName(result.name);
      setIsEditing(false);
      router.refresh();
      toast({
        title: 'Family name updated',
        description: `Your family is now called ${result.name}.`,
      });
    } catch (error) {
      toast({
        title: 'Unable to update family name',
        description:
          error instanceof Error
            ? error.message
            : 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    return (
      <button
        type='button'
        onClick={() => setIsEditing(true)}
        className='group focus-visible:ring-ring inline-flex items-center gap-2 rounded-md text-left focus-visible:ring-1 focus-visible:outline-hidden'
        aria-label='Edit family name'
      >
        <h1 className='text-2xl font-bold'>{name}</h1>
        <Pencil
          className='text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100'
          aria-hidden='true'
        />
      </button>
    );
  }

  return (
    <form onSubmit={saveName} className='flex items-center gap-2'>
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className='h-10 w-56 text-lg font-semibold'
        maxLength={100}
        aria-label='Family name'
        autoFocus
        disabled={isSaving}
      />
      <Button
        type='submit'
        size='icon'
        aria-label='Save family name'
        disabled={isSaving}
      >
        <Check aria-hidden='true' />
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        onClick={cancelEditing}
        aria-label='Cancel editing family name'
        disabled={isSaving}
      >
        <X aria-hidden='true' />
      </Button>
    </form>
  );
}
