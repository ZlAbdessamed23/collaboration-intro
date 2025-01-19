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
import { GrConfigure } from "react-icons/gr";
import { Editor, loader } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

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

type MonacoTheme = {
  base: 'vs' | 'vs-dark' | 'hc-black';
  inherit: boolean;
  rules: Array<{
    token: string;
    foreground?: string;
    background?: string;
    fontStyle?: string;
  }>;
  colors: { [key: string]: string };
};

// Define available themes
const editorThemes: { [key: string]: MonacoTheme | string } = {
  'vs': 'vs', // Default light theme
  'vs-dark': 'vs-dark', // Default dark theme
  'hc-black': 'hc-black', // High contrast black theme

  // Custom Themes
  'dracula': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6272a4' },
      { token: 'keyword', foreground: 'ff79c6' },
      { token: 'string', foreground: 'f1fa8c' },
      { token: 'number', foreground: 'bd93f9' },
      { token: 'type', foreground: '8be9fd' }
    ],
    colors: {
      'editor.background': '#282a36',
      'editor.foreground': '#f8f8f2',
      'editor.lineHighlightBackground': '#44475a',
      'editorLineNumber.foreground': '#6272a4',
      'editor.selectionBackground': '#44475a',
      'editor.inactiveSelectionBackground': '#44475a70'
    }
  },
  'nord': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4C566A' },
      { token: 'keyword', foreground: '81A1C1' },
      { token: 'string', foreground: 'A3BE8C' },
      { token: 'number', foreground: 'B48EAD' },
      { token: 'type', foreground: '8FBCBB' }
    ],
    colors: {
      'editor.background': '#2E3440',
      'editor.foreground': '#D8DEE9',
      'editor.lineHighlightBackground': '#3B4252',
      'editorLineNumber.foreground': '#4C566A',
      'editor.selectionBackground': '#434C5E',
      'editor.inactiveSelectionBackground': '#434C5E70'
    }
  },
  'one-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5C6370' },
      { token: 'keyword', foreground: 'C678DD' },
      { token: 'string', foreground: '98C379' },
      { token: 'number', foreground: 'D19A66' },
      { token: 'type', foreground: '61AFEF' }
    ],
    colors: {
      'editor.background': '#282C34',
      'editor.foreground': '#ABB2BF',
      'editor.lineHighlightBackground': '#2C313A',
      'editorLineNumber.foreground': '#4B5263',
      'editor.selectionBackground': '#3E4451',
      'editor.inactiveSelectionBackground': '#3E445170'
    }
  },
  'material': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '546E7A' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'type', foreground: '82AAFF' }
    ],
    colors: {
      'editor.background': '#263238',
      'editor.foreground': '#EEFFFF',
      'editor.lineHighlightBackground': '#2E3C43',
      'editorLineNumber.foreground': '#546E7A',
      'editor.selectionBackground': '#314549',
      'editor.inactiveSelectionBackground': '#31454970'
    }
  },
  'solarized-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '586E75' },
      { token: 'keyword', foreground: '268BD2' },
      { token: 'string', foreground: '2AA198' },
      { token: 'number', foreground: 'D33682' },
      { token: 'type', foreground: 'B58900' }
    ],
    colors: {
      'editor.background': '#002B36',
      'editor.foreground': '#839496',
      'editor.lineHighlightBackground': '#073642',
      'editorLineNumber.foreground': '#586E75',
      'editor.selectionBackground': '#073642',
      'editor.inactiveSelectionBackground': '#07364270'
    }
  },
  'solarized-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '93A1A1' },
      { token: 'keyword', foreground: '268BD2' },
      { token: 'string', foreground: '2AA198' },
      { token: 'number', foreground: 'D33682' },
      { token: 'type', foreground: 'B58900' }
    ],
    colors: {
      'editor.background': '#FDF6E3',
      'editor.foreground': '#657B83',
      'editor.lineHighlightBackground': '#EEE8D5',
      'editorLineNumber.foreground': '#93A1A1',
      'editor.selectionBackground': '#EEE8D5',
      'editor.inactiveSelectionBackground': '#EEE8D570'
    }
  },
  'monokai': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '75715E' },
      { token: 'keyword', foreground: 'F92672' },
      { token: 'string', foreground: 'E6DB74' },
      { token: 'number', foreground: 'AE81FF' },
      { token: 'type', foreground: '66D9EF' }
    ],
    colors: {
      'editor.background': '#272822',
      'editor.foreground': '#F8F8F2',
      'editor.lineHighlightBackground': '#3E3D32',
      'editorLineNumber.foreground': '#75715E',
      'editor.selectionBackground': '#49483E',
      'editor.inactiveSelectionBackground': '#49483E70'
    }
  },
  'github-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '6f42c1' }
    ],
    colors: {
      'editor.background': '#24292e',
      'editor.foreground': '#e1e4e8',
      'editor.lineHighlightBackground': '#2b3036',
      'editorLineNumber.foreground': '#6a737d',
      'editor.selectionBackground': '#3392FF44',
      'editor.inactiveSelectionBackground': '#3392FF22'
    }
  },
  'github-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6a737d' },
      { token: 'keyword', foreground: 'd73a49' },
      { token: 'string', foreground: '032f62' },
      { token: 'number', foreground: '005cc5' },
      { token: 'type', foreground: '6f42c1' }
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#24292e',
      'editor.lineHighlightBackground': '#f6f8fa',
      'editorLineNumber.foreground': '#1b1f234d',
      'editor.selectionBackground': '#0366d625',
      'editor.inactiveSelectionBackground': '#0366d612'
    }
  },
  'night-owl': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '637777' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'ADDB67' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'type', foreground: '82AAFF' }
    ],
    colors: {
      'editor.background': '#011627',
      'editor.foreground': '#D6DEEB',
      'editor.lineHighlightBackground': '#022A4B',
      'editorLineNumber.foreground': '#637777',
      'editor.selectionBackground': '#1D3B53',
      'editor.inactiveSelectionBackground': '#1D3B5370'
    }
  },
  'light-owl': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '90A4AE' },
      { token: 'keyword', foreground: '7C4DFF' },
      { token: 'string', foreground: '91B859' },
      { token: 'number', foreground: 'F76D47' },
      { token: 'type', foreground: '39ADB5' }
    ],
    colors: {
      'editor.background': '#FAFAFA',
      'editor.foreground': '#546E7A',
      'editor.lineHighlightBackground': '#ECEFF1',
      'editorLineNumber.foreground': '#90A4AE',
      'editor.selectionBackground': '#80CBC4',
      'editor.inactiveSelectionBackground': '#80CBC470'
    }
  },
  'palenight': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '676E95' },
      { token: 'keyword', foreground: 'C792EA' },
      { token: 'string', foreground: 'C3E88D' },
      { token: 'number', foreground: 'F78C6C' },
      { token: 'type', foreground: '82AAFF' }
    ],
    colors: {
      'editor.background': '#292D3E',
      'editor.foreground': '#A6ACCD',
      'editor.lineHighlightBackground': '#343B51',
      'editorLineNumber.foreground': '#676E95',
      'editor.selectionBackground': '#343B51',
      'editor.inactiveSelectionBackground': '#343B5170'
    }
  },
  'oceanic-next': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '65737E' },
      { token: 'keyword', foreground: 'C594C5' },
      { token: 'string', foreground: '99C794' },
      { token: 'number', foreground: 'F99157' },
      { token: 'type', foreground: '5FB3B3' }
    ],
    colors: {
      'editor.background': '#1B2B34',
      'editor.foreground': '#CDD3DE',
      'editor.lineHighlightBackground': '#343D46',
      'editorLineNumber.foreground': '#65737E',
      'editor.selectionBackground': '#4F5B66',
      'editor.inactiveSelectionBackground': '#4F5B6670'
    }
  },
  'synthwave': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6D6D6D' },
      { token: 'keyword', foreground: 'FF7EDB' },
      { token: 'string', foreground: '72F1B8' },
      { token: 'number', foreground: 'FFEE99' },
      { token: 'type', foreground: '36F9F6' }
    ],
    colors: {
      'editor.background': '#2B213A',
      'editor.foreground': '#F4F4F4',
      'editor.lineHighlightBackground': '#3B2E4A',
      'editorLineNumber.foreground': '#6D6D6D',
      'editor.selectionBackground': '#4A3B5A',
      'editor.inactiveSelectionBackground': '#4A3B5A70'
    }
  },
  'ayu-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '5C6773' },
      { token: 'keyword', foreground: 'FF9940' },
      { token: 'string', foreground: 'BAE67E' },
      { token: 'number', foreground: 'FFCC66' },
      { token: 'type', foreground: '73D0FF' }
    ],
    colors: {
      'editor.background': '#0A0E14',
      'editor.foreground': '#B3B1AD',
      'editor.lineHighlightBackground': '#1F2430',
      'editorLineNumber.foreground': '#5C6773',
      'editor.selectionBackground': '#33415E',
      'editor.inactiveSelectionBackground': '#33415E70'
    }
  },
  'ayu-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: 'ABB0B6' },
      { token: 'keyword', foreground: 'FF9940' },
      { token: 'string', foreground: '86B300' },
      { token: 'number', foreground: 'FFCC66' },
      { token: 'type', foreground: '73D0FF' }
    ],
    colors: {
      'editor.background': '#FAFAFA',
      'editor.foreground': '#5C6773',
      'editor.lineHighlightBackground': '#F0F0F0',
      'editorLineNumber.foreground': '#ABB0B6',
      'editor.selectionBackground': '#D4D4D4',
      'editor.inactiveSelectionBackground': '#D4D4D470'
    }
  },
  'tokyo-night': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '565F89' },
      { token: 'keyword', foreground: 'BB9AF7' },
      { token: 'string', foreground: '9ECE6A' },
      { token: 'number', foreground: 'FF9E64' },
      { token: 'type', foreground: '7AA2F7' }
    ],
    colors: {
      'editor.background': '#1A1B26',
      'editor.foreground': '#A9B1D6',
      'editor.lineHighlightBackground': '#2F3548',
      'editorLineNumber.foreground': '#565F89',
      'editor.selectionBackground': '#3B4261',
      'editor.inactiveSelectionBackground': '#3B426170'
    }
  },
  'gruvbox-dark': {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374' },
      { token: 'keyword', foreground: 'FB4934' },
      { token: 'string', foreground: 'B8BB26' },
      { token: 'number', foreground: 'D3869B' },
      { token: 'type', foreground: '83A598' }
    ],
    colors: {
      'editor.background': '#282828',
      'editor.foreground': '#EBDBB2',
      'editor.lineHighlightBackground': '#3C3836',
      'editorLineNumber.foreground': '#928374',
      'editor.selectionBackground': '#458588',
      'editor.inactiveSelectionBackground': '#45858870'
    }
  },
  'gruvbox-light': {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '928374' },
      { token: 'keyword', foreground: '9D0006' },
      { token: 'string', foreground: '79740E' },
      { token: 'number', foreground: '8F3F71' },
      { token: 'type', foreground: '427B58' }
    ],
    colors: {
      'editor.background': '#FBF1C7',
      'editor.foreground': '#3C3836',
      'editor.lineHighlightBackground': '#EBDBB2',
      'editorLineNumber.foreground': '#928374',
      'editor.selectionBackground': '#D5C4A1',
      'editor.inactiveSelectionBackground': '#D5C4A170'
    }
  }
};

