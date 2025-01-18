import React, { useState, useEffect } from 'react';
import { 
  FiFolder, 
  FiFile, 
  FiChevronRight, 
  FiChevronDown,
  FiX,
  FiEdit,
  FiSave,
  FiRotateCcw
} from 'react-icons/fi';
import {
  DiJavascript1,
  DiCss3,
  DiHtml5,
  DiPython,
  DiRuby,
  DiJava,
  DiReact,
  DiPhp,
  DiMarkdown
} from 'react-icons/di';
import {
  RiFileCodeLine,
  RiFileTextLine,
  RiFilePdfLine,
  RiFileZipLine,
  RiFileExcelLine,
  RiFileWordLine,
  RiFilePptLine,
  RiImageLine,
  RiFileVideoLine,
  RiFileGifLine,
  RiTerminalBoxLine,
  RiGitBranchLine
} from 'react-icons/ri';
import { LuFileJson } from "react-icons/lu";
import { GrConfigure, GrDocumentConfig } from "react-icons/gr";
// Types and Interfaces
interface RepoItem {
  name: string;
  path: string;
  type: 'dir' | 'file';
  size: number;
  url: string;
  html_url: string;
  download_url: string | null;
}

interface FileChange {
  path: string;
  originalContent: string;
  newContent: string;
  timestamp: Date;
}

interface GithubRepoExplorerProps {
  repoUrl: string;
}

interface FolderContentsProps {
  path: string;
  owner: string;
  repo: string;
  onFileClick: (item: RepoItem) => void;
}

interface FileModalProps {
  file: RepoItem | null;
  onClose: () => void;
  owner: string;
  repo: string;
  onChangesSaved: (change: FileChange) => void;
}

// Utility Functions
const extractRepoInfo = (repoUrl: string): { owner: string; repo: string } => {
  const [owner, repo] = repoUrl
    .replace('https://github.com/', '')
    .replace('.git', '')
    .split('/');
  return { owner, repo };
};

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  const iconProps = { className: "w-4 h-4" };
  
  switch (extension) {
    // Web Development
    case 'html': return <DiHtml5 {...iconProps} className="w-4 h-4 text-orange-500" />;
    case 'css': return <DiCss3 {...iconProps} className="w-4 h-4 text-blue-500" />;
    case 'js':
    case 'jsx': return <DiJavascript1 {...iconProps} className="w-4 h-4 text-yellow-400" />;
    case 'ts':
    case 'tsx': return <RiFileCodeLine {...iconProps} className="w-4 h-4 text-blue-600" />;
    
    // Programming Languages
    case 'py': return <DiPython {...iconProps} className="w-4 h-4 text-blue-500" />;
    case 'rb': return <DiRuby {...iconProps} className="w-4 h-4 text-red-500" />;
    case 'java': return <DiJava {...iconProps} className="w-4 h-4 text-red-600" />;
    case 'php': return <DiPhp {...iconProps} className="w-4 h-4 text-purple-500" />;
    
    // React Related
    case 'jsx':
    case 'tsx': return <DiReact {...iconProps} className="w-4 h-4 text-blue-400" />;
    
    // Data Files
    case 'json': return <LuFileJson {...iconProps} className="w-4 h-4 text-yellow-500" />;
    case 'xml':
    case 'yaml':
    case 'yml': return <GrConfigure {...iconProps} className="w-4 h-4 text-gray-500" />;
    
    // Documentation
    case 'md': return <DiMarkdown {...iconProps} className="w-4 h-4 text-gray-600" />;
    case 'txt': return <RiFileTextLine {...iconProps} className="w-4 h-4 text-gray-500" />;
    case 'pdf': return <RiFilePdfLine {...iconProps} className="w-4 h-4 text-red-500" />;
    
    // Office Documents
    case 'doc':
    case 'docx': return <RiFileWordLine {...iconProps} className="w-4 h-4 text-blue-600" />;
    case 'xls':
    case 'xlsx': return <RiFileExcelLine {...iconProps} className="w-4 h-4 text-green-600" />;
    case 'ppt':
    case 'pptx': return <RiFilePptLine {...iconProps} className="w-4 h-4 text-orange-600" />;
    
    // Media Files
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'svg': return <RiImageLine {...iconProps} className="w-4 h-4 text-purple-500" />;
    case 'gif': return <RiFileGifLine {...iconProps} className="w-4 h-4 text-pink-500" />;
    case 'mp4':
    case 'mov':
    case 'avi': return <RiFileVideoLine {...iconProps} className="w-4 h-4 text-blue-500" />;
    
    // Archives
    case 'zip':
    case 'rar':
    case 'tar':
    case 'gz': return <RiFileZipLine {...iconProps} className="w-4 h-4 text-gray-500" />;
    
    // Special Files
    case 'sh':
    case 'bash': return <RiTerminalBoxLine {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'gitignore': return <RiGitBranchLine {...iconProps} className="w-4 h-4 text-gray-600" />;
    
    // Default
    default: return <FiFile {...iconProps} className="w-4 h-4 text-gray-500" />;
  }
};

