import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { AttributeGroup, Attribute } from '../../types/email';
import './AttributePanel.css';

interface Props {
  groups: AttributeGroup[];
  onNew?: (type: 'task' | 'project') => void;
  onItemClick?: (attribute: Attribute) => void;
  onFilter?: (attribute: Attribute) => void;
  activeFilterId?: string;
}

function DraggableAttribute({ attribute, onClick, onFilter, isFiltered }: {
  attribute: Attribute;
  onClick?: (a: Attribute) => void;
  onFilter?: (a: Attribute) => void;
  isFiltered?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: attribute.id,
    data: attribute,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    borderLeftColor: attribute.color,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className={`attribute-item ${isFiltered ? 'attribute-item--filtered' : ''}`}
      style={style}
      {...listeners}
      {...attributes}
    >
      <div
        className="attribute-item-content"
        onClick={onFilter ? (e) => { e.stopPropagation(); onFilter(attribute); } : undefined}
        style={onFilter ? { cursor: 'pointer' } : undefined}
      >
        <span className="attribute-item-label">{attribute.label}</span>
        {attribute.subLabel && (
          <span className="attribute-item-sublabel">{attribute.subLabel}</span>
        )}
      </div>
      {onClick && (
        <button
          className="attribute-item-open-btn"
          onClick={() => onClick(attribute)}
          title="Details anzeigen"
        >↗</button>
      )}
    </div>
  );
}

export function AttributePanel({ groups, onNew, onItemClick, onFilter, activeFilterId }: Props) {
  return (
    <div className="attribute-panel">
      {groups.map(group => (
        <div key={group.id} className="attribute-group">
          <div className="attribute-group-header">
            <span className="attribute-group-icon">{group.icon}</span>
            <span className="attribute-group-title">{group.title}</span>
            {group.createType && onNew && (
              <button
                className="attribute-new-btn"
                onClick={() => onNew(group.createType!)}
                title={group.createType === 'task' ? 'Neuer Task' : 'Neues Projekt'}
              >
                +
              </button>
            )}
          </div>
          <div className="attribute-items">
            {group.items.map(item => (
              <DraggableAttribute
                key={item.id}
                attribute={item}
                onClick={onItemClick}
                onFilter={onFilter}
                isFiltered={activeFilterId === item.id}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
