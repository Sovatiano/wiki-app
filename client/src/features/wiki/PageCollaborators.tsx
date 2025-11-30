import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useGetPageQuery, useGetCollaboratorsQuery, useAddCollaboratorMutation } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import { api as axiosApi } from '../../utils/api';
import './PageCollaborators.css';

interface Collaborator {
  id: number;
  user_id: number;
  access_level: 'read' | 'write';
  user: {
    id: number;
    username: string;
    email: string;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
}

const PageCollaborators: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const user = useSelector((state: RootState) => state.auth.user);
  const pageIdNum = pageId ? parseInt(pageId) : undefined;

  const { data: page } = useGetPageQuery(pageIdNum!, { skip: !pageIdNum });
  const { data: collaborators, isLoading } = useGetCollaboratorsQuery(pageIdNum!, {
    skip: !pageIdNum,
  });
  const [addCollaborator, { isLoading: isAdding }] = useAddCollaboratorMutation();

  const [users, setUsers] = useState<User[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [accessLevel, setAccessLevel] = useState<'read' | 'write'>('read');
  const [error, setError] = useState('');

  const canManageCollaborators = user && page &&
    (user.role === 'admin' || user.id === page.author.id);

  React.useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Use the public list endpoint that works for all authenticated users
        const response = await axiosApi.get('/users/list');
        setUsers(response.data);
      } catch (err) {
        console.error('Failed to fetch users');
        setError('Failed to load user list');
      }
    };
    if (user && canManageCollaborators) {
      fetchUsers();
    }
  }, [user, canManageCollaborators]);

  const handleAddCollaborator = async () => {
    if (!selectedUserId || !pageIdNum) return;

    try {
      await addCollaborator({
        pageId: pageIdNum,
        user_id: parseInt(selectedUserId),
        access_level: accessLevel,
      }).unwrap();
      setShowAddModal(false);
      setSelectedUserId('');
      setAccessLevel('read');
      setError('');
    } catch (err: any) {
      setError(err.data?.detail || 'Failed to add collaborator');
    }
  };

  if (!canManageCollaborators) {
    return <div className="error">You don't have permission to manage collaborators</div>;
  }

  if (isLoading) {
    return <div className="loading"><Spinner size="large" />Loading collaborators...</div>;
  }

  return (
    <div className="page-collaborators">
      <div className="collaborators-header">
        <h1>Manage Collaborators</h1>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          Add Collaborator
        </Button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="collaborators-list">
        {page && (
          <div className="collaborator-item owner">
            <div className="collaborator-info">
              <strong>{page.author?.username}</strong>
              <span>Owner</span>
            </div>
            <div className="collaborator-role">
              <span className="role-badge owner">Owner</span>
            </div>
          </div>
        )}

        {collaborators && collaborators.map((collaborator) => (
          <div key={collaborator.id} className="collaborator-item">
            <div className="collaborator-info">
              <strong>{collaborator.user.username}</strong>
              <span>{collaborator.user.email}</span>
            </div>
            <div className="collaborator-actions">
              <span className={`role-badge ${collaborator.access_level}`}>
                {collaborator.access_level}
              </span>
            </div>
          </div>
        ))}

        {collaborators.length === 0 && (
          <div className="no-collaborators">
            No collaborators added yet
          </div>
        )}
      </div>

      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Collaborator"
      >
        <div className="add-collaborator-form">
          <div className="form-group">
            <label>User</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">Select a user</option>
              {users
                .filter(u => u.id !== user?.id && u.id !== page?.author.id)
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.username} ({u.email})
                  </option>
                ))
              }
            </select>
          </div>

          <div className="form-group">
            <label>Access Level</label>
            <div className="radio-group">
              <label>
                <input
                  type="radio"
                  value="read"
                  checked={accessLevel === 'read'}
                  onChange={(e) => setAccessLevel(e.target.value as 'read')}
                />
                Read
              </label>
              <label>
                <input
                  type="radio"
                  value="write"
                  checked={accessLevel === 'write'}
                  onChange={(e) => setAccessLevel(e.target.value as 'write')}
                />
                Write
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddCollaborator}
              disabled={!selectedUserId || isAdding}
            >
              {isAdding ? <Spinner size="small" /> : 'Add Collaborator'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PageCollaborators;