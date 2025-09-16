import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StoryCard } from '@/components/story/StoryCard';
import { Story } from '@/types';

interface DraggableStoryCardProps {
  story: Story;
  onEdit?: (story: Story) => void;
}

export function DraggableStoryCard({ story, onEdit }: DraggableStoryCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: story.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="relative"
    >
      <StoryCard 
        story={story} 
        onEdit={onEdit}
        dragListeners={listeners}
      />
    </div>
  );
}
