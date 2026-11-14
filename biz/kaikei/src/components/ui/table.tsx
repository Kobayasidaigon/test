import * as React from "react"

import { cn } from "@/lib/utils"

// 21st.dev の Table（originui。shadcn/ui の Table を整えたもの）をもとにした表。
// もとのまま使っているところ: Table / TableHeader / TableBody / TableFooter / TableRow / TableHead / TableCell の分け方と、
// 表が広いときに、表の中だけを横に動かせる外わく。
// 変えたところ: 線を帳簿の罫線に（見出しの下は青緑の二重線、行の間は細い青緑の線）。字を大きく。
// 行にマウスをのせたときの色は、生成りの濃い色に。

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement> & { wrapperClassName?: string }>(
  ({ className, wrapperClassName, ...props }, ref) => (
    <div className={cn("relative w-full overflow-x-auto", wrapperClassName)}>
      <table ref={ref} className={cn("w-full border-collapse text-[0.94rem]", className)} {...props} />
    </div>
  ),
)
Table.displayName = "Table"

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b-[3px] [&_tr]:border-double [&_tr]:border-rule", className)} {...props} />,
)
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />,
)
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t-[3px] border-double border-rule bg-rule-soft/50 font-bold [&>tr]:border-b-0", className)} {...props} />
  ),
)
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b border-rule/35 transition-colors", className)} {...props} />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn("h-11 whitespace-nowrap px-2.5 text-left align-middle text-[0.86rem] font-bold text-rule-ink", className)}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("px-2.5 py-2 align-middle", className)} {...props} />
))
TableCell.displayName = "TableCell"

export { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow }
