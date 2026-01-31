import { useEffect, useRef, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { useChatHistory, useSendMessage, useClearChat } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Send, Trash2, Bot, User, Sparkles, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export default function Chat() {
  const { data: history, isLoading } = useChatHistory();
  const { mutate: sendMessage, isPending } = useSendMessage();
  const { mutate: clearChat } = useClearChat();
  
  const [input, setInput] = useState("");
  const [temperature, setTemperature] = useState([0.7]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    sendMessage(
      { message: input, temperature: temperature[0] },
      { onSuccess: () => setInput("") }
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Navigation />
      
      <main className="flex-1 ml-20 md:ml-64 flex flex-col h-screen relative overflow-hidden">
        {/* Header */}
        <header className="h-20 glass-panel border-b border-white/5 px-8 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center shadow-lg shadow-primary/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display">Neural Assistant</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Model Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 glass-panel border-white/10 p-4 mr-4">
                <div className="space-y-4">
                  <h4 className="font-medium leading-none text-white">Model Parameters</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Temperature (Creativity)</span>
                      <span>{temperature[0]}</span>
                    </div>
                    <Slider
                      defaultValue={[0.7]}
                      max={1}
                      step={0.1}
                      value={temperature}
                      onValueChange={setTemperature}
                      className="py-4"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => clearChat()}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : history?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 opacity-50">
              <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-display mb-2">How can I help you?</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  I'm trained on your custom dataset. Ask me anything about the documents you've uploaded.
                </p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {history?.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 max-w-4xl mx-auto",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                    msg.role === "user" 
                      ? "bg-gradient-to-br from-indigo-500 to-blue-600" 
                      : "bg-gradient-to-br from-primary to-purple-500"
                  )}>
                    {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                  </div>
                  
                  <div className={cn(
                    "p-5 rounded-2xl text-sm md:text-base leading-relaxed shadow-lg max-w-[80%]",
                    msg.role === "user" 
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-50 rounded-tr-none" 
                      : "bg-white/5 border border-white/10 text-gray-100 rounded-tl-none"
                  )}>
                    {msg.content}
                    <div className="mt-2 text-xs opacity-40">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {isPending && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 max-w-4xl mx-auto"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl rounded-tl-none flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 bg-primary rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-8 pt-0">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="relative group">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Send a message..."
                disabled={isPending}
                className="w-full pl-6 pr-16 py-4 rounded-2xl glass-input text-white placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/50 shadow-xl"
              />
              <button
                type="submit"
                disabled={!input.trim() || isPending}
                className="absolute right-2 top-2 p-2 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/25"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
            <p className="text-center text-xs text-muted-foreground mt-3">
              AI can make mistakes. Please verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
