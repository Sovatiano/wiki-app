import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useGetPageQuery, useGetPagesQuery, useCreatePageMutation, useUpdatePageMutation } from '../../services/api';
import { RootState } from '../../app/store';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import './PageEditor.css';

// Helper function to flatten tree structure for dropdown
const flattenPages = (pages: any[], result: any[] = [], level = 0): any[] => {
  pages.forEach((page) => {
    result.push({
      ...page,
      displayTitle: '  '.repeat(level) + page.title,
      level,
    });
    if (page.children && page.children.length > 0) {
      flattenPages(page.children, result, level + 1);
    }
  });
  return result;
};

const PageEditor: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = useSelector((state: RootState) => state.auth.user);
  const pageIdNum = pageId ? parseInt(pageId) : undefined;
  const parentIdFromUrl = searchParams.get('parent');
  const parentIdNum = parentIdFromUrl ? parseInt(parentIdFromUrl) : null;

  const { data: page, isLoading } = useGetPageQuery(pageIdNum!, { skip: !pageIdNum });
  const { data: pagesTree } = useGetPagesQuery();
  const [createPage, { isLoading: isCreating }] = useCreatePageMutation();
  const [updatePage, { isLoading: isUpdating }] = useUpdatePageMutation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [parentId, setParentId] = useState<number | null>(parentIdNum);
  const [versionComment, setVersionComment] = useState('');
  const [error, setError] = useState('');

  const isEditMode = !!pageId;
  const saving = isCreating || isUpdating;

  // Get flattened pages list for parent selector
  const flatPages = pagesTree ? flattenPages(pagesTree) : [];

  useEffect(() => {
    if (page && isEditMode) {
      setTitle(page.title);
      setContent(page.content || '');
      setIsPublic(page.is_public);
      setParentId(page.parent_id);
    }
  }, [page, isEditMode]);

  useEffect(() => {
    if (parentIdFromUrl) {
      setParentId(parseInt(parentIdFromUrl));
    }
  }, [parentIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isEditMode && pageIdNum) {
        await updatePage({
          id: pageIdNum,
          title,
          content,
          version_comment: versionComment || undefined,
        }).unwrap();
        navigate(`/page/${pageId}`);
      } else {
        const result = await createPage({
          title,
          content,
          parent_id: parentId,
          is_public: isPublic,
        }).unwrap();
        navigate(`/page/${result.id}`);
      }
    } catch (err: any) {
      setError(err.data?.detail || err.message || 'Failed to save page');
    }
  };

  const handleCancel = () => {
    navigate(isEditMode ? `/page/${pageId}` : '/');
  };

  if (isLoading && isEditMode) {
    return <div className="loading"><Spinner size="large" />Loading page...</div>;
  }

  if (isEditMode && page && page.author.id !== user?.id && user?.role !== 'admin') {
    return <div className="error">You don't have permission to edit this page</div>;
  }

  return (
    <div className="page-editor">
      <div className="editor-header">
        <h1>{isEditMode ? 'Edit Page' : 'Create New Page'}</h1>
        <div className="editor-actions">
          <Button variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving || !title.trim()}
          >
            {saving ? <Spinner size="small" /> : (isEditMode ? 'Save Changes' : 'Create Page')}
          </Button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="editor-form">
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter page title..."
            required
          />
        </div>

        {!isEditMode && (
          <>
            <div className="form-group">
              <label htmlFor="parent_id">Parent Page (optional)</label>
              <select
                id="parent_id"
                value={parentId || ''}
                onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">None (Top-level page)</option>
                {flatPages
                  .filter((p) => !pageIdNum || p.id !== pageIdNum) // Don't allow selecting self as parent
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayTitle}
                    </option>
                  ))}
              </select>
              <small className="form-hint">
                Select a parent page to create a hierarchical structure. Leave empty for a top-level page.
              </small>
            </div>
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                />
                <span>Make this page public</span>
              </label>
            </div>
          </>
        )}

        {isEditMode && (
          <div className="form-group">
            <label htmlFor="version_comment">Version Comment (optional)</label>
            <input
              id="version_comment"
              type="text"
              value={versionComment}
              onChange={(e) => setVersionComment(e.target.value)}
              placeholder="Describe what changed..."
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your content here... (Markdown supported)"
            rows={20}
            required
          />
        </div>
      </form>
    </div>
  );
};

export default PageEditor;