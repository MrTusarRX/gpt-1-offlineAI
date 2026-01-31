import { useModelStatus } from "@/hooks/use-models";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Brain, Clock, Zap } from "lucide-react";
import { motion } from "framer-motion";

const mockData = Array.from({ length: 20 }, (_, i) => ({
  epoch: i,
  loss: Math.max(0.1, 2.5 - Math.log(i + 1) * 0.5 + Math.random() * 0.2),
  accuracy: Math.min(0.98, 0.4 + Math.log(i + 1) * 0.15),
}));

export function TrainingStats() {
  const { data: status } = useModelStatus();

  const stats = [
    {
      label: "Current Epoch",
      value: status?.active ? `${status.currentEpoch} / ${status.totalEpochs}` : "Idle",
      icon: Clock,
      color: "text-blue-400",
    },
    {
      label: "Total Epochs",
      value: status?.totalEpochs ? `${status.totalEpochs} (auto)` : "Not set",
      icon: Brain,
      color: status?.totalEpochs === 0 ? "text-red-400" : "text-purple-400",
    },
    {
      label: "Loss",
      value: status?.loss?.toFixed(4) ?? "0.0000",
      icon: Activity,
      color: "text-red-400",
    },
    {
      label: "Status",
      value: status?.status ?? "Ready",
      icon: Zap,
      color: status?.active ? "text-primary animate-pulse" : "text-emerald-400",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-panel rounded-xl p-4 border border-white/5"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold font-display ${stat.color}`}>
              {stat.value}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-6 border border-white/5 h-[300px]">
        <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" />
          Training Loss
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockData}>
            <defs>
              <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                <stop offset="50%" stopColor="#ef4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="epoch" 
              stroke="#888" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#888" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
              domain={[0, 3]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.9)', 
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: '8px',
                color: '#fff'
              }}
              itemStyle={{ color: '#fbbf24' }}
              labelStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="loss" 
              stroke="#fbbf24" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorLoss)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
