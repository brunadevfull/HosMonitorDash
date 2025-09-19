import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtitle?: string;
  progress?: number;
  progressColor?: string;
  trend?: "positive" | "negative" | "neutral";
  "data-testid"?: string;
}

export function MetricCard({ 
  title, 
  value, 
  icon, 
  subtitle, 
  progress, 
  progressColor = "bg-primary",
  trend = "neutral",
  "data-testid": testId
}: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "positive":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className="transition-all duration-200 hover:shadow-md" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-2">
          {value}
        </div>
        
        {progress !== undefined && (
          <div className="mb-2">
            <Progress value={progress} className="h-2" />
          </div>
        )}
        
        {subtitle && (
          <div className={`text-sm flex items-center space-x-1 ${getTrendColor()}`}>
            {trend !== "neutral" && getTrendIcon()}
            <span>{subtitle}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
