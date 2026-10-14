export interface HistoryEntry {
  text: string;
  timestamp: number;
  label: string;
}

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024; // 2MB limit per snapshot to prevent browser RAM bloat

export class UndoRedoStack {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxDepth: number;

  constructor(maxDepth = 25) {
    this.maxDepth = maxDepth;
  }

  /**
   * Records a snapshot before a mutation occurs.
   * Skips payloads > 2MB to preserve browser memory.
   */
  public pushSnapshot(currentText: string, actionLabel: string): void {
    if (!currentText && this.undoStack.length === 0) return;
    
    // Skip if single payload exceeds 2MB
    if (currentText.length > MAX_SNAPSHOT_BYTES) {
      return;
    }

    // Avoid duplicate adjacent states
    const last = this.undoStack[this.undoStack.length - 1];
    if (last && last.text === currentText) return;

    this.undoStack.push({
      text: currentText,
      timestamp: Date.now(),
      label: actionLabel,
    });

    if (this.undoStack.length > this.maxDepth) {
      this.undoStack.shift();
    }

    // Pushing a new branch clears redo
    this.redoStack = [];
  }

  /**
   * Reverts to the most recent snapshot.
   */
  public undo(currentText: string): { restoredText: string; label: string } | null {
    if (this.undoStack.length === 0) return null;

    const previous = this.undoStack.pop()!;
    if (currentText.length <= MAX_SNAPSHOT_BYTES) {
      this.redoStack.push({
        text: currentText,
        timestamp: Date.now(),
        label: previous.label,
      });
    }

    return {
      restoredText: previous.text,
      label: previous.label,
    };
  }

  /**
   * Redoes the last undone mutation.
   */
  public redo(currentText: string): { restoredText: string; label: string } | null {
    if (this.redoStack.length === 0) return null;

    const next = this.redoStack.pop()!;
    if (currentText.length <= MAX_SNAPSHOT_BYTES) {
      this.undoStack.push({
        text: currentText,
        timestamp: Date.now(),
        label: next.label,
      });
    }

    return {
      restoredText: next.text,
      label: next.label,
    };
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public peekUndoLabel(): string | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1].label : null;
  }

  public peekRedoLabel(): string | null {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1].label : null;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
