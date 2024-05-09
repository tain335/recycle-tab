import React from 'react';
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";

interface SortableListProps<T, S extends keyof T> {
  style?: React.CSSProperties;
  recordKey: T[S] extends string | number ? S : never,
  value: T[];
  onChange?: (value: T[]) => void
  render: (data: T) => React.ReactNode
  isDragDisabled?: boolean
}

export function SortableList<T, S extends keyof T>({ style, recordKey, value, onChange, render, isDragDisabled }: SortableListProps<T, S>) {
  const recorder = (list: T[], startIndex: number, endIndex: number) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);

    return result;
  };
  return < DragDropContext onDragEnd={(result) => {
    if (!result.destination) {
      return
    }
    const items = recorder(value.slice(0), result.source.index, result.destination.index);
    onChange?.(items);
  }}>
    <Droppable droppableId='droppable'>
      {(provided, snapshot) => {
        return <div
          {...provided.droppableProps}
          ref={provided.innerRef}
          style={{
            ...style
          }}
        >
          {value.map((v, index) => <Draggable
            isDragDisabled={isDragDisabled}
            key={v[recordKey] as string}
            draggableId={String(v[recordKey]) as string}
            index={index}>
            {(provided, snapshot) => <div
              ref={provided.innerRef}
              {...provided.draggableProps}
              {...provided.dragHandleProps}>
              {render(v)}
            </div>}
          </Draggable>
          )}
          {provided.placeholder}
        </div>
      }}
    </Droppable>
  </DragDropContext >
}