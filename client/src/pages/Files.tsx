import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/FileUpload";
import { useFiles, useDeleteFile } from "@/hooks/use-files";
import { useModelStatus } from "@/hooks/use-models";
import { Loader2, Trash2, FileText, Calendar, HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function Files() {
  const { data: files, isLoading } = useFiles();
  const { mutate: deleteFile, isPending: isDeleting } = useDeleteFile();
  const { data: status } = useModelStatus();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Navigation />
      
      <main className="flex-1 ml-20 md:ml-64 p-8 overflow-y-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold font-display text-gradient mb-2">
            Dataset Management
          </h1>
          <p className="text-muted-foreground text-lg">
            Upload text documents to train your model.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Uploaded Files ({files?.length || 0})
              </h2>
            </div>

            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence>
                  {files?.map((file) => {
                    const isCurrentlyTraining = status?.fileIds?.includes(file.id) && status?.active;
                    
                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className={`glass-panel p-4 rounded-xl group relative overflow-hidden ${
                          isCurrentlyTraining ? 'border-emerald-500/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isCurrentlyTraining 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : 'bg-primary/10 text-primary'
                            }`}>
                              <FileText className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-medium text-white truncate max-w-[150px]">
                                {file.filename}
                              </h3>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(file.uploadedAt).toLocaleDateString()}
                              </div>
                              {isCurrentlyTraining && (
                                <div className="flex items-center gap-1 text-xs text-emerald-400 mt-1">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Training in progress
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteFile(file.id)}
                            disabled={isDeleting || isCurrentlyTraining}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10"
                            title={isCurrentlyTraining ? "Cannot delete during training" : "Delete file"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {/* Decorative gradient blob */}
                        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                
                {files?.length === 0 && (
                  <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
                    No files uploaded yet. Start by dropping files below.
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-primary" />
              Add New Data
            </h2>
            <div className="sticky top-8">
              <FileUpload />
              
              <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                <h4 className="font-medium text-blue-400 mb-2 text-sm">Pro Tip</h4>
                <p className="text-xs text-blue-200/60 leading-relaxed">
                  For best results, ensure your text files are clean and UTF-8 encoded. 
                  JSON files should follow the {"{ input: '', output: '' }"} format for structured training.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
