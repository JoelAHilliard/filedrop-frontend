import { useEffect, useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CopyIcon, Download, File, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Lottie from "lottie-react";
import loadingAnimation from '../../assets/animation/loading.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import QRCode from "react-qr-code";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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
    // --------------------------------------------------------------

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
            alert("Please enter both access code and secret word.");
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
                console.log(`IV: ${ivB64}, Salt: ${saltB64}, Extension: ${extension}, Word: ${secW}`); // Debug log
                if (!ivB64 || !saltB64) {
                    throw new Error("Missing IV or salt in response header");
                }
                
                const encryptedBuffer = await response.arrayBuffer();
                const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
                const salt = new Uint8Array(base64ToArrayBuffer(saltB64));

                const decryptedBuffer = await decryptData(encryptedBuffer, secW, iv, salt);
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
                    a.target = '_blank';  // Prevent routing intercept
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }
            } else {
                const errorText = await response.text();
                alert('Failed to retrieve file: ' + errorText);
            }
        } catch (error) {
            console.error('Error during file retrieval:', error);
            alert('Error during file retrieval: ' + error.message);
        } finally {
            setLoading(false);
            setDownloadPageLoading(false);
        }
    };

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    function str2ab(str) {
        var buf = new ArrayBuffer(str.length);
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }

    const handleUpload = async (event) => {
        event.preventDefault();
        setDisplayText("");
        setLoading(true);

        // Generate secret word from the bip39 list
        const index = Math.floor(Math.random() * wordList.length);
        const sw = wordList[index].replace("\r","");
        console.log(sw)
        if (!sw) {
            alert("Secret word not available.");
            setLoading(false);
            return;
        }
        
        if (!uploadFile) {
            if(inputText === ''){
                alert("Make sure you input some text!");
                setLoading(false);
                return;
            }
            let buffer = str2ab(inputText);
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
                } else {
                    const errorText = await response.text();
                    alert('Upload failed: ' + errorText);
                }
            } catch (error) {
                console.error('Error during upload:', error);
                alert('Upload failed.');
            } finally {
                setLoading(false);
            }
        } else {
            if (!selectedFile) {
                alert("Please select a file first!");
                setLoading(false);
                return;
            }
    
            const maxFileSize = 100 * 1024 * 1024; // 50MB
            if (selectedFile.size > maxFileSize) {
                alert("File size exceeds the maximum limit of 50MB.");
                setLoading(false);
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
                } else {
                    const errorText = await response.text();
                    alert('Upload failed: ' + errorText);
                }
            } catch (error) {
                console.error('Error during upload:', error);
                alert('Upload failed.');
            } finally {
                setLoading(false);
            }
        }
    };

    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        setTakenAccessCode(text);
    };

    const handleSwitch = () => {
        setUploadFile(!uploadFile);
    };

    return (
        <div class="flex flex-col flex-1 justify-between items-between">
            <Tabs defaultValue={defaultTab || 'download'} className="w-[100%]">
                <TabsList>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="download">Download</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="w-full">
                    <div class="flex flex-col items-start w-full">
                        <div class="flex flex-row justify-between gap-4 items-center mt-2 mb-4 w-full">
                            <h1 class="text-lg font-bold flex flex-col sm:flex-row gap-2">
                                Upload file 
                                <span class="font-thin underline">
                                    {selectedFile && uploadFile ? selectedFile.name : null}
                                </span>
                            </h1>
                            <Button variant="ghost" size="sm" className="underline" onClick={handleSwitch}>
                                {uploadFile ? "Only need to upload text?" : "Back to file upload."}
                            </Button>
                        </div>
                        {uploadFile ? (
                            <div class="flex flex-col w-full">
                                <label className="flex items-center px-4 py-2 bg-muted dark:text-white text-black rounded-md cursor-pointer mx-auto w-full justify-center">
                                    <span className="mr-2 flex items-center gap-4">
                                        <File /> Choose File
                                    </span>
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                                <Button onClick={handleUpload} type="submit" className="gap-4 mt-2 flex">
                                    <Upload /> Upload File
                                </Button>
                            </div>
                        ) : (
                            <div class="w-full">
                                <form onSubmit={handleUpload} class="flex flex-col">
                                    <Textarea
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        placeholder="Enter text to upload"
                                        className="w-full my-2"
                                    />
                                    <Button type="submit" className="gap-4 mt-2 flex">
                                        <Upload /> Upload Text
                                    </Button>
                                </form>
                            </div>
                        )}
                        {loading && (
                            <div class="w-[100px]">
                                <Lottie animationData={loadingAnimation} loop={true} />
                            </div>
                        )}
                        {givenAccessCode && (
                            <div class="flex flex-col gap-2 items-start mt-4 w-full">
                                <div class="flex flex-col sm:flex-row items-center text-start rounded-lg gap-1 font-bold w-full justify-between">
                                    <div>
                                        <span class="flex items-center px-1 bg-muted rounded p-3">
                                            <div class="flex gap-6">
                                                <span class="flex flex-col gap-2">
                                                    <Label className="underline">Access Code</Label>
                                                    {givenAccessCode}
                                                </span>
                                                <span class="flex flex-col gap-2">
                                                    <Label className="underline">Secret Word</Label>
                                                    {secretWord}
                                                </span>
                                            </div>
                                            <Button size="icon" variant="ghost" className="hover:bg-background m-1" onClick={() => {
                                                const link = `${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`;
                                                navigator.clipboard.writeText(link);
                                                toast({ title: "Link copied: " + givenAccessCode });
                                            }}>
                                                <CopyIcon />
                                            </Button>
                                        </span>
                                    </div>
                                    <QRCode size={128} value={`${window.location.origin}/?ac=${givenAccessCode}&sw=${secretWord}`} />
                                </div>
                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Heads up!</AlertTitle>
                                    <AlertDescription>
                                        If you lose this code, your file is gone. We don't have access to it.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="download" className="w-full">
                    <div class="flex flex-col items-start w-full">
                        <h1 class="text-lg font-bold mt-3 mb-4 w-full">Retrieve File</h1>
                        <div class="flex gap-2 items-center w-full">
                            <div class="flex flex-row gap-2 w-full">
                                <div class="w-[50%]">
                                    <Label htmlFor="acc_code">Access Code</Label>
                                    <Input id="acc_code" value={takenAccessCode} placeholder="Ex. ro23" type="text" onChange={(e) => setTakenAccessCode(e.target.value)} /> 
                                </div>
                                <div class="w-[50%]">
                                    <Label htmlFor="secret_word">Secret Word</Label>
                                    <Input id="secret_word" value={takenSecretWord} placeholder="Ex. motion" type="text" onChange={(e) => setTakenSecretWord(e.target.value)} /> 
                                </div>
                            </div>
                        </div>
                        {displayText !== "" && !downloadPageLoading && (
                            <div className="w-full">
                                <label>Results</label>
                                <Textarea
                                    value={displayText}
                                    className="w-full h-[250px] p-4"
                                    readOnly
                                />
                            </div>
                        )}
                        {loading && (
                            <div className="w-24 h-24 mt-4 mx-auto">
                                <Lottie animationData={loadingAnimation} loop={true} />
                            </div>
                        )}
                        <Button onClick={() => handleRetrieveFile()} className="gap-4 mt-2 flex w-full">
                            <Download /> Retrieve File
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
