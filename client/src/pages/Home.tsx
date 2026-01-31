import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { FileUpload } from "@/components/FileUpload";
import { TrainingStats } from "@/components/TrainingStats";
import { useModelStatus, useTrainModel } from "@/hooks/use-models";
import { useFiles } from "@/hooks/use-files";
import { Button } from "@/components/ui/button";
import { Play, Loader2, Database, AlertCircle, FileText, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { data: status } = useModelStatus();
  const { mutate: startTraining, isPending: isStarting } = useTrainModel();
  const { data: files, isLoading: isLoadingFiles } = useFiles();
  const { toast } = useToast();
  
  const [modelName, setModelName] = useState("gpt-nano-v1");
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

  const handleTrain = () => {
    if (selectedFileIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No training data selected",
        description: "Please select at least one file before training.",
      });
      return;
    }

    startTraining({
      name: modelName,
      config: JSON.stringify({ learning_rate: 0.001, batch_size: 32 }),
      fileIds: selectedFileIds
    }, {
      onSuccess: (data) => {
        toast({
          title: "Training Started",
          description: `Model ${data.modelId} is training. Epochs auto-calculated based on file size.`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Training Failed",
          description: error.message.includes("too small") 
            ? "Files are too small for training. Minimum 5KB required."
            : error.message,
        });
      }
    });
    
    setSelectedFileIds([]);
  };

  const toggleFileSelection = (fileId: number) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Navigation />
      
      <main className="flex-1 ml-20 md:ml-64 p-8 overflow-y-auto">
        <header className="mb-8">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold font-display text-gradient mb-2"
          >
            Training Center
          </motion.h1>
          <p className="text-muted-foreground text-lg">
            Manage your datasets and fine-tune your neural network.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Configuration & Status */}
          <div className="lg:col-span-2 space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Live Metrics
              </h2>
              <TrainingStats />
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Training Configuration</h2>
              <div className="glass-panel p-6 rounded-2xl space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-white">Select Training Files</h3>
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <p className="text-sm text-blue-200">
                      💡 <strong>File Size Requirements:</strong> Minimum 5KB for effective training. Larger files (50KB+) recommended for better results.
                    </p>
                  </div>
                  {isLoadingFiles ? (
                    <div className="flex justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : files && files.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <AnimatePresence>
                        {files.map((file) => {
                          const isSelected = selectedFileIds.includes(file.id);
                          const isCurrentlyTraining = status?.fileIds?.includes(file.id) && status?.active;
                          
                          return (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                isCurrentlyTraining
                                  ? 'border-emerald-500 bg-emerald-500/10 cursor-not-allowed'
                                  : isSelected
                                  ? 'border-primary bg-primary/10'
                                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                              }`}
                              onClick={() => !isCurrentlyTraining && toggleFileSelection(file.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                  isCurrentlyTraining
                                    ? 'border-emerald-500 bg-emerald-500'
                                    : isSelected
                                    ? 'border-primary bg-primary'
                                    : 'border-white/30'
                                }`}>
                                  {isCurrentlyTraining ? (
                                    <Loader2 className="w-3 h-3 text-white animate-spin" />
                                  ) : isSelected ? (
                                    <Check className="w-3 h-3 text-white" />
                                  ) : null}
                                </div>
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm text-white truncate max-w-[200px]">
                                  {file.filename}
                                </span>
                              </div>
                              {isCurrentlyTraining && (
                                <span className="text-xs text-emerald-400 font-medium">
                                  Training...
                                </span>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed border-white/10 rounded-lg">
                      No files available. Upload files in the Dataset Management page first.
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="text-sm text-muted-foreground">
                    {selectedFileIds.length > 0 
                      ? `${selectedFileIds.length} file(s) selected`
                      : 'No files selected'
                    }
                    {status?.totalEpochs && status?.active && (
                      <span className="ml-2 text-primary">
                        • {status.totalEpochs} epochs auto-calculated
                      </span>
                    )}
                  </div>
                  
                  <Button
                    onClick={handleTrain}
                    disabled={status?.active || isStarting || selectedFileIds.length === 0}
                    className="bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:-translate-y-0.5"
                  >
                    {status?.active ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Training in Progress...
                      </>
                    ) : isStarting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5 fill-current" />
                        Start Training
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Files */}
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Dataset</h2>
              <div className="glass-panel p-6 rounded-2xl min-h-[500px] flex flex-col">
                <div className="mb-6">
                  <FileUpload />
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                  {isLoadingFiles ? (
                    <div className="flex items-center justify-center h-20 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Loading files...
                    </div>
                  ) : files?.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No files uploaded yet.</p>
                    </div>
                  ) : (
                    files?.map((file) => (
                      <div 
                        key={file.id} 
                        className="group flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                            <Database className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-white">{file.filename}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(file.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_theme('colors.emerald.500')]" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
