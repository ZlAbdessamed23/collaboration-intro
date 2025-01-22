import React, { useState, ChangeEvent, FormEvent } from 'react';
import { FiLink, FiFileText } from 'react-icons/fi';
import * as XLSX from 'xlsx';

interface SpreadsheetContent {
    data: any[][];
    fileName: string;
    activeSheet: string;
    sheets: string[];
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

const ExcelProcessor: React.FC = () => {
    const [url, setUrl] = useState<string>('');
    const [spreadsheetContent, setSpreadsheetContent] = useState<SpreadsheetContent | null>(null);
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [editedCells, setEditedCells] = useState<{ [key: string]: string }>({});

    const processExcelFile = async (arrayBuffer: ArrayBuffer, fileName: string): Promise<void> => {
        try {
            const data = new Uint8Array(arrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            const firstSheet = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheet];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            setSpreadsheetContent({
                data: jsonData as any[][],
                fileName: fileName,
                activeSheet: firstSheet,
                sheets: workbook.SheetNames
            });
        } catch (err) {
            setError('Failed to process Excel file. Please try again.');
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
            const fileName = url.split('/').pop() || 'spreadsheet.xlsx';
            await processExcelFile(arrayBuffer, fileName);
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
            await processExcelFile(arrayBuffer, file.name);
        } catch (err) {
            setError('Failed to process the file. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCellChange = (rowIndex: number, colIndex: number, value: string) => {
        setEditedCells({
            ...editedCells,
            [`${rowIndex}-${colIndex}`]: value
        });
    };

    const handleSheetChange = (sheetName: string) => {
        if (!spreadsheetContent) return;

        try {
            const workbook = XLSX.read(spreadsheetContent.data, { type: 'array' });
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            setSpreadsheetContent({
                ...spreadsheetContent,
                data: jsonData as any[][],
                activeSheet: sheetName
            });
        } catch (err) {
            setError('Failed to switch sheets. Please try again.');
        }
    };

    // Function to format cell content
    const formatCellContent = (content: any): string => {
        if (content === null || content === undefined) return '';
        if (typeof content === 'number') return content.toString();
        return content;
    };

    return (
        <div className="w-full max-w-6xl mx-auto space-y-4">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* File Input Controls */}
                    <div className="space-y-4">
                        <form onSubmit={handleUrlSubmit} className="flex gap-2">
                            <input
                                type="url"
                                placeholder="Enter Excel file URL"
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
                                accept=".xlsx,.xls,.csv"
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

                    {/* Spreadsheet Display */}
                    {loading ? (
                        <div className="text-center py-10">Loading spreadsheet...</div>
                    ) : spreadsheetContent ? (
                        <div className="border rounded-lg">
                            <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                                <h3 className="font-medium flex items-center">
                                    <FiFileText className="mr-2" />
                                    {spreadsheetContent.fileName}
                                </h3>
                                {spreadsheetContent.sheets.length > 1 && (
                                    <select
                                        value={spreadsheetContent.activeSheet}
                                        onChange={(e) => handleSheetChange(e.target.value)}
                                        className="ml-4 px-2 py-1 border rounded"
                                    >
                                        {spreadsheetContent.sheets.map(sheet => (
                                            <option key={sheet} value={sheet}>{sheet}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <div className="inline-block min-w-full align-middle">
                                    <div className="overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {spreadsheetContent.data.map((row, rowIndex) => (
                                                    <tr key={rowIndex} className="hover:bg-gray-50">
                                                        {row.map((cell: any, colIndex: number) => (
                                                            <td
                                                                key={colIndex}
                                                                className="border border-gray-200"
                                                            >
                                                                <input
                                                                    type="text"
                                                                    value={
                                                                        editedCells[`${rowIndex}-${colIndex}`] !== undefined
                                                                            ? editedCells[`${rowIndex}-${colIndex}`]
                                                                            : formatCellContent(cell)
                                                                    }
                                                                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                                    className="w-full min-w-[120px] px-4 py-3 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                                    style={{
                                                                        fontFamily: 'Arial, sans-serif',
                                                                        backgroundColor: 'transparent'
                                                                    }}
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 text-gray-500">
                            Load an Excel file to begin editing
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExcelProcessor;