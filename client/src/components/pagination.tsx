import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        disabled={!canGoBack}
        onClick={() => onPageChange(1)}
        data-testid="button-first-page"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={!canGoBack}
        onClick={() => onPageChange(currentPage - 1)}
        data-testid="button-prev-page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <span className="text-sm text-muted-foreground px-4">
        Page <span className="font-medium text-foreground">{currentPage}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages || 1}</span>
      </span>
      
      <Button
        variant="outline"
        size="icon"
        disabled={!canGoForward}
        onClick={() => onPageChange(currentPage + 1)}
        data-testid="button-next-page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={!canGoForward}
        onClick={() => onPageChange(totalPages)}
        data-testid="button-last-page"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
