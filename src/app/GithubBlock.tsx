import React from 'react';
import { createBlockSpec } from '@blocknote/core';
import GithubRepoExplorer from './GithubRepoExplorer'; // Adjust the import path as necessary
import ReactDOM from 'react-dom';

export const GithubBlock = createBlockSpec(
  {
    type: 'github',
    propSchema: {
      url: {
        default: '',
      },
    },
    content: 'none',
  },
  {
    render: (block, editor) => {
      const dom = document.createElement('div');
      ReactDOM.render(<GithubRepoExplorer repoUrl={block.props.url} />, dom);
      return {
        dom,
      };
    },
  }
);