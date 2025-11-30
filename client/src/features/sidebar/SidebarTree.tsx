import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchPages, setActivePage } from '../wiki/pagesSlice';
import { RootState, AppDispatch } from '../../app/store';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { api } from '../../utils/api';
import './SidebarTree.css';

interface TreeNode {
  id: string;
  title: string;
  children?: TreeNode[];
  is_public: boolean;
}

const SidebarTree: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { pages, loading } = useSelector((state: RootState) => state.pages);
  const user = useSelector((state: RootState) => state.auth.user);

  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    dispatch(fetchPages());
  }, [dispatch]);

  useEffect(() => {
    buildTree();
  }, [pages]);

  const buildTree = async () => {
    try {
      const response = await api.get('/pages/tree');
      setTreeData(response.data);
    } catch (err) {
      // Fallback to building tree from flat list
      const tree = buildTreeFromFlat(pages);
      setTreeData(tree);
    }
  };

  const buildTreeFromFlat = (flatPages: any[]): TreeNode[] => {
    const map = new Map();
    const roots: TreeNode[] = [];

    flatPages.forEach(page => {
      map.set(page.id, { ...page, children: [] });
    });

    flatPages.forEach(page => {
      if (page.parent_id && map.has(page.parent_id)) {
        map.get(page.parent_id).children.push(map.get(page.id));
      } else {
        roots.push(map.get(page.id));
      }
    });

    return roots;
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleNodeClick = (node: TreeNode) => {
    dispatch(setActivePage(node));
    navigate(`/page/${node.id}`);
  };

  const handleCreatePage = () => {
    navigate('/page/new');
  };

  const filterTree = (nodes: TreeNode[], search: string): TreeNode[] => {
    if (!search) return nodes;

    return nodes
      .map(node => {
        const matches = node.title.toLowerCase().includes(search.toLowerCase());
        const children = node.children ? filterTree(node.children, search) : [];

        if (matches || children.length > 0) {
          return { ...node, children };
        }
        return null;
      })
      .filter((node): node is TreeNode => node !== null);
  };

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const canView = node.is_public || user;

    if (!canView) return null;

    return (
      <div key={node.id} className="tree-node">
        <div
          className="node-content"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {hasChildren && (
            <button
              className={`expand-toggle ${isExpanded ? 'expanded' : ''}`}
              onClick={() => toggleNode(node.id)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren && <span className="expand-spacer"></span>}

          <span
            className="node-title"
            onClick={() => handleNodeClick(node)}
            title={node.title}
          >
            {node.title}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div className="children">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const filteredTree = filterTree(treeData, searchTerm);

  return (
    <div className="sidebar-tree">
      <div className="sidebar-header">
        <h3>Pages</h3>
        {user && (
          <Button variant="primary" size="small" onClick={handleCreatePage}>
            New Page
          </Button>
        )}
      </div>

      <div className="search-box">
        <input
          type="text"
          placeholder="Search pages..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="tree-container">
        {loading ? (
          <div className="loading"><Spinner size="small" />Loading pages...</div>
        ) : filteredTree.length === 0 ? (
          <div className="no-pages">
            {searchTerm ? 'No pages found' : 'No pages available'}
          </div>
        ) : (
          filteredTree.map(node => renderNode(node))
        )}
      </div>
    </div>
  );
};

export default SidebarTree;