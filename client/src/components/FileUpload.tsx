import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUploadFile } from "@/hooks/use-files";
import { useToast } from "@/hooks/use-toast";

export function FileUpload() {
  const { mutate: uploadFile, isPending } = useUploadFile();
  const { toast } = useToast();
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          uploadFile(
            { filename: file.name, content },
            {
              onSuccess: () => {
                toast({
                  title: "File uploaded",
                  description: `${file.name} has been added to the dataset.`,
                });
              },
              onError: (err) => {
                toast({
                  variant: "destructive",
                  title: "Upload failed",
                  description: err.message,
                });
              },
            }
          );
        };
        reader.readAsText(file);
      });
    },
    [uploadFile, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/plain": [".txt", ".md", ".json"] },
    maxSize: 5242880,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
        flex flex-col items-center justify-center p-12 text-center group
        ${
          isDragActive || dragActive
            ? "border-primary bg-primary/5 scale-[1.01] shadow-lg shadow-primary/10"
            : "border-white/10 hover:border-primary/50 hover:bg-white/5"
        }
      `}
      onDragEnter={() => setDragActive(true)}
      onDragLeave={() => setDragActive(false)}
      onDrop={() => setDragActive(false)}
    >
      <input {...getInputProps()} />
      
      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
          ${isDragActive ? "bg-primary text-white" : "bg-white/5 text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"}
        `}>
          {isPending ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>
        
        <div className="space-y-1">
          <h3 className="text-lg font-semibold font-display text-white">
            {isDragActive ? "Drop file here" : "Upload Training Data"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Drag & drop .txt, .md, or .json files here, or click to browse.
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}
