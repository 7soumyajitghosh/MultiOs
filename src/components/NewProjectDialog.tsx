import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { PrimaryButton } from './PrimaryButton';
import type { Project } from '../data/mock';

export type NewProjectInput = Pick<Project, 'name' | 'owner' | 'status'>;

interface NewProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProjectInput) => void;
}

const STATUSES: Project['status'][] = ['Active', 'Review', 'Paused', 'Shipped'];

/**
 * Proper "New project" window with a small validated form.
 */
export function NewProjectDialog({ open, onClose, onCreate }: NewProjectDialogProps) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('Maya Chen');
  const [status, setStatus] = useState<Project['status']>('Active');
  const [error, setError] = useState('');

  // Reset form every time the window opens
  useEffect(() => {
    if (open) {
      setName('');
      setOwner('Maya Chen');
      setStatus('Active');
      setError('');
    }
  }, [open ]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your project a name to continue.');
      return;
    }
    onCreate({ name: trimmed, owner: owner.trim() || 'Unassigned', status });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      subtitle="Start tracking progress, ownership and review status."
      footer={
        <>
          <PrimaryButton type="button" variant="secondary" onClick={onClose}>
            Cancel
          </PrimaryButton>
          <PrimaryButton type="submit" form="new-project-form" disabled={!name.trim()}>
            Create project
          </PrimaryButton>
        </>
      }
    >
      <form id="new-project-form" onSubmit={submit} className="flex flex-col gap-3.5" noValidate>
        <div>
          <label htmlFor="np-name" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">
            Project name <span aria-hidden className="text-red-500">*</span>
          </label>
          <input
            id="np-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Aurora design system"
            autoFocus
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'np-name-error' : undefined}
            className="h-9 w-full rounded-[10px] border border-black/[0.08] bg-white/80 px-3 text-[13.5px] shadow-sm transition-all duration-200 outline-none placeholder:text-neutral-400 hover:border-black/[0.12] focus:border-[#0071e3]/60 focus:ring-[3px] focus:ring-[#0071e3]/20"
          />
          {error && (
            <p id="np-name-error" role="alert" className="mt-1.5 text-[12px] font-medium text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="np-owner" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">
              Owner
            </label>
            <input
              id="np-owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="Owner name"
              className="h-9 w-full rounded-[10px] border border-black/[0.08] bg-white/80 px-3 text-[13.5px] shadow-sm transition-all duration-200 outline-none placeholder:text-neutral-400 hover:border-black/[0.12] focus:border-[#0071e3]/60 focus:ring-[3px] focus:ring-[#0071e3]/20"
            />
          </div>
          <div>
            <label htmlFor="np-status" className="mb-1.5 block text-[12.5px] font-medium text-neutral-700">
              Status
            </label>
            <select
              id="np-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Project['status'])}
              className="h-9 w-full cursor-pointer rounded-[10px] border border-black/[0.08] bg-white/80 px-2.5 text-[13.5px] text-neutral-800 shadow-sm transition-all duration-200 outline-none hover:border-black/[0.12] focus:border-[#0071e3]/60 focus:ring-[3px] focus:ring-[#0071e3]/20"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="rounded-[10px] border border-black/[0.06] bg-black/[0.03] px-3 py-2.5 text-[12px] leading-relaxed text-neutral-500">
          The project appears at the top of your list with 0% progress. You can edit details later.
        </p>
      </form>
    </Modal>
  );
}
