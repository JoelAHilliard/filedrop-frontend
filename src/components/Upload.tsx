import { useState, useEffect } from "preact/hooks";
import { Upload, CopyIcon, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import QRCode from "react-qr-code";
import FileDropZone from "./FileDropZone";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion } from 'framer-motion';

const URL = "https://api.filedrop.xyz";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

export function UploadTab() {
    const [state, setState] = useState({
        selectedFile: null,
        givenAccessCode: '',
        selectedFileName: '',
        loading: false,
        wordList: [],
        inputText: '',
        secretWord: null,
        uploadProgress: 0,
        uploadSuccess: false,
        isTextMode: false,
    });

    const { toast } = useToast();

    useEffect(() => {
        fetch("/bip39.txt")
            .then((response) => response.text())
            .then((data) => {
                setState(prev => ({ ...prev, wordList: data.split("\n") }));
            });
    }, []);

    const handleFileChange = (files) => {
        setState(prev => ({
            ...prev,
            selectedFile: files[0],
            selectedFileName: files[0]?.name || ''
        }));
    };

    const handleUpload = async (event) => {
        event.preventDefault();
        setState(prev => ({ ...prev, loading: true, uploadProgress: 0, uploadSuccess: false }));

        const index = Math.floor((Math.random() * 2048));
        const sw = state.wordList[index];

        // Simulate upload progress
        const progressInterval = setInterval(() => {
            setState(prev => ({
                ...prev,
                uploadProgress: Math.min(prev.uploadProgress + 10, 90)
            }));
        }, 500);

        try {
            if (!state.isTextMode && state.selectedFile) {
                if (state.selectedFile.size > MAX_FILE_SIZE) {
                    toast({
                        variant: "destructive",
                        title: "File too large",
                        description: "File size exceeds the maximum limit of 50MB.",
                    });
                    return;
                }
                let fileData = await state.selectedFile.arrayBuffer();
                await uploadData(fileData, state.selectedFile.type, sw);
            } else if (state.isTextMode && state.inputText) {
                await uploadData(str2ab(state.inputText), 'text/plain', sw);
            } else {
                toast({
                    variant: "destructive",
                    title: "No content",
                    description: "Please select a file or enter some text.",
                });
                return;
            }
            clearInterval(progressInterval);
            setState(prev => ({ ...prev, uploadProgress: 100, uploadSuccess: true }));
        } catch (error) {
            clearInterval(progressInterval);
            console.error('Error during upload:', error);
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: "There was an error uploading your content.",
            });
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    const uploadData = async (data, type, secretWord) => {
        const formData = new FormData();
        formData.append('file', new Blob([data]), state.isTextMode ? 'txt' : state.selectedFile.name);
        formData.append('type', type);
        formData.append('secretWord', secretWord);

        try {
            const response = await fetch(`${URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            
            if (response.ok) {
                const data = await response.json();
                setState(prev => ({
                    ...prev,
                    givenAccessCode: data.key,
                    secretWord: secretWord,
                    loading: false
                }));
            } else {
                const errorText = await response.text();
                alert('Upload failed: ' + errorText);
            }
        } catch (error) {
            console.error('Error during upload:', error);
            alert('Upload failed');
        } finally {
            setState(prev => ({ ...prev, loading: false }));
        }
    };

    return (
        <div className="w-full mx-auto space-y-2 my-3">
            <div className="flex items-center space-x-2 mt-2">
                <Switch
                    id="text-mode"
                    checked={state.isTextMode}
                    onCheckedChange={(checked) => setState(prev => ({ ...prev, isTextMode: checked }))}
                />
                <Label htmlFor="text-mode">Text Mode</Label>
            </div>

            {state.isTextMode ? (
                <Textarea
                    value={state.inputText}
                    onChange={(e) => setState(prev => ({ ...prev, inputText: e.target.value }))}
                    placeholder="Enter your text here..."
                    className="w-full"
                />
            ) : (
                <>
                    <FileDropZone onChange={handleFileChange} />
                    {state.selectedFileName && (
                        <p className="text-sm text-muted-foreground mt-2">Selected: {state.selectedFileName}</p>
                    )}
                </>
            )}

            <Button disabled={state.loading} onClick={handleUpload} type="submit" className="w-full">
                <Upload className="mr-2 h-4 w-4" /> Upload {state.isTextMode ? "Text" : "File"}
            </Button>

            {state.loading && (
                <Progress value={state.uploadProgress} className="w-full" />
            )}

            {state.uploadSuccess && (
                <Alert variant="success" className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Upload Successful</AlertTitle>
                    <AlertDescription>
                        Your content has been uploaded successfully.
                    </AlertDescription>
                </Alert>
            )}

            {state.givenAccessCode && (
                <UploadResult 
                    givenAccessCode={state.givenAccessCode} 
                    secretWord={state.secretWord} 
                />
            )}
        </div>
    );
}

function UploadResult({ givenAccessCode, secretWord }) {
    const { toast } = useToast();

    return (
        <Card className="w-full">
            <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                    <p className="text-sm font-medium">Access Code</p>
                    <p className="text-lg font-bold">{givenAccessCode}</p>
                    <p className="text-sm font-medium">Secret Word</p>
                    <p className="text-lg font-bold">{secretWord}</p>
                </div>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                        const link = `https://filedrop.xyz/?ac=${givenAccessCode}&sw=${secretWord}`;
                        navigator.clipboard.writeText(link);
                        toast({
                            title: "Link copied",
                            description: `Access code: ${givenAccessCode}`,
                        });
                    }}
                >
                    <CopyIcon className="mr-2 h-4 w-4" /> Copy Link
                </Button>
                <QRCode
                    size={128}
                    value={`https://filedrop.xyz/?ac=${givenAccessCode}&sw=${secretWord}`}
                    className="mx-auto"
                />
                <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription>
                        If you lose this code, your file will be inaccessible. We don't have access to it.
                    </AlertDescription>
                </Alert>
            </CardContent>
        </Card>
    );
}

function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function UploadBox() {
    const handleFileChange = (event) => {
        // Implement file change logic here
    };

    return (
        <div className="relative w-64 h-64 group">
            <div className="absolute inset-0 bg-blue-500 opacity-75 rounded-lg blur-sm animate-pulse"></div>
            <div className="relative w-full h-full border-gray-300 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden bg-white transition-transform duration-300 ease-in-out group-hover:scale-105">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="text-center">
                    <p className="text-gray-500">Drop your file here or click to upload</p>
                </div>
            </div>
        </div>
    );
}