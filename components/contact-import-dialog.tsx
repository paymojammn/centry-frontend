'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '@/lib/contacts-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface ImportResult {
  status: 'success' | 'error' | 'queued';
  created: number;
  updated: number;
  skipped: number;
  total: number;
  errors: Array<{
    row: number;
    contact: string;
    error: string;
  }>;
  error?: string;
  task_id?: string;
  message?: string;
}

export function ContactImportDialog() {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: (file: File) => contactsApi.importContactsCSV(file),
    onSuccess: (data: ImportResult) => {
      setImportResult(data);

      if (data.status === 'success') {
        toast.success(
          `Import Completed: Created ${data.created}, Updated ${data.updated}, Skipped ${data.skipped}`
        );

        // Refresh contacts list
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
        queryClient.invalidateQueries({ queryKey: ['contact-stats'] });

        // Reset file selection after short delay
        setTimeout(() => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
      } else if (data.status === 'queued') {
        toast.success(
          'Import started! Processing in background...'
        );

        // Refresh contacts list after a delay to pick up imported contacts
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
          queryClient.invalidateQueries({ queryKey: ['contact-stats'] });
        }, 5000);

        // Reset file selection
        setTimeout(() => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }, 3000);
      } else {
        toast.error(data.error || 'Failed to import contacts');
      }
    },
    onError: (error: Error & { code?: string }) => {
      // Handle session interrupted - suggest retry
      const errorMessage = error.message || 'Failed to import contacts';
      if (errorMessage.includes('Session expired') || error.code === 'SESSION_INTERRUPTED') {
        toast.error('Session expired. Please try again.');
      } else {
        toast.error(errorMessage);
      }
      setImportResult({
        status: 'error',
        error: error.message,
        created: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast.error('Please select a CSV file');
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  const handleClose = () => {
    setOpen(false);
    // Reset state after dialog closes
    setTimeout(() => {
      setSelectedFile(null);
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <Upload className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Contacts from CSV</DialogTitle>
          <DialogDescription>
            Upload a Xero contacts CSV file to import vendors and suppliers with their bank account details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* CSV Format Info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <p className="font-medium">Expected CSV Format (Xero Export):</p>
                <ul className="list-disc list-inside text-xs text-muted-foreground">
                  <li>ContactName, EmailAddress, FirstName, LastName</li>
                  <li>BankAccountName, BankAccountNumber</li>
                  <li>PhoneNumber, MobileNumber, FaxNumber</li>
                  <li>POAddressLine1-4, SAAddressLine1-4, City, Country</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label
                htmlFor="csv-file-input"
                className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none"
              >
                <div className="flex flex-col items-center space-y-2">
                  <FileSpreadsheet className="w-8 h-8 text-gray-400" />
                  <span className="font-medium text-gray-600">
                    {selectedFile ? selectedFile.name : 'Click to upload CSV file'}
                  </span>
                  {selectedFile && (
                    <span className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </span>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Importing contacts...</span>
                <span className="text-muted-foreground">Please wait</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
          )}

          {/* Import Results */}
          {importResult && importResult.status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-green-800">Import Successful!</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-green-700 font-medium">{importResult.created}</span>
                      <span className="text-green-600"> created</span>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">{importResult.updated}</span>
                      <span className="text-blue-600"> updated</span>
                    </div>
                    <div>
                      <span className="text-gray-700 font-medium">{importResult.skipped}</span>
                      <span className="text-gray-600"> skipped</span>
                    </div>
                  </div>
                  <p className="text-xs text-green-600">
                    Total: {importResult.total} contacts processed
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Queued (Background Processing) */}
          {importResult && importResult.status === 'queued' && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium text-blue-800">Import Started</p>
                  <p className="text-sm text-blue-700">
                    {importResult.message || 'Your contacts are being imported in the background.'}
                  </p>
                  <p className="text-xs text-blue-600">
                    The contacts list will refresh automatically when complete.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Import Errors */}
          {importResult && importResult.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-medium">Import Failed</p>
                <p className="text-sm mt-1">{importResult.error}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Row-level Errors */}
          {importResult && importResult.errors && importResult.errors.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Some rows had errors:</p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-xs">
                        <span className="font-mono">Row {err.row}</span>: {err.contact} - {err.error}
                      </div>
                    ))}
                    {importResult.errors.length > 5 && (
                      <p className="text-xs text-muted-foreground">
                        ...and {importResult.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing...' : 'Import Contacts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
