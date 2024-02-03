import { useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardIcon, CopyIcon, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Lottie from "lottie-react";
import loadingAnimation from '../../../public/animation/loading.json';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function Home() {
    const URL = "https://drop-it.up.railway.app";
    // const URL = "http://localhost:5001";
    const [selectedFile, setSelectedFile] = useState(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [takenAccessCode, setTakenAccessCode] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Handler for file selection
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // Handler for file upload
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
        const data = await response.json();
        if (response.ok) {
            setGivenAccessCode(data.key); // Assuming the server returns an access code
        } else {
            alert('Upload failed: ' + data.message);
        }
    } catch (error) {
        console.error('Error during upload:', error);
        alert('Upload failed');
    } finally {
        setLoading(false);
    }
};


    // Handler to retrieve the file with the access code
    const handleRetrieveFile = async () => {
        if (!takenAccessCode) {
            alert("Please enter an access code.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${URL}/retrieve?accessCode=${takenAccessCode}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setFileUrl(url);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.target="_blank"
                // The filename could be set based on the response headers or a predefined value
                a.download = 'file'; // This might need adjustment based on actual file name or type
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

    return (
        <div class="flex flex-col flex-1 justify-between items-between">
            <Tabs defaultValue="upload" className="">
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
                        <div class="flex flex-col md:flex-row gap-2 items-center mt-4 ">
                            Access Code:
                            <div class="flex items-center rounded-lg px-1 gap-1 font-bold">{givenAccessCode.slice(0,4)+"..."+givenAccessCode.slice(givenAccessCode.length - 4,givenAccessCode.length)} 
                                <Button size="icon" variant="ghost" onClick={() => {
                                        navigator.clipboard.writeText(givenAccessCode);
                                        toast({
                                            title: "Access code copied: " + givenAccessCode,
                                        });
                                    }}>
                                        <CopyIcon/>
                                </Button>
                            </div>
                            <Alert>
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Heads up!</AlertTitle>
                                <AlertDescription>
                                    If you lose this code, your file is gone.
                                </AlertDescription>
                            </Alert>
                        </div>}
                    </div>
                </TabsContent>
                <TabsContent value="download">
                    <div class="flex flex-col items-start">
                        <h1 class="text-lg font-bold">Retrieve File</h1>
                        <div class="flex gap-2 items-center">
                            <Input className="max-w-[260px]" value={takenAccessCode} placeholder="Access Code" type="text" onChange={(e) => {setTakenAccessCode(e.target.value)}} />
                            <Button onClick={handleRetrieveFile}>Retrieve File</Button>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
