import { useEffect, useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ClipboardIcon, CopyIcon, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Lottie from "lottie-react";
import loadingAnimation from '../../assets/animation/loading.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import QRCode from "react-qr-code";

export function Home() {
    // const URL = "https://drop-it.up.railway.app";
    const URL = "https://api.filedrop.xyz";
    // const URL = "http://localhost:4000";
    const [selectedFile, setSelectedFile] = useState(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [takenAccessCode, setTakenAccessCode] = useState('');
    const [URLaccessCode, seturlAccessCode] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [loading, setLoading] = useState(false);
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
    console.log(defaultTab)
    return (
        <div class="flex flex-col flex-1 justify-between items-between">
            <Tabs defaultValue={defaultTab} className="">
                <TabsList>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="download">Download</TabsTrigger>
                </TabsList>
                <TabsContent value="upload">
                    <div class="flex flex-col items-start">
                        <h1 class="text-lg font-bold">Upload file</h1>
                        <form onSubmit={handleUpload} class="flex flex-col md:flex-row gap-2 items-start md:items-center">
                            <input type="file" onChange={handleFileChange} />
                            <Button type="submit">Upload File</Button>
                        </form>
                        {loading && <div class="w-[100px]">
                            <Lottie animationData={loadingAnimation} loop={true}/>
                        </div>}
                        {givenAccessCode && 

                            <div class="flex flex-col md:flex-col gap-2 items-start mt-4">
                                <div class="flex items-center text-start rounded-lg gap-1 font-bold bg-muted">
                                    <span class="flex items-center px-1">
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
                                </div>
                                <QRCode size={128} value={`https://filedrop.xyz/?code=${givenAccessCode}`} />

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
                <TabsContent value="download">
                    <div class="flex flex-col items-start">
                        <h1 class="text-lg font-bold">Retrieve File</h1>
                        <div class="flex gap-2 items-center">

                            {URLaccessCode ? 
                                <Input className="max-w-[260px]" value={URLaccessCode} placeholder="Access Code" type="text" onChange={(e) => {seturlAccessCode(''); setTakenAccessCode(e.target.value)}} /> 
                            :
                                <Input className="max-w-[260px]" value={takenAccessCode} placeholder="Access Code" type="text" onChange={(e) => {setTakenAccessCode(e.target.value)}} /> 
                            }
                            <Button onClick={handleRetrieveFile}>Retrieve File</Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
