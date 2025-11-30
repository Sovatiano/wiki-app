import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGetPageQuery, useGetPageHistoryQuery, useRestoreVersionMutation } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';
import './PageHistory.css';

interface PageVersion {
  id: number;
  title: string;
  text: string;
  version_comment?: string;
  created_at: string;
  author: {
    username: string;
  };
}

// Simple diff function to highlight changes
const getDiff = (oldText: string, newText: string): { type: 'added' | 'removed' | 'unchanged', text: string }[] => {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: { type: 'added' | 'removed' | 'unchanged', text: string }[] = [];
  
  // Simple line-by-line comparison
  const maxLines = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || '';
    const newLine = newLines[i] || '';
    
    if (oldLine === newLine) {
      result.push({ type: 'unchanged', text: oldLine });
    } else {
      if (oldLine) {
        result.push({ type: 'removed', text: oldLine });
      }
      if (newLine) {
        result.push({ type: 'added', text: newLine });
      }
    }
  }
  
  return result;
};

const PageHistory: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const pageIdNum = pageId ? parseInt(pageId) : undefined;

  const { data: page } = useGetPageQuery(pageIdNum!, { skip: !pageIdNum });
  const { data: versions, isLoading, error: queryError } = useGetPageHistoryQuery(pageIdNum!, {
    skip: !pageIdNum,
  });
  const [restoreVersion, { isLoading: isRestoring }] = useRestoreVersionMutation();

  const [selectedVersion, setSelectedVersion] = useState<PageVersion | null>(null);
  const [compareVersion, setCompareVersion] = useState<PageVersion | null>(null);
  const [error, setError] = useState('');

  const handleRestore = async (versionId: number) => {
    if (!window.confirm('Are you sure you want to restore this version?')) {
      return;
    }

    if (!pageIdNum) return;

    try {
      await restoreVersion({ pageId: pageIdNum, versionId }).unwrap();
      navigate(`/page/${pageId}`);
    } catch (err: any) {
      setError(err.data?.detail || 'Failed to restore version');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getChangesSummary = (version: PageVersion, previousVersion?: PageVersion) => {
    const currentText = version.text || '';
    const previousText = previousVersion?.text || '';
    
    if (!previousVersion) {
      return { added: currentText.length, removed: 0, changed: false };
    }
    
    const diff = getDiff(previousText, currentText);
    const added = diff.filter(d => d.type === 'added').length;
    const removed = diff.filter(d => d.type === 'removed').length;
    
    return {
      added,
      removed,
      changed: added > 0 || removed > 0,
      titleChanged: previousVersion.title !== version.title
    };
  };

  if (isLoading) {
    return <div className="loading"><Spinner size="large" />Loading history...</div>;
  }

  if (queryError || error) {
    return <div className="error">{error || 'Failed to load page history'}</div>;
  }

  // Show message if no history
  if (!versions || versions.length === 0) {
    return (
      <div className="page-history">
        <div className="history-header">
          <h1>Page History</h1>
          <Button variant="secondary" onClick={() => navigate(`/page/${pageId}`)}>
            Back to Page
          </Button>
        </div>
        <div className="no-history">
          <div className="no-history-icon">📝</div>
          <h2>No History Available</h2>
          <p>This page hasn't been edited yet. Once you make changes to the page, they will appear here.</p>
          <p className="no-history-hint">Each time you save changes, a new version is created automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-history">
      <div className="history-header">
        <h1>Page History</h1>
        <Button variant="secondary" onClick={() => navigate(`/page/${pageId}`)}>
          Back to Page
        </Button>
      </div>

      <div className="versions-list">
        {versions.map((version, index) => {
          const previousVersion = index < versions.length - 1 ? versions[index + 1] : undefined;
          const changes = getChangesSummary(version, previousVersion);
          const isCurrent = index === 0 && page && version.text === page.content;
          
          return (
            <div key={version.id} className={`version-item ${isCurrent ? 'current' : ''}`}>
              {isCurrent && <div className="current-badge">Current Version</div>}
              <div className="version-header">
                <div className="version-title-section">
                  <h3>{version.title}</h3>
                  {changes.titleChanged && previousVersion && (
                    <span className="change-indicator title-changed">Title changed</span>
                  )}
                </div>
                <div className="version-actions">
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setSelectedVersion(version);
                      setCompareVersion(previousVersion || null);
                    }}
                  >
                    View
                  </Button>
                  {previousVersion && (
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        setSelectedVersion(version);
                        setCompareVersion(previousVersion);
                      }}
                    >
                      Compare
                    </Button>
                  )}
                  {user && (user.role === 'admin' || user.id === version.author?.id) && (
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => handleRestore(version.id)}
                      disabled={isRestoring}
                    >
                      {isRestoring ? <Spinner size="small" /> : 'Restore'}
                    </Button>
                  )}
                </div>
              </div>
              <div className="version-meta">
                <span>By {version.author.username}</span>
                <span>{formatDate(version.created_at)}</span>
                {version.version_comment && (
                  <span className="version-comment">💬 {version.version_comment}</span>
                )}
              </div>
              {changes.changed && previousVersion && (
                <div className="changes-summary">
                  <span className="change-stat added">+{changes.added} lines added</span>
                  <span className="change-stat removed">-{changes.removed} lines removed</span>
                </div>
              )}
              {!previousVersion && (
                <div className="changes-summary">
                  <span className="change-stat created">Initial version</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={!!selectedVersion}
        onClose={() => {
          setSelectedVersion(null);
          setCompareVersion(null);
        }}
        title={compareVersion ? `Comparing Versions` : selectedVersion?.title}
        size="large"
      >
        {selectedVersion && (
          <div className="version-preview">
            <div className="preview-meta">
              <p><strong>Author:</strong> {selectedVersion.author.username}</p>
              <p><strong>Date:</strong> {formatDate(selectedVersion.created_at)}</p>
              {selectedVersion.version_comment && (
                <p><strong>Comment:</strong> {selectedVersion.version_comment}</p>
              )}
              {compareVersion && (
                <>
                  <div className="compare-divider"></div>
                  <p><strong>Comparing with:</strong> {compareVersion.title}</p>
                  <p><strong>Previous Date:</strong> {formatDate(compareVersion.created_at)}</p>
                </>
              )}
            </div>
            {compareVersion ? (
              <div className="diff-view">
                <div className="diff-content">
                  {getDiff(compareVersion.text, selectedVersion.text).map((line, idx) => (
                    <div key={idx} className={`diff-line ${line.type}`}>
                      {line.type === 'removed' && <span className="diff-marker">-</span>}
                      {line.type === 'added' && <span className="diff-marker">+</span>}
                      {line.type === 'unchanged' && <span className="diff-marker"> </span>}
                      <span className="diff-text">{line.text || '\u00A0'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="preview-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedVersion.text}
                </ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PageHistory;