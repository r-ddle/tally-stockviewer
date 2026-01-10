"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PriceConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  price: number | null
  priceDisplay: string
  onConfirm: (priceType: "dealer" | "retail") => void
}

export function PriceConfirmationDialog({
  open,
  onOpenChange,
  price,
  priceDisplay,
  onConfirm,
}: PriceConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Price Type</DialogTitle>
          <DialogDescription>
            Is this price a dealer or retail price?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground mb-2">Entered Price</p>
            <p className="text-2xl font-semibold tabular-nums text-primary">{priceDisplay}</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-lg"
              onClick={() => {
                onConfirm("dealer")
                onOpenChange(false)
              }}
            >
              Dealer Price
            </Button>
            <Button
              className="flex-1 rounded-lg"
              onClick={() => {
                onConfirm("retail")
                onOpenChange(false)
              }}
            >
              Retail Price
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
