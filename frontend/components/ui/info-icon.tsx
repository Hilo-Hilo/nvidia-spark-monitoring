'use client';

import { Info } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface InfoIconProps {
  content: string;
  className?: string;
  title?: string;
}

export function InfoIcon({ content, className = '', title = 'Information' }: InfoIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Extract size classes from className if provided, otherwise use default
  const hasSizeClass = className.includes('h-') || className.includes('w-');
  const iconSizeClass = hasSizeClass ? '' : 'h-4 w-4';

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label="Information"
      >
        <Info className={`${iconSizeClass} ${className} text-muted-foreground hover:text-foreground transition-colors cursor-pointer`} />
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              {content}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

