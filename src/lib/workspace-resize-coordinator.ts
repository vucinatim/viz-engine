type ResizeCommit = () => void;

let dragging = false;
const pendingCommits = new Set<ResizeCommit>();

export const workspaceResizeCoordinator = {
  setDragging(nextDragging: boolean) {
    if (dragging === nextDragging) {
      return;
    }
    dragging = nextDragging;
    if (!dragging) {
      const commits = [...pendingCommits];
      pendingCommits.clear();
      commits.forEach((commit) => commit());
    }
  },
  schedule(commit: ResizeCommit) {
    if (dragging) {
      pendingCommits.add(commit);
    } else {
      commit();
    }
  },
  cancel(commit: ResizeCommit) {
    pendingCommits.delete(commit);
  },
};
