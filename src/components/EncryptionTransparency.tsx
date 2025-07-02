import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Shield, Key, Lock, Eye, FileText, Binary } from 'lucide-react';
import { arrayBufferToBase64 } from '@/utils/crypto';

interface EncryptionData {
    originalData?: ArrayBuffer;
    encryptedData?: ArrayBuffer;
    secretWord?: string;
    iv?: ArrayBuffer;
    salt?: ArrayBuffer;
    fileName?: string;
    fileSize?: number;
    isText?: boolean;
    textContent?: string;
}

interface EncryptionTransparencyProps {
    data?: EncryptionData;
    stage: 'idle' | 'processing' | 'complete';
}

export default function EncryptionTransparency({ data, stage }: EncryptionTransparencyProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showRawData, setShowRawData] = useState(false);

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const truncateString = (str: string, maxLength: number = 64): string => {
        return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
    };

    const formatArrayBuffer = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer);
        const hex = Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return hex.toUpperCase();
    };

    return (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-amber-600" />
                        <CardTitle className="text-base">Encryption Transparency</CardTitle>
                        <Badge variant="outline" className="text-xs">
                            {stage === 'idle' ? 'Ready' : stage === 'processing' ? 'Active' : 'Complete'}
                        </Badge>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8 p-0"
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
                <CardDescription className="text-sm">
                    See exactly how your data is encrypted before upload
                </CardDescription>
            </CardHeader>

            {isExpanded && (
                <CardContent className="space-y-4 pt-0">
                    {stage === 'idle' && (
                        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                            <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Upload a file or enter text to see the encryption process</p>
                        </div>
                    )}

                    {(stage === 'processing' || stage === 'complete') && data && (
                        <div className="space-y-4">
                            {/* Original Data */}
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-950">
                                <div className="flex items-center gap-2 mb-3">
                                    {data.isText ? <FileText className="w-4 h-4" /> : <Binary className="w-4 h-4" />}
                                    <h4 className="font-medium text-sm">Original Data</h4>
                                    {data.fileSize && (
                                        <Badge variant="secondary" className="text-xs">
                                            {formatBytes(data.fileSize)}
                                        </Badge>
                                    )}
                                </div>
                                
                                {data.isText && data.textContent ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Text Content:</p>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto">
                                            {truncateString(data.textContent, 200)}
                                        </div>
                                    </div>
                                ) : data.fileName ? (
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">File:</p>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono text-xs">
                                            {data.fileName}
                                        </div>
                                    </div>
                                ) : null}

                                {showRawData && data.originalData && (
                                    <div className="mt-3 space-y-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Raw Bytes (Hex):</p>
                                        <div className="bg-gray-100 dark:bg-gray-800 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto break-all">
                                            {truncateString(formatArrayBuffer(data.originalData), 500)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Encryption Process */}
                            <div className="border rounded-lg p-4 bg-white dark:bg-gray-950">
                                <div className="flex items-center gap-2 mb-3">
                                    <Key className="w-4 h-4" />
                                    <h4 className="font-medium text-sm">Encryption Process</h4>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="space-y-2">
                                        <p className="text-gray-600 dark:text-gray-400">Algorithm:</p>
                                        <Badge variant="outline" className="text-xs">AES-256-CBC</Badge>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-gray-600 dark:text-gray-400">Key Derivation:</p>
                                        <Badge variant="outline" className="text-xs">PBKDF2 (100k iterations)</Badge>
                                    </div>

                                    {data.secretWord && (
                                        <div className="space-y-2">
                                            <p className="text-gray-600 dark:text-gray-400">Secret Word:</p>
                                            <div className="bg-blue-100 dark:bg-blue-900/30 rounded p-2 font-mono">
                                                {data.secretWord}
                                            </div>
                                        </div>
                                    )}

                                    {data.salt && (
                                        <div className="space-y-2">
                                            <p className="text-gray-600 dark:text-gray-400">Salt (Base64):</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono break-all">
                                                {arrayBufferToBase64(data.salt)}
                                            </div>
                                        </div>
                                    )}

                                    {data.iv && (
                                        <div className="space-y-2">
                                            <p className="text-gray-600 dark:text-gray-400">IV (Base64):</p>
                                            <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono break-all">
                                                {arrayBufferToBase64(data.iv)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Encrypted Result */}
                            {data.encryptedData && (
                                <div className="border rounded-lg p-4 bg-white dark:bg-gray-950">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Lock className="w-4 h-4" />
                                        <h4 className="font-medium text-sm">Encrypted Result</h4>
                                        <Badge variant="secondary" className="text-xs">
                                            {formatBytes(data.encryptedData.byteLength)}
                                        </Badge>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Encrypted Data (Base64):</p>
                                        <div className="bg-red-100 dark:bg-red-900/30 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto break-all">
                                            {truncateString(arrayBufferToBase64(data.encryptedData), 500)}
                                        </div>
                                    </div>

                                    {showRawData && (
                                        <div className="mt-3 space-y-2">
                                            <p className="text-xs text-gray-600 dark:text-gray-400">Raw Encrypted Bytes (Hex):</p>
                                            <div className="bg-red-100 dark:bg-red-900/30 rounded p-3 font-mono text-xs max-h-32 overflow-y-auto break-all">
                                                {truncateString(formatArrayBuffer(data.encryptedData), 500)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center justify-between pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowRawData(!showRawData)}
                                    className="text-xs"
                                >
                                    {showRawData ? 'Hide' : 'Show'} Raw Data
                                </Button>
                                
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    ✓ Data encrypted locally in your browser
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}