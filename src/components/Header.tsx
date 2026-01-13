import { useState } from "react";
import { ShieldCheck, Radio, BarChart3, LogOut, Phone, MapPin, Sun, Moon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/components/ThemeProvider";
import { toast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DistressMap } from "@/components/DistressMap";

const emergencyNumbers = [
  { name: "Police", number: "100", icon: "🚔" },
  { name: "Fire Brigade", number: "101", icon: "🚒" },
  { name: "Ambulance", number: "102", icon: "🚑" },
  { name: "Disaster Management", number: "108", icon: "🆘" },
  { name: "Women Helpline", number: "1091", icon: "👩" },
  { name: "Child Helpline", number: "1098", icon: "👶" },
];

export function Header() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/auth", { replace: true });
    }
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        {/* Centered Logo and Title */}
        <div className="flex flex-col items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(28_92%_45%)] flex items-center justify-center shadow-glow">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-status-genuine border-2 border-card pulse-live" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Crisis Fact-Checker
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Distress Verification
              </p>
            </div>
          </Link>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 border-primary/50 text-primary hover:bg-primary/10"
              onClick={() => setIsMapOpen(true)}
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Verified Locations</span>
              <span className="sm:hidden">Locations</span>
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10">
                  <Phone className="h-4 w-4" />
                  <span>Emergency</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="center">
                <div className="p-3 border-b border-border bg-destructive/10">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Emergency Numbers
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">India helplines</p>
                </div>
                <div className="p-2">
                  {emergencyNumbers.map((item) => (
                    <a
                      key={item.number}
                      href={`tel:${item.number}`}
                      className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span>{item.icon}</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="font-mono font-semibold text-primary">{item.number}</span>
                    </a>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            <Link to="/admin">
              <Button variant="outline" size="sm" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
            
            {user && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
              <Radio className="h-3.5 w-3.5 text-status-genuine" />
              <span className="text-xs font-medium text-status-genuine">LIVE</span>
            </div>
          </div>
        </div>
      </div>
      
      <DistressMap isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
    </header>
  );
}
