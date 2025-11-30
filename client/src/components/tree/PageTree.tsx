import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setActivePage } from '../../features/wiki/pagesSlice';
import { useNavigate } from 'react-router-dom';
import './PageTree.css';

interface TreeNode {
  id: string;
  title: string;
  children?: TreeNode[];
  is_public: boolean;
}

const PageTree: React.FC<{ nodes: TreeNode[] }> = ({ nodes }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const activePageId = useSelector((state: any) => state.pages.activePage?.id);

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

  const renderNode = (node: TreeNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const isLeaf = !node.children || node.children.length === 0;
    const isActive = activePageId === node.id;

    return (
      <div key={node.id} className="tree-node">
        <div
          className={`node-content ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 20}px` }}
          onClick={() => !isLeaf && toggleNode(node.id)}
        >
          {node.children && node.children.length > 0 && (
            <span className={`toggle ${isExpanded ? 'expanded' : 'collapsed'}`}>
              {isExpanded ? '▼' : '▶️'}
            </span>
          )}
          <span className="node-title">{node.title}</span>
        </div>

        {isExpanded && node.children && node.children.length > 0 && (
          <div className="children">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page-tree">
      {nodes.map(node => renderNode(node))}
    </div>
  );
};

export default PageTree;