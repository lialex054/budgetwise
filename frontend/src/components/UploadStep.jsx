import React, { useState, useRef } from 'react';
import apiClient from '../api'; // Use relative path
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Re-using Input for consistency, though hidden
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from 'lucide-react';
import { toast } from "sonner"; // Import toast

// Props:
// - userName: string
// - onUploadComplete: function() - Called after successful upload
export function UploadStep({ userName, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  // Optional: State to disable button while uploading, handled by toast.loading now mostly
  const [isUploading, setIsUploading] = useState(false);

  // --- File Upload Handlers (Moved from App.jsx) ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Trigger upload immediately after selecting
      handleUpload(selectedFile);
    } else {
      setFile(null);
    }
    // Clear the input value so the same file can be selected again
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (selectedFile) => {
    const fileToUpload = selectedFile || file; // Use argument first
    if (!fileToUpload) {
      toast.error('No file selected!');
      return;
    }
    const formData = new FormData();
    formData.append('file', fileToUpload);

    setIsUploading(true); // Disable button
    const uploadToastId = toast.loading("Uploading CSV...");

    try {
      const response = await apiClient.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(
        `File Processed! Imported: ${response.data.imported_count}, Skipped: ${response.data.skipped_rows.length}`,
        { id: uploadToastId, duration: 5000 }
      );

      setFile(null); // Clear file state

      // --- Call the completion callback ---
      onUploadComplete();
      // ------------------------------------

    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(
        `Upload failed. ${error?.response?.data?.detail || 'Please check console.'}`,
        { id: uploadToastId, duration: 5000 }
       );
    } finally {
        setIsUploading(false); // Re-enable button
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };
  // --- END File Upload Handlers ---

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[400px]"> {/* Slightly wider card */}
        <CardHeader className="items-center text-center">
          <CardTitle>Welcome, {userName}!</CardTitle>
          <CardDescription>Please upload your recent transaction history (CSV file) to get started.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4">
            {/* The button triggers the hidden input */}
             <Button
                variant="outline"
                size="lg" // Make button larger
                onClick={handleUploadButtonClick}
                disabled={isUploading} // Disable while processing
             >
                <Upload className="mr-2 h-5 w-5" />
                {isUploading ? "Processing..." : "Select Transaction CSV"}
             </Button>
             {/* Hidden file input */}
             <input
                 type="file"
                 ref={fileInputRef}
                 onChange={handleFileChange}
                 accept=".csv"
                 className="hidden"
             />
             {/* Display selected file name (optional) */}
             {file && <p className="text-sm text-slate-500">Selected: {file.name}</p>}
        </CardContent>
         <CardFooter>
             {/* Optional: Add skip button or info text */}
         </CardFooter>
      </Card>
    </div>
  );
}