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
    const URL = "https://api.filedrop.xyz";
    // const URL = "http://localhost:4000";
    const [selectedFile, setSelectedFile] = useState(null);
    const [givenAccessCode, setGivenAccessCode] = useState('');
    const [takenAccessCode, setTakenAccessCode] = useState('');
    const [URLaccessCode, seturlAccessCode] = useState('');
    const [selectedFileName, setSelectedFileName] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [inputText, setInputText] = useState('');
    const [loading, setLoading] = useState(false);
    const [uploadFile, setUploadFile] = useState(true);
    const [wordList,setWordList] = useState([]);
    const [secretWord,setSecretWord] = useState(null);
    const [takenSecretWord,setTakenSecretWord] = useState(null);

    const [displayText,setDisplayText] = useState("")
    const [defaultTab,setDefaultTab] = useState(new URLSearchParams(window.location.search).get('ac') ? 'download' : 'upload')
    const [downloadPageLooding,setOnDownloadPageLooding] = useState(false);

    const { toast } = useToast();


    useEffect(() => {
        checkForURLCode();

        fetch("/bip39.txt")
            .then((response) => response.text())
            .then((data) => {
                    const words = data.split("\n");
                    setWordList(words)
                });
    }, []);


    const handleRetrieveFile = async (accessCode,sw) => {
        let code = accessCode? accessCode : takenAccessCode
        let secW = sw ? sw : takenSecretWord
        if (!code && !secW) {
            alert("Please enter an access code.");
            return;
        }
        
        setLoading(true);

        try {
            const response = await fetch(`${URL}/retrieve?accessCode=${code}&secretWord=${secW}`);
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                setFileUrl(url);
                const a = document.createElement('a');
                const fileExtension = response.headers.get('content-type') || 'bin';
                if(fileExtension == 'txt'){
                    setDisplayText(await blob.text())
                    return
                }
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
            setOnDownloadPageLooding(false)
        }
    };


    const checkForURLCode = () => {
        const queryParams = new URLSearchParams(window.location.search);
        const code = queryParams.get('ac');
        const sw = queryParams.get('sw');
        if (code) {
            setOnDownloadPageLooding(true);
            setTakenAccessCode(code); 
            setTakenSecretWord(sw);
            handleRetrieveFile(code,sw)
        }
    };
    
    // Handler for file selection
    
    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setSelectedFileName(event.target.files[0]?.name || '');

    };
    function str2ab(str) {
        var buf = new ArrayBuffer(str.length); // 1 byte for each char
        var bufView = new Uint8Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return buf;
    }
    // Handler for file upload
    const handleUpload = async (event) => {
        event.preventDefault();
        setDisplayText("");
        setFileUrl("");
        setLoading(true);

        const index = Math.floor((Math.random() * 2048))

        const sw = wordList[index];

        if(!uploadFile) {
            if(inputText === ''){
                alert("Make sure you input some text!");
                setLoading(false);
                return;
            }
            let buffer = str2ab(inputText);
            const formData = new FormData();
        
            formData.append('file', new Blob([buffer]), 'txt');
            
            formData.append('type', '.txt');

            formData.append('secretWord', sw);
    
            try {
                const response = await fetch(`${URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setGivenAccessCode(data.key); // Assuming the server returns an access code
                    setSecretWord(sw)

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

        } else {
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

            formData.append('secretWord', sw);
    
            try {

                const response = await fetch(`${URL}/upload`, {
                    method: 'POST',
                    body: formData,
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setGivenAccessCode(data.key); // Assuming the server returns an access code
                    setSecretWord(sw)

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
        }   
       
    };

    // Handler to retrieve the file with the access code
    

    const handlePaste = async () => {
        const text = await navigator.clipboard.readText();
        setTakenAccessCode(text);
    };
    const handleSwitch = (e) => {
        setUploadFile(!uploadFile);
    };
    return (
        <div class="flex flex-col flex-1 justify-between items-between">
            <Tabs defaultValue={defaultTab ? defaultTab : 'download'} className="w-[100%]">
                <TabsList>
                    <TabsTrigger value="upload">Upload</TabsTrigger>
                    <TabsTrigger value="download">Download</TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="w-full">
                    <div class="flex flex-col items-start w-full">
                        <div class="flex flex-row justify-between gap-4 items-center mt-2 mb-4 w-full">
                            <h1 class="text-lg font-bold flex flex-col sm:flex-row gap-2">Upload file 
                            
                            <span class="font-thin underline">{selectedFileName && uploadFile ? selectedFileName : null}</span>
                            
                            </h1>
                            <Button variant="ghost" size="sm" className="underline" onClick={handleSwitch}>{uploadFile ? "Only need to upload text?" : "Back to file upload."}</Button>
                        </div>
                        
                        {uploadFile ?
                            <div class="flex flex-col w-full">

                                <label className="flex items-center px-4 py-2 bg-muted dark:text-white text-black rounded-md cursor-pointer mx-auto w-full items-center justify-center">
                                    <span className="mr-2 flex items-center gap-4"> <File/> Choose File</span>
                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                </label>
                                <Button onClick={handleUpload} type="submit" className="gap-4 mt-2 flex"> <Upload/> Upload File</Button>
                            </div> 
                            :
                            <div class="w-full">
                                <form onSubmit={handleUpload} class="flex flex-col">
                                    <Textarea
                                        value={inputText}
                                        onChange={(e)=>setInputText(e.target.value)}
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

                            <div class="flex flex-col gap-2 items-start mt-4 w-full">
                                <div class="flex flex-col sm:flex-row items-center text-start rounded-lg gap-1 font-bold w-full justify-between">
                                    <div>
                                    {/* <Label>Access Code</Label> */}
                                    <span class="flex items-center px-1 bg-muted rounded p-3">
                                        <div class="flex gap-6">
                                            <span class="flex flex-col gap-2"><Label className="underline">Access Code</Label>{givenAccessCode}</span>
                                            <span class="flex flex-col gap-2"><Label className="underline">Secret Word</Label>{secretWord}</span>
                                        </div>
                                            <Button size="icon" variant="ghost" className="hover:bg-background m-1" onClick={() => {
                                                    const link = `https://filedrop.xyz/?ac=${givenAccessCode}&sw=${secretWord}`
                                                    navigator.clipboard.writeText(link);
                                                    toast({
                                                        title: "Link copied: " + givenAccessCode,
                                                    });
                                                }}>
                                                    <CopyIcon/>
                                            </Button>
                                    </span>
                                    </div>
                                    <QRCode size={128} value={`https://filedrop.xyz/?ac=${givenAccessCode}&sw=${secretWord}`} />
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

                                <div class="flex flex-row gap-2 w-full">
                                    <div class="w-[50%]">
                                        <Label htmlFor="acc_code">Access Code</Label>
                                        <Input id="acc_code" value={takenAccessCode} placeholder="Ex. ro23" type="text" onChange={(e) => {setTakenAccessCode(e.target.value)}} /> 
                                    </div>
                                    <div class="w-[50%]">
                                        <Label htmlFor="secret_word">Secret Word</Label>
                                        <Input id="secret_word" value={takenSecretWord} placeholder="Ex. motion" type="text" onChange={(e) => {setTakenSecretWord(e.target.value)}} /> 
                                    </div>
                                </div>
                        </div>



                        {displayText !== "" && downloadPageLooding === false ? (
                            <div className="w-full">
                                <label>Results</label>
                                <Textarea
                                    value={displayText}
                                    className="w-full h-[250px] p-4"
                                    readOnly
                                />
                            </div>
                        ) : (
                            null
                        )}


                            {loading ? (
                                <div class='w-24 h-24 mt-4 mx-auto'>
                                    <Lottie animationData={loadingAnimation} loop={true}/>
                                </div>
                            ) : null}

                        <Button onClick={handleRetrieveFile} className="gap-4 mt-2 flex w-full" ><Download/> Retrieve File</Button>

                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
