import Link from 'next/link';
import { Rocket, LayoutDashboard, BookOpen, GitBranch } from 'lucide-react';

export function Navigation() {
  return (
    <nav className="border-b bg-background">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <Rocket className="h-6 w-6" />
          <span>Mission Control</span>
        </Link>
        
        <div className="ml-auto flex items-center gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          
          <Link 
            href="/stories" 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <BookOpen className="h-4 w-4" />
            Stories
          </Link>
          
          <Link 
            href="/deploy" 
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <GitBranch className="h-4 w-4" />
            Deploy
          </Link>
        </div>
      </div>
    </nav>
  );
}