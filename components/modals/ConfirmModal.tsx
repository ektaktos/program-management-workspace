interface ConfirmModalProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-panel" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-title">Confirm Delete</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{message}</p>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}
