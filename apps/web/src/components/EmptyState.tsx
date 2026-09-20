interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel = '+ Regeling',
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-8 text-center">
      <p className="font-medium text-gray-800">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-touch mt-4 bg-blue-600 text-white hover:bg-blue-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