// Initialize themes with proper typing
const initializeThemes = async () => {
  const monaco = await loader.init();
  Object.entries(editorThemes).forEach(([themeName, theme]) => {
    if (typeof theme === 'object') {
      monaco.editor.defineTheme(themeName, theme as editor.IStandaloneThemeData);
    }
  });
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
  const [currentTheme, setCurrentTheme] = useState('vs-dark');
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);

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

  // Function to determine the language for Monaco Editor
  const getLanguage = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';

    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'java': 'java',
      'php': 'php',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql'
    };

    return languageMap[extension] || 'plaintext';
  };

  // Function to handle Monaco Editor value changes
  const handleEditorChange = (value: string | undefined) => {
    setEditedContent(value || '');
  };

  useEffect(() => {
    initializeThemes();
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ theme: currentTheme });
    }
  }, [currentTheme]);


  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-black rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            {getFileIcon(file.name)}
            <h3 className="text-lg font-semibold">{file.name}</h3>
          </div>
          <div className="flex items-center space-x-4">
            {/* Theme Selector */}
            <select
              className="bg-gray-800 text-gray-200 rounded px-2 py-1 text-sm"
              value={currentTheme}
              onChange={(e) => setCurrentTheme(e.target.value)}
            >
              {Object.entries(editorThemes).map(([id, theme]) => (
                <option key={id} value={id}>
                  {typeof theme === 'string' ? theme : id.split('-').map(word =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </option>
              ))}
            </select>

            {/* Edit Controls */}
            <div className="flex items-center space-x-2">
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="p-2 hover:bg-gray-700 rounded-full"
                  title="Edit"
                >
                  <FiEdit className="w-5 h-5" />
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={handleSave}
                    className="p-2 hover:bg-green-700 rounded-full text-green-400"
                    title="Save"
                  >
                    <FiSave className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleCancel}
                    className="p-2 hover:bg-red-700 rounded-full text-red-400"
                    title="Cancel"
                  >
                    <FiRotateCcw className="w-5 h-5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-700 rounded-full"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 h-[calc(80vh-4rem)] overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4">{error}</div>
          ) : (
            <div className="h-full w-full">
              <Editor
                height="100%"
                defaultValue={content || ''}
                value={editedContent || ''}
                language={getLanguage(file.name)}
                theme={currentTheme}
                options={{
                  readOnly: !isEditing,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true,
                  lineNumbers: 'on',
                  rulers: [80, 120],
                  bracketPairColorization: { enabled: true },
                  formatOnPaste: true,
                  formatOnType: true
                }}
                onChange={handleEditorChange}
              />
            </div>
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
          className={`flex items-center space-x-2 hover:bg-gray-100 p-2 rounded cursor-pointer ${isFolder ? 'font-medium' : ''
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