import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  Server, 
  BarChart3, 
  Bell, 
  Terminal, 
  Settings, 
  User,
  Activity,
  FileText
} from "lucide-react";

export function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Dashboard", icon: Activity },
    { path: "/servers", label: "Servidores", icon: Server },
    { path: "/metrics", label: "Métricas", icon: BarChart3 },
    { path: "/alerts", label: "Alertas", icon: Bell, badge: "3" },
    { path: "/logs", label: "Logs", icon: FileText },
    { path: "/ssh", label: "SSH Manager", icon: Terminal },
    { path: "/settings", label: "Configurações", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border shadow-sm flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-foreground flex items-center">
          <Server className="w-6 h-6 text-primary mr-2" />
          Monitor Servidores
        </h1>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              data-testid={`nav-${item.path.replace("/", "") || "dashboard"}`}
            >
              <Icon className="w-5 h-5 mr-3" />
              {item.label}
              {item.badge && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-1 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">Admin User</p>
            <p className="text-xs text-muted-foreground">admin@empresa.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
