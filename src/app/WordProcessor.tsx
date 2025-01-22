import React, { useState, ChangeEvent, FormEvent } from 'react';
import { FiLink, FiFileText } from 'react-icons/fi';
import mammoth from 'mammoth';

interface DocumentContent {
    html: string;
    fileName: string;
}

interface ButtonProps {
    children: React.ReactNode;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
    className?: string;
}

interface InputProps {
    type: string;
    placeholder?: string;
    value?: string;
    onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
    accept?: string;
    className?: string;
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
}

interface CardHeaderProps {
    children: React.ReactNode;
}

interface CardTitleProps {
    children: React.ReactNode;
}

interface CardContentProps {
    children: React.ReactNode;
}

interface AlertProps {
    children: React.ReactNode;
}

// Custom Button Component
const Button: React.FC<ButtonProps> = ({
    children,
    disabled = false,
    type = 'button',
    onClick,
    className = ''
}) => (
    <button
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={`px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 
    disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors 
    flex items-center justify-center ${className}`}
    >
        {children}
    </button>
);

// Custom Input Component
const Input: React.FC<InputProps> = ({
    type,
    placeholder,
    value,
    onChange,
    accept,
    className = ''
}) => (
    <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        accept={accept}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none 
    focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    />
);

// Custom Card Components
const Card: React.FC<CardProps> = ({ children, className = '' }) => (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
        {children}
    </div>
);

const CardHeader: React.FC<CardHeaderProps> = ({ children }) => (
    <div className="px-6 py-4 border-b border-gray-200">
        {children}
    </div>
);

const CardTitle: React.FC<CardTitleProps> = ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-800">
        {children}
    </h2>
);

const CardContent: React.FC<CardContentProps> = ({ children }) => (
    <div className="p-6">
        {children}
    </div>
);

// Custom Alert Component
const Alert: React.FC<AlertProps> = ({ children }) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        {children}
    </div>
);

const WordProcessor: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [documentContent, setDocumentContent] = useState<DocumentContent | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [editedContent, setEditedContent] = useState<string>('');

    const processWordDocument = async (arrayBuffer: ArrayBuffer, fileName: string): Promise<void> => {
        try {
            const result = await mammoth.convertToHtml({ arrayBuffer });
            setDocumentContent({
                html: result.value,
                fileName: fileName
            });
            setEditedContent(result.value);
        } catch (err) {
            setError('Failed to process Word document. Please try again.');
        }
    };

    const handleUrlSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch file');
            const arrayBuffer = await response.arrayBuffer();
            const fileName = url.split('/').pop() || 'document.docx';
            await processWordDocument(arrayBuffer, fileName);
        } catch (err) {
            setError('Failed to process the URL. Please check the URL and try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError('');

        try {
            const arrayBuffer = await file.arrayBuffer();
            await processWordDocument(arrayBuffer, file.name);
        } catch (err) {
            setError('Failed to process the file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleContentChange = (e: ChangeEvent<HTMLDivElement>) => {
        setEditedContent(e.currentTarget.innerHTML);
    };

    return (
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* File Input Controls */}
                    <div className="space-y-4">
                        <form onSubmit={handleUrlSubmit} className="flex gap-2">
                            <input
                                type="url"
                                placeholder="Enter Word document URL"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                            >
                                <FiLink className="inline mr-2" />
                                Load URL
                            </button>
                        </form>

                        <div>
                            <input
                                type="file"
                                accept=".doc,.docx"
                                onChange={handleFileUpload}
                                className="w-full px-3 py-2 border rounded"
                            />
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Document Editor */}
                    {loading ? (
                        <div className="text-center py-10">Loading document...</div>
                    ) : documentContent ? (
                        <div className="border rounded-lg">
                            <div className="bg-gray-50 px-4 py-2 border-b">
                                <h3 className="font-medium flex items-center">
                                    <FiFileText className="mr-2" />
                                    {documentContent.fileName}
                                </h3>
                            </div>
                            <div
                                contentEditable
                                className="p-6 min-h-[500px] prose max-w-none focus:outline-none"
                                dangerouslySetInnerHTML={{ __html: documentContent.html }}
                                onInput={handleContentChange}
                                style={{
                                    fontFamily: 'Calibri, sans-serif',
                                    fontSize: '12pt',
                                    lineHeight: '1.5',
                                }}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Load a Word document to begin editing
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WordProcessor;