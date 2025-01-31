import React, { useEffect, useState } from 'react';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  insertOrUpdateBlock,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  useCreateBlockNote,
} from '@blocknote/react';
import { FaGithub } from 'react-icons/fa';
import { GithubBlock } from './GithubBlock'; // Adjust the import path as necessary
import GithubLinkModal from './GithubLinkModal'; // Adjust the import path as necessary

// Import default styles
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { FigmaBlock } from './FigmaEmbed';
import { FaFigma } from 'react-icons/fa6';
import FigmaLinkModal from './FigmaLinkModal';

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    figma: FigmaBlock, // Existing Figma block
    github: GithubBlock, // New GitHub block
  },
});

export default function Editor() {
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: 'paragraph',
        content: 'Welcome to this demo!',
      },
      {
        type: 'paragraph',
        content: "Press the '/' key to open the Slash Menu and add a GitHub repository link",
      },
      {
        type: 'paragraph',
      },
    ],
  });

  const handleInsertFigma = (url: string) => {
    insertOrUpdateBlock(editor, {
      type: "figma",
      props: {
        url,
      },
    });
  };

  const insertFigma = {
    title: "Add Figma Design Link",
    onItemClick: () => setIsFigmaModalOpen(true),
    aliases: ["figma", "design", "embed"],
    group: "Media",
    icon: <FaFigma />,
  };

  const handleInsertGithub = (url: string) => {
    insertOrUpdateBlock(editor, {
      type: 'github',
      props: {
        url,
      },
    });
  };

  const insertGithub = {
    title: 'Add GitHub Repository Link',
    onItemClick: () => setIsGithubModalOpen(true),
    aliases: ['github', 'repo', 'repository'],
    group: 'Media',
    icon: <FaGithub />,
  };

  // Function to save editor content to localStorage
  const saveContentToLocalStorage = () => {
    const content = editor.document;
    localStorage.setItem('editorContent', JSON.stringify(content));
  };

  // Function to load editor content from localStorage
  useEffect(() => {
    const loadContentFromLocalStorage = async () => {
      const savedContent = localStorage.getItem("editorContent");
      if (savedContent) {
        const parsedContent = JSON.parse(savedContent);
        if (editor.document) {
          await editor.replaceBlocks(editor.document, parsedContent);
        } else {
          console.error("Editor document is not defined.");
        }
      } else {
        if (editor.document) {
          await editor.replaceBlocks(editor.document, [
            {
              type: "paragraph",
              content: "Welcome to this demo!",
            },
            {
              type: "paragraph",
              content: "Press the '/' key to open the Slash Menu and add a Figma design link",
            },
            {
              type: "paragraph",
            },
          ]);
        } else {
          console.error("Editor document is not defined.");
        }
      }
    };

    loadContentFromLocalStorage();

    const handleChange = () => {
      saveContentToLocalStorage();
    };

    const unsubscribe = editor.onChange(handleChange);

    return () => {
      unsubscribe?.();
    };
  }, [editor]);

  return (
    <>
      <BlockNoteView editor={editor} slashMenu={false}>
        <SuggestionMenuController
          triggerCharacter={'/'}
          getItems={async (query) =>
            filterSuggestionItems(
              [...getDefaultReactSlashMenuItems(editor), insertFigma, insertGithub],
              query
            )
          }
        />
      </BlockNoteView>
      
      <FigmaLinkModal
        isOpen={isFigmaModalOpen}
        onClose={() => setIsFigmaModalOpen(false)}
        onSubmit={handleInsertFigma}
      />
      <GithubLinkModal
        isOpen={isGithubModalOpen}
        onClose={() => setIsGithubModalOpen(false)}
        onSubmit={handleInsertGithub}
      />
    </>
  );
}