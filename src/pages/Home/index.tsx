import { useState } from 'preact/hooks';
import './style.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ClipboardIcon, CopyIcon, LoaderIcon } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import Lottie from "lottie-react";
import loadingAnimation from '../../../public/animation/loading.json';
export function Home() {
    console.log(loadingAnimation)
	const localURL = "http://localhost:5001"
	const URL = "https://drop-it.up.railway.app"
    const [selectedFile, setSelectedFile] = useState(null);
    const [accessCode, setAccessCode] = useState('');
    const [encryptionKey, setEncryptionKey] = useState('');

    const [loading, setLoading] = useState(false);


    
	const { toast } = useToast()
    // Handler for file selection
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    // Handler for the optional encryption key input
    const handleAccessCodeEntry = (event) => {
        setAccessCode(event.target.value);
    };

    // Function to encrypt the file data
    const encryptFile = async (fileData, key) => {
        // Simplified encryption logic
        // In a real app, you'd use the Web Crypto API or another library to securely encrypt the file data
        return fileData; // Placeholder for actual encryption logic
    };

    // Handler for file upload
    const handleUpload = async (event) => {
        setLoading(true)
        event.preventDefault();
        if (!selectedFile) {
            alert("Please select a file first!");
            return;
        }

        let fileData = await selectedFile.arrayBuffer();
        
        const formData = new FormData();

        formData.append('file', new Blob([fileData]), selectedFile.name);

        formData.append('type', selectedFile.type);

        try {
            const response = await fetch(URL+'/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await response.json();
            if (response.ok) {
                setLoading(false);
                setAccessCode(data.key); // Assuming the server returns an access code
            } else {
                setLoading(false)
                alert('Upload failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error during upload:', error);
            alert('Upload failed');
        }
    };

    // Handler to retrieve the file with the access code
	const handleRetrieveFile = async () => {
        if (!accessCode) {
            alert("No access code available. Please upload a file first.");
            return;
        }

        try {
            const response = await fetch(`${URL}/retrieve?accessCode=${accessCode}`);
            const data = await response.json();
            if (response.ok) {
				const a = document.createElement('a');
				console.log(data.fileUrl)
				a.href = data.fileUrl;
				a.download = "downloadedFile"; // Suggest a filename
				document.body.appendChild(a);
				a.click();

				document.body.removeChild(a);
				window.URL.revokeObjectURL(data.fileUrl);
            } else {
                alert('Failed to retrieve file: ' + data.message);
            }
        } catch (error) {
            console.error('Error retrieving file:', error);
            alert('Failed to retrieve file');
        }
    };
    
    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        console.log(accessCode)
        setAccessCode(text)
    }
        

    return (
		
        <div class="flex flex-col flex-1 justify-between items-between">
			<Tabs defaultValue="upload" className="max-w-[400px]">
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
						{accessCode && <span class="flex gap-2 items-center mt-4">Heres your code, dont lose it: <span class=" flex items-center rounded-lg px-1 gap-1 font-bold">{accessCode} <span class="rounded p-1"><Button size="icon" variant="ghost" onClick={() => {
							navigator.clipboard.writeText(accessCode);
							toast({
								title: "Access code copied: " + accessCode,
							})
							}}><CopyIcon/></Button></span></span></span>}
					</div>
				</TabsContent>

				<TabsContent value="download">
				<div class="flex flex-col items-start">
					<h1 class="text-lg font-bold">Retrieve File</h1>
					<div class="flex gap-2 items-center">
                            <div class="flex items-center relative p-1">
                                <Input className="max-w-[260px] py-6" value={accessCode} placeholder="Access Code" type="text" onChange={handleAccessCodeEntry} />
                                <span onClick={handlePaste} class="absolute right-0 pr-2 flex items-center">
                                    <Button variant="ghost" className="p-0 px-2"><ClipboardIcon /></Button>
                                </span>
                            </div>

						<Button onClick={handleRetrieveFile}>Retrieve File</Button>
					</div>
				</div>
				</TabsContent>
			</Tabs>
        </div>
    );
}