// File Modal Component
const FileModal: React.FC<FileModalProps> = ({ 
  file, 
  onClose, 
  owner, 
  repo, 
  onChangesSaved 
}) => {
  const [content, setContent] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!file) return;
      
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch file content');
        }
        
        const data = await response.json();
        const decodedContent = atob(data.content);
        setContent(decodedContent);
        setEditedContent(decodedContent);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [file, owner, repo]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!file || !content || !editedContent) return;

    const fileChange: FileChange = {
      path: file.path,
      originalContent: content,
      newContent: editedContent,
      timestamp: new Date()
    };

    onChangesSaved(fileChange);
    setIsEditing(false);
    setContent(editedContent);
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            {getFileIcon(file.name)}
            <h3 className="text-lg font-semibold">{file.name}</h3>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="p-2 hover:bg-gray-100 rounded-full"
                title="Edit"
              >
                <FiEdit className="w-5 h-5" />
              </button>
            )}
            {isEditing && (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 hover:bg-green-100 rounded-full text-green-600"
                  title="Save"
                >
                  <FiSave className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancel}
                  className="p-2 hover:bg-red-100 rounded-full text-red-600"
                  title="Cancel"
                >
                  <FiRotateCcw className="w-5 h-5" />
                </button>
              </>
            )}
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : isEditing ? (
            <textarea
              value={editedContent || ''}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-full min-h-[400px] font-mono text-sm p-2 border rounded bg-black"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono text-sm">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

const GithubRepoExplorer: React.FC<GithubRepoExplorerProps> = ({ repoUrl }) => {
  const [repoData, setRepoData] = useState<RepoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<RepoItem | null>(null);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const { owner, repo } = extractRepoInfo(repoUrl);

  useEffect(() => {
    const fetchRepoContents = async () => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch repository contents');
        }
        
        const data: RepoItem[] = await response.json();
        setRepoData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    if (repoUrl) {
      fetchRepoContents();
    }
  }, [repoUrl, owner, repo]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileClick = (item: RepoItem) => {
    setSelectedFile(item);
  };

  const handleChangesSaved = (change: FileChange) => {
    setFileChanges(prev => [...prev, change]);
  };

  const getChangeSummary = (): { totalFiles: number; changes: { [key: string]: number } } => {
    const changes: { [key: string]: number } = {};
    fileChanges.forEach(change => {
      changes[change.path] = (changes[change.path] || 0) + 1;
    });
    return {
      totalFiles: Object.keys(changes).length,
      changes
    };
  };

  const FolderContents: React.FC<FolderContentsProps> = ({ path, owner, repo, onFileClick }) => {
    const [contents, setContents] = useState<RepoItem[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      const fetchContents = async () => {
        try {
          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
          );
          
          if (!response.ok) {
            throw new Error('Failed to fetch folder contents');
          }
          
          const data: RepoItem[] = await response.json();
          setContents(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      };

      fetchContents();
    }, [path, owner, repo]);

    if (error) return <div className="text-red-500 p-2">Error: {error}</div>;
    if (!contents) return <div className="p-2">Loading...</div>;

    return (
      <div>
        {contents.map(item => renderItem(item))}
      </div>
    );
  };

  const renderItem = (item: RepoItem) => {
    const isFolder = item.type === 'dir';
    const isExpanded = expandedFolders.has(item.path);

    return (
      <div key={item.path} className="py-1">
        <div 
          className={`flex items-center space-x-2 hover:bg-gray-100 p-2 rounded cursor-pointer ${
            isFolder ? 'font-medium' : ''
          }`}
          onClick={() => isFolder ? toggleFolder(item.path) : handleFileClick(item)}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <FiChevronDown className="w-4 h-4" />
              ) : (
                <FiChevronRight className="w-4 h-4" />
              )}
              <FiFolder className="w-4 h-4 text-blue-500" />
            </>
          ) : (
            <>
              <div className="w-4" /> {/* Spacer for alignment */}
              {getFileIcon(item.name)}
            </>
          )}
          <span>{item.name}</span>
        </div>
        
        {isFolder && isExpanded && (
          <div className="ml-6 border-l border-gray-200">
            <FolderContents 
              path={item.path} 
              owner={owner} 
              repo={repo} 
              onFileClick={handleFileClick}
            />
          </div>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded bg-red-50 text-red-700">
        Error: {error}
      </div>
    );
  }

  if (!repoData) {
    return (
      <div className="p-4 text-gray-600">
        Loading repository contents...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 border rounded max-w-2xl">
        <h2 className="text-xl font-semibold mb-4">Repository Contents</h2>
        <div className="space-y-1">
          {repoData.map(item => renderItem(item))}
        </div>
      </div>

      {fileChanges.length > 0 && (
        <div className="p-4 border rounded max-w-2xl bg-black">
          <h3 className="font-semibold mb-2">Pending Changes</h3>
          <div className="space-y-2">
            {Object.entries(getChangeSummary().changes).map(([path, count]) => (
              <div key={path} className="flex justify-between items-center">
                <span className="font-mono text-sm">{path}</span>
                <span className="text-sm bg-blue-200 px-2 py-1 rounded">
                  {count} change{count > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFile && (
        <FileModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          owner={owner}
          repo={repo}
          onChangesSaved={handleChangesSaved}
        />
      )}
    </div>
  );
};

export default GithubRepoExplorer;