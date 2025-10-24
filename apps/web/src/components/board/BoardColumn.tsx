import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Story } from '@/types';
import { DraggableStoryCard } from './DraggableStoryCard';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  onAddStory?: () => void;
  onEditStory?: (story: Story) => void;
  onDeleteStory?: (story: Story) => void;
}

export function BoardColumn({ column, onAddStory, onEditStory, onDeleteStory }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const getColumnClasses = (status: string) => {
    const baseClasses = "rounded-xl p-6 w-80 flex-shrink-0 border-2 shadow-lg transition-all duration-200";

    let statusClasses = "";
    switch (status) {
      case 'todo':
        statusClasses = "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800";
        break;
      case 'in-progress':
        statusClasses = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
        break;
      case 'done':
        statusClasses = "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
        break;
      default:
        statusClasses = "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700";
    }

    const hoverClasses = isOver ? "scale-105 shadow-2xl" : "";

    return `${baseClasses} ${statusClasses} ${hoverClasses}`;
  };

  const getHeaderClasses = (status: string) => {
    const baseClasses = "font-bold text-lg";

    switch (status) {
      case 'todo':
        return `${baseClasses} text-blue-700 dark:text-blue-400`;
      case 'in-progress':
        return `${baseClasses} text-amber-700 dark:text-amber-400`;
      case 'done':
        return `${baseClasses} text-emerald-700 dark:text-emerald-400`;
      default:
        return `${baseClasses} text-gray-700 dark:text-gray-300`;
    }
  };

  const getBadgeClasses = (status: string) => {
    const baseClasses = "ml-3 text-sm px-3 py-1 rounded-full font-medium";

    switch (status) {
      case 'todo':
        return `${baseClasses} bg-blue-200 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200`;
      case 'in-progress':
        return `${baseClasses} bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200`;
      case 'done':
        return `${baseClasses} bg-emerald-100 dark:bg-emerald-800/50 text-emerald-800 dark:text-emerald-200`;
      default:
        return `${baseClasses} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300`;
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={getColumnClasses(column.status)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 className={getHeaderClasses(column.status)}>
            {column.title}
          </h2>
          <span className={getBadgeClasses(column.status)}>
            {column.stories.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddStory}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-700/50 rounded-lg transition-all duration-200 flex items-center justify-center"
          title="Add new story"
          data-testid={`add-story-button-${column.id}`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Stories with Drag and Drop */}
      <SortableContext items={column.stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-4 min-h-[300px]">
          {column.stories.map((story) => (
            <DraggableStoryCard
              key={story.id}
              story={story}
              onEdit={onEditStory}
              onDelete={onDeleteStory}
            />
          ))}

          {/* Drop Zone Indicator */}
          {isOver && column.stories.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
              Drop story here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
