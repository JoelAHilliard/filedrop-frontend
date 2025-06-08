import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Copy, Download, File, Upload, FileText, Shield, Eye, EyeOff, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QRCode from "react-qr-code";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
    const URL = "https://dropit-backend-production.up.railway.app/";
    const [selectedFile, setSelectedFile] = useState(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [takenAccessCode, setTakenAccessCode] = useState('');
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(true);
    const [wordList, setWordList] = useState([]);
    const [secretWord, setSecretWord] = useState('');
    const [takenSecretWord, setTakenSecretWord] = useState('');
    const [displayText, setDisplayText] = useState("");
    const [defaultTab, setDefaultTab] = useState(new URLSearchParams(window.location.search).get('ac') ? 'download' : 'upload');
    
    const [showSecretWord, setShowSecretWord] = useState(false);
    const [fileSize, setFileSize] = useState(0);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [downloadComplete, setDownloadComplete] = useState(false);
    const [downloadedFileInfo, setDownloadedFileInfo] = useState(null);

    const { toast } = useToast();

    useEffect(() => {
        checkForURLCode();
        fetch("/bip39.txt")
            .then((response) => response.text())
            .then((data) => {
                const words = data.split("\n");
                setWordList(words);
            });
    }, []);

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    async function encryptData(buffer, secretWord) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secretWord),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-CBC', length: 256 },
          true,
          ['encrypt']
        );
        const encryptedBuffer = await crypto.subtle.encrypt(
          { name: 'AES-CBC', iv },
          key,
          buffer
        );
        return { encryptedBuffer, iv, salt };
    }
      
    async function decryptData(encryptedBuffer, secretWord, iv, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(secretWord),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
          { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
          keyMaterial,
          { name: 'AES-CBC', length: 256 },
          true,
          ['decrypt']
        );
        const decryptedBuffer = await crypto.subtle.decrypt(
          { name: 'AES-CBC', iv },
          key,
          encryptedBuffer
        );
        return decryptedBuffer;
    }

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        bytes.forEach((b) => binary += String.fromCharCode(b));
        return window.btoa(binary);
    }

    function base64ToArrayBuffer(base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for(let i = 0; i < len; i++){
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }

    const checkForURLCode = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('ac');
        const sw = queryParams.get('sw');
        if (code && sw) {
            setTakenAccessCode(code); 
            setTakenSecretWord(sw);
            handleRetrieveFile(code, sw);
        }
    };

    const handleRetrieveFile = async (accessCode, sw) => {
        let code = accessCode ? accessCode : takenAccessCode;
        let secW = sw ? sw : takenSecretWord;
        if (!code || !secW) {
            toast({
                title: "Missing Information",
                description: "Please enter both access code and secret word.",
                variant: "destructive"
            });
            return;
        }
        
        setLoading(true);
        setDownloadComplete(false);
        try {
            const response = await fetch(`${URL}/retrieve?accessCode=${code}`, {
                method: 'GET'
            });
            if (response.ok) {
                const ivB64 = response.headers.get('X-IV');
                const saltB64 = response.headers.get('X-SALT');
                const extension = response.headers.get('X-EXTENSION') || 'bin';
                
                if (!ivB64 || !saltB64) {
                    throw new Error("Missing encryption parameters");
                }
                
                const encryptedBuffer = await response.arrayBuffer();
                const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
                const salt = new Uint8Array(base64ToArrayBuffer(saltB64));

                const decryptedBuffer = await decryptData(encryptedBuffer, secW, iv, salt);
                setFileSize(decryptedBuffer.byteLength);
                
                const downloadInfo = {
                    fileName: `file.${extension}`,
                    fileType: extension === 'txt' ? 'Text Document' : 'Binary File',
                    size: decryptedBuffer.byteLength,
                    extension: extension,
                    downloadTime: new Date().toLocaleString()
                };
                
                if (extension === 'txt') {
                    const decoder = new TextDecoder();
                    const textContent = decoder.decode(decryptedBuffer);
                    setDisplayText(textContent);
                    downloadInfo.isText = true;
                } else {
                    const blob = new Blob([decryptedBuffer], { type: 'application/octet-stream' });
                    const url = window.URL.createObjectURL(blob);
                    
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = `file.${extension}`;
                    a.target = '_blank';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    downloadInfo.isText = false;
                }
                
                setDownloadedFileInfo(downloadInfo);
                setDownloadComplete(true);
                
                toast({
                    title: "Success",
                    description: "File retrieved successfully.",
                });
            } else {
                const errorText = await response.text();
                toast({
                    title: "Retrieval Failed",
                    description: errorText,
                    variant: "destructive"
                });
            }
        } catch (error) {
            console.error('Error during file retrieval:', error);
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setSelectedFile(file);
        if (file) {
            setFileSize(file.size);
        }
    };

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    const resetUpload = () => {
        setUploadComplete(false);
        setGivenAccessCode('');
        setSecretWord('');
        setSelectedFile(null);
        setInputText('');
        setFileSize(0);
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        setDisplayText("");
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

    const handleCopy = async (text, type) => {
        await navigator.clipboard.writeText(text);
        const messages = {
            accessCode: "Access code copied to clipboard",
            secretWord: "Secret word copied to clipboard",
            link: "Share link copied to clipboard"
        };
        toast({ title: "Copied", description: messages[type] });
    };

    return (
        <div className="min-h-screen pb-6  sm:pb-8 transition-all duration-300">
            <div className=" mx-auto">

                <Tabs defaultValue={defaultTab || 'upload'} className="w-full">
                    {/* Fixed tabs with proper sizing */}
                    <TabsList className="grid w-full grid-cols-2 mb-6 h-10 p-1">
                        <TabsTrigger 
                            value="upload" 
                            className="flex items-center justify-center gap-2 text-sm py-2 px-3 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                        >
                            <Upload className="w-4 h-4" />
                            <span>Upload</span>
                        </TabsTrigger>
                        <TabsTrigger 
                            value="download" 
                            className="flex items-center justify-center gap-2 text-sm py-2 px-3 transition-all duration-200 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
                        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardHeader className="pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="animate-in slide-in-from-left duration-300">
                                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                            {uploadFile ? <File className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            {uploadFile ? 'Upload File' : 'Upload Text'}
                                        </CardTitle>
                                        <CardDescription className="text-sm mt-1">
                                            {uploadFile ? 'Upload any file up to 100MB' : 'Upload text content'}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={() => setUploadFile(!uploadFile)}
                                        className="w-full sm:w-auto h-10 transition-all duration-200 hover:scale-105"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        {uploadFile ? "Text Mode" : "File Mode"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {uploadFile ? (
                                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 sm:p-8 text-center min-h-[200px] flex flex-col justify-center transition-all duration-300 hover:border-gray-400 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                                        {selectedFile ? (
                                            <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                                                <File className="w-16 h-16 mx-auto text-gray-600" />
                                                <div className="space-y-2">
                                                    <p className="font-medium text-sm sm:text-base break-all px-2">
                                                        {selectedFile.name}
                                                    </p>
                                                    <Badge variant="secondary" className="text-xs sm:text-sm">
                                                        {formatFileSize(selectedFile.size)}
                                                    </Badge>
                                                </div>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => setSelectedFile(null)}
                                                    className="mt-2 transition-all duration-200 hover:scale-105"
                                                >
                                                    Change File
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                                                <Upload className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" />
                                                <div className="space-y-2">
                                                    <p className="text-base sm:text-lg font-medium">Drop your file here</p>
                                                    <p className="text-gray-500 text-sm">or tap to browse</p>
                                                </div>
                                                <label className="inline-flex items-center justify-center px-6 py-3 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-all duration-200 hover:scale-105 min-h-[44px] text-sm sm:text-base font-medium w-full sm:w-auto">
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
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-300">
                                        <div>
                                            <Label htmlFor="text-input" className="mb-3 block text-sm sm:text-base font-medium">
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
                                                className="min-h-[200px] resize-none text-sm sm:text-base transition-all duration-200"
                                            />
                                        </div>
                                        {inputText && (
                                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 animate-in fade-in slide-in-from-bottom duration-300">
                                                <Badge variant="outline" className="text-xs">
                                                    {formatFileSize(fileSize)}
                                                </Badge>
                                                <Badge variant="outline" className="text-xs">
                                                    {inputText.length} characters
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {loading && (
                                    <div className="flex items-center justify-center py-8 sm:py-12 animate-in fade-in duration-300">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
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
                                                    className="w-full h-12 text-sm sm:text-base font-medium transition-all duration-200 hover:scale-105"
                                                >
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Copy Share Link
                                                </Button>
                                                <button
                                                    onClick={resetUpload}
                                                    className="w-full text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 underline transition-colors duration-200"
                                                >
                                                    Upload Another File
                                                </button>
                                            </>
                                        ) : (
                                            <Button 
                                                onClick={handleUpload} 
                                                className="w-full h-12 text-sm sm:text-base font-medium transition-all duration-200 hover:scale-105"
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
                            <Card className="shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        Upload Successful
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        Your file has been encrypted and uploaded securely
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-6">
                                        <div className="space-y-4">
                                            <div className="space-y-3 animate-in slide-in-from-left duration-300">
                                                <Label className="text-sm font-medium">Access Code</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        value={givenAccessCode} 
                                                        readOnly 
                                                        className="font-mono text-sm sm:text-base h-12"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleCopy(givenAccessCode, 'accessCode')}
                                                        className="h-12 w-12 flex-shrink-0 transition-all duration-200 hover:scale-110"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-3 animate-in slide-in-from-left duration-300 delay-100">
                                                <Label className="text-sm font-medium">Secret Word</Label>
                                                <div className="flex gap-2">
                                                    <Input 
                                                        type={showSecretWord ? "text" : "password"}
                                                        value={secretWord} 
                                                        readOnly 
                                                        className="font-mono text-sm sm:text-base h-12"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => setShowSecretWord(!showSecretWord)}
                                                        className="h-12 w-12 flex-shrink-0 transition-all duration-200 hover:scale-110"
                                                    >
                                                        {showSecretWord ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => handleCopy(secretWord, 'secretWord')}
                                                        className="h-12 w-12 flex-shrink-0 transition-all duration-200 hover:scale-110"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button 
                                                variant="outline" 
                                                className="w-full h-12 text-sm sm:text-base transition-all duration-200 hover:scale-105 animate-in slide-in-from-bottom duration-300 delay-200"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`;
                                                    handleCopy(link, 'link');
                                                }}
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Copy Share Link
                                            </Button>
                                        </div>

                                        {/* QR Code - Mobile optimized with subtle animation */}
                                        <div className="flex flex-col items-center justify-center space-y-4 bg-gray-50 dark:bg-gray-800 rounded-lg p-6 animate-in zoom-in duration-500 delay-300">
                                            <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm">
                                                <QRCode 
                                                    size={120} 
                                                    value={`${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`} 
                                                />
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                                                Scan to download
                                            </p>
                                        </div>
                                    </div>

                                    <Alert className="animate-in slide-in-from-bottom duration-300 delay-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle className="text-sm sm:text-base">Important</AlertTitle>
                                        <AlertDescription className="text-xs sm:text-sm">
                                            Store both the access code and secret word safely. If you lose them, your file cannot be recovered.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                        )}

                        {/* Security features with subtle animation */}
                        <Card className="shadow-lg animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Info className="w-5 h-5" />
                                    Security Features
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6">
                                    <div className="text-center space-y-3 p-4 sm:p-0 animate-in fade-in slide-in-from-bottom duration-300 delay-100">
                                        <Shield className="w-8 h-8 mx-auto text-gray-600" />
                                        <h3 className="font-semibold text-sm sm:text-base">AES-256 Encryption</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            Military-grade encryption before upload
                                        </p>
                                    </div>
                                    <div className="text-center space-y-3 p-4 sm:p-0 animate-in fade-in slide-in-from-bottom duration-300 delay-200">
                                        <FileText className="w-8 h-8 mx-auto text-gray-600" />
                                        <h3 className="font-semibold text-sm sm:text-base">Auto-Delete</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            Files deleted after 24 hours
                                        </p>
                                    </div>
                                    <div className="text-center space-y-3 p-4 sm:p-0 animate-in fade-in slide-in-from-bottom duration-300 delay-300">
                                        <Eye className="w-8 h-8 mx-auto text-gray-600" />
                                        <h3 className="font-semibold text-sm sm:text-base">Zero Knowledge</h3>
                                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                                            We cannot access your files
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="download" className="space-y-6 animate-in fade-in slide-in-from-bottom duration-300">
                        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                    <Download className="w-5 h-5" />
                                    Download File
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    Enter your access code and secret word to retrieve your file
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
                                    <div className="space-y-3 animate-in slide-in-from-left duration-300">
                                        <Label htmlFor="access-code" className="text-sm font-medium">Access Code</Label>
                                        <Input 
                                            id="access-code"
                                            value={takenAccessCode} 
                                            placeholder="e.g., ro23" 
                                            onChange={(e) => setTakenAccessCode(e.target.value)}
                                            className="font-mono text-sm sm:text-base h-12 transition-all duration-200"
                                        />
                                    </div>

                                    <div className="space-y-3 animate-in slide-in-from-right duration-300">
                                        <Label htmlFor="secret-word" className="text-sm font-medium">Secret Word</Label>
                                        <Input 
                                            id="secret-word"
                                            value={takenSecretWord} 
                                            placeholder="e.g., motion" 
                                            onChange={(e) => setTakenSecretWord(e.target.value)}
                                            className="font-mono text-sm sm:text-base h-12 transition-all duration-200"
                                        />
                                    </div>
                                </div>

                                {loading && (
                                    <div className="flex items-center justify-center py-8 sm:py-12 animate-in fade-in duration-300">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                                                Decrypting and retrieving your file...
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!loading && (
                                    <Button 
                                        onClick={() => handleRetrieveFile()} 
                                        className="w-full h-12 text-sm sm:text-base font-medium transition-all duration-200 hover:scale-105"
                                        disabled={!takenAccessCode || !takenSecretWord}
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Retrieve File
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Retrieved text content - moved above download stats */}
                        {displayText !== "" && downloadComplete && (
                            <Card className="shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
                                <CardHeader className="pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                            <FileText className="w-5 h-5" />
                                            Retrieved Text Content
                                        </CardTitle>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(displayText);
                                                toast({ title: "Copied", description: "Text copied to clipboard" });
                                            }}
                                            className="w-full sm:w-auto h-10 transition-all duration-200 hover:scale-105"
                                        >
                                            <Copy className="w-4 h-4 mr-2" />
                                            Copy
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Textarea
                                        value={displayText}
                                        className="min-h-[250px] sm:min-h-[300px] font-mono text-xs sm:text-sm resize-none bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                                        readOnly
                                    />
                                </CardContent>
                            </Card>
                        )}

                        {downloadComplete && downloadedFileInfo && (
                            <Card className="shadow-lg animate-in fade-in slide-in-from-bottom duration-500">
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        Download Successful
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        Your file has been decrypted and {downloadedFileInfo.isText ? 'displayed above' : 'downloaded'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                        <div className="text-center space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105 animate-in fade-in duration-300">
                                            <File className="w-5 h-5 mx-auto text-gray-600" />
                                            <p className="text-xs font-medium">File Name</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                                                {downloadedFileInfo.fileName}
                                            </p>
                                        </div>
                                        <div className="text-center space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105 animate-in fade-in duration-300 delay-100">
                                            <FileText className="w-5 h-5 mx-auto text-gray-600" />
                                            <p className="text-xs font-medium">Type</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {downloadedFileInfo.fileType}
                                            </p>
                                        </div>
                                        <div className="text-center space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105 animate-in fade-in duration-300 delay-200">
                                            <Shield className="w-5 h-5 mx-auto text-gray-600" />
                                            <p className="text-xs font-medium">Size</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                {formatFileSize(downloadedFileInfo.size)}
                                            </p>
                                        </div>
                                        <div className="text-center space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg transition-all duration-200 hover:scale-105 animate-in fade-in duration-300 delay-300">
                                            <CheckCircle className="w-5 h-5 mx-auto text-green-600" />
                                            <p className="text-xs font-medium">Status</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">
                                                Complete
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}