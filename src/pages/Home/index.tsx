import { useEffect, useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CopyIcon, Download, File, Upload, FileText, HardDrive, Clock, Shield, Eye, EyeOff, RefreshCw, CheckCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Lottie from "lottie-react";
import loadingAnimation from '../../assets/animation/loading.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QRCode from "react-qr-code";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export function Home() {
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
    const [downloadPageLoading, setDownloadPageLoading] = useState(false);
    
    // New state for enhanced features
    const [uploadProgress, setUploadProgress] = useState(0);
    const [showSecretWord, setShowSecretWord] = useState(false);
    const [fileSize, setFileSize] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const [uploadComplete, setUploadComplete] = useState(false);
    const [estimatedExpiry, setEstimatedExpiry] = useState('');

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

    // Utility function to format file size
    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Drag and drop handlers
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setSelectedFile(e.dataTransfer.files[0]);
            setFileSize(e.dataTransfer.files[0].size);
        }
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

    // Utility functions to convert ArrayBuffer to Base64 and vice versa
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
            setDownloadPageLoading(true);
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
        try {
            const response = await fetch(`${URL}/retrieve?accessCode=${code}`, {
                method: 'GET'
            });
            if (response.ok) {
                const ivB64 = response.headers.get('X-IV');
                const saltB64 = response.headers.get('X-SALT');
                const extension = response.headers.get('X-EXTENSION') || 'bin';
                console.log(`IV: ${ivB64}, Salt: ${saltB64}, Extension: ${extension}, Word: ${secW}`);
                if (!ivB64 || !saltB64) {
                    throw new Error("Missing IV or salt in response header");
                }
                
                const encryptedBuffer = await response.arrayBuffer();
                const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
                const salt = new Uint8Array(base64ToArrayBuffer(saltB64));

                const decryptedBuffer = await decryptData(encryptedBuffer, secW, iv, salt);
                setFileSize(decryptedBuffer.byteLength);
                
                if (extension === 'txt') {
                    const decoder = new TextDecoder();
                    setDisplayText(decoder.decode(decryptedBuffer));
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
                }
                
                toast({
                    title: "Success!",
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
            setDownloadPageLoading(false);
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

    const simulateProgress = () => {
        setUploadProgress(0);
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 90) {
                    clearInterval(interval);
                    return prev;
                }
                return prev + Math.random() * 20;
            });
        }, 200);
        return interval;
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        setDisplayText("");
        setLoading(true);
        setUploadComplete(false);
        
        const progressInterval = simulateProgress();

        // Generate secret word from the bip39 list
        const index = Math.floor(Math.random() * wordList.length);
        const sw = wordList[index].replace("\r","");
        console.log(sw)
        if (!sw) {
            toast({
                title: "Error",
                description: "Secret word not available.",
                variant: "destructive"
            });
            setLoading(false);
            clearInterval(progressInterval);
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
                clearInterval(progressInterval);
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
                    setUploadProgress(100);
                    setUploadComplete(true);
                    setEstimatedExpiry(new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString());
                    toast({
                        title: "Upload Successful!",
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
                clearInterval(progressInterval);
            }
        } else {
            if (!selectedFile) {
                toast({
                    title: "No File Selected",
                    description: "Please select a file to upload.",
                    variant: "destructive"
                });
                setLoading(false);
                clearInterval(progressInterval);
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
                clearInterval(progressInterval);
                return;
            }
    
            let fileData = await selectedFile.arrayBuffer();
            const { encryptedBuffer, iv, salt } = await encryptData(fileData, sw);
            console.log({ encryptedBuffer, iv, salt, sw })
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
                    setUploadProgress(100);
                    setUploadComplete(true);
                    setEstimatedExpiry(new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString());
                    toast({
                        title: "Upload Successful!",
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
                clearInterval(progressInterval);
            }
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setTakenAccessCode(text);
            toast({
                title: "Pasted!",
                description: "Access code pasted from clipboard.",
            });
        } catch (err) {
            toast({
                title: "Paste Failed",
                description: "Could not read from clipboard.",
                variant: "destructive"
            });
        }
    };

    const handleSwitch = () => {
        setUploadFile(!uploadFile);
        setFileSize(0);
        setSelectedFile(null);
        setInputText('');
    };

    const generateNewSecretWord = () => {
        if (wordList.length > 0) {
            const index = Math.floor(Math.random() * wordList.length);
            const newWord = wordList[index].replace("\r","");
            setSecretWord(newWord);
        }
    };

    return (
        <div className="min-h-screen dark:from-slate-900 dark:to-slate-800">
            <div className="py-8">
                <Tabs defaultValue={defaultTab || 'upload'} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            Upload
                        </TabsTrigger>
                        <TabsTrigger value="download" className="flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Download
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="upload" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="flex items-center gap-2">
                                            {uploadFile ? <File className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            {uploadFile ? 'Upload File' : 'Upload Text'}
                                        </CardTitle>
                                        <CardDescription>
                                            {uploadFile ? 'Securely upload any file up to 100MB' : 'Securely upload text content'}
                                        </CardDescription>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleSwitch}
                                        className="flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        {uploadFile ? "Text Mode" : "File Mode"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {uploadFile ? (
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                                            dragActive 
                                                ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
                                                : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                        onDragEnter={handleDrag}
                                        onDragLeave={handleDrag}
                                        onDragOver={handleDrag}
                                        onDrop={handleDrop}
                                    >
                                        {selectedFile ? (
                                            <div className="space-y-2">
                                                <File className="w-12 h-12 mx-auto text-green-600" />
                                                <p className="font-medium">{selectedFile.name}</p>
                                                <Badge variant="secondary">
                                                    {formatFileSize(selectedFile.size)}
                                                </Badge>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <Upload className="w-12 h-12 mx-auto text-slate-400" />
                                                <div>
                                                    <p className="text-lg font-medium">Drop your file here</p>
                                                    <p className="text-slate-500">or click to browse</p>
                                                </div>
                                                <label className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors">
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
                                            <Label htmlFor="text-input" className="flex items-center gap-2 mb-2">
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
                                            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                                                <Badge variant="outline">
                                                    <HardDrive className="w-3 h-3 mr-1" />
                                                    {formatFileSize(fileSize)}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {inputText.length} characters
                                                </Badge>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {loading && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center">
                                            <div className="w-16 h-16">
                                                <Lottie animationData={loadingAnimation} loop={true} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>Uploading...</span>
                                                <span>{Math.round(uploadProgress)}%</span>
                                            </div>
                                            <Progress value={uploadProgress} className="w-full" />
                                        </div>
                                    </div>
                                )}

                                {!loading && (
                                    <Button 
                                        onClick={handleUpload} 
                                        className="w-full flex items-center gap-2"
                                        disabled={uploadFile ? !selectedFile : !inputText}
                                    >
                                        <Upload className="w-4 h-4" />
                                        {uploadFile ? 'Upload File' : 'Upload Text'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {uploadComplete && givenAccessCode && (
                            <Card className="">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-700 dark:text-green-400" />
                                        Upload Successful!
                                    </CardTitle>
                                    <CardDescription>
                                        Your file has been encrypted and uploaded securely
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4" />
                                                    Access Code
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        value={givenAccessCode} 
                                                        readOnly 
                                                        className="font-mono text-lg"
                                                    />
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(givenAccessCode);
                                                            toast({ title: "Copied!", description: "Access code copied to clipboard" });
                                                        }}
                                                    >
                                                        <CopyIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-2">
                                                    <Shield className="w-4 h-4" />
                                                    Secret Word
                                                </Label>
                                                <div className="flex items-center gap-2">
                                                    <Input 
                                                        type={showSecretWord ? "text" : "password"}
                                                        value={secretWord} 
                                                        readOnly 
                                                        className="font-mono text-lg"
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
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(secretWord);
                                                            toast({ title: "Copied!", description: "Secret word copied to clipboard" });
                                                        }}
                                                    >
                                                        <CopyIcon className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button 
                                                variant="outline" 
                                                className="w-full"
                                                onClick={() => {
                                                    const link = `${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`;
                                                    navigator.clipboard.writeText(link);
                                                    toast({ title: "Link copied!", description: "Share this link to allow downloads" });
                                                }}
                                            >
                                                <CopyIcon className="w-4 h-4 mr-2" />
                                                Copy Share Link
                                            </Button>
                                        </div>

                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className="bg-white p-4 rounded-lg">
                                                <QRCode 
                                                    size={128} 
                                                    value={`${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`} 
                                                />
                                            </div>
                                            <p className="text-sm text-center text-slate-600 dark:text-slate-400">
                                                Scan to download
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div className="space-y-1">
                                            <HardDrive className="w-6 h-6 mx-auto text-slate-500" />
                                            <p className="text-sm font-medium">File Size</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {formatFileSize(fileSize)}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Shield className="w-6 h-6 mx-auto text-green-500" />
                                            <p className="text-sm font-medium">Encrypted</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                AES-256
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <Clock className="w-6 h-6 mx-auto text-blue-500" />
                                            <p className="text-sm font-medium">Expires</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {estimatedExpiry}
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <CheckCircle className="w-6 h-6 mx-auto text-green-500" />
                                            <p className="text-sm font-medium">Status</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                Ready
                                            </p>
                                        </div>
                                    </div>

                                    <Alert>
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Important Security Notice</AlertTitle>
                                        <AlertDescription>
                                            Store both the access code and secret word safely. If you lose them, your file cannot be recovered. 
                                            We use zero-knowledge encryption and cannot access your data.
                                        </AlertDescription>
                                    </Alert>
                                </CardContent>
                            </Card>
                            
                        )}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="w-5 h-5" />
                                    How It Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-6 text-center">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                                            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold">End-to-End Encryption</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Files are encrypted with AES-256 before leaving your device
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                                            <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="font-semibold">Temporary Storage</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Files are automatically deleted after 24 hours
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                                            <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <h3 className="font-semibold">Zero Knowledge</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            We never have access to your files or encryption keys
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="download" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Download className="w-5 h-5" />
                                    Download File
                                </CardTitle>
                                <CardDescription>
                                    Enter your access code and secret word to retrieve your file
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="access-code" className="flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Access Code
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input 
                                                id="access-code"
                                                value={takenAccessCode} 
                                                placeholder="e.g., ro23" 
                                                onChange={(e) => setTakenAccessCode(e.target.value)}
                                                className="font-mono"
                                            />
                                           
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="secret-word" className="flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Secret Word
                                        </Label>
                                        <Input 
                                            id="secret-word"
                                            value={takenSecretWord} 
                                            placeholder="e.g., motion" 
                                            onChange={(e) => setTakenSecretWord(e.target.value)}
                                            className="font-mono"
                                        />
                                    </div>
                                </div>

                                {loading && (
                                    <div className="flex flex-col items-center space-y-4 py-8">
                                        <div className="w-16 h-16">
                                            <Lottie animationData={loadingAnimation} loop={true} />
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            Decrypting and retrieving your file...
                                        </p>
                                    </div>
                                )}

                                {displayText !== "" && !downloadPageLoading && (
                                    <Card>
                                        <CardHeader className="px-6 py-2">
                                            <CardTitle className="flex items-center gap-2 p-1">
                                                <FileText className="w-5 h-5 text-green-700 dark:text-green-400" />
                                                Retrieved Text Content
                                            </CardTitle>
                                            <CardDescription className="flex items-center gap-4">
                                                <Badge variant="outline">
                                                    <HardDrive className="w-3 h-3 mr-1" />
                                                    {formatFileSize(fileSize)}
                                                </Badge>
                                                <Badge variant="outline">
                                                    {displayText.length} characters
                                                </Badge>
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="relative">
                                                <Textarea
                                                    value={displayText}
                                                    className="min-h-[300px] font-mono text-sm resize-none"
                                                    readOnly
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="absolute top-2 right-2"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(displayText);
                                                        toast({ title: "Copied!", description: "Text copied to clipboard" });
                                                    }}
                                                >
                                                    <CopyIcon className="w-4 h-4 mr-1" />
                                                    Copy
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {!loading && (
                                    <Button 
                                        onClick={() => handleRetrieveFile()} 
                                        className="w-full flex items-center gap-2"
                                        disabled={!takenAccessCode || !takenSecretWord}
                                    >
                                        <Download className="w-4 h-4" />
                                        Retrieve File
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="w-5 h-5" />
                                    How It Works
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-3 gap-6 text-center">
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                                            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h3 className="font-semibold">End-to-End Encryption</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Files are encrypted with AES-256 before leaving your device
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                                            <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <h3 className="font-semibold">Temporary Storage</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            Files are automatically deleted after 24 hours
                                        </p>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                                            <Eye className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <h3 className="font-semibold">Zero Knowledge</h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            We never have access to your files or encryption keys
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}