import { useEffect, useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ClipboardIcon, CopyIcon, Download, File, Terminal, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Lottie from "lottie-react";
import loadingAnimation from '../../assets/animation/loading.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import QRCode from "react-qr-code";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export function Home() {
    // const URL = "https://drop-it.up.railway.app";
    const URL = "https://api.filedrop.xyz";
    // const URL = "http://localhost:4000";
    const [selectedFile, setSelectedFile] = useState(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [takenAccessCode, setTakenAccessCode] = useState('');
    const [URLaccessCode, seturlAccessCode] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(true);
    const { toast } = useToast();
    const getDefaultTab = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('code');
        if (code) {
            seturlAccessCode(code); 
            return 'download'; 
        }
        return 'upload'; 
    };
    const [defaultTab,setDefaultTab] = useState(getDefaultTab)
    
    // Handler for file selection
    
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // Handler for file upload
    const handleUpload = async (event) => {
        setLoading(true);
        event.preventDefault();

        // Check if a file is selected
        if (!selectedFile) {
            alert("Please select a file first!");
            setLoading(false);
            return;
        }

        // Check file size (50MB limit)
        const maxFileSize = 50 * 1024 * 1024; // 50MB in bytes
        if (selectedFile.size > maxFileSize) {
            alert("File size exceeds the maximum limit of 50MB.");
            setLoading(false);
            return;
        }

        let fileData = await selectedFile.arrayBuffer();
        
        const formData = new FormData();
        
        formData.append('file', new Blob([fileData]), selectedFile.name);
        
        formData.append('type', selectedFile.type);

        try {
            const response = await fetch(`${URL}/upload`, {
                method: 'POST',
                body: formData,
            });
            
            console.log(response)
            if (response.ok) {
                const data = await response.json();
                setGivenAccessCode(data.key); // Assuming the server returns an access code
            } else {
                const errorText = await response.text();
                alert('Upload failed: ' + errorText);
            }
        } catch (error) {
            console.error('Error during upload:', error);
            alert('Upload failed: ');
        } finally {
            setLoading(false);
        }
    };

    // Handler to retrieve the file with the access code
    const handleRetrieveFile = async () => {
        if (!takenAccessCode && !URLaccessCode) {
            alert("Please enter an access code.");
            return;
        }

        setLoading(true);

        try {
            let code = URLaccessCode ? URLaccessCode : takenAccessCode;
            const response = await fetch(`${URL}/retrieve?accessCode=${code}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setFileUrl(url);
                const a = document.createElement('a');
                const fileExtension = response.headers.get('content-type') || 'bin';
                a.style.display = 'none';
                a.href = url;
                a.target="_blank"
                // The filename could be set based on the response headers or a predefined value
                a.download = 'file.' + fileExtension; // This might need adjustment based on actual file name or type
                document.body.appendChild(a);

                a.click();
                
                setLoading(false);
            } else {
                const errorText = await response.text();
                alert('Failed to retrieve file: ' + errorText);
            }
        } catch (error) {
            console.error('Error retrieving file:', error);
            alert('Failed to retrieve file');
        } finally {
            setLoading(false);
        }
    };

    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        setTakenAccessCode(text);
    };
    const handleSwitch = (e) => {
        setUploadFile(!uploadFile);
    };
    return (
        <div class="flex flex-col flex-1 justify-between items-between">
            <Tabs defaultValue={defaultTab} className="w-[100%]">
                <TabsList>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="download">Download</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="w-full">
                    <div class="flex flex-col items-start w-full">
                        <div class="flex flex-row justify-between gap-4 items-center mt-2 mb-4 w-full">
                            <h1 class="text-lg font-bold">Upload file</h1>
                            <Button variant="ghost" size="sm" className="underline" onClick={handleSwitch}>{uploadFile ? "Only need to upload text?" : "Back to file upload."}</Button>
                        </div>
                        
                        {uploadFile ?
                            <form onSubmit={handleUpload} class="flex flex-col w-full">
                                <label className="flex items-center px-4 py-2 bg-muted text-white rounded-md cursor-pointer mx-auto w-full items-center justify-center">
                                    <span className="mr-2 flex items-center gap-4"> <File/> Choose File</span>
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                                <Button type="submit" className="gap-4 mt-2 flex"> <Upload/> Upload File</Button>
                            </form> 
                            :
                            <div class="w-full">
                                <form onSubmit={handleUpload} class="flex flex-col">
                                    <Label>Input text below</Label>
                                    <Textarea

                                        onChange={setInputText}
                                        placeholder="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
                                        className="w-full my-2"
                                    />
                                    <Button type="submit" className="gap-4 mt-2 flex"><Upload/>Upload File</Button>
                                </form> 
                               

                            </div>
                        }
                        {loading && <div class="w-[100px]">
                            <Lottie animationData={loadingAnimation} loop={true}/>
                        </div>}
                        {givenAccessCode && 

                            <div class="flex md:flex-col gap-2 items-start mt-4">
                                <div class="flex items-center text-start rounded-lg gap-1 font-bold w-full justify-between">
                                    <span class="flex items-center px-1 bg-muted rounded">
                                            {givenAccessCode} 
                                            <Button size="icon" variant="ghost" className="hover:bg-background m-1" onClick={() => {
                                                navigator.clipboard.writeText(givenAccessCode);
                                                toast({
                                                    title: "Access code copied: " + givenAccessCode,
                                                });
                                            }}>
                                                <CopyIcon/>
                                        </Button>
                                    </span>
                                    <QRCode size={128} value={`https://filedrop.xyz/?code=${givenAccessCode}`} />
                                </div>

                                <Alert>
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Heads up!</AlertTitle>
                                    <AlertDescription>
                                        If you lose this code, your file is gone. We don't have access to it.
                                    </AlertDescription>
                                </Alert>
                            </div>
                            
                        }
                    </div>
                </TabsContent>
                <TabsContent value="download" className="w-full">
                    <div class="flex flex-col items-start w-full">
                        <h1 class="text-lg font-bold mt-3 mb-4 w-full">Retrieve File</h1>
                        <div class="flex gap-2 items-center w-full">
                            {URLaccessCode ? 
                                <Input className="" value={URLaccessCode} placeholder="Access Code" type="text" onChange={(e) => {seturlAccessCode(''); setTakenAccessCode(e.target.value)}} /> 
                            :
                                <Input className="" value={takenAccessCode} placeholder="Access Code" type="text" onChange={(e) => {setTakenAccessCode(e.target.value)}} /> 
                            }
                        </div>
                        <Button onClick={handleRetrieveFile} className="gap-4 mt-2 flex w-full" ><Download/> Retrieve File</Button>

                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
