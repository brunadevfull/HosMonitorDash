import { useEffect, useRef, useState } from "react";
import { Server } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Terminal } from "lucide-react";

interface SshTerminalProps {
  server: Server;
}

interface TerminalLine {
  id: string;
  type: "input" | "output" | "error";
  text: string;
  timestamp: Date;
}

export function SshTerminal({ server }: SshTerminalProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentCommand, setCurrentCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Simulate SSH connection
    const connectMsg: TerminalLine = {
      id: `line-${Date.now()}`,
      type: "output",
      text: `Connecting to ${server.ip}:${server.sshPort}...`,
      timestamp: new Date(),
    };
    
    setLines([connectMsg]);
    
    setTimeout(() => {
      const welcomeMsg: TerminalLine = {
        id: `line-${Date.now()}`,
        type: "output",
        text: `Welcome to ${server.name} (${server.hostname})`,
        timestamp: new Date(),
      };
      
      const promptMsg: TerminalLine = {
        id: `line-${Date.now()}`,
        type: "output",
        text: `${server.sshUsername || 'admin'}@${server.name}:~$`,
        timestamp: new Date(),
      };
      
      setLines(prev => [...prev, welcomeMsg, promptMsg]);
      setIsConnected(true);
      inputRef.current?.focus();
    }, 1000);
  }, [server]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [lines]);

  const handleSubmitCommand = () => {
    if (!currentCommand.trim() || !isConnected) return;

    const inputLine: TerminalLine = {
      id: `line-${Date.now()}`,
      type: "input",
      text: `${server.sshUsername || 'admin'}@${server.name}:~$ ${currentCommand}`,
      timestamp: new Date(),
    };

    setLines(prev => [...prev, inputLine]);

    // Simulate command execution
    setTimeout(() => {
      const output = simulateCommand(currentCommand);
      const outputLine: TerminalLine = {
        id: `line-${Date.now()}`,
        type: output.includes("command not found") || output.includes("error") ? "error" : "output",
        text: output,
        timestamp: new Date(),
      };

      const promptLine: TerminalLine = {
        id: `line-${Date.now()}`,
        type: "output",
        text: `${server.sshUsername || 'admin'}@${server.name}:~$`,
        timestamp: new Date(),
      };

      setLines(prev => [...prev, outputLine, promptLine]);
    }, 500);

    setCurrentCommand("");
  };

  const simulateCommand = (command: string): string => {
    const cmd = command.trim().toLowerCase();
    
    switch (cmd) {
      case "ls":
      case "ls -la":
        return "total 24\ndrwxr-xr-x 3 admin admin 4096 Dec 19 15:42 .\ndrwxr-xr-x 3 root  root  4096 Dec 19 15:30 ..\n-rw-r--r-- 1 admin admin  220 Dec 19 15:30 .bash_logout\n-rw-r--r-- 1 admin admin 3771 Dec 19 15:30 .bashrc\ndrwxr-xr-x 2 admin admin 4096 Dec 19 15:42 logs\n-rw-r--r-- 1 admin admin  807 Dec 19 15:30 .profile";
      
      case "pwd":
        return "/home/admin";
      
      case "whoami":
        return server.sshUsername || "admin";
      
      case "date":
        return new Date().toString();
      
      case "uptime":
        return "15:42:30 up 45 days, 12:34, 1 user, load average: 0.45, 0.32, 0.28";
      
      case "df -h":
        return "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda1        20G   12G  7.2G  63% /\n/dev/sda2       100G   45G   50G  48% /var";
      
      case "free -h":
        return "              total        used        free      shared  buff/cache   available\nMem:           8.0G        5.4G        800M        256M        1.8G        2.2G\nSwap:          2.0G        512M        1.5G";
      
      case "ps aux":
        return "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot         1  0.0  0.1  19696  2584 ?        Ss   Dec18   0:01 /sbin/init\nroot       123  0.2  0.5  55216  8432 ?        S    Dec18   2:15 /usr/sbin/sshd\nnginx      456  0.1  0.3  31244  5128 ?        S    Dec18   1:23 nginx: worker";
      
      case "top":
        return "Tasks: 98 total,   1 running,  97 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  3.2 us,  1.1 sy,  0.0 ni, 95.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\nMiB Mem :   8192.0 total,    800.5 free,   5422.3 used,   1969.2 buff/cache";
      
      case "netstat -tuln":
        return "Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN\ntcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN\ntcp        0      0 0.0.0.0:443             0.0.0.0:*               LISTEN";
      
      case "help":
        return "Available commands: ls, pwd, whoami, date, uptime, df, free, ps, top, netstat, help, clear, exit";
      
      case "clear":
        // Clear terminal
        setTimeout(() => {
          setLines([{
            id: `line-${Date.now()}`,
            type: "output",
            text: `${server.sshUsername || 'admin'}@${server.name}:~$`,
            timestamp: new Date(),
          }]);
        }, 100);
        return "";
      
      case "exit":
        setIsConnected(false);
        return "Connection to " + server.ip + " closed.";
      
      default:
        if (cmd.startsWith("cd ")) {
          return `cd: ${cmd.split(" ")[1]}: No such file or directory`;
        }
        return `${cmd.split(" ")[0]}: command not found`;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmitCommand();
    }
  };

  return (
    <div className="h-96 flex flex-col" data-testid="ssh-terminal">
      <div className="flex items-center bg-muted p-2 rounded-t-lg">
        <Terminal className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">
          SSH: {server.name} ({server.ip})
        </span>
        <span className={`ml-auto text-xs px-2 py-1 rounded ${
          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}>
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-black text-green-400 font-mono text-sm" ref={scrollAreaRef}>
        <div className="space-y-1">
          {lines.map((line) => (
            <div 
              key={line.id} 
              className={`${
                line.type === "input" ? "text-white" : 
                line.type === "error" ? "text-red-400" : 
                "text-green-400"
              }`}
            >
              {line.text}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {isConnected && (
        <div className="flex p-2 bg-muted rounded-b-lg">
          <Input
            ref={inputRef}
            value={currentCommand}
            onChange={(e) => setCurrentCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite um comando..."
            className="flex-1 mr-2 font-mono text-sm"
            data-testid="ssh-command-input"
          />
          <Button 
            size="sm" 
            onClick={handleSubmitCommand}
            disabled={!currentCommand.trim()}
            data-testid="ssh-send-command"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
