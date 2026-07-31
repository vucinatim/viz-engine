import { workspaceResizeCoordinator } from '@/lib/workspace-resize-coordinator';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('workspace resize coordinator', () => {
  afterEach(() => {
    workspaceResizeCoordinator.setDragging(false);
  });

  it('runs ordinary resize work immediately', () => {
    const commit = vi.fn();

    workspaceResizeCoordinator.schedule(commit);

    expect(commit).toHaveBeenCalledOnce();
  });

  it('coalesces each expensive resize consumer until drag release', () => {
    const first = vi.fn();
    const second = vi.fn();
    workspaceResizeCoordinator.setDragging(true);

    workspaceResizeCoordinator.schedule(first);
    workspaceResizeCoordinator.schedule(first);
    workspaceResizeCoordinator.schedule(second);
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();

    workspaceResizeCoordinator.setDragging(false);
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('does not flush a consumer that unmounted during the drag', () => {
    const commit = vi.fn();
    workspaceResizeCoordinator.setDragging(true);
    workspaceResizeCoordinator.schedule(commit);

    workspaceResizeCoordinator.cancel(commit);
    workspaceResizeCoordinator.setDragging(false);

    expect(commit).not.toHaveBeenCalled();
  });
});
