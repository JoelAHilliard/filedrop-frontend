import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, File, Upload, FileText, RefreshCw, CheckCircle, Info, Shield, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QRCode from "react-qr-code";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { encryptData, arrayBufferToBase64, str2ab, formatFileSize } from '@/utils/crypto';
import confetti from 'canvas-confetti';

interface UploadComponentProps {
    wordList: string[];
}

export default function UploadComponent({ wordList }: UploadComponentProps) {
    const URL = "https://dropit-backend-production.up.railway.app/";
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(true);
    const [secretWord, setSecretWord] = useState('');
    const [showSecretWord, setShowSecretWord] = useState(false);
    const [fileSize, setFileSize] = useState(0);
    const [uploadComplete, setUploadComplete] = useState(false);

    const { toast } = useToast();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;
        setSelectedFile(file);
        if (file) {
            setFileSize(file.size);
        }
    };

    const resetUpload = () => {
        setUploadComplete(false);
        setGivenAccessCode('');
        setSecretWord('');
        setSelectedFile(null);
        setInputText('');
        setFileSize(0);
    };

    const handleUpload = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setUploadComplete(false);

        const index = Math.floor(Math.random() * wordList.length);
        const sw = wordList[index].replace("\r","");
        
        if (!sw) {
            toast({
                title: "Error",
                description: "Secret word not available.",
                variant: "destructive"
            });
            setLoading(false);
            return;
        }
        
        if (!uploadFile) {
            if(inputText === ''){
                toast({
                    title: "No Content",
                    description: "Please enter some text to upload.",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }
            let buffer = str2ab(inputText);
            setFileSize(buffer.byteLength);
            const { encryptedBuffer, iv, salt } = await encryptData(buffer, sw);
            const formData = new FormData();
            formData.append('file', new Blob([encryptedBuffer]), 'file.txt');
            formData.append('type', 'text/plain');
            formData.append('secretWord', sw);
            formData.append('iv', arrayBufferToBase64(iv));
            formData.append('salt', arrayBufferToBase64(salt));
    
            try {
                const response = await fetch(`${URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    setGivenAccessCode(data.key);
                    setSecretWord(sw);
                    setUploadComplete(true);
                    
                    // Trigger confetti
                    confetti({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.8 },
                        startVelocity: 15,
                        gravity: 1.2
                    });
                    
                    toast({
                        title: "Upload Successful",
                        description: "Your text has been securely uploaded.",
                    });
                } else {
                    const errorText = await response.text();
                    toast({
                        title: "Upload Failed",
                        description: errorText,
                        variant: "destructive"
                    });
                }
            } catch (error) {
                console.error('Error during upload:', error);
                toast({
                    title: "Upload Failed",
                    description: "An error occurred during upload.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        } else {
            if (!selectedFile) {
                toast({
                    title: "No File Selected",
                    description: "Please select a file to upload.",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }
    
            const maxFileSize = 100 * 1024 * 1024; // 100MB
            if (selectedFile.size > maxFileSize) {
                toast({
                    title: "File Too Large",
                    description: "File size exceeds the maximum limit of 100MB.",
                    variant: "destructive"
                });
                setLoading(false);
                return;
            }
    
            let fileData = await selectedFile.arrayBuffer();
            const { encryptedBuffer, iv, salt } = await encryptData(fileData, sw);
            const formData = new FormData();
            formData.append('file', new Blob([encryptedBuffer]), selectedFile.name);
            formData.append('type', selectedFile.type);
            formData.append('secretWord', sw);
            formData.append('iv', arrayBufferToBase64(iv));
            formData.append('salt', arrayBufferToBase64(salt));
    
            try {
                const response = await fetch(`${URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });
                if (response.ok) {
                    const data = await response.json();
                    setGivenAccessCode(data.key);
                    setSecretWord(sw);
                    setUploadComplete(true);
                    
                    // Trigger confetti
                    confetti({
                        particleCount: 30,
                        spread: 50,
                        origin: { y: 0.8 },
                        startVelocity: 15,
                        gravity: 1.2
                    });
                    
                    toast({
                        title: "Upload Successful",
                        description: `${selectedFile.name} has been securely uploaded.`,
                    });
                } else {
                    const errorText = await response.text();
                    toast({
                        title: "Upload Failed",
                        description: errorText,
                        variant: "destructive"
                    });
                }
            } catch (error) {
                console.error('Error during upload:', error);
                toast({
                    title: "Upload Failed",
                    description: "An error occurred during upload.",
                    variant: "destructive"
                });
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCopy = async (text: string, type: string) => {
        await navigator.clipboard.writeText(text);
        const messages: Record<string, string> = {
            accessCode: "Access code copied to clipboard",
            secretWord: "Secret word copied to clipboard",
            link: "Share link copied to clipboard"
        };
        toast({ title: "Copied", description: messages[type] });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            {uploadFile ? <File className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            {uploadFile ? 'Upload File' : 'Upload Text'}
                        </CardTitle>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setUploadFile(!uploadFile)}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            {uploadFile ? "Text" : "File"}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {uploadFile ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center min-h-[200px] flex flex-col justify-center">
                            {selectedFile ? (
                                <div className="space-y-4">
                                    <File className="w-12 h-12 mx-auto text-gray-500" />
                                    <div className="space-y-2">
                                        <p className="font-medium break-all">
                                            {selectedFile.name}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {formatFileSize(selectedFile.size)}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setSelectedFile(null)}
                                    >
                                        Change File
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <Upload className="w-12 h-12 mx-auto text-gray-400" />
                                    <div className="space-y-2">
                                        <p className="font-medium">Drop your file here</p>
                                        <p className="text-gray-500 text-sm">or click to browse</p>
                                    </div>
                                    <label className="inline-flex items-center justify-center px-4 py-2 bg-black text-white rounded cursor-pointer hover:bg-gray-800">
                                        Choose File
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={handleFileChange} 
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="text-input" className="mb-2 block font-medium">
                                    Text Content
                                </Label>
                                <Textarea
                                    id="text-input"
                                    value={inputText}
                                    onChange={(e) => {
                                        setInputText(e.target.value);
                                        setFileSize(new TextEncoder().encode(e.target.value).length);
                                    }}
                                    placeholder="Enter your text here..."
                                    className="min-h-[200px] resize-none"
                                />
                            </div>
                            {inputText && (
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-gray-500">
                                        {inputText.length} characters
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {uploadFile ? 'Uploading file...' : 'Uploading text...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {!loading && (
                        <div className="space-y-3">
                            {uploadComplete ? (
                                <>
                                    <Button 
                                        onClick={() => {
                                            const link = `${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`;
                                            handleCopy(link, 'link');
                                        }}
                                        className="w-full"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Share Link
                                    </Button>
                                    <button
                                        onClick={resetUpload}
                                        className="w-full text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline"
                                    >
                                        Upload Another
                                    </button>
                                </>
                            ) : (
                                <Button 
                                    onClick={handleUpload} 
                                    className="w-full"
                                    disabled={uploadFile ? !selectedFile : !inputText}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {uploadFile ? 'Upload File' : 'Upload Text'}
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {uploadComplete && givenAccessCode && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Upload Successful
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="font-medium">Access Code</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={givenAccessCode} 
                                            readOnly 
                                            className="font-mono"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleCopy(givenAccessCode, 'accessCode')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="font-medium">Secret Word</Label>
                                    <div className="flex gap-2">
                                        <Input 
                                            type={showSecretWord ? "text" : "password"}
                                            value={secretWord} 
                                            readOnly 
                                            className="font-mono"
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => setShowSecretWord(!showSecretWord)}
                                        >
                                            {showSecretWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={() => handleCopy(secretWord, 'secretWord')}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <Button 
                                    variant="outline" 
                                    className="w-full"
                                    onClick={() => {
                                        const link = `${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`;
                                        handleCopy(link, 'link');
                                    }}
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Share Link
                                </Button>
                            </div>

                            <div className="flex flex-col items-center justify-center space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                                <div className="bg-white p-3 rounded border">
                                    <QRCode 
                                        size={120} 
                                        value={`${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`} 
                                    />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Scan to download
                                </p>
                            </div>
                        </div>

                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Important</AlertTitle>
                            <AlertDescription>
                                Store both the access code and secret word safely. If you lose them, your file cannot be recovered.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info className="w-5 h-5" />
                        Security Features
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center space-y-2">
                            <Shield className="w-6 h-6 mx-auto text-gray-600" />
                            <h3 className="font-medium text-sm">AES-256 Encryption</h3>
                            <p className="text-xs text-gray-500">
                                End-to-end encryption
                            </p>
                        </div>
                        <div className="text-center space-y-2">
                            <FileText className="w-6 h-6 mx-auto text-gray-600" />
                            <h3 className="font-medium text-sm">Auto-Delete</h3>
                            <p className="text-xs text-gray-500">
                                24 hour expiry
                            </p>
                        </div>
                        <div className="text-center space-y-2">
                            <Eye className="w-6 h-6 mx-auto text-gray-600" />
                            <h3 className="font-medium text-sm">Zero Knowledge</h3>
                            <p className="text-xs text-gray-500">
                                Server cannot decrypt
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}