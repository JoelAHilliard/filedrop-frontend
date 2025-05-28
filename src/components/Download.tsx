import { useState, useEffect } from "preact/hooks"
import { Download, AlertCircle } from "lucide-react"
import Lottie from "lottie-react"
import { Label } from "@radix-ui/react-dropdown-menu"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import loadingAnimation from '../assets/animation/loading.json'

const API_URL = "https://api.filedrop.xyz"
const DOWNLOAD_FLAG_KEY = "fileDownloaded"

// Function to check if file has been downloaded
const hasFileBeenDownloaded = (accessCode) => {
    return localStorage.getItem(`${DOWNLOAD_FLAG_KEY}_${accessCode}`) === 'true'
}

// Function to set file as downloaded
const setFileAsDownloaded = (accessCode) => {
    localStorage.setItem(`${DOWNLOAD_FLAG_KEY}_${accessCode}`, 'true')
}

export function DownloadTab() {
    const [displayText, setDisplayText] = useState("")
    const [loading, setLoading] = useState(false)
    const [accessCode, setAccessCode] = useState('')
    const [secretWord, setSecretWord] = useState('')
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search)
        const code = queryParams.get('ac')
        const sw = queryParams.get('sw')
        if (code && sw) {
            setAccessCode(code)
            setSecretWord(sw)
            handleRetrieveFile(code, sw)
        }
    }, [])

    const handleRetrieveFile = async (code = accessCode, secW = secretWord) => {
        if (!code || !secW) {
            setError("Please enter an access code and secret word.")
            return
        }

        setLoading(true)
        setError(null)

        try {
            if (hasFileBeenDownloaded(code)) {
                setError("File has already been downloaded.")
                return
            }
            const response = await fetch(`${API_URL}/retrieve?accessCode=${code}&secretWord=${secW}`)
            
            if (response.ok) {
                const blob = await response.blob()
                const fileExtension = response.headers.get('content-type') || 'bin'

                

                if (fileExtension === 'txt') {
                    setDisplayText(await blob.text())
                } else {
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.style.display = 'none'
                    a.href = url
                    a.target = "_blank"
                    a.download = `file.${fileExtension}`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                    setFileAsDownloaded(code)
                }
            } else {
                const errorText = await response.text()
                setError(`Failed to retrieve file: ${errorText}`)
            }
        } catch (error) {
            console.error('Error retrieving file:', error)
            setError('Failed to retrieve file. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-start w-full">
            <div className="flex gap-2 items-center w-full">
                <div className="flex flex-row gap-2 w-full">
                    <InputField
                        id="acc_code"
                        label="Access Code"
                        value={accessCode}
                        onChange={setAccessCode}
                        placeholder="Ex. ro23"
                    />
                    <InputField
                        id="secret_word"
                        label="Secret Word"
                        value={secretWord}
                        onChange={setSecretWord}
                        placeholder="Ex. motion"
                    />
                </div>
            </div>

            {displayText && !loading && (
                <div className="w-full">
                    <label>Results</label>
                    <Textarea
                        value={displayText}
                        className="w-full h-[250px] p-4"
                        readOnly
                    />
                </div>
            )}

            {error && <ErrorAlert message={error} />}

            <Button 
                disabled={loading} 
                onClick={() => handleRetrieveFile()} 
                className="gap-4 mt-2 flex w-full"
            >
                <Download /> Retrieve File
            </Button>

            {loading && (
                <div className='w-24 h-24 mt-4 mx-auto'>
                    <Lottie animationData={loadingAnimation} loop={true}/>
                </div>
            )}
        </div>
    )
}

function InputField({ id, label, value, onChange, placeholder }) {
    return (
        <div className="w-[50%]">
            <Label htmlFor={id}>{label}</Label>
            <Input 
                id={id} 
                value={value} 
                placeholder={placeholder} 
                type="text" 
                onChange={(e) => onChange(e.target.value)} 
            /> 
        </div>
    )
}

function ErrorAlert({ message }) {
    return (
        <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
        </Alert>
    )
}