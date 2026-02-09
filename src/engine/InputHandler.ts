export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  payload: unknown;
}

export interface DropTarget {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  accepts: (payload: unknown) => boolean;
}

export class InputHandler {
  private dragState: DragState | null = null;
  private dropTargets: Map<string, DropTarget> = new Map();
  private onDragStart?: (state: DragState) => void;
  private onDragMove?: (state: DragState) => void;
  private onDrop?: (target: DropTarget, payload: unknown) => void;
  private onDragCancel?: (payload: unknown) => void;
  private onClick?: (x: number, y: number) => void;
  private onHover?: (x: number, y: number) => void;

  setHandlers(handlers: {
    onDragStart?: (state: DragState) => void;
    onDragMove?: (state: DragState) => void;
    onDrop?: (target: DropTarget, payload: unknown) => void;
    onDragCancel?: (payload: unknown) => void;
    onClick?: (x: number, y: number) => void;
    onHover?: (x: number, y: number) => void;
  }): void {
    this.onDragStart = handlers.onDragStart;
    this.onDragMove = handlers.onDragMove;
    this.onDrop = handlers.onDrop;
    this.onDragCancel = handlers.onDragCancel;
    this.onClick = handlers.onClick;
    this.onHover = handlers.onHover;
  }

  registerDropTarget(target: DropTarget): void {
    this.dropTargets.set(target.id, target);
  }

  removeDropTarget(id: string): void {
    this.dropTargets.delete(id);
  }

  startDrag(x: number, y: number, payload: unknown): void {
    this.dragState = {
      isDragging: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      payload,
    };
    this.onDragStart?.(this.dragState);
  }

  moveDrag(x: number, y: number): void {
    if (!this.dragState) return;
    this.dragState.currentX = x;
    this.dragState.currentY = y;
    this.onDragMove?.(this.dragState);
  }

  endDrag(x: number, y: number): void {
    if (!this.dragState) return;

    const target = this.findDropTarget(x, y, this.dragState.payload);
    if (target) {
      this.onDrop?.(target, this.dragState.payload);
    } else {
      this.onDragCancel?.(this.dragState.payload);
    }

    this.dragState = null;
  }

  handleClick(x: number, y: number): void {
    this.onClick?.(x, y);
  }

  handleHover(x: number, y: number): void {
    this.onHover?.(x, y);
  }

  private findDropTarget(x: number, y: number, payload: unknown): DropTarget | null {
    for (const target of this.dropTargets.values()) {
      if (
        x >= target.x &&
        x <= target.x + target.width &&
        y >= target.y &&
        y <= target.y + target.height &&
        target.accepts(payload)
      ) {
        return target;
      }
    }
    return null;
  }

  getDragState(): DragState | null {
    return this.dragState;
  }
}
