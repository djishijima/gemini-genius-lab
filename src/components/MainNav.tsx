
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Mic, FileText, FileDiff, Settings } from "lucide-react";

export function MainNav() {
  const location = useLocation();
  
  const menuItems = [
    { name: "ホーム", path: "/", icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: "音声入力", path: "/audio-recorder", icon: <Mic className="mr-2 h-4 w-4" /> },
    { name: "InDesignスクリプト", path: "/transcription", icon: <FileText className="mr-2 h-4 w-4" /> },
    { name: "PDF比較", path: "/pdf-compare", icon: <FileDiff className="mr-2 h-4 w-4" /> },
    { name: "設定", path: "/settings", icon: <Settings className="mr-2 h-4 w-4" /> },
  ];

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={cn(
            "flex items-center text-sm font-medium transition-colors hover:text-primary",
            location.pathname === item.path
              ? "text-primary"
              : "text-muted-foreground"
          )}
        >
          {item.icon}
          {item.name}
        </Link>
      ))}
    </nav>
  );
}
