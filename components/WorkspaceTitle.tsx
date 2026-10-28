'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore, selectWorkspaceName } from '@/store/useAppStore';
import { WORKSPACE_NAME_MAX } from '@/lib/workspaceName';

// Sidebar header: "Workspace", with the user's workspace name (click to rename) underneath.
export default function WorkspaceTitle() {
  const name             = useAppStore(selectWorkspaceName);
  const user             = useAppStore(s => s.user);
  const setWorkspaceName = useAppStore(s => s.setWorkspaceName);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the browser tab in step with the name
  useEffect(() => { document.title = name; }, [name]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function start() {
    setDraft(name);
    setEditing(true);
  }

  function commit() {
    // Blank resets to the default name
    if (draft.trim() !== name) setWorkspaceName(draft);
    setEditing(false);
  }

  const nameStyle: React.CSSProperties = {
    fontSize: 12, color: 'var(--sidebar-text)', lineHeight: 1.4,
  };

  return (
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400,
        color: 'var(--text)', letterSpacing: '-0.01em', lineHeight: 1.2,
      }}>
        Workspace
      </div>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={WORKSPACE_NAME_MAX}
          aria-label="Workspace name"
          placeholder="Leave blank for the default"
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') setEditing(false);
          }}
          style={{ ...nameStyle, width: '100%', padding: '2px 6px', margin: '0 -7px', marginTop: 1 }}
        />
      ) : user && (
        <button
          type="button"
          onClick={start}
          title="Rename workspace"
          className="workspace-title"
          style={{
            font: 'inherit', ...nameStyle, display: 'block', maxWidth: '100%', padding: 0, marginTop: 2,
            background: 'none', border: 'none', cursor: 'text', textAlign: 'left',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}
        >
          {name}
        </button>
      )}
    </div>
  );
}
