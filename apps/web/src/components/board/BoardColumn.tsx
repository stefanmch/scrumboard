import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Column, Story } from '@/types';
import { DraggableStoryCard } from './DraggableStoryCard';
import { Plus } from 'lucide-react';

interface BoardColumnProps {
  column: Column;
  onAddStory?: () => void;
  onEditStory?: (story: Story) => void;
}

export function BoardColumn({ column, onAddStory, onEditStory }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const getColumnStyle = (status: string) => {
    const baseStyle = {
      transition: 'all 0.2s ease',
    };

    const colorStyle = (() => {
      switch (status) {
        case 'todo':
          return {
            backgroundColor: '#dbeafe', // blue-100
            borderColor: '#93c5fd', // blue-300
          };
        case 'in-progress':
          return {
            backgroundColor: '#fffbeb', // amber-50
            borderColor: '#fde68a', // amber-200
          };
        case 'done':
          return {
            backgroundColor: '#ecfdf5', // emerald-50
            borderColor: '#a7f3d0', // emerald-200
          };
        default:
          return {
            backgroundColor: '#f9fafb',
            borderColor: '#e5e7eb',
          };
      }
    })();

    // Add visual feedback when hovering during drag
    if (isOver) {
      return {
        ...baseStyle,
        ...colorStyle,
        transform: 'scale(1.02)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      };
    }

    return {
      ...baseStyle,
      ...colorStyle,
    };
  };

  const getHeaderStyle = (status: string) => {
    switch (status) {
      case 'todo':
        return { color: '#1d4ed8' }; // blue-700
      case 'in-progress':
        return { color: '#a16207' }; // amber-700
      case 'done':
        return { color: '#047857' }; // emerald-700
      default:
        return { color: '#374151' };
    }
  };

  const getBadgeStyle = (status: string) => {
    switch (status) {
      case 'todo':
        return {
          backgroundColor: '#bfdbfe', // blue-200
          color: '#1e3a8a', // blue-800
        };
      case 'in-progress':
        return {
          backgroundColor: '#fef3c7', // amber-100
          color: '#92400e', // amber-800
        };
      case 'done':
        return {
          backgroundColor: '#d1fae5', // emerald-100
          color: '#065f46', // emerald-800
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
        };
    }
  };

  return (
    <div 
      ref={setNodeRef}
      className="rounded-xl p-6 w-80 flex-shrink-0 border-2 shadow-lg"
      style={getColumnStyle(column.status)}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <h2 
            className="font-bold text-lg"
            style={getHeaderStyle(column.status)}
          >
            {column.title}
          </h2>
          <span 
            className="ml-3 text-sm px-3 py-1 rounded-full font-medium"
            style={getBadgeStyle(column.status)}
          >
            {column.stories.length}
          </span>
        </div>
        <button
          onClick={onAddStory}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white hover:bg-opacity-50 rounded-lg transition-all duration-200 flex items-center justify-center"
          title="Add new story"
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
            />
          ))}
          
          {/* Drop Zone Indicator */}
          {isOver && column.stories.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center text-gray-500">
              Drop story here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
