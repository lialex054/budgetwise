import React, { useState, useRef, useEffect } from 'react';
import apiClient from '../api';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"; // Form components
import { useForm } from "react-hook-form"; // Form library
import { zodResolver } from "@hookform/resolvers/zod"; // Validator adapter
import * as z from "zod"; // Validator library
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Upload } from 'lucide-react';
import { format } from "date-fns"; // Date formatting
import { toast } from "sonner";

// Define CATEGORY_OPTIONS here or import them
const CATEGORY_OPTIONS = [
  'Uncategorized', 'Groceries', 'Transport', 'Utilities', 'Rent',
  'Entertainment', 'Dining Out', 'Shopping', 'Health'
];

// Define Zod schema for validation
const formSchema = z.object({
  merchant_name: z.string().min(1, { message: "Merchant name is required." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }), // Coerce converts string input to number
  date: z.date({ required_error: "Please select a date." }),
  category: z.string().min(1, { message: "Please select a category." }),
});

export function AddTransactionModal({ isOpen, onClose, onSave }) {
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const fileInputRef = useRef(null);

  // React Hook Form setup
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      merchant_name: "",
      amount: "", // Input expects string initially
      date: undefined, // Start with no date selected
      category: "",
    },
  });

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset(); // Reset form fields and errors
      setIsSubmittingManual(false);
      setIsUploadingCsv(false);
    }
  }, [isOpen, form]);

  // Handler for Manual Form Submission
  const onSubmit = async (values) => {
    setIsSubmittingManual(true);
    const manualToastId = toast.loading("Adding transaction...");
    try {
      // Format date correctly for backend (YYYY-MM-DD)
      const formattedValues = {
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
      };
      console.log("Submitting manual transaction:", formattedValues); // Debug
      await apiClient.post('/transactions/', formattedValues); // Call new backend endpoint

      toast.success(`Transaction for '${values.merchant_name}' added.`, { id: manualToastId });
      onSave(); // Trigger data refresh in App.jsx
      onClose(); // Close modal
    } catch (error) {
      console.error("Error adding manual transaction:", error);
      toast.error(`Failed to add transaction. ${error?.response?.data?.detail || 'Please try again.'}`, { id: manualToastId });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // --- CSV Upload Handlers (Adapted) ---
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]); // Pass file directly
    }
    if (fileInputRef.current) { fileInputRef.current.value = ""; } // Clear input visually
  };

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return; // Should have a file here
    const formData = new FormData();
    formData.append('file', selectedFile);

    setIsUploadingCsv(true); // Disable CSV button
    const uploadToastId = toast.loading("Uploading CSV...");

    try {
      const response = await apiClient.post('/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(
        `File Processed! Imported: ${response.data.imported_count}, Skipped: ${response.data.skipped_rows.length}`,
        { id: uploadToastId, duration: 5000 }
      );
      onSave(); // Trigger data refresh
      onClose(); // Close modal on successful upload
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(
        `CSV Upload failed. ${error?.response?.data?.detail || 'Please check console.'}`,
        { id: uploadToastId, duration: 5000 }
       );
    } finally {
        setIsUploadingCsv(false); // Re-enable CSV button
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };
  // --- END CSV Upload Handlers ---

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]"> {/* Slightly wider */}
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Enter details manually or upload a CSV file.
          </DialogDescription>
        </DialogHeader>

        {/* Manual Entry Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Merchant Name */}
            <FormField
              control={form.control}
              name="merchant_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Merchant Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Tesco, Amazon" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (£)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="e.g., 25.50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Date Picker */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal", // Adjusted width
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        // disabled={(date) => date > new Date() || date < new Date("1900-01-01")} // Optional date restrictions
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* Category Select */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <Button type="submit" disabled={isSubmittingManual || isUploadingCsv}>
                 {isSubmittingManual ? 'Saving...' : 'Save Manual Transaction'}
             </Button>
          </form>
        </Form>

        {/* Separator */}
        <Separator className="my-4" />

        {/* CSV Upload Section */}
        <div className="space-y-2 text-center">
            <Label>Or Upload CSV</Label>
            <Button
               variant="outline"
               className="w-full"
               onClick={handleUploadButtonClick}
               disabled={isUploadingCsv || isSubmittingManual}
            >
               <Upload className="mr-2 h-4 w-4" />
               {isUploadingCsv ? "Uploading..." : "Upload CSV File"}
            </Button>
            <input
               type="file"
               ref={fileInputRef}
               onChange={handleFileChange}
               accept=".csv"
               className="hidden"
            />
        </div>

        <DialogFooter className="mt-4">
             <DialogClose asChild>
                <Button type="button" variant="ghost">Close</Button>
             </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}